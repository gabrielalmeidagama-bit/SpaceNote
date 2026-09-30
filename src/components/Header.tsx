import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Wifi,
  Lock,
  Unlock,
  Calendar,
  Grid,
  Sparkles,
  QrCode,
  Tag as TagIcon,
  Bell,
  X,
  Layers,
} from 'lucide-react';
import { SyncState, ViewMode, NoteType } from '../types/note';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  selectedType: NoteType | 'all';
  onSelectType: (type: NoteType | 'all') => void;
  availableTags: string[];
  syncState: SyncState;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  isVaultUnlocked: boolean;
  upcomingRemindersCount: number;
  isCalendarOpen?: boolean;
  onOpenSyncModal: () => void;
  onOpenVaultModal: () => void;
  onToggleCalendar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedTag,
  onSelectTag,
  selectedType,
  onSelectType,
  availableTags,
  syncState,
  viewMode,
  onViewModeChange,
  isVaultUnlocked,
  upcomingRemindersCount,
  isCalendarOpen = false,
  onOpenSyncModal,
  onOpenVaultModal,
  onToggleCalendar,
}) => {
  const [showTagMenu, setShowTagMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 px-4 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 flex items-center justify-between gap-3 text-zinc-200">
      {/* Brand & Space Status */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 via-indigo-500 to-purple-600 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-sm tracking-wider bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              MAGNIFIC
            </span>
            <span className="text-xs font-mono ml-1 text-cyan-400 font-medium">
              SPACE
            </span>
          </div>
        </div>

        {/* Sync Room Status Pill */}
        <button
          onClick={onOpenSyncModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono transition-all group"
          title="Sincronização em tempo real entre PC, Web e Smartphone"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-zinc-300 font-semibold group-hover:text-cyan-400 transition-colors">
            {syncState.roomId}
          </span>
          <QrCode className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 ml-0.5" />
        </button>
      </div>

      {/* Middle: Search & Filter */}
      <div className="flex-1 max-w-md mx-2 flex items-center gap-2">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por palavras-chave, títulos ou conteúdos..."
            className="w-full pl-9 pr-8 py-1.5 bg-zinc-900/90 border border-zinc-800/90 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tags Selector Dropdown */}
        {availableTags.length > 0 && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowTagMenu(!showTagMenu)}
              className={`p-2 rounded-xl border text-xs transition-colors flex items-center gap-1 ${
                selectedTag
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Filtrar por etiqueta"
            >
              <TagIcon className="w-3.5 h-3.5" />
              {selectedTag && <span className="text-[11px] font-mono">#{selectedTag}</span>}
            </button>

            {showTagMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1.5 w-44 p-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 text-xs space-y-1 animate-in fade-in"
              >
                <button
                  onClick={() => {
                    onSelectTag(null);
                    setShowTagMenu(false);
                  }}
                  className={`w-full px-2.5 py-1 rounded text-left transition-colors ${
                    !selectedTag ? 'bg-zinc-800 text-cyan-300' : 'text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  Todas as etiquetas
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      onSelectTag(tag);
                      setShowTagMenu(false);
                    }}
                    className={`w-full px-2.5 py-1 rounded text-left transition-colors truncate ${
                      selectedTag === tag ? 'bg-cyan-500/15 text-cyan-300' : 'text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* View Switcher: Spatial vs Grid */}
        <div className="hidden md:flex items-center p-0.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs">
          <button
            onClick={() => onViewModeChange('spatial')}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'spatial' ? 'bg-zinc-800 text-cyan-300 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Espaço Infinito Flutuante (Estilo Magnific Space)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Espaço</span>
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'grid' ? 'bg-zinc-800 text-cyan-300 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Visualização em Grade Organizada"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grade</span>
          </button>
        </div>

        {/* Reminders / Calendar trigger */}
        <button
          onClick={onToggleCalendar}
          className={`relative p-2 rounded-xl border transition-colors ${
            isCalendarOpen
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-amber-400'
          }`}
          title="Ver Calendário Geral & Lembretes em tela cheia"
        >
          <Calendar className="w-4 h-4" />
          {upcomingRemindersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center shadow-xs">
              {upcomingRemindersCount}
            </span>
          )}
        </button>

        {/* E2EE Vault button */}
        <button
          onClick={onOpenVaultModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
            isVaultUnlocked
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Criptografia de Ponta a Ponta (E2EE)"
        >
          {isVaultUnlocked ? (
            <>
              <Unlock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">E2EE Ativo</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cofre</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
