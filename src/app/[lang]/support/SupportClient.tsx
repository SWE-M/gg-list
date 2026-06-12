"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createTicket, getUserTickets, addTicketReply, Ticket } from "@/lib/tickets";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface SupportClientProps {
  params: Promise<{
    lang: string;
  }>;
}

export default function SupportClient({ params }: SupportClientProps) {
  const { user } = useAuth();
  const [isAr, setIsAr] = useState(true);
  const [currentLang, setCurrentLang] = useState("ar");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // حالات إنشاء تذكرة جديدة
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // حالات فتح التذكرة والرد
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setIsAr(resolvedParams.lang === "ar");
      setCurrentLang(resolvedParams.lang || "ar");
    });
  }, [params]);

  useEffect(() => {
    if (user) {
      fetchTickets();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    const userTickets = await getUserTickets(user.uid);
    setTickets(userTickets);
    setLoading(false);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !description.trim()) return;

    setSubmitting(true);
    const res = await createTicket(user.uid, user.displayName || "Gamer", subject, description);
    
    if (res.success) {
      setSubject("");
      setDescription("");
      await fetchTickets(); // تحديث القائمة فوراً
    } else {
      alert(isAr ? "حدث خطأ أثناء الإرسال." : "Error submitting ticket.");
    }
    setSubmitting(false);
  };

  const handleSendReply = async (ticketId: string) => {
    if (!user || !replyText.trim()) return;

    setReplying(true);
    const res = await addTicketReply(ticketId, user.uid, user.displayName || "Gamer", replyText, false);
    
    if (res.success) {
      setReplyText("");
      // تحديث محلي سريع (Optimistic UI) بدون إعادة جلب البيانات
      setTickets(prev => prev.map(t => {
        if (t.id === ticketId) {
          return {
            ...t,
            replies: [...t.replies, {
              replyId: Math.random().toString(),
              senderId: user.uid,
              senderName: user.displayName || "Gamer",
              message: replyText,
              isAdmin: false,
              createdAt: new Date().toISOString()
            }]
          };
        }
        return t;
      }));
    }
    setReplying(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-md text-[10px] font-black">{isAr ? "مفتوحة 🟢" : "Open 🟢"}</span>;
      case "in-progress": return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-md text-[10px] font-black">{isAr ? "قيد المعالجة 🟡" : "In Progress 🟡"}</span>;
      case "closed": return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-md text-[10px] font-black">{isAr ? "مغلقة 🔴" : "Closed 🔴"}</span>;
      default: return null;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString(isAr ? 'ar-QA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4" dir={isAr ? "rtl" : "ltr"}>
        <h2 className="text-xl font-black text-zinc-400">{isAr ? "يجب تسجيل الدخول لفتح تذكرة دعم فني" : "You must log in to open a support ticket"}</h2>
        <Link href={`/${currentLang}`} className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-xl text-sm font-bold transition-all">
          {isAr ? "العودة للرئيسية" : "Back to Home"}
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white py-12 px-4 md:px-8" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* 📝 عمود إنشاء التذكرة */}
        <div className="md:col-span-1 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
              {isAr ? "الدعم الفني 🛠️" : "Support 🛠️"}
            </h1>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
              {isAr ? "واجهت مشكلة؟ أو لديك اقتراح لتحسين المنصة؟ نحن هنا للاستماع إليك." : "Faced a bug? Or have a suggestion? We are here to listen."}
            </p>
          </div>

          <form onSubmit={handleSubmitTicket} className="bg-zinc-950 border border-zinc-900 p-6 rounded-3xl shadow-2xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-zinc-300">{isAr ? "عنوان التذكرة" : "Ticket Subject"}</label>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder={isAr ? "مثال: مشكلة في تقييم لعبة" : "e.g., Error rating a game"}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white placeholder-zinc-600 transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-black text-zinc-300">{isAr ? "التفاصيل" : "Details"}</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
                placeholder={isAr ? "اشرح المشكلة بالتفصيل..." : "Explain the issue in detail..."}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white placeholder-zinc-600 transition-all resize-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting || !subject.trim() || !description.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 disabled:text-zinc-500 text-white font-black py-3 rounded-xl transition-all shadow-lg"
            >
              {submitting ? (isAr ? "جاري الإرسال..." : "Submitting...") : (isAr ? "إرسال التذكرة 🚀" : "Submit Ticket 🚀")}
            </button>
          </form>
        </div>

        {/* 🗂️ عمود التذاكر السابقة */}
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-white border-b border-zinc-900 pb-3">
            {isAr ? "تذاكري السابقة 🗂️" : "My Previous Tickets 🗂️"}
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-3xl p-12 text-center space-y-3">
              <span className="text-4xl block">✨</span>
              <p className="text-sm font-bold text-zinc-500">
                {isAr ? "ليس لديك أي تذاكر سابقة. حسابك سليم 100%!" : "You don't have any previous tickets."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-zinc-700">
                  {/* رأس التذكرة (قابل للنقر) */}
                  <div 
                    onClick={() => setExpandedTicketId(expandedTicketId === ticket.id ? null : (ticket.id || null))}
                    className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer bg-zinc-950 hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-white">{ticket.subject}</h3>
                      <p className="text-[11px] font-bold text-zinc-500">
                        {isAr ? "رقم التذكرة:" : "Ticket ID:"} <span className="font-mono text-zinc-400">{ticket.id}</span> • {formatDate(ticket.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(ticket.status)}
                    </div>
                  </div>

                  {/* تفاصيل التذكرة والردود (تفتح بنعومة) */}
                  <AnimatePresence>
                    {expandedTicketId === ticket.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-zinc-900 bg-zinc-900/20"
                      >
                        <div className="p-5 space-y-6">
                          
                          {/* وصف المشكلة الأساسي */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">{isAr ? "وصف المشكلة" : "Issue Description"}</span>
                            <p className="text-xs text-zinc-300 leading-relaxed font-medium bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                              {ticket.description}
                            </p>
                          </div>

                          {/* سجل الردود */}
                          {ticket.replies && ticket.replies.length > 0 && (
                            <div className="space-y-3">
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{isAr ? "الردود" : "Replies"}</span>
                              <div className="space-y-3">
                                {ticket.replies.map((reply) => (
                                  <div key={reply.replyId} className={`flex flex-col gap-1 max-w-[85%] ${reply.isAdmin ? "mr-auto" : "ml-auto"}`}>
                                    <span className={`text-[9px] font-bold px-1 ${reply.isAdmin ? "text-emerald-400" : "text-purple-400 text-end"}`}>
                                      {reply.isAdmin ? (isAr ? "الدعم الفني 🛡️" : "Support 🛡️") : (isAr ? "أنت" : "You")}
                                    </span>
                                    <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed ${reply.isAdmin ? "bg-zinc-800 text-white rounded-tr-sm" : "bg-purple-600/20 border border-purple-500/30 text-purple-100 rounded-tl-sm"}`}>
                                      {reply.message}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* حقل الرد (إذا لم تكن مغلقة) */}
                          {ticket.status !== "closed" ? (
                            <div className="flex gap-2 pt-2">
                              <input 
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={isAr ? "أضف رداً أو توضيحاً..." : "Add a reply..."}
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-purple-500 text-white placeholder-zinc-600 transition-all"
                              />
                              <button 
                                onClick={() => handleSendReply(ticket.id!)}
                                disabled={replying || !replyText.trim()}
                                className="bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-800 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all cursor-pointer"
                              >
                                {replying ? "..." : (isAr ? "إرسال 📩" : "Send 📩")}
                              </button>
                            </div>
                          ) : (
                            <div className="text-center bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black p-2 rounded-lg">
                              {isAr ? "هذه التذكرة مغلقة ولا يمكن الرد عليها." : "This ticket is closed and cannot be replied to."}
                            </div>
                          )}

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}