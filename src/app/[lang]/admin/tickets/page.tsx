"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAllTicketsForAdmin, addTicketReply, updateTicketStatus, Ticket } from "@/lib/tickets";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface AdminTicketsPageProps {
  params: Promise<{
    lang: string;
  }>;
}

// 🔒 ضع معرف الـ UID الخاص بك كمسؤول هنا لحماية اللوحة من المتطفلين
const ADMIN_UIDS = ["ADUh6c2FnScmOewpASpAU6w8llE3"]; 

export default function AdminTicketsPage({ params }: AdminTicketsPageProps) {
  const { user, loading: authLoading } = useAuth();
  const [isAr, setIsAr] = useState(true);
  const [currentLang, setCurrentLang] = useState("ar");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "in-progress" | "closed">("all");

  // حالات الرد والمعالجة
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setIsAr(resolvedParams.lang === "ar");
      setCurrentLang(resolvedParams.lang || "ar");
    });
  }, [params]);

  useEffect(() => {
    // لا نقوم بجلب التذاكر إلا إذا كان المستخدم مسجلاً ومصرحاً له كمسؤول
    if (user && ADMIN_UIDS.includes(user.uid)) {
      fetchAdminTickets();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchAdminTickets = async () => {
    setLoading(true);
    const allTickets = await getAllTicketsForAdmin();
    setTickets(allTickets);
    setLoading(false);
  };

  const handleAdminReply = async (ticketId: string) => {
    if (!user || !replyText.trim()) return;

    setActionLoading(true);
    
    // 🛠️ تم إصلاح هذا السطر ليتوافق مع التحديث الأخير لدالة addTicketReply في ملف tickets.ts
    // المتغيرات هي: (رقم التذكرة، معرف المرسل، اسم المرسل، نص الرسالة، هل هو أدمن؟)
    const res = await addTicketReply(ticketId, user.uid, "الدعم الفني 🛡️", replyText, true);
    
    if (res.success) {
      setReplyText("");
      // تحديث محلي فوري للحالة والردود (Optimistic UI)
      setTickets(prev => prev.map(t => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: "in-progress", // يتحول تلقائياً لقيد المعالجة عند رد الإدارة
            replies: [...t.replies, {
              replyId: Math.random().toString(),
              senderId: user.uid,
              senderName: "الدعم الفني 🛡️",
              message: replyText,
              isAdmin: true,
              createdAt: new Date().toISOString()
            }]
          };
        }
        return t;
      }));
    }
    setActionLoading(false);
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: "open" | "in-progress" | "closed") => {
    setActionLoading(true);
    const res = await updateTicketStatus(ticketId, newStatus);
    if (res.success) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    }
    setActionLoading(false);
  };

  const filteredTickets = tickets.filter(t => filterStatus === "all" ? true : t.status === filterStatus);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString(isAr ? 'ar-QA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // 1️⃣ شاشة التحقق من صلاحيات الأدمن حماية للنظام
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !ADMIN_UIDS.includes(user.uid)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4" dir={isAr ? "rtl" : "ltr"}>
        <h2 className="text-xl font-black text-red-500">{isAr ? "🚫 غير مصرح لك بدخول هذه اللوحة!" : "🚫 Access Denied!"}</h2>
        <p className="text-xs text-zinc-500 font-medium">{isAr ? "هذه المنطقة مخصصة لإدارة منصة GG LIST فقط." : "This area is restricted to GG LIST administrators."}</p>
        <Link href={`/${currentLang}`} className="bg-zinc-900 border border-zinc-800 px-6 py-2 rounded-xl text-sm font-bold transition-all">
          {isAr ? "العودة للرئيسية" : "Back Home"}
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white py-12 px-4 md:px-8" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* الهيدر علوي */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-400">
              {isAr ? "لوحة تحكم التذاكر 🛡️" : "Tickets Control Panel 🛡️"}
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              {isAr ? `إجمالي التذاكر النشطة في الموقع: ${tickets.length} تذكرة` : `Total active tickets: ${tickets.length}`}
            </p>
          </div>

          {/* فلاتر التصفية السريعة */}
          <div className="flex bg-zinc-950 border border-zinc-900 p-1 rounded-xl text-xs font-black shrink-0">
            {[
              { id: "all", label: isAr ? "الكل" : "All" },
              { id: "open", label: isAr ? "مفتوحة" : "Open" },
              { id: "in-progress", label: isAr ? "قيد المعالجة" : "In Progress" },
              { id: "closed", label: isAr ? "مغلقة" : "Closed" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${filterStatus === tab.id ? "bg-amber-500 text-black font-black shadow-md" : "text-zinc-400 hover:text-white"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 📑 عرض التذاكر المنبثقة */}
        {filteredTickets.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-16 text-center space-y-2">
            <span className="text-4xl">☕</span>
            <p className="text-sm font-bold text-zinc-500">{isAr ? "لا توجد تذاكر في هذا القسم حالياً. الهدوء يعم المنصة!" : "No tickets found in this section."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className={`bg-zinc-950 border rounded-2xl overflow-hidden shadow-xl transition-all ${expandedTicketId === ticket.id ? "border-amber-500/40" : "border-zinc-900 hover:border-zinc-800"}`}>
                
                {/* الرأس التفاعلي للتذكرة للأدمن */}
                <div 
                  onClick={() => setExpandedTicketId(expandedTicketId === ticket.id ? null : (ticket.id || null))}
                  className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-zinc-900/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-zinc-900 px-2 py-0.5 rounded-md font-mono text-zinc-400">ID: {ticket.id}</span>
                      <span className="text-xs text-purple-400 font-bold">👤 {ticket.userName}</span>
                    </div>
                    <h3 className="text-sm font-black text-white pt-1">{ticket.subject}</h3>
                    <p className="text-[10px] text-zinc-500 font-medium">{formatDate(ticket.createdAt)}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black border ${
                      ticket.status === "open" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      ticket.status === "in-progress" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {ticket.status === "open" ? (isAr ? "جديدة 🟢" : "New 🟢") : 
                       ticket.status === "in-progress" ? (isAr ? "معالجة 🟡" : "In Progress 🟡") : 
                       (isAr ? "مغلقة 🔴" : "Closed 🔴")}
                    </span>
                  </div>
                </div>

                {/* جسم التذكرة المفتوح بكافة أدوات التحكم والرد */}
                <AnimatePresence>
                  {expandedTicketId === ticket.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-900 bg-zinc-900/10"
                    >
                      <div className="p-5 space-y-6">
                        
                        {/* نص المشكلة الصادر من اللاعب */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">{isAr ? "رسالة اللاعب المرفوعة:" : "Player Message:"}</span>
                          <p className="text-xs text-zinc-200 leading-relaxed font-medium bg-zinc-950 p-4 rounded-xl border border-zinc-800/60">
                            {ticket.description}
                          </p>
                        </div>

                        {/* سجل محادثة التذكرة التبادلي */}
                        {ticket.replies && ticket.replies.length > 0 && (
                          <div className="space-y-3">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">{isAr ? "تاريخ المراسلات داخل التذكرة:" : "Correspondence History:"}</span>
                            <div className="space-y-3">
                              {ticket.replies.map((reply) => (
                                <div key={reply.replyId} className={`flex flex-col gap-1 max-w-[85%] ${reply.isAdmin ? "ml-auto" : "mr-auto"}`}>
                                  <span className={`text-[9px] font-bold px-1 ${reply.isAdmin ? "text-amber-400 text-end" : "text-purple-400"}`}>
                                    {reply.senderName}
                                  </span>
                                  <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed ${reply.isAdmin ? "bg-amber-500/10 border border-amber-500/20 text-amber-100 rounded-tr-sm" : "bg-zinc-900 text-zinc-200 rounded-tl-sm"}`}>
                                    {reply.message}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* لوحة التحكم بالإغلاق والرد الفوري */}
                        <div className="pt-4 border-t border-zinc-900/60 flex flex-col md:flex-row justify-between items-center gap-4">
                          
                          {/* أزرار تعديل الحالة السريعة */}
                          <div className="flex gap-2 w-full md:w-auto">
                            {ticket.status !== "closed" ? (
                              <button 
                                onClick={() => handleUpdateStatus(ticket.id!, "closed")}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/20 rounded-xl text-xs font-black transition-all cursor-pointer w-full md:w-auto"
                              >
                                {isAr ? "حل وإغلاق التذكرة 🔴" : "Close Ticket 🔴"}
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleUpdateStatus(ticket.id!, "open")}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 rounded-xl text-xs font-black transition-all cursor-pointer w-full md:w-auto"
                              >
                                {isAr ? "إعادة فتح التذكرة 🟢" : "Re-open Ticket 🟢"}
                              </button>
                            )}
                          </div>

                          {/* حقل رد الإدمن الذكي والسريع */}
                          {ticket.status !== "closed" && (
                            <div className="flex gap-2 w-full md:flex-1 md:max-w-md">
                              <input 
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={isAr ? "اكتب رد الدعم الفني الرسمي للّاعب..." : "Write official support reply..."}
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500 text-white placeholder-zinc-700 transition-all"
                              />
                              <button 
                                onClick={() => handleAdminReply(ticket.id!)}
                                disabled={actionLoading || !replyText.trim()}
                                className="bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-900 disabled:text-zinc-600 text-black font-black text-xs px-5 py-2 rounded-xl transition-all cursor-pointer shrink-0"
                              >
                                {isAr ? "رد وإرسال ✉️" : "Reply ✉️"}
                              </button>
                            </div>
                          )}

                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}