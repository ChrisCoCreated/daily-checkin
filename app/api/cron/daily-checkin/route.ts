import { NextRequest, NextResponse } from 'next/server';
import { initiateCall } from '@/lib/twilio';
import { createCheckin, getConversationSetByName } from '@/lib/db';
import { buildUrl } from '@/lib/url';

const personNumber = process.env.PERSON_NUMBER;

export async function GET(request: NextRequest) {
  // Verify this is coming from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!personNumber) {
      return NextResponse.json(
        { error: 'PERSON_NUMBER not configured' },
        { status: 500 }
      );
    }

    // Get conversation set (default to "current" for backward compatibility)
    const conversationSet = await getConversationSetByName('current');
    const conversationSetId = conversationSet?.id || null;

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
      contact_id: null,
      conversation_set_id: conversationSetId,
    });

    return NextResponse.json({ 
      success: true, 
      callId,
      message: 'Daily check-in call initiated',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in daily check-in cron:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initiate daily check-in', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

