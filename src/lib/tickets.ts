import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  arrayUnion, 
  serverTimestamp 
} from "firebase/firestore";

// 🚀 استيراد محرك الإشعارات الذي بنيناه
import { sendNotification } from "./notifications";

// 🔹 تحديد الأنواع (Types) لضمان صارم لـ TypeScript
export interface TicketReply {
  replyId: string;
  senderId: string;
  senderName: string;
  message: string;
  isAdmin: boolean;
  createdAt: any;
}

export interface Ticket {
  id?: string;
  userId: string;
  userName: string;
  subject: string;
  description: string;
  status: "open" | "in-progress" | "closed";
  createdAt: any;
  replies: TicketReply[];
}

// 1️⃣ دالة إنشاء تذكرة دعم فني جديدة للاعب
export async function createTicket(userId: string, userName: string, subject: string, description: string) {
  try {
    const ticketsRef = collection(db, "tickets");
    const newTicket: Omit<Ticket, "id"> = {
      userId,
      userName,
      subject,
      description,
      status: "open",
      createdAt: serverTimestamp(),
      replies: []
    };

    const docRef = await addDoc(ticketsRef, newTicket);
    return { success: true, ticketId: docRef.id };
  } catch (error) {
    console.error("Error creating ticket:", error);
    return { success: false, error };
  }
}

// 2️⃣ دالة جلب جميع التذاكر الخاصة بلاعب معين (ليعرضها في صفحته)
export async function getUserTickets(userId: string): Promise<Ticket[]> {
  try {
    const ticketsRef = collection(db, "tickets");
    const q = query(ticketsRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const tickets: Ticket[] = [];
    querySnapshot.forEach((doc) => {
      tickets.push({ id: doc.id, ...doc.data() } as Ticket);
    });

    return tickets;
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    return [];
  }
}

// 3️⃣ دالة جلب تذكرة واحدة محددة بكافة تفاصيلها وردودها
export async function getTicketDetails(ticketId: string): Promise<Ticket | null> {
  try {
    const ticketRef = doc(db, "tickets", ticketId);
    const docSnap = await getDoc(ticketRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Ticket;
    }
    return null;
  } catch (error) {
    console.error("Error fetching ticket details:", error);
    return null;
  }
}

// 4️⃣ دالة جلب "كل" التذاكر الموجودة في النظام (خاصة بـ لوحة تحكم المسؤول Admin)
export async function getAllTicketsForAdmin(): Promise<Ticket[]> {
  try {
    const ticketsRef = collection(db, "tickets");
    const q = query(ticketsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const tickets: Ticket[] = [];
    querySnapshot.forEach((doc) => {
      tickets.push({ id: doc.id, ...doc.data() } as Ticket);
    });

    return tickets;
  } catch (error) {
    console.error("Error fetching all tickets for admin:", error);
    return [];
  }
}

// 5️⃣ دالة إضافة رد جديد داخل التذكرة (سواءً من اللاعب أو من الأدمن) + 🔔 إرسال إشعار
export async function addTicketReply(
  ticketId: string, 
  senderId: string, 
  senderName: string, 
  message: string, 
  isAdmin: boolean
) {
  try {
    const ticketRef = doc(db, "tickets", ticketId);
    
    // 👈 نقرأ التذكرة أولاً لنعرف من هو اللاعب صاحبها لكي نرسل له الإشعار
    const ticketSnap = await getDoc(ticketRef);
    if (!ticketSnap.exists()) return { success: false, error: "Ticket not found" };
    const ticketData = ticketSnap.data() as Ticket;

    const newReply: TicketReply = {
      replyId: Math.random().toString(36).substring(2, 9),
      senderId,
      senderName,
      message,
      isAdmin,
      createdAt: new Date().toISOString()
    };

    // تحديث التذكرة
    await updateDoc(ticketRef, {
      replies: arrayUnion(newReply),
      ...(isAdmin && { status: "in-progress" })
    });

    // 🔔 الإضافة الذهبية: إذا كان الرد من الإدارة، نرسل إشعاراً لصاحب التذكرة!
    if (isAdmin) {
      await sendNotification({
        userId: ticketData.userId,
        title: "رد جديد من الدعم الفني 🛡️",
        message: `تم الرد على تذكرتك: ${ticketData.subject}`,
        type: "ticket_reply",
        link: `/ar/support` // عند الضغط على الإشعار سيأخذه لصفحة الدعم الفني
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error adding ticket reply:", error);
    return { success: false, error };
  }
}

// 6️⃣ دالة تحديث حالة التذكرة + 🔔 إرسال إشعار عند الإغلاق
export async function updateTicketStatus(ticketId: string, newStatus: "open" | "in-progress" | "closed") {
  try {
    const ticketRef = doc(db, "tickets", ticketId);
    
    // 🔔 نرسل إشعاراً لو تم حل وإغلاق التذكرة
    if (newStatus === "closed") {
      const ticketSnap = await getDoc(ticketRef);
      if (ticketSnap.exists()) {
        const ticketData = ticketSnap.data() as Ticket;
        await sendNotification({
          userId: ticketData.userId,
          title: "تم إغلاق تذكرتك 🔒",
          message: `تم حل المشكلة وإغلاق التذكرة: ${ticketData.subject}`,
          type: "system_alert",
          link: `/ar/support`
        });
      }
    }

    await updateDoc(ticketRef, { status: newStatus });
    return { success: true };
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return { success: false, error };
  }
}