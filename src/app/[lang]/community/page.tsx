"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import Link from "next/link";
import { motion } from "framer-motion";

interface CommunityPageProps {
  params: Promise<{
    lang: string;
  }>;
}

// 💡 👈 دالة ذكية لتحويل كائن وقت الفايربيز إلى تاريخ نصي مقروء للـ React
const formatFirebaseDate = (dateData: any, isAr: boolean) => {
  if (!dateData) return isAr ? "مؤخراً" : "Recently";
  
  // إذا كان الوقت محفوظ كـ String (مثل توقيت الترجمة)
  if (typeof dateData === "string") {
    return dateData.split("T")[0];
  }
  
  // إذا كان الوقت كائن Timestamp من الفايربيز (seconds & nanoseconds)
  if (dateData.seconds) {
    const date = new Date(dateData.seconds * 1000);
    return date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  return isAr ? "مؤخراً" : "Recently";
};

export default function CommunityPage({ params }: CommunityPageProps) {
  const [isAr, setIsAr] = useState(true);
  const [currentLang, setCurrentLang] = useState("ar");
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((resolvedParams) => {
      setIsAr(resolvedParams.lang === "ar");
      setCurrentLang(resolvedParams.lang || "ar");
    });

    async function fetchCommunityActivity() {
      try {
        const reviewsRef = collection(db, "reviews");
        const q = query(reviewsRef, orderBy("createdAt", "desc"), limit(30));
        const snap = await getDocs(q);

        const feed: any[] = [];
        snap.forEach((doc) => {
          feed.push({ id: doc.id, ...doc.data() });
        });

        setActivities(feed);
      } catch (error) {
        console.error("Error fetching community feed:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCommunityActivity();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pt-24 pb-12 px-4 select-none" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* 🌟 ترويسة الصفحة */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
            {isAr ? "مجتمع اللاعبين 🌍" : "Gamer Community 🌍"}
          </h1>
          <p className="text-zinc-400 text-sm md:text-base font-medium max-w-xl mx-auto">
            {isAr 
              ? "اكتشف أحدث تقييمات ومراجعات الجيمرز في المنصة. تواصل معهم وشاركهم الشغف!" 
              : "Discover the latest ratings and reviews from gamers on the platform. Connect and share the passion!"}
          </p>
        </div>

        {/* 📜 شريط التفاعلات (Feed) */}
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
              <span className="text-4xl block mb-2">🫙</span>
              <p className="text-zinc-500 font-bold">{isAr ? "المجتمع هادئ جداً اليوم..." : "The community is very quiet today..."}</p>
            </div>
          ) : (
            activities.map((activity, idx) => (
              <motion.div 
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-zinc-950 border border-zinc-800/80 hover:border-purple-500/50 p-5 rounded-3xl shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* معلومات اللاعب */}
                  <div className="flex items-center gap-3">
                    <Link href={`/${currentLang}/profile/${activity.userId}`} className="shrink-0 group">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 group-hover:border-purple-500 flex items-center justify-center text-xl font-black text-purple-400 transition-all">
                        {activity.userName?.charAt(0).toUpperCase() || "G"}
                      </div>
                    </Link>
                    <div className="flex flex-col">
                      <Link href={`/${currentLang}/profile/${activity.userId}`} className="text-sm font-black hover:text-purple-400 transition-colors">
                        {activity.userName || (isAr ? "لاعب مجهول" : "Unknown Gamer")}
                      </Link>
                      
                      {/* 🌟 👈 استخدام الدالة الجديدة لتنظيف الوقت وطباعته بدون أخطاء */}
                      <span className="text-[10px] text-zinc-500 font-bold">
                        {formatFirebaseDate(activity.createdAt, isAr)}
                      </span>
                      
                    </div>
                  </div>

                  {/* التقييم بالنجوم */}
                  {activity.rating > 0 && (
                    <div className="flex gap-0.5 bg-zinc-900/50 px-2 py-1 rounded-lg border border-zinc-800">
                      {Array.from({ length: activity.rating }).map((_, i) => (
                        <span key={i} className="text-xs">⭐</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* نص المراجعة أو النشاط */}
                <div className="mt-4 pl-0 md:pl-14">
                  {activity.comment ? (
                    <p className="text-zinc-300 text-sm leading-relaxed font-medium bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/50">
                      &quot;{activity.comment}&quot;
                    </p>
                  ) : (
                    <p className="text-zinc-500 text-xs italic font-bold">
                      {isAr ? "قام بتقييم اللعبة بدون كتابة مراجعة نصية." : "Rated the game without a text review."}
                    </p>
                  )}

                  {/* رابط اللعبة التي تم تقييمها */}
                  <div className="mt-3 inline-block">
                    <Link 
                      href={`/${currentLang}/game/${activity.gameId}`}
                      className="text-[11px] font-black bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 w-fit"
                    >
                      🎮 {isAr ? "رؤية اللعبة المقيّمة" : "View Rated Game"}
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}