
import { GoogleGenAI } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const transcribePrompt = `
Your task is to perform a fully literal transcription of the following audio. The language is likely Portuguese from Mozambique, but you should auto-detect it.

**Instructions:**
- Transcribe every word exactly as it is spoken, including all natural expressions, pauses, hesitations, stutters, and filler words (like "uhm," "ah," "tipo," etc.).
- DO NOT summarize or rephrase the content.
- DO NOT correct grammar, pronunciation, or misspoken words.
- Use punctuation (commas, ellipses, dashes) to reflect the speaker's natural tone, rhythm, and flow of speech. For example, use '...' for a thoughtful pause and a dash '-' for an abrupt stop.
- Create new, short paragraphs only when there is a clear break in thought or a significant pause for breath.
- If a word or phrase is unclear or inaudible, mark it as [inaudible].
- If there is a noticeable pause in speech, mark it as [pause].

The final text must be a raw, unfiltered representation of the spoken audio.
`;

const cleanPromptTemplate = (rawTranscript: string) => `
Your task is to take the following raw, literal transcript and transform it into a clean, professional, and well-organized written document in Portuguese.

**Raw Transcript:**
---
${rawTranscript}
---

**Instructions:**
- Preserve the speaker's original message, ideas, and authentic voice. DO NOT add any new information or content that was not in the original transcript.
- Restructure the content for clarity and readability.
- Add appropriate punctuation such as periods, commas, and question marks to create complete, grammatically correct sentences.
- Organize the text into logical paragraphs.
- Insert descriptive section headings or subheadings where they would help structure the document. Use markdown for formatting (e.g., ## Title).
- Use bullet points (using a '-' or '*') for lists of items, steps, or distinct ideas.
- Correct any grammatical errors or awkward phrasing from the spoken version, but ensure the tone remains authentic to the speaker.

The final output should be a professionally formatted version of the original speech, ready for reading. Output only the cleaned text.
`;

export async function* transcribeAudio(audioBase64: string, audioMimeType: string): AsyncGenerator<string> {
    try {
        const audioPart = {
            inlineData: {
                data: audioBase64,
                mimeType: audioMimeType,
            },
        };

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, { text: transcribePrompt }] },
            config: {
                temperature: 0.1, // Lower temperature for more deterministic, literal transcription
            }
        });
        
        for await (const chunk of responseStream) {
            yield chunk.text;
        }
    } catch (error) {
        console.error("Error during transcription stream:", error);
        throw new Error("Failed to transcribe audio. The model may not have been able to process the file.");
    }
};

export async function* cleanTranscript(rawTranscript: string): AsyncGenerator<string> {
    if (!rawTranscript.trim()) {
        return;
    }

    try {
        const prompt = cleanPromptTemplate(rawTranscript);
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.5, // Allow for some creativity in formatting
            }
        });

        for await (const chunk of responseStream) {
            yield chunk.text;
        }
    } catch (error) {
        console.error("Error during transcript cleaning stream:", error);
        throw new Error("Failed to clean up the transcript.");
    }
};