# AI Chat Proxy Deployment

This folder contains the PHP proxy for the Shopify AI chat widget.

## Baota / Aliyun Setup

1. Create or choose a Baota website, for example `api.example.com`.
2. Upload `ai-chat.php` to the website root:

```text
/www/wwwroot/api.example.com/ai-chat.php
```

3. Configure HTTPS for the domain in Baota.
4. Configure these server environment variables:

```text
AI_CHAT_API_KEY=your_ai_provider_api_key
AI_CHAT_PROVIDER_URL=https://api.openai.com/v1/responses
AI_CHAT_MODEL=gpt-5.4-mini
AI_CHAT_ALLOWED_ORIGIN=https://your-shopify-domain.com
```

For OpenAI-compatible providers, `AI_CHAT_PROVIDER_URL` can be either a base URL like `https://api.example.com/v1` or the full chat endpoint. The proxy automatically appends `/chat/completions` when needed.

If setting PHP-FPM environment variables is inconvenient in Baota, create this private config file on the server instead:

```text
/root/deploy/php/config/ai-chat-config.php
```

Example:

```php
<?php
return [
    'AI_CHAT_API_KEY' => 'your_ai_provider_api_key',
    'AI_CHAT_PROVIDER_URL' => 'https://api.openai.com/v1/responses',
    'AI_CHAT_MODEL' => 'gpt-5.4-mini',
    'AI_CHAT_ALLOWED_ORIGIN' => 'https://your-shopify-domain.com',
];
```

The PHP proxy checks environment variables first, then this config file.

If your AI provider uses OpenAI-compatible Chat Completions, use either:

```text
AI_CHAT_PROVIDER_URL=https://your-provider.example.com/v1
```

or:

```text
AI_CHAT_PROVIDER_URL=https://your-provider.example.com/v1/chat/completions
```

5. In Shopify theme settings, set:

```text
AI API endpoint = https://api.example.com/ai-chat.php
Use remote AI proxy = enabled
```

## Request Shape

The Shopify theme sends:

```json
{
  "question": "How long does shipping take?",
  "history": [],
  "context": {
    "shop": {},
    "page": {},
    "product": {},
    "knowledge": {
      "faq": "",
      "shipping_policy": "",
      "return_policy": "",
      "extra": ""
    }
  }
}
```

The proxy returns:

```json
{
  "reply": "Shipping time depends on your destination and selected shipping method."
}
```

## Security Notes

Do not put the AI provider API key in Shopify theme settings. The theme runs in the customer browser, so any key placed there can be copied.

Keep `AI_CHAT_ALLOWED_ORIGIN` limited to your Shopify storefront domain after testing.
