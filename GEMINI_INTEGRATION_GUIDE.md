# Backend Integration Guide: Business Card Scanner (Gemini API)

This document outlines the steps required to implement the backend support for the mobile app's Business Card Scanner feature. The mobile app sends OCR-extracted text to the backend, which delegates the parsing to Google's Gemini API.

## 1. Prerequisites

- You need a valid **Google Gemini API Key**.
- The project is assumed to be a standard **Laravel** application.

## 2. Environment Configuration

Add your Gemini API key to the `.env` file in the root of your Laravel project:

```env
GEMINI_API_KEY=AIzaSyYourActualApiKeyHere
```

## 3. Create the Controller

Create a new controller file at `app/Http/Controllers/GeminiController.php`.

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GeminiController extends Controller
{
    /**
     * Parses raw text from a business card using Gemini AI
     * and returns structured JSON data.
     */
    public function parseCard(Request $request)
    {
        // validate input
        $request->validate([
            'text' => 'required|string',
        ]);

        $text = $request->input('text');
        $apiKey = env('GEMINI_API_KEY');

        if (!$apiKey) {
            return response()->json(['error' => 'Gemini API key not configured'], 500);
        }

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}";

        // Prompt to instruct Gemini to extract specific fields
        $prompt = "Extract the following details from the text below and return ONLY a valid JSON object with these keys: name, designation, company, email, phone, website, address. If a field is not found, set it to null. Do not use markdown formatting or explanations. \n\nText: " . $text;

        try {
            $response = Http::post($url, [
                "contents" => [
                    [
                        "parts" => [
                            ["text" => $prompt]
                        ]
                    ]
                ]
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                // Extract the text content from Gemini's response structure
                $rawText = $data['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
                
                // Clean any potential markdown code blocks (e.g. ```json ... ```)
                $cleanJson = str_replace(['```json', '```'], '', $rawText);
                
                // Decode to ensure it's valid JSON before sending back
                $parsedData = json_decode($cleanJson, true);

                if (json_last_error() === JSON_ERROR_NONE) {
                    return response()->json($parsedData);
                } else {
                     return response()->json(['error' => 'Failed to decode AI response', 'raw' => $rawText], 500);
                }
            } else {
                return response()->json(['error' => 'Gemini API call failed', 'details' => $response->body()], $response->status());
            }

        } catch (\Exception $e) {
            return response()->json(['error' => 'Server error processing card', 'message' => $e->getMessage()], 500);
        }
    }
}
```

## 4. Define the API Route

Add the following route to your `routes/api.php` file:

```php
use App\Http\Controllers\GeminiController;

Route::post('/gemini/parse-card', [GeminiController::class, 'parseCard']);
```

## 5. Testing the Endpoint

You can test the endpoint using Postman or cURL.

**Endpoint:** `POST /api/gemini/parse-card`
**Headers:**
- `Content-Type: application/json`
- `Accept: application/json`

**Body (JSON):**
```json
{
    "text": "John Doe \n Software Engineer \n Tech Corp \n john@techcorp.com \n +1-555-0123"
}
```

**Expected Response (JSON):**
```json
{
    "name": "John Doe",
    "designation": "Software Engineer",
    "company": "Tech Corp",
    "email": "john@techcorp.com",
    "phone": "+1-555-0123",
    "website": null,
    "address": null
}
```
