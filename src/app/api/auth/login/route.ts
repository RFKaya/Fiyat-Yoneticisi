import { NextResponse } from 'next/server';
import { getServerPassword, getPasswordHash } from '@/lib/auth';
import { cookies } from 'next/headers';
import { apiAuthLogger as log, logApiRequest, logApiResponse } from '@/lib/logger';

export async function POST(request: Request) {
  logApiRequest('API:Auth', 'POST', { endpoint: 'login' });

  const globalAny: any = global;
  
  if (Date.now() < globalAny.authRateLimitUntil) {
    const remainingMs = globalAny.authRateLimitUntil - Date.now();
    log.warn('Rate limit aktif — istek reddedildi', { remainingMs: `${remainingMs}ms` });
    logApiResponse('API:Auth', 'POST', 429, { reason: 'rate-limit' });
    return NextResponse.json({ message: 'Çok fazla yanlış deneme. Lütfen 3 saniye bekleyin.' }, { status: 429 });
  }

  try {
    const { password } = await request.json();
    log.debug('Giriş denemesi yapılıyor...', { passwordLength: password?.length || 0 });

    const actualPassword = await getServerPassword();
    
    if (password === actualPassword) {
      const cookieStore = await cookies();
      const hashToken = await getPasswordHash(); // Generate the secure token
      
      cookieStore.set('app_auth_token', hashToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 365, // 1 year local storage via cookie
        path: '/'
      });

      log.success('Giriş başarılı — oturum açıldı', { 
        tokenSet: true, 
        maxAge: '365 gün',
        secure: process.env.NODE_ENV === 'production',
      });
      logApiResponse('API:Auth', 'POST', 200, { result: 'success' });

      return NextResponse.json({ success: true });
    } else {
      globalAny.authRateLimitUntil = Date.now() + 3000;
      log.warn('Hatalı şifre denemesi — rate limit aktifleştirildi', { 
        rateLimitDuration: '3s',
        rateLimitUntil: new Date(globalAny.authRateLimitUntil).toISOString(),
      });
      logApiResponse('API:Auth', 'POST', 401, { result: 'wrong-password' });
      return NextResponse.json({ message: 'Hatalı şifre' }, { status: 401 });
    }
  } catch (error) {
    log.error('Login isteği işlenirken hata', error);
    logApiResponse('API:Auth', 'POST', 400, { result: 'bad-request' });
    return NextResponse.json({ message: 'Bad request' }, { status: 400 });
  }
}
