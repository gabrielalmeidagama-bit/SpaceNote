export type NoteType = 'text' | 'todo' | 'image' | 'audio' | 'calendar';

export type NoteColor =
  | 'cyber-blue'
  | 'neon-emerald'
  | 'cosmic-purple'
  | 'amber-gold'
  | 'rose-crimson'
  | 'solar-yellow'
  | 'dark-monolith';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  version: number;
}

export interface Note {
  id: string;
  type: NoteType;
  title: string;
  content: string;
  todos: TodoItem[];
  imageUrl?: string;
  caption?: string;
  audioUrl?: string;
  audioDuration?: number;
  tags: string[];
  color: NoteColor;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isPinned: boolean;
  isEncrypted: boolean;
  encryptedData?: EncryptedData;
  reminderDate?: string; // Format: YYYY-MM-DD
  reminderTime?: string; // Format: HH:mm
  reminderCompleted?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NoteConnection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
}

export interface CanvasTransform {
  x: number;
  y: number;
  zoom: number;
}

export type ViewMode = 'spatial' | 'grid' | 'calendar';

export type SyncState = {
  roomId: string;
  status: 'connecting' | 'connected' | 'syncing' | 'offline' | 'error';
  peers: number;
  lastSyncTime: number | null;
  deviceId: string;
};

export interface VaultState {
  isConfigured: boolean;
  isUnlocked: boolean;
  passphrase?: string;
}
