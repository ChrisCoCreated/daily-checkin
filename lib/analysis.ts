import OpenAI from 'openai';
import { formatAnalysisPrompt, formatFollowUpPrompt } from './prompts';

const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

if (!deepseekApiKey) {
  throw new Error('Missing DEEPSEEK_API_KEY');
}

// DeepSeek is OpenAI-compatible, use the same client with DeepSeek's base URL
const client = new OpenAI({
  apiKey: deepseekApiKey,
  baseURL: 'https://api.deepseek.com',
});

export interface AnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  risk_level: 'low' | 'medium' | 'high';
  keywords: string[];
  needs_escalation: boolean;
  escalation_reason: string | null;
}

export async function analyzeTranscript(transcript: string): Promise<AnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    return {
      sentiment: 'neutral',
      risk_level: 'low',
      keywords: [],
      needs_escalation: false,
      escalation_reason: null,
    };
  }

  try {
    const prompt = formatAnalysisPrompt(transcript);

    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a wellbeing analysis assistant. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from DeepSeek');
    }

    const parsed = JSON.parse(content) as AnalysisResult;

    // Validate and normalize the response
    return {
      sentiment: parsed.sentiment || 'neutral',
      risk_level: parsed.risk_level || 'low',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 10) : [],
      needs_escalation: Boolean(parsed.needs_escalation),
      escalation_reason: parsed.needs_escalation ? (parsed.escalation_reason || 'Concern detected in conversation') : null,
    };
  } catch (error) {
    console.error('Error analyzing transcript with DeepSeek:', error);
    
    // Fallback: basic keyword detection
    const lowerTranscript = transcript.toLowerCase();
    const hasConcern = 
      lowerTranscript.includes('depressed') ||
      lowerTranscript.includes('suicide') ||
      lowerTranscript.includes('self-harm') ||
      lowerTranscript.includes('emergency') ||
      lowerTranscript.includes('help');

    return {
      sentiment: hasConcern ? 'negative' : 'neutral',
      risk_level: hasConcern ? 'high' : 'low',
      keywords: extractKeywords(transcript),
      needs_escalation: hasConcern,
      escalation_reason: hasConcern ? 'Keyword-based concern detected' : null,
    };
  }
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
  
  const keywords = words
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10);
  
  return [...new Set(keywords)];
}

export async function generateFollowUpResponse(
  conversation: string,
  conversationSetName?: string | null
): Promise<string> {
  if (!conversation || conversation.trim().length === 0) {
    return "I understand. Can you tell me a bit more about how you're doing?";
  }

  try {
    const prompt = formatFollowUpPrompt(conversation, conversationSetName);

    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'You are a compassionate wellbeing check-in assistant. Every response must begin with a brief validation that reflects what the caller just shared before gently continuing the conversation. Keep things natural and concise for a phone call.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from DeepSeek');
    }

    // Clean up the response - remove quotes if present, ensure it ends properly
    let cleaned = content.replace(/^["']|["']$/g, '').trim();
    
    // Ensure it ends with appropriate punctuation
    if (!cleaned.match(/[.!?]$/)) {
      cleaned += '.';
    }

    return cleaned;
  } catch (error) {
    console.error('Error generating follow-up response with AI:', error);
    
    // Fallback to context-aware static responses
    const lowerConversation = conversation.toLowerCase();
    const reflection = buildReflectiveValidation(conversation);
    if (lowerConversation.includes('good') || lowerConversation.includes('fine') || lowerConversation.includes('okay')) {
      return `${reflection} Is there anything specific on your mind today?`;
    } else if (lowerConversation.includes('bad') || lowerConversation.includes('not good') || lowerConversation.includes('struggling')) {
      return `${reflection} Can you tell me a bit more about what's going on?`;
    } else {
      return `${reflection} Is there anything else you'd like to talk about?`;
    }
  }
}

function buildReflectiveValidation(conversation: string): string {
  const statement = getLastStatement(conversation);
  if (!statement) {
    return 'I hear you.';
  }

  const normalized = normalizeForReflection(statement);
  if (!normalized) {
    return 'I hear you.';
  }

  const firstChar = normalized.charAt(0);
  const lowered = `${firstChar.toLowerCase()}${normalized.slice(1)}`;
  return `It sounds like ${lowered}.`;
}

function getLastStatement(conversation: string): string | null {
  const trimmed = conversation.trim();
  if (!trimmed) {
    return null;
  }

  const blocks = trimmed
    .split(/\r?\n/)
    .map(block => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return null;
  }

  const lastBlock = blocks[blocks.length - 1];
  const sentences = lastBlock.match(/[^.?!]+[.?!]?/g);
  const candidate = sentences && sentences.length > 0 ? sentences[sentences.length - 1].trim() : lastBlock;

  const cleaned = candidate.replace(/["“”]+/g, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeForReflection(statement: string): string {
  let normalized = statement.replace(/^[^a-zA-Z0-9]+/, '').replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '';
  }

  const replacements: Array<[RegExp, string]> = [
    [/^i'm\b/i, "you're"],
    [/^i am\b/i, 'you are'],
    [/^i've\b/i, "you've"],
    [/^i feel\b/i, 'you feel'],
    [/^i was\b/i, 'you were'],
    [/^i have\b/i, 'you have'],
    [/^i had\b/i, 'you had'],
    [/^i\b/i, 'you'],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(normalized)) {
      normalized = normalized.replace(pattern, replacement);
      break;
    }
  }

  normalized = normalized.replace(/[.!?]+$/, '').trim();
  return normalized;
}

