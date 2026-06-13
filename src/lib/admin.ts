import { db } from "./firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy, limit, deleteDoc } from "firebase/firestore";

// 1. 🚫 حظر أو فك حظر مستخدم (محدث ليدعم النص الحر للوقت والسبب)
export async function toggleUserBan(userId: string, isBanned: boolean, banUntilText: string | null = null, banReasonText: string | null = null) {
  try {
    const userRef = doc(db, "users", userId);
    const updateData: any = { isBanned };

    if (isBanned) {
        updateData.banUntil = banUntilText || "حتى إشعار آخر";
        updateData.banReason = banReasonText || "مخالفة بنود الاستخدام";
    } else {
        // تنظيف البيانات عند فك الحظر
        updateData.banUntil = null;
        updateData.banReason = null;
    }

    await updateDoc(userRef, updateData);
    return { success: true };
  } catch (error) {
    console.error("Ban error", error);
    return { success: false, error };
  }
}

// 2. 💬 جلب كل غرف المحادثة (القروبات والخاصة) لمراقبة نشاط النظام
export async function getAllSystemChats() {
  try {
    const q = query(collection(db, "chatRooms"), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Fetch chats error", error);
    return [];
  }
}

// 3. 📝 جلب آخر التفاعلات والمراجعات (للتأكد من خلوها من الإساءة)
export async function getRecentSystemReviews() {
   try {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Fetch reviews error", error);
    return [];
  }
}

// 4. 🗑️ حذف محتوى مسيء نهائياً من قاعدة البيانات
export async function deleteOffensiveContent(collectionName: string, docId: string) {
   try {
     await deleteDoc(doc(db, collectionName, docId));
     return { success: true };
   } catch (error) {
     console.error("Delete content error", error);
     return { success: false };
   }
}