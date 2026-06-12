"use server";

// 🚀 هذا الملف يعمل في السيرفر فقط لحماية مفاتيح الـ API وتسريع جلب البيانات

export async function searchGamesAdvanced(params: { 
  search?: string; 
  platform?: string; 
  genre?: string; 
  year?: string; 
  ordering?: string; 
  page?: number 
}) {
  // جلب مفتاح RAWG من المتغيرات البيئية
  const apiKey = process.env.RAWG_API_KEY || process.env.NEXT_PUBLIC_RAWG_API_KEY;
  
  // بناء الرابط الأساسي مع جلب 24 لعبة في الصفحة لتعبئة الشاشة بشكل جميل
  let url = `https://api.rawg.io/api/games?key=${apiKey}&page_size=24`;

  // حقن الفلاتر الذكية في الرابط
  if (params.search) url += `&search=${encodeURIComponent(params.search)}`;
  if (params.platform) url += `&platforms=${params.platform}`;
  if (params.genre) url += `&genres=${params.genre}`;
  if (params.year) url += `&dates=${params.year}-01-01,${params.year}-12-31`;
  if (params.ordering) url += `&ordering=${params.ordering}`;
  if (params.page) url += `&page=${params.page}`;

  try {
    const res = await fetch(url, { 
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store" // لضمان جلب نتائج حية دائماً عند البحث
    });
    
    if (!res.ok) throw new Error("Failed to fetch from RAWG");
    
    const data = await res.json();
    return data.results || []; // إرجاع مصفوفة الألعاب فقط
  } catch (error) {
    console.error("Advanced Search Error:", error);
    return [];
  }
}