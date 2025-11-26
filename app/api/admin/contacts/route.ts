import { NextRequest, NextResponse } from 'next/server';
import { getContacts, createContact } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    
    const contacts = await getContacts();
    
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    
    const body = await request.json();
    const { name, organisation, talk_slowly, number_to_call, escalation_name, escalation_number } = body;
    
    if (!name || !number_to_call) {
      return NextResponse.json(
        { error: 'Name and number_to_call are required' },
        { status: 400 }
      );
    }
    
    const contact = await createContact({
      name,
      organisation: organisation || null,
      talk_slowly: talk_slowly || false,
      number_to_call,
      escalation_name: escalation_name || null,
      escalation_number: escalation_number || null,
    });
    
    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}

