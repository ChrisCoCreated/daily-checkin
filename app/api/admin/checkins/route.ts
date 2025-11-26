import { NextResponse } from 'next/server';
import { getCheckins } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    await requireAuth();
    
    const checkins = await getCheckins(100);
    
    return NextResponse.json({
      success: true,
      checkins,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Error fetching checkins:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch checkins', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

