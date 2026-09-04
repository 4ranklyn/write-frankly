import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { scrubPII } from '@/lib/sanitizer';

// Lazy-safe Google Gen AI client initialization
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Resilient Model Fallback Ladder ordered as requested:
// 1. gemini-3.8-flash (Primary)
// 2. gemini-3.7-flash (First fallback)
// 3. gemini-3.5-flash-lite (Fast low-token fallback)
// 4. gemini-3.1-flash-lite (Cost-effective fallback)
// 5. gemini-flash-latest (Cheapest dynamic alias available)
const MODEL_FALLBACK_LADDER = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

interface FallbackOptions {
  systemInstruction?: string;
  contents: string | Array<{ role?: string; parts: Array<{ text: string }> }>;
}

/**
 * Executes content generation sequentially through the fallback ladder
 * with optimized ThinkingLevel.LOW to minimize token usage and latency.
 */
async function generateContentWithFallback(options: FallbackOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAIClient();
  let lastError: unknown = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    const isGemini3 = model.startsWith('gemini-3');

    // Attempt with low thinking level for fast response and minimal token consumption
    const configsToTry: Array<{
      systemInstruction?: string;
      temperature: number;
      thinkingConfig?: { thinkingLevel: ThinkingLevel };
    }> = isGemini3
      ? [
          {
            systemInstruction: options.systemInstruction,
            temperature: 0.7,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
          },
          {
            systemInstruction: options.systemInstruction,
            temperature: 0.7,
          },
        ]
      : [
          {
            systemInstruction: options.systemInstruction,
            temperature: 0.7,
          },
        ];

    for (const config of configsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config,
        });

        const responseText = response.text || '';
        return { text: responseText, modelUsed: model };
      } catch (err: unknown) {
        lastError = err;
        const errorMessage = err instanceof Error ? err.message : String(err);

        // If this model rejected thinkingConfig, retry immediately on the fallback config for this model
        if (config.thinkingConfig && (errorMessage.includes('thinking') || errorMessage.includes('invalid') || errorMessage.includes('400'))) {
          continue;
        }

        console.warn(`[Gemini API] Failed with model ${model}: ${errorMessage}. Attempting next fallback...`);

        // Check if error is recoverable
        const isRecoverable =
          errorMessage.includes('429') ||
          errorMessage.includes('503') ||
          errorMessage.includes('500') ||
          errorMessage.includes('404') ||
          errorMessage.includes('RESOURCE_EXHAUSTED') ||
          errorMessage.includes('UNAVAILABLE') ||
          errorMessage.includes('NOT_FOUND');

        if (!isRecoverable) {
          break;
        }
        break;
      }
    }
  }

  throw new Error(
    `All models in fallback ladder failed. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export async function POST(req: NextRequest) {
  try {
    // 1. Top-Level Request Deserialization (Ordering & Defensive Ingestion)
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload in request body' },
        { status: 400 }
      );
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const mode = typeof body.mode === 'string' ? body.mode : 'reflect';
    const locality = typeof body.locality === 'string' ? body.locality.trim() : '';
    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const entryTitle = typeof body.title === 'string' ? body.title : 'Reflection';
    const entryMood = typeof body.mood === 'string' ? body.mood : 'thoughtful';

    if (!prompt && rawHistory.length === 0) {
      return NextResponse.json(
        { error: 'Prompt or conversation history is required' },
        { status: 400 }
      );
    }

    // 2. Build Structured System Instruction based on Core Identity, Voice, Interaction Pattern & Boundaries
    let systemInstruction = `You are Frank, an attentive, empathetic, and grounded confidant. Your role is to hold space for the user's unfiltered thoughts, helping them unpack their experiences without judgment, clinical detachment, or toxic positivity.

### Core Persona & Tone
- **Warm & Grounded:** Speak like an emotionally mature, trusted companion. Your tone is calm, warm, perceptive, and candid.
- **Emotionally Attuned:** Before analyzing or problem-solving, explicitly validate the emotional weight of what was shared. Sit with difficult emotions instead of immediately trying to fix them.
- **Natural & Human:** Avoid mechanical therapeutic jargon (e.g., "I hear that you are feeling...", "It is valid to feel..."). Speak conversationally, using natural cadence, breathing room, and sincere reflections.
- **Focused on Depth:** Reflect back the specific language, metaphors, or dilemmas the user raised. Do not offer generic platitudes.

### Response Directives
1. **Mirror & Validate:** Start by acknowledging what stands out most in the entry. Let the user know they were heard on a human level.
2. **Offer Gentle Perspective:** Provide one grounded observation or reframe that helps connect the dots between their actions, environment, and feelings.
3. **End with an Open Inquiry:** Conclude with one warm, reflective question that invites them to go deeper into themselves, rather than testing or quizzing them.
4. **Length:** Keep responses concise and focused (1–2 short paragraphs). Do not overwhelm a vulnerable moment with walls of text.`;

    if (locality) {
      systemInstruction += `\n\nThe user is writing from: ${locality}.`;
    }

    if (mode === 'summarize') {
      systemInstruction += `
SPECIAL DIRECTIVE (Cut to the Point):
Do not provide a polite corporate summary. Strip out the rationalizations and state the raw core conflict, reality, and unvarnished truth of this entry in 2-3 blunt, concrete sentences. Follow with 1 single sharp question.`;
    } else if (mode === 'action_items') {
      systemInstruction += `
SPECIAL DIRECTIVE (Pragmatic Action):
Cut through overthinking and hesitation. State 1-2 immediate, non-negotiable practical steps with zero fluff. Then ask 1 single sharp question targeting the exact friction point preventing action.`;
    } else if (mode === 'reframe') {
      systemInstruction += `
SPECIAL DIRECTIVE (Reality Check / Call Out Contradiction):
Directly target the unexamined assumption, excuse, or contradiction in what was written. Name it plainly without softening language, and ask 1 single probing question that tests whether their current narrative holds up.`;
    } else if (mode === 'debrief') {
      systemInstruction += `
SPECIAL DIRECTIVE (Check-in Debrief):
You are debriefing the writer immediately after they finished a journal entry. Acknowledge the emotional texture of what was just written, validate their honesty, and offer one gentle, perceptive open-ended question to kick off the conversation. Keep it conversational and supportive.`;
    } else if (mode === 'global_checkin') {
      systemInstruction += `
SPECIAL DIRECTIVE (Holistic Confidant Check-in):
Review the user's recent themes and emotional trajectory. Welcome them back, summarize the mood pattern gently, and ask how they are feeling right now in this moment. Listen deeply, holding space without judgment or rush to problem-solve.`;
    }

    // 3. Format Multi-Turn Contents with In-Memory PII Masking
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Context prelude with title, mood, and optional location (scrubbed)
    const safeTitle = scrubPII(entryTitle);
    const safeLocality = locality ? scrubPII(locality) : '';
    const contextHeader = `[Context: Journal Entry "${safeTitle}" | Current Mood: "${entryMood}"${safeLocality ? ` | Location: "${safeLocality}"` : ''}]`;

    // Append previous message history (up to last 10 messages for context, masked in RAM)
    const recentHistory = rawHistory.slice(-10);
    for (const msg of recentHistory) {
      if (msg && typeof msg === 'object' && msg.content) {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        const safeContent = scrubPII(String(msg.content));
        contents.push({
          role,
          parts: [{ text: safeContent }],
        });
      }
    }

    // Append current prompt if provided (masked in RAM)
    if (prompt) {
      const safePrompt = scrubPII(prompt);
      const formattedPrompt = contents.length === 0 ? `${contextHeader}\n\n${safePrompt}` : safePrompt;
      contents.push({
        role: 'user',
        parts: [{ text: formattedPrompt }],
      });
    }

    // 4. Log metadata ONLY. Never the user payload.
    console.log(`[INFO] Processing journal AI analysis | Mode: ${mode} | MessagesCount: ${contents.length} | HasLocality: ${Boolean(locality)}`);

    // 5. Generate with Resilient Model Fallback Ladder
    const result = await generateContentWithFallback({
      systemInstruction,
      contents,
    });

    return NextResponse.json({
      text: result.text,
      modelUsed: result.modelUsed,
      mode,
    });
  } catch (error) {
    // Log error metadata only without payload
    const errorStatus = (error as { status?: number })?.status || 500;
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error(`[ERROR] AI processing failed | Status: ${errorStatus} | ErrorName: ${errorName}`);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error processing AI reflection';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
