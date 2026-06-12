import { db } from "./firebase"; 
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp, 
  doc, 
  setDoc, 
  getDoc, 
  increment 
} from "firebase/firestore";

export interface Review {
  id?: string;
  gameId: string;
  userId?: string;
  userName: string;
  rating: number;
  comment: string;
  tags: string[]; 
  userBadges?: string[]; // 👈 إضافة حقل الشارات الجيمرية جنب الاسم
  createdAt: any;
}

// 1. دالة إضافة مراجعة جديدة (محدثة لاستقبال وحقن شارات اللاعب جنب اسمه سحابياً)
export async function addGameReview(
  gameId: string, 
  userId: string, 
  userName: string, 
  rating: number, 
  comment: string, 
  tags: string[],
  userBadges: string[] // 👈 استقبال شارات اللاعب الحالية لحفظها جنب اسمه
) {
  try {
    const reviewsRef = collection(db, "reviews");
    await addDoc(reviewsRef, {
      gameId,
      userId,
      userName: userName || "لاعب مجهول",
      rating,
      comment: comment.trim(),
      tags: tags || [],        
      userBadges: userBadges || [], // 👈 حفظ أيقونات الشارات في نفس الوثيقة لقراءتها فوراً
      createdAt: serverTimestamp(),
    });

    // حساب نقاط الـ XP المكتسبة من التفاعل الحالي
    let xpGained = 0;
    const hasComment = comment.trim().length > 0;
    const hasRating = rating > 0;

    if (hasComment) xpGained += 30; 
    if (hasRating) xpGained += 15;  

    // تحديث ملف اللاعب التراكمي في الفايربيز
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      uid: userId,
      userName: userName || "لاعب مجهول",
      xp: increment(xpGained), 
      commentsCount: increment(hasComment ? 1 : 0),
      ratingsCount: increment(hasRating ? 1 : 0),
      updatedAt: serverTimestamp()
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error("Error adding review and updating XP: ", error);
    return { success: false, error };
  }
}

// 2. دالة جلب مراجعات اللعبة (محدثة لتقرأ الشارات المرافقة لاسم اللاعب)
export async function getGameReviews(gameId: string): Promise<Review[]> {
  try {
    const reviewsRef = collection(db, "reviews");
    const q = query(reviewsRef, where("gameId", "==", gameId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const reviews: Review[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reviews.push({
        id: doc.id,
        gameId: data.gameId,
        userName: data.userName,
        rating: data.rating,
        comment: data.comment || "",
        tags: data.tags || [], 
        userBadges: data.userBadges || [], // 👈 جلب شارات اللاعب المرافقة لاسمه
        createdAt: data.createdAt?.toDate()?.toLocaleDateString() || "",
      });
    });
    return reviews;
  } catch (error) {
    console.error("Error getting reviews: ", error);
    return [];
  }
}

// 3. دالة مزامنة وقت مكوث الجيمر
export async function syncUserTimeSpent(userId: string, secondsToAdd: number, xpToAdd: number) {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      secondsSpent: increment(secondsToAdd),
      xp: increment(xpToAdd),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error syncing user active time: ", error);
    return { success: false };
  }
}

// 4. دالة جلب إحصائيات الحساب
export async function getUserStats(userId: string) {
  try {
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return null;
  }
}

// 5. دالة تحديث النبذة الشخصية (Bio) للاعب سحابياً
export async function updateUserBio(userId: string, bio: string) {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      bio: bio.trim(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error updating user bio: ", error);
    return { success: false, error };
  }
}

// 6. دالة تحديث معرف البث المباشر (YouTube Stream ID) سحابياً
export async function updateUserStreamId(userId: string, streamId: string) {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      youtubeStreamId: streamId.trim(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error updating youtube stream ID: ", error);
    return { success: false, error };
  }
}

// 7. ⚡ دالة جلب مراجعات اللاعب (مصححة ومحصنة كلياً لمنع أخطاء الـ Index السحابية) ⚡
export async function getUserReviews(userId: string): Promise<Review[]> {
  try {
    const reviewsRef = collection(db, "reviews");
    
    // 💡 التعديل الهيكلي: أزلنا الـ orderBy هنا تماماً لقتل مشكلة الـ Index الحاصلة بالترمينال
    const q = query(reviewsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const reviews: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reviews.push({
        id: doc.id,
        gameId: data.gameId,
        userName: data.userName,
        rating: data.rating,
        comment: data.comment || "",
        tags: data.tags || [], 
        userBadges: data.userBadges || [],
        // ⚡ الاحتفاظ بالطابع الزمني بالثواني لترتيب العناصر داخل الذاكرة
        rawSeconds: data.createdAt?.seconds || 0,
        createdAt: data.createdAt?.toDate()?.toLocaleDateString() || "",
      });
    });

    // ⚡ فرز المصفوفة حياً داخل ذاكرة المتصفح من الأحدث للأقدم بسلاسة تامة مية بالمية
    reviews.sort((a, b) => b.rawSeconds - a.rawSeconds);

    return reviews;
  } catch (error) {
    console.error("Error getting user reviews: ", error);
    return [];
  }
}