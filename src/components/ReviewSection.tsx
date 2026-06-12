"use client";

import { useState, useEffect } from "react";
import { addGameReview, getGameReviews, getUserStats, Review } from "@/lib/reviews"; 
import { useAuth } from "@/context/AuthContext"; 

interface ReviewSectionProps {
  gameId: string;
  isAr: boolean;
}

export default function ReviewSection({ gameId, isAr }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]); 
  const [loading, setLoading] = useState(false);

  // قائمة الأوسمة السريعة المقترحة بناءً على لغة الواجهة
  const availableTags = isAr 
    ? ["👑 أسطورية", "📉 تضيع وقت", "🎮 جرافيكس مدمر", "🔥 قصة خرافية", "🐌 تكرار ممل", "🕹️ أسلوب لعب ممتع"]
    : ["👑 Masterpiece", "📉 Waste of Time", "🎮 Next-Gen Graphics", "🔥 Epic Story", "🐌 Boring Grind", "🕹️ Fun Gameplay"];

  const { user, loginWithGoogle } = useAuth();

  // جلب المراجعات عند تحميل المكون
  useEffect(() => {
    async function loadReviews() {
      const data = await getGameReviews(gameId);
      setReviews(data);
    }
    loadReviews();
  }, [gameId]);

  // دالة لتحديد أو إلغاء تحديد الأوسمة بمرونة
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // إرسال المراجعة لـ Firestore مع حساب وحقن الشارات حياً جنب الاسم
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return; 

    if (!comment.trim() && selectedTags.length === 0) return;

    setLoading(true);

    // حساب ذكي: جلب شارات اللاعب الحالية من السيرفر لحقنها في التعليق فوراً باسمه
    const stats = await getUserStats(user.uid);
    const currentUserBadges: string[] = [];
    
    if (stats) {
      const pastComments = stats.commentsCount || 0;
      const pastRatings = stats.ratingsCount || 0;
      const secondsSpent = stats.secondsSpent || 0;

      if (pastComments > 0 || comment.trim().length > 0) currentUserBadges.push("📢");
      if (pastRatings > 0 || rating > 0) currentUserBadges.push("🎨");
      if (secondsSpent >= 45 * 60) currentUserBadges.push("💎");
    } else {
      if (comment.trim().length > 0) currentUserBadges.push("📢");
      if (rating > 0) currentUserBadges.push("🎨");
    }

    const result = await addGameReview(gameId, user.uid, user.displayName || "Gamer", rating, comment, selectedTags, currentUserBadges);
    setLoading(false);

    if (result.success) {
      setComment("");
      setRating(5);
      setSelectedTags([]); 
      const updatedReviews = await getGameReviews(gameId);
      setReviews(updatedReviews);
    }
  };

  return (
    <div className="space-y-6 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-purple-400 border-b border-zinc-800 pb-2">
        {isAr ? "مراجعات وتقييمات اللاعبين" : "User Reviews & Ratings"}
      </h2>

      {user ? (
        /* فورم إضافة مراجعة جديدة للاعب المسجل */
        <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-900">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={user.photoURL || "/images/default-avatar.png"} 
              alt={user.displayName || "Gamer"} 
              className="w-5 h-5 rounded-full border border-purple-500/30 object-cover"
            />
            <h3 className="font-bold text-sm text-zinc-300">
              {isAr ? `أضف مراجعتك وتقييمك باسم (${user.displayName?.split(" ")[0]}):` : `Add your review as (${user.displayName?.split(" ")[0]}):`}
            </h3>
          </div>

          {/* 1. نظام النجوم المتحرك تفاعلياً */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">{isAr ? "تقييمك:" : "Rating:"}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="text-2xl transition-transform hover:scale-110 cursor-pointer"
                >
                  {star <= (hoverRating !== null ? hoverRating : rating) ? "⭐" : "🫥"}
                </button>
              ))}
            </div>
          </div>

          {/* 2. قسم الأوسمة السريعة */}
          <div className="space-y-1.5">
            <span className="text-xs text-zinc-500 block">
              {isAr ? "أوسمة سريعة (اضغط للتحديد):" : "Quick Badges (Click to select):"}
            </span>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isSelected 
                        ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-500/20" 
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. خانة التعليق النصي */}
          <div className="w-full pt-1">
            <input
              type="text"
              placeholder={isAr ? "اكتب رأيك باختصار عن اللعبة (اختياري)..." : "Write your review about the game (Optional)..."}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white placeholder-zinc-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md shadow-purple-500/10 cursor-pointer"
          >
            {loading ? (isAr ? "جاري النشر..." : "Publishing...") : (isAr ? "نشر التقييم 🚀" : "Publish Review 🚀")}
          </button>
        </form>
      ) : (
        <div className="p-6 rounded-xl bg-zinc-950/40 border border-zinc-900 text-center space-y-4 backdrop-blur-xs">
          <p className="text-zinc-400 text-sm font-medium">
            {isAr 
              ? "سجل دخولك الآن لتتمكن من تقييم اللعبة ومشاركة رأيك مع مجتمع GGLIST! 🎮" 
              : "Log in now to rate the game and share your review with the GGLIST community! 🎮"}
          </p>
          <button
            onClick={loginWithGoogle}
            className="bg-zinc-900 hover:bg-zinc-850 text-purple-400 hover:text-purple-300 border border-zinc-800 hover:border-zinc-700 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg cursor-pointer"
          >
            {isAr ? "👤 تسجيل الدخول عبر Google لفتح التقييمات" : "👤 Login with Google to Unlock Reviews"}
          </button>
        </div>
      )}

      {/* قائمة عرض المراجعات المنشورة */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {reviews.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">
            {isAr ? "لا توجد مراجعات بعد. كن أول من يكتب مراجعته!" : "No reviews yet. Be the first to write one!"}
          </p>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                
                {/* 👑 هندسة الألقاب الجديدة: عرض اللقب النصي الكامل مع الإيموجي ملازماً للاسم 👑 */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-purple-300">👤 {rev.userName}</span>
                  
                  {rev.userBadges && rev.userBadges.map((badgeIcon, idx) => {
                    let badgeText = "";
                    let badgeStyle = "";

                    // ترجمة الأيقونة للقب الكامل المصاحب بناءً على لغة الموقع
                    if (badgeIcon === "📢") {
                      badgeText = isAr ? "المُحاور الأسطوري 📢" : "Legendary Talker 📢";
                      badgeStyle = "bg-blue-500/10 border-blue-500/20 text-blue-400";
                    } else if (badgeIcon === "🎨") {
                      badgeText = isAr ? "الناقد المحترف 🎨" : "Pro Critic 🎨";
                      badgeStyle = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                    } else if (badgeIcon === "💎") {
                      badgeText = isAr ? "المرابط الصامد 💎" : "Loyal Gamer 💎";
                      badgeStyle = "bg-purple-500/10 border-purple-500/20 text-purple-400";
                    }

                    if (!badgeText) return null;

                    return (
                      <span 
                        key={idx} 
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black border tracking-wide shadow-xs ${badgeStyle}`}
                      >
                        {badgeText}
                      </span>
                    );
                  })}
                </div>

                <span className="text-xs text-zinc-500">{rev.createdAt?.toString()}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-0.5 text-xs">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <span key={i}>⭐</span>
                  ))}
                </div>

                {rev.tags && rev.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {rev.tags.map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="bg-purple-950/40 border border-purple-900/40 text-purple-300 text-[10px] px-2 py-0.5 rounded-md font-bold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {rev.comment && (
                <p className="text-sm text-zinc-300 mt-1 leading-relaxed">{rev.comment}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}