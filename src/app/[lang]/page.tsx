import { getTrendingGames } from "@/lib/rawg";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const games = await getTrendingGames();
  const isAr = lang === "ar";

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white p-6 md:p-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* هيدر المنصة وشريط البحث */}
      <header className="mb-16 text-center md:text-start max-w-7xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-5xl font-black tracking-widest bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 bg-clip-text text-transparent inline-block">
            GGLIST
          </h1>
          <p className="text-zinc-400 text-base mt-2 font-medium tracking-wide">
            {isAr ? "تتبع. قيّم. اكتشف ألعابك المفضلة." : "Track. Rate. Discover Games."}
          </p>
        </div>
        <SearchBar />
      </header>

      {/* قسم الألعاب الأكثر تداولاً - Bento Grid Layout */}
      <section className="max-w-7xl mx-auto w-full space-y-8">
        <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
          <h2 className="text-2xl font-black text-zinc-100 uppercase tracking-wider">
            {isAr ? "الألعاب الأكثر تداولاً حالياً" : "Trending Now"}
          </h2>
        </div>

        {/* شبكة Bento Grid السحرية */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4 auto-rows-[250px] md:auto-rows-[300px]">
          {games.map((game: any, index: number) => {
            // هندسة أحجام المربعات بناءً على ترتيب اللعبة لإنشاء تأثير Bento
            let bentoClass = "col-span-1 row-span-1"; // الحجم الافتراضي
            
            if (index === 0) {
              bentoClass = "md:col-span-2 md:row-span-2"; // اللعبة الأولى: كرت ضخم
            } else if (index === 1 || index === 2) {
              bentoClass = "md:col-span-1 md:row-span-1"; // كروت عادية
            } else if (index === 3) {
              bentoClass = "md:col-span-2 md:row-span-1"; // كرت عريض
            }

            return (
              <Link 
                key={game.id}
                href={`/${lang}/game/${game.id}`}
                className={`group relative overflow-hidden rounded-3xl bg-zinc-900 shadow-xl border border-zinc-800/80 hover:border-purple-500/50 hover:shadow-purple-500/10 transition-all duration-500 ${bentoClass}`}
              >
                {/* صورة الغلاف الخلفية */}
                <img 
                  src={game.background_image || "/placeholder.jpg"} 
                  alt={game.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                />
                
                {/* تدرج لوني أسود لجعل النص مقروءاً */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>

                {/* تقييم اللعبة في الزاوية */}
                {game.metacritic && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-zinc-950/90 text-emerald-400 text-sm font-mono font-bold px-3 py-1.5 rounded-xl border border-emerald-500/30 backdrop-blur-md shadow-lg">
                      {game.metacritic}
                    </span>
                  </div>
                )}

                {/* معلومات اللعبة في الأسفل */}
                <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end z-10">
                  <h3 className="text-2xl md:text-3xl font-black text-white group-hover:text-purple-400 transition-colors drop-shadow-lg line-clamp-2">
                    {game.name}
                  </h3>
                  
                  {/* إخفاء المنصات في الشاشات الصغيرة لتجنب الزحمة */}
                  <div className="hidden md:flex flex-wrap gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-4 group-hover:translate-y-0">
                    {game.parent_platforms?.slice(0, 3).map((p: any) => (
                      <span key={p.platform.id} className="text-[10px] bg-zinc-950 text-zinc-300 px-2 py-1 rounded-lg border border-zinc-800 uppercase tracking-wider font-bold">
                        {p.platform.name}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}