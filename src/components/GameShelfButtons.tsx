"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

interface GameShelfButtonsProps {
  gameId: string;
  gameName: string;
  gameImage: string;
  isAr: boolean;
}

type ShelfStatus = "backlog" | "playing" | "completed" | null;

export default function GameShelfButtons({ gameId, gameName, gameImage, isAr }: GameShelfButtonsProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ShelfStatus>(null);
  const [loading, setLoading] = useState(true);

  // 1. جلب حالة اللعبة الحالية من رف اللاعب في الفايربيز
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchShelfStatus() {
      try {
        const gameRef = doc(db, "users", user!.uid, "shelf", gameId);
        const docSnap = await getDoc(gameRef);
        if (docSnap.exists()) {
          setStatus(docSnap.data().status as ShelfStatus);
        }
      } catch (error) {
        console.error("Error fetching shelf status:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchShelfStatus();
  }, [gameId, user]);

  // 2. تحديث حالة اللعبة في الرف
  const handleUpdateShelf = async (newStatus: ShelfStatus) => {
    if (!user) {
      alert(isAr ? "يجب تسجيل الدخول أولاً لإضافة اللعبة للرف الخاص بك!" : "You must login first to add games to your shelf!");
      return;
    }

    const previousStatus = status;
    const isRemoving = previousStatus === newStatus;
    
    // تحديث الواجهة فوراً (Optimistic UI) لسرعة الاستجابة
    setStatus(isRemoving ? null : newStatus);

    try {
      const gameRef = doc(db, "users", user.uid, "shelf", gameId);
      
      if (isRemoving) {
        // إذا ضغط على نفس الزر، يتم إزالة اللعبة من الرف
        await deleteDoc(gameRef);
      } else {
        // إضافة أو تحديث اللعبة في الرف
        await setDoc(gameRef, {
          gameId,
          name: gameName,
          image: gameImage,
          status: newStatus,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error updating shelf:", error);
      setStatus(previousStatus); // التراجع في حال الفشل
      alert(isAr ? "حدث خطأ أثناء التحديث" : "Error updating shelf");
    }
  };

  const buttons = [
    { id: "backlog", label: isAr ? "أخطط للعبها ⏳" : "Backlog ⏳", color: "text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500 hover:text-black", active: "bg-amber-500 text-black font-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]" },
    { id: "playing", label: isAr ? "ألعبها حالياً 🎮" : "Playing 🎮", color: "text-sky-400 bg-sky-500/10 border-sky-500/30 hover:bg-sky-500 hover:text-black", active: "bg-sky-500 text-black font-black border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.4)]" },
    { id: "completed", label: isAr ? "أنهيتها ✅" : "Completed ✅", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500 hover:text-black", active: "bg-emerald-500 text-black font-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]" }
  ];

  if (loading) {
    return <div className="h-14 bg-zinc-900/40 rounded-xl animate-pulse w-full"></div>;
  }

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-3 shadow-xl">
      <h3 className="text-sm font-black text-zinc-300">
        {isAr ? "أضف اللعبة لرفك الشخصي:" : "Add to your Shelf:"}
      </h3>
      <div className="flex flex-col gap-2">
        {buttons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => handleUpdateShelf(btn.id as ShelfStatus)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition-all duration-300 ${status === btn.id ? btn.active : btn.color}`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {!user && (
        <p className="text-[9px] text-zinc-500 text-center font-bold">
          {isAr ? "سجل دخولك لحفظ مكتبة ألعابك للأبد ☁️" : "Login to save your game library forever ☁️"}
        </p>
      )}
    </div>
  );
}