import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session');
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;

    if (!sessionSecret) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    if (sessionToken && sessionToken.value === sessionSecret) {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

