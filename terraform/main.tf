terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
  backend "s3" {
    bucket  = "terraform-state-rtyocum.dev"
    key     = "deployment/terraform.tfstate"
    encrypt = true
    region  = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

data "aws_region" "current" {}

# ── Variables ─────────────────────────────────────────────────────────────────
variable "bucket_name" {
  description = "S3 bucket name for the portfolio site."
  type        = string
}

variable "domain" {
  description = "Primary domain (e.g. ryocum.dev)."
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with DNS edit permissions."
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the domain."
  type        = string
}

variable "from_email" {
  description = "SES verified sending address."
  type        = string
}

variable "to_email" {
  description = "Address to receive contact form submissions."
  type        = string
}

variable "turnstile_secret" {
  description = "Turnstile secret key."
  type        = string
  sensitive   = true
}

variable "origin_secret" {
  description = "Shared secret between CloudFront and API Gateway."
  type        = string
  sensitive   = true
}

# ── Locals ────────────────────────────────────────────────────────────────────
locals {
  s3_origin_id          = "S3-portfolio-bucket-origin"
  api_gateway_origin_id = "APIGateway-portfolio-origin"
}

# ── ACM ───────────────────────────────────────────────────────────────────────
resource "aws_acm_certificate" "site" {
  domain_name               = var.domain
  subject_alternative_names = ["www.${var.domain}"]
  validation_method         = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "cloudflare_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => dvo
  }
  zone_id = var.cloudflare_zone_id
  name    = each.value.resource_record_name
  type    = each.value.resource_record_type
  content   = each.value.resource_record_value
  proxied = false
  comment = "Managed by Terraform"
}

resource "aws_acm_certificate_validation" "site" {
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in cloudflare_record.acm_validation : r.hostname]
}

# ── SES ───────────────────────────────────────────────────────────────────────
resource "aws_ses_domain_identity" "site" {
  domain = var.domain
}

resource "aws_ses_domain_dkim" "site" {
  domain = aws_ses_domain_identity.site.domain
}

resource "cloudflare_record" "ses_verification" {
  zone_id = var.cloudflare_zone_id
  name    = "_amazonses.${var.domain}"
  type    = "TXT"
  content   = aws_ses_domain_identity.site.verification_token
  proxied = false
  comment = "Managed by Terraform"
}

resource "cloudflare_record" "ses_dkim" {
  count   = 3
  zone_id = var.cloudflare_zone_id
  name    = "${aws_ses_domain_dkim.site.dkim_tokens[count.index]}._domainkey.${var.domain}"
  type    = "CNAME"
  content   = "${aws_ses_domain_dkim.site.dkim_tokens[count.index]}.dkim.amazonses.com"
  proxied = false
  comment = "Managed by Terraform"
}

resource "aws_ses_domain_identity_verification" "site" {
  domain     = aws_ses_domain_identity.site.domain
  depends_on = [cloudflare_record.ses_verification]
}

resource "aws_ses_domain_mail_from" "site" {
  domain           = aws_ses_domain_identity.site.domain
  mail_from_domain = "ses.${var.domain}"
}

resource "cloudflare_record" "ses_mail_from_mx" {
  zone_id  = var.cloudflare_zone_id
  name     = "ses.${var.domain}"
  type     = "MX"
  content    = "feedback-smtp.us-east-1.amazonses.com"
  priority = 10
  proxied  = false
  comment = "Managed by Terraform"
}

resource "cloudflare_record" "ses_mail_from_spf" {
  zone_id = var.cloudflare_zone_id
  name    = "ses.${var.domain}"
  type    = "TXT"
  content   = "v=spf1 include:amazonses.com ~all"
  proxied = false
  comment = "Managed by Terraform"
}

# ── S3 ────────────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "portfolio_bucket" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "portfolio_bucket" {
  bucket                  = aws_s3_bucket.portfolio_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "portfolio_bucket_policy" {
  bucket = aws_s3_bucket.portfolio_bucket.bucket
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalRead"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.portfolio_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.portfolio_cloudfront_distribution.arn
          }
        }
      }
    ]
  })
}

# ── CloudFront ────────────────────────────────────────────────────────────────
resource "aws_cloudfront_origin_access_control" "portfolio_oac" {
  name                              = "portfolio-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "www_redirect" {
  name    = "portfolio-www-redirect"
  runtime = "cloudfront-js-2.0"
  publish = true
  code = templatefile("${path.module}/www-redirect.js", {
    domain = var.domain
  })
}

resource "aws_cloudfront_distribution" "portfolio_cloudfront_distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain, "www.${var.domain}"]
  price_class         = "PriceClass_All"
  comment             = "Portfolio site"
  depends_on          = [aws_acm_certificate_validation.site]

  origin {
    domain_name              = aws_s3_bucket.portfolio_bucket.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.portfolio_oac.id
    origin_id                = local.s3_origin_id
  }

  origin {
    domain_name = "${aws_apigatewayv2_api.contact.id}.execute-api.${data.aws_region.current.name}.amazonaws.com"
    origin_id   = local.api_gateway_origin_id
    custom_header {
      name  = "x-origin-verify"
      value = var.origin_secret
    }
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.www_redirect.arn
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.api_gateway_origin_id
    viewer_protocol_policy = "https-only"
    compress               = true
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    forwarded_values {
      query_string = true
      cookies { forward = "none" }
      headers = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method", "X-Forwarded-For"]
    }
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
      locations        = []
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = "production"
  }
}

# ── Cloudflare DNS ────────────────────────────────────────────────────────────
resource "cloudflare_record" "root" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain
  type    = "CNAME"
  content   = aws_cloudfront_distribution.portfolio_cloudfront_distribution.domain_name
  proxied = false
  comment = "Managed by Terraform"
}

resource "cloudflare_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  type    = "CNAME"
  content   = aws_cloudfront_distribution.portfolio_cloudfront_distribution.domain_name
  proxied = false
  comment = "Managed by Terraform"
}

# ── Lambda IAM ────────────────────────────────────────────────────────────────
resource "aws_iam_role" "contact_lambda" {
  name = "portfolio-contact-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "contact_lambda" {
  name = "portfolio-contact-lambda-policy"
  role = aws_iam_role.contact_lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Sid      = "SES"
        Effect   = "Allow"
        Action   = "ses:SendEmail"
        Resource = "*"
      }
    ]
  })
}

# ── Lambda ────────────────────────────────────────────────────────────────────
data "archive_file" "contact_lambda" {
  type        = "zip"
  source_file = "${path.module}/contact/index.mjs"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "contact" {
  function_name                  = "portfolio-contact"
  role                           = aws_iam_role.contact_lambda.arn
  handler                        = "index.handler"
  runtime                        = "nodejs20.x"
  filename                       = data.archive_file.contact_lambda.output_path
  source_code_hash               = data.archive_file.contact_lambda.output_base64sha256
  timeout                        = 10

  environment {
    variables = {
      FROM_EMAIL       = var.from_email
      TO_EMAIL         = var.to_email
      TURNSTILE_SECRET = var.turnstile_secret
      ORIGIN_SECRET    = var.origin_secret
    }
  }
}

# ── API Gateway ───────────────────────────────────────────────────────────────
resource "aws_apigatewayv2_api" "contact" {
  name          = "portfolio-contact"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["https://${var.domain}"]
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["Content-Type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "contact" {
  api_id                 = aws_apigatewayv2_api.contact.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.contact.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "contact" {
  api_id    = aws_apigatewayv2_api.contact.id
  route_key = "POST /api/contact"
  target    = "integrations/${aws_apigatewayv2_integration.contact.id}"
}

resource "aws_apigatewayv2_stage" "contact" {
  api_id      = aws_apigatewayv2_api.contact.id
  name        = "$default"
  auto_deploy = true
  default_route_settings {
    throttling_burst_limit = 10
    throttling_rate_limit  = 5
  }
}

resource "aws_lambda_permission" "contact_apigw" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.contact.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.contact.execution_arn}/*/*"
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.portfolio_cloudfront_distribution.id
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.portfolio_cloudfront_distribution.domain_name
}

output "site_bucket" {
  value = aws_s3_bucket.portfolio_bucket.bucket
}

output "contact_api_url" {
  value = "https://${var.domain}/api/contact"
}
