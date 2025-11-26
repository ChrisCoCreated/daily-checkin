import { NextRequest, NextResponse } from 'next/server';
import { generateTwiML, say, gather, hangup } from '@/lib/twilio';
import { GREETING_PROMPT } from '@/lib/prompts';
import { getCheckinByCallId, updateCheckin } from '@/lib/db';
import { buildUrl } from '@/lib/url';

// Ensure this route is publicly accessible for Twilio webhooks
export const dynamic = 'force-dynamic';

// Allow GET for health checks
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Twilio webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    // Log incoming request for debugging
    console.log('Twilio webhook received at /api/call/voice', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
    });
    
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    
    if (!callSid) {
      console.error('Missing CallSid in Twilio webhook');
      return new NextResponse(generateTwiML(hangup()), {
        headers: { 'Content-Type': 'text/xml' },
        status: 200, // Always return 200 to Twilio even on errors
      });
    }

    console.log('Processing call:', { callSid, callStatus });

    // Check for failure cases
    if (callStatus === 'no-answer' || callStatus === 'busy' || callStatus === 'failed') {
      const checkin = await getCheckinByCallId(callSid);
      if (checkin) {
        await updateCheckin(checkin.id, {
          needs_escalation: true,
          escalation_reason: `Call ${callStatus}`,
          responded: false,
        });
      }
      return new NextResponse(generateTwiML(hangup()), {
        headers: { 'Content-Type': 'text/xml' },
        status: 200,
      });
    }

    // Machine detection or voicemail
    const answeredBy = formData.get('AnsweredBy') as string;
    if (answeredBy === 'machine' || answeredBy === 'fax') {
      const checkin = await getCheckinByCallId(callSid);
      if (checkin) {
        await updateCheckin(checkin.id, {
          needs_escalation: true,
          escalation_reason: `Answered by ${answeredBy}`,
          responded: false,
        });
      }
      return new NextResponse(generateTwiML(hangup()), {
        headers: { 'Content-Type': 'text/xml' },
        status: 200,
      });
    }

    // Greeting and gather response
    // Start with chunkIndex 0 for the first question
    const gatherUrl = buildUrl('/api/call/gather', { 
      callSid,
      questionIndex: '0',
      chunkIndex: '0',
    });
    const partialResultUrl = buildUrl('/api/call/gather', { 
      callSid,
      questionIndex: '0',
      chunkIndex: '0',
      partial: 'true',
    });
    
    const twiml = generateTwiML(
      say(GREETING_PROMPT) +
      gather(gatherUrl, undefined, 60, 'auto', partialResultUrl)
    );

    console.log('Returning TwiML for call:', callSid);

    return new NextResponse(twiml, {
      headers: { 
        'Content-Type': 'text/xml',
        'Cache-Control': 'no-cache',
      },
      status: 200,
    });
  } catch (error) {
    console.error('Error in voice route:', error);
    // Always return valid TwiML to Twilio, even on errors
    return new NextResponse(generateTwiML(hangup()), {
      headers: { 'Content-Type': 'text/xml' },
      status: 200,
    });
  }
}
