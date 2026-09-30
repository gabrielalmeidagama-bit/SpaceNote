import { Note } from '../types/note';

/**
 * Calendar Integration Utilities:
 * - Google Calendar Web Link Generator
 * - Standard iCalendar (.ics) download for Apple Calendar, Outlook, Google Calendar
 * - Web Notification & Web Audio Chime alerts
 */

export function generateGoogleCalendarUrl(note: Note): string {
  if (!note.reminderDate) return '';

  const title = encodeURIComponent(note.title || 'Nota Magnific Space');
  let detailsText = note.content || '';
  if (note.type === 'todo' && note.todos?.length) {
    const list = note.todos.map(t => `${t.completed ? '✅' : '⬜'} ${t.text}`).join('\n');
    detailsText = detailsText ? `${detailsText}\n\nTarefas:\n${list}` : `Tarefas:\n${list}`;
  }
  if (note.tags?.length) {
    detailsText += `\n\nEtiquetas: ${note.tags.join(', ')}`;
  }
  const details = encodeURIComponent(detailsText);

  // Format date and time
  // Default to 1 hour event
  const timeStr = note.reminderTime || '09:00';
  const startDateTime = new Date(`${note.reminderDate}T${timeStr}:00`);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

  const formatGCalDate = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const datesParam = `${formatGCalDate(startDateTime)}/${formatGCalDate(endDateTime)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}`;
}

export function downloadICSFile(note: Note): void {
  if (!note.reminderDate) return;

  const timeStr = note.reminderTime || '09:00';
  const start = new Date(`${note.reminderDate}T${timeStr}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const formatICSDate = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  let description = (note.content || '').replace(/\n/g, '\\n');
  if (note.type === 'todo' && note.todos?.length) {
    const todosStr = note.todos.map(t => `${t.completed ? '[x]' : '[ ]'} ${t.text}`).join('\\n');
    description += `\\n\\nTarefas:\\n${todosStr}`;
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Magnific Space//Notes Calendar//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:magnific-note-${note.id}@magnificspace.app`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${note.title || 'Nota do Magnific Space'}`,
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete de Nota',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${(note.title || 'nota').toLowerCase().replace(/\s+/g, '-')}-lembrete.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Synthesize pleasant futuristic futuristic audio chime using Web Audio API
export function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.2);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.85);
    osc2.stop(now + 0.85);
  } catch (e) {
    // Audio context might be restricted before interaction
  }
}

// Request Notification Permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// Trigger browser notification
export function triggerReminderNotification(note: Note) {
  playChimeSound();

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`Lembrete: ${note.title || 'Nota Agendada'}`, {
      body: note.content ? note.content.slice(0, 100) : 'Você tem um lembrete programado no Magnific Space.',
      icon: '/favicon.ico',
    });
  }
}
