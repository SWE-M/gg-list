// src/components/GameTrailer.tsx

interface GameTrailerProps {
  videoId: string | null;
}

export default function GameTrailer({ videoId }: GameTrailerProps) {
  if (!videoId) return null; // إذا لم يجد تريلر، لن يعرض شيئاً

  return (
    <div className="w-full max-w-5xl mx-auto mt-12 mb-8">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="bg-red-600 w-2 h-6 rounded-full"></span>
        العرض التشويقي الرسمي
      </h2>
      
      {/* الحاوية السينمائية */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-gray-800 bg-black group">
        <iframe
          className="absolute top-0 left-0 w-full h-full transition-opacity duration-500"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&controls=1`}
          title="Official Game Trailer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}