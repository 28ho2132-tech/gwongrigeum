# 상가 계산기 (더키부동산) — 원본 소스

배포 주소: https://28ho2132-tech.github.io/gwongrigeum/
(배포 결과물은 이 저장소의 `main` 브랜치, 원본 소스는 `source` 브랜치)

## 구조
- `index.html`, `goodwill/ brokerage/ protection/ yield/ breakeven/` : 각 페이지 (Vite 멀티페이지)
- `src/calc.js` : 모든 계산 로직 (순수 함수, 금액 단위 만원) — 테스트 대상
- `src/lib.js` : 화면 공용 도우미, `src/common.js` : 공통 스타일/상담 버튼
- `src/site.config.js` : 상담 연락처(전화·카카오) 설정 — 비어 있으면 버튼 숨김
- `src/goodwill.js` : 권리금 계산기 본체, 나머지 `src/<페이지>.js`
- `vite.config.ts` : 머리말/꼬리말 주입, sitemap.xml·robots.txt 생성
- `public/` : 아이콘, og 이미지, 구글 서치콘솔 인증 파일(삭제 금지)
- `tests/calc.test.mjs` : 계산 검산 (`node tests/calc.test.mjs`)

## 빌드·배포
```
npm install
node tests/calc.test.mjs
SITE_URL=https://28ho2132-tech.github.io/gwongrigeum/ npx vite build
```
`dist/` 안의 내용을 `main` 브랜치 루트에 복사해 푸시하면 GitHub Pages에 반영됩니다. (`.nojekyll` 유지)
