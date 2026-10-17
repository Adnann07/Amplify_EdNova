<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BiologyVoiceoverTest extends TestCase
{
    public function test_it_generates_voiceover_segments_with_groq(): void
    {
        $hadEnvKey = array_key_exists('GROQ_KEYS', $_ENV);
        $previousEnvKey = $_ENV['GROQ_KEYS'] ?? null;
        $hadServerKey = array_key_exists('GROQ_KEYS', $_SERVER);
        $previousServerKey = $_SERVER['GROQ_KEYS'] ?? null;
        $_ENV['GROQ_KEYS'] = '["test-groq-key"]';
        $_SERVER['GROQ_KEYS'] = '["test-groq-key"]';

        Http::fake([
            '*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'segments' => [
                                ['label' => 'Overview', 'text' => 'Overview explanation.'],
                                ['label' => 'Structure', 'text' => 'Structure explanation.'],
                                ['label' => 'Features', 'text' => 'Feature explanation.'],
                                ['label' => 'Function', 'text' => 'Function explanation.'],
                            ],
                        ]),
                    ],
                ]],
            ], 200),
        ]);

        try {
            $this->postJson('/api/biology/voiceover', ['model_name' => 'Human Kidney'])
                ->assertOk()
                ->assertJsonCount(4, 'segments')
                ->assertJsonPath('segments.0.label', 'Overview');

            Http::assertSent(fn (ClientRequest $request) =>
                str_ends_with($request->url(), '/chat/completions')
                && $request->hasHeader('Authorization', 'Bearer test-groq-key')
                && $request['model'] === 'openai/gpt-oss-20b'
            );
        } finally {
            if ($hadEnvKey) {
                $_ENV['GROQ_KEYS'] = $previousEnvKey;
            } else {
                unset($_ENV['GROQ_KEYS']);
            }
            if ($hadServerKey) {
                $_SERVER['GROQ_KEYS'] = $previousServerKey;
            } else {
                unset($_SERVER['GROQ_KEYS']);
            }
        }
    }
}
