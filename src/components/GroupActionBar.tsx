import React, { useState } from 'react';
import { NoteColor } from '../types/note';
import { NOTE_COLORS } from '../services/theme';
import {
  Layers,
  LayoutGrid,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Palette,
  Trash2,
  X,
  Move,
} from 'lucide-react';

interface GroupActionBarProps {
  selectedCount: number;
  onAlignHorizontal: () => void;
  onAlignVertical: () => void;
  onAlignGrid: () => void;
  onChangeColor: (color: NoteColor) => void;
  onDeleteSelected: () => void;
  onDeselectAll: () => void;
}

export const GroupActionBar: React.FC<GroupActionBarProps> = ({
  selectedCount,
  onAlignHorizontal,
  onAlignVertical,
  onAlignGrid,
  onChangeColor,
  onDeleteSelected,
  onDeselectAll,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (selectedCount <= 1) return null;

  return (
    <div className="fixed top-18 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] px-4 py-2 bg-zinc-950/95 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl shadow-[0_10px_35px_rgba(6,182,212,0.25)] flex items-center gap-3 text-xs text-zinc-200 animate-in fade-in slide-in-from-top-3 duration-200">
      {/* Selected Counter Badge */}
      <div className="flex items-center gap-1.5 font-semibold text-cyan-300 pr-2 border-r border-zinc-800">
        <Layers className="w-4 h-4 text-cyan-400" />
        <span>{selectedCount} notas selecionadas</span>
      </div>

      {/* Movement Tip */}
      <div className="hidden lg:flex items-center gap-1 text-[11px] text-zinc-400 pr-2 border-r border-zinc-800">
        <Move className="w-3.5 h-3.5 text-zinc-500" />
        <span>Arraste qualquer uma para mover o grupo</span>
      </div>

      {/* Group Alignment Actions */}
      <div className="flex items-center gap-1 pr-2 border-r border-zinc-800">
        <button
          onClick={onAlignHorizontal}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
          title="Alinhar notas em linha horizontal"
        >
          <AlignHorizontalDistributeCenter className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Linha</span>
        </button>

        <button
          onClick={onAlignVertical}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
          title="Alinhar notas em coluna vertical"
        >
          <AlignVerticalDistributeCenter className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Coluna</span>
        </button>

        <button
          onClick={onAlignGrid}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
          title="Organizar grupo em grade compacta"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Grade</span>
        </button>
      </div>

      {/* Batch Color Change */}
      <div className="relative pr-2 border-r border-zinc-800">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
          title="Mudar cor de todas as notas selecionadas"
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Cor</span>
        </button>

        {showColorPicker && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-2 p-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex items-center gap-1.5 z-50 animate-in fade-in"
          >
            {Object.entries(NOTE_COLORS).map(([key, col]) => (
              <button
                key={key}
                onClick={() => {
                  onChangeColor(key as NoteColor);
                  setShowColorPicker(false);
                }}
                className="w-5 h-5 rounded-full transition-transform hover:scale-125 border border-zinc-700 hover:border-white"
                style={{ backgroundColor: col.dotColor }}
                title={col.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Group */}
      <button
        onClick={onDeleteSelected}
        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
        title="Excluir notas selecionadas"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Excluir</span>
      </button>

      {/* Deselect All */}
      <button
        onClick={onDeselectAll}
        className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ml-1"
        title="Desmarcar todas (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
