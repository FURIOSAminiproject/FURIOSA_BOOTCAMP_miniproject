import React, { useState } from "react";
import { ImageOff } from "lucide-react";
import { placeImageUrl } from "../services/place-image";

/** 사진이 없는 장소와 외부 이미지 로딩 실패를 같은 크기의 안내로 대체한다. */
export function PlacePhoto({
  name,
  imageUrl,
  compact = false,
  className = "",
}: {
  name: string;
  imageUrl?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const src = placeImageUrl(imageUrl);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const available = !!src && src !== failedSrc;
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-stone-100 ${compact ? "h-16 w-20 shrink-0" : "aspect-[16/9] w-full"} ${className}`}
    >
      {available ? (
        <img
          key={src}
          src={src}
          alt={`${name} 대표 사진`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div
          role="img"
          aria-label={`${name}: 제공된 사진이 없습니다`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-stone-400"
        >
          <ImageOff
            className={compact ? "h-4 w-4" : "h-6 w-6"}
            aria-hidden="true"
          />
          <span className="text-[11px]">사진 없음</span>
        </div>
      )}
    </div>
  );
}
