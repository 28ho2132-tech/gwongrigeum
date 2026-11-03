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
// 권리금 정답표: 금액은 만원, 기간은 개월. 화면의 반올림 방식도 그대로 확인합니다.
const goodwill = c.goodwillCalc({
  type: 'g', floor: 3000, profit: 500, owner: 300,
  months: 10, basis: 'op', deposit: 5000,
});
assert.equal(goodwill.core, 5000);
assert.equal(goodwill.price, 8000);
assert.equal(goodwill.floorIn, 3000);
assert.equal(goodwill.recover, 3000);
assert.equal(goodwill.consumable, 5000);
assert.equal(goodwill.rentUp, 0);
assert.equal(goodwill.payback, 25);
assert.equal(goodwill.fullPayback, 40);
assert.equal(Math.round(goodwill.per * 100) / 100, 1.33);
assert.equal(Math.round(goodwill.yld * 1000) / 10, 18.5);

const facility = c.goodwillCalc({
  type: 'f', floor: 3000, life: 8, facRate: 100,
  items: [{ name: '시설 일체', cost: 6000, age: 2 }],
});
assert.equal(facility.items[0].res, 4500);
assert.equal(facility.core, 4500);
assert.equal(facility.price, 7500);
assert.equal(facility.pbr, 1);
assert.equal(facility.facShare, 4500);

// 인수자 월세 인상, 상세 손익, 자동 운영, 다른 수익배수 기준을 확인합니다.
const buyerGoodwill = c.goodwillCalc({
  type: 'g', mode: 'buyer', floor: 3000, deposit: 5000,
  rent: 200, newRent: 250, mgmt: 30, sales: 2000, detail: true,
  cogs: 600, wage: 400, etc: 270, owner: 300,
  months: 10, basis: 'excess', offer: 8000, floorRate: 50,
});
assert.equal(buyerGoodwill.op, 500);
assert.equal(buyerGoodwill.core, 2000);
assert.equal(buyerGoodwill.rentUp, 50);
assert.equal(buyerGoodwill.recover, 1500);
assert.equal(buyerGoodwill.consumable, 6500);
assert.equal(buyerGoodwill.nonFloor, 5000);
assert.equal(buyerGoodwill.nonFloorOpMonths, 10);
eq(buyerGoodwill.payback, 6500 / 150, '인수자 실제 회수기간');
eq(buyerGoodwill.per, 8000 / (450 * 12), '인수자 PER');
eq(buyerGoodwill.psr, 8000 / (2000 * 12), 'PSR');
eq(buyerGoodwill.margin, 450 / 2000, '영업이익률');
eq(buyerGoodwill.rentRatio, 280 / 2000, '임대료 비중');
eq(buyerGoodwill.yld, 150 * 12 / 13000, '인수자 연 수익률');
const autoGoodwill = c.goodwillCalc({ type: 'g', ownerMode: 'auto', owner: 300, profit: 500, months: 10 });
assert.equal(autoGoodwill.ownerCost, 0);
assert.equal(autoGoodwill.payback, 10);

// 시설형 인수자의 재사용 비교와 입력 객체가 변경되지 않는지 확인합니다.
const facilityInput = Object.freeze({
  type: 'f', mode: 'buyer', floor: 3000, offer: 7500, floorRate: 100,
  life: 8, facRate: 100, reuse: 60, myProfit: 300,
  items: Object.freeze([Object.freeze({ name: '시설 일체', cost: 6000, age: 2 })]),
});
const buyerFacility = c.goodwillCalc(facilityInput);
assert.equal(buyerFacility.newBuild, 6000);
assert.equal(buyerFacility.saved, 3600);
assert.equal(buyerFacility.diff, 900);
assert.equal(buyerFacility.payback, 15);
assert.equal(buyerFacility.costRatio, 0.75);
assert.deepEqual(c.goodwillCalc(facilityInput), buyerFacility);
assert.equal('res' in facilityInput.items[0], false);

// 기존의 0·적자·수명 초과·비율 보정 동작을 바꾸지 않습니다.
assert.equal(c.goodwillCalc({ type: 'g', profit: 100, owner: 300, months: 10 }).payback, Infinity);
assert.equal(c.goodwillCalc({ type: 'g', floor: 3000 }).payback, 0);
assert.ok(Number.isNaN(c.goodwillCalc({ type: 'g' }).yld));
assert.equal(c.goodwillCalc({ type: 'f', life: 8, items: [{ cost: 6000, age: 10 }] }).facility, 0);
assert.equal(c.goodwillCalc({ type: 'f', facRate: 150 }).facRate, 100);
assert.equal(c.goodwillCalc({ type: 'g', months: -10 }).months, 0);
assert.equal(c.goodwillCalc({ type: 'g', mode: 'buyer', rent: 200, newRent: 100 }).rentUp, 0);
console.log('계산 검산 모두 통과');
