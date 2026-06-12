"use client";

import { useState, useEffect, useRef } from "react"; 
import { useDebounce } from "use-debounce";
import { getSearchResults } from "@/actions/searchAction";
import { useParams } from "next/navigation";
import Link from "next/link";
import UserAchievements from "@/components/UserAchievements";

// تعريف صفوف التصنيف بألوانها الجيمرية الشهيرة
const INITIAL_TIERS = [
  { id: "S", name: "S", color: "bg-red-500 text-zinc-950" },
  { id: "A", name: "A", color: "bg-orange-500 text-zinc-950" },
  { id: "B", name: "B", color: "bg-yellow-500 text-zinc-950" },
  { id: "C", name: "C", color: "bg-green-500 text-zinc-950" },
  { id: "D", name: "D", color: "bg-blue-500 text-zinc-950" },
];

interface GameItem {
  id: number;
  name: string;
  background_image: string;
  tier?: string;
  released?: string;   // 👈 إضافة لدعم ميزة معلومات السيرفر السريعة
  rating?: number;     // 👈 إضافة لدعم التقييم الرقمي الفوري
  metacritic?: number; // 👈 إضافة لدعم تقييم ميتاكريتيك العالمي
}

export default function TierListPage() {
  const params = useParams();
  const lang = params.lang || "ar";
  const isAr = lang === "ar";

  // إدارة حالات الألعاب والبحث
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch] = useDebounce(searchText, 300);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
  const searchContainerRef = useRef<HTMLDivElement>(null); 

  // قائمة الألعاب التي أضافها المستخدم للتصنيف
  const [myGames, setMyGames] = useState<GameItem[]>([]);
  const [isMounted, setIsMounted] = useState(false); 

  // ⚡ حالة التحكم في نافذة المعلومات العائمة الجديدة
  const [modalGame, setModalGame] = useState<GameItem | null>(null);

  // استعادة الألعاب المصنفة مسبقاً من ذاكرة المتصفح
  useEffect(() => {
    setIsMounted(true);
    const savedTierList = localStorage.getItem("gglist_user_tierlist");
    if (savedTierList) {
      try {
        setMyGames(JSON.parse(savedTierList));
      } catch (error) {
        console.error("Error parsing saved tier list:", error);
      }
    }
  }, []);

  // حفظ أي تغييرات جديدة للألعاب تلقائياً في ذاكرة المتصفح
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("gglist_user_tierlist", JSON.stringify(myGames));
    }
  }, [myGames, isMounted]);

  // النقرات الخارجية لإغلاق قائمة نتائج البحث
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // تنفيذ البحث اللحظي عند الكتابة
  useEffect(() => {
    async function fetchSearch() {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        setIsDropdownOpen(false);
        return;
      }
      setIsLoading(true);
      setIsDropdownOpen(true);
      const data = await getSearchResults(debouncedSearch);
      setSearchResults(data);
      setIsLoading(false);
    }
    fetchSearch();
  }, [debouncedSearch]);

  // إضافة لعبة إلى قائمة "الألعاب غير المصنفة" بالأسفل مع حفظ بياناتها الكاملة للـ Modal
  const addGameToPool = (game: any) => {
    if (myGames.some((g) => g.id === game.id)) return; 
    setMyGames([
      ...myGames, 
      { 
        id: game.id, 
        name: game.name, 
        background_image: game.background_image,
        released: game.released,         // 👈 حفظ تاريخ الإصدار حياً
        rating: game.rating,             // 👈 حفظ التقييم من الـ API
        metacritic: game.metacritic,     // 👈 حفظ تقييم النقاد العالمي
      }
    ]);
    setSearchText("");
    setSearchResults([]);
    setIsDropdownOpen(false);
  };

  // نقل اللعبة إلى تصنيف محدد أو إعادتها للصندوق
  const moveGame = (gameId: number, tierId: string | undefined) => {
    setMyGames(
      myGames.map((g) => (g.id === gameId ? { ...g, tier: tierId } : g))
    );
  };

  // حذف اللعبة تماماً من القائمة
  const removeGame = (gameId: number) => {
    setMyGames(myGames.filter((g) => g.id !== gameId));
  };

  // تصفير وتنظيف اللوحة بالكامل
  const clearEntireBoard = () => {
    if (window.confirm(isAr ? "هل أنت متأكد من رغبتك في مسح اللوحة بالكامل؟" : "Are you sure you want to clear the entire board?")) {
      setMyGames([]);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 select-none" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* الهيدر وزر العودة */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Link href={`/${lang}`} className="text-sm font-bold text-purple-400 hover:underline block mb-2">
              {isAr ? "← العودة للرئيسية" : "← Back to Home"}
            </Link>
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              {isAr ? "لوحة تصنيف الألعاب الخاصة بك" : "Your Games Tier List"}
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              {isAr ? "ابحث عن ألعابك وصنفها من الأسطورية S إلى العادية D" : "Search and rank your games from legendary S to D"}
            </p>
          </div>

          {myGames.length > 0 && (
            <button
              onClick={clearEntireBoard}
              className="bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-900/50 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shrink-0"
            >
              {isAr ? "🧹 مسح اللوحة" : "🧹 Clear Board"}
            </button>
          )}
        </div>

        {/* 🟥 لوحة الـ Tier List الأساسية 🟥 */}
        <div className="border border-zinc-900 rounded-3xl overflow-hidden bg-zinc-950/50 backdrop-blur-md shadow-2xl flex flex-col">
          {INITIAL_TIERS.map((tier) => (
            <div key={tier.id} className="flex border-b border-zinc-900 last:border-0 min-h-[110px]">
              {/* المربع الملون الجانبي */}
              <div className={`w-24 flex items-center justify-center text-2xl font-black tracking-wider ${tier.color} shrink-0 shadow-lg`}>
                {tier.name}
              </div>
              
              {/* منطقة الألعاب داخل هذا الـ Tier */}
              <div className="flex flex-wrap gap-3 p-3 items-center overflow-x-auto w-full min-h-[100px]">
                {myGames.filter((g) => g.tier === tier.id).map((game) => (
                  <div key={game.id} className="group relative w-16 h-20 bg-zinc-900 rounded-xl overflow-hidden shadow-md transition-transform hover:scale-105 border border-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={game.background_image || "/placeholder.jpg"} alt={game.name} className="w-full h-full object-cover" />
                    
                    {/* خيارات التحكم السريع الفخمة المحدثة */}
                    <div className="absolute inset-0 bg-zinc-950/95 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 p-1 backdrop-blur-xs">
                      <select 
                        value={game.tier || ""} 
                        onChange={(e) => moveGame(game.id, e.target.value || undefined)}
                        className="bg-zinc-900 text-white text-[9px] rounded p-0.5 w-full border border-zinc-800 text-center focus:outline-none cursor-pointer font-bold"
                      >
                        <option value="">Pool</option>
                        {INITIAL_TIERS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      
                      {/* ⚡ ميزة زر فتح معلومات اللعبة العائمة حياً */}
                      <button 
                        onClick={() => setModalGame(game)}
                        className="text-[9px] bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/20 font-bold rounded px-1 py-0.5 w-full text-center transition-colors cursor-pointer"
                      >
                        {isAr ? "معاينة ℹ️" : "View ℹ️"}
                      </button>

                      <button onClick={() => removeGame(game.id)} className="text-[9px] bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 font-bold rounded px-1 py-0.5 w-full text-center transition-colors cursor-pointer">
                        {isAr ? "حذف" : "Del"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 🔍 صندوق البحث لإضافة ألعاب جديدة للوحة 🔍 */}
        <div ref={searchContainerRef} className="relative w-full max-w-xl mx-auto pt-6">
          <label className="block text-zinc-400 text-sm font-bold mb-2 text-center md:text-start">
            {isAr ? "➕ ابحث لإضافة لعبة إلى اللوحة:" : "➕ Search to add a game:"}
          </label>
          <input
            type="text"
            value={searchText}
            onFocus={() => searchText.trim() && setIsDropdownOpen(true)}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={isAr ? "اكتب اسم لعبة هنا..." : "Type game name here..."}
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-6 py-4 focus:outline-none focus:border-purple-500 transition-colors shadow-lg placeholder-zinc-600"
          />

          {/* القائمة المنسدلة لنتائج البحث */}
          {isDropdownOpen && (searchResults.length > 0 || isLoading) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col z-50 backdrop-blur-md">
              {isLoading ? (
                <div className="p-4 text-center text-zinc-400 text-sm animate-pulse">{isAr ? "جاري البحث..." : "Searching..."}</div>
              ) : (
                searchResults.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => addGameToPool(game)}
                    className="flex items-center gap-4 p-3 hover:bg-zinc-800/60 transition-colors border-b border-zinc-800/50 last:border-0 cursor-pointer text-start group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={game.background_image || "/placeholder.jpg"} alt={game.name} className="w-10 h-10 object-cover rounded-lg border border-zinc-800" />
                    <span className="text-white font-bold text-sm group-hover:text-purple-400 transition-colors">{game.name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 📦 صندوق الألعاب المضافة وغير المصنفة بعد (The Pool) 📦 */}
        <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl p-6 backdrop-blur-md">
          <h2 className="text-lg font-bold text-zinc-300 border-b border-zinc-900 pb-2 mb-4">
            {isAr ? "صندوق الألعاب غير المصنفة" : "Unranked Games Pool"}
          </h2>
          
          {myGames.filter(g => !g.tier).length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">
              {isAr ? "الصندوق فارغ. ابحث عن لعبة بالأعلى لإضافتها هنا والبدء بتصنيفها!" : "The pool is empty. Search for a game above to add it here!"}
            </p>
          ) : (
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              {myGames.filter((g) => !g.tier).map((game) => (
                <div key={game.id} className="group relative w-20 h-28 bg-zinc-900 rounded-xl overflow-hidden shadow-lg border border-zinc-800 flex flex-col justify-between">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={game.background_image || "/placeholder.jpg"} alt={game.name} className="w-full h-full object-cover" />
                  
                  {/* ⚡ زر معلومات سريع عائم يظهر أعلى الكرت في الصندوق عند التمرير */}
                  <button
                    onClick={() => setModalGame(game)}
                    className="absolute top-1.5 right-1.5 bg-black/80 hover:bg-purple-600 text-white w-6 h-6 flex items-center justify-center rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-zinc-800 shadow-md"
                    title={isAr ? "معلومات سريعة" : "Quick Info"}
                  >
                    ℹ️
                  </button>

                  {/* أزرار النقل السريع الفورية بالأسفل */}
                  <div className="absolute inset-x-0 bottom-0 bg-zinc-950/90 p-1 flex justify-between gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {INITIAL_TIERS.map((tier) => (
                      <button
                        key={tier.id}
                        onClick={() => moveGame(game.id, tier.id)}
                        className="text-[10px] font-black w-full py-0.5 rounded text-center bg-zinc-900 hover:bg-purple-600 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      >
                        {tier.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 🟥 🟥 🟥 النافذة العائمة الذكية للمعلومات السريعة (Quick Info Floating Modal) 🟥 🟥 🟥 */}
      {modalGame && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all">
          {/* طبقة الإغلاق الشفافة عند النقر خارج الصندوق */}
          <div className="fixed inset-0 cursor-pointer" onClick={() => setModalGame(null)} />
          
          {/* الصندوق العائم المصمم بنظام المربعات المستديرة الحديث */}
          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl p-5 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-250">
            
            {/* بوستر اللعبة وزر الإغلاق الداخلي */}
            <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-zinc-900/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={modalGame.background_image || "/placeholder.jpg"} alt={modalGame.name} className="w-full h-full object-cover" />
              <button 
                onClick={() => setModalGame(null)}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-black/70 border border-zinc-800 text-zinc-400 hover:text-white transition-colors text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* تفاصيل وبيانات اللعبة الفورية */}
            <div className="space-y-3 text-start">
              <h3 className="text-xl font-black text-white leading-tight truncate">{modalGame.name}</h3>
              
              <div className="grid grid-cols-2 gap-2 text-xs font-bold" dir={isAr ? "rtl" : "ltr"}>
                <div className="bg-zinc-900/60 border border-zinc-900 p-2.5 rounded-xl flex flex-col gap-0.5">
                  <span className="text-zinc-500 font-medium text-[10px]">{isAr ? "📅 تاريخ الإصدار" : "📅 Release Date"}</span>
                  <span className="text-zinc-200">{modalGame.released || "N/A"}</span>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-900 p-2.5 rounded-xl flex flex-col gap-0.5">
                  <span className="text-zinc-500 font-medium text-[10px]">{isAr ? "⭐ التقييم العام" : "⭐ Rating"}</span>
                  <span className="text-purple-400">{modalGame.rating ? `${modalGame.rating.toFixed(2)} / 5` : "N/A"}</span>
                </div>
              </div>

              {modalGame.metacritic && (
                <div className="bg-zinc-900/40 border border-zinc-900 p-2.5 rounded-xl flex items-center justify-between text-xs font-bold" dir={isAr ? "rtl" : "ltr"}>
                  <span className="text-zinc-500 font-medium">{isAr ? "🎯 تقييم Metacritic العالمي:" : "🎯 Global Metacritic:"}</span>
                  <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg">
                    {modalGame.metacritic}
                  </span>
                </div>
              )}
            </div>

            {/* 🚀 ميزة زر الانتقال المباشر لملف اللعبة الكاملة للمنصة */}
            <div className="pt-1">
              <Link
                href={`/${lang}/game/${modalGame.id}`}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-all shadow-lg shadow-purple-500/10 hover:scale-[1.02] cursor-pointer"
              >
                <span>{isAr ? "🎮 الانتقال لملف اللعبة الكامل" : "🎮 Go to Full Game Page"}</span>
              </Link>
            </div>

          </div>
        </div>
      )}
      {/* 🏆 ميزة التلعيب ونظام الشارات الحية 🏆 */}
<div className="pt-8 border-t border-zinc-900 mt-12">
  <UserAchievements />
</div>
    </main>
  );
}