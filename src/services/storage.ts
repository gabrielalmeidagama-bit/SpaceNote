import { Note, NoteConnection, SyncState } from '../types/note';

const STORAGE_KEY_NOTES = 'magnific_space_notes_v1';
const STORAGE_KEY_CONNECTIONS = 'magnific_space_connections_v1';
const STORAGE_KEY_ROOM = 'magnific_space_room_id_v1';
const STORAGE_KEY_VAULT = 'magnific_space_vault_v1';
const STORAGE_KEY_DEVICE = 'magnific_space_device_id_v1';

export function getDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEY_DEVICE);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(STORAGE_KEY_DEVICE, id);
  }
  return id;
}

export function getStoredRoomId(): string {
  let room = localStorage.getItem(STORAGE_KEY_ROOM);
  if (!room) {
    // Generate clean 6-character room code like "SP-4982"
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    room = `SPACE-${randomCode}`;
    localStorage.setItem(STORAGE_KEY_ROOM, room);
  }
  return room;
}

export function setStoredRoomId(roomId: string): void {
  localStorage.setItem(STORAGE_KEY_ROOM, roomId.toUpperCase().trim());
}

export const INITIAL_DEMO_NOTES: Note[] = [
  {
    id: 'note-welcome',
    type: 'text',
    title: '✨ Bem-vindo ao Magnific Space',
    content: 'Este é o seu **bloco de notas espacial infinito** com notas flutuantes!\n\n• **Arraste o fundo** ou use dois dedos para navegar no espaço.\n• Use a **roda do mouse** ou o dock inferior para dar zoom.\n• Todas as notas são sincronizadas em **tempo real** entre o PC, Web e seu celular via código de sala e QR Code.\n• Ative a **Criptografia de Ponta a Ponta (E2EE)** no botão do cadeado para privacidade militar (AES-GCM 256 bits).',
    todos: [],
    tags: ['introdução', 'destaque'],
    color: 'cyber-blue',
    x: 100,
    y: 80,
    width: 380,
    height: 320,
    zIndex: 10,
    isPinned: true,
    isEncrypted: false,
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000,
  },
  {
    id: 'note-tasks',
    type: 'todo',
    title: '🎯 Metas & Lista de Tarefas',
    content: 'Prioridades da semana sincronizadas em todos os dispositivos:',
    todos: [
      { id: 't1', text: 'Conectar smartphone escaneando o QR Code', completed: false, priority: 'high' },
      { id: 't2', text: 'Configurar senha mestre no Cofre E2EE', completed: false, priority: 'medium' },
      { id: 't3', text: 'Agendar lembrete e sincronizar com Google Calendar', completed: true, priority: 'high' },
      { id: 't4', text: 'Organizar notas espaciais com etiquetas personalizadas', completed: false, priority: 'low' },
      { id: 't5', text: 'Experimentar o modo espacial em tela cheia', completed: true, priority: 'medium' },
    ],
    tags: ['tarefas', 'produtividade'],
    color: 'neon-emerald',
    x: 520,
    y: 80,
    width: 360,
    height: 380,
    zIndex: 11,
    isPinned: false,
    isEncrypted: false,
    reminderDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    reminderTime: '14:30',
    createdAt: Date.now() - 80000,
    updatedAt: Date.now() - 50000,
  },
  {
    id: 'note-image',
    type: 'image',
    title: '🌌 Inspiração Visual',
    content: 'Conceito visual para layout espacial escuro e responsivo.\n\nAgora você pode escrever notas de texto completas diretamente abaixo de qualquer imagem anexada!',
    imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80',
    caption: 'Nebulosa Cósmica - Conceito de Espaço Infinito',
    todos: [],
    tags: ['design', 'ideias'],
    color: 'cosmic-purple',
    x: 920,
    y: 80,
    width: 380,
    height: 440,
    zIndex: 12,
    isPinned: false,
    isEncrypted: false,
    createdAt: Date.now() - 60000,
    updatedAt: Date.now() - 60000,
  },
  {
    id: 'note-calendar',
    type: 'text',
    title: '📅 Reunião de Planejamento',
    content: 'Revisão estratégica de sprint e alinhamento de roadmap.\n\n• Integração direta com Google Calendar\n• Exportação para arquivo universal (.ics)\n• Notificações e avisos sonoros no horário marcado.',
    todos: [],
    tags: ['trabalho', 'reunião'],
    color: 'amber-gold',
    x: 320,
    y: 440,
    width: 350,
    height: 270,
    zIndex: 13,
    isPinned: false,
    isEncrypted: false,
    reminderDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    reminderTime: '10:00',
    createdAt: Date.now() - 40000,
    updatedAt: Date.now() - 40000,
  },
];

export const INITIAL_CONNECTIONS: NoteConnection[] = [
  {
    id: 'conn-1',
    fromId: 'note-welcome',
    toId: 'note-tasks',
    label: 'fluxo',
    color: '#06b6d4',
  },
  {
    id: 'conn-2',
    fromId: 'note-tasks',
    toId: 'note-calendar',
    label: 'agendado',
    color: '#10b981',
  },
];

export function loadLocalNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    if (!raw) {
      saveLocalNotes(INITIAL_DEMO_NOTES);
      return INITIAL_DEMO_NOTES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_NOTES;
  } catch (err) {
    console.error('Failed to load local notes:', err);
    return INITIAL_DEMO_NOTES;
  }
}

export function saveLocalNotes(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  } catch (err) {
    console.error('Failed to save notes locally:', err);
  }
}

export function loadLocalConnections(): NoteConnection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONNECTIONS);
    if (!raw) {
      saveLocalConnections(INITIAL_CONNECTIONS);
      return INITIAL_CONNECTIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CONNECTIONS;
  }
}

export function saveLocalConnections(connections: NoteConnection[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONNECTIONS, JSON.stringify(connections));
  } catch (err) {
    console.error('Failed to save connections locally:', err);
  }
}

export function loadVaultState(): { isConfigured: boolean; hash?: string; salt?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VAULT);
    return raw ? JSON.parse(raw) : { isConfigured: false };
  } catch {
    return { isConfigured: false };
  }
}

export function saveVaultState(state: { isConfigured: boolean; hash?: string; salt?: string }): void {
  try {
    localStorage.setItem(STORAGE_KEY_VAULT, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save vault state:', err);
  }
}
