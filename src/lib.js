// 모든 페이지가 함께 쓰는 화면 도우미 (금액 단위: 만원)
export const $ = (id) => document.getElementById(id);
export function hasVal(id) { const el = $(id); return !!el && el.value.trim() !== '' && Number.isFinite(parseFloat(el.value)); }
export function numOf(id) { const el = $(id); const v = el ? parseFloat(el.value) : NaN; return Number.isFinite(v) ? v : 0; }
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function won(m) {
  const neg = m < 0; m = Math.round(Math.abs(m));
  const eok = Math.floor(m / 10000), man = m % 10000;
  let s;
  if (eok && man) s = `${eok}억 ${man.toLocaleString('ko-KR')}만원`;
  else if (eok) s = `${eok}억원`;
  else s = `${man.toLocaleString('ko-KR')}만원`;
  return (neg ? '−' : '') + s;
}
export function kor(m) {
  const neg = m < 0; m = Math.round(Math.abs(m)); if (!m) return '0원';
  const eok = Math.floor(m / 10000), r = m % 10000; let s = eok ? `${eok}억` : '';
  if (r) {
    const th = Math.floor(r / 1000), rest = r % 1000;
    const t = th ? th + '천' + (rest >= 100 ? Math.floor(rest / 100) + '백' + (rest % 100 ? rest % 100 : '') : (rest ? rest : '')) : String(r);
    s += (s ? ' ' : '') + t + '만';
  }
  return (neg ? '−' : '') + s + '원';
}
export const fmtWon = (w) => Math.round(w).toLocaleString('ko-KR') + '원';
export const r1 = (x) => Math.round(x * 10) / 10;
export const r2 = (x) => Math.round(x * 100) / 100;
export const pct = (x) => (Number.isFinite(x) ? `${r2(x)}%` : '-');
export function mo(x) {
  if (!Number.isFinite(x)) return '계산 불가';
  let y = Math.floor(x / 12), m = Math.round(x % 12); if (m === 12) { y++; m = 0; }
  return ((y ? `${y}년 ` : '') + (m || !y ? `${m}개월` : '')).trim();
}

export function attachConv(input) {
  const lab = input.closest('label'); if (!lab || lab.querySelector('.conv')) return;
  const u = lab.querySelector('.u'); if (!u || !u.textContent.trim().startsWith('만원')) return;
  const sp = document.createElement('span'); sp.className = 'conv'; sp.setAttribute('aria-live', 'polite'); lab.appendChild(sp);
  const f = () => { sp.textContent = input.value.trim() !== '' && Math.abs(parseFloat(input.value)) >= 1 ? '= ' + kor(parseFloat(input.value)) : ''; };
  input.addEventListener('input', f); f();
}
export const initConv = (root = document) => root.querySelectorAll('input[type=number]').forEach(attachConv);

export const rowHtml = (k, v, total) => `<tr${total ? ' class="total"' : ''}><th>${k}</th><td>${v}</td></tr>`;
export const tableHtml = (rows) => `<div class="scroll"><table class="rtable">${rows.map((r) => rowHtml(r[0], r[1], r[2])).join('')}</table></div>`;
export const dim = (s) => ` <span class="dim">${s}</span>`;
export const emptyHtml = (msg) => `<p class="empty">${msg}</p>`;

export function hook(formId, fn) {
  const f = $(formId);
  f.addEventListener('input', fn); f.addEventListener('change', fn);
  f.addEventListener('submit', (e) => e.preventDefault());
  fn();
}
