import './common.js';
import { $, numOf, hasVal, won, pct, mo, fmtWon, initConv, hook, tableHtml, dim, emptyHtml } from './lib.js';
import { breakeven } from './calc.js';

initConv();
function render() {
  const out = $('result');
  const o = { rent: numOf('rent'), mgmt: numOf('mgmt'), labor: numOf('labor'), ownerPay: numOf('ownerPay'), other: numOf('other'), varPct: numOf('varPct'), sales: numOf('sales'), initial: numOf('initial'), days: numOf('days') || 26, ticket: numOf('ticket'), target: numOf('target') };
  const fixed = o.rent + o.mgmt + o.labor + o.ownerPay + o.other;
  if (fixed <= 0) { out.innerHTML = `<div class="rcard"><h2>손익분기</h2>${emptyHtml('월 고정비를 넣으면 계산됩니다.')}</div>`; return; }
  if (o.varPct >= 100) { out.innerHTML = `<div class="rcard"><h2>손익분기</h2><div class="callout alert">변동비율이 100% 이상이면 팔수록 손해라 손익분기 매출이 없습니다.</div></div>`; return; }
  const r = breakeven(o);
  const rows = [
    ['월 고정비', won(r.fixed)],
    ['손익분기 월 매출', won(r.be), true],
    ['하루 손익분기 매출', won(r.daily) + dim(`월 ${o.days}일 영업`)],
  ];
  if (Number.isFinite(r.customers)) rows.push(['하루 필요 손님 수', `${Math.ceil(r.customers).toLocaleString('ko-KR')}명` + dim(`1명 ${fmtWon(o.ticket)}`)]);
  const cards = [`<div class="rcard"><h2>손익분기</h2>${tableHtml(rows)}</div>`];
  if (hasVal('sales') && o.sales > 0) {
    const p = [
      ['예상 월 매출', won(o.sales)],
      ['월 이익', (r.profit < 0 ? '' : '') + won(r.profit) + dim(r.profit < 0 ? '손실' : '고정비·변동비 모두 뺀 금액'), true],
      ['손익분기 대비 여유', pct(r.marginOfSafety) + dim('(매출 − 손익분기) ÷ 매출')],
    ];
    if (o.initial > 0) p.push(['투자금 회수기간', Number.isFinite(r.payback) ? mo(r.payback) : '회수 불가' + dim('월 이익이 0 이하')]);
    cards.push(`<div class="rcard"><h2>예상 매출일 때</h2>${tableHtml(p)}</div>`);
  }
  if (o.target > 0) cards.push(`<div class="rcard"><h2>월 목표 이익 ${won(o.target)}을 내려면</h2>${tableHtml([['필요 월 매출', won(r.targetSales), true], ['하루 필요 매출', won(r.targetSales / o.days)]])}</div>`);
  out.innerHTML = cards.join('');
}
hook('form', render);
