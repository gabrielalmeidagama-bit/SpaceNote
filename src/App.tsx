import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Note,
  NoteColor,
  NoteConnection,
  NoteType,
  CanvasTransform,
  ViewMode,
  SyncState,
} from './types/note';
import {
  loadLocalNotes,
  saveLocalNotes,
  loadLocalConnections,
  saveLocalConnections,
  getStoredRoomId,
  setStoredRoomId,
  getDeviceId,
  loadVaultState,
  saveVaultState,
} from './services/storage';
import {
  playChimeSound,
  triggerReminderNotification,
  requestNotificationPermission,
} from './services/calendar';
import { encryptNotePayload, decryptNotePayload } from './services/crypto';
import { Canvas } from './components/Canvas';
import { Dock } from './components/Dock';
import { Header } from './components/Header';
import { Minimap } from './components/Minimap';
import { SyncModal } from './components/SyncModal';
import { VaultModal } from './components/VaultModal';
import { CalendarModal } from './components/CalendarModal';
import { ImageLightbox } from './components/ImageLightbox';
import { GroupActionBar } from './components/GroupActionBar';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';

export default function App() {
  // Device & Room identity
  const deviceId = useMemo(() => getDeviceId(), []);
  const [roomId, setRoomId] = useState<string>(() => {
    // Check if ?room= query parameter was passed (e.g. from QR Code scan on mobile)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom) {
        setStoredRoomId(urlRoom);
        return urlRoom.toUpperCase();
      }
    }
    return getStoredRoomId();
  });

  // Notes & Connections state
  const [notes, setNotes] = useState<Note[]>(() => loadLocalNotes());
  const [connections, setConnections] = useState<NoteConnection[]>(() => loadLocalConnections());

  // Canvas Viewport transform
  const [transform, setTransform] = useState<CanvasTransform>({
    x: typeof window !== 'undefined' ? Math.max(20, (window.innerWidth - 1300) / 2) : 50,
    y: 100,
    zoom: 1,
  });

  // UI States
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<NoteType | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('spatial');
  const [showMinimap, setShowMinimap] = useState<boolean>(true);

  // Connection mode (connecting two notes with glowing bezier)
  const [isConnectingMode, setIsConnectingMode] = useState<boolean>(false);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  // Modals
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState<boolean>(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState<boolean>(false);
  const [lightboxData, setLightboxData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
  });

  // History stack for complete undo (moving, resizing, deleting, organizing - up to 3 levels)
  const [historyStack, setHistoryStack] = useState<{ notes: Note[]; connections: NoteConnection[] }[]>([]);

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>({
    roomId,
    status: 'connecting',
    peers: 1,
    lastSyncTime: null,
    deviceId,
  });

  // E2EE Vault state
  const [vaultConfig, setVaultConfig] = useState(() => loadVaultState());
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [vaultPassphrase, setVaultPassphrase] = useState<string>('');

  // Track changes to prevent infinite sync echo
  const isIncomingSyncRef = useRef<boolean>(false);
  const sseRef = useRef<EventSource | null>(null);

  // Persistence to localStorage
  useEffect(() => {
    saveLocalNotes(notes);
  }, [notes]);

  useEffect(() => {
    saveLocalConnections(connections);
  }, [connections]);

  // Request notification permissions on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Periodic reminder notification check
  useEffect(() => {
    const notifiedMap = new Set<string>();

    const checkReminders = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      notes.forEach((n) => {
        if (n.reminderDate === todayStr && n.reminderTime === currentTimeStr) {
          const key = `${n.id}-${todayStr}-${currentTimeStr}`;
          if (!notifiedMap.has(key)) {
            notifiedMap.add(key);
            triggerReminderNotification(n);
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 25000);
    return () => clearInterval(interval);
  }, [notes]);

  // Real-Time Multi-Device Sync (SSE + REST API)
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSync = () => {
      try {
        eventSource = new EventSource(`/api/sync/${roomId}/events`);
        sseRef.current = eventSource;

        eventSource.addEventListener('init', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (Array.isArray(data.notes) && data.notes.length > 0) {
              isIncomingSyncRef.current = true;
              setNotes(data.notes);
              if (Array.isArray(data.connections)) {
                setConnections(data.connections);
              }
              setTimeout(() => {
                isIncomingSyncRef.current = false;
              }, 100);
            }
            setSyncState((prev) => ({
              ...prev,
              status: 'connected',
              peers: data.peers || 1,
              lastSyncTime: data.timestamp || Date.now(),
            }));
          } catch (err) {
            console.error('Failed to parse init sync data:', err);
          }
        });

        eventSource.addEventListener('sync', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            // Ignore updates originating from this device
            if (data.deviceId === deviceId) return;

            if (Array.isArray(data.notes)) {
              isIncomingSyncRef.current = true;
              setNotes(data.notes);
              if (Array.isArray(data.connections)) {
                setConnections(data.connections);
              }
              setTimeout(() => {
                isIncomingSyncRef.current = false;
              }, 100);
            }
            setSyncState((prev) => ({
              ...prev,
              peers: data.peers || prev.peers,
              lastSyncTime: data.timestamp || Date.now(),
            }));
          } catch (err) {
            console.error('Failed to process sync event:', err);
          }
        });

        eventSource.addEventListener('peer', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setSyncState((prev) => ({
              ...prev,
              peers: data.peers || 1,
            }));
          } catch {}
        });

        eventSource.onerror = () => {
          setSyncState((prev) => ({ ...prev, status: 'offline' }));
          eventSource?.close();
          // Retry connection after 5 seconds
          setTimeout(connectSync, 5000);
        };
      } catch (err) {
        setSyncState((prev) => ({ ...prev, status: 'offline' }));
      }
    };

    connectSync();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [roomId, deviceId]);

  // Broadcast local changes to peers in room
  const broadcastChanges = useCallback(
    async (updatedNotes: Note[], updatedConnections: NoteConnection[]) => {
      if (isIncomingSyncRef.current) return;
      try {
        await fetch(`/api/sync/${roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: updatedNotes,
            connections: updatedConnections,
            deviceId,
            timestamp: Date.now(),
          }),
        });
      } catch (err) {
        // Offline or transient error
      }
    },
    [roomId, deviceId]
  );

  // Debounced sync broadcast
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueSync = useCallback(
    (newNotes: Note[], newConns: NoteConnection[]) => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        broadcastChanges(newNotes, newConns);
      }, 300);
    },
    [broadcastChanges]
  );

  // Change room
  const handleJoinRoom = (newRoom: string) => {
    setRoomId(newRoom);
    setStoredRoomId(newRoom);
    setSyncState((prev) => ({ ...prev, roomId: newRoom, status: 'connecting' }));
    // Update URL query param without full reload
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoom);
    window.history.pushState({}, '', url.toString());
  };

  const handleForceSync = async () => {
    await broadcastChanges(notes, connections);
  };

  // Note CRUD Handlers
  const handleAddNote = (
    type: NoteType,
    customWorldX?: number,
    customWorldY?: number,
    initialData?: Partial<Note>
  ) => {
    // Position note near the center of the current screen view or at custom click position
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const worldX =
      customWorldX !== undefined
        ? Math.round(customWorldX)
        : Math.round((screenCenterX - transform.x) / transform.zoom - 180);
    const worldY =
      customWorldY !== undefined
        ? Math.round(customWorldY)
        : Math.round((screenCenterY - transform.y) / transform.zoom - 150);

    const colors: NoteColor[] = [
      'cyber-blue',
      'neon-emerald',
      'cosmic-purple',
      'amber-gold',
      'rose-crimson',
      'solar-yellow',
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    let defaultTitle = 'Nova Nota';
    let defaultContent = '';
    if (type === 'todo') {
      defaultTitle = initialData?.title || 'Lista de Tarefas';
      defaultContent = '';
    } else if (type === 'image') {
      defaultTitle = initialData?.title || 'Nova Imagem';
    } else if (type === 'audio') {
      defaultTitle = initialData?.title || 'Nota de Voz / Áudio';
    } else if (type === 'calendar') {
      defaultTitle = 'Calendário';
    }

    const defaultWidth =
      type === 'calendar' ? 460 : type === 'image' ? 380 : type === 'audio' ? 360 : 340;
    const defaultHeight =
      type === 'calendar' ? 520 : type === 'image' ? 440 : type === 'audio' ? 350 : 300;

    const newNote: Note = {
      id: (type === 'calendar' ? 'calendar_' : 'note_') + Math.random().toString(36).substring(2, 9),
      type,
      title: defaultTitle,
      content: defaultContent,
      todos:
        type === 'todo'
          ? (initialData?.todos || [])
          : [],
      imageUrl: undefined,
      caption: undefined,
      audioUrl: undefined,
      audioDuration: undefined,
      tags: type === 'calendar' ? ['calendario'] : [],
      color: type === 'calendar' ? 'amber-gold' : type === 'audio' ? 'amber-gold' : randomColor,
      x: worldX,
      y: worldY,
      width: defaultWidth,
      height: defaultHeight,
      zIndex: Math.max(...notes.map((n) => n.zIndex || 0), 10) + 1,
      isPinned: false,
      isEncrypted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...initialData,
    };

    pushHistorySnapshot();
    const nextNotes = [newNote, ...notes];
    setNotes(nextNotes);
    setSelectedNoteIds([newNote.id]);
    queueSync(nextNotes, connections);
  };

  const handleSelectNote = (id: string | null, isMulti?: boolean) => {
    if (!id) {
      setSelectedNoteIds([]);
      return;
    }
    if (isMulti) {
      setSelectedNoteIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setSelectedNoteIds([id]);
    }
  };

  const handleSelectMultipleNotes = (ids: string[]) => {
    setSelectedNoteIds(ids);
  };

  const handleUpdateNote = (id: string, updated: Partial<Note>) => {
    setNotes((prevNotes) => {
      const nextNotes = prevNotes.map((n) => {
        if (n.id === id) {
          return { ...n, ...updated, updatedAt: Date.now() };
        }
        return n;
      });
      queueSync(nextNotes, connections);
      return nextNotes;
    });
  };

  const handleUpdateMultipleNotes = (updates: { id: string; x: number; y: number }[]) => {
    const updateMap = new Map(updates.map((u) => [u.id, { x: u.x, y: u.y }]));
    setNotes((prevNotes) => {
      const nextNotes = prevNotes.map((n) => {
        if (n.isPinned) return n; // Pinned notes remain anchored and cannot be moved
        const pos = updateMap.get(n.id);
        if (pos) {
          return { ...n, x: pos.x, y: pos.y, updatedAt: Date.now() };
        }
        return n;
      });
      queueSync(nextNotes, connections);
      return nextNotes;
    });
  };

  // Helper to push a snapshot of the board state to history (up to 3 levels)
  const pushHistorySnapshot = (customNotes?: Note[], customConnections?: NoteConnection[]) => {
    const snap = {
      notes: (customNotes || notes).map((n) => ({ ...n })),
      connections: (customConnections || connections).map((c) => ({ ...c })),
    };
    setHistoryStack((prev) => [snap, ...prev].slice(0, 3));
  };

  const handleDeleteNote = (id: string) => {
    pushHistorySnapshot();
    const nextNotes = notes.filter((n) => n.id !== id);
    const nextConns = connections.filter((c) => c.fromId !== id && c.toId !== id);
    setNotes(nextNotes);
    setConnections(nextConns);
    setSelectedNoteIds((prev) => prev.filter((i) => i !== id));
    queueSync(nextNotes, nextConns);
  };

  // Group batch actions
  const handleBatchAlignHorizontal = () => {
    if (selectedNoteIds.length <= 1) return;
    const selected = notes.filter((n) => selectedNoteIds.includes(n.id) && !n.isPinned);
    if (selected.length <= 1) return;
    pushHistorySnapshot();
    selected.sort((a, b) => a.x - b.x);

    const GAP = 32;
    const avgY = Math.round(selected.reduce((sum, n) => sum + n.y, 0) / selected.length);
    const startX = selected[0].x;

    let currentX = startX;
    const posMap = new Map<string, number>();
    selected.forEach((n) => {
      posMap.set(n.id, currentX);
      currentX += n.width + GAP;
    });

    const nextNotes = notes.map((n) => {
      if (n.isPinned) return n;
      const newX = posMap.get(n.id);
      if (newX !== undefined) {
        return { ...n, x: newX, y: avgY, updatedAt: Date.now() };
      }
      return n;
    });

    setNotes(nextNotes);
    queueSync(nextNotes, connections);
  };

  const handleBatchAlignVertical = () => {
    if (selectedNoteIds.length <= 1) return;
    const selected = notes.filter((n) => selectedNoteIds.includes(n.id) && !n.isPinned);
    if (selected.length <= 1) return;
    pushHistorySnapshot();
    selected.sort((a, b) => a.y - b.y);

    const GAP = 32;
    const avgX = Math.round(selected.reduce((sum, n) => sum + n.x, 0) / selected.length);
    const startY = selected[0].y;

    let currentY = startY;
    const posMap = new Map<string, number>();
    selected.forEach((n) => {
      posMap.set(n.id, currentY);
      currentY += n.height + GAP;
    });

    const nextNotes = notes.map((n) => {
      if (n.isPinned) return n;
      const newY = posMap.get(n.id);
      if (newY !== undefined) {
        return { ...n, x: avgX, y: newY, updatedAt: Date.now() };
      }
      return n;
    });

    setNotes(nextNotes);
    queueSync(nextNotes, connections);
  };

  const handleBatchAlignGrid = () => {
    if (selectedNoteIds.length <= 1) return;
    const selected = notes.filter((n) => selectedNoteIds.includes(n.id) && !n.isPinned);
    if (selected.length <= 1) return;
    pushHistorySnapshot();
    selected.sort((a, b) => {
      const rA = Math.round(a.y / 150);
      const rB = Math.round(b.y / 150);
      if (rA !== rB) return rA - rB;
      return a.x - b.x;
    });

    const GAP = 32;
    const cols = Math.max(2, Math.ceil(Math.sqrt(selected.length)));
    const rows = Math.ceil(selected.length / cols);
    const startX = Math.min(...selected.map((n) => n.x));
    const startY = Math.min(...selected.map((n) => n.y));

    const colWidths = new Array(cols).fill(0);
    const rowHeights = new Array(rows).fill(0);

    selected.forEach((note, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      colWidths[col] = Math.max(colWidths[col], note.width);
      rowHeights[row] = Math.max(rowHeights[row], note.height);
    });

    const colOffsets: number[] = [0];
    for (let c = 0; c < cols - 1; c++) {
      colOffsets.push(colOffsets[c] + colWidths[c] + GAP);
    }

    const rowOffsets: number[] = [0];
    for (let r = 0; r < rows - 1; r++) {
      rowOffsets.push(rowOffsets[r] + rowHeights[r] + GAP);
    }

    const posMap = new Map<string, { x: number; y: number }>();
    selected.forEach((note, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      posMap.set(note.id, {
        x: Math.round(startX + colOffsets[col]),
        y: Math.round(startY + rowOffsets[row]),
      });
    });

    const nextNotes = notes.map((n) => {
      if (n.isPinned) return n;
      const pos = posMap.get(n.id);
      if (pos) {
        return {
          ...n,
          x: pos.x,
          y: pos.y,
          updatedAt: Date.now(),
        };
      }
      return n;
    });

    setNotes(nextNotes);
    queueSync(nextNotes, connections);
  };

  const handleBatchChangeColor = (color: NoteColor) => {
    const nextNotes = notes.map((n) => {
      if (selectedNoteIds.includes(n.id)) {
        return { ...n, color, updatedAt: Date.now() };
      }
      return n;
    });
    setNotes(nextNotes);
    queueSync(nextNotes, connections);
  };

  const handleConfirmBatchDelete = () => {
    if (selectedNoteIds.length === 0) return;
    pushHistorySnapshot();
    const nextNotes = notes.filter((n) => !selectedNoteIds.includes(n.id));
    const nextConns = connections.filter(
      (c) => !selectedNoteIds.includes(c.fromId) && !selectedNoteIds.includes(c.toId)
    );
    setNotes(nextNotes);
    setConnections(nextConns);
    setSelectedNoteIds([]);
    setIsConfirmDeleteModalOpen(false);
    queueSync(nextNotes, nextConns);
  };

  const handleRequestBatchDelete = () => {
    if (selectedNoteIds.length === 0) return;
    if (selectedNoteIds.length > 1) {
      setIsConfirmDeleteModalOpen(true);
    } else {
      handleConfirmBatchDelete();
    }
  };

  const handleDuplicateNote = (source: Note) => {
    const newNote: Note = {
      ...source,
      id: 'note_' + Math.random().toString(36).substring(2, 9),
      title: `${source.title} (Cópia)`,
      x: source.x + 30,
      y: source.y + 30,
      zIndex: Math.max(...notes.map((n) => n.zIndex || 0), 10) + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const nextNotes = [newNote, ...notes];
    setNotes(nextNotes);
    setSelectedNoteIds([newNote.id]);
    queueSync(nextNotes, connections);
  };

  // Swap places between two notes (in grid order and 2D spatial coordinates)
  const handleSwapNotes = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    pushHistorySnapshot();
    setNotes((prevNotes) => {
      const sourceIndex = prevNotes.findIndex((n) => n.id === sourceId);
      const targetIndex = prevNotes.findIndex((n) => n.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prevNotes;

      const updated = [...prevNotes];
      const sourceNote = updated[sourceIndex];
      const targetNote = updated[targetIndex];

      // Swap array positions and their spatial coordinates
      updated[sourceIndex] = {
        ...targetNote,
        x: sourceNote.x,
        y: sourceNote.y,
        updatedAt: Date.now(),
      };
      updated[targetIndex] = {
        ...sourceNote,
        x: targetNote.x,
        y: targetNote.y,
        updatedAt: Date.now(),
      };

      queueSync(updated, connections);
      return updated;
    });
  };

  // Connection between notes
  const handleStartConnection = (fromId: string) => {
    setIsConnectingMode(true);
    setConnectingSourceId(fromId);
  };

  const handleCompleteConnection = (toId: string) => {
    if (!connectingSourceId || connectingSourceId === toId) {
      setIsConnectingMode(false);
      setConnectingSourceId(null);
      return;
    }

    // Check if already exists
    const exists = connections.some(
      (c) =>
        (c.fromId === connectingSourceId && c.toId === toId) ||
        (c.fromId === toId && c.toId === connectingSourceId)
    );

    if (!exists) {
      const fromNote = notes.find((n) => n.id === connectingSourceId);
      const newConn: NoteConnection = {
        id: 'conn_' + Math.random().toString(36).substring(2, 9),
        fromId: connectingSourceId,
        toId,
        color: fromNote ? undefined : '#06b6d4',
      };
      const nextConns = [...connections, newConn];
      setConnections(nextConns);
      queueSync(notes, nextConns);
    }

    setIsConnectingMode(false);
    setConnectingSourceId(null);
  };

  const handleDeleteConnection = (connId: string) => {
    const nextConns = connections.filter((c) => c.id !== connId);
    setConnections(nextConns);
    queueSync(notes, nextConns);
  };

  // Zoom and Spatial Navigation helpers
  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      zoom: Math.min(2.5, prev.zoom + 0.15),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      zoom: Math.max(0.2, prev.zoom - 0.15),
    }));
  };

  const handleResetZoom = () => {
    setTransform((prev) => ({
      ...prev,
      zoom: 1,
    }));
  };

  const handleFitAll = () => {
    if (notes.length === 0) {
      setTransform({ x: 50, y: 100, zoom: 1 });
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    notes.forEach((n) => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + n.width);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const padding = 120;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const scaleX = window.innerWidth / width;
    const scaleY = window.innerHeight / height;
    const targetZoom = Math.min(1.5, Math.max(0.3, Math.min(scaleX, scaleY)));

    const newX = (window.innerWidth - width * targetZoom) / 2 - minX * targetZoom + padding * targetZoom;
    const newY = (window.innerHeight - height * targetZoom) / 2 - minY * targetZoom + padding * targetZoom;

    setTransform({
      x: Math.round(newX),
      y: Math.round(newY),
      zoom: targetZoom,
    });
  };

  // Auto-Arrange: Organizes notes using the top-left note as Point Zero (0, 0 anchor)
  const handleAutoArrange = () => {
    const unpinned = notes.filter((n) => !n.isPinned);
    if (unpinned.length <= 1) return;

    // Save snapshot of all note positions before auto-arranging (up to 3 undo levels)
    pushHistorySnapshot();

    const pinned = notes.filter((n) => n.isPinned);
    const GAP = 28;

    // 1. Identify the top-left note (closest to top-left corner)
    const minX = Math.min(...unpinned.map((n) => n.x));
    const minY = Math.min(...unpinned.map((n) => n.y));

    const topLeftNote = [...unpinned].sort((a, b) => {
      const distA = Math.hypot(a.x - minX, a.y - minY);
      const distB = Math.hypot(b.x - minX, b.y - minY);
      if (Math.abs(distA - distB) > 8) return distA - distB;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    })[0];

    // The top-left note becomes the origin / Point Zero (it stays in place)
    const anchorX = topLeftNote.x;
    const anchorY = topLeftNote.y;

    // 2. Cluster unpinned notes into natural horizontal rows based on vertical proximity
    const sortedByY = [...unpinned].sort((a, b) => a.y - b.y);
    const rowsList: Note[][] = [];

    sortedByY.forEach((note) => {
      let targetRow: Note[] | undefined;
      for (const row of rowsList) {
        const avgY = row.reduce((sum, n) => sum + n.y, 0) / row.length;
        if (Math.abs(note.y - avgY) < 140) {
          targetRow = row;
          break;
        }
      }
      if (targetRow) {
        targetRow.push(note);
      } else {
        rowsList.push([note]);
      }
    });

    // Sort rows from top to bottom by average Y
    rowsList.sort((rowA, rowB) => {
      const avgA = rowA.reduce((sum, n) => sum + n.y, 0) / rowA.length;
      const avgB = rowB.reduce((sum, n) => sum + n.y, 0) / rowB.length;
      return avgA - avgB;
    });

    // Sort notes within each row from left to right by X
    rowsList.forEach((row) => row.sort((a, b) => a.x - b.x));

    // Ensure the row containing topLeftNote is row 0, and topLeftNote is its first item
    const topRowIndex = rowsList.findIndex((row) => row.some((n) => n.id === topLeftNote.id));
    if (topRowIndex > 0) {
      const [topRow] = rowsList.splice(topRowIndex, 1);
      rowsList.unshift(topRow);
    }
    if (rowsList[0] && rowsList[0][0].id !== topLeftNote.id) {
      rowsList[0] = [
        topLeftNote,
        ...rowsList[0].filter((n) => n.id !== topLeftNote.id),
      ];
    }

    // Fallback: If only 1 row detected with > 4 notes, break into a balanced 2D grid
    let effectiveRows = rowsList;
    if (rowsList.length === 1 && unpinned.length >= 4) {
      const spanX = Math.max(300, Math.max(...unpinned.map((n) => n.x + n.width)) - minX);
      const spanY = Math.max(200, Math.max(...unpinned.map((n) => n.y + n.height)) - minY);
      const aspect = spanX / spanY;
      const cols = Math.max(2, Math.min(5, Math.ceil(Math.sqrt(unpinned.length * Math.max(0.8, aspect)))));
      const allSorted = rowsList[0];
      effectiveRows = [];
      for (let i = 0; i < allSorted.length; i += cols) {
        effectiveRows.push(allSorted.slice(i, i + cols));
      }
    }

    const numRows = effectiveRows.length;
    const numCols = Math.max(...effectiveRows.map((r) => r.length));

    // 3. Calculate max width for each column and max height for each row
    const colWidths = new Array(numCols).fill(0);
    const rowHeights = new Array(numRows).fill(0);

    effectiveRows.forEach((row, r) => {
      row.forEach((note, c) => {
        colWidths[c] = Math.max(colWidths[c], note.width);
        rowHeights[r] = Math.max(rowHeights[r], note.height);
      });
    });

    // 4. Compute prefix offsets so columns & rows are aligned with zero overlap
    const colOffsets: number[] = [0];
    for (let c = 0; c < numCols - 1; c++) {
      colOffsets.push(colOffsets[c] + colWidths[c] + GAP);
    }

    const rowOffsets: number[] = [0];
    for (let r = 0; r < numRows - 1; r++) {
      rowOffsets.push(rowOffsets[r] + rowHeights[r] + GAP);
    }

    // 5. Map each note to its aligned 2D position (Point Zero anchor at topLeftNote)
    const posMap = new Map<string, { x: number; y: number }>();
    effectiveRows.forEach((row, r) => {
      row.forEach((note, c) => {
        posMap.set(note.id, {
          x: Math.round(anchorX + colOffsets[c]),
          y: Math.round(anchorY + rowOffsets[r]),
        });
      });
    });

    // 6. Avoid collisions with pinned notes
    if (pinned.length > 0) {
      unpinned.forEach((note) => {
        const pos = posMap.get(note.id);
        if (!pos) return;

        let { x, y } = pos;
        let attempts = 0;
        while (attempts < 10) {
          const colliding = pinned.find((p) => {
            return !(
              x + note.width + GAP <= p.x ||
              x >= p.x + p.width + GAP ||
              y + note.height + GAP <= p.y ||
              y >= p.y + p.height + GAP
            );
          });

          if (!colliding) break;
          // Nudge to clear the pinned obstacle
          x = colliding.x + colliding.width + GAP;
          attempts++;
        }

        posMap.set(note.id, { x: Math.round(x), y: Math.round(y) });
      });
    }

    // 7. Apply updated positions
    const arranged = notes.map((note) => {
      if (note.isPinned) return note;
      const pos = posMap.get(note.id);
      if (pos) {
        return {
          ...note,
          x: pos.x,
          y: pos.y,
          updatedAt: Date.now(),
        };
      }
      return note;
    });

    setNotes(arranged);
    queueSync(arranged, connections);
  };

  // Revert notes and connections through history (moving, resizing, deleting, organizing - up to 3 levels)
  const handleUndo = () => {
    if (historyStack.length === 0) return;

    const [lastSnapshot, ...remainingHistory] = historyStack;
    setNotes(lastSnapshot.notes);
    setConnections(lastSnapshot.connections);
    queueSync(lastSnapshot.notes, lastSnapshot.connections);
    setHistoryStack(remainingHistory);
  };

  // Focus a specific note (e.g. from calendar or search)
  const handleFocusNote = (noteId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;

    setSelectedNoteIds([target.id]);
    const targetCamX = -(target.x * transform.zoom - window.innerWidth / 2 + (target.width * transform.zoom) / 2);
    const targetCamY = -(target.y * transform.zoom - window.innerHeight / 2 + (target.height * transform.zoom) / 2);

    setTransform((prev) => ({
      ...prev,
      x: Math.round(targetCamX),
      y: Math.round(targetCamY),
    }));
  };

  // Check if calendar note is active on the blackboard
  const isCalendarOpen = useMemo(() => notes.some((n) => n.type === 'calendar'), [notes]);

  // Open large calendar overview modal
  const handleOpenCalendarModal = () => {
    setIsCalendarModalOpen(true);
  };

  // Vault E2EE configuration
  const handleConfigureVault = async (passphrase: string, hash: string, salt: string) => {
    const newState = { isConfigured: true, hash, salt };
    saveVaultState(newState);
    setVaultConfig(newState);
    setVaultPassphrase(passphrase);
    setIsVaultUnlocked(true);
  };

  const handleUnlockVault = (passphrase: string) => {
    setVaultPassphrase(passphrase);
    setIsVaultUnlocked(true);
  };

  const handleLockVault = () => {
    setVaultPassphrase('');
    setIsVaultUnlocked(false);
  };

  // Filter notes by search query, tag, and type
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => n.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Type match
      if (selectedType !== 'all' && n.type !== selectedType) return false;

      // Tag match
      if (selectedTag && !n.tags?.includes(selectedTag)) return false;

      // Keyword Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = n.title?.toLowerCase().includes(q);
        const contentMatch = n.content?.toLowerCase().includes(q);
        const tagMatch = n.tags?.some((t) => t.toLowerCase().includes(q));
        const todoMatch = n.todos?.some((t) => t.text?.toLowerCase().includes(q));
        if (!titleMatch && !contentMatch && !tagMatch && !todoMatch) return false;
      }

      return true;
    });
  }, [notes, selectedType, selectedTag, searchQuery]);

  // Upcoming reminders count (today or upcoming)
  const upcomingRemindersCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return notes.filter((n) => n.reminderDate && n.reminderDate >= today).length;
  }, [notes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (historyStack.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteIds.length > 0) {
        handleRequestBatchDelete();
      } else if (e.key === 'Escape') {
        setSelectedNoteIds([]);
        setIsConnectingMode(false);
        setConnectingSourceId(null);
      } else if (e.key === '=' || e.key === '+') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteIds, historyStack]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07080b] text-zinc-100 flex flex-col select-none">
      {/* HEADER WITH SEARCH, FILTER & SYNC PILL */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        selectedType={selectedType}
        onSelectType={setSelectedType}
        availableTags={availableTags}
        syncState={syncState}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isVaultUnlocked={isVaultUnlocked}
        upcomingRemindersCount={upcomingRemindersCount}
        isCalendarOpen={isCalendarModalOpen}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenVaultModal={() => setIsVaultModalOpen(true)}
        onToggleCalendar={handleOpenCalendarModal}
      />

      {/* MULTI-SELECTION GROUP ACTIONS BAR */}
      <GroupActionBar
        selectedCount={selectedNoteIds.length}
        onAlignHorizontal={handleBatchAlignHorizontal}
        onAlignVertical={handleBatchAlignVertical}
        onAlignGrid={handleBatchAlignGrid}
        onChangeColor={handleBatchChangeColor}
        onDeleteSelected={handleRequestBatchDelete}
        onDeselectAll={() => setSelectedNoteIds([])}
      />

      {/* INFINITE SPATIAL CANVAS */}
      <div className="flex-1 w-full h-full relative">
        <Canvas
          notes={filteredNotes}
          connections={connections}
          transform={transform}
          selectedNoteIds={selectedNoteIds}
          connectingSourceId={connectingSourceId}
          isVaultUnlocked={isVaultUnlocked}
          viewMode={viewMode}
          canUndoArrange={historyStack.length > 0}
          undoCount={historyStack.length}
          onTransformChange={setTransform}
          onSelectNote={handleSelectNote}
          onSelectMultipleNotes={handleSelectMultipleNotes}
          onUpdateNote={handleUpdateNote}
          onUpdateMultipleNotes={handleUpdateMultipleNotes}
          onDeleteNote={handleDeleteNote}
          onDuplicateNote={handleDuplicateNote}
          onStartConnection={handleStartConnection}
          onCompleteConnection={handleCompleteConnection}
          onDeleteConnection={handleDeleteConnection}
          onOpenLightbox={(url, title) => setLightboxData({ isOpen: true, url, title })}
          onNoteMoveFinished={(prevNotes) => pushHistorySnapshot(prevNotes)}
          onBeforeResize={() => pushHistorySnapshot()}
          onFocusNote={handleFocusNote}
          onAddNote={handleAddNote}
          onAutoArrange={handleAutoArrange}
          onUndoArrange={handleUndo}
          onFitAll={handleFitAll}
          onSwapNotes={handleSwapNotes}
        />

        {/* MINIMAP RADAR (Magnific Space style) */}
        {showMinimap && viewMode === 'spatial' && (
          <div className="fixed bottom-24 right-5 z-30 hidden sm:block">
            <Minimap
              notes={notes}
              transform={transform}
              containerWidth={window.innerWidth}
              containerHeight={window.innerHeight}
              onNavigate={(x, y) => setTransform((prev) => ({ ...prev, x, y }))}
              onClose={() => setShowMinimap(false)}
            />
          </div>
        )}
      </div>

      {/* MAGNIFIC SPACE BOTTOM DOCK */}
      <Dock
        zoom={transform.zoom}
        showMinimap={showMinimap}
        isVaultUnlocked={isVaultUnlocked}
        isCalendarOpen={isCalendarOpen}
        canUndoArrange={historyStack.length > 0}
        undoCount={historyStack.length}
        onAddNote={handleAddNote}
        onAutoArrange={handleAutoArrange}
        onUndoArrange={handleUndo}
        onToggleMinimap={() => setShowMinimap(!showMinimap)}
        onToggleCalendar={handleOpenCalendarModal}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitAll={handleFitAll}
        onOpenVault={() => setIsVaultModalOpen(true)}
      />

      {/* REAL-TIME MULTI-DEVICE SYNC & QR CODE MODAL */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncState={syncState}
        onJoinRoom={handleJoinRoom}
        onForceSync={handleForceSync}
      />

      {/* E2EE VAULT PASSPHRASE MODAL */}
      <VaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        isConfigured={vaultConfig.isConfigured}
        isUnlocked={isVaultUnlocked}
        storedHash={vaultConfig.hash}
        storedSalt={vaultConfig.salt}
        onConfigureVault={handleConfigureVault}
        onUnlockVault={handleUnlockVault}
        onLockVault={handleLockVault}
      />

      {/* LARGE CALENDAR OVERVIEW MODAL (ABRE ABA PARA VER O CALENDÁRIO MAIOR) */}
      <CalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        notes={notes}
        onFocusNote={handleFocusNote}
      />

      {/* IMAGE LIGHTBOX MODAL */}
      <ImageLightbox
        isOpen={lightboxData.isOpen}
        imageUrl={lightboxData.url}
        title={lightboxData.title}
        onClose={() => setLightboxData({ isOpen: false, url: '', title: '' })}
      />

      {/* BATCH DELETE CONFIRMATION MODAL */}
      <ConfirmDeleteModal
        isOpen={isConfirmDeleteModalOpen}
        onClose={() => setIsConfirmDeleteModalOpen(false)}
        onConfirm={handleConfirmBatchDelete}
        selectedNotes={notes.filter((n) => selectedNoteIds.includes(n.id))}
      />
    </div>
  );
}
