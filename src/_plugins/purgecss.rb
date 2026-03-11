Jekyll::Hooks.register :site, :post_write do |site|
  system("npx purgecss --css _site/assets/css/styles.css \
    --content '_site/**/*.html' '_site/**/*.js' \
    --safelist 'terminal-dim' 'terminal-ok' 'terminal-hi' 'terminal-out' \
    --output _site/assets/css/")
end
