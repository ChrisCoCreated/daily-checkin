import { NextRequest, NextResponse } from 'next/server';
import { getContactById, updateContact, deleteContact } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    
    const contact = await getContactById(params.id);
    
    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error fetching contact:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    
    const body = await request.json();
    const { name, organisation, talk_slowly, number_to_call, escalation_name, escalation_number } = body;
    
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (organisation !== undefined) updates.organisation = organisation;
    if (talk_slowly !== undefined) updates.talk_slowly = talk_slowly;
    if (number_to_call !== undefined) updates.number_to_call = number_to_call;
    if (escalation_name !== undefined) updates.escalation_name = escalation_name;
    if (escalation_number !== undefined) updates.escalation_number = escalation_number;
    
    const contact = await updateContact(params.id, updates);
    
    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error updating contact:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    
    await deleteContact(params.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}

