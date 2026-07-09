# Product Q&A Forum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a product-scoped guest Q&A forum for GooMooPlay product pages, with public list/detail/ask pages and Krayin admin moderation.

**Architecture:** Extend the existing Krayin CRM package at `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src` instead of adding a separate forum backend. Shopify product pages render a lightweight Q&A section and link to Shopify App Proxy paths like `/apps/product-qa/products/{handle}`, which proxy to CRM routes under `/goomooplay/product-qa/products/{handle}`.

**Tech Stack:** Shopify Dawn Liquid theme, vanilla storefront JS/CSS, Laravel 12/Krayin package, Pest tests, Krayin DataGrid/admin Blade views.

---

## Current Evidence

- Theme branch: `codex-product-qa-forum` in `D:\Codex Program\theme_export__shop-goomooplay-com-goomooplay-theme-updated__02JUN2026-0537pm`.
- Theme dirty baseline: untracked `%SystemDrive%/` exists and must not be staged.
- Existing product FAQ: `D:\Codex Program\theme_export__shop-goomooplay-com-goomooplay-theme-updated__02JUN2026-0537pm\templates\product.json` has `collapsible_content_amiHKB` named `商品详情页FAQ`.
- Product page product context: `D:\Codex Program\theme_export__shop-goomooplay-com-goomooplay-theme-updated__02JUN2026-0537pm\sections\main-product.liquid` exposes `product.id`, `product.url`, `product.title`.
- Existing GoomooPlay CRM package: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src`.
- Existing public CRM endpoint pattern: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Routes\api.php` and `LeadCaptureController`.
- Existing admin pattern: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\Admin\src\DataGrids\Product\ProductDataGrid.php`, `products-routes.php`, and `Resources\views\products\index.blade.php`.

## Route Contract

Public CRM routes:

- `GET /goomooplay/product-qa/products/{productHandle}`: HTML list page, or JSON when `Accept: application/json` or `format=json`.
- `GET /goomooplay/product-qa/products/{productHandle}/ask`: HTML ask form.
- `POST /goomooplay/product-qa/products/{productHandle}/questions`: guest create.
- `GET /goomooplay/product-qa/products/{productHandle}/posts/{question}`: HTML detail page, or JSON when requested.
- `POST /goomooplay/product-qa/products/{productHandle}/posts/{question}/replies`: guest follow-up comment.

Shopify App Proxy paths:

- `/apps/product-qa/products/{handle}`
- `/apps/product-qa/products/{handle}/ask`
- `/apps/product-qa/products/{handle}/posts/{id}`

The Shopify app proxy should forward those paths to the CRM route root. Product isolation must use `product_handle` plus `shopify_product_id` when present. `product_title` is display context only and must not be trusted as the identifier.

## Data Rules

- Guest posts default to `pending`.
- Public product list returns only `approved` or `answered` posts where `is_private = false`.
- Detail pages show approved public posts. Private posts require a password-check flow before exposing body/replies.
- Store guest email but never expose it publicly.
- Store guest post password with `Hash::make()` and verify with `Hash::check()`.
- Store IP as hash or truncated metadata only.
- Attachments are deferred until after the base forum works. If enabled later, validate MIME/size and sanitize filenames.

---

### Task 1: CRM Product Q&A Data Model

**Files:**
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\tests\Unit\GoomooPlayProductQuestionPackageTest.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Contracts\ProductQuestion.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Contracts\ProductQuestionReply.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Models\ProductQuestion.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Models\ProductQuestionProxy.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Models\ProductQuestionReply.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Models\ProductQuestionReplyProxy.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Repositories\ProductQuestionRepository.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Repositories\ProductQuestionReplyRepository.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Database\Migrations\2026_07_09_000001_create_goomooplay_product_questions_table.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Database\Migrations\2026_07_09_000002_create_goomooplay_product_question_replies_table.php`
- Modify: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Providers\ModuleServiceProvider.php`

- [ ] **Step 1: Write the failing package/model test**

```php
<?php

test('goomooplay product question models are registered as krayin module models', function () {
    expect(class_exists(\Webkul\GoomooPlay\Models\ProductQuestion::class))->toBeTrue();
    expect(class_exists(\Webkul\GoomooPlay\Models\ProductQuestionProxy::class))->toBeTrue();
    expect(class_exists(\Webkul\GoomooPlay\Models\ProductQuestionReply::class))->toBeTrue();
    expect(class_exists(\Webkul\GoomooPlay\Models\ProductQuestionReplyProxy::class))->toBeTrue();

    $provider = new ReflectionClass(\Webkul\GoomooPlay\Providers\ModuleServiceProvider::class);
    $models = $provider->getDefaultProperties()['models'];

    expect($models)->toContain(\Webkul\GoomooPlay\Models\ProductQuestion::class);
    expect($models)->toContain(\Webkul\GoomooPlay\Models\ProductQuestionReply::class);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run in `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System`:

```powershell
docker compose exec app php artisan test --compact tests/Unit/GoomooPlayProductQuestionPackageTest.php
```

Expected: FAIL because the ProductQuestion classes do not exist.

- [ ] **Step 3: Add minimal contracts, models, proxies, repositories, migrations**

Use table names:

- `goomooplay_product_questions`
- `goomooplay_product_question_replies`

Required question columns:

- `id`
- `shopify_product_id` nullable string
- `product_handle` indexed string
- `product_title` nullable string
- `title` string
- `body` long text
- `guest_name` string
- `guest_email` nullable string
- `password_hash` string
- `status` string default `pending`
- `is_private` boolean default false
- `view_count` unsigned integer default 0
- `ip_hash` nullable string
- `user_agent` nullable string
- timestamps

Required reply columns:

- `id`
- `product_question_id` foreign key cascade delete
- `author_type` string default `staff`
- `author_name` string
- `body` long text
- `status` string default `approved`
- timestamps

- [ ] **Step 4: Register models in ModuleServiceProvider**

```php
protected $models = [
    \Webkul\GoomooPlay\Models\ProductQuestion::class,
    \Webkul\GoomooPlay\Models\ProductQuestionReply::class,
];
```

- [ ] **Step 5: Run the unit test and migration smoke check**

```powershell
docker compose exec app php artisan test --compact tests/Unit/GoomooPlayProductQuestionPackageTest.php
docker compose exec app php artisan migrate:status
```

Expected: unit test PASS. Migration status command exits 0.

- [ ] **Step 6: Commit Task 1**

```powershell
git add tests/Unit/GoomooPlayProductQuestionPackageTest.php packages/Webkul/GoomooPlay/src
git commit -m "feat: add product Q&A data model"
```

---

### Task 2: CRM Public Product Q&A API And Pages

**Files:**
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\tests\Feature\GoomooPlayProductQuestionApiTest.php`
- Modify: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Routes\api.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Http\Controllers\ProductQuestionController.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Http\Requests\ProductQuestionStoreRequest.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Http\Resources\ProductQuestionResource.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Resources\views\product-qa\index.blade.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Resources\views\product-qa\ask.blade.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Resources\views\product-qa\show.blade.php`
- Modify: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Providers\GoomooPlayServiceProvider.php`
- Modify: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\config\cors.php`

- [ ] **Step 1: Write failing public API tests**

Test cases:

- List endpoint filters by `product_handle`.
- List endpoint hides `pending` and private posts.
- Create endpoint stores guest fields, hashes password, and returns `pending`.
- Detail endpoint returns only posts that match the route product handle.

- [ ] **Step 2: Verify RED**

```powershell
docker compose exec app php artisan test --compact tests/Feature/GoomooPlayProductQuestionApiTest.php
```

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Add controller/request/resource/routes**

Routes must be public API routes, not admin routes. Add rate limiting with Laravel throttle middleware:

```php
Route::prefix('/goomooplay/product-qa/products/{productHandle}')
    ->middleware(['api', 'throttle:product-qa'])
    ->controller(ProductQuestionController::class)
    ->group(function () {
        Route::get('', 'index')->name('goomooplay.product_qa.index');
        Route::get('ask', 'ask')->name('goomooplay.product_qa.ask');
        Route::post('questions', 'store')->name('goomooplay.product_qa.store');
        Route::get('posts/{question}', 'show')->name('goomooplay.product_qa.show');
    });
```

- [ ] **Step 4: Add Blade views**

Use the screenshots as the layout reference:

- `index.blade.php`: table columns `No.`, `Product Name`, `Title`, `Posted by`, `Date`, `View`.
- `ask.blade.php`: fields `title`, `guest_name`, email local/domain, body, optional UCC URL, password, public/private, privacy consent, captcha placeholder.
- `show.blade.php`: title meta table, body, replies, list button, prev/next, related postings table.

- [ ] **Step 5: Run feature tests**

```powershell
docker compose exec app php artisan test --compact tests/Feature/GoomooPlayProductQuestionApiTest.php
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```powershell
git add tests/Feature/GoomooPlayProductQuestionApiTest.php packages/Webkul/GoomooPlay/src config/cors.php
git commit -m "feat: add public product Q&A endpoints"
```

---

### Task 3: CRM Admin Moderation And Staff Replies

**Files:**
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\tests\Feature\GoomooPlayProductQuestionAdminTest.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Routes\admin.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Http\Controllers\Admin\ProductQuestionController.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Http\Controllers\Admin\ProductQuestionReplyController.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Http\Requests\Admin\ProductQuestionReplyRequest.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\DataGrids\ProductQuestionDataGrid.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Resources\views\admin\product-questions\index.blade.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Resources\views\admin\product-questions\view.blade.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Config\menu.php`
- Create: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Config\acl.php`
- Modify: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Providers\GoomooPlayServiceProvider.php`

- [ ] **Step 1: Write failing admin tests**

Test cases:

- Guest cannot access admin Q&A list.
- Authorized admin can open list route.
- Admin can approve a pending question.
- Admin can create staff reply and move question to `answered`.

- [ ] **Step 2: Verify RED**

```powershell
docker compose exec app php artisan test --compact tests/Feature/GoomooPlayProductQuestionAdminTest.php
```

Expected: FAIL because admin routes do not exist.

- [ ] **Step 3: Add admin routes and provider loading**

Load `Routes/admin.php` with `web`, `admin_locale`, and `user` middleware under `config('app.admin_path')`.

- [ ] **Step 4: Add DataGrid and views**

DataGrid columns:

- `id`
- `product_handle`
- `product_title`
- `title`
- `guest_name`
- `status`
- `is_private`
- `created_at`

Actions:

- View
- Approve
- Hide
- Delete

- [ ] **Step 5: Add menu and ACL**

Menu label: `Product Q&A`

Permissions:

- `goomooplay.product_qa`
- `goomooplay.product_qa.view`
- `goomooplay.product_qa.reply`
- `goomooplay.product_qa.moderate`
- `goomooplay.product_qa.delete`

- [ ] **Step 6: Run admin feature tests**

```powershell
docker compose exec app php artisan test --compact tests/Feature/GoomooPlayProductQuestionAdminTest.php
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```powershell
git add tests/Feature/GoomooPlayProductQuestionAdminTest.php packages/Webkul/GoomooPlay/src
git commit -m "feat: add product Q&A moderation admin"
```

---

### Task 4: Shopify Product Q&A Forum Section

**Files:**
- Create: `D:\Codex Program\theme_export__shop-goomooplay-com-goomooplay-theme-updated__02JUN2026-0537pm\sections\product-qa-forum.liquid`
- Create: `D:\Codex Program\theme_export__shop-goomooplay-com-goomooplay-theme-updated__02JUN2026-0537pm\assets\product-qa-forum.js`
- Create: `D:\Codex Program\theme_export__shop-goomooplay-com-goomooplay-theme-updated__02JUN2026-0537pm\assets\product-qa-forum.css`
- Modify: `D:\Codex Program\theme_export__shop-goomooplay-com-goomooplay-theme-updated__02JUN2026-0537pm\templates\product.json`

- [ ] **Step 1: Add static section skeleton**

Create a forum table shell with heading `Q&A`, empty state, `Ask question` button, and `View all` button. Root node must include:

```liquid
data-product-id="{{ product.id }}"
data-product-handle="{{ product.handle | escape }}"
data-product-title="{{ product.title | escape }}"
data-product-url="{{ product.url | escape }}"
```

- [ ] **Step 2: Add storefront JS**

JS behavior:

- Request list JSON from `/apps/product-qa/products/${handle}?format=json&limit=5`.
- Render rows with number, optional product title, title, masked author, date, view count.
- Link title to `/apps/product-qa/products/${handle}/posts/${id}`.
- Link ask button to `/apps/product-qa/products/${handle}/ask?product_id=${productId}&product_title=${encodedTitle}&return_to=${encodedUrl}`.
- If fetch fails, keep static empty state and do not block the product page.

- [ ] **Step 3: Add section CSS**

Match screenshot direction: thin borders, compact table rows, neutral white background, bold title column, desktop-first table with readable mobile fallback.

- [ ] **Step 4: Insert section into product template**

Add section after `product_feature_URLbNz` and before `collapsible_content_amiHKB`.

- [ ] **Step 5: Validate JSON and JS**

```powershell
Get-Content templates\product.json | ConvertFrom-Json
node --check assets\product-qa-forum.js
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit Task 4**

```powershell
git add sections/product-qa-forum.liquid assets/product-qa-forum.js assets/product-qa-forum.css templates/product.json
git commit -m "feat: add product Q&A forum section"
```

---

### Task 5: Security Hardening And Integration Notes

**Files:**
- Modify: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Http\Requests\ProductQuestionStoreRequest.php`
- Modify: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Http\Controllers\ProductQuestionController.php`
- Modify: `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System\packages\Webkul\GoomooPlay\src\Config\goomooplay.php`
- Create: `D:\Codex Program\theme_export__shop-goomooplay-com-goomooplay-theme-updated__02JUN2026-0537pm\docs\product-qa-forum-setup.md`

- [ ] **Step 1: Add anti-spam controls**

Add honeypot field, request throttle, privacy consent validation, and configurable captcha placeholder fields. Do not hard-require a third-party captcha key until deployment values are available.

- [ ] **Step 2: Add private-post password view check**

Private detail page must show a password form first. On valid password, store a short-lived signed session/token for that post only.

- [ ] **Step 3: Write setup document**

Document:

- Shopify App Proxy path `/apps/product-qa`.
- CRM public route root `/goomooplay/product-qa`.
- Theme section placement.
- Admin moderation path.
- Required env/config values.
- Verification checklist with one product A and one product B to prove isolation.

- [ ] **Step 4: Run final targeted verification**

CRM:

```powershell
docker compose exec app php artisan test --compact tests/Unit/GoomooPlayProductQuestionPackageTest.php tests/Feature/GoomooPlayProductQuestionApiTest.php tests/Feature/GoomooPlayProductQuestionAdminTest.php
```

Theme:

```powershell
Get-Content templates\product.json | ConvertFrom-Json
Get-Content config\settings_schema.json | ConvertFrom-Json
node --check assets\product-qa-forum.js
```

- [ ] **Step 5: Commit Task 5**

```powershell
git add packages/Webkul/GoomooPlay/src docs/product-qa-forum-setup.md
git commit -m "docs: add product Q&A forum setup and hardening"
```

---

## Execution Notes

- Do not stage or delete `D:\Codex Program\theme_export__shop-goomooplay-com-goomooplay-theme-updated__02JUN2026-0537pm\%SystemDrive%`.
- The CRM repository may already be dirty. Before each CRM task, run `git status --short` in `D:\Codex Program\GooMooPlay-Shopify-Lead-CRM-System` and stage only files from that task.
- If a task touches both repositories, commit separately in each repository with the same task number in the message.
- Avoid adding Filament, Backpack, Orchid, Flarum, or Question2Answer as runtime dependencies. They were useful references, but the implementation should stay inside Krayin/Webkul.
- Keep the MVP attachment-free unless the user explicitly prioritizes file upload security work.
