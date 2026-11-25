import React, { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ResilientImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  loading?: 'lazy' | 'eager';
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  loading = 'lazy',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-stone-100 text-stone-500 dark:bg-slate-800 dark:text-slate-400 p-6 text-center ${className}`}
      >
        <ImageIcon className="w-8 h-8 mb-2 opacity-60" aria-hidden="true" />
        <span className="text-xs font-medium leading-snug max-w-[24ch]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
