import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function GET() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const twilioNumber = process.env.TWILIO_NUMBER?.trim();

    if (!accountSid || !authToken || !twilioNumber) {
      return NextResponse.json({
        error: 'Missing credentials',
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasTwilioNumber: !!twilioNumber,
        accountSidPrefix: accountSid?.substring(0, 5) || 'N/A',
        authTokenLength: authToken?.length || 0,
        twilioNumber: twilioNumber || 'N/A',
      }, { status: 500 });
    }

    // Test authentication by fetching account info
    const client = twilio(accountSid, authToken);
    const account = await client.api.accounts(accountSid).fetch();

    return NextResponse.json({
      success: true,
      accountSid: accountSid.substring(0, 10) + '...',
      accountStatus: account.status,
      accountFriendlyName: account.friendlyName,
      twilioNumber: twilioNumber,
      message: 'Twilio credentials are valid',
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Twilio authentication failed',
      message: error.message,
      code: error.code,
      status: error.status,
      details: {
        hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasTwilioNumber: !!process.env.TWILIO_NUMBER,
      },
    }, { status: 500 });
  }
}

