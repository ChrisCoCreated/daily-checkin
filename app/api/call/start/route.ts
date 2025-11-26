import { NextRequest, NextResponse } from 'next/server';
import { initiateCall } from '@/lib/twilio';
import { createCheckin } from '@/lib/db';
import { buildUrl } from '@/lib/url';

const personNumber = process.env.PERSON_NUMBER;

export async function POST(request: NextRequest) {
  try {
    if (!personNumber) {
      return NextResponse.json(
        { error: 'PERSON_NUMBER not configured' },
        { status: 500 }
      );
    }

    // Validate Twilio credentials are present
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_NUMBER;

    if (!accountSid || !authToken || !twilioNumber) {
      return NextResponse.json(
        { 
          error: 'Twilio credentials not configured',
          details: {
            hasAccountSid: !!accountSid,
            hasAuthToken: !!authToken,
            hasTwilioNumber: !!twilioNumber,
          }
        },
        { status: 500 }
      );
    }

    const webhookUrl = buildUrl('/api/call/voice');
    
    const callId = await initiateCall(personNumber, webhookUrl);

    // Create initial checkin record
    await createCheckin({
      call_id: callId,
      transcript: null,
      sentiment: null,
      risk_level: null,
      keywords: null,
      needs_escalation: false,
      escalation_reason: null,
      responded: false,
    });

    return NextResponse.json({ 
      success: true, 
      callId,
      message: 'Call initiated successfully' 
    });
  } catch (error) {
    console.error('Error starting call:', error);
    return NextResponse.json(
      { error: 'Failed to initiate call', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

