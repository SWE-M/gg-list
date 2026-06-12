import { db } from "./firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

/**
 * دالة جلب مكتبة وأرفف الألعاب الخاصة باللاعب
 */
export async function getUserShelf(userId: string) {
  try {
    const shelfRef = collection(db, "users", userId, "shelf");
    const q = query(shelfRef, orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    
    const games: any[] = [];
    snap.forEach(doc => {
      games.push({ id: doc.id, ...doc.data() });
    });
    
    return games;
  } catch (error) {
    console.error("Error fetching user shelf:", error);
    return [];
  }
}