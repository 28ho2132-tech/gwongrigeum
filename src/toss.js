// 토스 앱(앱인토스) 기능 연결부.
// 토스 앱 밖(일반 브라우저·개발 서버)에서는 같은 기능을 브라우저 방식으로 대신해요.
import { Share, Storage, File, IAP, Environment, getOperationalEnvironment } from '@apps-in-toss/web-framework';
import html2canvas from 'html2canvas';

export const APP_NAME = 'gwongrigeum';
// 콘솔 > 인앱 결제에서 만든 소모품 상품의 SKU를 넣으세요. 비워두면 시험 충전으로 동작해요.
export const REPORT_SKU = '';

export function inToss() {
  try { const e = getOperationalEnvironment(); return e === 'toss' || e === 'sandbox'; } catch { return false; }
}

/* ---------- 저장소: 화면 코드는 동기로 읽고, 토스 Storage에 비동기로 저장 ---------- */
const cache = {};
export const kv = {
  async init(keys) {
    for (const k of keys) {
      let v = null;
      if (inToss()) { try { v = await Storage.getItem(k); } catch { v = null; } }
      if (v === null) { try { v = localStorage.getItem(k); } catch { v = null; } }
      cache[k] = v;
    }
  },
  get(k) { return k in cache ? cache[k] : null; },
  set(k, v) {
    cache[k] = v;
    try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ }
    if (inToss()) Storage.setItem(k, v).catch(() => {});
  },
};

/* ---------- 공유 링크: 입력값을 링크에 담아 인수자에게 보내요 ---------- */
function toB64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64Url(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
}

export async function shareToBuyer(data, title) {
  const d = toB64Url(JSON.stringify(data));
  const message = (t) => `${title} 권리금 자료를 보내드려요.\n아래 링크를 열면 숫자가 채워진 상태로 직접 검토할 수 있어요.\n${t}`;
  if (inToss()) {
    const link = await Share.createLink({ path: `intoss://${APP_NAME}?d=${d}` });
    await Share.sendMessage({ message: message(link) });
    return 'toss';
  }
  const url = `${location.origin}${location.pathname}?d=${d}`;
  if (navigator.share) { await navigator.share({ title: `${title} 권리금 자료`, text: message(url) }); return 'web-share'; }
  await navigator.clipboard.writeText(message(url));
  return 'clipboard';
}

export function readSharedData() {
  const urls = [location.href];
  try { if (inToss()) urls.unshift(Environment.initialURL); } catch { /* 없음 */ }
  for (const u of urls) {
    try {
      const m = /[?&]d=([A-Za-z0-9_-]+)/.exec(u || '');
      if (m) return JSON.parse(fromB64Url(m[1]));
    } catch { /* 깨진 링크는 무시 */ }
  }
  return null;
}

/* ---------- 보고서 이미지 저장 ---------- */
export async function saveReportImage(el, fileName) {
  const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: false });
  const dataUrl = canvas.toDataURL('image/png');
  if (inToss()) {
    await File.saveBase64({ data: dataUrl.split(',')[1], fileName, mimeType: 'image/png' });
    return 'toss';
  }
  const a = document.createElement('a'); a.href = dataUrl; a.download = fileName; a.click();
  return 'download';
}

/* ---------- 보고서 1건 결제 (소모품 인앱결제) ---------- */
export function canPurchase() {
  try { return inToss() && !!REPORT_SKU && IAP.createOneTimePurchaseOrder.isSupported(); } catch { return false; }
}

// grant(orderId): 이용권 1건 지급. 이미 지급한 주문이면 false 없이 true를 돌려주면 돼요.
export function purchaseReport(grant) {
  return new Promise((resolve, reject) => {
    let cleanup = () => {};
    cleanup = IAP.createOneTimePurchaseOrder({
      options: { sku: REPORT_SKU, processProductGrant: ({ orderId }) => grant(orderId) },
      onEvent: () => { cleanup(); resolve(true); },
      onError: (e) => { cleanup(); reject(e); },
    });
  });
}

// 결제는 됐는데 지급이 안 된 주문을 앱 시작 때 다시 지급해요 (검수 필수 항목).
export async function recoverPendingOrders(grant) {
  if (!canPurchase()) return 0;
  try {
    if (!IAP.getPendingOrders.isSupported()) return 0;
    const { orders } = await IAP.getPendingOrders();
    let n = 0;
    for (const o of orders) {
      if (o.sku !== REPORT_SKU) continue;
      if (await grant(o.orderId)) { await IAP.completeProductGrant({ params: { orderId: o.orderId } }); n++; }
    }
    return n;
  } catch { return 0; }
}
