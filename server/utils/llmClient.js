const { getToolSchemasForRole, runTool } = require('./chatTools');

// Groq and OpenAI both speak the same /chat/completions + tools shape, so a
// single caller works for both — only the base URL, key, and default model
// differ. Gemini's function-calling format is different enough that it's
// kept on the plain-text (no tools) path below rather than duplicating the
// agent loop for a third shape.
function getToolCapableProvider() {
  if (process.env.GROQ_API_KEY) {
    return {
      name: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1/chat/completions',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }
  return null;
}

async function callChatCompletions({ apiKey, baseUrl, model, messages, tools }) {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      ...(tools ? { tools, tool_choice: 'auto' } : {}),
      max_tokens: 400,
    }),
  });
  if (!res.ok) {
    console.error('LLM API error:', res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return data.choices?.[0]?.message || null;
}

const SYSTEM_PROMPT = (role, studentContext) =>
  `You are "NSS Saathi", a warm, encouraging assistant for the NSS Value Added Course ERP at Delhi Technological University. ` +
  `You are talking to ${role === 'admin' ? 'an NSS coordinator/teacher' : 'a student'}. ` +
  `Use the available tools to look up real, current data before answering anything about hours, tasks, events, rank, or certificates — never guess or make up numbers. ` +
  `Keep replies short and conversational (2-4 sentences), and reference the conversation history naturally rather than repeating yourself. ` +
  `If something is outside what your tools or the FAQ context cover, say so honestly and suggest contacting the NSS coordinator.` +
  (studentContext ? `\n\nCurrent user: ${studentContext}` : '');

// Runs the tool-calling agent loop: ask the model, execute any tool calls it
// requests, feed the results back, repeat until it answers in plain text
// (capped at 3 rounds so a confused model can't loop forever).
async function runAgentTurn({ user, question, history, faqContext }) {
  const provider = getToolCapableProvider();
  if (!provider) return null;

  const studentContext =
    user.role === 'student' ? `${user.name}, ${user.totalHours}h / ${user.totalPoints}pts logged so far` : user.name;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT(user.role, studentContext) + (faqContext ? `\n\nRelevant FAQ context:\n${faqContext}` : '') },
    ...history,
    { role: 'user', content: question },
  ];

  const tools = getToolSchemasForRole(user.role);
  const toolsUsed = [];

  for (let round = 0; round < 3; round++) {
    const message = await callChatCompletions({ ...provider, messages, tools });
    if (!message) return null;

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { answer: message.content?.trim(), toolsUsed };
    }

    messages.push(message);
    for (const call of message.tool_calls) {
      const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      const result = await runTool(call.function.name, user, args);
      toolsUsed.push(call.function.name);
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return { answer: "I looked into a few things but couldn't pin down a confident answer — please check with your NSS coordinator.", toolsUsed };
}

// Plain-text fallback for when only Gemini is configured (no tool support
// here) or as the very last resort — pure FAQ-grounded answer, no live data.
async function generateAnswer({ question, context, studentContext }) {
  const systemPrompt =
    `You are "NSS Saathi", the assistant for the NSS Value Added Course ERP at Delhi Technological University. ` +
    `Answer only using the provided FAQ context and the student's own record below. Be concise (2-4 sentences). ` +
    `If the context doesn't cover the question, say you're not certain and suggest contacting the NSS coordinator.\n\n` +
    `FAQ CONTEXT:\n${context}\n\nSTUDENT RECORD:\n${studentContext || 'N/A'}`;

  const toolProvider = getToolCapableProvider();
  if (toolProvider) {
    const message = await callChatCompletions({
      ...toolProvider,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    });
    return message?.content?.trim() || null;
  }

  if (process.env.GEMINI_API_KEY) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\nQuestion: ${question}` }] }] }),
      }
    );
    if (!res.ok) {
      console.error('Gemini API error:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  }

  return null;
}

module.exports = { generateAnswer, runAgentTurn, getToolCapableProvider };
