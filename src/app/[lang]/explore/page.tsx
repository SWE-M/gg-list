"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { searchGamesAdvanced } from "@/lib/searchActions"; 
import PlayerSearch from "@/components/PlayerSearch"; 
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext"; // 👈 استيراد سياق الحساب للتأكد من حالة الحظر

interface ExplorePageProps {
  params: Promise<{ lang: string }>;
}

export default function ExplorePage({ params }: ExplorePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth(); // 👈 جلب بيانات اللاعب الحالي

  const [isAr, setIsAr] = useState(true);
  const [lang, setLang] = useState("ar");
  
  const currentType = searchParams.get("type") || "games"; 

  // 🎮 حالات البحث العام والشبكة الرئيسية
  const [games, setGames] = useState<any[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [searching, setSearching] = useState(false);

  // 🔍 حالات البحث اللحظي الفوري العائم (Instant Dropdown Search)
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // 🎛️ الفلاتر الذكية كـ State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedOrdering, setSelectedOrdering] = useState("-metacritic"); 

  // 1️⃣ استخراج معطيات اللغة
  useEffect(() => {
    params.then((resolvedParams) => {
      setIsAr(resolvedParams.lang === "ar");
      setLang(resolvedParams.lang || "ar");
    });
  }, [params]);

  // 2️⃣ الاستماع لإغلاق الصندوق العائم عند النقر خارجه
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3️⃣ البحث اللحظي الفوري (Instant Real-time Auto-search) مع حماية الـ Debounce
  useEffect(() => {
    // حماية إضافية: إذا كان حساب اللاعب محظوراً، نوقف جلب الاقتراحات اللحظية فوراً
    if (user && (user as any).isBanned) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const results = await searchGamesAdvanced({ search: searchQuery });
        setSuggestions(results.slice(0, 5)); // عرض أول 5 نتائج مطابقة تماماً كالصورة
        setShowDropdown(true);
      } catch (err) {
        console.error("Instant search failed:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400); // إرجاء بمقدار 400 جزء من الثانية لراحة السيرفر وسلاسة الواجهة

    return () => clearTimeout(delayDebounceFn);
  // 👈 درع العاصفة 1: المراقبة للـ ID فقط
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, user?.uid, (user as any)?.isBanned]);

  // 4️⃣ استدعاء دالة جلب الشبكة الرئيسية بناءً على الفلاتر المختارة
  const executeSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentType !== "games") return; 

    // حماية إضافية: إذا كان اللاعب محظوراً، نمنعه من تفعيل محرك البحث في الشبكة الرئيسية
    if (user && (user as any).isBanned) {
      setGames([]);
      setLoadingGames(false);
      return;
    }

    setSearching(true);
    setShowDropdown(false); // إغلاق المقترحات العائمة عند التأكيد
    try {
      const results = await searchGamesAdvanced({
        search: searchQuery,
        platform: selectedPlatform,
        genre: selectedGenre,
        year: selectedYear,
        ordering: selectedOrdering
      });
      setGames(results || []);
    } catch (err) {
      console.error("Error loading explore games:", err);
    } finally {
      setSearching(false);
      setLoadingGames(false);
    }
  };

  // إعادة جلب المربعات الكبيرة فور تغيير الفلاتر الجانبية تلقائياً
  useEffect(() => {
    if (currentType === "games") {
      executeSearch();
    }
  // 👈 درع العاصفة 2: المراقبة للـ ID فقط لمنع تكرار البحث بلا توقف
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatform, selectedGenre, selectedYear, selectedOrdering, currentType, user?.uid, (user as any)?.isBanned]);

  // 🗂️ قوائم الفلاتر المدعومة
  const platforms = [
    { id: "", name: isAr ? "كل المنصات" : "All Platforms" },
    { id: "4", name: "PC" },
    { id: "187", name: "PlayStation 5" },
    { id: "18", name: "PlayStation 4" },
    { id: "16", name: "PlayStation 3" },
    { id: "186", name: "Xbox Series X" },
    { id: "1", name: "Xbox One" },
    { id: "14", name: "Xbox 360" },
    { id: "7", name: "Nintendo Switch" }
  ];

  // 🌟 قائمة التصنيفات العالمية الشاملة والكاملة مية بالمية
  const genres = [
    { id: "", name: isAr ? "كل التصنيفات" : "All Genres" },
    { id: "action", name: isAr ? "أكشن (Action)" : "Action" },
    { id: "horror", name: isAr ? "رعب (Horror) 🧟" : "Horror 🧟" }, 
    { id: "indie", name: isAr ? "مستقلة (Indie)" : "Indie" },
    { id: "adventure", name: isAr ? "مغامرات (Adventure)" : "Adventure" },
    { id: "role-playing-games-rpg", name: isAr ? "تقمص أدوار (RPG)" : "RPG" },
    { id: "strategy", name: isAr ? "استراتيجية (Strategy)" : "Strategy" },
    { id: "shooter", name: isAr ? "تصويب (Shooter)" : "Shooter" },
    { id: "casual", name: isAr ? "كاجوال (Casual)" : "Casual" },
    { id: "simulation", name: isAr ? "محاكاة (Simulation)" : "Simulation" },
    { id: "puzzle", name: isAr ? "ألغاز (Puzzle)" : "Puzzle" },
    { id: "arcade", name: isAr ? "آركيد (Arcade)" : "Arcade" },
    { id: "platformer", name: isAr ? "منصات (Platformer)" : "Platformer" },
    { id: "massively-multiplayer", name: isAr ? "لعب جماعي (MMO)" : "Massively Multiplayer" },
    { id: "racing", name: isAr ? "سباقات (Racing)" : "Racing" },
    { id: "sports", name: isAr ? "رياضة (Sports)" : "Sports" },
    { id: "fighting", name: isAr ? "قتال (Fighting)" : "Fighting" },
    { id: "family", name: isAr ? "عائلية (Family)" : "Family" },
    { id: "board-games", name: isAr ? "ألعاب لوحية" : "Board Games" },
    { id: "educational", name: isAr ? "تعليمية" : "Educational" },
    { id: "card", name: isAr ? "بطاقات" : "Card" },
  ];

  // 📆 توليد السنوات تلقائياً من 2026 إلى 1980
  const generateYears = () => {
    const startYear = 2026;
    const endYear = 1980;
    const yearsList = [{ id: "", name: isAr ? "كل السنوات" : "All Years" }];
    for (let i = startYear; i >= endYear; i--) {
      yearsList.push({ id: i.toString(), name: i.toString() });
    }
    return yearsList;
  };
  const years = generateYears();

  const orderings = [
    { id: "-metacritic", name: isAr ? "الأعلى تقييماً 🏆" : "Top Rated 🏆" },
    { id: "-released", name: isAr ? "الأحدث إصداراً 🔥" : "Newest Releases 🔥" },
    { id: "-added", name: isAr ? "الأكثر شعبية 👥" : "Most Popular 👥" }
  ];

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-8 py-12" dir={isAr ? "rtl" : "ltr"}>
      
      {/* 🔝 رأس الصفحة بنظام الـ Tabs التفاعلي */}
      <header className="mb-8 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-1.5">
            {isAr ? "مركز الاستكشاف والبحث 🔍" : "Discovery & Search Center 🔍"}
          </h1>
          <p className="text-zinc-500 text-xs font-bold">
            {isAr ? "استكشف الألعاب العالمية أو ابحث عن رفقاء اللعب والأصدقاء الجدد بالمنصة." : "Explore international games or discover new gamer friends on the platform."}
          </p>
        </div>

        <div className="flex bg-zinc-950 border border-zinc-900 p-1 rounded-2xl shrink-0 self-start md:self-auto shadow-inner">
          <Link
            href={`/${lang}/explore?type=games`}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              currentType === "games" ? "bg-purple-600 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>🎮</span> {isAr ? "استكشف الألعاب" : "Explore Games"}
          </Link>
          <Link
            href={`/${lang}/explore?type=players`}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              currentType === "players" ? "bg-purple-600 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>👤</span> {isAr ? "ابحث عن اللاعبين" : "Find Players"}
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        {currentType === "players" ? (
          <div className="w-full">
            <PlayerSearch lang={lang} isAr={isAr} />
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* 🎛️ لوحة الفلاتر والبحث المتقدم اللحظي */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 shadow-2xl space-y-4">
              <form onSubmit={executeSearch} className="flex flex-col md:flex-row gap-4 relative">
                
                {/* صندوق حقل البحث ومقترحاته العائمة */}
                <div className="flex-1 relative" ref={dropdownRef}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.trim().length >= 2 && !((user as any)?.isBanned) && setShowDropdown(true)}
                    placeholder={isAr ? "اكتب اسم اللعبة للبحث الفوري... (مثال: Call of)" : "Type game name for instant search... (e.g., Call of)"}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white placeholder-zinc-600 transition-colors"
                    disabled={user && (user as any).isBanned} // إغلاق الحقل لو اللاعب محظور صامتاً
                  />

                  {/* ⚡ الصندوق العائم المنسدل اللحظي */}
                  <AnimatePresence>
                    {showDropdown && (suggestions.length > 0 || loadingSuggestions) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-zinc-900"
                      >
                        {loadingSuggestions ? (
                          <div className="p-4 text-center text-xs text-zinc-500 animate-pulse">{isAr ? "جاري جلب المقترحات..." : "Fetching suggestions..."}</div>
                        ) : (
                          suggestions.map((game) => (
                            <Link 
                              key={game.id} 
                              href={`/${lang}/game/${game.id}`}
                              className="flex items-center justify-between p-3.5 hover:bg-zinc-900/80 transition-colors cursor-pointer text-start group/row"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-black text-white group-hover/row:text-purple-400 transition-colors">{game.name}</span>
                                <span className="text-[10px] text-zinc-500 font-bold">{game.released?.split("-")[0] || "N/A"}</span>
                              </div>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={game.background_image || "/images/placeholder.jpg"} 
                                alt={game.name} 
                                className="w-11 h-11 object-cover rounded-xl border border-zinc-800 shrink-0 ml-2"
                              />
                            </Link>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button 
                  type="submit"
                  disabled={searching || (user && (user as any).isBanned)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-purple-500/20 whitespace-nowrap cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border disabled:border-zinc-800"
                >
                  {searching ? (isAr ? "جاري التحديث..." : "Updating...") : (isAr ? "عرض الكل في الشبكة 🚀" : "View All in Grid 🚀")}
                </button>
              </form>

              {/* القوائم المنسدلة (Dropdowns) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <select value={selectedPlatform} disabled={user && (user as any).isBanned} onChange={(e) => setSelectedPlatform(e.target.value)} className="bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer outline-none shadow-md disabled:opacity-50">
                  {platforms.map(p => <option key={p.id} value={p.id} className="bg-black text-white font-medium">{p.name}</option>)}
                </select>

                <select value={selectedGenre} disabled={user && (user as any).isBanned} onChange={(e) => setSelectedGenre(e.target.value)} className="bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer outline-none shadow-md disabled:opacity-50">
                  {genres.map(g => <option key={g.id} value={g.id} className="bg-black text-white font-medium">{g.name}</option>)}
                </select>

                <select value={selectedYear} disabled={user && (user as any).isBanned} onChange={(e) => setSelectedYear(e.target.value)} className="bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer outline-none shadow-md disabled:opacity-50">
                  {years.map(y => <option key={y.id} value={y.id} className="bg-black text-white font-medium">{y.name}</option>)}
                </select>

                <select value={selectedOrdering} disabled={user && (user as any).isBanned} onChange={(e) => setSelectedOrdering(e.target.value)} className="bg-black border border-purple-500/30 rounded-xl px-3 py-2.5 text-xs font-bold text-purple-400 focus:outline-none focus:border-purple-500 cursor-pointer outline-none shadow-md disabled:opacity-50">
                  {orderings.map(o => <option key={o.id} value={o.id} className="bg-black text-purple-400 font-bold">{o.name}</option>)}
                </select>
              </div>
            </div>

            {/* 🎮 شبكة عرض النتائج السريعة (Grid) */}
            <div>
              {loadingGames || searching ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="aspect-[3/4] bg-zinc-900/40 rounded-2xl animate-pulse border border-zinc-800/50" />
                  ))}
                </div>
              ) : games.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
                  <span className="text-4xl block mb-2">🕵️‍♂️</span>
                  <p className="text-zinc-400 font-bold">
                    {user && (user as any).isBanned 
                      ? (isAr ? "تم تقييد حسابك مؤقتاً؛ لا يمكن عرض محتوى الاستكشاف حالياً." : "Your account is temporarily restricted; explore content is unavailable.")
                      : (isAr ? "لم نجد أي ألعاب تطابق بحثك..." : "No games found matching your search...")}
                  </p>
                </div>
              ) : (
                <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <AnimatePresence>
                    {games.map((game: any, idx: number) => (
                      <motion.div
                        key={game.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                      >
                        <Link href={`/${lang}/game/${game.id}`} className="group relative block aspect-[3/4] rounded-2xl overflow-hidden border border-zinc-800 hover:border-purple-500 transition-all shadow-md bg-zinc-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={game.background_image || "/images/placeholder.jpg"} 
                            alt={game.name} 
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          />
                          
                          {game.metacritic && (
                            <div className="absolute top-2 right-2 bg-emerald-500 text-black text-[10px] font-black px-2 py-1 rounded-lg border border-black shadow-lg">
                              {game.metacritic}
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-100 flex flex-col justify-end p-3">
                            <h3 className="text-xs font-black text-white truncate w-full group-hover:text-purple-400 transition-colors">
                              {game.name}
                            </h3>
                            <p className="text-[9px] text-zinc-400 font-bold mt-1 truncate">
                              {game.released || "N/A"}
                            </p>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}