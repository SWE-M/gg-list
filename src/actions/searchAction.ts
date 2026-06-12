"use server";

import { searchGames } from "@/lib/rawg";

/**
 * دالة لمعالجة وتوحيد الحروف العربية (Normalization)
 * تقوم بتحويل الحروف المتشابهة إلى صيغة موحدة لضمان ظهور النتائج مهما أخطأ المستخدم إملائياً
 */
function normalizeArabicText(text: string): string {
  if (!text) return text;
  
  return text
    .replace(/[أإآ]/g, "ا") // توحيد الألف (أ، إ، آ -> ا)
    .replace(/ة/g, "ه")    // توحيد التاء المربوطة (ة -> ه)
    .replace(/ى/g, "ي")    // توحيد الألف المقصورة (ى -> ي)
    .replace(/ؤ/g, "و")    // توحيد الواو المهموزة (ؤ -> و)
    .replace(/ئ/g, "ي");   // توحيد النبرة (ئ -> ي)
}

export async function getSearchResults(query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  try {
    // 1. تنظيف وتوحيد النص المدخل من المستخدم
    const normalizedQuery = normalizeArabicText(trimmedQuery);
    
    // 2. إرسال النص الموحد لمحرك جلب البيانات الرئيسي
    const results = await searchGames(normalizedQuery);
    
    return results || [];
  } catch (error) {
    console.error("Error in getSearchResults Server Action:", error);
    return [];
  }
}