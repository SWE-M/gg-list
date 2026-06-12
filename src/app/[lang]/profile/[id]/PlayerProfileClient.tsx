"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserStats, updateUserBio, updateUserStreamId, getUserReviews } from "@/lib/reviews"; 
import { getUserShelf } from "@/lib/shelf"; // 👈 استيراد دالة الأرفف الجديدة
import { sendChatRequest } from "@/lib/chat"; 
import { db } from "@/lib/firebase"; 
import { collection, query, where, getDocs } from "firebase/firestore";
import { motion, AnimatePresence, Variants } from "framer-motion"; 
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProfilePageProps {
  params: Promise<{
    lang: string;
    id: string;
  }>;
}

export default function PlayerProfileClient({ params }: ProfilePageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isAr, setIsAr] = useState(true);
  const [currentLang, setCurrentLang] = useState("ar");
  const [profileId, setProfileId] = useState<string | null>(null);
  
  // حالات جلب بيانات بروفايل اللاعب من الفايربيز
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // حالة تعديل الوصف الشخصي (Bio)
  const [bioText, setBioText] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);

  // حالات تعديل معرف البث المباشر (YouTube Stream ID)
  const [streamIdText, setStreamIdText] = useState("");
  const [isEditingStream, setIsEditingStream] = useState(false);
  const [savingStream, setSavingStream] = useState(false);

  // 🎒 حالات سجل التفاعلات والأرفف المحدثة
  const [activeTab, setActiveTab] = useState<"shelf" | "comments" | "ratings">("shelf"); // 👈 مكتبة الألعاب هي الافتراضية الآن
  const [playerReviews, setPlayerReviews] = useState<any[]>([]); 
  const [playerShelf, setPlayerShelf] = useState<any[]>([]); // 👈 تخزين مكتبة الألعاب

  // حالات نظام طلبات الشات
  const [chatStatus, setChatStatus] = useState<"none" | "pending" | "accepted">("none");
  const [sendingRequest, setSendingRequest] = useState(false);

  // حالة إشعار تم النسخ بنجاح
  const [copied, setCopied] = useState(false);

  // 1️⃣ حل معلمات الرابط وجلب البيانات سحابياً بشكل متكامل
  useEffect(() => {
    params.then((resolvedParams) => {
      setIsAr(resolvedParams.lang === "ar");
      setCurrentLang(resolvedParams.lang || "ar");
      setProfileId(resolvedParams.id);

      async function fetchPlayerStatsAndReviews() {
        try {
          const stats = await getUserStats(resolvedParams.id);
          
          if (stats) {
            setProfileData(stats);
            setBioText(stats.bio || "");
            setStreamIdText(stats.youtubeStreamId || "");
          } 
          else if (user && user.uid === resolvedParams.id) {
            const defaultNewUser = {
              uid: user.uid,
              userName: user.displayName || "Gamer",
              xp: 0,
              commentsCount: 0,
              ratingsCount: 0,
              secondsSpent: 0,
              bio: "",
              youtubeStreamId: ""
            };
            setProfileData(defaultNewUser);
            setBioText("");
            setStreamIdText("");
          }

          // ⚡ جلب المراجعات ومكتبة الألعاب معاً في نفس اللحظة
          const [reviews, shelf] = await Promise.all([
            getUserReviews(resolvedParams.id),
            getUserShelf(resolvedParams.id)
          ]);

          setPlayerReviews(reviews || []);
          setPlayerShelf(shelf || []);

          if (user && user.uid !== resolvedParams.id) {
            const requestsRef = collection(db, "chatRequests");
            
            const q1 = query(requestsRef, where("senderId", "==", user.uid), where("receiverId", "==", resolvedParams.id));
            const q2 = query(requestsRef, where("senderId", "==", resolvedParams.id), where("receiverId", "==", user.uid));
            
            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            
            let currentStatus: "none" | "pending" | "accepted" = "none";
            
            [...snap1.docs, ...snap2.docs].forEach((docSnap) => {
              const data = docSnap.data();
              if (data.status === "accepted") currentStatus = "accepted";
              else if (data.status === "pending" && currentStatus !== "accepted") currentStatus = "pending";
            });

            setChatStatus(currentStatus);
          }

        } catch (error) {
          console.error("Error loading profile data:", error);
        } finally {
          setLoading(false);
        }
      }
      fetchPlayerStatsAndReviews();
    });
  }, [params, user]);

 // دالة نسخ الـ ID للحافظة حياً بنقرة واحدة (محدثة لدعم جميع المتصفحات والبيئات)
  const handleCopyId = async () => {
    if (!profileId) return;

    try {
      // 1. محاولة النسخ بالطريقة الحديثة (تتطلب HTTPS)
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(profileId);
      } else {
        // 2. الطريقة البديلة (Fallback) للبيئات المحلية HTTP أو الأنفاق
        const textArea = document.createElement("textarea");
        textArea.value = profileId;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  // دالة التعامل مع كبسة إرسال طلب الشات السحابي حياً
  const handleChatAction = async () => {
    if (!user) {
      router.push(`/${currentLang}`);
      return;
    }
    if (!profileId || chatStatus !== "none") return;

    setSendingRequest(true);
    const res = await sendChatRequest(user.uid, user.displayName || "لاعب مجهول", profileId);
    if (res.success) {
      setChatStatus("pending");
    }
    setSendingRequest(false);
  };

  // دالة حفظ النبذة الشخصية سحابياً
  const handleSaveBio = async () => {
    if (!profileId) return;
    setSavingBio(true);
    const result = await updateUserBio(profileId, bioText);
    if (result.success) {
      setIsEditingBio(false);
      setProfileData((prev: any) => prev ? { ...prev, bio: bioText.trim() } : prev);
    }
    setSavingBio(false);
  };

  // دالة حفظ معرف البث المباشر حياً
  const handleSaveStreamId = async () => {
    if (!profileId) return;
    setSavingStream(true);
    const result = await updateUserStreamId(profileId, streamIdText);
    if (result.success) {
      setIsEditingStream(false);
      setProfileData((prev: any) => prev ? { ...prev, youtubeStreamId: streamIdText.trim() } : prev);
    }
    setSavingStream(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4" dir={isAr ? "rtl" : "ltr"}>
        <h2 className="text-xl font-black text-zinc-400">{isAr ? "❌ لم يتم العثور على بروفايل هذا اللاعب" : "❌ Player Profile Not Found"}</h2>
        <Link href={`/${isAr ? "ar" : "en"}`} className="bg-purple-600 px-4 py-2 rounded-xl text-sm font-bold">
          {isAr ? "العودة للرئيسية" : "Back Home"}
        </Link>
      </div>
    );
  }

  const isOwnProfile = user?.uid === profileId;

  // الحسبة الرياضية للمستويات الجيمرية وإحصائيات التفاعل الحية
  const userXp = profileData.xp || 0;
  const commentsCount = profileData.commentsCount || 0;
  const ratingsCount = profileData.ratingsCount || 0;
  const totalSecondsSpent = profileData.secondsSpent || 0;
  const totalMinutesSpent = Math.floor(totalSecondsSpent / 60);

  const xpPerLevel = 100;
  const currentLevel = Math.floor(userXp / xpPerLevel) + 1;
  const progressPercentage = ((userXp % xpPerLevel) / xpPerLevel) * 100;

  // حساب الألقاب المفتوحة للاعب
  const unlockedBadges: { text: string; style: string }[] = [];
  if (commentsCount >= 10) {
    unlockedBadges.push({
      text: isAr ? "المُحاور الأسطوري 📢" : "Legendary Talker 📢",
      style: "bg-blue-500/10 border-blue-500/20 text-blue-400"
    });
  }
  if (ratingsCount >= 10) {
    unlockedBadges.push({
      text: isAr ? "الناقد المحترف 🎨" : "Pro Critic 🎨",
      style: "bg-amber-500/10 border-amber-500/20 text-amber-400"
    });
  }
  if (totalSecondsSpent >= 2 * 60 * 60) {
    unlockedBadges.push({
      text: isAr ? "المرابط الصامد 💎" : "Loyal Gamer 💎",
      style: "bg-purple-500/10 border-purple-500/20 text-purple-400"
    });
  }

  // فلاتر التبويبات والمكتبة
  const commentedReviews = playerReviews.filter(rev => rev.comment && rev.comment.trim().length > 0);
  const ratedReviews = playerReviews.filter(rev => rev.rating > 0);
  const playingGames = playerShelf.filter(g => g.status === "playing");
  const completedGames = playerShelf.filter(g => g.status === "completed");
  const backlogGames = playerShelf.filter(g => g.status === "backlog");

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  // 🎬 مكون فرعي لعرض قسم الرف السينمائي للألعاب
  const ShelfSection = ({ title, games, colorClass }: { title: string, games: any[], colorClass: string }) => (
    <div className="space-y-3">
      <h4 className={`text-xs font-black tracking-wider uppercase border-b border-zinc-900 pb-2 ${colorClass}`}>{title}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {games.map(game => (
          <Link key={game.id} href={`/${currentLang}/game/${game.gameId}`} className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 hover:border-purple-500 transition-all shadow-md block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={game.image} alt={game.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
              <span className="text-[10px] font-bold text-white truncate w-full text-center leading-snug">{game.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-white py-12 px-4 select-none" dir={isAr ? "rtl" : "ltr"}>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto space-y-6"
      >
        
        {/* 🎴 1. كرت الهوية والـ Bio العلوي الفخم */}
        <motion.div 
          variants={itemVariants}
          className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden group shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-100" />

          {/* أ. قسم الصورة الشخصية والألقاب وزر النسخ */}
          <div className="md:col-span-1 flex flex-col items-center md:items-start text-center md:text-start gap-4 z-10 border-b md:border-b-0 md:border-l border-zinc-900 pb-6 md:pb-0 md:pl-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-purple-500/20 p-1 overflow-hidden shadow-xl">
                <div className="w-full h-full rounded-2xl bg-zinc-800 flex items-center justify-center text-3xl font-black text-purple-400">
                  {profileData.userName?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-xs font-black flex items-center justify-center shadow-lg border border-black">
                {currentLevel}
              </div>
            </div>

            <div className="space-y-2 w-full overflow-hidden">
              <h1 className="text-xl font-black text-white tracking-wide truncate">
                {profileData.userName}
              </h1>

              <div className="w-full">
                <button
                  onClick={handleCopyId}
                  className="w-full flex items-center justify-between bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 p-1.5 px-2.5 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-white transition-all cursor-pointer group/copy"
                >
                  <span className="truncate max-w-[120px] font-mono select-all">
                    ID: {profileId}
                  </span>
                  <span className={`text-[9px] font-black shrink-0 ${copied ? "text-green-400" : "text-purple-400"}`}>
                    {copied ? (isAr ? "تم النسخ! ✓" : "Copied! ✓") : (isAr ? "نسخ 📋" : "Copy 📋")}
                  </span>
                </button>
              </div>
              
              {unlockedBadges.length > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-0.5">
                  {unlockedBadges.map((badge, idx) => (
                    <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black border tracking-wide shadow-xs ${badge.style}`}>
                      {badge.text}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-zinc-500 text-[11px] font-bold pb-1">
                {isAr ? `نقاط الخبرة الإجمالية: ${userXp} XP` : `Total Experience: ${userXp} XP`}
              </p>

              {!isOwnProfile && (
                <button
                  onClick={handleChatAction}
                  disabled={sendingRequest || chatStatus === "pending"}
                  className={`w-full mt-1 py-2 px-4 rounded-xl text-xs font-black transition-all duration-300 shadow-md cursor-pointer text-center block ${
                    chatStatus === "accepted"
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : chatStatus === "pending"
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-purple-500/30 text-zinc-200"
                  }`}
                >
                  {sendingRequest
                    ? (isAr ? "جاري الإرسال..." : "Sending...")
                    : chatStatus === "accepted"
                    ? (isAr ? "الذهاب للمحادثة 💬" : "Open Chat 💬")
                    : chatStatus === "pending"
                    ? (isAr ? "طلب المراسلة معلّق ⏳" : "Request Pending ⏳")
                    : (isAr ? "إرسال طلب محادثة ✉️" : "Send Chat Request ✉️")}
                </button>
              )}
            </div>
          </div>

          {/* ب. قسم شريط التقدم السائل وصندوق البيو */}
          <div className="md:col-span-2 flex flex-col justify-between gap-4 z-10">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-black text-zinc-400">
                <span>{isAr ? `المستوى ${currentLevel}` : `Level ${currentLevel}`}</span>
                <span>{userXp % xpPerLevel} / {xpPerLevel} XP</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-900 border border-zinc-800/60 rounded-full overflow-hidden p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-purple-400 tracking-wider uppercase">
                  {isAr ? "📝 النبذة الشخصية" : "📝 Player Bio"}
                </h3>
                {isOwnProfile && (
                  <button 
                    onClick={() => setIsEditingBio(!isEditingBio)}
                    className="text-[10px] font-black bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 text-zinc-400 hover:text-white px-2 py-1 rounded-md transition-all cursor-pointer"
                  >
                    {isEditingBio ? (isAr ? "إلغاء" : "Cancel") : (isAr ? "تعديل الوصف" : "Edit Bio")}
                  </button>
                )}
              </div>

              {isEditingBio ? (
                <div className="space-y-2">
                  <textarea
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    maxLength={150}
                    placeholder={isAr ? "اكتب نبذة عن نفسك وأسلوب لعبك المفضل..." : "Write a brief bio about yourself..."}
                    className="w-full h-16 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-purple-500 text-white placeholder-zinc-600 resize-none"
                  />
                  <div className="flex justify-end">
                    <button onClick={handleSaveBio} disabled={savingBio} className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-md">
                      {savingBio ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ النبذة 💾" : "Save Bio 💾")}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-400 text-xs leading-relaxed font-medium min-h-[40px] italic">
                  {bioText ? bioText : (isAr ? "هذا اللاعب لم يكتب نبذة شخصية بعد..." : "This player hasn't written a bio yet...")}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* 2. شبكة إحصائيات التفاعل الرقمية العامة */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
          {[
            { label: isAr ? "💬 إجمالي تعليقاته" : "💬 Total Comments", value: commentsCount, color: "text-white", unit: "" },
            { label: isAr ? "⭐ إجمالي تقييماته" : "⭐ Total Ratings", value: ratingsCount, color: "text-white", unit: "" },
            { label: isAr ? "⏳ وقته في المنصة" : "⏳ Time on Site", value: totalMinutesSpent, color: "text-purple-400", unit: isAr ? "د" : "m" }
          ].map((stat, i) => (
            <motion.div key={i} whileHover={{ y: -4 }} className="bg-zinc-950 border border-zinc-900/60 hover:border-purple-500/40 p-4 rounded-2xl text-center cursor-default transition-all duration-300 shadow-md">
              <span className="block text-zinc-500 text-[10px] sm:text-xs font-bold mb-1">{stat.label}</span>
              <span className={`text-lg sm:text-xl font-black ${stat.color}`}>
                {stat.value} {stat.unit && <span className="text-[10px] font-bold text-zinc-500">{stat.unit}</span>}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* 3. شاشة عرض وقفل البث المباشر */}
        <motion.div variants={itemVariants} className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 md:p-6 space-y-4 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${profileData.youtubeStreamId ? "bg-red-500" : "bg-zinc-600"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${profileData.youtubeStreamId ? "bg-red-600" : "bg-zinc-500"}`}></span>
              </span>
              <h3 className="text-sm font-black tracking-wide text-white">
                {isAr ? "📺 البث المباشر والمحتوى الحالي" : "📺 Live Stream & Active Content"}
              </h3>
            </div>

            {isOwnProfile && (
              <button onClick={() => setIsEditingStream(!isEditingStream)} className="text-[10px] font-black bg-zinc-900 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-white px-2 py-1 rounded-md transition-all cursor-pointer">
                {isEditingStream ? (isAr ? "إلغاء" : "Cancel") : (isAr ? "ربط بث يوتيوب 🔗" : "Link YouTube Live 🔗")}
              </button>
            )}
          </div>

          {isEditingStream ? (
            <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl space-y-3">
              <p className="text-[11px] text-zinc-500 font-bold leading-tight">
                {isAr ? "💡 ضع فقط معرّف الفيديو (Video ID) من رابط يوتيوب الخاص ببثك. مثلاً لو كان الرابط watch?v=dQw4w9WgXcQ ضع فقط dQw4w9WgXcQ" : "💡 Put only the Video ID from your YouTube stream link. e.g., for watch?v=dQw4w9WgXcQ write only dQw4w9WgXcQ"}
              </p>
              <div className="flex gap-2">
                <input type="text" value={streamIdText} onChange={(e) => setStreamIdText(e.target.value)} placeholder="e.g., dQw4w9WgXcQ" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 text-white placeholder-zinc-700" />
                <button onClick={handleSaveStreamId} disabled={savingStream} className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md">
                  {savingStream ? (isAr ? "ربط..." : "Linking...") : (isAr ? "تأكيد الربط 🚀" : "Confirm Link 🚀")}
                </button>
              </div>
            </div>
          ) : profileData.youtubeStreamId ? (
            <div className="w-full aspect-video rounded-2xl overflow-hidden border border-zinc-900 bg-black shadow-inner">
              <iframe className="w-full h-full object-cover" src={`https://www.youtube.com/embed/${profileData.youtubeStreamId}`} title="YouTube Live Stream" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-zinc-900/20 border border-dashed border-zinc-900 text-center space-y-2">
              <p className="text-zinc-500 text-xs font-bold">{isAr ? "📡 اللاعب حالياً خارج التغطية (Offline)" : "📡 Player is currently Offline"}</p>
              <p className="text-[10px] text-zinc-600 font-medium max-w-xs mx-auto">
                {isAr ? "لا يوجد بث مباشر نشط حالياً على هذه الصفحة. تفقد لوحة التفاعلات بالأسفل لمشاهدة نشاطاته." : "No active live stream on this page right now. Check the activity feed below."}
              </p>
            </div>
          )}
        </motion.div>

        {/* 4. سجل التفاعلات والمكتبة */}
        <motion.div variants={itemVariants} className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 md:p-6 space-y-4 shadow-2xl relative">
          <div className="flex border-b border-zinc-900 pb-1 gap-4 overflow-x-auto scrollbar-thin">
            {[
              { id: "shelf", label: isAr ? "مكتبة الألعاب 🎒" : "Game Shelf 🎒", count: playerShelf.length },
              { id: "comments", label: isAr ? "المراجعات 💬" : "Reviews 💬", count: commentedReviews.length },
              { id: "ratings", label: isAr ? "التقييمات ⭐" : "Ratings ⭐", count: ratedReviews.length }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-2 text-xs font-black relative transition-colors duration-200 cursor-pointer whitespace-nowrap ${isActive ? "text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {tab.label}
                  <span className="ml-1 text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded-md text-zinc-400">{tab.count}</span>
                  {isActive && (
                    <motion.div layoutId="activeTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="min-h-[150px] pt-2">
            <AnimatePresence mode="wait">

              {/* 🎒 تبويب مكتبة الألعاب السحري 🎒 */}
              {activeTab === "shelf" && (
                <motion.div key="shelf_tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                  {playerShelf.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <span className="text-4xl">🫙</span>
                      <p className="text-zinc-500 text-xs font-medium max-w-sm text-center">
                        {isAr ? "الرفوف فارغة! هذا اللاعب لم يضف أي ألعاب إلى مكتبته حتى الآن." : "Empty shelves! This player hasn't added any games to their library yet."}
                      </p>
                    </div>
                  ) : (
                    <>
                      {playingGames.length > 0 && <ShelfSection title={isAr ? "ألعبها حالياً 🎮" : "Playing 🎮"} games={playingGames} colorClass="text-sky-400 border-sky-900/30" />}
                      {completedGames.length > 0 && <ShelfSection title={isAr ? "أنهيتها ✅" : "Completed ✅"} games={completedGames} colorClass="text-emerald-400 border-emerald-900/30" />}
                      {backlogGames.length > 0 && <ShelfSection title={isAr ? "أخطط للعبها ⏳" : "Backlog ⏳"} games={backlogGames} colorClass="text-amber-400 border-amber-900/30" />}
                    </>
                  )}
                </motion.div>
              )}

              {/* 💬 تبويب المراجعات */}
              {activeTab === "comments" && (
                <motion.div key="comments_tab" initial={{ opacity: 0, x: isAr ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isAr ? -10 : 10 }} className="space-y-3">
                  {commentedReviews.length === 0 ? (
                    <p className="text-zinc-600 text-xs text-center py-8 font-medium">{isAr ? "🫙 لا توجد مراجعات نصية منشورة لهذا اللاعب بعد." : "🫙 No text reviews published by this player yet."}</p>
                  ) : (
                    commentedReviews.map((rev: any, idx: number) => (
                      <div key={idx} className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-2xl flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[11px] font-bold text-zinc-500">
                          <Link href={`/${currentLang}/game/${rev.gameId}`} className="text-purple-400 hover:underline">🎮 {isAr ? "لعبة رقم:" : "Game ID:"} {rev.gameId}</Link>
                          <span>{rev.createdAt}</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed font-medium">{rev.comment}</p>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

              {/* ⭐ تبويب التقييمات */}
              {activeTab === "ratings" && (
                <motion.div key="ratings_tab" initial={{ opacity: 0, x: isAr ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isAr ? -10 : 10 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ratedReviews.length === 0 ? (
                    <p className="text-zinc-600 text-xs text-center col-span-2 py-8 font-medium">{isAr ? "🫙 لا توجد تقييمات بالنجوم من هذا اللاعب بعد." : "🫙 No star ratings submitted by this player yet."}</p>
                  ) : (
                    ratedReviews.map((rev: any, idx: number) => (
                      <div key={idx} className="bg-zinc-900/20 border border-zinc-900/80 p-4 rounded-xl flex items-center justify-between">
                        <Link href={`/${currentLang}/game/${rev.gameId}`} className="text-xs font-black text-purple-400 hover:underline">🎮 {isAr ? "اللعبة:" : "Game:"} {rev.gameId}</Link>
                        <div className="flex gap-0.5 text-xs">{Array.from({ length: rev.rating }).map((_, i) => <span key={i}>⭐</span>)}</div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </motion.div>
    </main>
  );
}