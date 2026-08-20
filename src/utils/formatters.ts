import { Quotation } from '../types';

export const fmt = (n: number | string | undefined | null): string => {
  const num = Number(n) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const parseNum = (s: string | number): number => {
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
};

export const TH_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const TH_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const thaiToday = (): string => {
  const d = new Date();
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const parseThaiDate = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const str = dateStr.trim();
  
  // Case 1: "2 สิงหาคม 2569" or "2 ส.ค. 2569"
  const parts = str.split(/\s+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    let monthIdx = TH_MONTHS.indexOf(parts[1]);
    if (monthIdx === -1) {
      monthIdx = TH_MONTHS_SHORT.indexOf(parts[1]);
    }
    let year = parseInt(parts[2], 10);
    if (year > 2400) year -= 543; // convert BE to AD if > 2400
    if (!isNaN(day) && monthIdx !== -1 && !isNaN(year)) {
      return new Date(year, monthIdx, day);
    }
  }

  // Case 2: Slash format "DD/MM/YYYY" or "DD/MM/BE"
  if (str.includes('/')) {
    const slashParts = str.split('/');
    if (slashParts.length === 3) {
      const d = parseInt(slashParts[0], 10);
      const m = parseInt(slashParts[1], 10) - 1;
      let y = parseInt(slashParts[2], 10);
      if (y > 2400) y -= 543;
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return new Date(y, m, d);
      }
    }
  }

  // Case 3: Standard ISO "YYYY-MM-DD" or standard JS date
  const normalDate = new Date(str);
  if (!isNaN(normalDate.getTime())) return normalDate;
  
  return null;
};

export const qtId = (d?: Quotation | null): string => {
  if (!d || !d.meta) return '';
  return `${d.meta.quoteNo || ''} ${d.meta.rev || ''}`.trim();
};

export const qtGrand = (d?: Quotation | null): number => {
  return Number(d?.calc?.grand || d?.grand || 0);
};

export const STATUS_CONFIG = {
  Draft: { th: 'ร่าง', bg: 'bg-slate-100 text-slate-700 border-slate-300', lock: false },
  Pending: { th: 'รออนุมัติ', bg: 'bg-amber-100 text-amber-800 border-amber-300', lock: false },
  Approved: { th: 'อนุมัติแล้ว', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', lock: true },
  Cancelled: { th: 'ยกเลิก', bg: 'bg-rose-100 text-rose-800 border-rose-300', lock: true },
};

export const ROLE_CONFIG = {
  admin: { th: 'ผู้ดูแลระบบ (Admin)', bg: 'bg-purple-100 text-purple-800 border-purple-300', badgeBg: 'bg-purple-600' },
  sales: { th: 'ฝ่ายขาย / BOQ', bg: 'bg-cyan-100 text-cyan-800 border-cyan-300', badgeBg: 'bg-cyan-600' },
  engineer: { th: 'วิศวกร / ช่าง', bg: 'bg-blue-100 text-blue-800 border-blue-300', badgeBg: 'bg-blue-600' },
  viewer: { th: 'ผู้ดูอย่างเดียว', bg: 'bg-slate-100 text-slate-700 border-slate-300', badgeBg: 'bg-slate-600' },
};
