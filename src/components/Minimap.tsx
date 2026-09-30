import React, { useRef } from 'react';
import { Note, CanvasTransform } from '../types/note';
import { NOTE_COLORS } from '../services/theme';

interface MinimapProps {
  notes: Note[];
  transform: CanvasTransform;
  containerWidth: number;
  containerHeight: number;
  onNavigate: (x: number, y: number) => void;
  onClose?: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  notes,
  transform,
  containerWidth,
  containerHeight,
  onNavigate,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);

  // Compute bounding box of canvas
  let minX = -1000;
  let maxX = 2500;
  let minY = -800;
  let maxY = 2000;

  notes.forEach((n) => {
    if (n.x < minX) minX = n.x - 300;
    if (n.x + n.width > maxX) maxX = n.x + n.width + 300;
    if (n.y < minY) minY = n.y - 300;
    if (n.y + n.height > maxY) maxY = n.y + n.height + 300;
  });

  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;

  const mapWidth = 200;
  const mapHeight = 140;

  const scaleX = mapWidth / worldWidth;
  const scaleY = mapHeight / worldHeight;
  const scale = Math.min(scaleX, scaleY);

  // Viewport rect in world coordinates
  const viewportWorldX = -transform.x / transform.zoom;
  const viewportWorldY = -transform.y / transform.zoom;
  const viewportWorldW = containerWidth / transform.zoom;
  const viewportWorldH = containerHeight / transform.zoom;

  // Viewport rect in minimap coordinates
  const vpMapX = (viewportWorldX - minX) * scale;
  const vpMapY = (viewportWorldY - minY) * scale;
  const vpMapW = viewportWorldW * scale;
  const vpMapH = viewportWorldH * scale;

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap click to world coordinates
    const targetWorldX = minX + clickX / scale;
    const targetWorldY = minY + clickY / scale;

    // Center camera on clicked target
    const newCamX = -(targetWorldX * transform.zoom - containerWidth / 2);
    const newCamY = -(targetWorldY * transform.zoom - containerHeight / 2);

    onNavigate(newCamX, newCamY);
  };

  return (
    <div
      ref={mapRef}
      onClick={handleMinimapClick}
      className="relative w-[200px] h-[140px] bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 rounded-xl overflow-hidden shadow-2xl cursor-crosshair group transition-all hover:border-cyan-500/40"
      title="Minimapa Espacial - Clique para navegar rapidamente"
    >
      <div className="absolute top-1.5 left-2 text-[10px] uppercase font-mono tracking-wider text-zinc-500 pointer-events-none flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
        Radar Espacial
      </div>

      {/* Render Note Thumbnails */}
      {notes.map((note) => {
        const nx = (note.x - minX) * scale;
        const ny = (note.y - minY) * scale;
        const nw = Math.max(4, note.width * scale);
        const nh = Math.max(3, note.height * scale);
        const color = NOTE_COLORS[note.color]?.dotColor || '#06b6d4';

        return (
          <div
            key={note.id}
            className="absolute rounded-xs pointer-events-none transition-transform"
            style={{
              left: `${nx}px`,
              top: `${ny}px`,
              width: `${nw}px`,
              height: `${nh}px`,
              backgroundColor: color,
              opacity: 0.75,
              boxShadow: `0 0 4px ${color}`,
            }}
          />
        );
      })}

      {/* Viewport Camera Box */}
      <div
        className="absolute border border-cyan-400 bg-cyan-400/10 pointer-events-none rounded-xs transition-all shadow-[0_0_8px_rgba(6,182,212,0.3)]"
        style={{
          left: `${Math.max(0, vpMapX)}px`,
          top: `${Math.max(0, vpMapY)}px`,
          width: `${Math.min(mapWidth, Math.max(12, vpMapW))}px`,
          height: `${Math.min(mapHeight, Math.max(8, vpMapH))}px`,
        }}
      />
    </div>
  );
};
