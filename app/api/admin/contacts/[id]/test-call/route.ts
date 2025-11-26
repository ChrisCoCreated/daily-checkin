import { NextRequest, NextResponse } from 'next/server';
import { getContactById, getConversationSetByName } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { initiateCall } from '@/lib/twilio';
import { createCheckin } from '@/lib/db';
import { buildUrl } from '@/lib/url';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    
    const contact = await getContactById(params.id);
    
    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }
    
    // Validate Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_NUMBER;
    
    if (!accountSid || !authToken || !twilioNumber) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    // Get optional conversation set from request body (default to "personalized" for contacts)
    const body = await request.json().catch(() => ({}));
    const conversationSetName = body.conversation_set_name || 'personalized';
    const conversationSet = await getConversationSetByName(conversationSetName);
    const conversationSetId = conversationSet?.id || null;
    
    const webhookUrl = buildUrl('/api/call/voice');
    
    const callId = await initiateCall(contact.number_to_call, webhookUrl);
    
    // Create initial checkin record with contact and conversation set
    await createCheckin({
      call_id: callId,
      transcript: null,
      sentiment: null,
      risk_level: null,
      keywords: null,
      needs_escalation: false,
      escalation_reason: null,
      responded: false,
      contact_id: contact.id,
      conversation_set_id: conversationSetId,
    });
    
    return NextResponse.json({
      success: true,
      callId,
      message: `Test call initiated to ${contact.name}`,
    });
  } catch (error) {
    console.error('Error initiating test call:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      {
        error: 'Failed to initiate test call',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

