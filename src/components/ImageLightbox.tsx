import React from 'react';
import { X, Download } from 'lucide-react';

interface ImageLightboxProps {
  isOpen: boolean;
  imageUrl: string;
  title: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  imageUrl,
  title,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
      >
        {/* Controls */}
        <div className="w-full flex items-center justify-between pb-3 text-zinc-300">
          <span className="text-sm font-semibold truncate">{title || 'Imagem'}</span>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              download="imagem-nota.png"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
              title="Baixar imagem"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image */}
        <img
          src={imageUrl}
          alt={title}
          className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-zinc-800"
        />
      </div>
    </div>
  );
};
