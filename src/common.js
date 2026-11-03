import './style.css';
import './site.css';
import { contact } from './site.config.js';

const cta = document.getElementById('cta');
if (cta && (contact.tel || contact.kakao)) {
  const links = [];
  if (contact.tel) links.push(`<a class="btn" href="tel:${contact.tel.replace(/[^0-9+]/g, '')}">전화 상담 ${contact.tel}</a>`);
  if (contact.kakao) links.push(`<a class="btn ghost" href="${contact.kakao}" target="_blank" rel="noopener">카카오톡 상담</a>`);
  cta.innerHTML = `<div><b>${contact.name}</b><p>계산 결과를 가지고 상담해 보세요. 세종 상가 거래 상황에 맞춰 같이 봐 드립니다.</p></div><div class="btns">${links.join('')}</div>`;
  cta.hidden = false;
}
