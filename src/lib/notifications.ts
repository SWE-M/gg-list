import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, writeBatch, query, where, getDocs } from "firebase/firestore";

// 📌 هيكل (Interface) الإشعار لضمان قوة الكود وتجنب الأخطاء
export interface AppNotification {
  id?: string;
  userId: string;       // الـ ID الخاص باللاعب المستلم
  title: string;        // عنوان الإشعار (مثل: تنبيه إداري، طلب صداقة)
  message: string;      // نص الإشعار التفصيلي
  type: "ticket_reply" | "chat_request" | "chat_accepted" | "system_alert" | "review_like"; 
  link?: string;        // رابط للتوجيه عند الضغط على الإشعار (مثلاً توجيهه لصفحة التذاكر)
  isRead: boolean;      // هل قرأه اللاعب أم لا؟
  createdAt?: any;
}

// 1. 🔔 إرسال إشعار جديد للمستخدم (نستدعيها من أي مكان في النظام)
export async function sendNotification(data: Omit<AppNotification, "isRead" | "createdAt" | "id">) {
  try {
    const notifRef = collection(db, "notifications");
    await addDoc(notifRef, {
      ...data,
      isRead: false,
      createdAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error };
  }
}

// 2. 👁️ تحديد إشعار واحد بأنه "مقروء" (تُستدعى عندما يضغط اللاعب على إشعار معين)
export async function markNotificationAsRead(notificationId: string) {
  try {
    const notifRef = doc(db, "notifications", notificationId);
    await updateDoc(notifRef, { isRead: true });
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error };
  }
}

// 3. ✨ تحديد كل إشعارات المستخدم كـ "مقروءة" بضغطة زر واحدة (Mark all as read)
export async function markAllNotificationsAsRead(userId: string) {
  try {
    // نجلب فقط الإشعارات غير المقروءة الخاصة بهذا اللاعب لتخفيف الضغط على السيرفر
    const q = query(
      collection(db, "notifications"), 
      where("userId", "==", userId), 
      where("isRead", "==", false)
    );
    const snap = await getDocs(q);

    if (snap.empty) return { success: true };

    // نستخدم Batch لتحديث كل الإشعارات دفعة واحدة في عملية سحابية واحدة (أداء أسرع 10 مرات)
    const batch = writeBatch(db);
    snap.forEach((document) => {
      batch.update(document.ref, { isRead: true });
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error marking all as read:", error);
    return { success: false, error };
  }
}