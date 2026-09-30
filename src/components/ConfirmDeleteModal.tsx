import React, { useEffect } from 'react';
import { Note } from '../types/note';
import {
  Trash2,
  AlertTriangle,
  X,
  FileText,
  CheckSquare,
  ImageIcon,
  Mic,
  Calendar,
} from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedNotes: Note[];
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedNotes,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen || selectedNotes.length === 0) return null;

  const count = selectedNotes.length;

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
      case 'todo':
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-purple-400" />;
      case 'audio':
        return <Mic className="w-3.5 h-3.5 text-amber-400" />;
      case 'calendar':
        return <Calendar className="w-3.5 h-3.5 text-yellow-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-zinc-950 border border-rose-500/30 rounded-3xl shadow-[0_20px_60px_rgba(244,63,94,0.18),0_0_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Top Header / Warning Alert Banner */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Excluir {count} {count === 1 ? 'nota selecionada' : 'notas selecionadas'}?
              </h2>
              <p className="text-xs text-rose-300/80 font-mono">
                Confirmação de exclusão em massa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-xl transition-colors cursor-pointer"
            title="Cancelar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Você tem certeza de que deseja excluir as{' '}
            <strong className="text-white font-semibold">{count} notas selecionadas</strong> do quadro?
          </p>

          {/* Preview of Notes to be deleted */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Notas a serem removidas:
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 py-1 rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-2.5">
              {selectedNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-zinc-950/60 border border-zinc-800/50 text-xs text-zinc-200"
                >
                  <span className="shrink-0">{getNoteIcon(note.type)}</span>
                  <span className="truncate flex-1 font-medium">
                    {note.title || (note.type === 'calendar' ? 'Calendário' : 'Nota sem título')}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono shrink-0 uppercase">
                    {note.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-center gap-2 text-xs text-zinc-400">
            <span className="text-amber-400 font-bold">Dica:</span>
            <span>Você poderá desfazer a exclusão a qualquer momento pressionando <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">Ctrl+Z</kbd>.</span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancelar (Esc)
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Trash2 className="w-4 h-4" />
            <span>Sim, excluir {count} {count === 1 ? 'nota' : 'notas'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
