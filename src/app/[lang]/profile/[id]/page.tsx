import type { Metadata } from "next";
import { getUserStats } from "@/lib/reviews"; 
import PlayerProfileClient from "./PlayerProfileClient"; 

interface ProfilePageProps {
  params: Promise<{
    lang: string;
    id: string;
  }>;
}

// 🌐 توليد بيانات السيو والبطاقات الذكية لبروفايل اللاعب سحابياً
export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { id, lang } = await params;
  const stats = await getUserStats(id);
  const isAr = lang === "ar";
  
  const gamerName = stats?.userName || (isAr ? "لاعب GGLIST" : "GGLIST Gamer");
  const defaultDesc = isAr 
    ? "تصفح مكتبة ألعاب اللاعب، مراجعاته، وبثوثه المباشرة الحية عبر منصة GGLIST للالعاب."
    : "Check out this player's game library, reviews, and active live content on GGLIST.";
    
  const bioDesc = stats?.bio ? stats.bio : defaultDesc;

  return {
    title: isAr ? `ملف اللاعب ${gamerName}` : `${gamerName}'s Profile`,
    description: bioDesc.slice(0, 160),
    openGraph: {
      title: isAr ? `ملف اللاعب ${gamerName} | منصة GGLIST` : `${gamerName}'s Profile | GGLIST`,
      description: bioDesc.slice(0, 160),
      type: "profile",
      username: gamerName,
    },
    twitter: {
      card: "summary",
      title: isAr ? `ملف اللاعب ${gamerName}` : `${gamerName}'s Profile`,
      description: bioDesc.slice(0, 160),
    }
  };
}

// 💻 استدعاء واجهة المستخدم التفاعلية (الكود الذي برمجته أنت)
export default async function PlayerProfilePage({ params }: ProfilePageProps) {
  return <PlayerProfileClient params={params} />;
}