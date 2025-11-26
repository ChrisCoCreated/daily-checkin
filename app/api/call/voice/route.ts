import { NextRequest, NextResponse } from 'next/server';
import { generateTwiML, say, gather, hangup, saySlow } from '@/lib/twilio';
import { getCheckinByCallId, updateCheckin, getConversationSetById, getContactById, getConversationSetByName } from '@/lib/db';
import { renderTemplate } from '@/lib/conversations';
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

    // Load conversation set and contact
    const checkin = await getCheckinByCallId(callSid);
    let conversationSet = null;
    let contact = null;
    let greetingText = 'Hello! This is your daily check-in call. How are you feeling today?'; // Default fallback

    if (checkin) {
      // Load conversation set
      if (checkin.conversation_set_id) {
        conversationSet = await getConversationSetById(checkin.conversation_set_id);
      } else {
        // Fallback to "current" conversation set if none specified
        const defaultSet = await getConversationSetByName('current');
        conversationSet = defaultSet;
      }

      // Load contact if available
      if (checkin.contact_id) {
        contact = await getContactById(checkin.contact_id);
      }

      // Render greeting template with contact variables
      if (conversationSet) {
        greetingText = renderTemplate(conversationSet.greeting_template, contact);
      }
    }

    // Use slow speech if contact has talk_slowly enabled
    const sayFunction = contact?.talk_slowly ? saySlow : say;

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
      sayFunction(greetingText) +
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
