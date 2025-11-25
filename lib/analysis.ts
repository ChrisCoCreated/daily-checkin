import OpenAI from 'openai';
import { formatAnalysisPrompt } from './prompts';

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  throw new Error('Missing OPENAI_API_KEY');
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
      throw new Error('No response from OpenAI');
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
    console.error('Error analyzing transcript:', error);
    
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

