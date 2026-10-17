<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClassroomController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

// ── Public API config endpoint ────────────────────────────────────────────────
Route::get('/config', function (Request $request) {
    $parseEnvList = function (?string $value): array {
        if ($value === null) {
            return [];
        }
        $trimmed = trim($value);
        if ($trimmed === '') {
            return [];
        }
        $decoded = json_decode($trimmed, true);
        if (is_array($decoded)) {
            return array_values(array_filter(array_map('strval', $decoded)));
        }

        return array_values(array_filter(array_map('trim', preg_split('/[\r\n,]+/', $trimmed))));
    };

    $groqKeys = $parseEnvList(env('GROQ_KEYS'));
    if ($groqKeys === []) {
        foreach (['GROQ_API_KEY', 'GROQ_KEY'] as $envKey) {
            $single = trim((string) env($envKey, ''));
            if ($single !== '') {
                $groqKeys = [$single];
                break;
            }
        }
    }

    $openRouterKeys = $parseEnvList(env('OPENROUTER_API_KEYS'));
    if ($openRouterKeys === []) {
        $openRouterKeys = $parseEnvList(env('OPENROUTER_KEYS'));
    }

    error_log('[/api/config] GROQ_KEYS count: ' . count($groqKeys) . ', OPENROUTER_KEYS count: ' . count($openRouterKeys));

    // Serve API keys and configuration from server, not from client bundle
    return response()->json([
        'GROQ_API_KEY'        => $groqKeys[0] ?? '',
        'GROQ_KEYS'           => $groqKeys,
        'GROQ_API_BASE_URL'   => env('GROQ_API_BASE_URL', env('GROQ_BASE', 'https://api.groq.com/openai/v1')),
        'CEREBRAS_API_KEY'    => env('CEREBRAS_API_KEY', ''),
        'CEREBRAS_API_BASE'   => env('CEREBRAS_API_BASE_URL', 'https://api.cerebras.ai/v1'),
        'OPENROUTER_KEYS'     => $openRouterKeys,
        'OPENROUTER_API_KEYS' => $openRouterKeys,
        'OPENROUTER_BASE'     => env('OPENROUTER_BASE', env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1')),
        'GEMINI_KEY'          => env('GEMINI_API_KEY', ''),
        'GEMINI_MODEL'        => env('GEMINI_MODEL', 'gemini-2.0-flash-lite'),
        'GEMINI_BASE'         => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/models'),
        'AZURE_SPEECH_KEY'    => env('AZURE_SPEECH_KEY', ''),
        'AZURE_SPEECH_REGION' => env('AZURE_SPEECH_REGION', 'southeastasia'),
    ]);
});

Route::post('/biology/voiceover', function (Request $request) {
    $validated = $request->validate([
        'model_name' => ['required', 'string', 'max:120'],
    ]);
    $modelName = trim($validated['model_name']);
    if ($modelName === '') {
        return response()->json(['detail' => 'A model name is required.'], 422);
    }

    $rawKeys = trim((string) env('GROQ_KEYS', ''));
    $decodedKeys = json_decode($rawKeys, true);
    $keys = is_array($decodedKeys)
        ? array_values(array_filter(array_map('strval', $decodedKeys)))
        : array_values(array_filter(array_map('trim', preg_split('/[\r\n,]+/', $rawKeys))));
    if ($keys === []) {
        foreach (['GROQ_API_KEY', 'GROQ_KEY'] as $envKey) {
            $key = trim((string) env($envKey, ''));
            if ($key !== '') {
                $keys = [$key];
                break;
            }
        }
    }
    if ($keys === []) {
        return response()->json(['detail' => 'Groq is not configured for the biology voiceover.'], 503);
    }

    $baseUrl = rtrim((string) env('GROQ_API_BASE_URL', env('GROQ_BASE', 'https://api.groq.com/openai/v1')), '/');
    $models = ['openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b'];
    $lastStatus = null;
    $lastFailure = null;
    $httpOptions = [];
    if (PHP_OS_FAMILY === 'Windows' && defined('CURLSSLOPT_NATIVE_CA')) {
        $httpOptions['curl'] = [
            CURLOPT_SSL_OPTIONS => CURLSSLOPT_NATIVE_CA,
        ];
    }
    foreach ($models as $model) {
        foreach ($keys as $keyIndex => $key) {
            try {
                $response = Http::timeout(35)
                    ->withOptions($httpOptions)
                    ->withToken($key)
                    ->acceptJson()
                    ->post($baseUrl . '/chat/completions', [
                        'model' => $model,
                        'temperature' => 0.6,
                        'max_tokens' => 700,
                        'messages' => [
                            [
                                'role' => 'system',
                                'content' => 'You are a biology teacher writing a spoken explanation for a student. Respond in clear, natural English. Return only valid JSON with a "segments" array of exactly four objects, each containing "label" and "text". Cover overview, structure, key features, and function. Each text must be one or two concise, scientifically accurate sentences. Do not include markdown or make up uncertain numerical claims.',
                            ],
                            [
                                'role' => 'user',
                                'content' => 'Create the four-section voiceover for: ' . $modelName,
                            ],
                        ],
                    ]);

                if (!$response->successful()) {
                    $lastStatus = $response->status();
                    $upstreamMessage = (string) $response->json('error.message', '');
                    $lastFailure = $upstreamMessage !== ''
                        ? mb_substr($upstreamMessage, 0, 240)
                        : "Groq returned HTTP {$lastStatus}.";
                    error_log("[biology voiceover] {$model} key " . ($keyIndex + 1) . " returned HTTP {$lastStatus}: {$lastFailure}");
                    if (in_array($lastStatus, [401, 403], true)) {
                        break 2;
                    }
                    if ($response->status() === 429) {
                        break;
                    }
                    continue;
                }

                $content = trim((string) $response->json('choices.0.message.content', ''));
                $content = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', $content);
                $result = json_decode($content, true);
                $segments = $result['segments'] ?? null;
                if (!is_array($segments) || count($segments) !== 4) {
                    error_log("[biology voiceover] {$model} returned an invalid segment structure");
                    continue;
                }

                $normalized = [];
                foreach ($segments as $segment) {
                    if (!is_array($segment)
                        || !is_string($segment['label'] ?? null)
                        || !is_string($segment['text'] ?? null)
                        || trim($segment['label']) === ''
                        || trim($segment['text']) === '') {
                        $normalized = [];
                        break;
                    }
                    $normalized[] = [
                        'label' => mb_substr(trim($segment['label']), 0, 40),
                        'text' => mb_substr(trim($segment['text']), 0, 700),
                    ];
                }
                if (count($normalized) === 4) {
                    return response()->json(['segments' => $normalized]);
                }
            } catch (\Throwable $error) {
                $message = str_replace($key, '[redacted]', $error->getMessage());
                $message = preg_replace('/Bearer\s+\S+/i', 'Bearer [redacted]', $message);
                $message = preg_replace('/[\r\n]+/', ' ', $message);
                $lastFailure = mb_substr(get_class($error) . ': ' . $message, 0, 240);
                error_log("[biology voiceover] {$model} key " . ($keyIndex + 1) . " failed: {$lastFailure}");
            }
        }
    }

    $detail = 'Groq could not generate the biology voiceover. Please try again.';
    if ($lastStatus !== null) {
        $detail = "Groq returned HTTP {$lastStatus}: {$lastFailure}";
    } elseif ($lastFailure !== null) {
        $detail = "The server could not connect to Groq ({$lastFailure}). Check server network access and try again.";
    }
    return response()->json(['detail' => $detail], 502);
});

Route::post('/biology/chat', function (Request $request) {
    $validated = $request->validate([
        'model_name' => ['required', 'string', 'max:120'],
        'question' => ['required', 'string', 'max:2000'],
    ]);
    $modelName = trim($validated['model_name']);
    $question = trim($validated['question']);
    if ($modelName === '' || $question === '') {
        return response()->json(['detail' => 'A model name and question are required.'], 422);
    }

    $rawKeys = trim((string) env('GROQ_KEYS', ''));
    $decodedKeys = json_decode($rawKeys, true);
    $keys = is_array($decodedKeys)
        ? array_values(array_filter(array_map('strval', $decodedKeys)))
        : array_values(array_filter(array_map('trim', preg_split('/[\r\n,]+/', $rawKeys))));
    if ($keys === []) {
        foreach (['GROQ_API_KEY', 'GROQ_KEY'] as $envKey) {
            $key = trim((string) env($envKey, ''));
            if ($key !== '') {
                $keys = [$key];
                break;
            }
        }
    }
    if ($keys === []) {
        return response()->json(['detail' => 'Groq is not configured for the biology chat.'], 503);
    }

    $baseUrl = rtrim((string) env('GROQ_API_BASE_URL', env('GROQ_BASE', 'https://api.groq.com/openai/v1')), '/');
    $models = ['openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b'];
    $lastStatus = null;
    $httpOptions = [];
    if (PHP_OS_FAMILY === 'Windows' && defined('CURLSSLOPT_NATIVE_CA')) {
        $httpOptions['curl'] = [
            CURLOPT_SSL_OPTIONS => CURLSSLOPT_NATIVE_CA,
        ];
    }
    foreach ($models as $model) {
        foreach ($keys as $keyIndex => $key) {
            try {
                $response = Http::timeout(35)
                    ->withOptions($httpOptions)
                    ->withToken($key)
                    ->acceptJson()
                    ->post($baseUrl . '/chat/completions', [
                        'model' => $model,
                        'temperature' => 0.7,
                        'max_tokens' => 1200,
                        'messages' => [
                            [
                                'role' => 'system',
                                'content' => 'You are an expert biology tutor. Answer the student\'s question in clear, natural English. They are viewing the ' . $modelName . ' model. Give a direct, accurate explanation that addresses the specific question.',
                            ],
                            ['role' => 'user', 'content' => $question],
                        ],
                    ]);

                if (!$response->successful()) {
                    $lastStatus = $response->status();
                    error_log("[biology chat] {$model} key " . ($keyIndex + 1) . " returned HTTP {$lastStatus}");
                    if (in_array($lastStatus, [401, 403], true)) {
                        break 2;
                    }
                    if ($lastStatus === 429) {
                        break;
                    }
                    continue;
                }

                $answer = trim((string) $response->json('choices.0.message.content', ''));
                if ($answer !== '') {
                    return response()->json(['answer' => mb_substr($answer, 0, 6000), 'model' => $model]);
                }
                error_log("[biology chat] {$model} returned an empty answer");
            } catch (\Throwable $error) {
                $lastStatus = null;
                error_log("[biology chat] {$model} key " . ($keyIndex + 1) . " failed: " . get_class($error));
            }
        }
    }

    $detail = $lastStatus === null
        ? 'Groq could not generate a biology answer. Check the server connection and try again.'
        : "Groq could not generate a biology answer (HTTP {$lastStatus}). Please try again.";
    return response()->json(['detail' => $detail], 502);
});

// ── Public auth routes ────────────────────────────────────────────────────────
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

Route::get('/opportunities', function (Request $request) {
    $sources = [
        ['url' => 'https://opportunitydesk.org/feed/', 'label' => 'Opportunity Desk', 'type' => 'Scholarship'],
        ['url' => 'https://www.scholars4dev.com/feed/', 'label' => 'Scholars4Dev', 'type' => 'Scholarship'],
        ['url' => 'https://afterschoolafrica.com/feed/', 'label' => 'After School Africa', 'type' => 'Fellowship'],
        ['url' => 'https://www.findaphd.com/rss/scholarships.aspx', 'label' => 'FindAPhD', 'type' => 'Research'],
    ];

    $items = [];

    $guessType = function (string $title, string $sourceType) {
        $text = strtolower($title);
        if (str_contains($text, 'research') || str_contains($text, 'phd') || str_contains($text, 'postdoc')) {
            return 'Research';
        }
        if (str_contains($text, 'fellowship') || str_contains($text, 'fellow')) {
            return 'Fellowship';
        }
        if (str_contains($text, 'scholarship') || str_contains($text, 'grant') || str_contains($text, 'award')) {
            return 'Scholarship';
        }
        return $sourceType;
    };

    $guessRegion = function (string $title, ?string $desc = null) {
        $text = strtolower($title . ' ' . ($desc ?? ''));
        if (str_contains($text, 'usa') || str_contains($text, 'united states') || str_contains($text, 'america')) {
            return '🇺🇸 USA';
        }
        if (str_contains($text, 'uk') || str_contains($text, 'united kingdom') || str_contains($text, 'britain') || str_contains($text, 'england')) {
            return '🇬🇧 UK';
        }
        if (str_contains($text, 'europe') || str_contains($text, 'germany') || str_contains($text, 'france') || str_contains($text, 'eu ')) {
            return '🇪🇺 EU';
        }
        if (str_contains($text, 'japan')) {
            return '🇯🇵 Japan';
        }
        if (str_contains($text, 'korea')) {
            return '🇰🇷 Korea';
        }
        if (str_contains($text, 'canada')) {
            return '🇨🇦 Canada';
        }
        if (str_contains($text, 'australia')) {
            return '🇦🇺 Australia';
        }
        return '🌍 International';
    };

    $fallback = [
        ['title' => 'Chevening Scholarships 2025', 'desc' => 'UK government scholarship for future leaders. Full funding for one-year masters degree at any UK university.', 'link' => 'https://www.chevening.org', 'source' => 'Chevening', 'type' => 'Scholarship', 'region' => '🇬🇧 UK', 'date' => ''],
        ['title' => 'Fulbright Foreign Student Program', 'desc' => 'Graduate study, advanced research, and teaching opportunities in the United States.', 'link' => 'https://foreign.fulbrightonline.org', 'source' => 'Fulbright', 'type' => 'Scholarship', 'region' => '🇺🇸 USA', 'date' => ''],
        ['title' => 'DAAD Research Grants', 'desc' => 'Research grants for doctoral candidates and young researchers to conduct research in Germany.', 'link' => 'https://www.daad.de', 'source' => 'DAAD', 'type' => 'Research', 'region' => '🇪🇺 EU', 'date' => ''],
        ['title' => 'Gates Cambridge Scholarship', 'desc' => 'Prestigious international scholarship at the University of Cambridge for outstanding postgraduate students.', 'link' => 'https://www.gatescambridge.org', 'source' => 'Gates Cambridge', 'type' => 'Fellowship', 'region' => '🇬🇧 UK', 'date' => ''],
        ['title' => 'JSPS Postdoctoral Fellowship', 'desc' => 'Opportunities for young foreign researchers to conduct research at Japanese universities.', 'link' => 'https://www.jsps.go.jp', 'source' => 'JSPS', 'type' => 'Research', 'region' => '🇯🇵 Japan', 'date' => ''],
        ['title' => 'Erasmus Mundus Joint Masters', 'desc' => 'Highly integrated international study programmes with monthly stipend across European universities.', 'link' => 'https://eacea.ec.europa.eu/erasmus', 'source' => 'EU Commission', 'type' => 'Scholarship', 'region' => '🇪🇺 EU', 'date' => ''],
    ];

    foreach ($sources as $source) {
        try {
            $response = Http::timeout(10)->get($source['url']);
            if (!$response->successful()) {
                continue;
            }

            $xml = @simplexml_load_string($response->body(), 'SimpleXMLElement', LIBXML_NOCDATA);
            if (! $xml || ! isset($xml->channel->item)) {
                continue;
            }

            foreach ($xml->channel->item as $entry) {
                $title = trim((string) $entry->title);
                $description = trim((string) $entry->description);
                $description = strip_tags($description);
                if (strlen($description) > 160) {
                    $description = substr($description, 0, 157) . '...';
                }

                $items[] = [
                    'title'  => $title,
                    'desc'   => $description,
                    'link'   => trim((string) $entry->link),
                    'date'   => isset($entry->pubDate) ? substr(trim((string) $entry->pubDate), 0, 10) : '',
                    'source' => $source['label'],
                    'type'   => $guessType($title, $source['type']),
                    'region' => $guessRegion($title, $description),
                ];
            }
        } catch (\Exception $e) {
            continue;
        }
    }

    if (count($items) === 0) {
        return response()->json(['status' => 'fallback', 'items' => $fallback]);
    }

    return response()->json(['status' => 'ok', 'items' => $items]);
});

// ── Protected routes (Sanctum token required) ─────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::get('/user',    [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // ── Classroom routes ──────────────────────────────────────────────────────

    // Teacher: create classroom
    Route::post('/classrooms',              [ClassroomController::class, 'create']);

    // Both: list own classrooms (teacher → owned, student → joined)
    Route::get('/classrooms',               [ClassroomController::class, 'index']);

    // Student: join via code
    Route::post('/classrooms/join',         [ClassroomController::class, 'join']);

    // Both: view classroom dashboard
    Route::get('/classrooms/{id}',          [ClassroomController::class, 'show']);

    // Teacher: send notification to classroom
    Route::post('/classrooms/{id}/notify',  [ClassroomController::class, 'notify']);

    // Student: leave a classroom
    Route::delete('/classrooms/{id}/leave', [ClassroomController::class, 'leave']);

    // Teacher: delete classroom
    Route::delete('/classrooms/{id}',       [ClassroomController::class, 'destroy']);
});