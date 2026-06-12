import { db } from "./firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion
} from "firebase/firestore";

// 1️⃣ الهياكل البرمجية (Interfaces) لنظام الشات والمجتمعات
export interface ChatRequest {
  id?: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: any;
}

export interface ChatRoom {
  id?: string;
  type: "private" | "group";
  members: string[]; // مصفوفة تحتوي على الـ UIDs للمشتركين
  groupName?: string; // اختياري في حال كان قروب/مجتمع جماعي
  createdBy?: string; // منشئ القروب
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
  };
  createdAt: any;
  updatedAt: any;
}

export interface Message {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
}

// 2️⃣ دالة إرسال طلب محادثة جديد من بروفايل لاعب آخر
export async function sendChatRequest(senderId: string, senderName: string, receiverId: string) {
  try {
    // فحص أمني: منع إرسال طلب متكرر لو كان هناك طلب معلق بالفعل
    const requestsRef = collection(db, "chatRequests");
    const q = query(
      requestsRef,
      where("senderId", "==", senderId),
      where("receiverId", "==", receiverId),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { success: false, error: "pending_exists" };
    }

    // حقن الطلب في السحاب حياً
    await addDoc(requestsRef, {
      senderId,
      senderName: senderName || "لاعب مجهول",
      receiverId,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending chat request:", error);
    return { success: false, error };
  }
}

// 3️⃣ دالة قبول طلب المحادثة وتحويله فوراً إلى غرفة شات رسمية (1-on-1)
export async function acceptChatRequest(requestId: string, senderId: string, receiverId: string) {
  try {
    // أ. تحديث حالة الطلب إلى مقبول
    const requestRef = doc(db, "chatRequests", requestId);
    await updateDoc(requestRef, { status: "accepted" });

    // ب. إنشاء غرفة شات خاصة (Private Chat Room) بين اللاعبين
    const roomsRef = collection(db, "chatRooms");
    const newRoomRef = await addDoc(roomsRef, {
      type: "private",
      members: [senderId, receiverId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: {
        text: "🎉 تم قبول طلب المراسلة، ابدأ الدردشة الآن!",
        senderId: "system",
        timestamp: serverTimestamp()
      }
    });

    return { success: true, roomId: newRoomRef.id };
  } catch (error) {
    console.error("Error accepting chat request:", error);
    return { success: false, error };
  }
}

// 4️⃣ دالة إنشاء قروب / مجتمع جيمري جماعي جديد (Group Chat Room)
export async function createGroupChat(groupName: string, memberIds: string[], creatorId: string) {
  try {
    const roomsRef = collection(db, "chatRooms");
    
    // التأكد من تضمين منشئ القروب داخل مصفوفة الأعضاء تلقائياً
    const allMembers = Array.from(new Set([creatorId, ...memberIds]));

    const newGroupRef = await addDoc(roomsRef, {
      type: "group",
      groupName: groupName.trim(),
      members: allMembers,
      createdBy: creatorId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: {
        text: "👥 تم إنشاء هذا المجتمع الجيمري بنجاح!",
        senderId: "system",
        timestamp: serverTimestamp()
      }
    });

    return { success: true, roomId: newGroupRef.id };
  } catch (error) {
    console.error("Error creating group chat:", error);
    return { success: false, error };
  }
}

// 5️⃣ دالة إرسال رسالة حية داخل غرفة الشات (خاص أو قروب) وتحديث آخر رسالة
export async function sendMessage(roomId: string, senderId: string, senderName: string, text: string) {
  try {
    if (!text.trim()) return { success: false };

    // أ. حقن الرسالة بداخل مجموعة فرعية (Subcollection) تابعة للغرفة
    const messagesRef = collection(db, "chatRooms", roomId, "messages");
    await addDoc(messagesRef, {
      senderId,
      senderName: senderName || "لاعب مجهول",
      text: text.trim(),
      createdAt: serverTimestamp(),
    });

    // ب. تحديث وثيقة الغرفة الرئيسية ببيانات "آخر رسالة" لتعرض في القائمة الجانبية فوراً
    const roomRef = doc(db, "chatRooms", roomId);
    await updateDoc(roomRef, {
      updatedAt: serverTimestamp(),
      lastMessage: {
        text: text.trim(),
        senderId,
        timestamp: serverTimestamp()
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error };
  }
}