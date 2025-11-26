import twilio from 'twilio';

let twilioClientInstance: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio {
  // Lazy load credentials to ensure env vars are available
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioNumber = process.env.TWILIO_NUMBER?.trim();

  if (!accountSid || !authToken || !twilioNumber) {
    const missing = [];
    if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
    if (!authToken) missing.push('TWILIO_AUTH_TOKEN');
    if (!twilioNumber) missing.push('TWILIO_NUMBER');
    throw new Error(`Missing Twilio credentials: ${missing.join(', ')}`);
  }

  // Validate Account SID format (should start with AC)
  if (!accountSid.startsWith('AC')) {
    throw new Error('Invalid TWILIO_ACCOUNT_SID format. Should start with "AC"');
  }

  // Create client if it doesn't exist or if credentials changed
  if (!twilioClientInstance) {
    try {
      twilioClientInstance = twilio(accountSid, authToken);
    } catch (error) {
      console.error('Failed to create Twilio client:', error);
      throw new Error(`Failed to initialize Twilio client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return twilioClientInstance;
}

// Export a getter that lazily initializes the client
export const twilioClient = new Proxy({} as twilio.Twilio, {
  get(_target, prop) {
    const client = getTwilioClient();
    const value = client[prop as keyof twilio.Twilio];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export async function initiateCall(to: string, webhookUrl: string): Promise<string> {
  const client = getTwilioClient();
  const twilioNumber = process.env.TWILIO_NUMBER?.trim();
  
  if (!twilioNumber) {
    throw new Error('TWILIO_NUMBER is not configured');
  }

  // Debug logging (remove in production)
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  console.log('Initiating call with:', {
    accountSidPrefix: accountSid?.substring(0, 10) + '...',
    twilioNumber,
    to,
    webhookUrl,
  });

  try {
    const call = await client.calls.create({
      to,
      from: twilioNumber,
      url: webhookUrl,
      method: 'POST',
      record: false,
    });

    return call.sid;
  } catch (error: any) {
    console.error('Twilio API Error:', {
      status: error.status,
      code: error.code,
      message: error.message,
      accountSidPrefix: accountSid?.substring(0, 10) + '...',
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
    });
    throw error;
  }
}

export async function sendSMS(to: string, message: string): Promise<void> {
  const client = getTwilioClient();
  const twilioNumber = process.env.TWILIO_NUMBER;
  
  if (!twilioNumber) {
    throw new Error('TWILIO_NUMBER is not configured');
  }

  await client.messages.create({
    to,
    from: twilioNumber,
    body: message,
  });
}

export function generateTwiML(xml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`;
}

export function say(text: string, voice = 'Polly.Emma-Neural'): string {
  return `<Say voice="${voice}">${escapeXml(text)}</Say>`;
}

export function gather(
  action: string,
  numDigits?: number,
  timeout = 60,
  speechTimeout = 'auto',
  partialResultCallback?: string
): string {
  const numDigitsAttr = numDigits ? ` numDigits="${numDigits}"` : '';
  const escapedAction = escapeXml(action);
  const partialCallbackAttr = partialResultCallback 
    ? ` partialResultCallback="${escapeXml(partialResultCallback)}"` 
    : '';
  return `<Gather action="${escapedAction}" method="POST" timeout="${timeout}" speechTimeout="${speechTimeout}" input="speech"${numDigitsAttr}${partialCallbackAttr}></Gather>`;
}

export function redirect(url: string): string {
  return `<Redirect>${url}</Redirect>`;
}

export function hangup(): string {
  return '<Hangup/>';
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

