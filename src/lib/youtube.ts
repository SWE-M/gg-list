// تعريف واجهة البيانات (Interface) للبثوث المباشرة لضمان تايب-سيف (Type Safety) ممتاز
export interface YouTubeLiveStream {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
}

/**
 * 1. دالة جلب التريلر الرسمي للعبة (كاش 24 ساعة)
 */
export async function getGameTrailer(gameName: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("⚠️ [GGLIST] YouTube API Key is missing in environment variables!");
    return null;
  }

  // استخدام encodeURIComponent لضمان معالجة الفراغات والرموز الخاصة في أسماء الألعاب بشكل سليم
  const query = encodeURIComponent(`${gameName} official game trailer`);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${query}&type=video&key=${apiKey}`;

  try {
    const response = await fetch(url, { next: { revalidate: 86400 } }); // كاش لمدة 24 ساعة
    
    if (!response.ok) {
      console.error(`⚠️ YouTube API responded with status: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      return data.items[0].id.videoId;
    }
    return null;
  } catch (error) {
    console.error("❌ Error fetching YouTube trailer:", error);
    return null;
  }
}

/**
 * 2. دالة جلب البثوث المباشرة الحالية للعبة معينة (كاش قصير 5 دقائق لحماية الكوتا وضمان حيوية البث)
 */
export async function getGameLiveStreams(gameName: string, maxResults: number = 3): Promise<YouTubeLiveStream[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("⚠️ [GGLIST] YouTube API Key is missing in environment variables!");
    return [];
  }

  // تحسين سياق البحث: دمج كلمة live و gameplay يعطي نتائج أكثر دقة مخصصة للألعاب
  const query = encodeURIComponent(`${gameName} live gameplay`);
  
  // لضمان البحث عن بث مباشر نشط، يجب تمرير type=video و eventType=live معاً
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${query}&type=video&eventType=live&key=${apiKey}`;

  try {
    // كاش لمدة 5 دقائق (300 ثانية) لمنع استهلاك الكوتا وتحديث البيانات بانتظام
    const response = await fetch(url, { next: { revalidate: 300 } });
    
    if (!response.ok) {
      console.error(`⚠️ YouTube API Live Streams responded with status: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    // عمل الخرائط (Mapping) للبيانات القادمة مع وضع حمايات إضافية (Fallback) للصور والعناوين
    return data.items.map((item: any) => ({
      videoId: item.id?.videoId || "",
      title: item.snippet?.title || "Live Stream",
      channelTitle: item.snippet?.channelTitle || "Unknown Streamer",
      thumbnailUrl: 
        item.snippet?.thumbnails?.high?.url || 
        item.snippet?.thumbnails?.medium?.url || 
        "/images/stream-placeholder.jpg", // صورة افتراضية احتياطية في حال لم تتوفر thumbnails
    }));
  } catch (error) {
    console.error("❌ Error fetching YouTube live streams:", error);
    return [];
  }
}