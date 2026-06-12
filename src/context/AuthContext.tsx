"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore"; // 👈 أضفنا onSnapshot للاستماع الحي

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 📡 الاستماع لحالة الدخول وحقن الحسابات الجديدة فوراً ومراقبة الحظر الحي
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // إلغاء الاستماع الحي للمستخدم السابق إذا وجد لمنع تسريب الذاكرة
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          // إذا كان حساباً جديداً تماماً وغير مسجل في الـ Firestore، ننشئه بالثانية
          if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              userName: currentUser.displayName || "Gamer",
              email: currentUser.email || "",
              photoURL: currentUser.photoURL || "",
              xp: 0,
              commentsCount: 0,
              ratingsCount: 0,
              secondsSpent: 0,
              bio: "",
              youtubeStreamId: "",
              createdAt: serverTimestamp() // توثيق وقت الانضمام للسحاب
            });
            console.log(`🚀 Successfully provisioned a new cloud profile for ${currentUser.displayName}`);
          }

          // الاستماع الحي لرصد حالة الحظر وتحديث بيانات اللاعب دون طرده
          unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();

              // 💡 التعديل الجديد: لن نقوم بعمل signOut ولن نوجهه لصفحة الطرد، فقط ندمج البيانات
              setUser({ ...currentUser, ...userData } as any);
            } else {
              setUser(currentUser);
            }
            setLoading(false);
          });

        } catch (error) {
          console.error("Error syncing user profile to Firestore:", error);
          setUser(currentUser);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  // دالة تسجيل الدخول المنبثقة الفخمة
  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Firebase Login Error:", error);
    }
  };

  // دالة تسجيل الخروج
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Firebase Logout Error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);