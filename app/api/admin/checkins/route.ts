import { NextResponse } from 'next/server';
import { getCheckins } from '@/lib/db';

export async function GET() {
  try {
    const checkins = await getCheckins(100);
    
    return NextResponse.json({
      success: true,
      checkins,
    });
  } catch (error) {
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

