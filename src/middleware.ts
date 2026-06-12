import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const locales = ['ar', 'en']
const defaultLocale = 'ar'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // التحقق إذا كان الرابط يحتوي على اللغات المدعومة
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) return

  // إعادة التوجيه التلقائي للغة الافتراضية (العربية) إذا كان الرابط مجرداً
  request.nextUrl.pathname = `/${defaultLocale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  matcher: [
    // استثناء ملفات النظام الداخلية والصور لكي لا يتأثر أداء الموقع
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)',
  ],
}