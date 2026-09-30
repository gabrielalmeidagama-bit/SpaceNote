import React from 'react';
import {
  FileText,
  CheckSquare,
  Image as ImageIcon,
  Mic,
  LayoutGrid,
  RotateCcw,
  MapPin,
  Calendar,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  Maximize,
  Compass,
} from 'lucide-react';
import { NoteType } from '../types/note';

interface DockProps {
  zoom: number;
  showMinimap: boolean;
  isVaultUnlocked: boolean;
  isCalendarOpen?: boolean;
  isConnectingMode?: boolean;
  canUndoArrange?: boolean;
  undoCount?: number;
  onAddNote: (type: NoteType) => void;
  onAutoArrange: () => void;
  onUndoArrange?: () => void;
  onToggleConnectingMode?: () => void;
  onToggleMinimap: () => void;
  onToggleCalendar?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitAll: () => void;
  onOpenVault: () => void;
}

export const Dock: React.FC<DockProps> = ({
  zoom,
  showMinimap,
  isVaultUnlocked,
  isCalendarOpen = false,
  canUndoArrange = false,
  undoCount = 0,
  onAddNote,
  onAutoArrange,
  onUndoArrange,
  onToggleMinimap,
  onToggleCalendar,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitAll,
  onOpenVault,
}) => {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] overflow-x-auto p-1.5 bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center gap-1.5 text-zinc-300">
      {/* Primary Creation Tools */}
      <div className="flex items-center gap-1 pr-1 border-r border-zinc-800/80">
        <button
          onClick={() => onAddNote('text')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-800 hover:text-white transition-all text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 active:scale-95"
          title="Criar nova nota de texto flutuante"
        >
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Texto</span>
        </button>

        <button
          onClick={() => onAddNote('todo')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-800 hover:text-white transition-all text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 active:scale-95"
          title="Criar nova lista de tarefas com checklist"
        >
          <CheckSquare className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Tarefas</span>
        </button>

        <button
          onClick={() => onAddNote('image')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-800 hover:text-white transition-all text-purple-300 bg-purple-500/10 border border-purple-500/20 active:scale-95"
          title="Criar nova nota com imagem"
        >
          <ImageIcon className="w-4 h-4 text-purple-400" />
          <span className="hidden sm:inline">Imagem</span>
        </button>

        <button
          onClick={() => onAddNote('audio')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-800 hover:text-white transition-all text-amber-300 bg-amber-500/10 border border-amber-500/20 active:scale-95"
          title="Criar nova nota de voz ou áudio"
        >
          <Mic className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Áudio</span>
        </button>

        <button
          onClick={() => onAddNote('calendar')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-800 hover:text-white transition-all text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 active:scale-95"
          title="Criar nova nota de calendário no quadro"
        >
          <Calendar className="w-4 h-4 text-yellow-400" />
          <span className="hidden sm:inline">Calendário</span>
        </button>
      </div>

      {/* Spatial Actions */}
      <div className="flex items-center gap-1 px-1 border-r border-zinc-800/80">
        <button
          onClick={onAutoArrange}
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Organizar notas em matriz 2D inteligente"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        <button
          onClick={onUndoArrange}
          disabled={!canUndoArrange}
          className={`p-2 rounded-xl transition-all relative ${
            canUndoArrange
              ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/15 active:scale-95 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'text-zinc-600 opacity-30 cursor-not-allowed'
          }`}
          title={
            canUndoArrange
              ? `Desfazer última alteração: mover, redimensionar, deletar ou organizar (${undoCount}x restante${undoCount > 1 ? 's' : ''})`
              : 'Nenhuma alteração recente para desfazer'
          }
        >
          <RotateCcw className="w-4 h-4" />
          {canUndoArrange && undoCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-in fade-in zoom-in-75 duration-150">
              {undoCount}
            </span>
          )}
        </button>

        <button
          onClick={onToggleMinimap}
          className={`p-2 rounded-xl transition-colors ${
            showMinimap ? 'text-cyan-400 bg-zinc-800' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Alternar visibilidade do Minimapa"
        >
          <MapPin className="w-4 h-4" />
        </button>
      </div>

      {/* Vault */}
      <div className="flex items-center gap-1 px-1 border-r border-zinc-800/80">
        <button
          onClick={onOpenVault}
          className={`p-2 rounded-xl transition-colors ${
            isVaultUnlocked
              ? 'text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800'
              : 'text-amber-400 hover:text-amber-300 hover:bg-zinc-800'
          }`}
          title={isVaultUnlocked ? 'Cofre E2EE Desbloqueado' : 'Cofre E2EE Bloqueado (Configurar Senha Mestra)'}
        >
          {isVaultUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        </button>
      </div>

      {/* Zoom and Navigation */}
      <div className="flex items-center gap-1 pl-1">
        <button
          onClick={onZoomOut}
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Diminuir Zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={onResetZoom}
          className="px-2 py-1 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors min-w-[48px] text-center"
          title="Resetar Zoom para 100%"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={onZoomIn}
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Aumentar Zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={onFitAll}
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Ajustar todas as notas na tela"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
