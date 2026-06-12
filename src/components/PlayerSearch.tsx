"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface PlayerSearchProps {
  lang: string;
  isAr: boolean;
}

export default function PlayerSearch({ lang, isAr }: PlayerSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 🏆 👈 حالات لوحة الشرف والمتصدرين بالـ XP
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);

  // 1️⃣ جلب أعلى 6 لاعبين تفاعلاً في المنصة فور تحميل المكون
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const usersRef = collection(db, "users");
        // جلب وترتيب تنازلي حسب الـ XP مع حد أقصى 6 لاعبين
        const q = query(usersRef, orderBy("xp", "desc"), limit(6));
        const querySnapshot = await getDocs(q);
        
        const leaderboard: any[] = [];
        querySnapshot.forEach((doc) => {
          leaderboard.push({ id: doc.id, ...doc.data() });
        });
        setTopPlayers(leaderboard);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoadingTop(false);
      }
    }
    fetchLeaderboard();
  }, []);

  // ⚡ دالة البحث اللحظي بالاسم الحركي (Fuzzy Prefix Matching)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setHasSearched(true);
    try {
      const usersRef = collection(db, "users");
      const text = searchTerm.trim();
      
      const q = query(
        usersRef,
        where("userName", ">=", text),
        where("userName", "<=", text + "\uf8ff")
      );
      
      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });
      
      setPlayers(results);
    } catch (error) {
      console.error("Error searching players:", error);
    } finally {
      setSearching(false);
    }
  };

  // إلغاء البحث والعودة للوحة المتصدرين عند مسح الخانة
  const handleInputChange = (val: string) => {
    setSearchTerm(val);
    if (!val.trim()) {
      setHasSearched(false);
      setPlayers([]);
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* بار البحث الفخم */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={isAr ? "ابحث عن اللاعبين باسمهم الحركي..." : "Search players by username..."}
            className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white placeholder-zinc-600 shadow-inner pl-10"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => handleInputChange("")}
              className="absolute inset-y-0 left-3 flex items-center text-zinc-500 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={searching || !searchTerm.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-900 disabled:border-zinc-800 disabled:text-zinc-600 text-white text-xs font-black px-6 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-purple-500/10 border border-transparent shrink-0"
        >
          {searching ? (isAr ? "جاري البحث..." : "Searching...") : (isAr ? "بحث 🔍" : "Search 🔍")}
        </button>
      </form>

      {/* 🎰 منطقة العرض التفاعلية المزدوجة 🎰 */}
      <div className="pt-2">
        <AnimatePresence mode="wait">
          
          {/* 🔥 الوضع أ: عرض لوحة المتصدرين والأعلى نقاطاً (قبل إجراء أي بحث) 🔥 */}
          {!hasSearched ? (
            <motion.div
              key="leaderboard_section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 px-1">
                <span className="text-base">🔥</span>
                <h3 className="text-xs font-black text-purple-400 tracking-wider uppercase">
                  {isAr ? "عمالقة المنصة والأكثر تفاعلاً" : "Top Active Leaderboard"}
                </h3>
              </div>

              {loadingTop ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : topPlayers.length === 0 ? (
                <p className="text-zinc-600 text-xs text-center py-8 font-medium">
                  {isAr ? "🫙 لا يوجد لاعبين نشطين في النظام حالياً." : "🫙 No active players found in the system yet."}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {topPlayers.map((player, index) => {
                    const xp = player.xp || 0;
                    const level = Math.floor(xp / 100) + 1;
                    
                    // ميداليات شرفية لأول 3 مراكز بالترتيب
                    const medals = ["🥇", "🥈", "🥉"];

                    return (
                      <motion.div
                        key={player.id}
                        whileHover={{ y: -4, scale: 1.01 }}
                        className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex items-center justify-between gap-4 transition-all hover:border-purple-500/30 shadow-md group relative overflow-hidden"
                      >
                        {/* خلفية توهج خفيفة جداً لأصحاب المراكز الأولى */}
                        {index < 3 && (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.02] via-transparent to-transparent" />
                        )}
                        
                        <div className="flex items-center gap-3 z-10 overflow-hidden">
                          {/* ترتيب اللاعب أو ميداليته */}
                          <span className="text-sm font-black shrink-0 w-5 text-center">
                            {index < 3 ? medals[index] : `#${index + 1}`}
                          </span>

                          <div className="w-10 h-10 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-xs font-black text-zinc-400 shrink-0">
                            {player.userName?.charAt(0).toUpperCase()}
                          </div>
                          
                          <div className="overflow-hidden text-start space-y-0.5">
                            <h4 className="font-black text-sm text-white truncate tracking-wide">
                              {player.userName}
                            </h4>
                            <div className="flex items-center gap-1.5">
                              <span className="bg-purple-600/10 text-purple-400 border border-purple-500/10 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                LVL {level}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-bold">
                                {xp} XP
                              </span>
                            </div>
                          </div>
                        </div>

                        <Link
                          href={`/${lang}/profile/${player.id}`}
                          className="bg-zinc-900 hover:bg-purple-600 text-zinc-300 hover:text-white text-[10px] font-black p-2 px-3 rounded-xl border border-zinc-800 hover:border-transparent transition-all z-10 shrink-0"
                        >
                          {isAr ? "الملف الشخصي 👤" : "Profile 👤"}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            
            /* 🔍 الوضع ب: عرض نتائج البحث الفعلي عند فلترة لاعب محدد 🔍 */
            <motion.div
              key="search_results_section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs">🔍</span>
                <h3 className="text-xs font-black text-zinc-500 tracking-wider uppercase">
                  {isAr ? `نتائج البحث عن: ${searchTerm}` : `Search results for: ${searchTerm}`}
                </h3>
              </div>

              {searching ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : players.length === 0 ? (
                <div className="text-center py-16 bg-zinc-950/20 border border-zinc-900/60 rounded-2xl text-zinc-500 text-sm font-medium">
                  {isAr ? "❌ لم نجد أي لاعب بهذا الاسم الحركي حالياً." : "❌ No players found with this username."}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {players.map((player) => {
                    const xp = player.xp || 0;
                    const level = Math.floor(xp / 100) + 1;

                    return (
                      <motion.div
                        key={player.id}
                        whileHover={{ y: -4 }}
                        className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex items-center justify-between gap-4 transition-all hover:border-purple-500/30 shadow-md group relative overflow-hidden"
                      >
                        <div className="flex items-center gap-3 z-10 overflow-hidden">
                          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-black text-purple-400 shrink-0">
                            {player.userName?.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden text-start space-y-0.5">
                            <h4 className="font-black text-sm text-white truncate tracking-wide">
                              {player.userName}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className="bg-purple-600/10 text-purple-400 border border-purple-500/10 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                LVL {level}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-bold">
                                {xp} XP
                              </span>
                            </div>
                          </div>
                        </div>

                        <Link
                          href={`/${lang}/profile/${player.id}`}
                          className="bg-zinc-900 hover:bg-purple-600 text-zinc-300 hover:text-white text-[10px] font-black p-2 px-3.5 rounded-xl border border-zinc-800 hover:border-transparent transition-all z-10 shrink-0"
                        >
                          {isAr ? "الملف الشخصي 👤" : "View Profile 👤"}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}