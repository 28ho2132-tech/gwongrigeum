import assert from 'node:assert/strict';
import * as c from '../src/calc.js';
const eq = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-6, `${m}: ${a} != ${b}`);

// 중개보수
assert.deepEqual(c.leaseBase(1000, 40), { base: 5000, factor: 100, full: 5000 }); // 정확히 5천만원은 ×100 유지
assert.deepEqual(c.leaseBase(500, 30), { base: 2600, factor: 70, full: 3500 });    // 5천만원 미만 → ×70
assert.deepEqual(c.leaseBase(3000, 250), { base: 28000, factor: 100, full: 28000 });
assert.deepEqual(c.leaseBase(20000, 0), { base: 20000, factor: 0, full: 20000 });   // 전세
assert.equal(c.brokerFee(28000, 0.9), 2520000);
assert.equal(c.brokerFee(5000, 0.9), 450000);
assert.equal(c.brokerFee(2600, 0.9), 234000);

// 환산보증금 · 보호범위 (세종 5.4억)
let s = c.scope(3000, 250, 'metro'); assert.equal(s.conv, 28000); assert.equal(s.within, true);
s = c.scope(20000, 400, 'metro'); assert.equal(s.conv, 60000); assert.equal(s.within, false); assert.equal(s.diff, 6000);
s = c.scope(54000, 0, 'metro'); assert.equal(s.within, true); // 기준금액 '이하'
s = c.scope(40000, 140, 'metro'); assert.equal(s.conv, 54000); assert.equal(s.within, true);
s = c.scope(40000, 141, 'metro'); assert.equal(s.within, false);
eq(c.increaseLimit(250), 262.5, '월세 250 → 5%'); eq(c.increaseLimit(3000), 3150, '보증금');
eq(c.increaseRate(250, 270), 8, '인상률');

// 날짜
assert.equal(c.fmtDate(c.addMonths(c.parseDate('2026-08-31'), -6)), '2026년 2월 28일'); // 말일 보정
assert.equal(c.fmtDate(c.addMonths(c.parseDate('2026-08-31'), -1)), '2026년 7월 31일');
assert.equal(c.parseDate('2026-02-30'), null);
let r = c.renewal('2020-03-01', '2026-02-28');
assert.equal(c.fmtDate(r.limitEnd), '2030년 2월 28일'); assert.equal(r.canRequest, true);
assert.equal(c.fmtDate(r.windowStart), '2025년 8월 28일'); assert.equal(c.fmtDate(r.windowEnd), '2026년 1월 28일');
r = c.renewal('2016-05-01', '2026-04-30'); assert.equal(c.fmtDate(r.limitEnd), '2026년 4월 30일'); assert.equal(r.canRequest, false); assert.equal(r.before2018, true);
r = c.renewal('2020-01-01', '2025-12-31'); assert.equal(r.canRequest, true);
assert.equal(c.renewal('2026-01-01', '2025-01-01'), null);

// 투자수익률: 매매 5억, 보증금 5천, 월세 300, 공실 1개월, 운영비 연 600, 대출 2억 금리 5%, 취득 4.6%, 중개 0.9%
const y = c.yieldCalc({ price: 50000, deposit: 5000, monthly: 300, vacancy: 1, opex: 600, loan: 20000, rate: 5, acqPct: 4.6, brokerPct: 0.9, extra: 0 });
eq(y.acq, 2300, '취득세'); eq(y.broker, 450, '중개'); eq(y.totalCost, 52750, '총비용'); eq(y.equityNoLoan, 47750, '대출 전 실투자');
eq(y.equity, 27750, '내 돈'); eq(y.income, 3300, '연 수입'); eq(y.net, 2700, '순수입'); eq(y.interest, 1000, '이자'); eq(y.netAfter, 1700, '이자 후');
eq(y.gross, 7.2, '표면수익률'); eq(y.unlevered, 2700 / 47750 * 100, '대출 전'); eq(y.levered, 1700 / 27750 * 100, '대출 후'); eq(y.monthlyCash, 1700 / 12, '월 현금');
assert.ok(Number.isNaN(c.yieldCalc({ price: 0, monthly: 0 }).gross));
assert.ok(Number.isNaN(c.yieldCalc({ price: 10000, deposit: 10000, monthly: 100, loan: 0 }).unlevered)); // 실투자금 0 이하

// 손익분기: 고정비 월세250+관리30+인건450+본인300+기타50=1080, 변동비율 35% → 공헌이익률 65%
const b = c.breakeven({ rent: 250, mgmt: 30, labor: 450, ownerPay: 300, other: 50, varPct: 35, sales: 2600, initial: 9000, days: 26, ticket: 8000, target: 200 });
eq(b.fixed, 1080, '고정비'); eq(b.cm, 0.65, 'cm'); eq(b.be, 1080 / 0.65, 'BEP'); eq(b.profit, 2600 * 0.65 - 1080, '이익');
eq(b.targetSales, (1080 + 200) / 0.65, '목표 매출'); eq(b.payback, 9000 / (2600 * 0.65 - 1080), '회수');
eq(b.daily, 1080 / 0.65 / 26, '일 매출'); eq(b.customers, (1080 / 0.65) * 10000 / 26 / 8000, '일 고객');
assert.equal(c.breakeven({ varPct: 100, rent: 100 }).be, Infinity);
assert.equal(c.breakeven({ rent: 100, varPct: 30, sales: 100, initial: 500 }).payback, Infinity); // 적자면 회수 불가
console.log('계산 검산 모두 통과');
