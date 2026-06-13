"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// 🔥 استيراد المحرك الإداري الشامل الذي برمجناه
import { toggleUserBan, getAllSystemChats, getRecentSystemReviews, deleteOffensiveContent } from "@/lib/admin";

interface AdminPageProps {
  params: Promise<{ lang: string; }>;
}

const ADMIN_UIDS = ["ADUh6c2FnScmOewpASpAU6w8llE3"]; 

export default function SuperAdminDashboard({ params }: AdminPageProps) {
  const { user, loading: authLoading } = useAuth();
  const [isAr, setIsAr] = useState(true);
  const [currentLang, setCurrentLang] = useState("ar");

  const [activeTab, setActiveTab] = useState<"overview" | "users" | "moderation" | "chats">("overview");

  const [users, setUsers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setIsAr(resolvedParams.lang === "ar");
      setCurrentLang(resolvedParams.lang || "ar");
    });
  }, [params]);

  useEffect(() => {
    if (!user || !ADMIN_UIDS.includes(user.uid)) {
      if (!authLoading) setLoading(false);
      return;
    }

    const fetchAllUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const usersData: any[] = [];
        snapshot.forEach(doc => {
          usersData.push({ id: doc.id, ...doc.data() });
        });
        setUsers(usersData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching users for admin:", error);
        setLoading(false);
      }
    };

    fetchAllUsers();
    getDocs(collection(db, "tickets")).then(snap => setTicketsCount(snap.size)).catch(()=>{});
  }, [user, authLoading]);

  useEffect(() => {
    if (activeTab === "moderation" && reviews.length === 0) {
      getRecentSystemReviews().then(data => setReviews(data));
    } else if (activeTab === "chats" && chats.length === 0) {
      getAllSystemChats().then(data => setChats(data));
    }
  }, [activeTab]);


  // 🛑 دالة الحظر المحدثة (ترسل النص والسبب مباشرة)
  const handleBanUser = async (userId: string, currentBanStatus: boolean) => {
    const nextBanStatus = !currentBanStatus;
    
    if (nextBanStatus) {
      const reason = prompt(
        isAr ? "اكتب سبب حظر هذا اللاعب:" : "Enter the reason for banning this user:",
        isAr ? "مخالفة بنود الاستخدام" : "Violation of terms"
      );
      if (reason === null) return; 

      const durationText = prompt(
        isAr ? "اكتب المدة اللي تبغاها تظهر للاعب بالحرف (مثال: أسبوع، 3 أيام، شهر):" : "Enter exact ban duration text (e.g. 3 days):", 
        isAr ? "حتى إشعار آخر" : "Until further notice"
      );
      if (durationText === null) return;

      setProcessingId(userId);
      
      // 🎯 إرسال النص الحرفي والسبب إلى الـ Backend
      const res = await toggleUserBan(userId, true, durationText, reason);
      
      if(res.success) {
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === userId ? { ...u, isBanned: true, banReason: reason, banUntil: durationText } : u
          )
        );
      } else {
        alert(isAr ? "حدث خطأ أثناء تنفيذ الحظر." : "An error occurred.");
      }
    } else {
      if(!confirm(isAr ? "هل أنت متأكد من فك الحظر عن هذا اللاعب؟" : "Are you sure you want to unban this user?")) return;
      setProcessingId(userId);
      const res = await toggleUserBan(userId, false);
      if(res.success) {
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === userId ? { ...u, isBanned: false, banReason: null, banUntil: null } : u
          )
        );
      } else {
        alert(isAr ? "حدث خطأ أثناء فك الحظر." : "An error occurred.");
      }
    }
    setProcessingId(null);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if(!confirm(isAr ? "هل أنت متأكد من حذف هذا المحتوى نهائياً كمدير؟" : "Delete this content permanently?")) return;
    setProcessingId(reviewId);
    const res = await deleteOffensiveContent("reviews", reviewId);
    if(res.success) {
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    }
    setProcessingId(null);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!user || !ADMIN_UIDS.includes(user.uid)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4" dir={isAr ? "rtl" : "ltr"}>
        <span className="text-6xl mb-2">🛑</span>
        <h2 className="text-2xl font-black text-red-500">{isAr ? "منطقة الإدارة العليا محظورة!" : "Super Admin Area Restricted!"}</h2>
        <Link href={`/${currentLang}`} className="bg-zinc-900 border border-zinc-800 px-6 py-2 rounded-xl font-bold">العودة 🏠</Link>
      </div>
    );
  }

  const onlineUsers = users.filter(u => u.isOnline);
  const bannedUsers = users.filter(u => u.isBanned);

  const translatePath = (path: string) => {
    if (!path) return "غير محدد";
    if (path.includes("explore")) return "صفحة الاستكشاف 🔍";
    if (path.includes("game/")) return "يتصفح لعبة 🎮";
    if (path.includes("profile/")) return "بروفايل لاعب 👤";
    if (path.includes("messages")) return "الرسائل 💬";
    if (path.includes("support")) return "الدعم الفني 🛠️";
    if (path === "/ar" || path === "/en") return "الرئيسية 🏠";
    return path;
  };

  return (
    <main className="min-h-screen bg-black text-white py-12 px-4 md:px-8 select-none" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-red-500 to-purple-600">
              {isAr ? "غرفة التحكم الشاملة (God Mode) 👁️‍🗨️" : "God Mode Dashboard 👁️‍🗨️"}
            </h1>
            <p className="text-xs text-zinc-400 font-medium">مراقبة حية، إدارة الحسابات، صلاحيات الحذف والحظر.</p>
          </div>

          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `/${currentLang}/admin/tickets`;
            }}
            className="relative z-[100] pointer-events-auto cursor-pointer bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-5 py-2.5 rounded-xl text-xs font-black text-amber-400 transition-all flex items-center gap-2 shadow-lg hover:scale-105"
          >
            لوحة التذاكر 🎫 <span className="bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-md text-[10px]">{ticketsCount}</span>
          </button>
        </div>

        <div className="flex bg-zinc-950/80 border border-zinc-900 p-1.5 rounded-2xl w-fit overflow-x-auto scrollbar-hide relative z-40">
          {[
            { id: "overview", label: isAr ? "نظرة عامة ورادار 🛰️" : "Radar Overview" },
            { id: "users", label: isAr ? "إدارة اللاعبين 👥" : "Users Management" },
            { id: "moderation", label: isAr ? "المراقبة والحماية 🛡️" : "Moderation" },
            { id: "chats", label: isAr ? "النظام وغرف الدردشة 💬" : "System Chats" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id ? "bg-zinc-800 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex flex-col items-center gap-2">
                    <span className="text-zinc-500 text-[10px] font-black uppercase">{isAr ? "إجمالي اللاعبين" : "Total Users"}</span>
                    <span className="text-3xl font-black text-white">{users.length}</span>
                  </div>
                  <div className="bg-zinc-950 border border-emerald-900/30 p-5 rounded-2xl flex flex-col items-center gap-2">
                    <span className="text-emerald-500 text-[10px] font-black uppercase flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {isAr ? "متصلون الآن" : "Online"}
                    </span>
                    <span className="text-3xl font-black text-emerald-400">{onlineUsers.length}</span>
                  </div>
                  <div className="bg-zinc-950 border border-red-900/30 p-5 rounded-2xl flex flex-col items-center gap-2">
                    <span className="text-red-500 text-[10px] font-black uppercase">{isAr ? "اللاعبون المحظورون" : "Banned Users"}</span>
                    <span className="text-3xl font-black text-red-400">{bannedUsers.length}</span>
                  </div>
                  <div className="bg-zinc-950 border border-amber-900/30 p-5 rounded-2xl flex flex-col items-center gap-2">
                    <span className="text-amber-500 text-[10px] font-black uppercase">{isAr ? "تذاكر الدعم" : "Tickets"}</span>
                    <span className="text-3xl font-black text-amber-400">{ticketsCount}</span>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="bg-zinc-900/40 p-4 border-b border-zinc-900 flex justify-between items-center">
                    <h2 className="text-sm font-black text-white">{isAr ? "رادار اللاعبين (الزمن الفعلي)" : "Live Radar"}</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm" dir={isAr ? "rtl" : "ltr"}>
                      <thead className="bg-zinc-900/20 text-zinc-500 text-[10px] uppercase font-black">
                        <tr>
                          <th className="px-6 py-4">اللاعب</th>
                          <th className="px-6 py-4">الحالة</th>
                          <th className="px-6 py-4">الموقع داخل المنصة</th>
                          <th className="px-6 py-4">آخر نشاط</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/50">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-zinc-900/30">
                            <td className="px-6 py-4 font-bold text-white">{u.userName}</td>
                            <td className="px-6 py-4">
                              {u.isBanned ? (
                                <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded-md">محظور 🚫</span>
                              ) : u.isOnline ? (
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">متصل 🟢</span>
                              ) : (
                                <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-1 rounded-md">غادر ⚫</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-zinc-400">
                              {u.isOnline ? translatePath(u.currentPath) : "---"}
                            </td>
                            <td className="px-6 py-4 text-[10px] font-bold text-zinc-600" suppressHydrationWarning>
                              {u.lastActive?.seconds ? new Date(u.lastActive.seconds * 1000).toLocaleTimeString(isAr ? 'ar-QA' : 'en-US') : "غير معروف"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {users.map(u => (
                    <div key={u.id} className={`p-4 border rounded-2xl flex flex-col gap-4 transition-colors ${u.isBanned ? "bg-red-950/20 border-red-900/50" : "bg-zinc-900/30 border-zinc-800"}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u.photoURL || "/images/default-avatar.png"} alt="" className="w-10 h-10 rounded-full border border-zinc-700" />
                          <div>
                            <Link href={`/${currentLang}/profile/${u.id}`} target="_blank" className="font-black text-sm text-white hover:underline">{u.userName}</Link>
                            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">ID: {u.id.substring(0,8)}...</p>
                          </div>
                        </div>
                        {u.isBanned && <span className="text-xl">🚫</span>}
                      </div>
                      
                      <button 
                        onClick={() => handleBanUser(u.id, !!u.isBanned)}
                        disabled={processingId === u.id || ADMIN_UIDS.includes(u.id)}
                        className={`w-full py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          ADMIN_UIDS.includes(u.id) ? "bg-zinc-900 text-zinc-600 cursor-not-allowed" :
                          u.isBanned ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20"
                        }`}
                      >
                        {processingId === u.id ? "جاري المعالجة..." : ADMIN_UIDS.includes(u.id) ? "أدمن نظام (محمي)" : u.isBanned ? "فك الحظر عن اللاعب 🟢" : "حظر اللاعب 🔴"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "moderation" && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-3 text-amber-400">
                  <span className="text-2xl">⚠️</span>
                  <div className="text-xs font-bold leading-relaxed">
                    <p>منطقة الحماية والمراقبة:</p>
                    <p className="text-amber-200/60">هنا تظهر أحدث التقييمات والمراجعات في المنصة. يمكنك حذف أي محتوى يحتوي على إساءة بضغطة زر واحدة.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.length === 0 ? (
                    <p className="text-zinc-500 text-sm p-8 text-center col-span-2">لا توجد مراجعات حالياً.</p>
                  ) : (
                    reviews.map(rev => (
                      <div key={rev.id} className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex flex-col gap-3 shadow-lg hover:border-zinc-800 transition-colors">
                        <div className="flex justify-between items-start border-b border-zinc-900/60 pb-3">
                          <div>
                            <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md">لعبة: {rev.gameId}</span>
                            <span className="ml-2 text-[10px] text-zinc-500">ID: {rev.userId ? rev.userId.substring(0,6) : "مجهول"}...</span>
                          </div>
                          <div className="text-xs">{Array.from({length: rev.rating || 0}).map((_,i) => <span key={i}>⭐</span>)}</div>
                        </div>
                        <p className="text-xs font-medium text-zinc-300 leading-relaxed bg-zinc-900/30 p-3 rounded-xl min-h-[60px]">
                          {rev.comment || <span className="text-zinc-600 italic">"تقييم بدون تعليق نصي"</span>}
                        </p>
                        <div className="pt-2 flex justify-end">
                          <button 
                            onClick={() => handleDeleteReview(rev.id)}
                            disabled={processingId === rev.id}
                            className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 text-[10px] font-black px-4 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            {processingId === rev.id ? "جاري الحذف..." : "حذف المحتوى 🗑️"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "chats" && (
              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl p-6 text-center space-y-4">
                <span className="text-6xl">📡</span>
                <h3 className="text-lg font-black text-zinc-300">مراقبة الغرف الحية</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  يوجد حالياً <span className="text-purple-400 font-black">{chats.length}</span> غرفة دردشة مسجلة في قاعدة البيانات. خصوصية محتوى الدردشة محمية، ولكن كمدير يمكنك رؤية عدد الغرف النشطة.
                </p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </div>
    </main>
  );
}