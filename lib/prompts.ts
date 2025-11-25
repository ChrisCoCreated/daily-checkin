export const GREETING_PROMPT = `Hello! This is your daily check-in call. How are you feeling today?`;

export const FOLLOW_UP_PROMPTS = [
  "That's good to hear. Is there anything specific on your mind today?",
  "I understand. Can you tell me a bit more about how you're doing?",
  "Thank you for sharing. Is there anything you'd like to talk about?",
];

export const CLOSING_PROMPT = `Thank you for taking the time to talk. Have a great day!`;

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

