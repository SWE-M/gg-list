import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function getTranslatedText(
  gameId: string | number,
  englishText: string,
  fieldName: string = "description"
): Promise<string> {
  if (!englishText) return "";

  // 1️⃣ تم توحيد اسم المجموعة إلى "translations" ليتطابق تماماً مع قواعد حماية الفايربيز
  const docRef = doc(db, "translations", `${gameId}_${fieldName}`);
  
  // فحص كاش الفايربيز أولاً
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().arabicText;
    }
  } catch (error) {
    console.error("Firestore Cache Error:", error);
  }

  // محاولة الترجمة عبر Gemini
  try {
    // 2️⃣ تم التحديث إلى "gemini-pro" المستقر لتجنب أخطاء 404
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Translate the following video game ${fieldName} into Arabic. 
    Use an exciting gamer style. Text: "${englishText}"`;

    const result = await model.generateContent(prompt);
    const arabicText = result.response.text().trim();

    // حفظ الترجمة الفعلية
    await setDoc(docRef, { arabicText, translatedAt: new Date().toISOString() });
    return arabicText;

  } catch (error: any) {
    console.error("Gemini API Blocked:", error.message);
    
    // 3️⃣ تم تغيير طريقة دمج النص لتفادي انهيار محرك Turbopack مع الحروف العربية (بق معروف)
    const fallbackText = "⚠️ عذراً، الترجمة العربية غير متاحة حالياً بسبب قيود السيرفر الجغرافية.\n\n--- النص الأصلي ---\n\n" + englishText;
    
    // نحفظ النص البديل في الكاش لنتأكد أن الفايربيز يستقبل البيانات
    try {
      await setDoc(docRef, { 
        arabicText: fallbackText, 
        translatedAt: new Date().toISOString(),
        isFallback: true 
      });
    } catch (dbError) {
      console.error("Firestore Fallback Write Error:", dbError);
    }

    return fallbackText;
  }
}