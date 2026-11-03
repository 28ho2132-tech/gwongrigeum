import './common.js';
import body from './body.html?raw';
import { kv, shareToBuyer, readSharedData, saveReportImage } from './toss.js';

document.getElementById('app').innerHTML = body;
await kv.init(['gw_draft_v1']);

(function(){
  var FREE = 3, KEY = "gw_used_v1", KEY_PAID = "gw_paid_v1", KEY_SHOPS = "gw_shops_v1", DAY = 864e5;
  var mode = "seller", type = "g", buyerType = "g", sellerPick = "auto", confirmed = false, cmp = null;
  function sget(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function sset(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  var mem = {used: parseInt(sget(KEY)||"0",10)||0, paid: parseInt(sget(KEY_PAID)||"0",10)||0};
  var shops = {}; try{ shops = JSON.parse(sget(KEY_SHOPS)||"{}") || {}; }catch(e){ shops = {}; }
  function remaining(){ return Math.max(0, FREE - mem.used) + mem.paid; }

  function $(id){ return document.getElementById(id); }
  function has(id){ var el = $(id); return !!el && el.value.trim() !== "" && isFinite(parseFloat(el.value)); }
  function num(id){ var el = $(id); var v = el ? parseFloat(el.value) : NaN; return isFinite(v) ? v : 0; }
  function val(el){ var v = parseFloat(el.value); return isFinite(v) ? v : 0; }
  function won(m){
    var neg = m < 0; m = Math.round(Math.abs(m));
    var eok = Math.floor(m/10000), man = m % 10000, s;
    if(eok && man) s = eok + "억 " + man.toLocaleString("ko-KR") + "만원";
    else if(eok) s = eok + "억원";
    else s = man.toLocaleString("ko-KR") + "만원";
    return (neg ? "−" : "") + s;
  }
  function kor(m){ // 만원 → "1억 3천2백만원"
    var neg = m < 0; m = Math.round(Math.abs(m)); if(!m) return "0원";
    var eok = Math.floor(m/10000), r = m % 10000, s = eok ? eok + "억" : "";
    if(r){ var th = Math.floor(r/1000), rest = r % 1000;
      var t = th ? th + "천" + (rest >= 100 ? Math.floor(rest/100) + "백" + (rest%100 ? rest%100 : "") : (rest ? rest : "")) : String(r);
      s += (s ? " " : "") + t + "만"; }
    return (neg ? "−" : "") + s + "원";
  }
  function mo(x){ if(!isFinite(x)) return "계산 불가"; var y = Math.floor(x/12), m = Math.round(x%12); if(m===12){y++;m=0;} return ((y? y+"년 ":"") + (m||!y? m+"개월":"")).trim(); }
  function r1(x){ return Math.round(x*10)/10; }
  function r2(x){ return Math.round(x*100)/100; }
  function pct(x){ return isFinite(x) ? (Math.round(x*1000)/10) + "%" : "-"; }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }

  /* ---------- 만원 입력 옆 한글 금액 ---------- */
  function attachConv(input){
    var lab = input.closest("label"); if(!lab || lab.querySelector(".conv")) return;
    var u = lab.querySelector(".u"); if(!u || u.textContent.indexOf("만원") !== 0) return;
    var sp = document.createElement("span"); sp.className = "conv"; sp.setAttribute("aria-live","polite"); lab.appendChild(sp);
    var f = function(){ sp.textContent = has(input.id) && Math.abs(num(input.id)) >= 1 ? "= " + kor(num(input.id)) : ""; };
    input.addEventListener("input", f); input._conv = f; f();
  }
  function refreshConv(){ document.querySelectorAll("#form input").forEach(function(i){ if(i._conv) i._conv(); }); }

  /* ---------- 시설 항목 ---------- */
  var itemSeq = 0;
  function addItem(name, cost, age){
    var i = ++itemSeq, d = document.createElement("div");
    d.className = "item";
    d.innerHTML =
      '<label for="in' + i + '">항목<span class="inp"><input id="in' + i + '" class="iname" value="' + esc(name||"") + '" placeholder="예: 인테리어"></span></label>' +
      '<label for="ic' + i + '">들인 돈<span class="inp"><input id="ic' + i + '" class="icost" type="number" inputmode="numeric" min="0" value="' + (cost||"") + '"><span class="u">만원</span></span></label>' +
      '<label for="ia' + i + '">몇 년 전<span class="inp"><input id="ia' + i + '" class="iage" type="number" inputmode="decimal" min="0" step="0.5" value="' + (age||"") + '"><span class="u">년</span></span></label>' +
      '<button type="button" class="del" aria-label="이 항목 삭제">×</button>';
    d.querySelector(".del").addEventListener("click", function(){ d.remove(); update(); });
    $("items").appendChild(d);
  }
  function items(){
    var life = num("life");
    if(!$("detail").checked){ var cc = num("facCost"), aa = num("facAge"); return [{name:"시설 일체", cost:cc, age:aa, res: cc * Math.max(0, 1 - aa/life)}]; }
    return Array.prototype.map.call(document.querySelectorAll("#items .item"), function(d){
      var cost = val(d.querySelector(".icost")), age = val(d.querySelector(".iage"));
      return {name: d.querySelector(".iname").value || "시설", cost: cost, age: age, res: cost * Math.max(0, 1 - age/life)};
    });
  }
  function gReady(){ return $("plDetail").checked ? has("sales") : has("profit"); }
  function fReady(){ return $("detail").checked ? items().some(function(i){ return i.cost > 0; }) : has("facCost"); }

  /* ---------- 계산 ---------- */
  function calc(t){
    var c = {t:t, floor:num("floor"), deposit:num("deposit"), rent:num("rent"), mgmt:num("mgmt")};
    var buyer = mode === "buyer";
    c.newRent = buyer && has("newRent") ? num("newRent") : c.rent;
    c.rentUp = buyer ? Math.max(0, c.newRent - c.rent) : 0;
    if(t === "g"){
      c.sales = num("sales");
      c.detail = $("plDetail").checked;
      c.op = c.detail ? c.sales - num("cogs") - num("wage") - num("etc") - c.rent - c.mgmt : num("profit");
      c.ownerCost = $("ownerMode").value === "auto" ? 0 : num("owner");
      c.excess = c.op - c.ownerCost;
      c.months = Math.max(0, num("months"));
      c.basis = $("basis").value;
      c.base = Math.max(0, c.basis === "op" ? c.op : c.excess);
      c.core = c.base * c.months;
    } else {
      c.items = items();
      c.costSum = c.items.reduce(function(a,b){return a+b.cost;},0);
      c.facility = c.items.reduce(function(a,b){return a+b.res;},0);
      c.facRate = Math.min(100, Math.max(0, num("facRate")));
      c.core = c.facility * c.facRate / 100;
    }
    c.computed = c.floor + c.core;
    c.price = buyer ? num("offer") : Math.max(0, c.computed + num("adj"));
    c.adj = c.price - c.computed;
    c.floorIn = Math.min(c.price, c.floor);
    c.floorRate = buyer ? num("floorRate") : 100;
    c.recover = c.floorIn * c.floorRate / 100;
    c.consumable = Math.max(0, c.price - c.recover);
    if(t === "g"){
      c.opB = c.op - c.rentUp; c.exB = c.excess - c.rentUp;
      c.payback = c.consumable === 0 ? 0 : (c.exB > 0 ? c.consumable / c.exB : Infinity);
      c.fullPayback = c.exB > 0 ? c.price / c.exB : Infinity;
      c.opMonths = c.opB > 0 ? c.consumable / c.opB : Infinity;
      c.exMonths = c.exB > 0 ? c.consumable / c.exB : Infinity;
      c.per = c.opB > 0 ? c.price / (c.opB * 12) : Infinity;
      c.psr = c.sales > 0 ? c.price / (c.sales * 12) : Infinity;
      c.margin = c.sales > 0 ? c.opB / c.sales : NaN;
      c.rentRatio = c.sales > 0 ? (c.newRent + c.mgmt) / c.sales : NaN;
      c.yld = (c.price + c.deposit) > 0 ? c.exB * 12 / (c.price + c.deposit) : NaN;
    } else {
      c.facShare = Math.max(0, c.price - c.floorIn);
      c.pbr = (c.floor + c.facility) > 0 ? c.price / (c.floor + c.facility) : Infinity;
      c.costRatio = c.costSum > 0 ? c.facShare / c.costSum : NaN;
      if(buyer){
        c.newBuild = has("newBuild") ? num("newBuild") : c.costSum;
        c.reuse = Math.min(100, Math.max(0, num("reuse")));
        c.saved = c.newBuild * c.reuse / 100;
        c.diff = c.facShare - c.saved;
        c.myProfit = num("myProfit");
        c.payback = c.myProfit > 0 ? c.consumable / c.myProfit : NaN;
      }
    }
    return c;
  }

  /* ---------- 빠진 입력 ---------- */
  function missing(){
    var m = [];
    if(!$("name").value.trim()) m.push(["name","상호"]);
    if(!has("floor")) m.push(["floor","바닥권리금 (없으면 0)"]);
    if($("plDetail").checked && has("sales") && !has("rent")) m.push(["rent","월세 (비용을 나눠 넣을 때 필요)"]);
    if(mode === "seller"){
      if(!gReady() && !fReady()) m.push([$("plDetail").checked ? "sales" : "profit", "장사 실적 또는 시설 중 하나"]);
    } else {
      if(!has("offer")) m.push(["offer","상대방이 부른 권리금"]);
      if(buyerType === "g" && !gReady()) m.push([$("plDetail").checked ? "sales" : "profit", "월 순수익 (양도인 제시)"]);
      if(buyerType === "f" && !fReady()) m.push(["facCost","시설에 들인 돈 (양도인 제시)"]);
    }
    document.querySelectorAll(".inp.missing").forEach(function(e){ e.classList.remove("missing"); });
    return m;
  }

  function current(){
    if(mode === "buyer"){ type = buyerType; cmp = null; return calc(type); }
    var g = gReady(), f = fReady();
    var cg = g ? calc("g") : null, cf = f ? calc("f") : null;
    cmp = {g:cg, f:cf};
    if(!cg && !cf){ type = "g"; return calc("g"); }
    if(!cg) type = "f"; else if(!cf) type = "g";
    else type = sellerPick === "auto" ? (cg.price >= cf.price ? "g" : "f") : sellerPick;
    return type === "g" ? cg : cf;
  }

  /* ---------- 화면 요약 ---------- */
  function bar(label, v, max){ return '<div class="bar"><span>' + label + '</span><span class="track"><span class="fill" style="width:' + (v/max*100).toFixed(1) + '%"></span></span><span class="amt">' + won(v) + '</span></div>'; }
  function opName(){ return {work:"사장 직접 근무", part:"사장 일부 근무", auto:"오토 운영"}[$("ownerMode").value]; }

  function renderSide(c, miss){
    var seller = mode === "seller", kv = [];
    $("bigLabel").textContent = $("mLabel").textContent = seller ? "희망 권리금" : "제시받은 권리금";
    var ready = !miss.length;
    $("bigValue").textContent = $("mValue").textContent = ready ? won(c.price) : "-";

    if(seller){
      var g = cmp.g, f = cmp.f;
      function opt(k, label, sub, cc){
        if(!cc) return '<div class="opt off"><span></span><span>' + label + '<small>' + (k==="g" ? "장사 실적을 넣으면 계산됩니다" : "시설에 들인 돈을 넣으면 계산됩니다") + '</small></span><b>-</b></div>';
        return '<label class="opt' + (type===k?' on':'') + '"><input type="radio" name="pick" value="' + k + '"' + (type===k?' checked':'') + '><span>' + label + '<small>' + sub + '</small></span><b>' + won(cc.price) + '</b></label>';
      }
      var head = (g && f) ? (Math.abs(g.price - f.price) < 1 ? "두 방식의 금액이 같습니다." : (g.price > f.price ? "영업형" : "시설형") + "이 " + won(Math.abs(g.price - f.price)) + " 더 많습니다.") + " 보고서는 선택한 방식으로 만들어집니다."
               : "장사 실적과 시설을 모두 넣으면 두 방식을 비교해 드립니다.";
      $("cmp").innerHTML = '<div class="head">' + head + '</div>' +
        opt("g", "영업형으로 받기", g ? "바닥 + 월 순수익 " + g.months + "개월치" : "", g) +
        opt("f", "시설형으로 받기", f ? "바닥 + 남은 시설값 " + f.facRate + "%" : "", f);
      Array.prototype.forEach.call($("cmp").querySelectorAll("input"), function(r){ r.addEventListener("change", function(){ sellerPick = this.value; update(); }); });
    }

    if(!ready){
      $("bigSub").textContent = "";
      $("note").className = "note warn";
      $("note").innerHTML = "<b>아직 넣지 않은 칸</b><br>" + miss.map(function(x){ return "· " + x[1]; }).join("<br>");
      miss.forEach(function(x){ var el = $(x[0]); if(el) el.closest(".inp").classList.add("missing"); });
      $("bars").innerHTML = ""; $("kv").innerHTML = ""; $("shareBtn").disabled = $("saveImg").disabled = true;
      return;
    }
    $("shareBtn").disabled = $("saveImg").disabled = false;
    $("note").className = "note";
    var parts = "바닥 " + won(c.floor) + " + " + (type==="g" ? "영업 " : "시설 ") + won(c.core);
    if(seller) $("bigSub").textContent = parts + (c.adj ? (c.adj > 0 ? " + 조정 " : " − 조정 ") + won(Math.abs(c.adj)) : "");
    else $("bigSub").textContent = "= 바닥 " + won(c.floorIn) + " + " + (type==="g" ? "영업 몫 " + won(Math.max(0,c.price-c.floorIn)) + (c.op > 0 ? " (월 순수익 " + r1((c.price-c.floorIn)/c.op) + "개월치)" : "") : "시설 몫 " + won(c.facShare));

    if(type === "g"){
      $("note").innerHTML = (seller ? "인수자 " : "") + "실제 회수기간 <b>" + mo(c.payback) + "</b><br><span style=\"font-size:12px;color:var(--muted)\">바닥권리금 빼고, 사람 쓰는 비용 뺀 이익 기준</span>";
      kv.push(["월 순수익", won(c.op)]);
      kv.push(["사람 쓰는 비용 뺀 이익", won(c.excess)]);
      if(!seller){
        kv.push(["영업으로 회수할 돈", won(c.consumable)]);
        if(c.rentUp > 0) kv.push(["월세 인상분", "− " + won(c.rentUp) + "/월"]);
      }
      kv.push(["PER", isFinite(c.per)? r2(c.per)+"배" : "-"]);
      if(c.sales > 0) kv.push(["임대료 비중", pct(c.rentRatio)]);
    } else {
      $("note").innerHTML = seller ? "남은 시설값 " + won(c.facility) + " 중 <b>" + c.facRate + "%</b>를 받습니다."
        : "기존 시설을 다시 써서 아끼는 돈 <b>" + won(c.saved) + "</b><br>권리금 중 시설 몫 <b>" + won(c.facShare) + "</b>";
      kv.push(["시설에 들인 돈", won(c.costSum)]);
      kv.push(["남은 시설값", won(c.facility)]);
      if(!seller) kv.push(["회수기간", c.myProfit > 0 ? mo(c.payback) : "예상 순수익 미입력"]);
      kv.push(["PBR", isFinite(c.pbr) ? r2(c.pbr) + "배" : "-"]);
    }
    var a = seller ? c.floor : c.floorIn, b = seller ? c.core : Math.max(0, c.price - c.floorIn), max = Math.max(1, a, b);
    $("bars").innerHTML = bar("바닥권리금", a, max) + bar(type==="g" ? (seller ? "영업권리금" : "영업 몫") : (seller ? "시설권리금" : "시설 몫"), b, max);
    $("kv").innerHTML = kv.map(function(x){ return "<dt>" + x[0] + "</dt><dd>" + x[1] + "</dd>"; }).join("");
  }

  /* ---------- 보고서 ---------- */
  function rows(list){ return '<div class="scroll"><table>' + list.map(function(r){ return '<tr' + (r[2]?' class="total"':'') + '><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>'; }).join("") + '</table></div>'; }
  function dim(s){ return ' <span class="dim">' + s + '</span>'; }
  function itemTable(c){
    if(!$("detail").checked){ var it = c.items[0];
      return rows([["시설에 들인 돈", won(it.cost) + dim("인테리어·설비 전체")], ["공사 후 지난 기간", it.age + "년" + dim("내용연수 " + num("life") + "년")], ["시설 잔존가치 (남은 시설값)", won(it.res), true]]); }
    var t = '<div class="scroll"><table class="grid4"><tr><th>항목</th><th>들인 돈</th><th>지난 기간</th><th>잔존가치</th></tr>';
    c.items.forEach(function(it){ t += '<tr><td>' + esc(it.name) + '</td><td class="n">' + won(it.cost) + '</td><td class="n">' + it.age + '년</td><td class="n">' + won(it.res) + '</td></tr>'; });
    return t + '<tr class="total"><td>합계</td><td class="n">' + won(c.costSum) + '</td><td class="n">내용연수 ' + num("life") + '년</td><td class="n">' + won(c.facility) + '</td></tr></table></div>';
  }
  function adjRows(c, list){
    if(c.adj){ list.push(["계산 합계", won(c.computed)]); list.push(["가격 조정 (양도인 제시)", (c.adj>0?"+ ":"− ") + won(Math.abs(c.adj))]); }
    list.push(["희망 권리금", won(c.price), true]);
    return list;
  }
  function plTable(c){
    var showCost = c.detail && (mode === "buyer" || $("showCost").checked);
    var l = [];
    if(c.sales > 0) l.push(["월 평균 매출", won(c.sales)]);
    if(showCost){ l.push(["재료비·원가", "− " + won(num("cogs"))]); l.push(["직원 인건비", "− " + won(num("wage"))]); l.push(["기타 비용", "− " + won(num("etc"))]); l.push(["월세 + 관리비", "− " + won(c.rent + c.mgmt)]); }
    l.push(["월 순수익", won(c.op) + dim("모든 비용·월세·관리비를 낸 뒤"), true]);
    l.push(["사장 대체 인건비 (" + opName() + ")", c.ownerCost ? "− " + won(c.ownerCost) : "0원" + dim("직원 인건비에 이미 포함")]);
    l.push(["사장 대체 인건비 제외 이익", won(c.excess), true]);
    return rows(l);
  }
  function gMetrics(c){
    var l = [["PER (권리금 수익배수)", (isFinite(c.per)? r2(c.per)+"배" : "-") + dim("권리금 ÷ 연 순수익")]];
    if(c.sales > 0){
      l.push(["PSR (매출 대비 권리금)", (isFinite(c.psr)? r2(c.psr)+"배" : "-") + dim("권리금 ÷ 연 매출")]);
      l.push(["영업이익률", pct(c.margin) + dim("월 순수익 ÷ 월 매출")]);
      l.push(["임대료 비중", pct(c.rentRatio) + dim("(월세 + 관리비) ÷ 월 매출")]);
    }
    if(c.deposit > 0 || c.price > 0) l.push(["연 수익률", pct(c.yld) + dim("사장 대체 인건비 제외 연 이익 ÷ (권리금 + 보증금)")]);
    return rows(l);
  }
  function fMetrics(c){
    return rows([["PBR (자산 대비 권리금)", (isFinite(c.pbr)? r2(c.pbr)+"배" : "-") + dim("권리금 ÷ (바닥권리금 + 시설 잔존가치)")],
      ["공사비 대비 시설 몫", pct(c.costRatio) + dim("권리금 중 시설 몫 ÷ 시설에 들인 돈")]]);
  }

  function renderDoc(c, miss){
    var seller = mode === "seller", g = type === "g", n = 0;
    if(miss.length){ $("doc").innerHTML = '<p class="empty">필수 칸을 채우면 여기에 보고서가 만들어집니다.</p>'; return; }
    function H(s){ return '<h3>' + (++n) + '. ' + s + '</h3>'; }
    var t = new Date(), d = t.getFullYear() + "." + (t.getMonth()+1) + "." + t.getDate();
    var title = seller ? "권리금 산정 근거서 (" + (g ? "영업형" : "시설형") + ")" : (g ? "권리금 회수 분석 (영업형)" : "권리금 검토 자료 (시설형)");
    var meta = [["상호", $("name").value], ["위치", $("loc").value], ["현재 업종", $("bizName").value], ["전용", has("area") ? num("area") + "평" : ""], ["작성일", d], ["작성", $("author").value]]
      .filter(function(x){ return String(x[1]).trim(); }).map(function(x){ return "<span>" + x[0] + " " + esc(x[1]) + "</span>"; }).join("");
    var h = '<h2>' + title + '</h2><div class="meta">' + meta + '</div>';
    var lease = rows([["보증금", won(c.deposit)], ["월세 · 관리비", won(c.rent) + " · " + won(c.mgmt)], ["영업 가능 기간", "새 임대차계약 시 계약갱신요구권으로 최대 10년"]]);
    var cond = (c.basis==="op" ? "월 순수익 " : "사장 대체 인건비 제외 이익 ") + (g ? won(c.base) + " × " + c.months + "개월치" : "");

    if(g && seller){
      h += H("요약") + rows([["희망 권리금", won(c.price), true], ["권리금 구성", "바닥권리금 + 영업권리금"], ["운영 방식", opName()],
        ["영업권리금 조건", cond], ["인수 후 실제 회수기간", mo(c.payback) + dim("바닥권리금 제외, 사장 대체 인건비 제외 기준")]]);
      h += H("권리금 구성") + rows(adjRows(c, [["바닥권리금", won(c.floor) + dim("상권·층 시세 기준")], ["영업권리금", won(c.core) + dim(cond)]]));
      h += H("월 평균 손익") + plTable(c);
      h += H("임대 조건") + lease;
      h += H("인수자 입장에서 본 회수 구조") + rows([["희망 권리금", won(c.price)], ["그중 바닥권리금", won(c.floorIn) + dim("상권에 붙은 가치, 나갈 때 다시 받는 돈")],
        ["영업으로 회수할 금액", won(c.consumable), true], ["월 순수익으로 환산", isFinite(c.opMonths) ? r1(c.opMonths) + "개월치" : "-"],
        ["실제 회수기간", mo(c.payback) + dim("영업으로 회수할 금액 ÷ 사장 대체 인건비 제외 월 이익")]]);
      h += H("투자 지표") + gMetrics(c);
    } else if(g){
      h += H("요약") + rows([["제시 권리금", won(c.price), true], ["실제 회수기간", mo(c.payback) + dim("바닥권리금 제외, 사장 대체 인건비 제외 기준")],
        ["영업으로 회수할 금액", won(c.consumable) + dim("= 월 순수익 " + (isFinite(c.opMonths)? r1(c.opMonths) : "-") + "개월치")], ["운영 방식", opName()]]);
      h += H("월 평균 손익 (양도인 제시)") + plTable(c);
      h += H("회수 분석") + rows([
        ["제시 권리금 중 바닥권리금", won(c.floorIn) + dim("나갈 때 " + c.floorRate + "% 회수 예상 → " + won(c.recover))],
        ["영업으로 회수할 금액", won(c.consumable), true],
        ["개월치로 환산", "월 순수익 " + (isFinite(c.opMonths)? r1(c.opMonths) : "-") + "개월치 · 사장 대체 인건비 제외 시 " + (isFinite(c.exMonths)? r1(c.exMonths) : "-") + "개월치"],
        ["실제 회수기간", mo(c.payback)], ["전액 기준 회수기간 (참고)", mo(c.fullPayback)],
        ["인수 후 월세", won(c.newRent) + (c.rentUp > 0 ? dim("현재보다 " + won(c.rentUp) + " 인상, 위 계산에 반영") : dim("현재와 같음"))],
        ["영업 가능 기간", "새 임대차계약 시 계약갱신요구권으로 최대 10년"]]);
      h += H("투자 지표") + gMetrics(c);
    } else if(seller){
      h += H("요약") + rows([["희망 권리금", won(c.price), true], ["권리금 구성", "바닥권리금 + 시설권리금"],
        ["시설에 들인 돈", won(c.costSum)], ["시설 잔존가치", won(c.facility) + dim("이 중 " + c.facRate + "% 반영")]]);
      h += H("시설 내역") + itemTable(c);
      h += H("권리금 구성") + rows(adjRows(c, [["바닥권리금", won(c.floor) + dim("상권·층 시세 기준")], ["시설권리금", won(c.core) + dim("잔존가치 " + won(c.facility) + "의 " + c.facRate + "%")]]));
      h += H("임대 조건") + lease;
      h += H("인수자 입장에서 본 비교") + rows([
        ["같은 시설을 새로 할 때 비용", won(c.costSum) + dim("시설에 들인 돈 기준")],
        ["희망 권리금 중 바닥권리금", won(c.floorIn) + dim("상권에 붙은 가치, 나갈 때 다시 받는 돈")],
        ["희망 권리금 중 시설 몫", won(c.facShare), true],
        ["시설 몫 ÷ 새로 할 때 비용", pct(c.costRatio)]]);
      h += H("투자 지표") + fMetrics(c);
    } else {
      h += H("요약") + rows([["제시 권리금", won(c.price), true],
        ["들어갈 업종", ($("myBiz").value ? esc($("myBiz").value) : "-") + ($("bizName").value ? dim("현재 " + esc($("bizName").value)) : "")],
        ["기존 시설을 다시 써서 아끼는 돈", won(c.saved)], ["권리금 중 시설 몫", won(c.facShare)]]);
      h += H("시설 내역 (양도인 제시)") + itemTable(c);
      h += H("비교") + rows([
        ["같은 시설을 새로 하면 드는 돈", won(c.newBuild)], ["다시 쓸 비율", c.reuse + "%"], ["다시 써서 아끼는 돈", won(c.saved), true],
        ["제시 권리금 중 바닥권리금", won(c.floorIn) + dim("나갈 때 " + c.floorRate + "% 회수 예상 → " + won(c.recover))],
        ["제시 권리금 중 시설 몫", won(c.facShare), true],
        ["시설 몫 − 아끼는 돈", (c.diff >= 0 ? "" : "−") + won(Math.abs(c.diff))],
        ["실제로 사라지는 돈", won(c.consumable) + dim("제시 권리금 − 바닥권리금 회수 예상액")],
        ["회수기간", c.myProfit > 0 ? mo(c.payback) + dim("사라지는 돈 ÷ 내 업종 예상 월 순수익 " + won(c.myProfit)) : "예상 순수익 미입력"],
        ["인수 후 월세", won(c.newRent) + (c.rentUp > 0 ? dim("현재보다 " + won(c.rentUp) + " 인상") : dim("현재와 같음"))],
        ["영업 가능 기간", "새 임대차계약 시 계약갱신요구권으로 최대 10년"]]);
      h += H("투자 지표") + fMetrics(c);
    }
    h += '<p class="fine">' + (seller ? "이 자료는 양도인이 제시한 " + (g ? "영업 실적" : "시설 내역") + "을 바탕으로 작성되었습니다." : "이 자료는 입력값을 바탕으로 한 참고용 계산이며 감정평가가 아닙니다.") +
      (g ? " 영업형 권리금은 바닥권리금에 영업권리금(월 순수익 × 개월치)을 더해 계산했으며, 영업이익은 기존 시설을 써서 나오는 돈이므로 시설가치는 따로 더하지 않았습니다."
         : " 시설형 권리금은 바닥권리금에 시설권리금(원가법 잔존가치 × 반영 비율)을 더해 계산했으며, 인수자가 업종을 바꿔 들어오는 경우를 전제로 기존 매출은 반영하지 않았습니다.") +
      " 바닥권리금은 상권이 유지되는 한 퇴거 시 회수되는 금액으로 보았습니다. 실제 거래 금액은 당사자 간 합의로 정해집니다.</p>";
    $("doc").innerHTML = h;
    
  }

  function shopKey(){ return mode + ":" + $("name").value.trim(); }
  function freeEdit(){ var ts = shops[shopKey()]; return ts && Date.now() - ts < DAY; }
  function credits(){ $("credits").innerHTML = "남은 보고서 <b>" + remaining() + "</b>건" + (mem.used < FREE ? " (무료 포함)" : ""); }
  function update(){
    confirmed = false;
    var miss = missing(), c = current();
    renderSide(c, miss); renderDoc(c, miss);
    saveDraft();
  }

  /* ---------- 이벤트 ---------- */
  function setBody(){ document.body.className = mode + " " + (mode === "seller" ? "tg tf" : (buyerType === "g" ? "tg" : "tf")); }
  function sel(a, b, on){ $(a).setAttribute("aria-selected", on); $(b).setAttribute("aria-selected", !on); }
  $("tab-seller").addEventListener("click", function(){ mode = "seller"; sel("tab-seller","tab-buyer",true); setBody(); update(); });
  $("tab-buyer").addEventListener("click", function(){ mode = "buyer"; sel("tab-seller","tab-buyer",false); setBody(); update(); });
  $("type-g").addEventListener("click", function(){ buyerType = "g"; sel("type-g","type-f",true); setBody(); update(); });
  $("type-f").addEventListener("click", function(){ buyerType = "f"; sel("type-g","type-f",false); setBody(); update(); });

  $("plDetail").addEventListener("change", function(){
    var on = this.checked; $("plDetailBox").hidden = !on;
    $("profit").closest("label").hidden = on; $("plSimpleHint").hidden = on;
    update();
  });
  $("detail").addEventListener("change", function(){
    $("detailFac").hidden = !this.checked; $("simpleFac").hidden = this.checked;
    if(this.checked && !document.querySelector("#items .item")){
      var tot = num("facCost"), age = has("facAge") ? num("facAge") : "";
      addItem("인테리어 (바닥·벽·천장·전기)", tot ? Math.round(tot*0.65) : "", age);
      addItem("주방·설비", tot ? Math.round(tot*0.25) : "", age);
      addItem("간판·냉난방기", tot ? Math.round(tot*0.10) : "", age);
      document.querySelectorAll("#items .icost").forEach(attachConv);
    }
    update();
  });
  $("addItem").addEventListener("click", function(){ addItem("", "", ""); document.querySelectorAll("#items .icost").forEach(attachConv); update(); });
  var ownerMem = {work:300, part:150};
  $("ownerMode").addEventListener("change", function(){
    var m = this.value, o = $("owner");
    if(m === "auto"){ o.value = 0; o.disabled = true; } else { o.disabled = false; o.value = ownerMem[m]; }
  });
  $("owner").addEventListener("input", function(){ var m = $("ownerMode").value; if(m !== "auto") ownerMem[m] = num("owner"); });
  $("form").addEventListener("input", update);
  $("form").addEventListener("change", update);
  $("form").addEventListener("submit", function(e){ e.preventDefault(); });
  $("mGo").addEventListener("click", function(){ $("result").scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); });

  var SAMPLE = {name:"도담동 ○○카페", loc:"세종시 도담동 ○○상가 1층", bizName:"카페", area:25, deposit:3000, rent:250, mgmt:30, floor:3000,
    sales:2600, profit:1020, cogs:700, wage:450, etc:150, facCost:9000, facAge:3, offer:13000, myBiz:"베이커리", newBuild:"", myProfit:""};
  $("sample").addEventListener("click", function(){ Object.keys(SAMPLE).forEach(function(k){ $(k).value = SAMPLE[k]; }); refreshConv(); update(); toast("예시 숫자를 채웠어요. 실제 숫자로 바꿔 넣으세요."); });
  $("clear").addEventListener("click", function(){
    document.querySelectorAll("#form input:not([type=checkbox])").forEach(function(i){
      if(["owner","months","facRate","floorRate","reuse"].indexOf(i.id) >= 0) return; i.value = ""; });
    refreshConv(); update(); toast("입력을 모두 지웠어요.");
  });

  function plainText(){
    var out = [];
    $("doc").querySelectorAll("h2,.meta,h3,tr,.fine").forEach(function(n){
      if(n.tagName === "TR") out.push("  " + Array.prototype.map.call(n.children, function(x){return x.textContent.trim();}).join(" : "));
      else if(n.classList.contains("meta")) out.push(Array.prototype.map.call(n.children, function(x){return x.textContent;}).join(" / "));
      else out.push((n.tagName === "H3" ? "\n" : "") + n.textContent.trim());
    });
    return out.join("\n");
  }
  function toast(t){ var e=$("toast"); e.textContent=t; e.style.display="block"; clearTimeout(toast.t); toast.t=setTimeout(function(){e.style.display="none";},2400); }
  /* ---------- 저장·공유 ---------- */
  var FIELDS = Array.prototype.map.call(document.querySelectorAll("#form input:not([type=checkbox]), #form select"), function(i){ return i.id; }).filter(Boolean);
  var CHECKS = ["plDetail","detail","showCost"];
  function snapshot(){
    var d = {v:1, mode:mode, bt:buyerType, sp:sellerPick, f:{}, c:{}, items:[]};
    FIELDS.forEach(function(id){ var el = $(id); if(el && el.value !== "" && !/^i[nca]\d+$/.test(id)) d.f[id] = el.value; });
    CHECKS.forEach(function(id){ d.c[id] = $(id).checked; });
    document.querySelectorAll("#items .item").forEach(function(it){ d.items.push([it.querySelector(".iname").value, it.querySelector(".icost").value, it.querySelector(".iage").value]); });
    return d;
  }
  function restore(d){
    if(!d || !d.f) return;
    Object.keys(d.f).forEach(function(id){ var el = $(id); if(el) el.value = d.f[id]; });
    CHECKS.forEach(function(id){ if(d.c && id in d.c){ $(id).checked = d.c[id]; $(id).dispatchEvent(new Event("change")); } });
    if(d.items && d.items.length){ $("items").innerHTML = ""; d.items.forEach(function(x){ addItem(x[0], x[1], x[2]); }); document.querySelectorAll("#items .icost").forEach(attachConv); }
    if($("ownerMode").value === "auto"){ $("owner").value = 0; $("owner").disabled = true; }
    refreshConv();
  }
  var draftTimer;
  function saveDraft(){ clearTimeout(draftTimer); draftTimer = setTimeout(function(){ kv.set("gw_draft_v1", JSON.stringify(snapshot())); }, 400); }

  $("shareBtn").addEventListener("click", async function(){
    var c = current(), d = snapshot();
    // 받는 사람은 인수자 모드로 열리고, 보낸 사람이 제시한 금액이 '부른 권리금'으로 들어가요.
    d.mode = "buyer"; d.bt = type; d.f.offer = String(Math.round(c.price)); d.from = mode;
    // 비용 항목 비공개면 링크에도 넣지 않아요: 월 순수익만 보냅니다.
    if($("plDetail").checked && !$("showCost").checked){
      var cg = calc("g"); d.c.plDetail = false; d.f.profit = String(Math.round(cg.op));
      ["cogs","wage","etc"].forEach(function(k){ delete d.f[k]; });
    }
    if(mode === "buyer") d.f.offer = $("offer").value;
    try{
      var how = await shareToBuyer(d, $("name").value.trim() || "가게");
      if(how === "clipboard") toast("링크를 복사했어요. 카톡 등에 붙여 넣어 보내세요.");
    }catch(e){ toast("공유를 취소했거나 실패했어요."); }
  });
  $("saveImg").addEventListener("click", async function(){
    try{ var how = await saveReportImage($("doc"), ($("name").value.trim() || "권리금") + "_보고서.png"); toast(how === "toss" ? "보고서 이미지를 저장했어요." : "보고서 이미지를 내려받았어요."); }
    catch(e){ toast("이미지 저장에 실패했어요. 다시 시도해 주세요."); }
  });

  var shared = readSharedData();
  if(shared){
    restore(shared);
    mode = "buyer"; buyerType = shared.bt === "f" ? "f" : "g";
    sel("tab-seller","tab-buyer",false); sel("type-g","type-f", buyerType === "g");
    $("banner").hidden = false;
    $("banner").innerHTML = "<b>" + esc(($("name").value || "가게")) + "</b> 권리금 자료를 받았어요. 부른 금액과 장사 실적이 채워져 있어요. 인수 후 월세, 바닥권리금 회수 예상" + (buyerType === "f" ? ", 다시 쓸 시설 비율" : "") + "을 내 기준으로 바꿔 검토해 보세요.";
  } else {
    try{ var dr = JSON.parse(kv.get("gw_draft_v1") || "null"); if(dr){ restore(dr); mode = dr.mode === "buyer" ? "buyer" : "seller"; buyerType = dr.bt === "f" ? "f" : "g"; sellerPick = dr.sp || "auto";
      sel("tab-seller","tab-buyer", mode === "seller"); sel("type-g","type-f", buyerType === "g"); } }catch(e){}
  }

  document.querySelectorAll("#form input[type=number]").forEach(attachConv);
  setBody();
  update();
})();
