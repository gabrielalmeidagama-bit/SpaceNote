import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types/note';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Download,
  X,
  Trash2,
} from 'lucide-react';
import { generateGoogleCalendarUrl, downloadICSFile } from '../services/calendar';

interface ReminderPickerPopoverProps {
  note: Note;
  onUpdate: (updated: Partial<Note>) => void;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const ReminderPickerPopover: React.FC<ReminderPickerPopoverProps> = ({
  note,
  onUpdate,
  onClose,
  triggerRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside of this popover (and outside of the trigger button)
  useEffect(() => {
    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      // If clicking inside the popover itself, keep open
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }
      // If clicking the trigger button itself, let the button's toggle logic handle it
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside, true);
    document.addEventListener('touchstart', handlePointerDownOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside, true);
      document.removeEventListener('touchstart', handlePointerDownOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, triggerRef]);

  // Parse initial view date from note.reminderDate or fallback to today
  const initialDate = note.reminderDate ? new Date(note.reminderDate + 'T00:00:00') : new Date();
  const [viewDate, setViewDate] = useState<Date>(
    isNaN(initialDate.getTime()) ? new Date() : initialDate
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  const handleSelectDate = (dateStr: string) => {
    onUpdate({
      reminderDate: dateStr,
      reminderTime: note.reminderTime || '09:00',
      updatedAt: Date.now(),
    });
  };

  const handleQuickSelect = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const dStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(
      target.getDate()
    ).padStart(2, '0')}`;
    setViewDate(target);
    handleSelectDate(dStr);
  };

  // Calendar math
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const daysGrid: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
  // Prev month padding
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    daysGrid.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      dateStr: '',
    });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysGrid.push({
      day: d,
      isCurrentMonth: true,
      dateStr: dStr,
    });
  }

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-10 right-2 z-50 p-3.5 bg-zinc-950 border border-zinc-700/90 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] w-72 text-xs space-y-3 animate-in fade-in zoom-in-95 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <span className="font-semibold text-zinc-100 flex items-center gap-1.5 text-xs font-mono">
          <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
          Agendar Lembrete
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Month & Year Navigation */}
      <div className="flex items-center justify-between px-1">
        <span className="font-semibold text-xs text-zinc-200 font-mono">
          {monthNames[month]} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
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

      {/* Days of week header */}
      <div className="grid grid-cols-7 text-center text-[10px] font-mono text-zinc-500">
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
                className="h-7 rounded flex items-center justify-center text-[10px] text-zinc-700 pointer-events-none"
              >
                {item.day}
              </div>
            );
          }

          const isSelected = item.dateStr === note.reminderDate;
          const isToday = item.dateStr === todayStr;

          return (
            <button
              key={item.dateStr}
              onClick={() => handleSelectDate(item.dateStr)}
              className={`h-7 rounded-lg text-[11px] font-mono flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-amber-500 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105'
                  : isToday
                  ? 'border border-amber-500/50 text-amber-300 font-medium hover:bg-zinc-800'
                  : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {item.day}
            </button>
          );
        })}
      </div>

      {/* Quick selection chips */}
      <div className="flex items-center gap-1.5 pt-1 text-[10px]">
        <button
          onClick={() => handleQuickSelect(0)}
          className="flex-1 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-md border border-zinc-800 transition-colors text-center"
        >
          Hoje
        </button>
        <button
          onClick={() => handleQuickSelect(1)}
          className="flex-1 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-md border border-zinc-800 transition-colors text-center"
        >
          Amanhã
        </button>
        <button
          onClick={() => handleQuickSelect(7)}
          className="flex-1 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-md border border-zinc-800 transition-colors text-center"
        >
          +7 dias
        </button>
      </div>

      {/* Selected date preview & Time selection */}
      <div className="pt-2 border-t border-zinc-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-400 uppercase font-mono flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            Horário
          </label>
          {note.reminderDate && (
            <span className="text-[10px] font-mono text-amber-400 font-medium">
              {note.reminderDate.split('-').reverse().join('/')}
            </span>
          )}
        </div>

        <input
          type="time"
          value={note.reminderTime || '09:00'}
          onChange={(e) =>
            onUpdate({
              reminderTime: e.target.value,
              updatedAt: Date.now(),
            })
          }
          className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs font-mono focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Calendar sync and ICS export */}
      {note.reminderDate && (
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center gap-2">
            <a
              href={generateGoogleCalendarUrl(note)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 text-center font-medium transition-colors flex items-center justify-center gap-1.5 text-[11px]"
            >
              <ExternalLink className="w-3 h-3" />
              Google Calendar
            </a>
            <button
              onClick={() => downloadICSFile(note)}
              className="flex-1 py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 text-center font-medium transition-colors flex items-center justify-center gap-1.5 text-[11px]"
            >
              <Download className="w-3 h-3" />
              Baixar .ICS
            </button>
          </div>

          <button
            onClick={() => {
              onUpdate({
                reminderDate: undefined,
                reminderTime: undefined,
                updatedAt: Date.now(),
              });
              onClose();
            }}
            className="w-full py-1 text-rose-400 hover:text-rose-300 text-center text-[10px] flex items-center justify-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Remover lembrete
          </button>
        </div>
      )}
    </div>
  );
};
