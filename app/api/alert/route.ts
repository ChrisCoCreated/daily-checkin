import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/twilio';
import { getCheckins } from '@/lib/db';

const contactNumber = process.env.CONTACT_NUMBER;

export async function GET(request: NextRequest) {
  try {
    const checkinId = request.nextUrl.searchParams.get('checkinId');
    
    if (!checkinId) {
      return NextResponse.json(
        { error: 'checkinId parameter required' },
        { status: 400 }
      );
    }

    if (!contactNumber) {
      return NextResponse.json(
        { error: 'CONTACT_NUMBER not configured' },
        { status: 500 }
      );
    }

    const checkins = await getCheckins(100);
    const checkin = checkins.find(c => c.id === checkinId);

    if (!checkin) {
      return NextResponse.json(
        { error: 'Checkin not found' },
        { status: 404 }
      );
    }

    const message = `⚠️ Daily Check-In Alert

A concern was detected in today's check-in call.

Call ID: ${checkin.call_id}
Time: ${new Date(checkin.call_time).toLocaleString()}
Sentiment: ${checkin.sentiment || 'N/A'}
Risk Level: ${checkin.risk_level || 'N/A'}
Reason: ${checkin.escalation_reason || 'No specific reason provided'}

${checkin.transcript ? `Transcript: "${checkin.transcript.substring(0, 200)}${checkin.transcript.length > 200 ? '...' : ''}"` : 'No transcript available'}

Please follow up with the person as soon as possible.`;

    await sendSMS(contactNumber, message);

    return NextResponse.json({ 
      success: true, 
      message: 'Alert sent successfully' 
    });
  } catch (error) {
    console.error('Error sending alert:', error);
    return NextResponse.json(
      { error: 'Failed to send alert', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

