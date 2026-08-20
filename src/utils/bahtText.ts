/**
  * Convert numeric value to Thai Baht text format
  * Example: 2000000 -> "สองล้านบาทถ้วน"
  */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function readInt(n: number): string {
  const d = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const u = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'ศูนย์';
  let out = '';
  if (n >= 1000000) {
    out += readInt(Math.floor(n / 1000000)) + 'ล้าน';
    n = n % 1000000;
    if (n === 0) return out;
  }
  const s = String(n);
  const L = s.length;
  for (let i = 0; i < L; i++) {
    const dg = +s[i];
    const pos = L - i - 1;
    if (!dg) continue;
    if (pos === 1 && dg === 1) out += 'สิบ';
    else if (pos === 1 && dg === 2) out += 'ยี่สิบ';
    else if (pos === 0 && dg === 1 && L > 1) out += 'เอ็ด';
    else out += d[dg] + u[pos];
  }
  return out;
}

export function bahtText(num: number): string {
  const neg = num < 0;
  num = round2(Math.abs(num));
  const baht = Math.floor(num);
  const stg = Math.round((num - baht) * 100);
  if (!baht && !stg) return 'ศูนย์บาทถ้วน';
  let s = neg ? 'ลบ' : '';
  if (baht) s += readInt(baht) + 'บาท';
  s += stg ? readInt(stg) + 'สตางค์' : 'ถ้วน';
  return s;
}
