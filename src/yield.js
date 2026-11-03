import './common.js';
import { $, numOf, hasVal, won, pct, initConv, hook, tableHtml, dim, emptyHtml } from './lib.js';
import { yieldCalc } from './calc.js';

initConv();
function render() {
  const out = $('result');
  if (!hasVal('price') || numOf('price') <= 0) { out.innerHTML = `<div class="rcard"><h2>수익률</h2>${emptyHtml('매매가를 넣으면 계산됩니다.')}</div>`; return; }
  const o = { price: numOf('price'), deposit: numOf('deposit'), monthly: numOf('monthly'), vacancy: Math.min(12, numOf('vacancy')), opex: numOf('opex'), loan: numOf('loan'), rate: numOf('rate'), acqPct: numOf('acqPct'), brokerPct: numOf('brokerPct'), extra: numOf('extra') };
  const r = yieldCalc(o);
  const head = [
    ['표면수익률', pct(r.gross) + dim('1년 월세 ÷ 매매가'), true],
    ['실질수익률 (대출 제외)', pct(r.unlevered) + dim('운영비·공실 반영, 실투자금 기준')],
  ];
  if (o.loan > 0) head.push(['대출 반영 수익률', pct(r.levered) + dim('이자 낸 뒤, 내 돈 기준')]);
  const money = [
    ['취득 비용 합계', won(r.totalCost) + dim('매매가 + 취득세 + 중개보수 + 기타')],
    ['실투자금 (보증금 제외)', won(r.equityNoLoan)],
  ];
  if (o.loan > 0) money.push(['내 돈 (대출까지 제외)', won(r.equity)]);
  const flow = [
    ['1년 임대수입', won(r.income) + dim(`월세 × ${12 - o.vacancy}개월`)],
    ['1년 운영비', '−' + won(o.opex)],
    ['1년 순수입', won(r.net), true],
  ];
  if (o.loan > 0) { flow.push(['1년 대출 이자', '−' + won(r.interest)]); flow.push(['이자 낸 뒤 1년 순수입', won(r.netAfter) + dim(`월 ${won(r.monthlyCash)}`), true]); }
  const warn = o.loan > 0 && r.equity <= 0 ? '<div class="callout alert">대출금과 보증금이 취득 비용 이상이라 내 돈 기준 수익률을 계산할 수 없습니다.</div>' : '';
  out.innerHTML = `<div class="rcard"><h2>수익률</h2>${tableHtml(head)}${warn}</div><div class="rcard"><h2>들어가는 돈</h2>${tableHtml(money)}</div><div class="rcard"><h2>1년 현금 흐름</h2>${tableHtml(flow)}<p class="dim" style="margin:10px 0 0">세금과 양도차익은 계산에 넣지 않았습니다.</p></div>`;
}
hook('form', render);
