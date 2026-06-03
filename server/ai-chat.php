<?php
declare(strict_types=1);

/*
 * GooMooPlay Shopify AI chat proxy for Aliyun/Baota PHP hosting.
 *
 * Deploy this file to your Baota website root, for example:
 *   /www/wwwroot/api.example.com/ai-chat.php
 *
 * Set these environment variables in Baota/PHP-FPM when possible:
 *   AI_CHAT_API_KEY=your_provider_api_key
 *   AI_CHAT_PROVIDER_URL=https://api.openai.com/v1/responses
 *   AI_CHAT_MODEL=gpt-5.4-mini
 *   AI_CHAT_ALLOWED_ORIGIN=https://shop-goomooplay.com
 *
 * If your provider is OpenAI-compatible Chat Completions, use a URL like:
 *   https://your-provider.example.com/v1/chat/completions
 */

$localConfig = loadLocalConfig();
$allowedOrigin = getConfigValue($localConfig, 'AI_CHAT_ALLOWED_ORIGIN', '*');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . $allowedOrigin);
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'Only POST requests are supported.']);
}

$apiKey = getConfigValue($localConfig, 'AI_CHAT_API_KEY', '');
$providerUrl = getConfigValue($localConfig, 'AI_CHAT_PROVIDER_URL', 'https://api.openai.com/v1/responses');
$providerUrl = normalizeProviderUrl($providerUrl);
$model = getConfigValue($localConfig, 'AI_CHAT_MODEL', 'gpt-5.4-mini');

if ($apiKey === '') {
    respond(500, ['error' => 'AI_CHAT_API_KEY is not configured on the server.']);
}

$requestBody = file_get_contents('php://input') ?: '';
if (strlen($requestBody) > 65536) {
    respond(413, ['error' => 'Request body is too large.']);
}

$payload = json_decode($requestBody, true);
if (!is_array($payload)) {
    respond(400, ['error' => 'Invalid JSON request body.']);
}

$question = trim((string)($payload['question'] ?? ''));
if ($question === '') {
    respond(400, ['error' => 'Question is required.']);
}

$maxAiQuestions = (int)getConfigValue($localConfig, 'AI_CHAT_MAX_AI_QUESTIONS', '3');
$limitWindowSeconds = (int)getConfigValue($localConfig, 'AI_CHAT_LIMIT_WINDOW_SECONDS', '86400');
$limitReply = getConfigValue(
    $localConfig,
    'AI_CHAT_LIMIT_REPLY',
    'Thanks for your question. Our AI assistant has answered the available free questions for this chat. Please contact support and our team will help you shortly.'
);

if (isAiLimitReached($payload, $maxAiQuestions, $limitWindowSeconds)) {
    respond(200, ['reply' => $limitReply, 'limited' => true]);
}

$context = is_array($payload['context'] ?? null) ? $payload['context'] : [];
$history = is_array($payload['history'] ?? null) ? array_slice($payload['history'], -8) : [];
$messages = buildMessages($question, $history, $context);
$providerPayload = buildProviderPayload($providerUrl, $model, $messages);
$providerTimeout = (int)getConfigValue($localConfig, 'AI_CHAT_TIMEOUT', '15');
$providerResponse = callProvider($providerUrl, $apiKey, $providerPayload, $providerTimeout);
$reply = extractReply($providerUrl, $providerResponse);

if ($reply === '') {
    respond(502, ['error' => 'AI provider did not return a reply.']);
}

respond(200, ['reply' => $reply]);

function buildMessages(string $question, array $history, array $context): array
{
    $systemPrompt = implode("\n", [
        'You are GooMooPlay customer support AI for a Shopify store.',
        'Answer using only the provided store, product, FAQ, shipping, return, and extra knowledge.',
        'If the answer is not in the provided data, say you are not sure and ask the customer to contact support.',
        'Never invent exact delivery dates, refund promises, order status, inventory, or custom production timelines.',
        'For order-specific questions, ask for the order number and direct the customer to support.',
        'Keep answers friendly, concise, and practical. Use the customer language when obvious.'
    ]);

    $contextText = json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($contextText)) {
        $contextText = '{}';
    }

    $messages = [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => "Store context JSON:\n" . $contextText]
    ];

    foreach ($history as $item) {
        if (!is_array($item)) {
            continue;
        }

        $role = ($item['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
        $content = trim((string)($item['content'] ?? ''));
        if ($content !== '') {
            $messages[] = ['role' => $role, 'content' => truncateText($content, 1200)];
        }
    }

    $messages[] = ['role' => 'user', 'content' => $question];

    return $messages;
}

function buildProviderPayload(string $providerUrl, string $model, array $messages): array
{
    if (contains($providerUrl, '/chat/completions')) {
        return [
            'model' => $model,
            'messages' => $messages,
            'temperature' => 0.2,
            'max_tokens' => 500
        ];
    }

    return [
        'model' => $model,
        'input' => $messages,
        'temperature' => 0.2,
        'max_output_tokens' => 500
    ];
}

function normalizeProviderUrl(string $providerUrl): string
{
    $trimmedUrl = rtrim($providerUrl, '/');
    if (contains($trimmedUrl, '/responses') || contains($trimmedUrl, '/chat/completions')) {
        return $trimmedUrl;
    }

    return $trimmedUrl . '/chat/completions';
}

function callProvider(string $providerUrl, string $apiKey, array $providerPayload, int $timeout): array
{
    $ch = curl_init($providerUrl);
    if ($ch === false) {
        respond(500, ['error' => 'Unable to initialize cURL.']);
    }

    $safeTimeout = max(5, min($timeout, 35));

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => $safeTimeout,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ],
        CURLOPT_POSTFIELDS => json_encode($providerPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    ]);

    $rawResponse = curl_exec($ch);
    $statusCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($rawResponse === false || $curlError !== '') {
        respond(502, ['error' => 'AI provider request failed.', 'detail' => $curlError]);
    }

    $decoded = json_decode((string)$rawResponse, true);
    if (!is_array($decoded)) {
        respond(502, ['error' => 'AI provider returned invalid JSON.']);
    }

    if ($statusCode < 200 || $statusCode >= 300) {
        respond(502, [
            'error' => 'AI provider returned an error.',
            'status' => $statusCode,
            'detail' => $decoded['error']['message'] ?? $decoded['message'] ?? 'Unknown provider error.'
        ]);
    }

    return $decoded;
}

function extractReply(string $providerUrl, array $providerResponse): string
{
    if (isset($providerResponse['output_text']) && is_string($providerResponse['output_text'])) {
        return trim($providerResponse['output_text']);
    }

    if (contains($providerUrl, '/chat/completions')) {
        return trim((string)($providerResponse['choices'][0]['message']['content'] ?? ''));
    }

    $parts = [];
    foreach (($providerResponse['output'] ?? []) as $outputItem) {
        foreach (($outputItem['content'] ?? []) as $contentItem) {
            $text = $contentItem['text'] ?? '';
            if (is_string($text) && $text !== '') {
                $parts[] = $text;
            }
        }
    }

    return trim(implode("\n", $parts));
}

function respond(int $statusCode, array $data): void
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function isAiLimitReached(array $payload, int $maxQuestions, int $windowSeconds): bool
{
    if ($maxQuestions <= 0) {
        return false;
    }

    $window = max(60, $windowSeconds);
    $now = time();
    $visitorId = getVisitorFingerprint($payload);
    $limitDir = sys_get_temp_dir() . '/goomooplay-ai-chat-limits';

    if (!is_dir($limitDir) && !mkdir($limitDir, 0755, true) && !is_dir($limitDir)) {
        return false;
    }

    $limitFile = $limitDir . '/' . hash('sha256', $visitorId) . '.json';
    $handle = fopen($limitFile, 'c+');
    if ($handle === false) {
        return false;
    }

    try {
        flock($handle, LOCK_EX);
        $raw = stream_get_contents($handle);
        $data = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
        if (!is_array($data)) {
            $data = [];
        }

        $windowStart = (int)($data['window_start'] ?? $now);
        $count = (int)($data['count'] ?? 0);

        if (($now - $windowStart) >= $window) {
            $windowStart = $now;
            $count = 0;
        }

        if ($count >= $maxQuestions) {
            return true;
        }

        $count++;
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode([
            'window_start' => $windowStart,
            'count' => $count
        ], JSON_UNESCAPED_SLASHES));

        return false;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function getVisitorFingerprint(array $payload): string
{
    $visitorId = trim((string)($payload['visitor_id'] ?? ''));
    if ($visitorId !== '') {
        return 'visitor:' . $visitorId;
    }

    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown-ip';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown-agent';

    return 'fallback:' . $ip . '|' . $userAgent;
}

function loadLocalConfig(): array
{
    $paths = [
        '/root/deploy/php/config/ai-chat-config.php',
        dirname(__DIR__) . '/config/ai-chat-config.php',
        __DIR__ . '/ai-chat-config.php'
    ];

    foreach ($paths as $path) {
        if (is_file($path)) {
            $config = require $path;
            return is_array($config) ? $config : [];
        }
    }

    return [];
}

function getConfigValue(array $config, string $key, string $default): string
{
    $value = getenv($key);
    if (is_string($value) && $value !== '') {
        return $value;
    }

    $configuredValue = $config[$key] ?? null;
    if (is_string($configuredValue) && $configuredValue !== '') {
        return $configuredValue;
    }

    return $default;
}

function contains(string $haystack, string $needle): bool
{
    return $needle === '' || strpos($haystack, $needle) !== false;
}

function truncateText(string $text, int $limit): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $limit);
    }

    return substr($text, 0, $limit);
}
