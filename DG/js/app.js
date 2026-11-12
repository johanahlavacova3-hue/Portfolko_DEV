(() => {
const $ = id => document.getElementById(id);
const BLUE = '#1c47f5', INK = '#303030', BLACK = '#111111';
const SW = 29.7, SH = 21;          // list v cm
const MG = 5;                      // okraj listu pro tisk, mm
const FX0 = MG, FY0 = MG, FX1 = 297-MG, FY1 = 210-MG;   // rám výkresu (mm, osa y dolů)
const BY = FY1 - 9;                // horní hrana razítka (výška 9 mm)
const GRID = 2;                    // mřížka 2 mm = tlustý tah ikony
const PXMM = 1101/287;             // px na mm na obrazovce
const FONT = 'SM, monospace';

/* ---------- typy objektů (rozměry ve skutečnosti, mm) ---------- */
const TYPES = {
  stool: { name:'STOLIČKA', def:{W:400,H:450,D:400}, min:{W:110,H:60,D:110},
    boxes(W,H,D){ const l=50, t=50; return [
      [0,0,0,l,l,H-t],[W-l,0,0,W,l,H-t],[0,D-l,0,l,D,H-t],[W-l,D-l,0,W,D,H-t],
      [0,0,H-t,W,D,H] ]; } },
  // židle podle výkresu (M 1:5): nohy 50×50, sedák 25, luby 25×20, opěradlo ze tří svislých prken,
  // nahoře hlavice přes celou šířku se zaobleným vrškem: oblouk o poloměru R = výška − výška sedáku se středem uprostřed šířky ve výšce sedáku
  chair: { name:'ŽIDLE', def:{W:400,H:800,D:400}, min:{W:200,H:400,D:200},
    boxes(W,H,D){
      const l=50, st=25, ah=25, at=20, rh=50, bt=20;
      const sH = Math.round(H*0.5), legTop = sH - st;
      const R = Math.max(H - sH, W/2 + 1), zc = H - R;                 // oblouk hlavice
      const th = Math.asin((W/2)/R), zEnd = zc + R*Math.cos(th);       // výška konců oblouku na hranách
      const bTop = Math.min(H - 80, zEnd - 10);                        // spodní hrana hlavice
      const B = [
        [0,0,0,l,l,legTop],[W-l,0,0,W,l,legTop],          // přední nohy
        [0,D-l,0,l,D,bTop],[W-l,D-l,0,W,D,bTop],          // zadní sloupky
        [0,0,legTop,W,D-l,sH],                            // sedák
        [l,0,legTop-ah,W-l,at,legTop],                    // přední lub
        [0,l,legTop-ah,at,D-l,legTop],[W-at,l,legTop-ah,W,D-l,legTop],   // boční luby
        [l,D-l,sH-rh,W-l,D,sH]                            // zadní příčka pod opěradlem
      ];
      const gap = (W-2*l)/3, v0 = D-l/2-bt/2;
      for (let i=0;i<3;i++) B.push([l+i*gap, v0, sH, l+(i+1)*gap, v0+bt, bTop]);   // prkna opěradla
      // hlavice: hranol s průřezem (u, z) = obdélník zakončený obloukem, vytažený přes hloubku sloupků
      const M = 64, poly = [[0,bTop],[W,bTop]], smooth = [false,false];
      for (let k=0;k<=M;k++){ const a = th - 2*th*k/M; poly.push([W/2 + R*Math.sin(a), zc + R*Math.cos(a)]); smooth.push(k>0 && k<M); }
      B.push({ prism:poly, smooth, v0:D-l, v1:D });
      return B;
    } },
  table: { name:'STŮL', def:{W:800,H:750,D:800}, min:{W:300,H:150,D:300},
    boxes(W,H,D){ const t=30, l=50, o=40, ah=80, at=20, hl=H-t; return [
      [0,0,hl,W,D,H],
      [o,o,0,o+l,o+l,hl],[W-o-l,o,0,W-o,o+l,hl],[o,D-o-l,0,o+l,D-o,hl],[W-o-l,D-o-l,0,W-o,D-o,hl],
      [o+l,o,hl-ah,W-o-l,o+at,hl],[o+l,D-o-at,hl-ah,W-o-l,D-o,hl],
      [o,o+l,hl-ah,o+at,D-o-l,hl],[W-o-at,o+l,hl-ah,W-o,D-o-l,hl] ]; } }
};

const BASE = { type:'stool', N:10, W:400, H:450, D:400, X:2200, Y:0, Z:0, alpha:30, Hx:20, Hy:18, vh:11, d:32 };
const S = { ...BASE, type:'chair', ...TYPES.chair.def };   // ukázka po otevření: židle z výkresu
const show = { constr:true, vlines:true, plan:true, hidden:true, pins:true, situ:false };
let pins = [];

const LIM = { W:[50,5000], H:[50,5000], D:[50,5000], X:[-20000,40000], Y:[0,60000], Z:[-2000,5000], alpha:[0,90],
              Hx:[-10,40], Hy:[1,21], vh:[-10,30], d:[1,200], N:[1,100] };
const clampK = (k,v) => Math.min(LIM[k][1], Math.max(LIM[k][0], v));

const fmt = (n, dp=2) => {
  if (!isFinite(n)) return '∞';
  let s = (Math.round(n*Math.pow(10,dp))/Math.pow(10,dp)).toFixed(dp);
  if (s.includes('.')) s = s.replace(/0+$/,'').replace(/\.$/,'');
  if (s === '-0') s = '0';
  return s.replace('.', ',').replace('-', '−');
};
const fmtF = (n, dp=2) => n.toFixed(dp).replace('.', ',').replace('-', '−');

/* ---------- přepočet na list (cm) ---------- */
// Každý díl je konvexní mnohostěn: poloprostory n·x ≤ d, hrany (ostré, nebo hladké s normálami sousedních stěn) a vrcholy.
function boxSolid(b){
  const [x0,y0,z0,x1,y1,z1] = b;
  const planes = [[-1,0,0,-x0],[1,0,0,x1],[0,-1,0,-y0],[0,1,0,y1],[0,0,-1,-z0],[0,0,1,z1]];
  const V = []; for (let i=0;i<8;i++) V.push([i&1?x1:x0, i&2?y1:y0, i&4?z1:z0]);
  const edges = []; for (let i=0;i<8;i++) for (const bit of [1,2,4]) if (!(i&bit)) edges.push({ a:V[i], b:V[i|bit] });
  return { planes, edges, verts:V, bb:{ n:[x0,y0,z0], x:[x1,y1,z1] }, ground: z0 === 0 };
}
function prismSolid(o){
  const P = o.prism, n = P.length, v0 = o.v0, v1 = o.v1;
  const nrm = [];                       // vnější normála hrany i → i+1 (průřez je proti směru hodinových ručiček)
  for (let i=0;i<n;i++){ const A=P[i], B=P[(i+1)%n]; const du=B[0]-A[0], dz=B[1]-A[1], L=Math.hypot(du,dz); nrm.push([dz/L, 0, -du/L]); }
  const planes = [[0,-1,0,-v0],[0,1,0,v1]];
  for (let i=0;i<n;i++) planes.push([nrm[i][0], 0, nrm[i][2], nrm[i][0]*P[i][0] + nrm[i][2]*P[i][1]]);
  const edges = [], verts = [];
  for (let i=0;i<n;i++){
    const A=P[i], B=P[(i+1)%n];
    edges.push({ a:[A[0],v0,A[1]], b:[B[0],v0,B[1]] });
    edges.push({ a:[A[0],v1,A[1]], b:[B[0],v1,B[1]] });
    const e = { a:[A[0],v0,A[1]], b:[A[0],v1,A[1]] };
    if (o.smooth[i]) { e.n1 = nrm[(i-1+n)%n]; e.n2 = nrm[i]; }   // hladká hrana: kreslí se jen jako obrys
    edges.push(e);
    verts.push([A[0],v0,A[1]],[A[0],v1,A[1]]);
  }
  const us = P.map(q=>q[0]), zs = P.map(q=>q[1]);
  return { planes, edges, verts, bb:{ n:[Math.min(...us),v0,Math.min(...zs)], x:[Math.max(...us),v1,Math.max(...zs)] }, ground: Math.min(...zs) === 0 };
}
function scaleSolid(sd, f, z0){
  const tp = q => [q[0]*f, q[1]*f, q[2]*f + z0];
  return {
    planes: sd.planes.map(([a,b,c,d]) => [a,b,c, (d*f) + c*z0]),
    edges: sd.edges.map(e => ({ ...e, a:tp(e.a), b:tp(e.b) })),
    verts: sd.verts.map(tp),
    bb: { n:tp(sd.bb.n), x:tp(sd.bb.x) }, ground: sd.ground
  };
}
function paper(st){
  const f = 1/(10*st.N);                         // cm na listu za 1 mm skutečnosti
  const T = TYPES[st.type];
  const z0 = st.Z*f;
  const solids = T.boxes(st.W, st.H, st.D)
    .filter(b => b.prism || (b[3]>b[0]+1e-9 && b[4]>b[1]+1e-9 && b[5]>b[2]+1e-9))
    .map(b => scaleSolid(b.prism ? prismSolid(b) : boxSolid(b), f, z0));
  return { Hx:st.Hx, Hy:st.Hy, vh:st.vh, d:st.d, alpha:st.alpha,
           X0:st.X*f, Y0:st.Y*f, z0, w:st.W*f, h:st.H*f, dp:st.D*f, solids, f };
}

/* ---------- geometrie ---------- */
function frame(p){ const r = p.alpha*Math.PI/180; return { c:Math.cos(r), s:Math.sin(r) }; }
function toWorld(p,fr,L){ return [p.X0 + L[0]*fr.c - L[1]*fr.s, p.Y0 + L[0]*fr.s + L[1]*fr.c, L[2]]; }
function toLocal(p,fr,P){ const dx = P[0]-p.X0, dy = P[1]-p.Y0; return [dx*fr.c + dy*fr.s, -dx*fr.s + dy*fr.c, P[2]]; }
// průmětna = svislá rovina y = 0 procházející základnicí; střed promítání S = [Hx, −d, vh]
function project(p,P){ const k = p.d/(p.d + P[1]); return [p.Hx + (P[0]-p.Hx)*k, p.Hy + (P[2]-p.vh)*k]; }
const EPS = 1e-6;
// zakrývá díl bod Q? paprsek z oka E do Q ořezaný poloprostory dílu (zmenšeného o EPS)
function hits(E,Q,sd){
  let t0 = -Infinity, t1 = Infinity;
  const dx = Q[0]-E[0], dy = Q[1]-E[1], dz = Q[2]-E[2];
  for (const [a,b,c,d] of sd.planes){
    const num = (d - EPS) - (a*E[0] + b*E[1] + c*E[2]);
    const den = a*dx + b*dy + c*dz;
    if (Math.abs(den) < 1e-12){ if (num <= 0) return false; continue; }
    const t = num/den;
    if (den > 0){ if (t < t1) t1 = t; } else { if (t > t0) t0 = t; }
    if (t1 - t0 <= 1e-9) return false;
  }
  return t0 < 1-1e-7 && t1 > 1e-9;
}
function computeObject(p){
  const fr = frame(p), sol = p.solids, E = toLocal(p,fr,[p.Hx,-p.d,p.vh]);
  const vis = [], hid = [], pts = [];
  const visible = Q => { for (const sd of sol) if (hits(E,Q,sd)) return false; return true; };
  for (const sd of sol){
    for (const e of sd.edges){
      const A = e.a, B = e.b;
      if (e.n1){
        // hladká hrana válcové plochy se kreslí, jen když je obrysová (jedna stěna k oku, druhá od oka)
        const w = [E[0]-A[0], E[1]-A[1], E[2]-A[2]];
        const s1 = e.n1[0]*w[0] + e.n1[2]*w[2], s2 = e.n2[0]*w[0] + e.n2[2]*w[2];
        if ((s1 > 0) === (s2 > 0)) continue;
      }
      const len = Math.hypot(B[0]-A[0], B[1]-A[1], B[2]-A[2]);
      const N = Math.max(8, Math.min(96, Math.ceil(len*40)));
      const at = t => [A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t];
      const push = (ta,tb,v) => {
        if (tb-ta < 1e-9) return;
        const P0 = project(p,toWorld(p,fr,at(ta))), P1 = project(p,toWorld(p,fr,at(tb)));
        (v?vis:hid).push([P0[0],P0[1],P1[0],P1[1]]);
      };
      let prevT = 0, prevV = visible(A), start = 0;
      for (let i=1;i<=N;i++){
        const t = i/N, v = visible(at(t));
        if (v !== prevV){
          let lo = prevT, hi = t;
          for (let k=0;k<32;k++){ const m=(lo+hi)/2; if (visible(at(m)) === prevV) lo = m; else hi = m; }
          const tc = (lo+hi)/2;
          push(start, tc, prevV); start = tc; prevV = v;
        }
        prevT = t;
      }
      push(start, 1, prevV);
    }
    for (const q of sd.verts) pts.push(project(p,toWorld(p,fr,q)));
  }
  const A3 = toWorld(p,fr,[0,0,p.z0]);
  const top = Math.max(...sol.map(sd=>sd.bb.x[2]));
  return { vis, hid, pts, fr, A3, A2:project(p,A3), At:project(p,toWorld(p,fr,[0,0,top])) };
}
function vanish(p){
  const t = p.alpha*Math.PI/180;
  return {
    U:  Math.abs(Math.cos(t)) < 1e-9 ? Infinity : p.Hx - p.d*Math.tan(t),  // hrany ve směru hloubky (doleva dozadu)
    U2: Math.abs(Math.sin(t)) < 1e-9 ? Infinity : p.Hx + p.d/Math.tan(t)   // hrany ve směru šířky (doprava dozadu)
  };
}

let hoverObj = false;
function convexHull(P){
  const a = P.slice().sort((p,q)=>p[0]-q[0]||p[1]-q[1]);
  const cr = (o,p,q)=>(p[0]-o[0])*(q[1]-o[1])-(p[1]-o[1])*(q[0]-o[0]);
  const lo=[], up=[];
  for (const p of a){ while(lo.length>=2 && cr(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p); }
  for (let i=a.length-1;i>=0;i--){ const p=a[i]; while(up.length>=2 && cr(up[up.length-2],up[up.length-1],p)<=0) up.pop(); up.push(p); }
  return lo.slice(0,-1).concat(up.slice(0,-1));
}

/* ---------- výkres jako seznam prvků (mm, osa y dolů, A4 na šířku) ---------- */
const mx = x => x*10, my = y => (SH - y)*10;
const W_VIS = 0.35, W_HID = 0.18, W_THIN = 0.13, W_MED = 0.25;
function buildSheet(){
  const L = [];      // obsah výkresu (ořezaný na plochu nad razítkem)
  const O = [];      // rám, razítko, texty mimo ořez
  const line = (x1,y1,x2,y2,w,c,dash) => L.push({ t:'line', x1:mx(x1), y1:my(y1), x2:mx(x2), y2:my(y2), w, c, dash });
  const p = paper(S);
  const st = computeObject(p);
  const vp = vanish(p);
  const zY = p.Hy - p.vh;

  // mřížka po 1 cm
  // mřížka 2 mm, každá pátá čára (1 cm) o tón tmavší; čáry leží na celých mm od rohu listu
  for (let x=GRID*Math.ceil(FX0/GRID); x<=FX1; x+=GRID) L.push({ t:'line', x1:x, y1:FY0, x2:x, y2:BY, w:0.08, c: x%10===0 ? '#d6d6d6' : '#e6e6e6', grid:true });
  for (let y=GRID*Math.ceil(FY0/GRID); y<=BY; y+=GRID) L.push({ t:'line', x1:FX0, y1:y, x2:FX1, y2:y, w:0.08, c: y%10===0 ? '#d6d6d6' : '#e6e6e6', grid:true });
  if (hoverObj){
    const hull = convexHull(st.pts.map(q=>[mx(q[0]),my(q[1])]));
    L.push({ t:'polyf', pts:hull, fill:'#e6e6e6', screen:true });
  }

  if (show.constr){
    L.push({ t:'circle', cx:mx(p.Hx), cy:my(p.Hy), r:p.d/2*10, w:W_THIN, c:BLACK });
    line(-1, p.Hy, SW+1, p.Hy, W_MED, BLACK);
    line(-1, zY, SW+1, zY, W_MED, BLACK);
    line(p.Hx, p.Hy, p.Hx, p.Hy - p.d/2, W_THIN, BLACK);
    line(p.Hx-0.2, p.Hy-p.d/2, p.Hx+0.2, p.Hy-p.d/2, W_MED, BLACK);
    line(p.Hx-0.2, p.Hy, p.Hx+0.2, p.Hy, W_MED, BLACK);
    L.push({ t:'text', x:mx(p.Hx+0.3), y:my(p.Hy+0.3), s:'H', size:3.5, c:BLACK });
    L.push({ t:'text', x:FX1-4.5, y:my(p.Hy+0.3), s:'h', size:3.5, c:BLACK, anchor:'end' });
    L.push({ t:'text', x:FX1-4.5, y:my(zY+0.3), s:'z', size:3.5, c:BLACK, anchor:'end' });
    L.push({ t:'text', x:mx(p.Hx+0.3), y:my(p.Hy-p.d/2-0.13), s:'D/2', size:3.5, c:BLACK });
  }

  if (show.vlines){
    const D2 = [p.Hx, p.Hy - p.d/2];
    if (isFinite(vp.U)){
      line(D2[0], D2[1], p.Hx + (vp.U-p.Hx)/2, p.Hy, W_THIN, BLACK);
      L.push({ t:'circle', cx:mx(vp.U), cy:my(p.Hy), r:0.6, w:W_THIN, c:BLACK });
      L.push({ t:'text', x:mx(vp.U), y:my(p.Hy-0.65), s:'U', size:3.5, c:BLACK, anchor:'middle' });
    }
    if (isFinite(vp.U2)){
      line(D2[0], D2[1], p.Hx + (vp.U2-p.Hx)/2, p.Hy, W_THIN, BLACK, [1.6,0.9]);
      L.push({ t:'circle', cx:mx(vp.U2), cy:my(p.Hy), r:0.6, w:W_THIN, c:BLACK });
      L.push({ t:'text', x:mx(vp.U2), y:my(p.Hy-0.65), s:'U′', size:3.5, c:BLACK, anchor:'middle' });
    }
    for (const Q of [st.A2, st.At]){
      for (const ux of [vp.U, vp.U2]){
        if (isFinite(ux)) line(Q[0], Q[1], ux, p.Hy, W_THIN, BLACK, [0.4,0.9]);
        else line(Q[0]-60, Q[1], Q[0]+60, Q[1], W_THIN, BLACK, [0.4,0.9]);
      }
    }
  }

  if (show.plan){
    const fr = st.fr;
    const fp = (u,v) => [p.X0 + u*fr.c - v*fr.s, zY + p.Y0 + u*fr.s + v*fr.c];
    const poly = (pts,w,dash) => L.push({ t:'poly', pts:pts.map(q=>[mx(q[0]),my(q[1])]), w, c:BLACK, dash });
    poly([fp(0,0),fp(p.w,0),fp(p.w,p.dp),fp(0,p.dp)], 0.18, [3,0.8,0.4,0.8]);
    for (const sd of p.solids) if (sd.ground){ const b = sd.bb; poly([fp(b.n[0],b.n[1]),fp(b.x[0],b.n[1]),fp(b.x[0],b.x[1]),fp(b.n[0],b.x[1])], 0.18); }
    const F = fp(0,0), R = Math.min(2.9, Math.max(p.w,p.dp)*0.7), al = p.alpha*Math.PI/180;
    line(F[0], F[1], F[0]+R+1.2, F[1], W_THIN, BLACK);
    if (p.alpha > 0.2){
      const arc = []; const n = 40;
      for (let i=0;i<=n;i++){ const a = al*i/n; arc.push([mx(F[0]+R*Math.cos(a)), my(F[1]+R*Math.sin(a))]); }
      L.push({ t:'pline', pts:arc, w:W_THIN, c:BLACK });
      const lr = R*0.7, la = al/2;
      L.push({ t:'text', x:mx(F[0]+lr*Math.cos(la)+0.15), y:my(F[1]+lr*Math.sin(la)-0.12), s:fmt(S.alpha,1)+'°', size:3.2, c:BLACK, anchor:'middle' });
    }
  }

  if (show.pins){
    for (const pin of pins){
      const ps = computeObject(paper({ ...S, ...pin }));
      for (const s of ps.vis) line(s[0],s[1],s[2],s[3], 0.25, '#9a9a9a');
    }
  }

  if (show.situ) situation(L, p, st);

  if (show.hidden) for (const s of st.hid) line(s[0],s[1],s[2],s[3], W_HID, BLACK, [1.2,0.8]);
  for (const s of st.vis) line(s[0],s[1],s[2],s[3], W_VIS, BLACK);

  // záhlaví jako v zadání
  O.push({ t:'text', x:18.5, y:my(19.35), s:`H[${fmt(p.Hx)};${fmt(p.Hy)}], vh=${fmt(p.vh)}, d=${fmt(p.d)}`, size:4.4, c:BLACK });
  O.push({ t:'text', x:18.5, y:my(18.75), s:`α=${fmt(S.alpha,1)}°`, size:3, c:'#555555' });
  // měřítko a razítko
  O.push({ t:'text', x:FX1-4.5, y:BY-3.6, s:`1:${fmt(S.N,0)}`, size:3.2, c:BLACK, anchor:'end' });
  O.push({ t:'line', x1:FX0, y1:BY, x2:FX1, y2:BY, w:0.45, c:INK });
  O.push({ t:'rect', x:FX0+0.225, y:FY0+0.225, w:FX1-FX0-0.45, h:FY1-FY0-0.45, lw:0.45, c:INK });
  const ty = BY + 6.0;
  const no = String($('f_no').value || '').toUpperCase();
  O.push({ t:'text', x:FX0+4.5, y:ty, s:no, size:3.2, c:BLACK });
  O.push({ t:'text', x:FX0+22, y:ty, s:'LP – ' + TYPES[S.type].name, size:3.2, c:BLACK });
  O.push({ t:'text', x:100, y:ty, s:String($('f_name').value || '').toUpperCase(), size:3.2, c:BLACK });
  O.push({ t:'text', x:206, y:ty, s:'DESKRIPTIVNÍ GEOMETRIE', size:3.2, c:BLACK });
  O.push({ t:'text', x:FX1-4.5, y:ty, s:String(new Date().getFullYear()), size:3.2, c:BLACK, anchor:'end' });

  return { L, O, p, st, vp };
}

// půdorys situace: malý pohled shora vlevo dole
function situation(L, p, st){
  const bx = { x:10, y:144, w:90, h:48 };   // mm na listu
  const foot = [[0,0],[p.w,0],[p.w,p.dp],[0,p.dp]].map(([u,v]) => toWorld(p, st.fr, [u,v,0]));
  const xs = [0, SW, p.Hx, ...foot.map(q=>q[0])], ys = [-p.d, 0, ...foot.map(q=>q[1])];
  const x0 = Math.min(...xs)-1, x1 = Math.max(...xs)+1, y0 = Math.min(...ys)-1, y1 = Math.max(...ys, 3)+1;
  const sc = Math.min((bx.w-4)/(x1-x0), (bx.h-8)/(y1-y0));
  const ox = bx.x + 2 + ((bx.w-4) - (x1-x0)*sc)/2, oy = bx.y + 6;
  const P = q => [ox + (q[0]-x0)*sc, oy + (y1-q[1])*sc];
  const seg = (a,b,w,dash,c=BLACK) => { const A=P(a), B=P(b); L.push({ t:'line', x1:A[0], y1:A[1], x2:B[0], y2:B[1], w, c, dash }); };
  L.push({ t:'rectf', x:bx.x, y:bx.y, w:bx.w, h:bx.h, fill:'#fbfbfb', lw:0.18, c:BLACK });
  L.push({ t:'text', x:bx.x+2, y:bx.y+4.2, s:'PŮDORYS SITUACE', size:2.6, c:BLACK });
  const Sp = [p.Hx, -p.d];
  const k = (y1 - Sp[1]) / p.d;
  seg(Sp, [p.Hx - p.d/2*k, y1], W_THIN, [0.6,0.6]);
  seg(Sp, [p.Hx + p.d/2*k, y1], W_THIN, [0.6,0.6]);
  seg([x0,0],[x1,0], W_THIN);
  seg([0,0],[SW,0], 0.35);
  seg(Sp,[p.Hx,0], W_THIN, [1,0.6]);
  for (const q of foot) seg(Sp, q, 0.1);
  L.push({ t:'poly', pts:foot.map(P), w:0.3, c:BLACK });
  const sP = P(Sp), hP = P([p.Hx,0]);
  L.push({ t:'circle', cx:sP[0], cy:sP[1], r:0.5, w:0.3, c:BLACK });
  L.push({ t:'text', x:sP[0]+1.2, y:sP[1]+0.6, s:'S', size:2.6, c:BLACK });
  L.push({ t:'text', x:hP[0]+0.8, y:hP[1]-0.8, s:'H', size:2.6, c:BLACK });
  L.push({ t:'text', x:P([0,0])[0], y:P([0,0])[1]-0.8, s:'π', size:2.6, c:BLACK });
}

/* ---------- SVG ---------- */
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const n4 = v => Math.round(v*1000)/1000;
function svgItem(it){
  const dash = it.dash ? ` stroke-dasharray="${it.dash.join(' ')}"` : '';
  switch (it.t){
    case 'line': return `<line x1="${n4(it.x1)}" y1="${n4(it.y1)}" x2="${n4(it.x2)}" y2="${n4(it.y2)}" stroke="${it.c}" stroke-width="${it.w}" stroke-linecap="round"${dash}/>`;
    case 'circle': return `<circle cx="${n4(it.cx)}" cy="${n4(it.cy)}" r="${n4(it.r)}" fill="none" stroke="${it.c}" stroke-width="${it.w}"${dash}/>`;
    case 'poly': return `<polygon points="${it.pts.map(q=>n4(q[0])+','+n4(q[1])).join(' ')}" fill="none" stroke="${it.c}" stroke-width="${it.w}" stroke-linejoin="round"${dash}/>`;
    case 'pline': return `<polyline points="${it.pts.map(q=>n4(q[0])+','+n4(q[1])).join(' ')}" fill="none" stroke="${it.c}" stroke-width="${it.w}"${dash}/>`;
    case 'rect': return `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="none" stroke="${it.c}" stroke-width="${it.lw}"/>`;
    case 'rectf': return `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${it.fill}" stroke="${it.c}" stroke-width="${it.lw}"/>`;
    case 'polyf': return `<polygon points="${it.pts.map(q=>n4(q[0])+','+n4(q[1])).join(' ')}" fill="${it.fill}" stroke="none"/>`;
    case 'text': return `<text x="${n4(it.x)}" y="${n4(it.y)}" font-family="${FONT}" font-size="${it.size}" fill="${it.c}" text-anchor="${it.anchor||'start'}">${esc(it.s)}</text>`;
  }
  return '';
}
function sheetSVG(d){
  return `<rect x="0" y="0" width="297" height="210" fill="#fbfbfb"/>`+
    `<defs><clipPath id="cp"><rect x="${FX0}" y="${FY0}" width="${FX1-FX0}" height="${BY-FY0}"/></clipPath></defs>`+
    `<g clip-path="url(#cp)">${d.L.map(svgItem).join('')}</g>${d.O.map(svgItem).join('')}`;
}

/* ---------- PDF (A4 na šířku, 1:1 v mm) ---------- */
const SM_B64 = window.LP_FONTS.spaceMono;   // Space Mono (výřez latinka + čeština), pro vložení do PDF
const AL_B64 = window.LP_FONTS.alpha;       // znak α z DejaVu Sans Mono (Space Mono ho nemá)
const PT = 72/25.4;
function pdfText(doc, it){
  doc.setTextColor(it.c);
  doc.setFontSize(it.size*PT);
  const runs = []; let cur = '', curA = false;
  for (const ch of it.s){ const a = ch === 'α'; if (a !== curA && cur){ runs.push([cur,curA]); cur=''; } curA = a; cur += ch; }
  if (cur) runs.push([cur,curA]);
  const width = runs.reduce((s,[t,a]) => { doc.setFont(a?'ALPHA':'SM','normal'); return s + doc.getTextWidth(t); }, 0);
  let x = it.x - (it.anchor==='end' ? width : it.anchor==='middle' ? width/2 : 0);
  for (const [t,a] of runs){ doc.setFont(a?'ALPHA':'SM','normal'); doc.text(t, x, it.y); x += doc.getTextWidth(t); }
}
function pdfItem(doc, it){
  if (it.t === 'text') return pdfText(doc, it);
  doc.setDrawColor(it.c);
  doc.setLineWidth(it.t === 'rect' || it.t === 'rectf' ? it.lw : it.w);
  doc.setLineDashPattern(it.dash || [], 0);
  switch (it.t){
    case 'line': doc.line(it.x1, it.y1, it.x2, it.y2); break;
    case 'circle': doc.circle(it.cx, it.cy, it.r, 'S'); break;
    case 'poly': case 'pline': {
      const pts = it.t === 'poly' ? [...it.pts, it.pts[0]] : it.pts;
      const segs = []; for (let i=1;i<pts.length;i++) segs.push([pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]]);
      doc.lines(segs, pts[0][0], pts[0][1], [1,1], 'S', false); break;
    }
    case 'rect': doc.rect(it.x, it.y, it.w, it.h, 'S'); break;
    case 'rectf': doc.setFillColor('#ffffff'); doc.rect(it.x, it.y, it.w, it.h, 'FD'); break;
  }
}
function buildPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4', compress:true });
  doc.addFileToVFS('SM.ttf', SM_B64); doc.addFont('SM.ttf', 'SM', 'normal');
  doc.addFileToVFS('ALPHA.ttf', AL_B64); doc.addFont('ALPHA.ttf', 'ALPHA', 'normal');
  doc.setLineCap('round'); doc.setLineJoin('round');
  doc.setFillColor('#ffffff'); doc.rect(0,0,297,210,'F');
  const d = buildSheet();
  doc.saveGraphicsState();
  doc.moveTo(FX0,FY0); doc.lineTo(FX1,FY0); doc.lineTo(FX1,BY); doc.lineTo(FX0,BY); doc.close(); doc.clip(); doc.discardPath();
  for (const it of d.L) if (!it.screen) pdfItem(doc, it);
  doc.restoreGraphicsState();
  doc.setLineDashPattern([], 0);
  for (const it of d.O) pdfItem(doc, it);
  doc.setProperties({ title:`LP – ${TYPES[S.type].name}`, author:String($('f_name').value||''), subject:'Deskriptivní geometrie – lineární perspektiva' });
  return doc;
}

/* ---------- vykreslení ---------- */
const sheet = $('sheet'), slider = $('slider');
let last = null;
function render(){
  const d = buildSheet();
  last = d;
  sheet.innerHTML = sheetSVG(d);
  renderSlider(d.p);
  renderVars(d);
  syncFields();
}
function renderSlider(p){
  const x = Math.min(FX1, Math.max(FX0, p.X0*10));
  let g = `<rect x="${FX0-2}" y="-2" width="${FX1-FX0+4}" height="12" fill="transparent"/>`;
  g += `<line x1="${FX0}" y1="4" x2="${FX1}" y2="4" stroke="${BLUE}" stroke-width="0.7"/>`;
  g += `<circle class="thumb" cx="${n4(x)}" cy="4" r="1.85" fill="#fbfbfb" stroke="${BLUE}" stroke-width="0.6"/>`;
  slider.innerHTML = g;
  slider.setAttribute('aria-valuemin', '0');
  slider.setAttribute('aria-valuemax', String(Math.round(SW*10*10*S.N)));
  slider.setAttribute('aria-valuenow', String(Math.round(S.X)));
  slider.setAttribute('aria-valuetext', `X = ${fmt(S.X,0)} mm`);
}
function renderVars(d){
  const { p, st, vp } = d;
  const A = [S.X, S.Y, S.Z];
  $('v_A').innerHTML = `[${A.map(v=>fmt(v,0)).join(';')}] <span class="unit">mm</span>`;
  $('v_A2').innerHTML = `[${fmtF(st.A2[0])};${fmtF(st.A2[1])}] <span class="unit">cm</span>`;
  const vpTxt = x => isFinite(x) ? `[${fmtF(x)};${fmt(p.Hy)}]${(x<0||x>SW)?' <span class="unit">MIMO LIST</span>':''}` : '∞';
  $('v_U').innerHTML = vpTxt(vp.U);
  $('v_U2').innerHTML = vpTxt(vp.U2);
  const ang = Math.max(...st.pts.map(q => Math.atan(Math.hypot(q[0]-p.Hx, q[1]-p.Hy)/p.d)*180/Math.PI));
  const inside = st.pts.every(q => Math.hypot(q[0]-p.Hx, q[1]-p.Hy) <= p.d/2 + 1e-9);
  $('v_K').innerHTML = `${inside ? 'UVNITŘ' : 'MIMO'} <span class="unit">${fmt(ang,1)}°</span>`;
  $('c_D2').textContent = `[${fmt(p.Hx)};${fmt(p.Hy - p.d/2)}]`;
  $('c_R').textContent = fmt(p.d/2);
  $('title').textContent = 'LP – ' + TYPES[S.type].name;
  document.querySelectorAll('.types button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === S.type)));
}

/* ---------- pole ---------- */
const fields = [...document.querySelectorAll('input[data-key]')];
function syncFields(){
  for (const el of fields){
    if (document.activeElement === el) continue;
    const k = el.dataset.key;
    const dp = ['W','H','D','X','Y','Z','alpha','N'].includes(k) ? 0 : 2;
    el.value = fmt(S[k], dp);
  }
}
const parseNum = s => parseFloat(String(s).replace(/\s/g,'').replace(',', '.').replace('−','-'));
// poloha se vždy drží na celých centimetrech listu, úhel a rozměry na celých číslech
const cmStep = () => 10*S.N;                       // mm skutečnosti na 1 cm listu
const snapPos = v => Math.round(v / cmStep()) * cmStep();
function setKey(k, v){
  if (!isFinite(v)) return;
  if (k === 'N' || k === 'alpha' || k === 'W' || k === 'H' || k === 'D') v = Math.round(v);
  if (k === 'X' || k === 'Y' || k === 'Z') v = snapPos(v);
  if (k === 'W' || k === 'H' || k === 'D') v = Math.max(TYPES[S.type].min[k], v);
  S[k] = clampK(k, v);
  render();
}
for (const el of fields){
  el.addEventListener('input', () => { stopPlay(); setKey(el.dataset.key, parseNum(el.value)); });
  el.addEventListener('blur', syncFields);
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter'){ el.blur(); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault(); stopPlay();
    const k = el.dataset.key, step = (['X','Y','Z'].includes(k) ? cmStep() : parseFloat(el.dataset.step)) * (e.shiftKey ? 10 : 1);
    setKey(k, S[k] + (e.key === 'ArrowUp' ? step : -step));
    el.value = fmt(S[k], 2);
  });
}
for (const k of Object.keys(show)) $('s_'+k).addEventListener('change', e => { show[k] = e.target.checked; render(); });
$('f_name').addEventListener('input', render);

document.querySelectorAll('.types button').forEach(b => b.addEventListener('click', () => {
  stopPlay();
  if (S.type === b.dataset.type) return;
  S.type = b.dataset.type;
  Object.assign(S, TYPES[S.type].def);
  pins = [];
  render();
}));

/* ---------- zadání z podkladu podle čísla listu ---------- */
const PRESETS = {
  1: { s:{ ...BASE, X:2200 }, pins:[] },
  2: { s:{ ...BASE, X:1500 }, pins:[] },
  3: { s:{ ...BASE, X:900 },  pins:[{X:2200,Y:0,Z:0,alpha:30},{X:1500,Y:0,Z:0,alpha:30}] },
  4: { s:{ ...BASE, Hx:23, alpha:35, X:1800 }, pins:[] }
};
$('f_no').addEventListener('input', e => {
  const n = parseInt(e.target.value, 10);
  if (PRESETS[n]){ stopPlay(); Object.assign(S, PRESETS[n].s); pins = PRESETS[n].pins.map(x=>({...x})); if (pins.length){ show.pins = true; $('s_pins').checked = true; } }
  render();
});
$('f_no').addEventListener('blur', e => { const n = parseInt(e.target.value,10); if (isFinite(n)) e.target.value = String(n).padStart(2,'0'); render(); });

$('pin').addEventListener('click', () => { pins.push({ X:S.X, Y:S.Y, Z:S.Z, alpha:S.alpha }); if (pins.length > 12) pins.shift(); show.pins = true; $('s_pins').checked = true; render(); });
$('unpin').addEventListener('click', () => { pins = []; render(); });

/* ---------- posuvník a tažení ---------- */
function svgPt(svg, e){ const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
const mmPerSheetCm = () => 10*S.N;
let sDrag = false;
const fromSlider = e => { const x = Math.min(FX1, Math.max(FX0, svgPt(slider,e).x)); const nx = Math.round(x/10)*mmPerSheetCm(); if (nx !== S.X){ S.X = nx; render(); } };
slider.addEventListener('pointerdown', e => { stopPlay(); sDrag = true; slider.setPointerCapture(e.pointerId); slider.focus({preventScroll:true}); fromSlider(e); });
slider.addEventListener('pointermove', e => { if (sDrag) fromSlider(e); });
slider.addEventListener('pointerup', () => sDrag = false);
slider.addEventListener('pointercancel', () => sDrag = false);
slider.addEventListener('keydown', e => {
  const step = (e.shiftKey ? 5 : 1) * mmPerSheetCm();     // 1 cm, se Shiftem 5 cm na listu
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') S.X = clampK('X', S.X - step);
  else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') S.X = clampK('X', S.X + step);
  else if (e.key === 'Home') S.X = Math.ceil(FX0/10)*mmPerSheetCm();
  else if (e.key === 'End') S.X = Math.floor(FX1/10)*mmPerSheetCm();
  else return;
  e.preventDefault(); stopPlay(); S.X = snapPos(S.X); render();
});

let drag = null;
function inObj(pt){
  if (!last) return false;
  const xs = last.st.pts.map(q=>q[0]*10), ys = last.st.pts.map(q=>(SH-q[1])*10);
  return pt.x > Math.min(...xs)-6 && pt.x < Math.max(...xs)+6 && pt.y > Math.min(...ys)-6 && pt.y < Math.max(...ys)+6;
}
sheet.addEventListener('pointerdown', e => {
  const pt = svgPt(sheet, e);
  if (!inObj(pt)) return;
  stopPlay(); drag = { x:pt.x, X:S.X };
  sheet.setPointerCapture(e.pointerId); sheet.style.cursor = 'grabbing';
});
sheet.addEventListener('pointermove', e => {
  const pt = svgPt(sheet, e);
  if (!drag){ const h = inObj(pt); sheet.style.cursor = h ? 'grab' : 'default'; if (h !== hoverObj){ hoverObj = h; render(); } return; }
  // posun obrazu převedený do prostoru v hloubce rohu A: Δx · (d + y) / d
  const p = paper(S);
  const dxCm = (pt.x - drag.x)/10 * (p.d + p.Y0)/p.d;
  const nx = clampK('X', snapPos(drag.X + dxCm*mmPerSheetCm()));
  if (nx !== S.X){ S.X = nx; render(); }
});
const endDrag = () => { drag = null; sheet.style.cursor = 'default'; };
sheet.addEventListener('pointerup', endDrag);
sheet.addEventListener('pointercancel', endDrag);
sheet.addEventListener('pointerleave', () => { if (hoverObj && !drag){ hoverObj = false; render(); } });

/* ---------- animace ---------- */
const ICON_PLAY = `<svg viewBox="0 0 14 16"><path d="M0 0L14 8L0 16Z" fill="${BLUE}"/></svg>`;
const ICON_PAUSE = `<svg viewBox="0 0 14 16"><path d="M1 0H5V16H1ZM9 0H13V16H9Z" fill="${BLUE}"/></svg>`;
let playing = false, timer = 0, dir = -1;
$('play').innerHTML = ICON_PLAY;
function stopPlay(){ if (!playing) return; playing = false; clearInterval(timer); $('play').innerHTML = ICON_PLAY; $('play').setAttribute('aria-pressed','false'); $('play').setAttribute('aria-label','Přehrát pohyb po základnici'); }
// skok po 1 cm listu
function tick(){
  if (!playing) return;
  const k = mmPerSheetCm(), lo = 1*k, hi = 28*k;
  let nx = snapPos(S.X) + dir*k;
  if (nx < lo){ nx = lo; dir = 1; }
  if (nx > hi){ nx = hi; dir = -1; }
  S.X = nx; render();
}
$('play').addEventListener('click', () => {
  if (playing){ stopPlay(); return; }
  playing = true; $('play').innerHTML = ICON_PAUSE; $('play').setAttribute('aria-pressed','true'); $('play').setAttribute('aria-label','Zastavit pohyb');
  tick(); timer = setInterval(tick, 160);
});

/* ---------- export ---------- */
let DL = null;
try { if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then(ns => { DL = ns; }).catch(() => {}); } catch(e) {}
const msg = t => { $('exportMsg').textContent = t; };
$('export').addEventListener('click', async () => {
  stopPlay();
  if (!window.jspdf){ msg('Knihovna pro PDF se nenačetla. Obnov stránku a zkus to znovu.'); return; }
  const btn = $('export'); btn.disabled = true; msg('Připravuji PDF A4…');
  try {
    const doc = buildPDF();
    const no = String($('f_no').value||'01').padStart(2,'0');
    const filename = `LP_${TYPES[S.type].name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}_${no}.pdf`;
    if (DL){
      // uvnitř Claude: stažení přes schválenou schopnost „downloads“
      const buf = doc.output('arraybuffer');
      await DL.save({ filename, data: buf });
      msg('PDF uloženo: A4 na šířku, měřítko 1:1.');
    } else if (!window.claude){
      // samostatná stránka (git, GitHub Pages, lokálně): běžné stažení
      doc.save(filename);
      msg('PDF uloženo: A4 na šířku, měřítko 1:1.');
    } else {
      msg('Stahování v tomto zobrazení není dostupné. Otevři stránku na claude.ai a zkus export znovu.');
    }
  } catch(err){
    const code = err && err.code;
    msg(code === 'declined' ? 'Uložení zrušeno.' : code === 'rate_limited' ? 'Počkej chvilku a zkus to znovu.' : 'Export se nepovedl. Zkus to znovu.');
  } finally { btn.disabled = false; }
});

/* ---------- škálování celé plochy do okna bez rolování ---------- */
const stage = $('stage');
function fit(){
  const s = Math.min(window.innerWidth/1470, window.innerHeight/850);
  stage.style.transform = `translate(${(window.innerWidth-1470*s)/2}px, ${(window.innerHeight-850*s)/2}px) scale(${s})`;
}
function bgGrid(){
  // počátek = roh listu A4 (rám je 5 mm uvnitř), takže čáry plynule navazují na mřížku výkresu
  const ox = 15 - FX0*PXMM, oy = 8 - FY0*PXMM, g = GRID*PXMM, G = 10*PXMM, w = 0.08*PXMM;
  $('bggrid').innerHTML =
    `<defs><pattern id="gmin" patternUnits="userSpaceOnUse" x="${ox}" y="${oy}" width="${g}" height="${g}"><path d="M0 0H${g}M0 0V${g}" stroke="#e6e6e6" stroke-width="${w*2}" fill="none"/></pattern>`+
    `<pattern id="gmaj" patternUnits="userSpaceOnUse" x="${ox}" y="${oy}" width="${G}" height="${G}"><path d="M0 0H${G}M0 0V${G}" stroke="#d6d6d6" stroke-width="${w*2}" fill="none"/></pattern></defs>`+
    `<rect width="1470" height="850" fill="url(#gmin)"/><rect width="1470" height="850" fill="url(#gmaj)"/>`;
}
bgGrid();
window.addEventListener('resize', fit);
fit();
render();
})();
