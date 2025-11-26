import { cookies } from 'next/headers';

export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session');
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;
    
    if (!sessionSecret) {
      console.error('ADMIN_SESSION_SECRET not configured');
      return false;
    }
    
    return sessionToken?.value === sessionSecret;
  } catch {
    return false;
  }
}

export async function requireAuth() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    throw new Error('Unauthorized');
  }
}

