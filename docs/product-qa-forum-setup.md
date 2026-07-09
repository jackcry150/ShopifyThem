# Product Q&A Forum Setup

This theme now includes a product-scoped Q&A forum section on product pages.

## Storefront

- Product section: `sections/product-qa-forum.liquid`
- Frontend script: `assets/product-qa-forum.js`
- Styles: `assets/product-qa-forum.css`
- Product template entry: `templates/product.json`

The section reads these Liquid values from each product page:

- `product.id`
- `product.handle`
- `product.title`
- `product.url`

Each product is isolated by `product.handle`. The section requests:

```text
/apps/product-qa/products/{product_handle}?format=json&limit=8
```

The Ask button opens:

```text
/apps/product-qa/products/{product_handle}/ask?product_id={product_id}&product_title={product_title}&return_to={product_url}
```

Post detail links open:

```text
/apps/product-qa/products/{product_handle}/posts/{post_id}
```

## CRM Backend

The CRM implementation lives in:

```text
D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src
```

Public CRM routes are under:

```text
/goomooplay/product-qa/products/{productHandle}
```

Admin moderation routes are under the Krayin admin path:

```text
/{admin_path}/goomooplay/product-qa
```

## Shopify App Proxy

Configure a Shopify App Proxy with:

```text
Subpath prefix: apps
Subpath: product-qa
Proxy target: https://crm.goomooplay.com/goomooplay/product-qa
```

The proxy should preserve child paths, so:

```text
/apps/product-qa/products/demo-product
```

forwards to:

```text
https://crm.goomooplay.com/goomooplay/product-qa/products/demo-product
```

## Environment

Optional CRM env values:

```text
GOOMOOPLAY_PRODUCT_QA_CAPTCHA_ENABLED=false
GOOMOOPLAY_PRODUCT_QA_PRIVATE_ACCESS_MINUTES=30
```

Captcha is currently a server-side requirement placeholder. If enabled, the storefront form must populate `captcha_token` with a real provider token, such as Turnstile.

## Verification

Theme static checks:

```powershell
node --check assets\product-qa-forum.js
node -e "const fs=require('fs');let s=fs.readFileSync('templates/product.json','utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, ''); JSON.parse(s); console.log('product.json ok')"
Get-Content config\settings_schema.json | ConvertFrom-Json | Out-Null
```

CRM checks when PHP 8.3 or Docker is available:

```powershell
php artisan test --compact tests/Unit/GoomooPlayProductQuestionPackageTest.php tests/Feature/GoomooPlayProductQuestionApiTest.php tests/Feature/GoomooPlayProductQuestionAdminTest.php
```

Manual product isolation check:

1. Open product A and product B.
2. Submit a question from product A.
3. Approve the question in CRM admin.
4. Confirm product A shows the post.
5. Confirm product B does not show the post.
6. Submit a private post and confirm it requires the post password before detail content is visible.

## Current Local Limitation

On this workstation, `php artisan test` is blocked because local PHP is 8.2.12 while the CRM Composer dependencies require PHP >= 8.3. Docker Desktop was also not running, so Docker-based tests could not be executed here.
