import { NoteColor } from '../types/note';

export interface ColorScheme {
  id: NoteColor;
  name: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  headerBorder: string;
  glowShadow: string;
  accentColor: string;
  connectionColor: string;
}

export const NOTE_COLORS: Record<NoteColor, ColorScheme> = {
  'cyber-blue': {
    id: 'cyber-blue',
    name: 'Cyber Cyan',
    dotColor: '#06b6d4',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-300',
    borderColor: 'border-cyan-500/30 hover:border-cyan-400/50',
    headerBorder: 'border-cyan-500/20',
    glowShadow: 'shadow-[0_0_25px_rgba(6,182,212,0.15)]',
    accentColor: '#06b6d4',
    connectionColor: '#06b6d4',
  },
  'neon-emerald': {
    id: 'neon-emerald',
    name: 'Neon Emerald',
    dotColor: '#10b981',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-300',
    borderColor: 'border-emerald-500/30 hover:border-emerald-400/50',
    headerBorder: 'border-emerald-500/20',
    glowShadow: 'shadow-[0_0_25px_rgba(16,185,129,0.15)]',
    accentColor: '#10b981',
    connectionColor: '#10b981',
  },
  'cosmic-purple': {
    id: 'cosmic-purple',
    name: 'Cosmic Purple',
    dotColor: '#8b5cf6',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-300',
    borderColor: 'border-purple-500/30 hover:border-purple-400/50',
    headerBorder: 'border-purple-500/20',
    glowShadow: 'shadow-[0_0_25px_rgba(139,92,246,0.15)]',
    accentColor: '#8b5cf6',
    connectionColor: '#8b5cf6',
  },
  'amber-gold': {
    id: 'amber-gold',
    name: 'Amber Gold',
    dotColor: '#f59e0b',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-300',
    borderColor: 'border-amber-500/30 hover:border-amber-400/50',
    headerBorder: 'border-amber-500/20',
    glowShadow: 'shadow-[0_0_25px_rgba(245,158,11,0.15)]',
    accentColor: '#f59e0b',
    connectionColor: '#f59e0b',
  },
  'rose-crimson': {
    id: 'rose-crimson',
    name: 'Rose Crimson',
    dotColor: '#f43f5e',
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-300',
    borderColor: 'border-rose-500/30 hover:border-rose-400/50',
    headerBorder: 'border-rose-500/20',
    glowShadow: 'shadow-[0_0_25px_rgba(244,63,94,0.15)]',
    accentColor: '#f43f5e',
    connectionColor: '#f43f5e',
  },
  'solar-yellow': {
    id: 'solar-yellow',
    name: 'Solar Yellow',
    dotColor: '#eab308',
    badgeBg: 'bg-yellow-500/10',
    badgeText: 'text-yellow-300',
    borderColor: 'border-yellow-500/30 hover:border-yellow-400/50',
    headerBorder: 'border-yellow-500/20',
    glowShadow: 'shadow-[0_0_25px_rgba(234,179,8,0.15)]',
    accentColor: '#eab308',
    connectionColor: '#eab308',
  },
  'dark-monolith': {
    id: 'dark-monolith',
    name: 'Onyx Monolith',
    dotColor: '#64748b',
    badgeBg: 'bg-zinc-700/20',
    badgeText: 'text-zinc-300',
    borderColor: 'border-zinc-700/40 hover:border-zinc-500/50',
    headerBorder: 'border-zinc-800',
    glowShadow: 'shadow-[0_0_25px_rgba(100,116,139,0.1)]',
    accentColor: '#94a3b8',
    connectionColor: '#64748b',
  },
};
