import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';

// 배포 주소(끝에 / 포함). 나중에 도메인을 연결하면 SITE_URL 환경변수만 바꿔서 빌드하면 됩니다.
const SITE_URL = process.env.SITE_URL || 'https://28ho2132-tech.github.io/gwongrigeum/';

const TOOLS: [string, string][] = [
  ['goodwill/', '권리금 계산기'],
  ['brokerage/', '중개보수'],
  ['protection/', '상가임대차보호법'],
  ['yield/', '투자수익률'],
  ['breakeven/', '손익분기'],
];
const DIRS = ['', ...TOOLS.map(([d]) => d)];

function siteKit(): Plugin {
  return {
    name: 'site-kit',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
      const dir = (ctx.path || '').replace(/^\//, '').replace(/index\.html$/, '');
      const root = dir ? '../' : './';
      const nav = TOOLS.map(([d, t]) => `<a href="${root}${d}"${d === dir ? ' aria-current="page"' : ''}>${t}</a>`).join('');
      const header = `<header class="site-head"><div class="site-head-in"><a class="brand" href="${root}"><b>상가 계산기</b><small>더키부동산</small></a><nav aria-label="주요 메뉴">${nav}</nav></div></header>`;
      const footer = `<footer class="site-foot"><div class="site-foot-in"><p>이 사이트의 계산 결과는 입력하신 값을 바탕으로 한 참고용이며 감정평가·법률 자문이 아닙니다. 법령과 요율은 2026년 11월 3일 기준으로 확인했고, 실제 거래 전에는 국가법령정보센터(law.go.kr)와 전문가를 통해 다시 확인하세요.</p><p>입력하신 내용은 이 기기에만 저장되며 서버로 보내지 않습니다. 운영: 더키부동산(세종)</p></div></footer>`;
      return html
        .replaceAll('<!--SITE_HEADER-->', header)
        .replaceAll('<!--SITE_FOOTER-->', footer)
        .replaceAll('%ROOT%', root)
        .replaceAll('%PAGE_URL%', SITE_URL + dir)
        .replaceAll('%SITE_URL%', SITE_URL);
      },
    },
    generateBundle() {
      const day = new Date().toISOString().slice(0, 10);
      const urls = DIRS.map((d) => `  <url><loc>${SITE_URL}${d}</loc><lastmod>${day}</lastmod></url>`).join('\n');
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n` });
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: Object.fromEntries(DIRS.map((d) => [d.replace('/', '') || 'home', resolve(process.cwd(), d, 'index.html')])),
    },
  },
  esbuild: { target: 'es2022' },
  plugins: [siteKit()],
});
