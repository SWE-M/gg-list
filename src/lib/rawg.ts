const API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY; // 👈 التعديل هنا لقراءة المفتاح العام في المتصفح
const BASE_URL = "https://api.rawg.io/api";

/**
 * جلب الألعاب الأكثر تداولاً وشعبية حالياً (محدثة ديناميكياً للأبد)
 */
export async function getTrendingGames() {
  if (!API_KEY) {
    console.error("RAWG_API_KEY is missing in your .env.local");
    return [];
  }

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentDateStr = now.toISOString().split('T')[0]; 
    const startDateStr = `${currentYear - 1}-01-01`;        

    const res = await fetch(
      `${BASE_URL}/games?key=${API_KEY}&dates=${startDateStr},${currentDateStr}&ordering=-added&page_size=6`,
      { next: { revalidate: 3600 } } 
    );

    if (!res.ok) throw new Error("حدث خطأ أثناء الاتصال بسيرفر RAWG");
    const data = await res.json();
    return data.results;
  } catch (error) {
    console.error("Error fetching games:", error);
    return [];
  }
}

/**
 * جلب تفاصيل كاملة للعبة محددة عبر الـ ID أو الـ Slug
 */
export async function getGameDetails(id: string) {
  if (!API_KEY) {
    console.error("RAWG_API_KEY is missing in your .env.local");
    return null;
  }

  try {
    const res = await fetch(`${BASE_URL}/games/${id}?key=${API_KEY}`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching game details:", error);
    return null;
  }
}

/**
 * دالة البحث اللحظي عن الألعاب مع الاعتماد على خوارزمية الصلة (Relevance)
 */
export async function searchGames(query: string) {
  if (!API_KEY || !query) return [];
  try {
    const res = await fetch(
      `${BASE_URL}/games?key=${API_KEY}&search=${encodeURIComponent(query)}&page_size=5`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

/**
 * 🚀 دالة جلب الألعاب ديناميكياً لصفحة الاستكشاف مع جدار حماية للمحتوى غير اللائق
 */
export async function fetchExploreGames({
  genre,
  platform,
  sort,
  year,
  page = 1,
}: {
  genre?: string;
  platform?: string;
  sort?: string;
  year?: string;
  page?: number;
}) {
  if (!API_KEY) {
    console.error("RAWG_API_KEY is missing in your .env.local");
    return { results: [], count: 0 };
  }

  try {
    let url = `${BASE_URL}/games?key=${API_KEY}&page=${page}&page_size=9`;

    if (genre) {
      if (genre === "horror") {
        url += `&tags=horror`;
      } else {
        url += `&genres=${genre}`;
      }
    }

    if (platform) {
      url += ` =${platform}`;
    }

    if (year) {
      url += `&dates=${year}-01-01,${year}-12-31`;
    } else {
      url += `&dates=2024-01-01,2026-12-31`;
    }

    if (sort) {
      url += `&ordering=${sort}`;
    } else {
      url += `&ordering=-added`;
    }

    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return { results: [], count: 0 };

    const data = await res.json();
    const rawGames = data.results || [];

    const nsfwKeywords = [
      "femboy", "sex", "hentai", "adult", "naked", "porn", "pussy", 
      "erotic", "undress", "nude", "pleasure", "desire", "sin"
    ];

    const cleanGames = rawGames.filter((game: any) => {
      const gameName = (game.name || "").toLowerCase();
      const gameSlug = (game.slug || "").toLowerCase();

      const isNsfw = nsfwKeywords.some(keyword => gameName.includes(keyword) || gameSlug.includes(keyword));
      const isLowQualityIndie = (game.suggestions_count || 0) < 10 && (game.ratings_count || 0) === 0;

      return !isNsfw && !isLowQualityIndie;
    });

    return {
      results: cleanGames,
      count: data.count || 0,
    };
  } catch (error) {
    console.error("Error in fetchExploreGames:", error);
    return { results: [], count: 0 };
  }
}

/**
 * 💰 دالة تحويل روابط المتاجر العادية إلى روابط تسويق بالعمولة (Affiliate)
 */
export function convertToAffiliateLink(originalUrl: string, storeSlug: string): string {
  if (!originalUrl) return "#";

  const EPIC_CREATOR_TAG = "gglist2026"; 
  const AMAZON_AFFILIATE_TAG = "gglist-21"; 
  const CDKEYS_AFFILIATE_ID = "YOUR_CDKEYS_ID";

  try {
    const urlObj = new URL(originalUrl);

    if (storeSlug === "epic-games" || urlObj.hostname.includes("epicgames.com")) {
      urlObj.searchParams.set("creator", EPIC_CREATOR_TAG);
      return urlObj.toString();
    }

    if (storeSlug === "amazon" || urlObj.hostname.includes("amazon.com")) {
      urlObj.searchParams.set("tag", AMAZON_AFFILIATE_TAG);
      return urlObj.toString();
    }

    if (storeSlug === "cdkeys" || urlObj.hostname.includes("cdkeys.com")) {
      urlObj.searchParams.set("aff", CDKEYS_AFFILIATE_ID);
      return urlObj.toString();
    }

    return originalUrl;
  } catch (error) {
    return originalUrl;
  }
}