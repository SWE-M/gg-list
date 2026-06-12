import type { Metadata } from "next";
import SupportClient from "./SupportClient";

interface SupportPageProps {
  params: Promise<{
    lang: string;
  }>;
}

// 🌐 توليد بيانات السيو لصفحة الدعم الفني
export async function generateMetadata({ params }: SupportPageProps): Promise<Metadata> {
  const { lang } = await params;
  const isAr = lang === "ar";
  
  return {
    title: isAr ? "الدعم الفني والمساعدة | GGLIST" : "Support & Help | GGLIST",
    description: isAr 
      ? "تواصل مع فريق الدعم الفني لمنصة GGLIST للإبلاغ عن المشاكل أو تقديم الاقتراحات." 
      : "Contact the GGLIST support team to report issues or submit suggestions.",
  };
}

export default async function SupportPage({ params }: SupportPageProps) {
  return <SupportClient params={params} />;
}