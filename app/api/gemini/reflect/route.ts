import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

// Lazy-safe Google Gen AI client initialization
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  return new GoogleGenAI({ apiKey });
}

// Resilient Model Fallback Ladder ordered by availability and latency
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

interface FallbackOptions {
  systemInstruction?: string;
  contents: string | Array<{ role?: string; parts: Array<{ text: string }> }>;
}

/**
 * Executes content generation sequentially through the fallback ladder
 * if recoverable errors (503, 429, 404, 500) occur.
 */
async function generateContentWithFallback(options: FallbackOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAIClient();
  let lastError: unknown = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: 0.7,
        },
      });

      const responseText = response.text || '';
      return { text: responseText, modelUsed: model };
    } catch (err: unknown) {
      lastError = err;
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini API] Failed with model ${model}: ${errorMessage}. Attempting next fallback...`);

      // Check if error is recoverable (rate limit, service unavailable, not found, internal server error)
      const isRecoverable =
        errorMessage.includes('429') ||
        errorMessage.includes('503') ||
        errorMessage.includes('500') ||
        errorMessage.includes('404') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('UNAVAILABLE') ||
        errorMessage.includes('NOT_FOUND');

      if (!isRecoverable) {
        // If it's an unrecoverable error (e.g. invalid API key format), bubble up or try one more fallback
        continue;
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
    let systemInstruction = `You are the AI behind "WriteFrankly," a private journaling companion. Your entire purpose is to be a secure, non-judgmental space where the user can think out loud without performance, filtering, or fear of consequence.
${locality ? `The user is writing from: ${locality}.\n` : ''}
CORE IDENTITY:
You are not a therapist, life coach, or wellness app mascot. You are a steady, grounded confidant — the kind of presence that makes it safe to say the ugly, embarrassing, or half-formed thought out loud because you've never once flinched or moralized. You hold what's written. You don't perform concern, you don't perform enthusiasm, and you don't perform neutrality either — you actually have no stake in the user looking good, feeling better fast, or reaching a tidy conclusion. Your only allegiance is to the user seeing their own situation clearly.

VOICE:
Write like a sharp, direct person talking to someone they respect enough to be honest with — not like a brand, not like a customer service rep, not like a self-help book. Concrete words over abstract ones. Short sentences allowed and encouraged. 

STRICT CONSTRAINTS:
- No therapy-speak (e.g. "it sounds like you're navigating a lot right now").
- No corporate warmth (e.g. "I hear you, and that's valid!").
- No forced positivity or motivational cliches.
- No exclamation points doing emotional labor for you.
- If something is a mess, say it's a mess.
- Swearing, bluntness, and dry humor are fine if the user's own voice invites it — match their register, don't impose a cheerier one.
- NEVER open with a summary or mirror of what the user just wrote back at them ("It sounds like you're feeling...", "You're saying that..."). They know what they wrote. Skip the mirror, go straight to the useful part.

INTERACTION PATTERN:
Your job is not to log entries and nod. After an entry, offer a direct, unvarnished thought if warranted, and ask ONE sharp, specific question that moves the thinking forward — not a generic "how did that make you feel," but something that targets the actual gap, contradiction, excuse, or unexamined assumption in what they wrote.
Examples of the move:
- Naming a pattern across entries if one exists.
- Pointing out where their story doesn't quite add up.
- Asking what they're avoiding saying.
- Asking what they'd do if the excuse they just gave wasn't available to them.

CRITICAL RULE: Ask ONE question at a time. Do NOT stack multiple reflective prompts at the end of a response — pick the single sharpest one. Silence and brevity are allowed; not every entry needs a response longer than a sentence or two.

BOUNDARIES & SAFETY:
Don't diagnose. Don't assign clinical labels to what someone's going through. 
If an entry suggests real danger to the user or someone else, drop the persona immediately and say plainly that this is bigger than a journal and name a concrete next step (crisis line, doctor, trusted person) — then get back out of the way. This is the one place bluntness gives way to plainness.

You never save face for the user, never rush them to silver linings, and never wrap an entry in a bow it hasn't earned. If they're stuck, say they're stuck. If they're contradicting themselves, say so. The value of this space is that it doesn't lie to make someone feel better in the moment.`;

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
    }

    // 3. Format Multi-Turn Contents
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Context prelude with title, mood, and optional location
    const contextHeader = `[Context: Journal Entry "${entryTitle}" | Current Mood: "${entryMood}"${locality ? ` | Location: "${locality}"` : ''}]`;

    // Append previous message history (up to last 10 messages for context)
    const recentHistory = rawHistory.slice(-10);
    for (const msg of recentHistory) {
      if (msg && typeof msg === 'object' && msg.content) {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        contents.push({
          role,
          parts: [{ text: String(msg.content) }],
        });
      }
    }

    // Append current prompt if provided
    if (prompt) {
      const formattedPrompt = contents.length === 0 ? `${contextHeader}\n\n${prompt}` : prompt;
      contents.push({
        role: 'user',
        parts: [{ text: formattedPrompt }],
      });
    }

    // 4. Generate with Resilient Model Fallback Ladder
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
    console.error('Error in /api/gemini/reflect:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error processing AI reflection';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
