"use client";

import { useState, useEffect } from "react"; 
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation"; // 👈 أضفنا useRouter للتوجيه الذكي
import { useAuth } from "@/context/AuthContext"; 
import { db } from "@/lib/firebase"; 
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { markNotificationAsRead, markAllNotificationsAsRead, AppNotification } from "@/lib/notifications"; // 👈 استيراد محرك الإشعارات

export default function Navbar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const lang = params.lang || "ar";
  const isAr = lang === "ar";
  
  // حالات القوائم المنسدلة
  const [dropdownOpen, setDropdownOpen] = useState(false); 
  const [notificationsOpen, setNotificationsOpen] = useState(false); // 👈 حالة فتح صندوق الإشعارات
  
  // 🔔 حالات الإشعارات والرسائل الحية
  const [unreadCount, setUnreadCount] = useState(0); // للرسائل
  const [notifications, setNotifications] = useState<AppNotification[]>([]); // قائمة الإشعارات
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0); // عداد الإشعارات الحمراء

  const { user, loading, loginWithGoogle, logout } = useAuth();

  // 📡 الاستماع لطلبات المراسلة (كودك الأصلي)
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const requestsRef = collection(db, "chatRequests");
    const q = query(requestsRef, where("receiverId", "==", user.uid), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => setUnreadCount(snapshot.size), (e) => console.error(e));
    return () => unsubscribe();
  }, [user]);

  // 🔔 ميزة الاستماع السحابي لمركز الإشعارات العام (جديد!)
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadNotifsCount(0);
      return;
    }
    const notifRef = collection(db, "notifications");
    // جلب أحدث 20 إشعار يخص هذا اللاعب
    const q = query(notifRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(20));

    const unsubscribeNotifs = onSnapshot(q, (snapshot) => {
      const notifsData: AppNotification[] = [];
      let unread = 0;
      snapshot.forEach((doc) => {
        const data = doc.data() as AppNotification;
        notifsData.push({ id: doc.id, ...data });
        if (!data.isRead) unread++;
      });
      setNotifications(notifsData);
      setUnreadNotifsCount(unread);
    }, (error) => {
      console.error("Error listening to notifications:", error);
    });

    return () => unsubscribeNotifs();
  }, [user]);

  // 🕵️‍♂️ رادار التتبع المحمي والمحدث (Presence System - Optimized)
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;

    const updatePresence = async (onlineStatus: boolean) => {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          isOnline: onlineStatus,
          currentPath: onlineStatus ? pathname : "---",
          lastActive: serverTimestamp()
        });
      } catch (error) {
        console.error("Presence update throttle protection:", error);
      }
    };

    // تأخير التحديث قليلاً (Debounce) لضمان عدم تكرار الضربات البرمجية مع التنقل السريع
    timeoutId = setTimeout(() => {
      if (document.visibilityState === "visible") {
        updatePresence(true);
      }
    }, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updatePresence(false);
      } else {
        updatePresence(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, user]);

  // 🖱️ دالة التعامل مع الضغط على إشعار معين
  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead && notif.id) {
      await markNotificationAsRead(notif.id); // نحدده كمقروء في الداتا بيس
    }
    setNotificationsOpen(false); // نغلق الصندوق
    if (notif.link) {
      router.push(notif.link); // نوجهه للرابط المرفق بالإشعار إن وُجد
    }
  };

  return (
    <nav className="w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 select-none" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto flex items-center justify-between" dir={isAr ? "rtl" : "ltr"} suppressHydrationWarning>
        
        <Link href={`/${lang}`} className="text-2xl font-black tracking-widest bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
          GGLIST
        </Link>

        <div className="flex items-center gap-4 sm:gap-6 text-sm font-bold" suppressHydrationWarning>
          <Link href={`/${lang}`} className="text-zinc-400 hover:text-white transition-colors">{isAr ? "الرئيسية" : "Home"}</Link>
          
          <Link href={`/${lang}/explore`} className="text-zinc-400 hover:text-white transition-colors">{isAr ? "استكشف" : "Explore"}</Link>
          
          <Link href={`/${lang}/community`} className="text-zinc-400 hover:text-white transition-colors">{isAr ? "المجتمع" : "Community"}</Link>
          
          <Link href={`/${lang}/support`} className="text-zinc-400 hover:text-white transition-colors">{isAr ? "الدعم الفني" : "Support"}</Link>
          {user && (
            <div className="flex items-center gap-3" suppressHydrationWarning>
              {/* ✉️ زر الرسائل الخاص بك */}
              <Link href={`/${lang}/messages`} className="text-zinc-400 hover:text-white transition-colors relative flex items-center gap-1">
                <span>{isAr ? "الرسائل" : "Messages"}</span>
                {unreadCount > 0 && <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse border border-black shadow-lg">{unreadCount}</span>}
              </Link>

              {/* 🔔 أيقونة الجرس الجديدة */}
              <div className="relative" suppressHydrationWarning>
                <button 
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setDropdownOpen(false); // نغلق قائمة البروفايل إذا كانت مفتوحة
                  }} 
                  className="text-zinc-400 hover:text-white transition-colors relative flex items-center cursor-pointer p-1"
                >
                  <span className="text-xl">🔔</span>
                  {unreadNotifsCount > 0 && <span className="absolute top-0 right-0 bg-purple-500 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]" />}
                </button>

                {/* 🗂️ صندوق الإشعارات المنسدل العائم */}
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                    <div className={`absolute top-full mt-4 w-[350px] min-w-[350px] bg-zinc-950 border border-zinc-800 rounded-none shadow-2xl shadow-black z-50 overflow-hidden ${isAr ? "left-0 sm:right-0 sm:left-auto" : "right-0"}`} suppressHydrationWarning>
                      
                      {/* رأس الصندوق */}
                      <div className="p-4 border-b border-zinc-900 bg-zinc-900/40 flex justify-between items-center" suppressHydrationWarning>
                        <span className="text-sm font-black text-white">{isAr ? "الإشعارات 🔔" : "Notifications 🔔"}</span>
                        {unreadNotifsCount > 0 && (
                          <button 
                            onClick={() => markAllNotificationsAsRead(user.uid)}
                            className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer shrink-0"
                          >
                            {isAr ? "تحديد الكل ✓" : "Mark all ✓"}
                          </button>
                        )}
                      </div>

                      {/* قائمة الإشعارات */}
                      <div className="max-h-[400px] overflow-y-auto scrollbar-thin" suppressHydrationWarning>
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-zinc-500 text-xs font-bold space-y-2">
                            <span className="text-4xl block opacity-50">📭</span>
                            <p>{isAr ? "لا توجد إشعارات جديدة حالياً!" : "No new notifications right now!"}</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-4 border-b border-zinc-900/50 hover:bg-zinc-900/80 transition-colors cursor-pointer flex flex-col ${notif.isRead ? "opacity-60" : "bg-purple-900/10"}`}
                              dir={isAr ? "rtl" : "ltr"}
                              suppressHydrationWarning
                            >
                              <div className="flex justify-between items-start gap-3 w-full" suppressHydrationWarning>
                                <span className={`text-xs font-black ${notif.isRead ? "text-zinc-400" : "text-purple-400"} mb-1 whitespace-normal break-words`}>
                                  {notif.title}
                                </span>
                                {!notif.isRead && <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1" />}
                              </div>
                               <p className={`text-xs leading-relaxed mt-1 whitespace-normal break-words ${notif.isRead ? "text-zinc-500" : "text-zinc-300 font-medium"}`}>
                                {notif.message}
                              </p>
                              {notif.createdAt && (
                                <div className="mt-3 text-left w-full" dir="ltr" suppressHydrationWarning>
                                  <span className="text-[10px] text-zinc-600 font-mono bg-zinc-900 px-2 py-1 rounded-md">
                                    {new Date(notif.createdAt?.seconds * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t border-zinc-900 bg-zinc-950 text-center">
                        <span className="text-[9px] text-zinc-600 font-black tracking-widest">GG LIST HUB</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          <Link href={`/${lang}/tier-list`} className="hidden md:block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-all shadow-lg text-xs font-bold">
            {isAr ? "التصنيف 🎮" : "Tier List"}
          </Link>

          {/* ⚡ متحكم الحساب الذكي */}
          {loading ? (
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" suppressHydrationWarning />
          ) : user ? (
            <div className="relative" suppressHydrationWarning>
              <button
                onClick={() => {
                  setDropdownOpen(!dropdownOpen);
                  setNotificationsOpen(false); // إغلاق الإشعارات إذا كانت مفتوحة
                }}
                className="flex items-center gap-2 bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 p-1.5 px-3 rounded-xl transition-all cursor-pointer"
                suppressHydrationWarning
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.photoURL || "/images/default-avatar.png"} alt="" className="w-6 h-6 rounded-full border border-purple-500/30 object-cover" />
                <span className="text-xs font-bold text-zinc-300 max-w-[90px] truncate hidden md:inline">{user.displayName?.split(" ")[0]}</span>
                <span className={`text-[9px] text-zinc-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}>▼</span>
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className={`absolute top-full mt-2 w-40 bg-zinc-950 border border-zinc-900 rounded-xl p-1.5 shadow-2xl z-50 ${isAr ? "left-0" : "right-0"}`} suppressHydrationWarning>
                    <Link href={`/${lang}/profile/${user.uid}`} onClick={() => setDropdownOpen(false)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer mb-1" dir={isAr ? "rtl" : "ltr"}>
                      <span>{isAr ? "الملف الشخصي" : "Profile"}</span><span>👤</span>
                    </Link>

                    {/* 👑 زر لوحة التحكم الإدارية */}
                    {["ADUh6c2FnScmOewpASpAU6w8llE3"].includes(user.uid) && (
                      <Link href={`/${lang}/admin`} onClick={() => setDropdownOpen(false)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-black text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer mb-1" dir={isAr ? "rtl" : "ltr"}>
                        <span>{isAr ? "غرفة القيادة" : "Dashboard"}</span><span>🛡️</span>
                      </Link>
                    )}

                    <button onClick={() => { setDropdownOpen(false); logout(); }} className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer" dir={isAr ? "rtl" : "ltr"}>
                      <span>{isAr ? "تسجيل الخروج" : "Logout"}</span><span>Exit</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button onClick={loginWithGoogle} className="border border-zinc-800 bg-zinc-900/50 text-zinc-200 px-4 py-2 rounded-xl text-xs font-bold" suppressHydrationWarning>
              {isAr ? "دخول 👤" : "Login"}
            </button>
          )}
        </div>
      </div>

      {/* 🚨 نافذة الحظر المؤقت الذكية للاعب المخالف */}
      {user && (user as any).isBanned && (user as any).banUntil && (
        (() => {
          const banUntilTime = (user as any).banUntil.seconds * 1000;
          const currentTime = Date.now();
          const timeLeftMs = banUntilTime - currentTime;
          
          // إذا انتهى وقت الحظر تلقائياً، لا تعرض النافذة وسيعود حسابه للعمل فوراً
          if (timeLeftMs <= 0) return null;

          const remainingHours = Math.ceil(timeLeftMs / (1000 * 60 * 60));

          return (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4 select-none animate-fadeIn" suppressHydrationWarning>
              <div className="bg-zinc-950 border-2 border-red-900/60 p-8 rounded-3xl max-w-md w-full text-center space-y-5 shadow-2xl shadow-red-900/20" suppressHydrationWarning>
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl">
                  🔒
                </div>
                
                <h2 className="text-xl font-black text-red-500 tracking-tight">
                  {isAr ? "تنبيه: تم تقييد حسابك مؤقتاً!" : "Notice: Temporary Account Restriction!"}
                </h2>
                
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-900 text-right space-y-2" dir={isAr ? "rtl" : "ltr"} suppressHydrationWarning>
                  <p className="text-xs text-zinc-400 font-bold">
                    品 {isAr ? "سبب التقييد:" : "Reason:"} <span className="text-white font-black">{(user as any).banReason || "مخالفة القوانين"}</span>
                  </p>
                  <p className="text-xs text-zinc-400 font-bold">
                    ⏳ {isAr ? "المدة المتبقية:" : "Time Remaining:"} <span className="text-amber-400 font-mono font-black">{remainingHours} {isAr ? "ساعة" : "Hours"}</span>
                  </p>
                </div>

                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                  {isAr 
                    ? "تم تحويل حسابك تلقائياً إلى وضع القراءة فقط. يمكنك تصفح الألعاب وقراءة المراجعات، لكن تم تعطيل قدرتك على التقييم، المشاركة في غرف الدردشة والقروبات، أو تعديل الحساب حتى انتهاء المدة المذكورة."
                    : "Your account is in read-only mode. You can browse games and reviews, but interaction, posting, and group chatting are restricted until the ban expires."}
                </p>

                <div className="pt-3 border-t border-zinc-900 text-[9px] font-mono text-zinc-600 tracking-widest">
                  GG LIST SECURITY PROTOCOL
                </div>
              </div>
            </div>
          );
        })()
      )}
    </nav>
  );
}