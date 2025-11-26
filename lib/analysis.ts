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

export async function generateFollowUpResponse(conversation: string): Promise<string> {
  if (!conversation || conversation.trim().length === 0) {
    return "I understand. Can you tell me a bit more about how you're doing?";
  }

  try {
    const prompt = formatFollowUpPrompt(conversation);

    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a compassionate wellbeing check-in assistant. Generate brief, natural responses for phone conversations.',
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
    if (lowerConversation.includes('good') || lowerConversation.includes('fine') || lowerConversation.includes('okay')) {
      return "That's good to hear. Is there anything specific on your mind today?";
    } else if (lowerConversation.includes('bad') || lowerConversation.includes('not good') || lowerConversation.includes('struggling')) {
      return "I'm sorry to hear that. Can you tell me a bit more about what's going on?";
    } else {
      return "Thank you for sharing. Is there anything else you'd like to talk about?";
    }
  }
}

