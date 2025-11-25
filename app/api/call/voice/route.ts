import { NextRequest, NextResponse } from 'next/server';
import { generateTwiML, say, gather, hangup } from '@/lib/twilio';
import { GREETING_PROMPT } from '@/lib/prompts';
import { getCheckinByCallId, updateCheckin } from '@/lib/db';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;

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
      });
    }

    // Greeting and gather response
    const gatherUrl = `${baseUrl}/api/call/gather?callSid=${callSid}`;
    
    const twiml = generateTwiML(
      say(GREETING_PROMPT) +
      gather(gatherUrl, undefined, 10, 'auto')
    );

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error in voice route:', error);
    return new NextResponse(generateTwiML(hangup()), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

