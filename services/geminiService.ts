// FIX: Replaced deprecated `GenerateContentRequest` with `GenerateContentParameters`.
import { GoogleGenAI, GenerateContentParameters } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * A generic function to handle streaming content generation from the Gemini API.
 * It centralizes the API call, streaming loop, and error handling.
 * @param request The complete request object for the `generateContentStream` API call.
 * @returns An async generator that yields the text chunks from the response.
 */
// FIX: Replaced deprecated `GenerateContentRequest` with `GenerateContentParameters`.
async function* generateStream(request: GenerateContentParameters): AsyncGenerator<string> {
    try {
        const responseStream = await ai.models.generateContentStream(request);
        for await (const chunk of responseStream) {
            // Ensure we only yield non-empty text parts
            if (chunk.text) {
                yield chunk.text;
            }
        }
    } catch (error) {
        // Log the original error here for context, but re-throw it so the UI layer
        // can use the full error details to generate a user-friendly message.
        console.error("Error during Gemini API stream:", error);
        throw error;
    }
}


const transcribePrompt = `
Your task is a literal audio transcription. Auto-detect the language (likely Mozambican Portuguese).

**Rules:**
- Transcribe everything exactly as spoken: filler words ("uhm," "ah"), stutters, pauses, and mistakes.
- Do not summarize, rephrase, or correct grammar.
- Use punctuation (..., -) to reflect speech patterns.
- Use short paragraphs for breaks in thought.
- Mark unclear audio as [inaudible] and long pauses as [pause].
- The output must be a raw, unfiltered transcript.
`;

const cleanPromptTemplate = (rawTranscript: string) => `
You are an expert editor. Your task is to convert the raw transcript below into a well-structured, professional HTML document in Portuguese.

**Raw Transcript:**
---
${rawTranscript}
---

**Instructions:**
1.  **Analyze and Structure:** Identify main topics and create a logical structure using HTML headings (\`<h2>\`, \`<h3>\`, \`<h4>\`). DO NOT use \`<h1>\`. Organize the content actively.
2.  **Format Lists:** Use \`<ul>\` for bullet points and \`<ol>\` for numbered steps where appropriate.
3.  **Refine Content:** Correct grammar and remove filler words ("uhm", "tipo"). Rewrite for clarity while strictly preserving the original meaning and speaker's voice. Use \`<p>\` tags for paragraphs.
4.  **Add Emphasis:** Use \`<strong>\` for key terms and \`<em>\` for subtle emphasis.
5.  **Output:** Provide ONLY the HTML body content. Do not include \`<html>\`, \`<body>\`, or markdown fences (\`\`\`html\`\`\`).
`;

export function transcribeAudio(audioBase64: string, audioMimeType: string): AsyncGenerator<string> {
    const audioPart = {
        inlineData: {
            data: audioBase64,
            mimeType: audioMimeType,
        },
    };

    // FIX: Replaced deprecated `GenerateContentRequest` with `GenerateContentParameters`.
    const request: GenerateContentParameters = {
        model: 'gemini-2.5-flash',
        contents: [{ parts: [audioPart, { text: transcribePrompt }] }],
        config: {
            temperature: 0.1, // Lower temperature for more deterministic, literal transcription
        }
    };
    
    return generateStream(request);
};

export function cleanTranscript(rawTranscript: string): AsyncGenerator<string> {
    if (!rawTranscript.trim()) {
        // Return an empty generator instead of just returning
        return (async function*() {})();
    }

    const prompt = cleanPromptTemplate(rawTranscript);
    // FIX: Replaced deprecated `GenerateContentRequest` with `GenerateContentParameters`.
    const request: GenerateContentParameters = {
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            temperature: 0.5, // Allow for some creativity in formatting
        }
    };

    return generateStream(request);
};