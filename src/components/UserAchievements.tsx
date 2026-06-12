"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; 
import { getUserStats, syncUserTimeSpent } from "@/lib/reviews";
import { motion, Variants } from "framer-motion"; // 👈 استيراد النوع Variants هنا

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export default function UserAchievements() {
  const { user } = useAuth(); 
  const [isAr] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const [userXp, setUserXp] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [totalSecondsSpent, setTotalSecondsSpent] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    if (!user) return;

    async function loadFirebaseStats() {
      const stats = await getUserStats(user!.uid);
      if (stats) {
        setUserXp(stats.xp || 0);
        setCommentsCount(stats.commentsCount || 0);
        setRatingsCount(stats.ratingsCount || 0);
        setTotalSecondsSpent(stats.secondsSpent || 0);
      }
    }
    loadFirebaseStats();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let sessionSeconds = 0;
    const SECONDS_FOR_ONE_XP = 2 * 60 * 60; 

    const interval = setInterval(async () => {
      sessionSeconds += 5; 
      setTotalSecondsSpent((prev) => prev + 5);

      if (sessionSeconds >= SECONDS_FOR_ONE_XP) {
        await syncUserTimeSpent(user.uid, sessionSeconds, 1);
        sessionSeconds = 0; 
        const updated = await getUserStats(user.uid);
        if (updated) setUserXp(updated.xp || 0);
      } else {
        if (sessionSeconds % 30 === 0) { 
          await syncUserTimeSpent(user.uid, 30, 0);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const xpPerLevel = 100;
  const currentLevel = Math.floor(userXp / xpPerLevel) + 1;
  const progressPercentage = ((userXp % xpPerLevel) / xpPerLevel) * 100;
  const totalMinutesSpent = Math.floor(totalSecondsSpent / 60);

  const badgesList: Badge[] = [
    {
      id: "active_talker",
      name: isAr ? "المُحاور الأسطوري 📢" : "Legendary Talker 📢",
      description: isAr ? "تُفتح تلقائياً عند كتابة مراجعة أو تعليق داخل 10 ألعاب مختلفة." : "Unlocks when writing a comment or review across 10 different games.",
      icon: "📢",
      color: "from-blue-500 via-cyan-500 to-blue-600 text-white shadow-blue-500/20",
    },
    {
      id: "critic_badge",
      name: isAr ? "الناقد المحترف 🎨" : "Pro Critic 🎨",
      description: isAr ? "تُفتح وتضيء عند تقييم وإعطاء النجوم لـ 10 ألعاب على المنصة." : "Unlocks when rating 10 games on the platform.",
      icon: "🎨",
      color: "from-amber-500 via-orange-500 to-yellow-600 text-zinc-950 shadow-amber-500/20",
    },
    {
      id: "loyal_gamer",
      name: isAr ? "المرابط الصامد 💎" : "Loyal Gamer 💎",
      description: isAr ? "تُفتح عند صمود حسابك وتصفحك للمنصة لمدة ساعتين كاملة (120 دقيقة)." : "Unlocks after spending 2 active hours (120 minutes) on the site.",
      icon: "💎",
      color: "from-purple-600 via-indigo-600 to-pink-600 text-white shadow-purple-500/20",
    }
  ];

  const unlockedBadges: string[] = [];
  if (commentsCount >= 10) unlockedBadges.push("active_talker");
  if (ratingsCount >= 10) unlockedBadges.push("critic_badge");
  if (totalSecondsSpent >= 2 * 60 * 60) unlockedBadges.push("loyal_gamer");

  // 🛡️ صب الأنواع هنا أيضاً لتسقط الـ 3 مشاكل المتبقية
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 } 
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  if (!isMounted) return null;

  if (!user) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl mx-auto bg-zinc-950 border border-dashed border-zinc-800 rounded-3xl p-8 text-center space-y-3"
      >
        <p className="text-zinc-400 text-sm font-bold">
          {isAr ? "🔒 لوحة الإنجازات مقفلة! سجل دخولك بحساب Google لتفعيل شريط الـ XP، وحساب وقت مكوثك، والبدء في فتح الألقاب الجيمرية النادرة باسمك الشخصي." : "🔒 Achievements Locked! Sign in with Google to start earning XP and unlock badges."}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full max-w-4xl mx-auto space-y-6" 
      dir={isAr ? "rtl" : "ltr"}
    >
      
      {/* كرت الحساب الرئيسي */}
      <motion.div 
        variants={itemVariants}
        className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 backdrop-blur-md shadow-2xl relative overflow-hidden group"
      >
        <div className="flex items-center gap-4 z-10">
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-2xl font-black shadow-lg shadow-purple-500/20 cursor-default"
          >
            {currentLevel}
          </motion.div>
          <div className="text-start">
            <h3 className="text-lg font-black text-white">{isAr ? `رتبة البطل: ${user.displayName}` : `Rank: ${user.displayName}`}</h3>
            <p className="text-zinc-500 text-xs mt-0.5">
              {isAr ? `مجموع نقاط الخبرة السحابية: ${userXp} XP` : `Total Experience: ${userXp} XP`}
            </p>
          </div>
        </div>

        <div className="w-full md:max-w-md space-y-2 z-10">
          <div className="flex justify-between text-xs font-bold text-zinc-400 px-1">
            <span>{isAr ? `المستوى ${currentLevel}` : `LVL ${currentLevel}`}</span>
            <span>{userXp % xpPerLevel} / {xpPerLevel} XP</span>
          </div>
          <div className="w-full h-3 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 rounded-full shadow-md"
            />
          </div>
        </div>
      </motion.div>

      {/* شبكة إحصائيات التفاعل الرقمية الحية */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        {[
          { label: isAr ? "💬 تعليقاتك" : "💬 Comments", value: commentsCount, color: "text-white", unit: "" },
          { label: isAr ? "⭐ تقييماتك" : "⭐ Ratings", value: ratingsCount, color: "text-white", unit: "" },
          { label: isAr ? "⏳ مكوثك الفعلي" : "⏳ Active Time", value: totalMinutesSpent, color: "text-purple-400", unit: isAr ? "د" : "m" }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -4 }} 
            className="bg-zinc-950 border border-zinc-900/60 hover:border-purple-500/40 p-4 rounded-2xl text-center cursor-default transition-all duration-300 shadow-md" 
          >
            <span className="block text-zinc-500 text-[10px] sm:text-xs font-bold mb-1">{stat.label}</span>
            <span className={`text-xl sm:text-2xl font-black ${stat.color}`}>
              {stat.value} {stat.unit && <span className="text-[10px] font-bold text-zinc-500">{stat.unit}</span>}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* لوحة الألقاب والشارات التفاعلية */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {badgesList.map((badge) => {
          const isUnlocked = unlockedBadges.includes(badge.id);

          return (
            <motion.div 
              key={badge.id}
              variants={itemVariants}
              whileHover={isUnlocked ? { scale: 1.03, y: -4, transition: { duration: 0.2 } } : {}}
              className={`relative bg-zinc-950 border rounded-2xl p-4 flex sm:flex-col gap-3 items-center text-start sm:text-center transition-all duration-300 ${
                isUnlocked 
                  ? "border-zinc-900 hover:border-purple-500/20 shadow-xl" 
                  : "border-transparent opacity-25 select-none grayscale"
              }`}
            >
              <motion.div 
                animate={isUnlocked ? { boxShadow: ["0px 0px 0px rgba(168,85,247,0)", "0px 4px 20px rgba(168,85,247,0.15)", "0px 0px 0px rgba(168,85,247,0)"] } : {}}
                transition={{ repeat: Infinity, duration: 3 }}
                className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-xl shadow-xl ${
                  isUnlocked ? `bg-gradient-to-br ${badge.color}` : "bg-zinc-900 text-zinc-600 border border-zinc-800"
                }`}
              >
                {isUnlocked ? badge.icon : "🔒"}
              </motion.div>
              <div className="space-y-0.5 overflow-hidden">
                <h4 className={`font-black text-xs ${isUnlocked ? "text-white" : "text-zinc-500"}`}>{badge.name}</h4>
                <p className="text-zinc-500 text-[11px] leading-tight line-clamp-2">{badge.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

    </motion.div>
  );
}