import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({});

export const handler = async (event) => {
  try {
    // ---------------- Origin Secret ----------------
    const originSecret =
      event.headers["x-origin-verify"] || event.headers["X-Origin-Verify"];
    if (originSecret !== process.env.ORIGIN_SECRET) {
      return resp(403, false, "Forbidden");
    }

    // ---------------- Remote IP ----------------
    const ip =
      event.headers["CF-Connecting-IP"] ||
      (event.headers["X-Forwarded-For"]?.split(",")[0].trim()) ||
      event.requestContext?.http?.sourceIp ||
      "unknown";

    // ---------------- Parse Form ----------------
    
  
    let body = event.body;

    if (event.isBase64Encoded) {
      // Decode from Base64 first
      body = Buffer.from(body, 'base64').toString('utf8');
    }

    // Now parse it
    const params = JSON.parse(body);

    const name = (params.name || "").trim();
    const email = (params.email || "").trim();
    const message = (params.message || "").trim();
    const honeypot = params.website || ""; // invisible field
    const captcha = params["cf-turnstile-response"];

    // ---------------- Honeypot Check ----------------
    if (honeypot) {
      return resp(200, true, "OK"); // silently drop bots
    }

    // ---------------- Basic Validation ----------------
    if (!name || !email || !message) return resp(400, false, "Missing fields");
    if (!captcha) return resp(400, false, "Captcha missing");
    if (name.length > 200) return resp(400, false, "Name too long");
    if (email.length > 320) return resp(400, false, "Email too long");
    if (message.length > 5000) return resp(400, false, "Message too long");

    // ---------------- Verify Turnstile ----------------
    const verify = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET,
          response: captcha,
          remoteip: ip,
        }),
      }
    );
    const captchaResult = await verify.json();

    if (!captchaResult.success) {
      return resp(400, false, JSON.stringify(captchaResult));
    }

    // ---------------- Send Confirmation To User ----------------
    const confirmCmd = new SendEmailCommand({
      Destination: { ToAddresses: [email] },
      Source: `"Ryan Yocum" <${process.env.FROM_EMAIL}>`,
      Message: {
        Subject: { Data: "Thanks for contacting me!" },
        Body: {
          Text: {
            Data: `Hello ${name || "there!"},

I got your email! I'll get back to you as soon as I can, usually within 24-48 hours.

Thanks!
Ryan Yocum`,
          },
        },
      },
    });
    await ses.send(confirmCmd);

    // ---------------- Send Notification To Me ----------------
    const notifyCmd = new SendEmailCommand({
      Destination: { ToAddresses: [process.env.TO_EMAIL] },
      Source: `"${name}" <${process.env.FROM_EMAIL}>`,
      ReplyToAddresses: [email],
      Message: {
        Subject: { Data: `Contact form: ${name}` },
        Body: {
          Text: {
            Data: `New contact form submission

Name: ${name}
Email: ${email}

Message:
${message}`,
          },
        },
      },
    });
    await ses.send(notifyCmd);

    return resp(200, true, "Message sent successfully");
  } catch (err) {
    console.error(err);
    return resp(500, false, "Internal server error");
  }
};

// ---------------- JSON Response Helper ----------------
function resp(code, success = false, message = "") {
  return {
    statusCode: code,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ success, message }),
  };
}
