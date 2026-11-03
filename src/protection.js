import './common.js';
import { $, numOf, hasVal, won, fmtWon, r2, initConv, hook, tableHtml, dim, emptyHtml, mo } from './lib.js';
import { REGIONS, scope, increaseLimit, increaseRate, renewal, fmtDate, INCREASE_CAP } from './calc.js';

initConv();
const manDec = (x) => `${r2(x).toLocaleString('ko-KR')}만원`;
const list = (a) => `<ul>${a.map((t) => `<li>${t}</li>`).join('')}</ul>`;

function scopeCard(s) {
  const lists = s.within
    ? { yes: ['대항력 (제3조)', '계약갱신요구권 10년 (제10조)', '권리금 회수기회 보호 (제10조의4 등)', '월세 5% 인상 상한 (제11조)', '우선변제권, 임차권등기명령', '묵시적 갱신 (제10조 제4항)'], no: [] }
    : { yes: ['대항력 (제3조)', '계약갱신요구권 10년 (제10조 제1·2항, 제3항 본문)', '권리금 회수기회 보호 (제10조의2~8)', '폐업으로 인한 해지권 (제11조의2)', '표준계약서 (제19조)'], no: ['월세 5% 인상 상한 (제11조)', '우선변제권, 임차권등기명령', '묵시적 갱신 (제10조 제4·5항)'] };
  const rows = [
    ['환산보증금', won(s.conv) + dim('보증금 + 월세 × 100'), true],
    ['지역 기준금액', won(s.limit) + dim('이하면 법 전부 적용')],
    ['비교 결과', s.within ? `<span class="tag">기준 이하</span> 법이 전부 적용됩니다` : `<span class="tag off">기준 초과</span> ${won(s.diff)} 넘습니다`],
  ];
  const two = s.within
    ? `<div class="callout">환산보증금이 기준 이하라 상가건물 임대차보호법의 규정이 모두 적용됩니다.${list(lists.yes)}</div>`
    : `<div class="two"><div><h4>그래도 적용되는 규정</h4>${list(lists.yes)}</div><div><h4>적용되지 않는 규정</h4>${list(lists.no)}</div></div>`;
  return `<div class="rcard"><h2>① 법이 적용되는 계약인가</h2>${tableHtml(rows)}${two}</div>`;
}

function increaseCard(s) {
  const m = numOf('monthly'), d = numOf('deposit'), am = hasVal('askMonthly') ? numOf('askMonthly') : null, ad = hasVal('askDeposit') ? numOf('askDeposit') : null;
  const rows = [];
  if (s.within) {
    if (m > 0) rows.push(['월세 최대 인상액', `${manDec(increaseLimit(m))}` + dim(`${manDec(m)} × 1.05 (${fmtWon(Math.floor(m * 10500))})`), true]);
    if (d > 0) rows.push(['보증금 최대 인상액', `${manDec(increaseLimit(d))}` + dim(`${manDec(d)} × 1.05`)]);
  }
  if (am != null && m > 0) rows.push(['요구한 월세 인상률', `${r2(increaseRate(m, am))}%` + (s.within ? dim(`상한 ${INCREASE_CAP}%`) : ''), s.within ? false : false]);
  if (ad != null && d > 0) rows.push(['요구한 보증금 인상률', `${r2(increaseRate(d, ad))}%` + (s.within ? dim(`상한 ${INCREASE_CAP}%`) : '')]);
  let note;
  if (s.within) {
    const over = (am != null && m > 0 && increaseRate(m, am) > INCREASE_CAP + 1e-9) || (ad != null && d > 0 && increaseRate(d, ad) > INCREASE_CAP + 1e-9);
    note = `<div class="callout${over ? ' alert' : ''}">${over ? '<b>요구한 인상률이 5%를 넘습니다.</b> 5% 상한이 적용되는 계약에서 증액 청구는 청구 당시 금액의 5%를 넘을 수 없습니다. ' : ''}증액은 계약을 맺은 날이나 직전에 올린 날부터 1년이 지나야 청구할 수 있습니다. 임대인과 합의해서 새로 쓰는 계약에는 이 상한이 적용되지 않으니, 서명 전에 확인하세요.<br><span class="dim">보증금과 월세를 함께 올릴 때 환산보증금의 5%로 계산하는 실무도 있어, 여기서는 각각 5%로 표시했습니다.</span></div>`;
  } else {
    note = `<div class="callout">환산보증금이 기준을 넘어 <b>5% 인상 상한(제11조)이 적용되지 않습니다.</b> 갱신 때의 증감 청구는 제10조의2에 따라 조세·공과금·주변 시세·경제 사정 변동 등을 고려해 다투게 되며, 숫자로 정해진 상한은 없습니다.</div>`;
  }
  return `<div class="rcard"><h2>② 월세 인상 한도</h2>${rows.length ? tableHtml(rows) : ''}${note}</div>`;
}

function renewalCard(s) {
  const r = renewal($('start').value, $('end').value);
  if (!r) return `<div class="rcard"><h2>③ 갱신요구·권리금 회수 기간</h2>${emptyHtml('최초 시작일과 만료일을 넣으면 계산됩니다. 만료일은 시작일보다 뒤여야 합니다.')}</div>`;
  const rows = [
    ['갱신요구 가능 기간', `${fmtDate(r.windowStart)} ~ ${fmtDate(r.windowEnd)}` + dim('만료 6개월 전 ~ 1개월 전'), true],
    ['권리금 회수기회 보호 기간', `${fmtDate(r.premiumFrom)} ~ ${fmtDate(r.end)}` + dim('만료 6개월 전부터 종료 시까지')],
    ['10년 한도가 끝나는 날', fmtDate(r.limitEnd) + dim('최초 시작일부터 10년')],
    ['이번 만료 때 갱신요구', r.canRequest ? `<span class="tag">가능</span> 10년 한도 안입니다` : `<span class="tag off">불가</span> 10년 한도에 도달합니다`],
  ];
  if (r.canRequest) rows.push(['10년까지 남은 기간', mo(r.remainDays / 30.44) + dim('이번 만료일 기준')]);
  let notes = '';
  if (!r.canRequest) notes += `<div class="callout">지금 만료일이 10년 한도가 끝나는 날과 같거나 뒤입니다. 이 만료일 이후로는 갱신요구권으로 갱신을 요구할 수 없습니다. 10년이 지난 뒤 권리금 회수기회가 어디까지 보호되는지는 해석이 갈릴 수 있으니 전문가에게 확인하세요.</div>`;
  if (r.before2018) notes += `<div class="callout alert"><b>2018년 10월 16일 이전에 시작한 계약</b>은 갱신요구 기간이 5년이던 때의 규정이 적용되는 등 계산이 달라질 수 있습니다. 계약서와 전문가를 통해 확인하세요.</div>`;
  if (s.within) notes += `<div class="callout">환산보증금이 기준 이하라, 위 갱신요구 기간 동안 임대인이 갱신 거절이나 조건 변경을 통지하지 않으면 종전과 같은 조건으로 1년 갱신된 것으로 봅니다(묵시적 갱신).</div>`;
  notes += `<p class="dim" style="margin:10px 0 0">달력 날짜 기준으로 계산했습니다. 정확한 마감일과 3기 차임 연체 같은 거절 사유는 계약서와 전문가를 통해 확인하세요.</p>`;
  return `<div class="rcard"><h2>③ 갱신요구·권리금 회수 기간</h2>${tableHtml(rows)}${notes}</div>`;
}

function render() {
  const out = $('result');
  const has = hasVal('deposit') || hasVal('monthly');
  const s = scope(numOf('deposit'), numOf('monthly'), $('region').value);
  const cards = [];
  cards.push(has ? scopeCard(s) : `<div class="rcard"><h2>① 법이 적용되는 계약인가</h2>${emptyHtml('보증금이나 월세를 넣으면 계산됩니다.')}</div>`);
  cards.push(has ? increaseCard(s) : `<div class="rcard"><h2>② 월세 인상 한도</h2>${emptyHtml('보증금이나 월세를 넣으면 계산됩니다.')}</div>`);
  cards.push(renewalCard(s));
  out.innerHTML = cards.join('');
}
hook('form', render);
