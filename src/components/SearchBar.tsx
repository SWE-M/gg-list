"use client";

import { useState, useEffect, useRef } from "react"; // 👈 استيراد useRef لإدارة الضغط الخارجي
import { useDebounce } from "use-debounce";
import { getSearchResults } from "@/actions/searchAction";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function SearchBar() {
  const [text, setText] = useState("");
  // تطبيق تقنية الـ Debouncing لتأخير البحث 300 ملي ثانية لحماية كوتا الـ API
  const [debouncedValue] = useDebounce(text, 300);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // 👈 متحكم فتح وإغلاق القائمة المنسدلة للبحث
  const searchRef = useRef<HTMLDivElement>(null); // 👈 مرجع لتحديد حاوية البحث

  const params = useParams();
  const lang = params.lang || "ar";
  const isAr = lang === "ar";

  // 🔐 ميزة إغلاق قائمة نتائج البحث تلقائياً عند النقر في أي مكان خارج صندوق البحث
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchResults() {
      if (!debouncedValue.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setIsLoading(true);
      setIsOpen(true);
      const data = await getSearchResults(debouncedValue);
      setResults(data);
      setIsLoading(false);
    }
    fetchResults();
  }, [debouncedValue]);

  return (
    <div ref={searchRef} className="relative w-full max-w-xl mx-auto z-50">
      <input
        type="text"
        value={text}
        onFocus={() => text.trim() && setIsOpen(true)} // إعادة فتح القائمة عند تركيز الحقل إذا كان يحتوي على نص مسبقاً
        onChange={(e) => setText(e.target.value)}
        placeholder={isAr ? "ابحث عن ألعابك المفضلة..." : "Search for games..."}
        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-6 py-4 focus:outline-none focus:border-purple-500 transition-colors shadow-lg placeholder-zinc-600"
        dir={isAr ? "rtl" : "ltr"}
      />
      
      {/* القائمة المنسدلة للنتائج اللحظية المطورة بستايل Bento الداكن */}
      {isOpen && (results.length > 0 || isLoading || (debouncedValue && !isLoading && results.length === 0)) && (
        <div className="absolute top-full mt-2 w-full bg-zinc-900/95 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-md z-50">
          {isLoading ? (
            <div className="p-4 text-center text-zinc-400 text-sm animate-pulse">
              {isAr ? "جاري البحث عن اللعبة..." : "Searching for game..."}
            </div>
          ) : results.length === 0 && debouncedValue ? (
            // 👈 ميزة إظهار حالة "لا توجد نتائج" لراحة المستخدم بدلاً من مظهر الصندوق الفارغ مبهم التفاصيل
            <div className="p-5 text-center text-zinc-500 text-sm font-medium">
              {isAr ? "❌ لم نجد أي لعبة بهذا الاسم" : "❌ No games found with this name"}
            </div>
          ) : (
            results.map((game) => (
              <Link
                key={game.id}
                href={`/${lang}/game/${game.id}`}
                onClick={() => {
                  setText("");
                  setIsOpen(false); // إغلاق القائمة فور اختيار اللعبة المطلوبة
                }}
                className="flex items-center gap-4 p-4 hover:bg-zinc-800/60 transition-colors border-b border-zinc-800/50 last:border-0 cursor-pointer group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={game.background_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=100"} 
                  alt={game.name} 
                  className="w-12 h-12 object-cover rounded-xl border border-zinc-800 group-hover:border-purple-500/40 transition-colors"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-white font-bold text-sm group-hover:text-purple-400 transition-colors">
                    {game.name}
                  </span>
                  <span className="text-zinc-500 text-xs">
                    {game.released ? game.released.substring(0, 4) : "N/A"}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}