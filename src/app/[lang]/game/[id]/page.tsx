import { getGameDetails, convertToAffiliateLink } from "@/lib/rawg"; 
import { getTranslatedText } from "@/lib/translator";
import { getGameTrailer, getGameLiveStreams } from "@/lib/youtube";
import GameTrailer from "@/components/GameTrailer";
import GameLiveStream from "@/components/GameLiveStream";
import Link from "next/link";
import ReviewSection from "@/components/ReviewSection";
import GameShelfButtons from "@/components/GameShelfButtons";
import type { Metadata } from "next"; // استيراد التيب الخاص بالـ Metadata

interface GamePageProps {
  params: Promise<{
    lang: string;
    id: string;
  }>;
}

// 🌐 دالة توليد الـ SEO والروابط الذكية ديناميكياً للعبة
export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { lang, id } = await params;
  const game = await getGameDetails(id);
  
  if (!game) return { title: "اللعبة غير موجودة | Game Not Found" };

  const isAr = lang === "ar";
  const descriptionArabic = await getTranslatedText(game.id, game.description_raw, "description");
  const displayDescription = isAr ? descriptionArabic : game.description_raw;
  
  // تنظيف الوصف من أي وسوم وتقليصه ليناسب محركات البحث والبطاقات الذكية
  const cleanDescription = displayDescription?.replace(/<[^>]*>/g, '').slice(0, 160) || "";

  return {
    title: game.name,
    description: cleanDescription,
    openGraph: {
      title: `${game.name} - تفاصيل اللعبة والتقييمات`,
      description: cleanDescription,
      type: "website", // 👈 تم التعديل هنا ليتوافق مع صرامة TypeScript في Next.js
      images: [
        {
          url: game.background_image || "",
          width: 1200,
          height: 630,
          alt: game.name,
        }
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.name} | GGLIST`,
      description: cleanDescription,
      images: [game.background_image || ""],
    }
  };
}
export default async function GameDetailsPage({ params }: GamePageProps) {
  const { lang, id } = await params;
  const game = await getGameDetails(id);
  const isAr = lang === "ar";

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-xl font-bold">{isAr ? "اللعبة غير موجودة" : "Game not found"}</p>
      </div>
    );
  }

  const trailerVideoId = await getGameTrailer(game.name);
  const liveStreams = await getGameLiveStreams(game.name, 3);
  const descriptionArabic = await getTranslatedText(game.id, game.description_raw, "description");
  const displayDescription = isAr ? descriptionArabic : game.description_raw;
  
  const developersList = game.developers?.map((d: any) => d.name).join(", ") || "Unknown";
  const platformsList = game.parent_platforms?.map((p: any) => p.platform.name).join(", ") || "Unknown";

  const gameSchema = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "name": game.name,
    "image": game.background_image || "",
    "description": displayDescription,
    "datePublished": game.released,
    "applicationCategory": "Game",
    "author": {
      "@type": "Organization",
      "name": developersList
    },
    ...(game.metacritic && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": game.metacritic,
        "bestRating": "100",
        "ratingCount": game.ratings_count || 1000
      }
    })
  };

  const faqs = [
    {
      question: isAr ? `متى تم إصدار لعبة ${game.name}؟` : `When was ${game.name} released?`,
      answer: isAr ? `تم إصدارها رسمياً in ${game.released}.` : `It was officially released on ${game.released}.`
    },
    {
      question: isAr ? `ما هي المنصات التي تدعم ${game.name}؟` : `What platforms support ${game.name}?`,
      answer: isAr ? `يمكنك لعبها على: ${platformsList}.` : `You can play it on: ${platformsList}.`
    },
    {
      question: isAr ? `من هو المطور للعبة ${game.name}؟` : `Who developed ${game.name}?`,
      answer: isAr ? `تم تطوير اللعبة بواسطة استوديو ${developersList}.` : `The game was developed by ${developersList}.`
    }
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  const encodedName = encodeURIComponent(game.name);
  const stores = [
    {
      name: "Steam",
      slug: "steam",
      url: `https://store.steampowered.com/search/?term=${encodedName}`,
      color: "hover:bg-sky-600/20 hover:border-sky-500 text-sky-400"
    },
    {
      name: "PlayStation Store",
      slug: "playstation",
      url: `https://store.playstation.com/en-us/search/${encodedName}`,
      color: "hover:bg-blue-600/20 hover:border-blue-500 text-blue-400"
    },
    {
      name: "Xbox Store",
      slug: "xbox",
      url: `https://www.xbox.com/en-US/search?q=${encodedName}`,
      color: "hover:bg-emerald-600/20 hover:border-emerald-500 text-emerald-400"
    },
    {
      name: "Epic Games",
      slug: "epic-games", 
      url: `https://store.epicgames.com/en-US/browse?q=${encodedName}`,
      color: "hover:bg-zinc-100/10 hover:border-zinc-400 text-zinc-300"
    }
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      
      <main className="min-h-screen bg-zinc-950 text-white p-6 md:p-12" dir={isAr ? "rtl" : "ltr"}>
        <div className="max-w-5xl mx-auto space-y-8">
          <Link href={`/${lang}`} className="text-sm font-bold text-purple-400 hover:underline">
            {isAr ? "← العودة للرئيسية" : "← Back to Home"}
          </Link>

          <div className="relative w-full h-[400px] rounded-3xl overflow-hidden bg-zinc-900 shadow-2xl">
            <img 
              src={game.background_image_additional || game.background_image} 
              alt={game.name} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>
            <h1 className="absolute bottom-6 left-6 right-6 text-4xl md:text-6xl font-black tracking-tight">
              {game.name}
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <GameTrailer videoId={trailerVideoId} />
              <GameLiveStream streams={liveStreams} lang={lang as "ar" | "en"} />

              <div className="space-y-4">
                <h2 className="text-2xl font-bold border-b border-zinc-800 pb-2 text-purple-400">
                  {isAr ? "عن اللعبة والقصة" : "About & Story"}
                </h2>
                <p className="text-zinc-300 text-lg leading-relaxed whitespace-pre-line" dir="auto">
                  {displayDescription}
                </p>
              </div>

              <div className="pt-4 space-y-4">
                <h2 className="text-2xl font-bold border-b border-zinc-800 pb-2 text-purple-400">
                  {isAr ? "أسئلة شائعة" : "Frequently Asked Questions"}
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index} className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4">
                      <h3 className="font-bold text-lg text-white mb-2">{faq.question}</h3>
                      <p className="text-zinc-400">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              <ReviewSection gameId={game.id.toString()} isAr={isAr} />
            </div>

            <div className="space-y-6">
              <GameShelfButtons 
                gameId={game.id.toString()} 
                gameName={game.name} 
                gameImage={game.background_image} 
                isAr={isAr} 
              />
              
              <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl h-fit space-y-4">
                <h3 className="text-xl font-bold">{isAr ? "معلومات سريعة" : "Quick Info"}</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-zinc-400">{isAr ? "تاريخ الإصدار:" : "Release Date:"} <span className="text-white font-medium">{game.released}</span></p>
                  <p className="text-zinc-400">{isAr ? "التقييم العالمي:" : "Metacritic:"} <span className="text-emerald-400 font-bold">{game.metacritic || "N/A"}</span></p>
                  <p className="text-zinc-400">{isAr ? "المطورون:" : "Developers:"} <span className="text-white">{developersList}</span></p>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-purple-900/30 p-6 rounded-2xl h-fit space-y-4 shadow-xl shadow-purple-950/5">
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                  {isAr ? "شراء اللعبة" : "Buy the Game"}
                </h3>
                <p className="text-zinc-400 text-xs">
                  {isAr ? "قارن الأسعار واشترِ اللعبة من متجرك المفضل:" : "Compare prices and buy from your favorite store:"}
                </p>
                <div className="flex flex-col gap-2.5 pt-2">
                  {stores.map((store, idx) => (
                    <a
                      key={idx}
                      href={convertToAffiliateLink(store.url, store.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full text-center font-bold py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 transition-all duration-300 text-sm cursor-pointer ${store.color}`}
                    >
                      {isAr ? `شراء من ${store.name}` : `Buy on ${store.name}`}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}