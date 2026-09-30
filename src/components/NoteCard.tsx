import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Note, NoteColor, TodoItem } from '../types/note';
import { NOTE_COLORS } from '../services/theme';
import { generateGoogleCalendarUrl, downloadICSFile } from '../services/calendar';
import { CalendarNoteBody } from './CalendarNoteBody';
import { ReminderPickerPopover } from './ReminderPickerPopover';
import {
  FileText,
  CheckSquare,
  Image as ImageIcon,
  Calendar as CalendarIcon,
  MoreVertical,
  Pin,
  Trash2,
  Copy,
  Clock,
  ExternalLink,
  Download,
  Lock,
  Unlock,
  Plus,
  X,
  Share2,
  Check,
  Maximize2,
  Sparkles,
  Link as LinkIcon,
  Tag as TagIcon,
  Upload,
  Globe,
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Music,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Pencil,
  Flag,
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  isConnectingSource: boolean;
  isVaultUnlocked: boolean;
  zoom: number;
  isGridMode?: boolean;
  onSwapPrev?: () => void;
  onSwapNext?: () => void;
  allNotes?: Note[];
  onFocusNote?: (noteId: string) => void;
  onSelect: (e: React.MouseEvent) => void;
  onUpdate: (updated: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (note: Note) => void;
  onStartConnection: (fromId: string) => void;
  onOpenLightbox?: (imageUrl: string, title: string) => void;
  onBeforeResize?: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  isSelected,
  isConnectingSource,
  isVaultUnlocked,
  zoom,
  isGridMode = false,
  onSwapPrev,
  onSwapNext,
  allNotes,
  onFocusNote,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onStartConnection,
  onOpenLightbox,
  onBeforeResize,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const reminderButtonRef = useRef<HTMLButtonElement | null>(null);
  const [newTodoText, setNewTodoText] = useState('');
  const [isEditingTodos, setIsEditingTodos] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState('');
  const [newTagText, setNewTagText] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputText, setUrlInputText] = useState('');
  const [isDragOverFile, setIsDragOverFile] = useState(false);
  const [isImageTextExpanded, setIsImageTextExpanded] = useState(false);

  // Audio Note State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(note.audioDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Clean up audio recorder on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setAudioError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          onUpdate({
            audioUrl: base64Audio,
            audioDuration: recordingSeconds,
            updatedAt: Date.now(),
          });
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setAudioError('Microfone indisponível ou permissão negada.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleAudioUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onUpdate({
        audioUrl: result,
        title: note.title === 'Nota de Voz / Áudio' ? file.name.replace(/\.[^/.]+$/, '') : note.title,
        updatedAt: Date.now(),
      });
    };
    reader.readAsDataURL(file);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.error(e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      onUpdate({ audioDuration: Math.round(audioRef.current.duration) });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleCyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatAudioTime = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ startX: number; startY: number; startW: number; startH: number }>({
    startX: 0,
    startY: 0,
    startW: note.width,
    startH: note.height,
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const theme = NOTE_COLORS[note.color] || NOTE_COLORS['cyber-blue'];

  // Handle Resize Drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const dx = (e.clientX - resizeStartRef.current.startX) / zoom;
      const dy = (e.clientY - resizeStartRef.current.startY) / zoom;
      const newW = Math.max(280, Math.min(800, resizeStartRef.current.startW + dx));
      const newH = Math.max(180, Math.min(900, resizeStartRef.current.startH + dy));
      onUpdate({ width: Math.round(newW), height: Math.round(newH) });
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, zoom, onUpdate]);

  // Todo Completion Stats & Confetti
  const totalTodos = note.todos?.length || 0;
  const completedTodos = note.todos?.filter((t) => t.completed).length || 0;
  const progressPercent = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  const handleToggleTodo = (todoId: string) => {
    const updatedTodos = note.todos.map((t) => {
      if (t.id === todoId) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });

    const newlyDone = updatedTodos.find((t) => t.id === todoId)?.completed;
    const allDone = updatedTodos.length > 0 && updatedTodos.every((t) => t.completed);

    if (allDone && newlyDone) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'],
      });
    }

    onUpdate({ todos: updatedTodos, updatedAt: Date.now() });
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const newTodo: TodoItem = {
      id: 't_' + Math.random().toString(36).substring(2, 9),
      text: newTodoText.trim(),
      completed: false,
    };
    onUpdate({
      todos: [...(note.todos || []), newTodo],
      updatedAt: Date.now(),
    });
    setNewTodoText('');
  };

  const handleDeleteTodo = (todoId: string) => {
    onUpdate({
      todos: (note.todos || []).filter((t) => t.id !== todoId),
      updatedAt: Date.now(),
    });
    if (editingTodoId === todoId) {
      setEditingTodoId(null);
      setEditingTodoText('');
    }
  };

  const handleStartEditTodo = (todo: TodoItem) => {
    setEditingTodoId(todo.id);
    setEditingTodoText(todo.text);
  };

  const handleSaveEditTodo = (todoId: string) => {
    if (!editingTodoText.trim()) return;
    const updated = (note.todos || []).map((t) =>
      t.id === todoId ? { ...t, text: editingTodoText.trim() } : t
    );
    onUpdate({ todos: updated, updatedAt: Date.now() });
    setEditingTodoId(null);
    setEditingTodoText('');
  };

  const handleCancelEditTodo = () => {
    setEditingTodoId(null);
    setEditingTodoText('');
  };

  const handleMoveTodo = (index: number, direction: 'up' | 'down') => {
    const list = [...(note.todos || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    onUpdate({ todos: list, updatedAt: Date.now() });
  };

  const handleTogglePriority = (todoId: string) => {
    const priorities: (TodoItem['priority'] | undefined)[] = [undefined, 'low', 'medium', 'high'];
    const currentTodo = (note.todos || []).find((t) => t.id === todoId);
    const currIndex = priorities.indexOf(currentTodo?.priority);
    const nextPriority = priorities[(currIndex + 1) % priorities.length];
    const updated = (note.todos || []).map((t) =>
      t.id === todoId ? { ...t, priority: nextPriority } : t
    );
    onUpdate({ todos: updated, updatedAt: Date.now() });
  };

  const handleClearCompletedTodos = () => {
    const remaining = (note.todos || []).filter((t) => !t.completed);
    onUpdate({ todos: remaining, updatedAt: Date.now() });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTagText.trim().replace(/^#/, '');
    if (!cleanTag || note.tags.includes(cleanTag)) return;
    onUpdate({
      tags: [...note.tags, cleanTag],
      updatedAt: Date.now(),
    });
    setNewTagText('');
    setShowAddTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate({
      tags: note.tags.filter((t) => t !== tagToRemove),
      updatedAt: Date.now(),
    });
  };

  const handleCopyContent = () => {
    let copyText = `${note.title}\n\n`;
    if (note.content) copyText += `${note.content}\n\n`;
    if (note.type === 'todo') {
      copyText += note.todos.map((t) => `${t.completed ? '[x]' : '[ ]'} ${t.text}`).join('\n') + '\n\n';
    }
    if (note.imageUrl) copyText += `Imagem: ${note.imageUrl}`;

    navigator.clipboard.writeText(copyText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Image Upload handler
  const handleImageFileLoad = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      onUpdate({
        imageUrl: result,
        updatedAt: Date.now(),
      });
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFileLoad(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFileLoad(file);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlInputText.trim();
    if (!url) return;

    onUpdate({
      imageUrl: url,
      updatedAt: Date.now(),
    });

    setUrlInputText('');
    setShowUrlInput(false);
  };

  const handleCardPaste = (e: React.ClipboardEvent) => {
    if (note.type !== 'image' || note.imageUrl) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageFileLoad(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  return (
    <div
      ref={cardRef}
      data-note-id={note.id}
      tabIndex={0}
      onClick={onSelect}
      onPaste={handleCardPaste}
      className={`${
        isGridMode ? 'relative w-full h-full min-h-[380px] max-h-[380px] overflow-hidden' : 'absolute'
      } group flex flex-col rounded-2xl bg-zinc-950/85 backdrop-blur-xl border transition-all duration-200 select-text outline-none ${
        theme.borderColor
      } ${
        isSelected
          ? `ring-2 ring-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.35)] z-40`
          : isConnectingSource
          ? 'ring-2 ring-amber-400 animate-pulse z-40'
          : `${theme.glowShadow} hover:shadow-[0_0_30px_rgba(255,255,255,0.06)] ${isGridMode ? 'hover:-translate-y-1' : ''}`
      }`}
      style={
        isGridMode
          ? { zIndex: isSelected ? 40 : 10 }
          : {
              left: `${note.x}px`,
              top: `${note.y}px`,
              width: `${note.width}px`,
              height: `${note.height}px`,
              zIndex: note.zIndex,
            }
      }
    >
      {/* CARD HEADER / DRAG BAR */}
      <div
        data-drag-handle={!note.isPinned && !isGridMode ? 'true' : undefined}
        data-note-id={note.id}
        className={`flex items-center justify-between px-3.5 py-2.5 rounded-t-2xl border-b ${
          isGridMode
            ? 'cursor-default'
            : note.isPinned
            ? 'cursor-default select-none'
            : 'cursor-grab active:cursor-grabbing'
        } bg-zinc-900/60 ${theme.headerBorder}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Note Type Icon */}
          <span
            className="p-1 rounded-md text-zinc-300"
            style={{ color: theme.dotColor }}
            title={
              note.type === 'text'
                ? 'Nota de Texto'
                : note.type === 'todo'
                ? 'Lista de Tarefas'
                : note.type === 'image'
                ? 'Nota de Imagem'
                : 'Nota de Áudio'
            }
          >
            {note.type === 'text' && <FileText className="w-4 h-4" />}
            {note.type === 'todo' && <CheckSquare className="w-4 h-4" />}
            {note.type === 'image' && <ImageIcon className="w-4 h-4" />}
            {note.type === 'audio' && <Mic className="w-4 h-4" />}
            {note.type === 'calendar' && <CalendarIcon className="w-4 h-4 text-amber-400" />}
          </span>

          {/* Editable Title */}
          {isEditingTitle ? (
            <input
              type="text"
              value={note.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              autoFocus
              className="flex-1 bg-zinc-800 text-xs font-semibold text-zinc-100 px-2 py-0.5 rounded border border-zinc-700 focus:outline-none focus:border-cyan-400"
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditingTitle(true)}
              className="text-xs font-semibold text-zinc-200 truncate cursor-text hover:text-white"
              title="Dê um duplo clique para renomear"
            >
              {note.title || 'Sem título'}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Grid Mode Position Swap Controls */}
          {isGridMode && (
            <div
              className="flex items-center gap-0.5 bg-zinc-800/90 rounded-lg p-0.5 border border-zinc-700/80 mr-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="p-1 text-zinc-400 hover:text-cyan-300 cursor-grab active:cursor-grabbing flex items-center"
                title="Arraste o cartão para trocar de lugar na grade"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>

              {(onSwapPrev || onSwapNext) && (
                <div className="flex items-center border-l border-zinc-700/80 pl-0.5">
                  {onSwapPrev && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSwapPrev();
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-700/80 transition-colors cursor-pointer"
                      title="Trocar com a nota anterior (←)"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  )}
                  {onSwapNext && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSwapNext();
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-700/80 transition-colors cursor-pointer"
                      title="Trocar com a próxima nota (→)"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Edit Tasks Button (when note is a todo list) */}
          {note.type === 'todo' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTodos((prev) => !prev);
                if (isEditingTodos) {
                  setEditingTodoId(null);
                }
              }}
              className={`p-1 rounded-md transition-colors ${
                isEditingTodos
                  ? 'text-emerald-300 bg-emerald-500/20 ring-1 ring-emerald-500/40'
                  : 'text-zinc-500 hover:text-emerald-300'
              }`}
              title={isEditingTodos ? 'Concluir edição de tarefas' : 'Editar tarefas'}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Pin */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ isPinned: !note.isPinned });
            }}
            className={`p-1 rounded-md transition-colors ${
              note.isPinned ? 'text-amber-400 bg-amber-400/20' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={note.isPinned ? 'Desafixar nota (atualmente fixa)' : 'Fixar nota no quadro'}
          >
            <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Reminder / Calendar Badge */}
          {note.type !== 'calendar' && (
            <button
              ref={reminderButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setShowReminderPicker((prev) => !prev);
              }}
              className={`p-1 rounded-md transition-colors ${
                note.reminderDate
                  ? 'text-amber-400 bg-amber-500/15'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={note.reminderDate ? `Lembrete agendado: ${note.reminderDate} ${note.reminderTime || ''}` : 'Adicionar Lembrete / Calendário'}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Color Picker trigger */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
            }}
            className="w-4 h-4 rounded-full border border-zinc-700/80 transition-transform hover:scale-110"
            style={{ backgroundColor: theme.dotColor }}
            title="Mudar cor do tema"
          />

          {/* Context Menu trigger */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* Menu Popover */}
            {showMenu && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-48 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 text-xs text-zinc-300 animate-in fade-in"
              >
                <button
                  onClick={() => {
                    onStartConnection(note.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                  Conectar a outra nota
                </button>

                <button
                  onClick={() => {
                    onDuplicate(note);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicar nota
                </button>

                {note.type !== 'calendar' && (
                  <button
                    onClick={() => {
                      handleCopyContent();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Copiar texto
                  </button>
                )}

                {note.reminderDate && (
                  <>
                    <a
                      href={generateGoogleCalendarUrl(note)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 text-amber-300"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Google Calendar
                    </a>
                    <button
                      onClick={() => {
                        downloadICSFile(note);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 text-emerald-300"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar (.ICS)
                    </button>
                  </>
                )}

                <div className="my-1 border-t border-zinc-800" />

                <button
                  onClick={() => {
                    onDelete(note.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir nota
                </button>
              </div>
            )}
          </div>

          {/* Quick close button for Calendar note */}
          {note.type === 'calendar' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
              className="p-1 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
              title="Fechar calendário do quadro"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* COLOR PICKER POPOVER */}
      {showColorPicker && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-10 right-2 z-50 p-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl flex items-center gap-1.5 animate-in fade-in"
        >
          {Object.entries(NOTE_COLORS).map(([key, col]) => (
            <button
              key={key}
              onClick={() => {
                onUpdate({ color: key as NoteColor });
                setShowColorPicker(false);
              }}
              className={`w-5 h-5 rounded-full transition-transform hover:scale-125 border ${
                note.color === key ? 'ring-2 ring-white scale-110' : 'border-zinc-700'
              }`}
              style={{ backgroundColor: col.dotColor }}
              title={col.name}
            />
          ))}
        </div>
      )}

      {/* REMINDER & CALENDAR POPOVER */}
      {showReminderPicker && (
        <ReminderPickerPopover
          note={note}
          onUpdate={onUpdate}
          onClose={() => setShowReminderPicker(false)}
          triggerRef={reminderButtonRef}
        />
      )}

      {/* CARD BODY ACCORDING TO TYPE */}
      <div className="flex-1 min-h-0 p-3.5 overflow-y-auto space-y-3 custom-scrollbar">
        {/* CALENDAR NOTE TYPE */}
        {note.type === 'calendar' && (
          <CalendarNoteBody allNotes={allNotes || []} onFocusNote={onFocusNote} />
        )}

        {/* TEXT NOTE TYPE */}
        {note.type === 'text' && (
          <div className="h-full flex flex-col">
            <textarea
              value={note.content}
              onChange={(e) => onUpdate({ content: e.target.value, updatedAt: Date.now() })}
              placeholder="Digite suas ideias ou use formatação Markdown..."
              className="w-full flex-1 min-h-[100px] bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none leading-relaxed font-sans"
            />
            <div className="text-[10px] text-zinc-600 flex items-center justify-between pt-1 font-mono">
              <span>{note.content.length} caracteres</span>
              {copied && <span className="text-emerald-400">Copiado!</span>}
            </div>
          </div>
        )}

        {/* TODO / CHECKLIST NOTE TYPE */}
        {note.type === 'todo' && (
          <div className="flex flex-col h-full space-y-2.5">
            {/* Header toolbar for tasks with count & explicit "Editar tarefas" button */}
            <div className="flex items-center justify-between gap-2 pb-0.5">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-zinc-200">Tarefas</span>
                {totalTodos > 0 && (
                  <span className="px-1.5 py-0.2 rounded-md bg-zinc-800 text-[10px] font-mono text-zinc-400">
                    {completedTodos}/{totalTodos}
                  </span>
                )}
              </div>

              {/* Explicit button to edit tasks requested by user */}
              <button
                type="button"
                onClick={() => {
                  setIsEditingTodos((prev) => !prev);
                  if (isEditingTodos) {
                    setEditingTodoId(null);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isEditingTodos
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                }`}
                title={isEditingTodos ? 'Finalizar edição das tarefas' : 'Editar tarefas (modificar textos, ordem e itens)'}
              >
                {isEditingTodos ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                    <span>Concluir</span>
                  </>
                ) : (
                  <>
                    <Pencil className="w-3 h-3 text-emerald-400" />
                    <span>Editar tarefas</span>
                  </>
                )}
              </button>
            </div>

            {/* Progress Bar (when tasks exist) */}
            {totalTodos > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                  <span>
                    {completedTodos}/{totalTodos} concluído(s)
                  </span>
                  <span style={{ color: theme.dotColor }}>{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: theme.dotColor,
                      boxShadow: `0 0 6px ${theme.dotColor}`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Edit mode hint & actions when active */}
            {isEditingTodos && totalTodos > 0 && (
              <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[10px] text-emerald-300/90 font-medium">
                <span>Clique no lápis para renomear ou use as setas para reordenar</span>
                {completedTodos > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCompletedTodos}
                    className="text-zinc-400 hover:text-rose-300 underline underline-offset-2 transition-colors cursor-pointer"
                    title="Excluir tarefas já concluídas"
                  >
                    Limpar concluídas
                  </button>
                )}
              </div>
            )}

            {/* Empty state when new task note is created or all tasks deleted */}
            {totalTodos === 0 && (
              <div className="py-6 px-3 flex flex-col items-center justify-center text-center rounded-xl bg-zinc-900/20 border border-dashed border-zinc-800/80 my-1">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1.5 shadow-sm">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-zinc-300">Lista vazia</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 max-w-[200px] leading-tight">
                  Adicione sua primeira tarefa no campo abaixo
                </p>
              </div>
            )}

            {/* Todo items list */}
            {totalTodos > 0 && (
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[220px] custom-scrollbar">
                {note.todos?.map((todo, index) => {
                  const isEditingThis = editingTodoId === todo.id;

                  if (isEditingThis) {
                    return (
                      <form
                        key={todo.id}
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveEditTodo(todo.id);
                        }}
                        className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900 border border-emerald-500/50 shadow-sm"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editingTodoText}
                          onChange={(e) => setEditingTodoText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') handleCancelEditTodo();
                          }}
                          className="flex-1 bg-transparent text-xs text-zinc-100 focus:outline-none px-1.5 py-0.5"
                        />
                        <button
                          type="submit"
                          className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                          title="Salvar alteração (Enter)"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditTodo}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Cancelar (Esc)"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={todo.id}
                      className={`group/item flex items-center gap-2 p-1.5 rounded-lg transition-all ${
                        isEditingTodos
                          ? 'bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700'
                          : 'hover:bg-zinc-900/60'
                      }`}
                    >
                      {/* Checkbox (or reorder controls when editing) */}
                      {isEditingTodos ? (
                        <div className="flex items-center gap-0.5 text-zinc-500 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveTodo(index, 'up')}
                            className="p-0.5 rounded hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-20 cursor-pointer"
                            title="Mover para cima"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === (note.todos || []).length - 1}
                            onClick={() => handleMoveTodo(index, 'down')}
                            className="p-0.5 rounded hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-20 cursor-pointer"
                            title="Mover para baixo"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleTodo(todo.id)}
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                            todo.completed
                              ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900'
                          }`}
                        >
                          {todo.completed && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      )}

                      {/* Priority indicator if set */}
                      {todo.priority && (
                        <span
                          onClick={() => isEditingTodos && handleTogglePriority(todo.id)}
                          className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider shrink-0 select-none ${
                            isEditingTodos ? 'cursor-pointer hover:scale-105 transition-transform' : ''
                          } ${
                            todo.priority === 'high'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : todo.priority === 'medium'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                          title={isEditingTodos ? 'Clique para alternar prioridade' : undefined}
                        >
                          {todo.priority === 'high' ? 'Alta' : todo.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      )}

                      {/* Todo text */}
                      <span
                        onClick={() => {
                          if (isEditingTodos) {
                            handleStartEditTodo(todo);
                          } else {
                            handleToggleTodo(todo.id);
                          }
                        }}
                        onDoubleClick={() => handleStartEditTodo(todo)}
                        className={`flex-1 text-xs select-none transition-all truncate ${
                          isEditingTodos ? 'cursor-text text-zinc-100 hover:text-emerald-300' : 'cursor-pointer'
                        } ${todo.completed && !isEditingTodos ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}
                        title={isEditingTodos ? 'Clique para editar texto' : 'Dê duplo clique para editar ou clique para marcar'}
                      >
                        {todo.text}
                      </span>

                      {/* Action buttons on task */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* Edit pencil button */}
                        <button
                          type="button"
                          onClick={() => handleStartEditTodo(todo)}
                          className={`p-1 rounded text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800 transition-colors cursor-pointer ${
                            isEditingTodos ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'
                          }`}
                          title="Editar texto da tarefa"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>

                        {/* Toggle priority button in edit mode */}
                        {isEditingTodos && (
                          <button
                            type="button"
                            onClick={() => handleTogglePriority(todo.id)}
                            className="p-1 rounded text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Alterar prioridade (Baixa / Média / Alta)"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        )}

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteTodo(todo.id)}
                          className={`p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer ${
                            isEditingTodos ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'
                          }`}
                          title="Excluir tarefa"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Todo Input */}
            <form onSubmit={handleAddTodo} className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder={totalTodos === 0 ? "Adicionar primeira tarefa..." : "Adicionar nova tarefa..."}
                className="flex-1 px-2.5 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!newTodoText.trim()}
                className="p-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 disabled:bg-zinc-800 disabled:opacity-40 text-emerald-300 disabled:text-zinc-400 rounded-lg transition-colors border border-emerald-500/30 disabled:border-transparent cursor-pointer"
                title="Adicionar tarefa"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* IMAGE NOTE TYPE (MAXIMIZED IMAGE + SLEEK COMPACT BOTTOM ANNOTATION BAR) */}
        {note.type === 'image' && (
          <div className="flex flex-col h-full min-h-0 space-y-2">
            {/* Image attachment box - Adapts directly to the image inside the note with maximum vertical presence */}
            {note.imageUrl ? (
              <div className="relative group/img rounded-xl overflow-hidden bg-zinc-950/90 border border-zinc-800/80 flex-1 min-h-0 flex items-center justify-center p-1 w-full">
                {/* Subtle blurred ambient backdrop to complement any ratio */}
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-15 blur-lg pointer-events-none scale-110"
                  style={{ backgroundImage: `url(${note.imageUrl})` }}
                />

                {/* Main image: fits within the note card preserving 100% of its native aspect ratio and preventing any crop */}
                <img
                  src={note.imageUrl}
                  alt={note.title}
                  onClick={() => onOpenLightbox && onOpenLightbox(note.imageUrl!, note.title)}
                  className="relative z-10 max-w-full max-h-full object-contain rounded-lg transition-transform duration-300 group-hover/img:scale-[1.01] cursor-pointer"
                  title="Clique para ver em tela cheia"
                />
                
                {/* Image overlay action buttons */}
                <div className="absolute inset-0 z-20 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
                  <button
                    onClick={() => onOpenLightbox && onOpenLightbox(note.imageUrl!, note.title)}
                    className="p-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-white text-xs flex items-center gap-1 transition-colors shadow-lg cursor-pointer"
                    title="Ver em tela cheia"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Zoom</span>
                  </button>

                  <label
                    className="p-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-white text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-lg"
                    title="Trocar imagem"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Trocar</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => onUpdate({ imageUrl: undefined, updatedAt: Date.now() })}
                    className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white text-xs flex items-center gap-1 transition-colors shadow-lg cursor-pointer"
                    title="Remover anexo de imagem"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* EMPTY IMAGE STATE WITH LOAD BUTTONS */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOverFile(true);
                }}
                onDragLeave={() => setIsDragOverFile(false)}
                onDrop={handleFileDrop}
                className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all duration-200 bg-zinc-900/50 text-center flex-1 min-h-0 ${
                  isDragOverFile
                    ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 mb-2">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                </div>

                <span className="text-xs font-medium text-zinc-200 mb-0.5">
                  Nenhuma imagem carregada
                </span>
                <span className="text-[10px] text-zinc-500 mb-3">
                  Arraste uma foto aqui ou escolha uma das opções abaixo:
                </span>

                {/* Action Buttons to Load Image */}
                <div className="flex items-center gap-2 flex-wrap justify-center w-full">
                  {/* File Upload Button */}
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-medium cursor-pointer transition-colors border border-zinc-700/80 shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Carregar Arquivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>

                  {/* URL Input Button */}
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-colors border border-zinc-700/80 shadow-xs cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>Link / URL</span>
                  </button>
                </div>

                {/* Expandable URL Input Form */}
                {showUrlInput && (
                  <form onSubmit={handleUrlSubmit} className="mt-2.5 flex items-center gap-1.5 w-full">
                    <input
                      type="url"
                      placeholder="https://exemplo.com/foto.jpg"
                      value={urlInputText}
                      onChange={(e) => setUrlInputText(e.target.value)}
                      autoFocus
                      className="flex-1 px-2.5 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="submit"
                      disabled={!urlInputText.trim()}
                      className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      Inserir
                    </button>
                  </form>
                )}

                <span className="text-[9px] text-zinc-600 mt-2 font-mono">
                  Dica: Você também pode colar com Ctrl+V diretamente na nota
                </span>
              </div>
            )}

            {/* SLEEK, COMPACT BOTTOM ANNOTATION / CAPTION BAR (ELIMINATES UNUSED TEXT SPACE) */}
            {isImageTextExpanded ? (
              <div className="shrink-0 flex flex-col p-2 bg-zinc-900/80 border border-zinc-800/80 rounded-xl space-y-1.5 focus-within:border-cyan-500/60 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-0.5 border-b border-zinc-800/60">
                  <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                    <FileText className="w-3 h-3 text-cyan-400" />
                    Anotação da Imagem
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span>{(note.content || note.caption || '').length} caracteres</span>
                    <button
                      type="button"
                      onClick={() => setIsImageTextExpanded(false)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-zinc-400 cursor-pointer"
                      title="Recolher para barra compacta"
                    >
                      <ChevronDown className="w-3 h-3" />
                      <span>Recolher</span>
                    </button>
                  </div>
                </div>

                <textarea
                  autoFocus
                  value={note.content || note.caption || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdate({
                      content: val,
                      caption: val.split('\n')[0] || val,
                      updatedAt: Date.now(),
                    });
                  }}
                  placeholder="Escreva suas anotações ou observações sobre esta imagem..."
                  className="w-full h-[65px] bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none resize-none leading-relaxed custom-scrollbar font-sans"
                />
              </div>
            ) : (
              <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800/70 hover:border-zinc-700/80 rounded-xl transition-all group/textbar focus-within:border-cyan-500/60 focus-within:bg-zinc-900">
                <FileText className="w-3.5 h-3.5 text-zinc-500 group-focus-within/textbar:text-cyan-400 shrink-0" />
                <input
                  type="text"
                  value={
                    (note.content && note.content.includes('\n')
                      ? note.content.split('\n')[0]
                      : note.content || note.caption) || ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdate({
                      content: val,
                      caption: val,
                      updatedAt: Date.now(),
                    });
                  }}
                  placeholder="Legenda ou observação (opcional)..."
                  className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none truncate"
                />

                {/* If text has multiple lines, show indicator */}
                {note.content && note.content.includes('\n') && (
                  <span
                    onClick={() => setIsImageTextExpanded(true)}
                    className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1 py-0.2 rounded border border-cyan-500/20 cursor-pointer hover:bg-cyan-500/20 shrink-0 select-none"
                    title="Mais linhas de texto disponíveis. Clique para expandir."
                  >
                    +linhas
                  </span>
                )}

                {/* Clear button if text exists */}
                {(note.content || note.caption) && (
                  <button
                    type="button"
                    onClick={() => onUpdate({ content: '', caption: '', updatedAt: Date.now() })}
                    className="p-0.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    title="Limpar texto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}

                {/* Expand button */}
                <button
                  type="button"
                  onClick={() => setIsImageTextExpanded(true)}
                  className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                  title="Expandir para texto longo / anotações"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* AUDIO NOTE TYPE (RECORD, PLAY & ANNOTATE) */}
        {note.type === 'audio' && (
          <div className="flex flex-col h-full space-y-3">
            {/* Audio Section: Player or Recorder Setup */}
            {note.audioUrl ? (
              <div className="rounded-xl p-3 bg-zinc-900/90 border border-zinc-800 space-y-2.5 shadow-inner">
                {/* Hidden Audio Player Element */}
                <audio
                  ref={audioRef}
                  src={note.audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />

                {/* Waveform Visualizer & Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Music className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-200">
                        {isPlaying ? 'Reproduzindo Áudio' : 'Áudio Gravado'}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {formatAudioTime(currentTime)} / {formatAudioTime(duration || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Waveform Bars */}
                  <div className="flex items-center gap-1 h-6 px-2 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                    {[12, 18, 8, 22, 14, 20, 10, 16, 24, 12, 18, 9].map((height, idx) => (
                      <span
                        key={idx}
                        className={`w-0.5 rounded-full transition-all duration-150 ${
                          isPlaying ? 'bg-amber-400 animate-pulse' : 'bg-zinc-700'
                        }`}
                        style={{
                          height: isPlaying ? `${Math.max(4, (height * ((idx % 3) + 1)) % 22)}px` : `${Math.max(4, height / 2)}px`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Progress Scrubber Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                {/* Player Controls Bar */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {/* Play/Pause Button */}
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center transition-transform active:scale-95 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                      title={isPlaying ? 'Pausar' : 'Reproduzir'}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-zinc-950" />
                      ) : (
                        <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
                      )}
                    </button>

                    {/* Playback speed toggle */}
                    <button
                      type="button"
                      onClick={handleCyclePlaybackRate}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-md text-[10px] font-mono text-zinc-300 transition-colors"
                      title="Velocidade de reprodução"
                    >
                      {playbackRate}x
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Download Audio */}
                    <a
                      href={note.audioUrl}
                      download={`${note.title || 'audio'}.webm`}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      title="Baixar arquivo de áudio"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    {/* Delete Audio */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isPlaying) {
                          audioRef.current?.pause();
                          setIsPlaying(false);
                        }
                        onUpdate({ audioUrl: undefined, audioDuration: undefined });
                      }}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      title="Remover áudio e gravar outro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : isRecording ? (
              /* LIVE RECORDING STATE */
              <div className="rounded-xl p-4 bg-zinc-900/90 border border-rose-500/40 flex flex-col items-center justify-center space-y-3 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-rose-300">Gravando microfone...</span>
                </div>

                {/* Big Live Recording Timer */}
                <div className="text-2xl font-mono font-bold text-zinc-100 tracking-wider">
                  {formatAudioTime(recordingSeconds)}
                </div>

                {/* Animated Pulsing Bars */}
                <div className="flex items-center gap-1 h-7">
                  {[8, 14, 20, 26, 18, 12, 24, 16, 22, 10].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-rose-500 rounded-full animate-pulse"
                      style={{
                        height: `${h}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Finish & Cancel Buttons */}
                <div className="flex items-center gap-2 pt-1 w-full justify-center">
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-500/30 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Concluir Gravação</span>
                  </button>

                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* EMPTY AUDIO STATE */
              <div className="rounded-xl p-4 bg-zinc-900/60 border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center space-y-2.5">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Mic className="w-5 h-5" />
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-200">Adicionar Áudio</div>
                  <div className="text-[10px] text-zinc-500">Grave sua voz ou carregue um arquivo de som</div>
                </div>

                {audioError && (
                  <div className="text-[10px] text-rose-400 font-medium">{audioError}</div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {/* Record Button */}
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-colors shadow-xs"
                  >
                    <Mic className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gravar Voz</span>
                  </button>

                  {/* Upload Audio File */}
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer border border-zinc-700/80 shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Carregar Arquivo</span>
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm,.aac"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAudioUpload(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* LOWER SECTION: NOTES / TRANSCRIPTION WRITING AREA */}
            <div className="flex-1 flex flex-col pt-1 border-t border-zinc-800/60 min-h-[90px]">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mb-1">
                <span className="flex items-center gap-1 text-zinc-400">
                  <FileText className="w-3 h-3 text-amber-400" />
                  Transcrição / Anotações
                </span>
                <span>{note.content?.length || 0} caracteres</span>
              </div>

              <textarea
                value={note.content || ''}
                onChange={(e) => onUpdate({ content: e.target.value, updatedAt: Date.now() })}
                placeholder="Escreva anotações, transcrição, pontos-chave ou resumo deste áudio..."
                className="w-full flex-1 min-h-[85px] bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none leading-relaxed font-sans"
              />
            </div>
          </div>
        )}
      </div>

      {/* FOOTER: TAGS & METADATA */}
      <div className="px-3.5 py-2 border-t border-zinc-800/80 bg-zinc-900/40 rounded-b-2xl flex items-center justify-between gap-2">
        {/* Tags list */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
          {note.tags?.map((tag) => (
            <span
              key={tag}
              className="group/tag inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <span>#{tag}</span>
              <button
                onClick={() => handleRemoveTag(tag)}
                className="opacity-0 group-hover/tag:opacity-100 text-zinc-500 hover:text-rose-400"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}

          {showAddTag ? (
            <form onSubmit={handleAddTag} className="inline-flex">
              <input
                type="text"
                placeholder="tag"
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onBlur={() => setShowAddTag(false)}
                autoFocus
                className="w-16 px-1 py-0.5 text-[11px] bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:outline-none"
              />
            </form>
          ) : (
            <button
              onClick={() => setShowAddTag(true)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
              title="Adicionar etiqueta"
            >
              <Plus className="w-2.5 h-2.5" />
              tag
            </button>
          )}
        </div>

        {/* Reminder date indicator */}
        {note.reminderDate && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 shrink-0">
            <Clock className="w-3 h-3" />
            <span>{note.reminderDate.split('-').slice(1).reverse().join('/')}</span>
          </div>
        )}
      </div>

      {/* RESIZE HANDLE BOTTOM-RIGHT (Only when note is NOT pinned and NOT in grid mode) */}
      {!note.isPinned && !isGridMode && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            onBeforeResize?.();
            setIsResizing(true);
            resizeStartRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              startW: note.width,
              startH: note.height,
            };
          }}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center opacity-40 hover:opacity-100 text-zinc-500"
          title="Redimensionar nota"
        >
          <svg viewBox="0 0 6 6" className="w-2 h-2 fill-current">
            <circle cx="5" cy="5" r="1" />
            <circle cx="5" cy="2" r="1" />
            <circle cx="2" cy="5" r="1" />
          </svg>
        </div>
      )}
    </div>
  );
};
