import { icon } from './icons.js';

const TZ = 'America/Recife';
const dtf = (o) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hourCycle: 'h23', ...o });
const parts = (d, o) => Object.fromEntries(dtf(o).formatToParts(new Date(d)).map((p) => [p.type, p.value]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* Tema por Área do Conhecimento (classes completas para o JIT do Tailwind enxergar) */
export const AREAS = {
  NATURAL_SCIENCES: {
    code: 'NATURAL_SCIENCES', label: 'Ciências da Natureza', short: 'Natureza', icon: 'flask', color: '#2E5A44',
    subjects: 'Biologia • Química • Física',
    text: 'text-nature-botanic', bg: 'bg-nature-botanic', soft: 'bg-[#E8F0EB]', bar: 'bg-nature-botanic',
    sel: 'border-nature-botanic bg-[#E8F0EB]',
  },
  LANGUAGES: {
    code: 'LANGUAGES', label: 'Linguagens', short: 'Linguagens', icon: 'book-open', color: '#1E3A5F',
    subjects: 'Português • Redação • Literatura',
    text: 'text-languages-navy', bg: 'bg-languages-navy', soft: 'bg-[#E8EDF4]', bar: 'bg-languages-navy',
    sel: 'border-languages-navy bg-[#E8EDF4]',
  },
  HUMAN_SCIENCES: {
    code: 'HUMAN_SCIENCES', label: 'Ciências Humanas', short: 'Humanas', icon: 'landmark', color: '#A0522D',
    subjects: 'História • Geografia • Filosofia • Sociologia',
    text: 'text-humanities-terracotta', bg: 'bg-humanities-terracotta', soft: 'bg-[#F6EAE4]', bar: 'bg-humanities-terracotta',
    sel: 'border-humanities-terracotta bg-[#F6EAE4]',
  },
};
export const areaTheme = (code) => AREAS[code] || AREAS.NATURAL_SCIENCES;

export const STATUS = {
  PENDING: { label: 'PENDING', cls: 'bg-[#F6EFD9] text-[#7A5C10]', icon: 'clock' },
  CONFIRMED: { label: 'CONFIRMED', cls: 'bg-[#E1EDE6] text-nature-botanic', icon: 'circle-check' },
  CANCELLED: { label: 'CANCELLED', cls: 'bg-[#F6E1E1] text-[#9B2C2C]', icon: 'x' },
};
export const statusTheme = (s) => STATUS[s] || STATUS.PENDING;

/* Datas sempre no fuso de Recife */
export const dayKey = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date(d)); // YYYY-MM-DD
export const fmtTime = (d) => { if (!d) return '—'; const p = parts(d, { hour: '2-digit', minute: '2-digit' }); return `${p.hour}:${p.minute}`; };
export const fmtDay = (d) => { if (!d) return '—'; const p = parts(d, { day: '2-digit', month: 'short' }); return `${p.day} ${p.month}`; };
export const fmtDayYear = (d) => { if (!d) return '—'; const p = parts(d, { day: '2-digit', month: 'short', year: 'numeric' }); return `${p.day} ${p.month} ${p.year}`; };
export const fmtLong = (d) => cap(dtf({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d)));
export const weekdayIdx = (d) => ({ Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 })[new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(new Date(d))];

export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || 'U';
export const firstName = (name = '') => (name.trim().split(/\s+/)[0]) || '';

/* O Appointment guarda a ficha do pedido em `notes`, em linhas "Chave: valor" */
export function parseNotes(text) {
  const out = { student: '', guardian: '', tags: [], observations: '' };
  String(text || '').split('\n').forEach((line) => {
    const i = line.indexOf(':');
    if (i < 0) return;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim();
    if (k === 'estudante') out.student = v;
    else if (k === 'responsável' || k === 'responsavel') out.guardian = v;
    else if (k === 'perfil') out.tags = v.split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === 'observações' || k === 'observacoes') out.observations = v;
  });
  return out;
}

export const helpers = {
  icon, areaTheme, statusTheme, fmtTime, fmtDay, fmtDayYear, fmtLong, dayKey, weekdayIdx, initials, firstName, parseNotes, AREAS,
};
