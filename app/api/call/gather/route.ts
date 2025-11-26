import { NextRequest, NextResponse } from 'next/server';
import { generateTwiML, say, hangup, gather } from '@/lib/twilio';
import { FOLLOW_UP_PROMPTS, CLOSING_PROMPT } from '@/lib/prompts';
import { getCheckinByCallId, updateCheckin } from '@/lib/db';
import { analyzeTranscript } from '@/lib/analysis';

// Ensure this route is publicly accessible for Twilio webhooks
export const dynamic = 'force-dynamic';

// Get base URL - prefer NEXT_PUBLIC_BASE_URL, fallback to VERCEL_URL, then localhost
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    const url = process.env.NEXT_PUBLIC_BASE_URL.trim();
    return url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

const baseUrl = getBaseUrl();

interface GatherState {
  transcript: string[];
  questionIndex: number;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const speechResult = formData.get('SpeechResult') as string | null;
    const questionIndex = parseInt(request.nextUrl.searchParams.get('questionIndex') || '0');

    const checkin = await getCheckinByCallId(callSid);
    if (!checkin) {
      return new NextResponse(generateTwiML(hangup()), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Handle silence or no response
    if (!speechResult || speechResult.trim().length === 0) {
      if (questionIndex === 0) {
        // First question - no response, escalate
        await updateCheckin(checkin.id, {
          needs_escalation: true,
          escalation_reason: 'No response to initial greeting',
          responded: false,
        });
        return new NextResponse(generateTwiML(hangup()), {
          headers: { 'Content-Type': 'text/xml' },
        });
      } else {
        // Later questions - just close
        const fullTranscript = checkin.transcript || '';
        await processTranscript(checkin.id, fullTranscript);
        return new NextResponse(generateTwiML(say(CLOSING_PROMPT) + hangup()), {
          headers: { 'Content-Type': 'text/xml' },
        });
      }
    }

    // Accumulate transcript
    const currentTranscript = checkin.transcript 
      ? `${checkin.transcript} ${speechResult}`.trim()
      : speechResult;

    await updateCheckin(checkin.id, {
      transcript: currentTranscript,
      responded: true,
    });

    // Ask follow-up questions (max 2 follow-ups)
    if (questionIndex < FOLLOW_UP_PROMPTS.length) {
      const nextQuestion = FOLLOW_UP_PROMPTS[questionIndex];
      const nextGatherUrl = `${baseUrl}/api/call/gather?callSid=${callSid}&questionIndex=${questionIndex + 1}`;
      
      const twiml = generateTwiML(
        say(nextQuestion) +
        gather(nextGatherUrl, undefined, 10, 'auto')
      );

      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Done with questions - analyze and close
    await processTranscript(checkin.id, currentTranscript);
    
    return new NextResponse(generateTwiML(say(CLOSING_PROMPT) + hangup()), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error in gather route:', error);
    return new NextResponse(generateTwiML(hangup()), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

async function processTranscript(checkinId: string, transcript: string) {
  try {
    const analysis = await analyzeTranscript(transcript);
    
    await updateCheckin(checkinId, {
      transcript,
      sentiment: analysis.sentiment,
      risk_level: analysis.risk_level,
      keywords: analysis.keywords,
      needs_escalation: analysis.needs_escalation,
      escalation_reason: analysis.escalation_reason,
    });

    // Trigger escalation if needed
    if (analysis.needs_escalation) {
      const escalationUrl = `${getBaseUrl()}/api/alert?checkinId=${checkinId}`;
      // Fire and forget - don't wait for response
      fetch(escalationUrl).catch(err => console.error('Escalation error:', err));
    }
  } catch (error) {
    console.error('Error processing transcript:', error);
    // Still update with transcript even if analysis fails
    await updateCheckin(checkinId, {
      transcript,
      needs_escalation: true,
      escalation_reason: 'Analysis failed - manual review needed',
    });
  }
}

