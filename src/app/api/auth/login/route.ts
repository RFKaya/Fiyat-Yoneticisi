import { NextResponse } from 'next/server';
import { getServerPassword } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const globalAny: any = global;
  
  if (Date.now() < globalAny.authRateLimitUntil) {
    return NextResponse.json({ message: 'Çok fazla yanlış deneme. Lütfen 3 saniye bekleyin.' }, { status: 429 });
  }

  try {
    const { password } = await request.json();
    const actualPassword = await getServerPassword();
    
    if (password === actualPassword) {
      const cookieStore = await cookies();
      cookieStore.set('app_auth_token', password, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 365, // 1 year local storage via cookie
        path: '/'
      });
      return NextResponse.json({ success: true });
    } else {
      globalAny.authRateLimitUntil = Date.now() + 3000;
      return NextResponse.json({ message: 'Hatalı şifre' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ message: 'Bad request' }, { status: 400 });
  }
}
