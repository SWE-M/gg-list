"use client"; // تحويله إلى مكون عميل لتفعيل ميزة التبديل بين البثوث بسلاسة

import React, { useState } from 'react';
import { YouTubeLiveStream } from '@/lib/youtube';

interface GameLiveStreamProps {
  streams: YouTubeLiveStream[]; // يستقبل المصفوفة المحدثة (3 بثوث)
  lang: 'ar' | 'en';
}

export default function GameLiveStream({ streams, lang }: GameLiveStreamProps) {
  const isAr = lang === 'ar';

  // تحديد البث النشط حالياً في المشغل الرئيسي (افتراضياً أول بث في المصفوفة)
  const [activeStream, setActiveStream] = useState<YouTubeLiveStream | null>(
    streams && streams.length > 0 ? streams[0] : null
  );

  // إذا لم يعثر السيرفر على أي بث مباشر للعبة حالياً
  if (!streams || streams.length === 0 || !activeStream) {
    return (
      <div className="w-full max-w-5xl mx-auto mt-12 mb-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="bg-red-600 w-2 h-6 rounded-full animate-pulse"></span>
          {isAr ? "البث المباشر الحي" : "Live Gameplay Streams"}
        </h2>
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-gray-900/30 border border-gray-800 text-center backdrop-blur-sm">
          <span className="text-5xl mb-4 animate-bounce">🎮</span>
          <h3 className="text-xl font-bold text-gray-300">
            {isAr ? "لا توجد بثوث نشطة حالياً" : "No Active Streams Right Now"}
          </h3>
          <p className="text-sm text-gray-500 mt-2 max-w-md">
            {isAr 
              ? "يبدو أن الستريمرز لا يبثون هذه اللعبة في هذه اللحظة. تفقّد العرض التشويقي بالأسفل!" 
              : "Looks like nobody is streaming this game at the moment. Check out the official trailer below!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-12 mb-8">
      {/* العنوان المتناسق مع ستايل التريلر الخاص بك */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
          </span>
          {isAr ? "بثوث مباشرة حية للعبة" : "Live Gameplay Streams"}
        </h2>
        <span className="text-xs bg-red-600/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full font-bold animate-pulse">
          {isAr ? "مباشر الآن 🔴" : "LIVE NOW 🔴"}
        </span>
      </div>

      {/* المشغل السينمائي الرئيسي (نفس الستايل الخاص بك) */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.7)] border border-gray-800 bg-black transition-all duration-500">
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${activeStream.videoId}?autoplay=0&rel=0&modestbranding=1`}
          title={activeStream.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

      {/* معلومات البث النشط حالياً */}
      <div className="mt-4 p-4 bg-gray-950/40 border border-gray-900 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h3 className="text-white font-bold line-clamp-1 text-md">{activeStream.title}</h3>
          <p className="text-red-500 text-xs font-semibold mt-1">📺 {activeStream.channelTitle}</p>
        </div>
      </div>

      {/* الخيارات الإضافية (إذا وُجد أكثر من بث واحد) */}
      {streams.length > 1 && (
        <div className="mt-6">
          <p className="text-xs text-gray-400 mb-3 font-semibold">
            {isAr ? "اختر ستريمر آخر للمشاهدة:" : "Select another streamer to watch:"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {streams.map((stream) => {
              const isActive = stream.videoId === activeStream.videoId;
              return (
                <button
                  key={stream.videoId}
                  onClick={() => setActiveStream(stream)}
                  className={`flex items-center gap-3 p-2 rounded-xl border text-right transition-all duration-300 ${
                    isActive
                      ? "bg-red-950/20 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.15)]"
                      : "bg-gray-950/30 border-gray-800 hover:border-gray-700 hover:bg-gray-900/50"
                  }`}
                >
                  {/* الغلاف المصغر للبث */}
                  <div className="relative w-20 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={stream.thumbnailUrl}
                      alt={stream.title}
                      className="w-full h-full object-cover"
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-red-600/20 backdrop-blur-xs flex items-center justify-center">
                        <span className="text-xs text-white font-black">▶</span>
                      </div>
                    )}
                  </div>
                  {/* تفاصيل القناة */}
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white line-clamp-1">{stream.channelTitle}</p>
                    <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{stream.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}