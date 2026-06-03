# AI Chat Proxy Design

## Goal

Connect the Shopify chat widget to a real AI provider without exposing the provider API key in the storefront browser.

## Architecture

The Shopify theme sends customer questions, recent chat history, current product details, and configured FAQ/policy knowledge to a merchant-owned PHP proxy hosted on Aliyun/Baota. The PHP proxy reads the AI API key from server environment variables, calls the configured AI provider, and returns `{ "reply": "..." }` to the theme.

## Theme Settings

The theme exposes a remote proxy toggle, proxy endpoint URL, FAQ text, shipping policy text, return policy text, and extra brand/product knowledge. Existing keyword rules remain available as local fallback replies.

## Data Flow

1. Customer opens the lower-left chat widget.
2. Customer asks a question.
3. Theme builds a JSON payload with the question, recent history, shop/page/product context, and knowledge settings.
4. Theme posts the payload to the configured proxy endpoint.
5. Proxy calls the AI provider using the server-side API key.
6. Theme shows the returned reply.
7. If the proxy is missing or fails, theme uses local keyword rules and fallback text.

## Safety Rules

The AI must not invent order status, exact delivery dates, refund promises, exchanges, inventory, or production timelines. For order-specific questions, it should ask the customer to contact support with an order number.
