import React, { useState } from 'react';
import { Note } from '../types/note';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  Download,
  Calendar as CalendarIcon,
  CheckCircle2,
} from 'lucide-react';
import { generateGoogleCalendarUrl, downloadICSFile } from '../services/calendar';
import { NOTE_COLORS } from '../services/theme';

interface CalendarNoteBodyProps {
  allNotes: Note[];
  onFocusNote?: (noteId: string) => void;
}

export const CalendarNoteBody: React.FC<CalendarNoteBodyProps> = ({
  allNotes,
  onFocusNote,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Filter notes that have a reminder date (excluding the calendar card itself)
  const scheduledNotes = allNotes.filter((n) => n.type !== 'calendar' && !!n.reminderDate);

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

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const selectedNotes = notesByDate[selectedDateStr] || [];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex flex-col h-full space-y-3 select-none text-zinc-200"
    >
      {/* Month Navigator Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5 font-mono">
          <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleGoToday}
            className="px-2 py-0.5 text-[10px] font-mono text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 rounded transition-colors"
            title="Ir para hoje"
          >
            Hoje
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Próximo mês"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-zinc-500 font-mono">
        <span>Dom</span>
        <span>Seg</span>
        <span>Ter</span>
        <span>Qua</span>
        <span>Qui</span>
        <span>Sex</span>
        <span>Sáb</span>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysGrid.map((item, idx) => {
          if (!item.isCurrentMonth) {
            return (
              <div
                key={`pad-${idx}`}
                className="h-8 rounded-lg flex items-center justify-center text-[11px] text-zinc-700 pointer-events-none"
              >
                {item.day}
              </div>
            );
          }

          const hasEvents = !!notesByDate[item.dateStr]?.length;
          const isToday = item.dateStr === todayStr;
          const isSelected = item.dateStr === selectedDateStr;

          return (
            <button
              key={item.dateStr}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDateStr(item.dateStr);
              }}
              className={`h-8 rounded-lg flex flex-col items-center justify-center text-[11px] relative transition-all ${
                isSelected
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 font-semibold shadow-xs'
                  : isToday
                  ? 'bg-zinc-800 text-white font-semibold border border-zinc-700'
                  : 'text-zinc-300 hover:bg-zinc-800/60'
              }`}
            >
              <span>{item.day}</span>
              {hasEvents && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {notesByDate[item.dateStr].slice(0, 3).map((n) => (
                    <span
                      key={n.id}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: NOTE_COLORS[n.color]?.dotColor || '#f59e0b' }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Agenda Section for Selected Day */}
      <div className="flex-1 flex flex-col pt-2 border-t border-zinc-800/80 min-h-[140px] space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-300 font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            {selectedDateStr.split('-').reverse().join('/')}
          </span>
          <span className="text-[10px] text-zinc-500">
            {selectedNotes.length} lembrete{selectedNotes.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[160px] pr-1">
          {selectedNotes.length === 0 ? (
            <div className="py-4 text-center text-xs text-zinc-600 italic">
              Nenhuma nota agendada para esta data
            </div>
          ) : (
            selectedNotes.map((n) => (
              <div
                key={n.id}
                className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 flex items-center justify-between gap-2 transition-all"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: NOTE_COLORS[n.color]?.dotColor || '#f59e0b' }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-200 font-medium truncate">{n.title}</p>
                    {n.reminderTime && (
                      <p className="text-[10px] text-amber-400/80 font-mono">{n.reminderTime}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onFocusNote && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFocusNote(n.id);
                      }}
                      className="p-1 rounded-md text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 transition-colors"
                      title="Localizar e focar nota no quadro"
                    >
                      <Compass className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <a
                    href={generateGoogleCalendarUrl(n)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded-md text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                    title="Exportar para Google Calendar"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadICSFile(n);
                    }}
                    className="p-1 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                    title="Baixar arquivo .ICS"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
