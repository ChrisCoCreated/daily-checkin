import { NextRequest, NextResponse } from 'next/server';
import { initiateCall } from '@/lib/twilio';
import { createCheckin } from '@/lib/db';

const personNumber = process.env.PERSON_NUMBER;

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

    const webhookUrl = `${baseUrl}/api/call/voice`;
    
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

