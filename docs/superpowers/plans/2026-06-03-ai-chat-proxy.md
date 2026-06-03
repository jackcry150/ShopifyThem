# AI Chat Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Shopify AI chat integration that calls an Aliyun/Baota PHP proxy and uses real FAQ, policy, and product context.

**Architecture:** The Shopify snippet owns UI and context collection. The PHP proxy owns API key security, AI provider calls, and response normalization. The old keyword rules stay as no-network fallback.

**Tech Stack:** Shopify Liquid, browser JavaScript, PHP with cURL, JSON validation.

---

### Task 1: Theme Settings

**Files:**
- Modify: `config/settings_schema.json`
- Modify: `config/settings_data.json`

- [x] Add remote proxy toggle and endpoint URL settings.
- [x] Add FAQ, shipping policy, return policy, and extra knowledge settings.
- [x] Keep the existing local fallback rules.

### Task 2: Chat Widget Remote Call

**Files:**
- Modify: `snippets/ai-chat-widget.liquid`

- [x] Serialize shop, page, product, and knowledge data into a JSON script block.
- [x] POST customer questions to the configured endpoint when remote AI is enabled.
- [x] Send recent history to the proxy.
- [x] Fall back to local rules if the endpoint is missing or fails.

### Task 3: Baota PHP Proxy

**Files:**
- Create: `server/ai-chat.php`
- Create: `server/README.md`

- [x] Read API key, provider URL, model, and allowed origin from environment variables.
- [x] Support OpenAI Responses API style endpoints.
- [x] Support OpenAI-compatible `/chat/completions` endpoints.
- [x] Normalize provider responses to `{ "reply": "..." }`.
- [x] Document upload path and Shopify setting values.

### Task 4: Verification

**Files:**
- Validate: `config/settings_schema.json`
- Validate: `config/settings_data.json`
- Validate: `server/ai-chat.php`

- [ ] Confirm JSON files parse.
- [ ] Confirm PHP syntax passes with `php -l` when PHP is available locally.
- [ ] Review Git diff before commit.
