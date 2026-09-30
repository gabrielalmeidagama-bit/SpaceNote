import React, { useState } from 'react';
import { Note } from '../types/note';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Download,
  X,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { generateGoogleCalendarUrl, downloadICSFile } from '../services/calendar';
import { NOTE_COLORS } from '../services/theme';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onFocusNote?: (noteId: string) => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  notes,
  onFocusNote,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  if (!isOpen) return null;

  // Filter notes that have a reminder date
  const scheduledNotes = notes.filter((n) => !!n.reminderDate);

  // Group notes by reminder date
  const notesByDate: Record<string, Note[]> = {};
  scheduledNotes.forEach((n) => {
    if (n.reminderDate) {
      if (!notesByDate[n.reminderDate]) {
        notesByDate[n.reminderDate] = [];
      }
      notesByDate[n.reminderDate].push(n);
    }
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().split('T')[0]);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const daysGrid: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
  // Leading days from prev month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    daysGrid.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      dateStr: '',
    });
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysGrid.push({
      day: d,
      isCurrentMonth: true,
      dateStr: dStr,
    });
  }

  // Selected date notes
  const dayNotes = notesByDate[selectedDateStr] || [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Visão Geral do Calendário & Lembretes
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {scheduledNotes.length} lembrete{scheduledNotes.length === 1 ? '' : 's'} agendado{scheduledNotes.length === 1 ? '' : 's'} em todas as notas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split 2 columns (Calendar Month on Left, Selected Day Agenda on Right) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Big Interactive Month Grid (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Month & Navigation Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-zinc-100 font-mono">
                  {monthNames[month]} {year}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition-colors"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleGoToday}
                  className="px-3 py-1 rounded-lg text-xs font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 transition-colors"
                  title="Ir para hoje"
                >
                  Hoje
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition-colors"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center text-xs font-mono text-zinc-500 py-1 border-b border-zinc-800/80">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-7 gap-2">
              {daysGrid.map((item, idx) => {
                if (!item.isCurrentMonth) {
                  return (
                    <div
                      key={`pad-${idx}`}
                      className="h-14 rounded-xl flex items-center justify-center text-xs text-zinc-700/60 pointer-events-none"
                    >
                      {item.day}
                    </div>
                  );
                }

                const dayEvents = notesByDate[item.dateStr] || [];
                const hasEvents = dayEvents.length > 0;
                const isToday = item.dateStr === todayStr;
                const isSelected = item.dateStr === selectedDateStr;

                return (
                  <button
                    key={item.dateStr}
                    onClick={() => setSelectedDateStr(item.dateStr)}
                    className={`h-14 p-1.5 rounded-xl flex flex-col items-center justify-between text-xs relative transition-all group border ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] font-bold'
                        : isToday
                        ? 'bg-zinc-800/80 text-white border-zinc-600 font-semibold'
                        : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className="text-[11px] font-mono leading-none">{item.day}</span>

                    {/* Dot indicators for notes */}
                    <div className="flex items-center gap-1 overflow-hidden max-w-full">
                      {dayEvents.slice(0, 4).map((n) => (
                        <span
                          key={n.id}
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: NOTE_COLORS[n.color]?.dotColor || '#f59e0b' }}
                          title={n.title}
                        />
                      ))}
                      {dayEvents.length > 4 && (
                        <span className="text-[9px] text-zinc-400 font-mono leading-none">
                          +{dayEvents.length - 4}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Day Agenda & Reminders (5 cols) */}
          <div className="lg:col-span-5 flex flex-col bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-zinc-100 text-sm font-mono">
                  {selectedDateStr.split('-').reverse().join('/')}
                </span>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                {dayNotes.length} lembrete{dayNotes.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* List of notes for selected day */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[420px] pr-1">
              {dayNotes.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs italic flex flex-col items-center justify-center gap-2">
                  <CalendarIcon className="w-8 h-8 text-zinc-700 stroke-[1.5]" />
                  <span>Nenhum lembrete para esta data</span>
                </div>
              ) : (
                dayNotes.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700 rounded-xl space-y-2 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: NOTE_COLORS[n.color]?.dotColor || '#f59e0b' }}
                        />
                        <h4 className="text-xs font-semibold text-zinc-100 truncate">{n.title}</h4>
                      </div>

                      {n.reminderTime && (
                        <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                          {n.reminderTime}
                        </span>
                      )}
                    </div>

                    {n.content && (
                      <p className="text-[11px] text-zinc-400 line-clamp-2">{n.content}</p>
                    )}

                    {n.todos && n.todos.length > 0 && (
                      <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>
                          {n.todos.filter((t) => t.completed).length}/{n.todos.length} concluídas
                        </span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/60">
                      {onFocusNote && (
                        <button
                          onClick={() => {
                            onClose();
                            onFocusNote(n.id);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                        >
                          <Compass className="w-3 h-3 text-cyan-400" />
                          Localizar Nota
                        </button>
                      )}

                      <a
                        href={generateGoogleCalendarUrl(n)}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                        title="Google Calendar"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Google
                      </a>

                      <button
                        onClick={() => downloadICSFile(n)}
                        className="py-1 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                        title="Baixar .ICS"
                      >
                        <Download className="w-3 h-3" />
                        .ICS
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
