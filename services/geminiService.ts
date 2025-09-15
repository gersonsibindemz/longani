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
As a state-of-the-art speech recognition model, your primary task is a literal audio transcription. Auto-detect the spoken language (likely Mozambican Portuguese).

**Core Rules:**
- Transcribe every utterance exactly as spoken. This includes filler words ("uhm," "ah," "tipo"), stutters, repetitions, and grammatical mistakes.
- Do not summarize, rephrase, correct grammar, or censor any content. Your output must be a pure, unfiltered representation of the audio.
- Use punctuation like commas, periods, hyphens (-), and ellipses (...) to accurately reflect speech patterns, pauses, and hesitations.
- Create short paragraphs for natural breaks in thought or when a different speaker might be talking (if discernible).
- If a word or phrase is unclear or impossible to understand, mark it as [inaudible].
- For significant pauses (longer than a few seconds), mark it as [pause].
- The final output must be only the raw transcript text. Do not add any commentary or introductory phrases.
`;

const cleanPromptTemplate = (rawTranscript: string) => `
You are an expert editor specializing in transforming raw, verbatim transcripts into professionally structured and readable documents. Your task is to convert the raw Portuguese transcript below into a clean, well-formatted HTML document.

**Raw Transcript:**
---
${rawTranscript}
---

**Instructions:**
1.  **Analyze and Structure:** Identify the main topics, arguments, and logical flow of the conversation. Create a clear structure using appropriate HTML headings (\`<h2>\`, \`<h3>\`, \`<h4>\`). DO NOT use \`<h1>\`. The structure should make the content easy to navigate and understand.
2.  **Format Lists:** Where appropriate, format items into bulleted lists using \`<ul>\` or numbered lists using \`<ol>\`.
3.  **Refine Content:** Meticulously correct grammar, spelling, and punctuation. Remove filler words (e.g., "uhm," "ah," "tipo"), false starts, and unnecessary repetitions. Rewrite sentences for better clarity and flow, but **you must strictly preserve the original meaning, intent, and voice of the speaker(s)**. Use standard paragraph tags (\`<p>\`).
4.  **Add Emphasis:** Use \`<strong>\` tags to highlight key terms, conclusions, or important statements. Use \`<em>\` for more subtle emphasis where natural.
5.  **Output Requirements:** Provide ONLY the HTML body content. Do not include \`<html>\`, \`<body>\`, or markdown fences like \`\`\`html\`\`\`. The output must be ready to be injected directly into a webpage.
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
            thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster, direct transcription
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