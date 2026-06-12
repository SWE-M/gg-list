"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { sendMessage, acceptChatRequest, createGroupChat } from "@/lib/chat";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore"; 
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
// 1. استيراد المكتبة الخاصة بالإيموجي
import EmojiPicker from 'emoji-picker-react';

interface MessagesPageProps {
  params: Promise<{
    lang: string;
  }>;
}

export default function MessagesDashboardPage({ params }: MessagesPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isAr, setIsAr] = useState(true);
  const [currentLang, setCurrentLang] = useState("ar");
  const [loading, setLoading] = useState(true);

  // غرف الدردشة والطلبات الحية
  const [rooms, setRooms] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  
  // خارطة حية لتخزين أسماء الحسابات المستدعاة سحابياً
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

  // حالات الإدخال والتحكم
  const [newMessageText, setNewMessageText] = useState("");
  const [sending, setSending] = useState(false);
  
  // 🌟 👈 حالة التحكم بظهور وإخفاء نافذة الإيموجي
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // حالات إنشاء مجتمع / قروب جديد
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [targetMemberId, setTargetMemberId] = useState(""); 
  const [creatingGroup, setCreatingGroup] = useState(false);

  // 1️⃣ حل معلمات الرابط ديناميكياً
  useEffect(() => {
    params.then((resolvedParams) => {
      setIsAr(resolvedParams.lang === "ar");
      setCurrentLang(resolvedParams.lang || "ar");
    });
  }, [params]);

  // 2️⃣ الاستماع الحي والمباشر لغرف المحادثات وطلبات المراسلة الواردة
  useEffect(() => {
    if (!user) {
      if (!loading) router.push(`/${currentLang}`);
      return;
    }

    const myUid = user.uid;

    const requestsRef = collection(db, "chatRequests");
    const roomsRef = collection(db, "chatRooms");

    const qRequests = query(requestsRef, where("receiverId", "==", myUid), where("status", "==", "pending"));
    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      const reqList: any[] = [];
      snapshot.forEach((doc) => reqList.push({ id: doc.id, ...doc.data() }));
      setRequests(reqList);
    });

    const qRooms = query(roomsRef, where("members", "array-contains", myUid)); 
    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      const roomList: any[] = [];
      snapshot.forEach((doc) => {
        roomList.push({ id: doc.id, ...doc.data() });
      });
      
      roomList.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });

      setRooms(roomList);
      setLoading(false);
    }, (err) => {
      console.error("Firestore ChatRooms Stream Error: ", err);
      setLoading(false);
    });

    return () => {
      unsubRequests();
      unsubRooms();
    };
  }, [user, currentLang, loading, router]);

  // 3️⃣ نظام حل الأسماء الذكي لغرف الشات الخاص بأسماء اللاعبين الحركية
  useEffect(() => {
    if (!rooms.length || !user) return;

    const myUid = user.uid;

    async function fetchMissingUsernames() {
      const updatedNames = { ...resolvedNames };
      let hasNewFetches = false;

      for (const room of rooms) {
        if (room.type !== "group" && !updatedNames[room.id]) {
          const otherMemberId = room.members.find((m: string) => m !== myUid);
          if (otherMemberId) {
            try {
              const userDocRef = doc(db, "users", otherMemberId);
              const userDocSnap = await getDoc(userDocRef);
              
              if (userDocSnap.exists()) {
                updatedNames[room.id] = userDocSnap.data().userName || "Gamer";
              } else {
                updatedNames[room.id] = `لاعب (${otherMemberId.slice(0, 6)})`;
              }
              hasNewFetches = true;
            } catch (err) {
              console.error("Error fetching participant username:", err);
            }
          }
        }
      }

      if (hasNewFetches) {
        setResolvedNames(updatedNames);
      }
    }

    fetchMissingUsernames();
  }, [rooms, user, resolvedNames]);

  // 4️⃣ الاستماع الحي للرسائل بداخل الغرفة النشطة الحالية
  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, "chatRooms", activeRoomId, "messages");
    const qMessages = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      const msgList: any[] = [];
      snapshot.forEach((doc) => msgList.push({ id: doc.id, ...doc.data() }));
      setMessages(msgList);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubMessages();
  }, [activeRoomId]);

  // دالة إرسال الرسالة الحية
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeRoomId || !newMessageText.trim() || sending) return;

    setSending(true);
    const res = await sendMessage(activeRoomId, user.uid, user.displayName || "لاعب مجهول", newMessageText);
    if (res.success) {
      setNewMessageText("");
      setShowEmojiPicker(false); // إغلاق نافذة الإيموجي عند الإرسال
    }
    setSending(false);
  };

  // دالة قبول طلب المراسلة الوارد حياً
  const handleAcceptRequest = async (reqId: string, senderId: string) => {
    if (!user) return;
    const res = await acceptChatRequest(reqId, senderId, user.uid);
    if (res.success && res.roomId) {
      setActiveRoomId(res.roomId);
    }
  };

  // دالة إنشاء مجتمع / قروب جيمري جماعي جديد
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim() || !targetMemberId.trim()) return;

    setCreatingGroup(true);
    const res = await createGroupChat(newGroupName, [targetMemberId.trim()], user.uid);
    if (res.success && res.roomId) {
      setActiveRoomId(res.roomId);
      setNewGroupName("");
      setTargetMemberId("");
      setShowGroupModal(false);
    }
    setCreatingGroup(false);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  return (
    <main className="h-[calc(100vh-80px)] bg-black text-white overflow-hidden select-none" dir={isAr ? "rtl" : "ltr"}>
      <div className="h-full flex flex-col md:flex-row max-w-7xl mx-auto border-x border-zinc-900">
        
        {/* 📑 الجانب الأيمن: قائمة المحادثات والطلبات الواردة المعلقة 📑 */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-l border-zinc-900 bg-zinc-950/40 flex flex-col h-1/2 md:h-full">
          <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
            <h2 className="text-sm font-black tracking-wide text-zinc-400">
              {isAr ? "💬 صندوق الرسائل والمجتمعات" : "💬 Inbox & Communities"}
            </h2>
            <button 
              onClick={() => setShowGroupModal(true)}
              className="text-[10px] font-black bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-md"
            >
              {isAr ? "قروب جديد 👥" : "New Group 👥"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
            {/* أ. قسم طلبات المراسلة الواردة المعلقة */}
            {requests.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-wider px-1">
                  {isAr ? "✉️ طلبات مراسلة معلقة" : "✉️ Pending Requests"}
                </h3>
                {requests.map((req) => (
                  <div key={req.id} className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl space-y-2">
                    <p className="text-xs font-black truncate text-zinc-200">👤 {req.senderName}</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAcceptRequest(req.id, req.senderId)}
                        className="flex-1 bg-amber-500 text-black text-[10px] font-black py-1 rounded-md hover:bg-amber-400 transition-colors cursor-pointer"
                      >
                        {isAr ? "قبول ومحادثة ✅" : "Accept ✅"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ب. قائمة الغرف النشطة */}
            <div className="space-y-1.5">
              <h3 className="text-[11px] font-black text-zinc-600 uppercase tracking-wider px-1">
                {isAr ? "📌 الدردشات النشطة" : "📌 Active Chats"}
              </h3>
              {rooms.length === 0 ? (
                <p className="text-zinc-700 text-xs text-center py-6 font-medium">
                  {isAr ? "🫙 لا توجد غرف محادثة نشطة حالياً." : "🫙 No active chat rooms found."}
                </p>
              ) : (
                rooms.map((room) => {
                  const isActive = room.id === activeRoomId;
                  return (
                    <button
                      key={room.id}
                      onClick={() => setActiveRoomId(room.id)}
                      className={`w-full text-start p-3 rounded-xl border flex flex-col gap-1 transition-all cursor-pointer ${
                        isActive 
                          ? "bg-purple-600/10 border-purple-500/40 text-white shadow-inner" 
                          : "bg-zinc-900/20 border-zinc-900 hover:bg-zinc-900/60 hover:border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-xs font-black truncate ${isActive ? "text-purple-400" : "text-white"}`}>
                          {room.type === "group" 
                            ? `👥 ${room.groupName}` 
                            : `👤 ${resolvedNames[room.id] || (isAr ? "جاري جلب الاسم..." : "Fetching name...")}`}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-medium truncate w-full">
                        {room.lastMessage?.text || "..."}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 💬 الجانب الأيسر: شاشة عرض المحادثة الحية المستمعة بالثانية 💬 */}
        <div className="flex-1 flex flex-col h-1/2 md:h-full bg-zinc-950/20 relative">
          {activeRoomId && activeRoom ? (
            <>
              <div className="p-4 border-b border-zinc-900 bg-zinc-950 flex items-center gap-3 shadow-md z-10">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                <h2 className="text-xs font-black text-white">
                  {activeRoom.type === "group" 
                    ? activeRoom.groupName 
                    : `دردشة مع: ${resolvedNames[activeRoom.id] || "..."}`}
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/40 scrollbar-thin">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.uid;
                    
                    // 🌟 👈 فحص الرسالة: هل هي رابط لصورة أو GIF؟
                    const isImageLink = msg.text.match(/\.(jpeg|jpg|gif|png)(\?.*)?$/i) || msg.text.includes("giphy.com") || msg.text.includes("tenor.com");

                    return (
                      <motion.div
                        key={msg.id || idx}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`flex flex-col max-w-[75%] gap-0.5 ${isMe ? (isAr ? "mr-auto items-start" : "ml-auto items-end") : (isAr ? "ml-auto items-end" : "mr-auto items-start")}`}
                      >
                        <span className="text-[9px] font-black text-zinc-600 px-1">{msg.senderName}</span>
                        <div 
                          className={`px-3.5 py-2 rounded-2xl text-xs font-medium leading-relaxed shadow-md ${
                            isMe 
                              ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-none" 
                              : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none"
                          }`}
                        >
                          {/* 🌟 👈 ريندر الرسالة: صورة مرئية أم نص عادي */}
                          {isImageLink ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={msg.text} 
                              alt="Shared media" 
                              className="max-w-full sm:max-w-[220px] max-h-[220px] rounded-lg object-contain my-1"
                              onError={(e) => {
                                // في حال فشل تحميل الصورة نعرض الرابط كنص احتياطياً
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerText = msg.text;
                              }}
                            />
                          ) : (
                            msg.text
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* ⌨️ 👈 شريط الإدخال المطور مع زر الإيموجي */}
              <form onSubmit={handleSendMessage} className="p-3 bg-zinc-950 border-t border-zinc-900 flex gap-2 items-center relative">
                
                {/* 🌈 حاوية زر الإيموجي والمكتبة المنسدلة */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-xl hover:bg-zinc-900 rounded-full transition-colors cursor-pointer flex items-center justify-center grayscale hover:grayscale-0"
                    title={isAr ? "إضافة إيموجي" : "Add Emoji"}
                  >
                    😊
                  </button>

                  {/* النافذة العائمة لمكتبة الإيموجي */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 mb-2 right-0 md:left-0 z-50 shadow-2xl drop-shadow-2xl">
                      <EmojiPicker 
                        theme={"dark" as any} 
                        onEmojiClick={(emojiData) => {
                          setNewMessageText(prev => prev + emojiData.emoji);
                        }} 
                      />
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onClick={() => setShowEmojiPicker(false)} // إغلاق الإيموجي عند الكتابة
                  placeholder={isAr ? "اكتب رسالة أو ضع رابط GIF..." : "Type a message or paste a GIF link..."}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-purple-500 text-white placeholder-zinc-600"
                />
                
                <button
                  type="submit"
                  disabled={!newMessageText.trim() || sending}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-900 disabled:border-zinc-800 disabled:text-zinc-700 text-white text-xs font-black px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md border border-transparent"
                >
                  {sending ? (isAr ? "إرسال..." : "Sending...") : (isAr ? "إرسال 🚀" : "Send 🚀")}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
              <span className="text-3xl">✉️</span>
              <h3 className="text-xs font-black text-zinc-500 tracking-wide uppercase">
                {isAr ? "لم يتم تحديد أي محادثة بعد" : "No Chat Selected"}
              </h3>
              <p className="text-[10px] text-zinc-600 font-medium max-w-xs">
                {isAr 
                  ? "اختر أحد الأبطال أو القروبات النشطة من القائمة الجانبية لبدء المحادثة، أو تفقد بروفايلات الجيمرز لإرسال طلب مراسلة جديد!" 
                  : "Select an active gamer or group from the sidebar to open the channel, or check out user profiles to start communication!"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* مودال القروبات الجماعية */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-950 border border-zinc-900 w-full max-w-md p-5 rounded-3xl space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <h3 className="text-xs font-black text-purple-400 uppercase tracking-wider">
                {isAr ? "👥 إنشاء مجتمع جيمري جماعي" : "👥 Create Gamer Community"}
              </h3>
              <button 
                onClick={() => setShowGroupModal(false)}
                className="text-zinc-500 hover:text-white text-xs font-bold cursor-pointer"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3 text-start">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 tracking-wide uppercase px-1">
                  {isAr ? "اسم المجتمع/القروب:" : "Group Name:"}
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., رابطة عشاق الصيد الأسطوري"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-purple-500 text-white placeholder-zinc-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 tracking-wide uppercase px-1">
                  {isAr ? "معرّف اللاعب المستهدف (UID):" : "Target Member UID:"}
                </label>
                <input
                  type="text"
                  required
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(e.target.value)}
                  placeholder="ضع الـ UID الخاص باللاعب الآخر هنا"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-purple-500 text-white placeholder-zinc-700"
                />
              </div>

              <button
                type="submit"
                disabled={creatingGroup || !newGroupName.trim() || !targetMemberId.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-900 disabled:border-zinc-800 disabled:text-zinc-700 text-white text-xs font-black py-2.5 rounded-xl transition-all cursor-pointer shadow-md mt-2 border border-transparent"
              >
                {creatingGroup ? (isAr ? "جاري التأسيس..." : "Establishing...") : (isAr ? "تأسيس المجتمع فوراً 🚀" : "Establish Community 🚀")}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </main>
  );
}