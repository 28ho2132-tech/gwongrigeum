// 화면과 무관한 순수 계산 함수 모음 (금액 단위: 만원). 검산용 테스트가 이 파일을 그대로 불러 씁니다.

/* ---------- 중개보수 (공인중개사법 시행규칙 제20조 제4항: 주택 외 중개대상물) ---------- */
export const BROKER_CAP = 0.9; // 상한요율(%), 거래금액의 1천분의 9 이내에서 협의

// 임대차 거래금액: 보증금 + 월세×100, 합계가 5천만원 미만이면 보증금 + 월세×70
export function leaseBase(deposit, monthly) {
  if (!(monthly > 0)) return { base: deposit, factor: 0, full: deposit };
  const full = deposit + monthly * 100;
  if (full < 5000) return { base: deposit + monthly * 70, factor: 70, full };
  return { base: full, factor: 100, full };
}

// base: 만원, ratePct: %  → 원 단위 (한쪽이 낼 보수)
export function brokerFee(baseMan, ratePct) {
  return Math.round(baseMan * 10000 * (ratePct / 100));
}

/* ---------- 상가건물 임대차보호법 ---------- */
// 시행령 제2조 제1항 (2019. 4. 2. 개정, 현행). 만원
export const REGIONS = {
  seoul: { label: '서울특별시', limit: 90000 },
  capital: { label: '수도권 과밀억제권역(서울 제외)·부산광역시', limit: 69000 },
  metro: { label: '광역시(위 지역·군지역 제외)·세종특별자치시·파주·화성·안산·용인·김포·광주시', limit: 54000 },
  other: { label: '그 밖의 지역', limit: 37000 },
};

// 환산보증금 = 보증금 + 월차임×100 (시행령 제2조 제3항)
export const convDeposit = (deposit, monthly) => deposit + Math.max(0, monthly) * 100;

export function scope(deposit, monthly, regionKey) {
  const limit = REGIONS[regionKey].limit;
  const conv = convDeposit(deposit, monthly);
  return { conv, limit, within: conv <= limit, diff: conv - limit };
}

// 차임 또는 보증금 증액 청구는 청구 당시 금액의 5%를 넘지 못한다 (법 제11조, 시행령 제4조)
export const INCREASE_CAP = 5; // %
export function increaseLimit(current) {
  return Math.floor(current * 10000 * 1.05) / 10000; // 원 단위 버림, 만원으로
}
export function increaseRate(current, asked) {
  return current > 0 ? (asked / current - 1) * 100 : NaN;
}

/* ---------- 날짜 (UTC 기준, 달력 계산) ---------- */
export function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) || d.getUTCMonth() !== +m[2] - 1 ? null : d;
}
export function addMonths(d, n) {
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d.getUTCDate(), last)));
}
export const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
export const fmtDate = (d) => `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
export const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / 864e5);

// 갱신요구 가능 기간(만료 6개월 전 ~ 1개월 전), 권리금 회수기회 보호 시작(만료 6개월 전),
// 10년 한도(최초 임대차기간 포함 전체 10년 이내: 시작일부터 10년이 끝나는 날)
export function renewal(startStr, endStr) {
  const start = parseDate(startStr), end = parseDate(endStr);
  if (!start || !end || end <= start) return null;
  const windowStart = addMonths(end, -6);
  const windowEnd = addMonths(end, -1);
  const limitEnd = addDays(addMonths(start, 120), -1);
  return {
    start, end, windowStart, windowEnd, limitEnd,
    premiumFrom: windowStart,
    canRequest: end < limitEnd, // 이번 만료 때 갱신요구 가능 (10년 이내)
    before2018: start < new Date(Date.UTC(2018, 9, 16)),
    remainDays: daysBetween(end, limitEnd),
  };
}

/* ---------- 상가 투자수익률 (대출 이자는 이자만 내는 것으로 가정, 세금 제외) ---------- */
export function yieldCalc(o) {
  const { price, deposit = 0, monthly = 0, vacancy = 0, opex = 0, loan = 0, rate = 0, acqPct = 0, brokerPct = 0, extra = 0 } = o;
  const acq = price * acqPct / 100, broker = price * brokerPct / 100;
  const totalCost = price + acq + broker + extra;           // 취득에 드는 전체 돈
  const equityNoLoan = totalCost - deposit;                 // 보증금을 뺀 실투자금(대출 제외 전)
  const equity = equityNoLoan - loan;                       // 대출까지 뺀 내 돈
  const income = monthly * Math.max(0, 12 - vacancy);       // 연 임대수입(공실 반영)
  const net = income - opex;                                // 연 순수입(이자 전)
  const interest = loan * rate / 100;
  const netAfter = net - interest;                          // 이자 낸 뒤 연 순수입
  return {
    acq, broker, totalCost, equityNoLoan, equity, income, net, interest, netAfter,
    gross: price > 0 ? (monthly * 12) / price * 100 : NaN,
    unlevered: equityNoLoan > 0 ? net / equityNoLoan * 100 : NaN,
    levered: equity > 0 ? netAfter / equity * 100 : NaN,
    monthlyCash: netAfter / 12,
  };
}

/* ---------- 창업 손익분기 ---------- */
export function breakeven(o) {
  const { rent = 0, mgmt = 0, labor = 0, ownerPay = 0, other = 0, varPct = 0, sales = 0, initial = 0, days = 26, ticket = 0, target = 0 } = o;
  const fixed = rent + mgmt + labor + ownerPay + other;     // 월 고정비
  const cm = 1 - varPct / 100;                              // 매출에서 변동비를 빼고 남는 비율
  const be = cm > 0 ? fixed / cm : Infinity;                // 손익분기 월 매출
  const profit = sales * cm - fixed;                        // 예상 매출일 때 월 이익
  const targetSales = cm > 0 ? (fixed + target) / cm : Infinity;
  return {
    fixed, cm, be, profit, targetSales,
    payback: profit > 0 && initial > 0 ? initial / profit : (initial > 0 ? Infinity : 0),
    daily: Number.isFinite(be) && days > 0 ? be / days : NaN,
    customers: ticket > 0 && Number.isFinite(be) && days > 0 ? (be * 10000) / days / ticket : NaN, // ticket: 원
    marginOfSafety: sales > 0 && Number.isFinite(be) ? (sales - be) / sales * 100 : NaN,
  };
}
