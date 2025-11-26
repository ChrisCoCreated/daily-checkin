import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAllConversationSets } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    
    const conversationSets = await getAllConversationSets();
    
    return NextResponse.json({
      conversationSets,
    });
  } catch (error) {
    console.error('Error fetching conversation sets:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      {
        error: 'Failed to fetch conversation sets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

