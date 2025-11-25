# Daily Check-In Call Service

An automated daily wellbeing check-in system that makes phone calls, conducts natural conversations using speech recognition, analyzes responses with AI, and escalates concerns to designated contacts.

## Features

- 🤖 **Automated Daily Calls**: Scheduled calls via Vercel Cron
- 🎤 **Speech Recognition**: Natural conversation using Twilio Voice API
- 🧠 **AI Analysis**: OpenAI-powered sentiment and risk assessment
- 📊 **Admin Dashboard**: View all check-in logs and analytics
- 🚨 **Smart Escalation**: Automatic SMS alerts when concerns are detected
- 📝 **Comprehensive Logging**: All calls and analyses stored in Postgres

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Twilio Voice API** (TTS + Speech Recognition)
- **OpenAI GPT-4** (Wellbeing Analysis)
- **Neon Postgres** (Serverless Postgres)
- **Vercel Cron** (Scheduled Tasks)
- **Tailwind CSS** (Styling)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_NUMBER=+1234567890  # Your Twilio phone number

# Phone Numbers
PERSON_NUMBER=+1234567890  # Person to call daily
CONTACT_NUMBER=+1234567890  # Contact for escalations

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Database (Neon Postgres)
DATABASE_URL=postgresql://user:password@host/database

# Vercel (for production)
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
CRON_SECRET=your_random_secret_for_cron_auth
```

### 3. Database Setup

Run the SQL schema in your Postgres database:

```bash
psql $DATABASE_URL < schema.sql
```

Or copy the contents of `schema.sql` and run it in your database console.

### 4. Development

```bash
npm run dev
```

Visit `http://localhost:3000` to see the homepage and `/admin` for the dashboard.

## Project Structure

```
/app
  /api
    /call
      /start/route.ts      # Manually trigger a call
      /voice/route.ts       # Twilio webhook - greeting
      /gather/route.ts      # Twilio webhook - collect responses
    /analysis/route.ts      # Analyze transcript endpoint
    /alert/route.ts         # Send SMS escalation
    /admin
      /checkins/route.ts    # Get all check-ins
    /cron
      /daily-checkin/route.ts  # Vercel Cron endpoint
  /admin
    page.tsx                # Admin dashboard
  page.tsx                  # Homepage
/lib
  twilio.ts                 # Twilio client utilities
  analysis.ts              # OpenAI analysis logic
  db.ts                   # Database operations
  prompts.ts               # LLM prompts
```

## Call Flow

1. **Scheduler** → `/api/cron/daily-checkin` (runs daily at 9 AM)
2. **Call Initiated** → Twilio calls `PERSON_NUMBER`
3. **Greeting** → `/api/call/voice` plays greeting and gathers response
4. **Follow-ups** → `/api/call/gather` collects 2-3 responses
5. **Analysis** → Transcript sent to OpenAI for sentiment/risk analysis
6. **Escalation** → If needed, SMS sent to `CONTACT_NUMBER`
7. **Logging** → All data stored in database

## API Endpoints

### Manual Call Trigger

```bash
POST /api/call/start
```

### Get Check-ins

```bash
GET /api/admin/checkins
```

### Analyze Transcript

```bash
POST /api/analysis
Content-Type: application/json

{
  "transcript": "I'm feeling okay today..."
}
```

## Escalation Rules

The system escalates (sends SMS alert) when:

- Sentiment is negative AND risk level is medium/high
- Keywords suggest: depression, suicidal thoughts, self-harm, severe anxiety, isolation, medical emergency
- Person seems confused, disoriented, or unable to communicate
- No response to initial greeting
- Call answered by machine/voicemail
- Call fails (busy, no-answer, etc.)

## Vercel Deployment

1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Deploy

The cron job will automatically run daily at 9 AM UTC (configure in `vercel.json`).

## Customization

### Change Call Schedule

Edit `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/daily-checkin",
    "schedule": "0 9 * * *"  // Cron format: minute hour day month weekday
  }]
}
```

### Modify Prompts

Edit `lib/prompts.ts` to change conversation flow and analysis criteria.

### Adjust Escalation Logic

Edit `lib/analysis.ts` and `lib/prompts.ts` to modify escalation rules.

## License

MIT

