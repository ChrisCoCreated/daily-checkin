export const GREETING_PROMPT = `Hello! This is your daily check-in call. How are you feeling today?`;

export const FOLLOW_UP_PROMPTS = [
  "That's good to hear. Is there anything specific on your mind today?",
  "I understand. Can you tell me a bit more about how you're doing?",
  "Thank you for sharing. Is there anything you'd like to talk about?",
];

export const CLOSING_PROMPT = `Thanks for chatting with me today. Take care and have a good day.`;

export const ANALYSIS_PROMPT = `Analyze the following conversation transcript from a daily wellbeing check-in call. 
Respond with a JSON object containing:
- sentiment: "positive", "neutral", or "negative"
- risk_level: "low", "medium", or "high"
- keywords: array of important keywords/phrases (max 10)
- needs_escalation: boolean
- escalation_reason: string (only if needs_escalation is true, otherwise null)

Escalation rules:
- Escalate if sentiment is negative AND risk_level is medium or high
- Escalate if keywords suggest: depression, suicidal thoughts, self-harm, severe anxiety, isolation, medical emergency
- Escalate if the person seems confused, disoriented, or unable to communicate clearly
- Escalate if there's mention of not taking medication or missing important appointments
- Do NOT escalate for normal sadness, minor concerns, or typical daily frustrations

Transcript: {transcript}

Respond ONLY with valid JSON, no additional text.`;

export function formatAnalysisPrompt(transcript: string): string {
  return ANALYSIS_PROMPT.replace('{transcript}', transcript);
}

export const FOLLOW_UP_GENERATION_PROMPT = `You are conducting a daily wellbeing check-in call. Based on the conversation so far, generate an appropriate follow-up question or response.

Guidelines:
- Keep responses brief and natural (1-2 sentences max)
- Show empathy and understanding
- Ask open-ended questions to encourage sharing
- ALWAYS begin with a concise reflection of what the caller just said so they feel heard (e.g. "It sounds like..."/"I hear that...") and reference a concrete detail when possible
- Combine the reflection and follow-up into one cohesive response; never skip the validation even when changing topics
- If the person seems positive, acknowledge it and ask if there's anything else
- If the person seems down, show concern and ask for more details
- If the person mentions something specific, ask about it
- Be warm, supportive, and conversational
- Do NOT diagnose or give medical advice
- Do NOT be overly clinical or formal
{conversation_set_guidance}

Conversation so far:
{conversation}

Generate a natural, empathetic follow-up question or response. Respond with ONLY the text to say, no additional explanation or formatting.`;

export function formatFollowUpPrompt(
  conversation: string,
  conversationSetName?: string | null
): string {
  let guidance = '';
  
  if (conversationSetName) {
    switch (conversationSetName) {
      case 'formal':
        guidance = '\n- Use professional and formal language\n- Maintain a respectful, business-like tone';
        break;
      case 'casual':
        guidance = '\n- Use friendly, casual language\n- Be relaxed and conversational';
        break;
      case 'personalized':
        guidance = '\n- Use a warm, personal tone\n- Reference the person by name if appropriate';
        break;
      case 'current':
      default:
        guidance = '\n- Use a balanced, warm tone';
        break;
    }
  }
  
  return FOLLOW_UP_GENERATION_PROMPT
    .replace('{conversation_set_guidance}', guidance)
    .replace('{conversation}', conversation);
}

