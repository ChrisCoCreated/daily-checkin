import { NextRequest, NextResponse } from 'next/server';
import { analyzeTranscript } from '@/lib/analysis';
import { z } from 'zod';

const analysisSchema = z.object({
  transcript: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript } = analysisSchema.parse(body);

    const analysis = await analyzeTranscript(transcript);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in analysis route:', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


