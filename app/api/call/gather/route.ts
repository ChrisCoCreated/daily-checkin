import { NextRequest, NextResponse } from 'next/server';
import { generateTwiML, say, hangup, gather } from '@/lib/twilio';
import { CLOSING_PROMPT } from '@/lib/prompts';
import { getCheckinByCallId, updateCheckin } from '@/lib/db';
import { analyzeTranscript, generateFollowUpResponse } from '@/lib/analysis';
import { buildUrl } from '@/lib/url';

// Ensure this route is publicly accessible for Twilio webhooks
export const dynamic = 'force-dynamic';

interface GatherState {
  transcript: string[];
  questionIndex: number;
}

const MAX_CHUNKS = 5; // Maximum number of Gather chunks per response (5 minutes total)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const speechResult = formData.get('SpeechResult') as string | null;
    const unstableSpeechResult = formData.get('UnstableSpeechResult') as string | null;
    const isPartial = request.nextUrl.searchParams.get('partial') === 'true';
    const questionIndex = parseInt(request.nextUrl.searchParams.get('questionIndex') || '0');
    const chunkIndex = parseInt(request.nextUrl.searchParams.get('chunkIndex') || '0');

    const checkin = await getCheckinByCallId(callSid);
    if (!checkin) {
      return new NextResponse(generateTwiML(hangup()), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Handle partial results (interim speech recognition)
    if (isPartial && unstableSpeechResult) {
      // Store partial result for reference, but don't process yet
      // This helps us capture speech even if the 60-second limit is hit
      console.log('Partial speech result:', unstableSpeechResult);
      // Return empty TwiML to continue listening
      return new NextResponse(generateTwiML(''), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Handle silence or no response
    if (!speechResult || speechResult.trim().length === 0) {
      // If we're chaining (chunkIndex > 0), this means the user stopped speaking naturally
      // Accumulate what we have and proceed to next question or close
      if (chunkIndex > 0) {
        // We were chaining but got no more speech - natural end of response
        const fullTranscript = checkin.transcript || '';
        
        // Ensure transcript is saved
        if (fullTranscript.trim().length > 0) {
          await updateCheckin(checkin.id, {
            transcript: fullTranscript,
            responded: true,
          });
        }
        
        // Proceed to next question or close based on questionIndex
        if (questionIndex < 2 && fullTranscript.trim().length > 0) {
          // Move to next follow-up question
          return await handleNextQuestion(checkin.id, callSid, fullTranscript, questionIndex + 1);
        } else {
          // No more questions or no transcript - process and close
          if (questionIndex === 0 && fullTranscript.trim().length === 0) {
            // First question with no response at all - escalate
            await updateCheckin(checkin.id, {
              needs_escalation: true,
              escalation_reason: 'No response to initial greeting',
              responded: false,
            });
            return new NextResponse(generateTwiML(hangup()), {
              headers: { 'Content-Type': 'text/xml' },
            });
          } else {
            // Process transcript and close
            await processTranscript(checkin.id, fullTranscript);
            return new NextResponse(generateTwiML(say(CLOSING_PROMPT) + hangup()), {
              headers: { 'Content-Type': 'text/xml' },
            });
          }
        }
      } else {
        // Not chaining (chunkIndex === 0) - this is a true no-response scenario
        if (questionIndex === 0) {
          // First question - no response, escalate
          await updateCheckin(checkin.id, {
            needs_escalation: true,
            escalation_reason: 'No response to initial greeting',
            responded: false,
          });
          return new NextResponse(generateTwiML(hangup()), {
            headers: { 'Content-Type': 'text/xml' },
          });
        } else {
          // Later questions - process existing transcript and close
          const fullTranscript = checkin.transcript || '';
          await processTranscript(checkin.id, fullTranscript);
          return new NextResponse(generateTwiML(say(CLOSING_PROMPT) + hangup()), {
            headers: { 'Content-Type': 'text/xml' },
          });
        }
      }
    }

    // Accumulate transcript chunk
    const currentTranscript = checkin.transcript 
      ? `${checkin.transcript} ${speechResult}`.trim()
      : speechResult;

    await updateCheckin(checkin.id, {
      transcript: currentTranscript,
      responded: true,
    });

    // Determine if we should chain another Gather
    // Strategy: If chunkIndex > 0, we're already chaining - continue if below max
    // If chunkIndex is 0, we need to decide: could this be a timeout?
    // Since we can't detect timeout directly, we'll chain if we're below max chunks
    // The next Gather will either get more speech (continue) or empty (natural end)
    const shouldChain = chunkIndex < MAX_CHUNKS - 1; // -1 because we're about to increment
    
    if (shouldChain) {
      // Chain another Gather to continue listening
      // This handles both timeout scenarios (user still speaking) and allows natural end detection
      const nextChunkIndex = chunkIndex + 1;
      const nextChunkUrl = buildUrl('/api/call/gather', {
        callSid,
        questionIndex: String(questionIndex),
        chunkIndex: String(nextChunkIndex),
      });
      const nextPartialResultUrl = buildUrl('/api/call/gather', {
        callSid,
        questionIndex: String(questionIndex),
        chunkIndex: String(nextChunkIndex),
        partial: 'true',
      });
      
      // Continue listening without asking a new question
      // If user is done, next Gather will return empty and we'll proceed
      const twiml = generateTwiML(
        gather(nextChunkUrl, undefined, 60, 'auto', nextPartialResultUrl)
      );

      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Max chunks reached or natural end - proceed to next question or close
    console.log(`Chunk limit reached (chunkIndex: ${chunkIndex}) for question ${questionIndex}, proceeding to next step`);
    
    // Ask follow-up questions (max 2 follow-ups)
    if (questionIndex < 2) {
      return await handleNextQuestion(checkin.id, callSid, currentTranscript, questionIndex + 1);
    }

    // Done with questions - analyze and close
    await processTranscript(checkin.id, currentTranscript);
    
    return new NextResponse(generateTwiML(say(CLOSING_PROMPT) + hangup()), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error in gather route:', error);
    return new NextResponse(generateTwiML(hangup()), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

async function handleNextQuestion(
  checkinId: string,
  callSid: string,
  currentTranscript: string,
  nextQuestionIndex: number
): Promise<NextResponse> {
  const nextQuestion = await generateFollowUpResponse(currentTranscript);
  const nextGatherUrl = buildUrl('/api/call/gather', {
    callSid,
    questionIndex: String(nextQuestionIndex),
    chunkIndex: '0', // Start fresh chunk index for new question
  });
  const nextPartialResultUrl = buildUrl('/api/call/gather', {
    callSid,
    questionIndex: String(nextQuestionIndex),
    chunkIndex: '0',
    partial: 'true',
  });
  
  const twiml = generateTwiML(
    say(nextQuestion) +
    gather(nextGatherUrl, undefined, 60, 'auto', nextPartialResultUrl)
  );

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

async function processTranscript(checkinId: string, transcript: string) {
  try {
    const analysis = await analyzeTranscript(transcript);
    
    await updateCheckin(checkinId, {
      transcript,
      sentiment: analysis.sentiment,
      risk_level: analysis.risk_level,
      keywords: analysis.keywords,
      needs_escalation: analysis.needs_escalation,
      escalation_reason: analysis.escalation_reason,
    });

    // Trigger escalation if needed
    if (analysis.needs_escalation) {
      const escalationUrl = buildUrl('/api/alert', { checkinId });
      // Fire and forget - don't wait for response
      fetch(escalationUrl).catch(err => console.error('Escalation error:', err));
    }
  } catch (error) {
    console.error('Error processing transcript:', error);
    // Still update with transcript even if analysis fails
    await updateCheckin(checkinId, {
      transcript,
      needs_escalation: true,
      escalation_reason: 'Analysis failed - manual review needed',
    });
  }
}

