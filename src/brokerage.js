import './common.js';
import { $, numOf, hasVal, won, fmtWon, initConv, hook, tableHtml, dim, emptyHtml } from './lib.js';
import { leaseBase, brokerFee, BROKER_CAP } from './calc.js';

initConv();
const fee = (w, vat) => fmtWon(vat ? w * 1.1 : w);
const man = (w) => (w >= 10000 ? ` (${(Math.round(w / 1000) / 10).toLocaleString('ko-KR')}만원)` : '');

function render() {
  const kind = $('kind').value;
  document.querySelectorAll('fieldset[data-for]').forEach((f) => { f.hidden = f.dataset.for !== kind; });
  const out = $('result'), vat = $('vat').checked;
  let base, basisRows = [];
  if (kind === 'lease') {
    if (!hasVal('deposit') && !hasVal('monthly')) { out.innerHTML = `<div class="rcard">${emptyHtml('보증금이나 월세를 넣으면 계산됩니다.')}</div>`; return; }
    const d = numOf('deposit'), m = numOf('monthly'), b = leaseBase(d, m);
    base = b.base;
    if (m > 0) {
      basisRows.push(['환산 거래금액', won(b.base) + dim(b.factor === 70
        ? `보증금 ${won(d)} + 월세 ${won(m)} × 100 = ${won(b.full)} (5천만원 미만이라 월세 × 70으로 다시 계산)`
        : `보증금 ${won(d)} + 월세 ${won(m)} × 100`), true]);
    } else basisRows.push(['거래금액', won(base) + dim('전세는 보증금이 거래금액'), true]);
  } else {
    if (!hasVal('price')) { out.innerHTML = `<div class="rcard">${emptyHtml('매매가를 넣으면 계산됩니다.')}</div>`; return; }
    base = numOf('price'); basisRows.push(['거래금액', won(base), true]);
  }
  const rate = hasVal('rate') ? Math.max(0, numOf('rate')) : BROKER_CAP;
  const cap = brokerFee(base, BROKER_CAP), mine = brokerFee(base, rate);
  const vatNote = vat ? dim('부가세 10% 포함') : '';
  const rows = [...basisRows,
    ['법정 상한 요율', `${BROKER_CAP}%`],
    ['한쪽 상한 중개보수', fee(cap, vat) + man(cap) + vatNote, true]];
  if (hasVal('rate') && rate !== BROKER_CAP) {
    rows.push([`협의 요율 ${rate}%`, fee(mine, vat) + man(mine) + vatNote]);
  }
  rows.push(['양쪽이 각각 낼 때 합계', fee((hasVal('rate') ? mine : cap) * 2, vat) + dim(`${hasVal('rate') ? `협의 요율 ${rate}%` : '상한'} 기준, 중개사가 받는 총액`)]);
  let note = '';
  if (rate > BROKER_CAP) note = `<div class="callout alert"><b>입력한 요율 ${rate}%는 법정 상한 ${BROKER_CAP}%를 넘습니다.</b> 주택 외 거래의 중개보수는 거래금액의 0.9%를 넘겨 받을 수 없습니다.</div>`;
  out.innerHTML = `<div class="rcard"><h2>계산 결과</h2>${tableHtml(rows)}${note}
    <p class="dim" style="margin:10px 0 0">권리금은 이 계산에 포함하지 않았습니다. 실제 금액은 중개사무소가 요율표에 적어 둔 요율 이내에서 협의로 정해집니다.</p></div>`;
}
hook('form', render);
