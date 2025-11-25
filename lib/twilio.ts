import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;

function getTwilioClient(): twilio.Twilio {
  if (!accountSid || !authToken || !twilioNumber) {
    throw new Error('Missing Twilio credentials. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_NUMBER');
  }
  return twilio(accountSid, authToken);
}

export const twilioClient = getTwilioClient();

export async function initiateCall(to: string, webhookUrl: string): Promise<string> {
  const call = await twilioClient.calls.create({
    to,
    from: twilioNumber!,
    url: webhookUrl,
    method: 'POST',
    record: false,
  });

  return call.sid;
}

export async function sendSMS(to: string, message: string): Promise<void> {
  await twilioClient.messages.create({
    to,
    from: twilioNumber!,
    body: message,
  });
}

export function generateTwiML(xml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`;
}

export function say(text: string, voice = 'alice'): string {
  return `<Say voice="${voice}">${escapeXml(text)}</Say>`;
}

export function gather(
  action: string,
  numDigits?: number,
  timeout = 10,
  speechTimeout = 'auto'
): string {
  const numDigitsAttr = numDigits ? ` numDigits="${numDigits}"` : '';
  const escapedAction = escapeXml(action);
  return `<Gather action="${escapedAction}" method="POST" timeout="${timeout}" speechTimeout="${speechTimeout}" input="speech"${numDigitsAttr}></Gather>`;
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

