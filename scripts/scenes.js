/* Sidebar Manhwa — volet Scènes · v1.4.2
 * Échelles de dossiers (Monde, Région, Zone, Quartier, Intérieur) avec une forme propre à chacune,
 * cadres par monde, image 0–100 %, deux façons de parcourir (Arbre habillé / Atlas) + fil d'Ariane,
 * recherche, filtres, tri, favoris, récentes, passages entre scènes, mémo MJ en appui long.
 * Aucune scène n'est modifiée : tout vit dans le réglage monde « scStore ».
 * Icônes en <span> : Foundry v13 force l'icône dossier sur tout <i> enfant d'un en-tête de dossier replié.
 */
import { lzAttr, lzSet } from './lazy.js';
import { withLock } from './lock.js';
const ID = 'sidebar-manhwa';

const SCALES = {
  monde: { label: 'Monde', icon: 'fa-earth-europe' },
  region: { label: 'Région', icon: 'fa-mountain-city' },
  zone: { label: 'Zone', icon: 'fa-map-location-dot' },
  quartier: { label: 'Quartier', icon: 'fa-signs-post' },
  interieur: { label: 'Intérieur', icon: 'fa-door-open' }
};
const FRAMES = { aucun: 'Aucun', or: 'Filigrane doré', rouage: 'Rouages', neon: 'Néon', vague: 'Vagues', pointilles: 'Pointillés' };
const WORLD_FRAME = [[/eos/, 'or'], [/clockwork/, 'rouage'], [/inertia|nova|hyperion|triangulum/, 'neon'], [/andromeda/, 'vague'], [/cordelia|eryndor|otherworld/, 'pointilles']];
const RX_INT = /maison|dortoir|interieur|salle|chambre|biblioth|salon|hotel|cafet|batiment|palais|chateau|\bqg\b|centre commercial|gare|carcasse|appartement|bureau|taverne|auberge|boutique|magasin|laboratoire|cave|manoir|temple|eglise|cathedrale|prison|arene|jardin/;
const RX_QUART = /quartier|district|zone|secteur|^nord|^sud|^est |^est$|^ouest|^centre/;
const ICON_PICK = ['fa-earth-europe', 'fa-mountain-city', 'fa-map-location-dot', 'fa-signs-post', 'fa-door-open', 'fa-city', 'fa-building',
  'fa-house', 'fa-landmark', 'fa-chess-rook', 'fa-church', 'fa-school', 'fa-hospital', 'fa-store', 'fa-shop', 'fa-warehouse', 'fa-industry',
  'fa-tree', 'fa-mountain', 'fa-mountain-sun', 'fa-water', 'fa-umbrella-beach', 'fa-snowflake', 'fa-volcano', 'fa-dungeon', 'fa-skull',
  'fa-dragon', 'fa-ghost', 'fa-gem', 'fa-crown', 'fa-shield-halved', 'fa-swords', 'fa-anchor', 'fa-ship', 'fa-train', 'fa-plane',
  'fa-rocket', 'fa-satellite', 'fa-user-astronaut', 'fa-robot', 'fa-gear', 'fa-radiation', 'fa-torii-gate', 'fa-campground', 'fa-bed',
  'fa-utensils', 'fa-book', 'fa-flask', 'fa-star', 'fa-moon', 'fa-sun', 'fa-eye', 'fa-key', 'fa-lock', 'fa-bridge', 'fa-road'];

/* ---------- utilitaires ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const iconCls = ic => (/\bfa-(solid|regular|light|thin|duotone|brands|sharp)\b/.test(ic) ? ic : `fa-solid ${ic}`);
const colorOf = f => { const c = f?.color; return c ? (c.css ?? String(c)) : ''; };
const hexOf = c => { const s = String(c ?? ''); return /^#[0-9a-f]{6}$/i.test(s) ? s : (/^#[0-9a-f]{3}$/i.test(s) ? '#' + [...s.slice(1)].map(x => x + x).join('') : '#3b4266'); };
const elOf = t => (t instanceof HTMLElement ? t : t?.[0] ?? t);
const isSceneDir = app => (app?.documentName ?? app?.constructor?.documentName ?? app?.collection?.documentName) === 'Scene';
function mk(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
const sFolders = () => game.folders.filter(f => f.type === 'Scene');
const depthOf = f => { let d = 0, c = f?.folder; while (c) { d++; c = c.folder; } return d; };
const chain = doc => { const a = []; let c = doc?.folder; while (c) { a.unshift(c); c = c.folder; } return a; };
const pathOf = doc => chain(doc).map(f => f.name).join(' › ');
const worldOf = doc => chain(doc)[0] ?? null;
const childFolders = f => sFolders().filter(x => (x.folder?.id ?? null) === (f?.id ?? null)).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'fr'));
const scenesIn = f => game.scenes.filter(s => (s.folder?.id ?? null) === (f?.id ?? null));
function countDeep(f) { let n = scenesIn(f).length; for (const c of childFolders(f)) n += countDeep(c); return n; }
const G = k => game.settings.get(ID, k);
const thumbOf = s => s.thumb || s.background?.src || '';

/* ---------- données ---------- */
let _st = null;
function normSt(s) { s = foundry.utils.deepClone(s || {}); for (const k of ['folders', 'scenes', 'stats']) s[k] ??= {}; return s; }
const st = () => (_st ??= normSt(G('scStore')));
async function saveSt(mut) { return withLock(`set:${ID}.scStore`, async () => { const s = normSt(G('scStore')); await mut(s); _st = s; await game.settings.set(ID, 'scStore', s); }); }   /* lecture + écriture sous verrou */
const scRec = id => st().scenes[id] ?? {};
const LS = { mode: `${ID}.sc-mode`, node: `${ID}.sc-node`, viewed: `${ID}.sc-viewed`, pins: `${ID}.sc-pins` };
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/* ---------- échelles & habillage ---------- */
function guessScale(f) {
  const d = depthOf(f), n = norm(f.name);
  if (d === 0) return 'monde';
  if (RX_INT.test(n)) return 'interieur';
  if (d === 1) return 'region';
  if (RX_QUART.test(n)) return 'quartier';
  return d >= 3 ? 'interieur' : 'zone';
}
function guessFrame(f) { const n = norm(worldOf({ folder: f })?.name ?? f.name); for (const [re, fr] of WORLD_FRAME) if (re.test(n)) return fr; return 'aucun'; }
let _dc = new Map();
const DEF = { scale: '', img: '', op: 40, x: 50, y: 50, angle: 110, icon: '', c1: '', c2: '', accent: '', frame: '' };
function applyOwn(d, own) { for (const k of Object.keys(DEF)) if (own?.[k] !== undefined && own[k] !== '' && own[k] !== null) d[k] = own[k]; return d; }
function fDecor(f, withOwn = true) {
  const ck = `${f.id}${withOwn ? '' : '~'}`; if (_dc.has(ck)) return _dc.get(ck);
  const par = f.folder ? fDecor(f.folder) : null;
  const d = { ...DEF, scale: guessScale(f), c1: colorOf(f) || par?.c1 || '#3b4266', c2: '', angle: par?.angle ?? 110, frame: par?.frame || guessFrame(f), op: 40 };
  if (withOwn) applyOwn(d, st().folders[f.id]);
  if (!d.icon) d.icon = SCALES[d.scale]?.icon ?? 'fa-folder';
  if (!d.accent) d.accent = d.c1;
  _dc.set(ck, d); return d;
}
const hasImg = d => d.img && d.img !== 'none';
function setVars(el, d) {
  el.style.setProperty('--sbs-c1', d.c1);
  el.style.setProperty('--sbs-c2', d.c2 || `color-mix(in srgb, ${d.c1} 16%, #080a12)`);
  el.style.setProperty('--sbs-ang', `${d.angle}deg`);
  el.style.setProperty('--sbs-accent', d.accent);
  el.style.setProperty('--sbs-op', String((Number(d.op) || 0) / 100));
  el.style.setProperty('--sbs-pos', `${d.x}% ${d.y}%`);
  lzSet(el, '--sbs-img', hasImg(d) ? String(d.img) : '');
}
const layers = d => `${hasImg(d) ? '<span class="sbs-bg sbs-x"></span>' : ''}<span class="sbs-tint sbs-x"></span><span class="sbs-fr sbs-x fr-${d.frame}"></span><span class="sbs-wm sbs-x ${iconCls(d.icon)}"></span><span class="sbs-gl sbs-x"></span>`;

/* ---------- état ---------- */
const S = { text: '', worlds: new Set(), scales: new Set(), nav: false, fav: false, filters: false, focus: null, pinTab: 'fav' };
const mode = () => (lsGet(LS.mode, 'arbre') === 'atlas' ? 'atlas' : 'arbre');
const node = () => { const id = lsGet(LS.node, null); return id ? game.folders.get(id) ?? null : null; };
function dirApps() {
  const out = new Set(); if (ui.scenes?.rendered) out.add(ui.scenes);
  for (const a of foundry.applications.instances?.values?.() ?? []) if (isSceneDir(a) && a.rendered) out.add(a);
  return [...out];
}
function refresh() { _dc = new Map(); for (const a of dirApps()) enhance(a.element); }

/* ---------- onglet ---------- */
function enhance(root) {
  if (!root || !game.user.isGM) return;
  if (!G('scEnabled')) { root.classList.remove('sbs'); return; }
  _dc = new Map();
  root.classList.add('sbs');
  for (const d of ['grande', 'moyenne', 'liste']) root.classList.toggle(`sbs-d-${d}`, G('scDensity') === d);
  root.classList.toggle('sbs-atlas-on', G('scTools') && mode() === 'atlas');
  ensureBar(root);
  decorateTree(root);
  renderPanel(root);
  wireMemo(root);
}

function decorateTree(root) {
  const list = root.querySelector(':scope > .directory-list'); if (!list) return;
  list.querySelectorAll('.sbs-x').forEach(e => e.remove());
  for (const li of list.querySelectorAll('li.folder')) {
    const f = game.folders.get(li.dataset.folderId); const h = li.querySelector(':scope > header'); if (!f || !h) continue;
    const d = fDecor(f);
    for (const k of Object.keys(SCALES)) h.classList.remove(`sbs-${k}`);
    h.classList.add('sbs-card', `sbs-${d.scale}`); li.dataset.sbsScale = d.scale; setVars(h, d);
    h.insertAdjacentHTML('afterbegin', layers(d));
    const nm = h.querySelector('.folder-name');
    if (nm && d.scale === 'monde') nm.textContent = f.name.replace(/^plan[eè]te\s+/i, '');
    if (nm) { nm.before(mk(`<span class="sbs-ic sbs-x ${iconCls(d.icon)}"></span>`)); nm.after(mk(`<span class="sbs-n sbs-x">${countDeep(f)}</span>`)); }
  }
  for (const li of list.querySelectorAll('li.scene')) {
    const s = game.scenes.get(li.dataset.entryId); if (!s) continue;
    const r = scRec(s.id); const f = s.folder;
    li.classList.add('sbs-sc'); li.classList.toggle('sbs-in', !!f && fDecor(f).scale === 'interieur');
    li.append(mk('<span class="sbs-gl sbs-x"></span>'));
    li.style.setProperty('--sbs-accent', f ? fDecor(f).accent : '#8d99ae');
    const a = li.querySelector('.entry-name');
    if (a && (r.fav || r.memo)) a.append(mk(`<span class="sbs-marks sbs-x">${r.fav ? '<span class="fa-solid fa-star sbs-fav"></span>' : ''}${r.memo ? '<span class="fa-solid fa-note-sticky sbs-hasmemo"></span>' : ''}</span>`));
  }
  orderTree(list);
  stickTops(list);
}
/* Foundry empile les en-têtes collants tous les 36 px ; nos échelles n'ont pas la même hauteur. */
const STICK = { monde: 66, region: 54, zone: 41, quartier: 32, interieur: 30 };
function stickTops(list) {
  const walk = (ol, top) => {
    for (const li of ol.children) {
      if (!li.classList.contains('folder')) continue;
      const h = li.querySelector(':scope > header'); if (h) h.style.top = `${top}px`;
      const sub = li.querySelector(':scope > ol.subdirectory'); if (sub) walk(sub, top + (STICK[li.dataset.sbsScale] ?? 36));
    }
  };
  walk(list, 0);
}

const SORTS = { core: 'Ordre Foundry', alpha: 'A → Z', active: 'Récemment activées', viewed: 'Récemment consultées' };
function sortKey(s) {
  const m = G('scSort');
  if (m === 'active') return -(st().stats[s.id]?.active ?? 0);
  if (m === 'viewed') return -(lsGet(LS.viewed, {})[s.id] ?? 0);
  return 0;
}
function cmpScenes(a, b) {
  const fa = scRec(a.id).fav ? 1 : 0, fb = scRec(b.id).fav ? 1 : 0;
  if (fa !== fb) return fb - fa;
  const m = G('scSort');
  if (m === 'alpha') return a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' });
  if (m === 'active' || m === 'viewed') return sortKey(a) - sortKey(b);
  return (a.sort - b.sort) || a.name.localeCompare(b.name, 'fr', { numeric: true });
}
function orderTree(list) {
  for (const ol of [list, ...list.querySelectorAll('ol.subdirectory')]) {
    const items = [...ol.children]; let fi = 0; const sc = [];
    items.forEach((li, idx) => {
      if (li.classList.contains('folder')) li.style.order = String(fi++);
      else if (li.classList.contains('scene')) { const s = game.scenes.get(li.dataset.entryId); if (s) sc.push({ li, s, idx }); }
    });
    sc.sort((x, y) => cmpScenes(x.s, y.s) || x.idx - y.idx).forEach((e, i) => { e.li.style.order = String(1000 + i); });
  }
}

/* ---------- barre ---------- */
function ensureBar(root) {
  let bar = root.querySelector(':scope > .sbs-bar');
  if (!G('scTools')) { bar?.remove(); return; }   /* barre d'outils (recherche, filtres, favoris, passages) masquée par défaut : 1.6.0 */
  if (!bar) {
    bar = mk(`<div class="sbs-bar">
      <div class="sbs-r1"><label class="sbs-search"><span class="fa-solid fa-magnifying-glass"></span><input type="text" placeholder="Scène, lieu, chemin, mémo…" autocomplete="off" spellcheck="false"><a class="sbs-clear" data-tooltip="Tout effacer"><span class="fa-solid fa-xmark"></span></a></label>
        <a class="sbs-ib" data-t="config" data-tooltip="Réglages des scènes"><span class="fa-solid fa-gear"></span></a></div>
      <div class="sbs-r2"><div class="sbs-seg"><a data-t="arbre"><span class="fa-solid fa-folder-tree"></span>Arbre</a><a data-t="atlas"><span class="fa-solid fa-map"></span>Atlas</a></div>
        <a class="sbs-tb" data-t="filters"><span class="fa-solid fa-filter"></span>Filtres<b class="sbs-cnt"></b></a>
        <label class="sbs-sort" data-tooltip="Tri"><span class="fa-solid fa-arrow-down-short-wide"></span><select>${Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label></div>
      <div class="sbs-filters"></div>
      <nav class="sbs-crumbs"></nav>
      <div class="sbs-pins"></div>
      <div class="sbs-pass"></div></div>`);
    const input = bar.querySelector('input'); let deb;
    input.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(() => { S.text = input.value.trim(); renderPanel(root); }, 140); });
    input.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Escape') { input.value = ''; S.text = ''; renderPanel(root); } });
    bar.querySelector('.sbs-clear').addEventListener('click', ev => { ev.preventDefault(); input.value = ''; S.text = ''; S.worlds.clear(); S.scales.clear(); S.nav = false; S.fav = false; renderAll(); });
    bar.querySelector('select').addEventListener('change', ev => game.settings.set(ID, 'scSort', ev.target.value));
    bar.addEventListener('click', ev => {
      const t = ev.target.closest('[data-t]')?.dataset.t;
      const chip = ev.target.closest('[data-f]'); const cr = ev.target.closest('[data-crumb]');
      const pin = ev.target.closest('[data-pin]'); const ptab = ev.target.closest('[data-ptab]'); const pass = ev.target.closest('[data-pass]');
      if (chip) { ev.preventDefault(); const [k, v] = chip.dataset.f.split(':'); toggleFilter(k, v); return renderAll(); }
      if (cr) { ev.preventDefault(); return goCrumb(root, cr.dataset.crumb || null); }
      if (ptab) { ev.preventDefault(); S.pinTab = ptab.dataset.ptab; return renderPins(root); }
      if (pin) { ev.preventDefault(); if (!holdUsed()) game.scenes.get(pin.dataset.pin)?.view(); return; }
      if (pass) { ev.preventDefault(); const s = game.scenes.get(pass.dataset.pass); if (!s) return; return pass.dataset.go ? s.activate() : s.view(); }
      if (!t) return; ev.preventDefault();
      if (t === 'arbre' || t === 'atlas') { lsSet(LS.mode, t); return renderAll(); }
      if (t === 'filters') { S.filters = !S.filters; return renderAll(); }
      if (t === 'config') return openConfig();
      if (t === 'locate') return locateActive(root);
    });
    const head = root.querySelector(':scope > .directory-header');
    head ? head.after(bar) : root.prepend(bar);
  }
  const input = bar.querySelector('input'); if (document.activeElement !== input) input.value = S.text;
  bar.querySelector('select').value = G('scSort');
  bar.querySelector('[data-t="arbre"]').classList.toggle('on', mode() === 'arbre');
  bar.querySelector('[data-t="atlas"]').classList.toggle('on', mode() === 'atlas');
  const nf = S.worlds.size + S.scales.size + (S.nav ? 1 : 0) + (S.fav ? 1 : 0);
  bar.querySelector('[data-t="filters"]').classList.toggle('on', S.filters || nf > 0);
  bar.querySelector('.sbs-cnt').textContent = nf ? String(nf) : '';
  renderFilters(root); renderCrumbs(root); renderPins(root); renderPass(root);
}
function renderAll() { for (const a of dirApps()) { ensureBar(a.element); a.element.classList.toggle('sbs-atlas-on', G('scTools') && mode() === 'atlas'); renderPanel(a.element); } }
function toggleFilter(k, v) {
  if (k === 'w') S.worlds.has(v) ? S.worlds.delete(v) : S.worlds.add(v);
  if (k === 's') S.scales.has(v) ? S.scales.delete(v) : S.scales.add(v);
  if (k === 'nav') S.nav = !S.nav;
  if (k === 'fav') S.fav = !S.fav;
}
function renderFilters(root) {
  const box = root.querySelector('.sbs-filters'); if (!box) return;
  if (!S.filters) { box.innerHTML = ''; return; }
  const chip = (f, label, c, on) => `<a class="sbs-chip ${on ? 'on' : ''}" data-f="${f}" style="--c:${esc(c)}">${esc(label)}</a>`;
  box.innerHTML = `<div class="sbs-fg"><h5>Monde</h5><div class="sbs-chips">${sFolders().filter(f => !f.folder).sort((a, b) => a.name.localeCompare(b.name, 'fr')).map(f => chip(`w:${f.id}`, f.name.replace(/^plan[eè]te\s+/i, ''), colorOf(f) || '#8d99ae', S.worlds.has(f.id))).join('')}</div></div>
    <div class="sbs-fg"><h5>Échelle du dossier</h5><div class="sbs-chips">${Object.entries(SCALES).filter(([k]) => k !== 'monde').map(([k, v]) => chip(`s:${k}`, v.label, '#8ecae6', S.scales.has(k))).join('')}</div></div>
    <div class="sbs-fg"><div class="sbs-chips">${chip('nav:1', 'Dans la navigation', '#ffd166', S.nav)}${chip('fav:1', 'Favorites', '#ffd166', S.fav)}</div></div>`;
}

/* ---------- fil d'Ariane ---------- */
function crumbTarget() { return mode() === 'atlas' ? node() : (S.focus ? game.folders.get(S.focus) : null); }
function renderCrumbs(root) {
  const nav = root.querySelector('.sbs-crumbs'); if (!nav) return;
  const f = crumbTarget(); const parts = f ? chain({ folder: f }) : [];
  nav.innerHTML = `<a data-crumb="" class="sbs-cr ${parts.length ? '' : 'on'}"><span class="fa-solid fa-globe"></span>Tout</a>`
    + parts.map((x, i) => { const d = fDecor(x); return `<span class="sbs-sep fa-solid fa-angle-right"></span><a data-crumb="${x.id}" class="sbs-cr ${i === parts.length - 1 ? 'on' : ''}" style="--c:${esc(d.accent)}"><span class="${iconCls(d.icon)}"></span>${esc(x.name.replace(/^plan[eè]te\s+/i, ''))}</a>`; }).join('')
    + `<a class="sbs-locate" data-t="locate" data-tooltip="Aller à la scène affichée"><span class="fa-solid fa-location-crosshairs"></span></a>`;
  nav.scrollLeft = nav.scrollWidth;
}
function goCrumb(root, id) {
  const f = id ? game.folders.get(id) : null;
  if (mode() === 'atlas') { lsSet(LS.node, f?.id ?? null); return renderAll(); }
  S.focus = f?.id ?? null;
  const list = root.querySelector(':scope > .directory-list'); if (!list) return;
  if (!f) { list.scrollTo({ top: 0, behavior: 'smooth' }); return renderCrumbs(root); }
  expandPath(chain({ folder: f })).then(() => {
    const li = root.querySelector(`li.folder[data-folder-id="${f.id}"]`);
    li?.scrollIntoView({ block: 'start', behavior: 'smooth' }); renderCrumbs(root);
  });
}
async function expandPath(folders) {
  for (const f of folders) {
    const li = ui.scenes.element.querySelector(`li.folder[data-folder-id="${f.id}"]`);
    if (li && !li.classList.contains('expanded')) { li.querySelector(':scope > header')?.click(); await new Promise(r => setTimeout(r, 120)); }
  }
}
async function locateActive(root) {
  const s = canvas?.scene ?? game.scenes.active; if (!s) return;
  if (mode() === 'atlas') { lsSet(LS.node, s.folder?.id ?? null); renderAll(); setTimeout(() => flash(root.querySelector(`.sbs-scard[data-entry-id="${s.id}"]`)), 60); return; }
  S.text = ''; await expandPath(chain(s));
  const li = root.querySelector(`li.scene[data-entry-id="${s.id}"]`);
  if (li) { li.scrollIntoView({ block: 'center', behavior: 'smooth' }); flash(li); }
  S.focus = s.folder?.id ?? null; renderCrumbs(root);
}
function flash(el) { if (!el) return; el.classList.remove('sbs-flash'); void el.offsetWidth; el.classList.add('sbs-flash'); }

/* ---------- favoris & récentes ---------- */
function renderPins(root) {
  const box = root.querySelector('.sbs-pins'); if (!box) return;
  if (!G('scPins')) { box.innerHTML = ''; return; }
  const favs = game.scenes.filter(s => scRec(s.id).fav).sort(cmpScenes);
  const viewed = lsGet(LS.viewed, {});
  const rec = Object.entries(viewed).sort((a, b) => b[1] - a[1]).map(([id]) => game.scenes.get(id)).filter(Boolean).slice(0, 12);
  const list = S.pinTab === 'fav' ? favs : rec;
  box.innerHTML = `<div class="sbs-ptabs"><a data-ptab="fav" class="${S.pinTab === 'fav' ? 'on' : ''}"><span class="fa-solid fa-star"></span>Favorites<b>${favs.length}</b></a><a data-ptab="rec" class="${S.pinTab === 'rec' ? 'on' : ''}"><span class="fa-solid fa-clock-rotate-left"></span>Récentes</a></div>
    <div class="sbs-strip">${list.length ? list.map(s => `<a class="sbs-pin directory-item" data-pin="${s.id}" data-entry-id="${s.id}" data-tooltip="${esc(s.name)}" ${lzAttr('--t', thumbOf(s))}><span class="sbs-gl"></span><span class="sbs-pn">${esc(s.name)}</span></a>`).join('') : `<p class="sbs-empty">${S.pinTab === 'fav' ? 'Clic droit sur une scène → Favorite.' : 'Les scènes que tu affiches apparaîtront ici.'}</p>`}</div>`;
}

/* ---------- passages ---------- */
function renderPass(root) {
  const box = root.querySelector('.sbs-pass'); if (!box) return;
  const s = canvas?.scene; const links = (s ? scRec(s.id).links ?? [] : []).map(id => game.scenes.get(id)).filter(Boolean);
  if (!s || !links.length || !G('scPass')) { box.innerHTML = ''; return; }
  box.innerHTML = `<h5><span class="fa-solid fa-person-walking-arrow-right"></span>Passages depuis <b>${esc(s.name)}</b></h5><div class="sbs-plinks">${links.map(x => `<span class="sbs-plink"><a data-pass="${x.id}" data-tooltip="Afficher (toi seul)">${esc(x.name)}</a><a data-pass="${x.id}" data-go="1" class="sbs-go" data-tooltip="Activer : y envoyer les joueurs"><span class="fa-solid fa-users"></span></a></span>`).join('')}</div>`;
}

/* ---------- panneau : recherche / atlas ---------- */
function matches(s, q) {
  if (S.worlds.size && !S.worlds.has(worldOf(s)?.id)) return false;
  if (S.scales.size && !(s.folder && S.scales.has(fDecor(s.folder).scale))) return false;
  if (S.nav && !s.navigation) return false;
  if (S.fav && !scRec(s.id).fav) return false;
  if (q) { const hay = norm(`${s.name} ${pathOf(s)} ${scRec(s.id).memo ?? ''}`); if (!q.split(/\s+/).every(w => hay.includes(w))) return false; }
  return true;
}
function renderPanel(root) {
  let p = root.querySelector(':scope > .sbs-panel');
  const searching = !!(S.text || S.worlds.size || S.scales.size || S.nav || S.fav);
  const show = searching || (G('scTools') && mode() === 'atlas');   /* sans barre d'outils : toujours l'arbre */
  root.classList.toggle('sbs-panel-on', show);
  if (!show) { if (p) p.innerHTML = ''; return; }
  if (!p) { p = mk('<div class="sbs-panel"></div>'); wirePanel(p, root); }
  const list = root.querySelector(':scope > .directory-list');
  if (list && p.nextElementSibling !== list) list.before(p); else if (!list && !p.isConnected) root.append(p);
  _dc = new Map();
  if (searching) return renderSearch(p);
  renderAtlas(p);
}
function renderSearch(p) {
  const q = norm(S.text);
  const scenes = game.scenes.filter(s => matches(s, q)).sort(cmpScenes);
  const folders = q ? sFolders().filter(f => norm(f.name).includes(q)).slice(0, 8) : [];
  p.innerHTML = `<div class="sbs-phead"><span class="fa-solid fa-magnifying-glass"></span>${scenes.length} scène${scenes.length > 1 ? 's' : ''}${folders.length ? ` · ${folders.length} dossier${folders.length > 1 ? 's' : ''}` : ''}</div>`
    + (folders.length ? `<div class="sbs-fhits">${folders.map(f => { const d = fDecor(f); return `<a class="sbs-fhit" data-go="${f.id}" style="--c:${esc(d.accent)}"><span class="${iconCls(d.icon)}"></span><b>${esc(f.name)}</b><small>${esc(pathOf(f) || SCALES[d.scale].label)}</small></a>`; }).join('')}</div>` : '')
    + (scenes.length ? `<ol class="sbs-rows">${scenes.slice(0, 300).map(s => rowHTML(s)).join('')}</ol>` : '<p class="sbs-empty">Aucune scène ne correspond.</p>');
}
function rowHTML(s) {
  const r = scRec(s.id); const d = s.folder ? fDecor(s.folder) : null;
  return `<li class="sbs-row directory-item ${d?.scale === 'interieur' ? 'sbs-in' : ''}" data-entry-id="${s.id}" style="--sbs-accent:${esc(d?.accent ?? '#8d99ae')}">
    <span class="sbs-th" ${lzAttr('--t', thumbOf(s))}></span>
    <span class="sbs-rt"><b>${esc(s.name)}${r.fav ? ' <span class="fa-solid fa-star sbs-fav"></span>' : ''}${r.memo ? ' <span class="fa-solid fa-note-sticky sbs-hasmemo"></span>' : ''}</b><small>${d ? `<span class="${iconCls(d.icon)}"></span>` : ''}${esc(pathOf(s) || 'Sans dossier')}</small></span></li>`;
}
function renderAtlas(p) {
  const f = node(); const subs = childFolders(f); const scenes = scenesIn(f).sort(cmpScenes);
  const card = x => { const d = fDecor(x); const n = countDeep(x); return `<div class="sbs-afold folder directory-item" data-folder-id="${x.id}" data-uuid="${x.uuid}"><a class="folder-header sbs-acard sbs-card sbs-${d.scale}" data-go="${x.id}" style="${varsAttr(d)}"${hasImg(d) ? lzAttr('--sbs-img', String(d.img)) : ''}>${layers(d).replace(/ sbs-x/g, '')}<span class="sbs-ic ${iconCls(d.icon)}"></span><span class="sbs-an"><b>${esc(x.name.replace(/^plan[eè]te\s+/i, ''))}</b><small>${SCALES[d.scale].label} · ${n} scène${n > 1 ? 's' : ''}</small></span></a></div>`; };
  const scard = s => { const r = scRec(s.id); return `<a class="sbs-scard directory-item ${f && fDecor(f).scale === 'interieur' ? 'sbs-in' : ''}" data-entry-id="${s.id}" ${lzAttr('--t', thumbOf(s))}><span class="sbs-gl"></span><span class="sbs-sn">${r.fav ? '<span class="fa-solid fa-star sbs-fav"></span>' : ''}${esc(s.name)}${r.memo ? ' <span class="fa-solid fa-note-sticky sbs-hasmemo"></span>' : ''}</span>${s.active ? '<span class="sbs-live fa-solid fa-bullseye"></span>' : ''}</a>`; };
  p.innerHTML = (f ? `<a class="sbs-up" data-go="${f.folder?.id ?? ''}"><span class="fa-solid fa-arrow-turn-up fa-flip-horizontal"></span>${esc(f.folder?.name ?? 'Tout')}</a>` : '')
    + (subs.length ? `<div class="sbs-agrid">${subs.map(card).join('')}</div>` : '')
    + (scenes.length ? `<div class="sbs-sgrid">${scenes.map(scard).join('')}</div>` : '')
    + (!subs.length && !scenes.length ? '<p class="sbs-empty">Dossier vide.</p>' : '');
}
const varsAttr = d => [`--sbs-c1:${d.c1}`, `--sbs-c2:${d.c2 || `color-mix(in srgb, ${d.c1} 16%, #080a12)`}`, `--sbs-ang:${d.angle}deg`, `--sbs-accent:${d.accent}`,
  `--sbs-op:${(Number(d.op) || 0) / 100}`, `--sbs-pos:${d.x}% ${d.y}%`].filter(Boolean).join(';');
function wirePanel(p, root) {
  p.addEventListener('click', ev => {
    if (holdUsed()) { ev.preventDefault(); return; }
    const go = ev.target.closest('[data-go]');
    if (go) {
      ev.preventDefault(); const id = go.dataset.go || null;
      if (mode() === 'atlas') { lsSet(LS.node, id); S.text = ''; return renderAll(); }
      return goCrumb(root, id);
    }
    const sc = ev.target.closest('[data-entry-id]');
    if (sc) { ev.preventDefault(); game.scenes.get(sc.dataset.entryId)?.view(); }
  });
}

/* Menu contextuel : nos cartes portent la classe « directory-item » et data-entry-id, donc le menu
 * natif de Foundry (sélecteur .directory-item[data-entry-id]) s'ouvre dessus avec toutes ses options,
 * celles des autres modules et les nôtres (Mémo MJ, Favorite, Passages). */

/* ---------- mémo MJ (appui long ou survol) ---------- */
let holdT = null, holdFired = 0, tip = null, hoverEl = null;
const holdUsed = () => Date.now() - holdFired < 400;
function memoTip(s, x, y) {
  const memo = scRec(s.id).memo; if (!memo) return;
  tip ??= document.body.appendChild(mk('<div id="sbs-memo"></div>'));
  tip.innerHTML = `<h6><span class="fa-solid fa-note-sticky"></span>${esc(s.name)}</h6><p>${esc(memo).replace(/\n/g, '<br>')}</p>`;
  tip.style.display = 'block';
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = `${Math.max(8, Math.min(x - w - 14, window.innerWidth - w - 8))}px`;
  tip.style.top = `${Math.max(8, Math.min(y - h / 2, window.innerHeight - h - 8))}px`;
}
const hideTip = () => { if (tip) tip.style.display = 'none'; clearTimeout(holdT); holdT = null; };
function wireMemo(root) {
  if (root.dataset.sbsMemo) return; root.dataset.sbsMemo = '1';
  // fil d'Ariane en mode Arbre : suit le dernier dossier ouvert ou fermé
  root.addEventListener('click', ev => { const h = ev.target.closest('.directory-list li.folder > header'); if (h) { S.focus = h.parentElement.dataset.folderId; setTimeout(() => renderCrumbs(root), 0); } });
  const target = ev => ev.target.closest('li.scene[data-entry-id], .sbs-scard, .sbs-row, .sbs-pin');
  const sceneOf = el => game.scenes.get(el?.dataset.entryId ?? el?.dataset.pin);
  let sx = 0, sy = 0;
  root.addEventListener('pointerdown', ev => {
    if (G('scMemoMode') !== 'hold' || ev.button !== 0) return;
    const el = target(ev); const s = sceneOf(el); if (!s || !scRec(s.id).memo) return;
    sx = ev.clientX; sy = ev.clientY; clearTimeout(holdT);
    holdT = setTimeout(() => { holdFired = Date.now() + 100000; memoTip(s, ev.clientX, ev.clientY); }, Number(G('scMemoDelay')) * 1000);
  });
  root.addEventListener('pointermove', ev => { if (holdT && !tip?.style.display?.includes('block') && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) { clearTimeout(holdT); holdT = null; } });
  const release = () => { if (holdFired > Date.now()) holdFired = Date.now(); hideTip(); };
  window.addEventListener('pointerup', release); root.addEventListener('dragstart', release);
  root.addEventListener('click', ev => { if (holdUsed() && target(ev)) { ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); } }, true);
  root.addEventListener('mouseover', ev => {
    if (G('scMemoMode') !== 'hover') return;
    const el = target(ev); if (!el || el === hoverEl) return; hoverEl = el;
    const s = sceneOf(el); if (!s || !scRec(s.id).memo) return;
    clearTimeout(holdT); const x = ev.clientX, y = ev.clientY;
    holdT = setTimeout(() => memoTip(s, x, y), Number(G('scMemoDelay')) * 1000);
    el.addEventListener('mouseleave', () => { hoverEl = null; hideTip(); }, { once: true });
  });
}


/* ---------- fond des cartes (portrait) ----------
 * Remplit la marge de la scène et l'extérieur, chez tout le monde. Deux calques identiques :
 *  - dans canvas.primary, juste au-dessus de la couleur de fond de Foundry (la marge passe par l'éclairage) ;
 *  - au-dessus du rendu de la scène, masqué en cadre autour d'elle, pour l'extérieur (un peu plus sombre pour se raccorder).
 * Les textures floues sont calculées une seule fois en petite taille : aucun filtre tourne en continu.
 */
const FILL_MODES = { flou: 'Flou ambiant', miroir: 'Miroir', degrade: 'Dégradé des couleurs', couleur: 'Couleur unie', image: 'Image au choix' };
const FILL_DEF = { mode: 'flou', blur: 6, light: 60, color: '#10131d', img: '' };
let FILL = null;
/* 1.22 : à quelles cartes s'applique le fond automatique — portrait, portrait + paysages étroits (ajustés à la hauteur de l'écran,
 * ils en couvrent moins que le seuil en largeur), ou toutes */
function fillApplies(s) {
  const w = s.width, h = s.height; if (!w || !h) return false; if (h > w * 1.02) return true;
  const scope = G('scFillScope') || 'etroites'; if (scope === 'toutes') return true; if (scope !== 'etroites') return false;
  const cover = (w / h) * (window.innerHeight / Math.max(1, window.innerWidth)); return cover < (Number(G('scFillNarrow')) || 70) / 100;
}
let _fillRz = null; window.addEventListener('resize', () => { if ((G('scFillScope') || 'etroites') !== 'etroites') return; clearTimeout(_fillRz); _fillRz = setTimeout(() => { if (canvas?.ready && canvas.scene && !scRec(canvas.scene.id).fill?.mode) drawFill(); }, 400); });
function fillCfg(s) {
  if (!s) return null;
  const own = scRec(s.id).fill;
  if (own?.mode) return own.mode === 'aucun' ? null : { ...FILL_DEF, ...own };
  const auto = G('scFillAuto');
  if (auto && auto !== 'aucun' && fillApplies(s)) return { ...FILL_DEF, mode: auto };
  return null;
}
function clearFill() {
  if (!FILL) return;
  for (const c of [FILL.inner, FILL.outer, FILL.edge]) { if (!c) continue; try { c.destroy({ children: true }); } catch (e) { /* déjà détruit */ } }
  for (const t of FILL.rts) { try { t.destroy(true); } catch (e) { /* déjà détruit */ } }
  FILL = null;
}
const grey = k => { const v = Math.max(0, Math.min(255, Math.round(255 * k))); return (v << 16) | (v << 8) | v; };
function smallTex(tex, h, blur, rts) {
  const w = Math.max(1, Math.round(tex.width * h / tex.height));
  const sp = new PIXI.Sprite(tex); sp.width = w; sp.height = h;
  if (blur > 0) sp.filters = [new PIXI.BlurFilter(blur, 4)];
  const rt = PIXI.RenderTexture.create({ width: w, height: h });
  canvas.app.renderer.render(sp, { renderTexture: rt }); sp.destroy(); rts.push(rt); return rt;
}
function gradientTex(tex, R, box, rts) {
  const rt = smallTex(tex, 64, 3, rts);
  const px = canvas.app.renderer.extract.pixels(rt); const W = rt.width, H = rt.height;
  const col = (x0, y) => { let r = 0, g = 0, b = 0, n = 0; for (let x = x0; x < x0 + 3 && x < W; x++) { const i = (y * W + x) * 4; r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; } return [r / n, g / n, b / n]; };
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const cx = cv.getContext('2d');
  const fl = (R.x - box.x) / box.w * cv.width, fr = (R.x + R.width - box.x) / box.w * cv.width;
  const rgb = (c, k) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
  for (let y = 0; y < cv.height; y++) {
    const wy = box.y + (y + 0.5) / cv.height * box.h;
    const my = Math.max(0, Math.min(H - 1, Math.floor((wy - R.y) / R.height * H)));
    const L = col(0, my), Rr = col(W - 3, my);
    const g = cx.createLinearGradient(0, 0, cv.width, 0);
    g.addColorStop(0, rgb(L, 0.25)); g.addColorStop(Math.max(0, Math.min(1, fl / cv.width)), rgb(L, 1));
    g.addColorStop(Math.max(0, Math.min(1, fr / cv.width)), rgb(Rr, 1)); g.addColorStop(1, rgb(Rr, 0.25));
    cx.fillStyle = g; cx.fillRect(0, y, cv.width, 1);
  }
  const t = PIXI.Texture.from(cv); rts.push(t); return t;
}
async function drawFill(cfg) {
  clearFill();
  const s = canvas?.scene; if (!s || !canvas.primary || !canvas.ready) return;
  cfg ??= fillCfg(s); if (!cfg || cfg.mode === 'aucun') return;
  const d = canvas.dimensions, R = d.sceneRect;
  const cx = R.x + R.width / 2, cy = R.y + R.height / 2;
  const box = { w: d.width * 2.4, h: d.height * 2.4 }; box.x = cx - box.w / 2; box.y = cy - box.h / 2;
  const inner = new PIXI.Container(); inner.name = 'sbsFill'; inner.elevation = -Infinity; inner.sort = -1e9; inner.eventMode = 'none';
  const outer = new PIXI.Container(); outer.name = 'sbsFillOut'; outer.eventMode = 'none';
  const rts = []; const L = (Number(cfg.light) || 60) / 100;
  const builds = [];
  const both = build => { builds.push(build); inner.addChild(build(1)); outer.addChild(build(0.82)); };
  try {
    if (cfg.mode === 'couleur') {
      const c = Number(`0x${hexOf(cfg.color).slice(1)}`);
      both(k => { const g = new PIXI.Graphics(); g.beginFill(c).drawRect(box.x, box.y, box.w, box.h).endFill(); g.tint = grey(k); return g; });
    } else {
      let tex = canvas.primary.background?.texture;
      if (cfg.mode === 'image' && cfg.img) tex = await foundry.canvas.loadTexture(cfg.img).catch(() => null) ?? tex;
      if (!tex?.valid || canvas.scene?.id !== s.id) return;
      if (cfg.mode === 'degrade') {
        const t = gradientTex(tex, R, box, rts);
        both(k => { const sp = new PIXI.Sprite(t); sp.position.set(box.x, box.y); sp.width = box.w; sp.height = box.h; sp.tint = grey(L * k); return sp; });
      } else {
        const rt = smallTex(tex, 96, cfg.mode === 'image' ? Number(cfg.blur) : Math.max(3, Number(cfg.blur)), rts);
        const sc = Math.max(box.w / rt.width, box.h / rt.height);
        both(k => { const sp = new PIXI.Sprite(rt); sp.anchor.set(0.5); sp.scale.set(sc); sp.position.set(cx, cy); sp.tint = grey(L * k); return sp; });
        if (cfg.mode === 'miroir') {
          const mt = smallTex(tex, 512, Math.min(4, Number(cfg.blur)), rts);
          const tall = R.height >= R.width;
          both(k => {
            const c = new PIXI.Container();
            for (const side of [-1, 1]) {
              const sp = new PIXI.Sprite(mt); sp.anchor.set(0.5); sp.width = R.width; sp.height = R.height;
              if (tall) { sp.scale.x *= -1; sp.position.set(cx + side * R.width, cy); } else { sp.scale.y *= -1; sp.position.set(cx, cy + side * R.height); }
              sp.tint = grey(Math.min(1, L * k * 1.15)); c.addChild(sp);
            }
            return c;
          });
        }
      }
    }
  } catch (e) { console.warn(`${ID} | fond`, e); }
  if (canvas.scene?.id !== s.id) { inner.destroy({ children: true }); outer.destroy({ children: true }); rts.forEach(t => t.destroy(true)); return; }
  canvas.primary.addChild(inner); canvas.primary.sortDirty = true;
  // Calque extérieur : posé au-dessus du rendu de la scène mais masqué en cadre autour de la zone de la scène,
  // avec 3 px de recouvrement pour effacer le liseré noir que Foundry laisse sur ce bord.
  const ins = 3, big = 1e5, rx = ins, ry = ins, rw = d.width - 2 * ins, rh = d.height - 2 * ins;
  const mask = new PIXI.Graphics(); mask.beginFill(0xffffff)
    .drawRect(-big, -big, 2 * big + d.width, big + ry)
    .drawRect(-big, ry + rh, 2 * big + d.width, big)
    .drawRect(-big, ry, big + rx, rh)
    .drawRect(rx + rw, ry, big, rh).endFill();
  outer.addChild(mask); outer.mask = mask;
  // Bandes de raccord : le calque extérieur se fond progressivement dans la marge (cuites une fois en texture).
  const edge = new PIXI.Container(); edge.name = 'sbsFillEdge'; edge.eventMode = 'none';
  const pad = Math.min(R.x, R.y, d.width - R.x - R.width, d.height - R.y - R.height);
  const F = Math.max(0, Math.min(220, pad * 0.5));
  if (F > 8 && builds.length) {
    const grad = (w, h, rev) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c2 = cv.getContext('2d');
      const g = w > h ? c2.createLinearGradient(0, 0, w, 0) : c2.createLinearGradient(0, 0, 0, h);
      g.addColorStop(rev ? 1 : 0, 'rgba(255,255,255,1)'); g.addColorStop(rev ? 0 : 1, 'rgba(255,255,255,0)');
      c2.fillStyle = g; c2.fillRect(0, 0, w, h); const t = PIXI.Texture.from(cv); rts.push(t); return t; };
    const strips = [[0, 0, F, d.height, grad(64, 1, false)], [d.width - F, 0, F, d.height, grad(64, 1, true)],
      [0, 0, d.width, F, grad(1, 64, false)], [0, d.height - F, d.width, F, grad(1, 64, true)]];
    const res = 0.25;
    for (const [x, y, w, h, gt] of strips) {
      const cont = new PIXI.Container();
      for (const b of builds) cont.addChild(b(0.82));
      const m = new PIXI.Sprite(gt); m.position.set(x, y); m.width = w; m.height = h; cont.addChild(m); cont.mask = m;
      const wrap = new PIXI.Container(); wrap.addChild(cont); wrap.scale.set(res); wrap.position.set(-x * res, -y * res);
      const rt = PIXI.RenderTexture.create({ width: Math.max(1, Math.ceil(w * res)), height: Math.max(1, Math.ceil(h * res)) });
      canvas.app.renderer.render(wrap, { renderTexture: rt }); wrap.destroy({ children: true }); rts.push(rt);
      const sp = new PIXI.Sprite(rt); sp.position.set(x, y); sp.width = w; sp.height = h; edge.addChild(sp);
    }
  }
  const at = canvas.stage.children.findIndex(c => c.constructor.name === 'RenderedCanvasGroup' || c === canvas.rendered);
  canvas.stage.addChildAt(outer, at >= 0 ? at + 1 : 0);
  canvas.stage.addChildAt(edge, at >= 0 ? at + 2 : 1);
  FILL = { inner, outer, edge, rts, sid: s.id };
}
async function openFill(s) {
  const own = scRec(s.id).fill ?? {}; const cur = { ...FILL_DEF, ...own };
  const portrait = s.height > s.width * 1.02;
  const live = () => canvas?.scene?.id === s.id;
  let el, deb;
  const read = () => { const v = n => el.querySelector(`[name="${n}"]`); return { mode: v('mode').value, blur: Number(v('blur').value), light: Number(v('light').value), color: v('color').value, img: v('img').value.trim() }; };
  const sync = () => {
    const c = read();
    el.querySelectorAll('[data-for]').forEach(x => { x.style.display = x.dataset.for.split(' ').includes(c.mode) ? '' : 'none'; });
    el.querySelector('[data-out="blur"]').textContent = `${c.blur}`; el.querySelector('[data-out="light"]').textContent = `${c.light} %`;
    if (live()) { clearTimeout(deb); deb = setTimeout(() => drawFill(c.mode === 'auto' ? undefined : c), 180); }
  };
  const content = `<div class="sbm-panel sbs-filldlg">
    <p class="sbm-note">${portrait ? 'Carte en portrait' : 'Carte en paysage'} (${s.width} × ${s.height}). ${live() ? 'Aperçu en direct sur la carte affichée.' : "Affiche cette scène pour voir l'aperçu en direct."}</p>
    <label>Fond<select name="mode"><option value="auto" ${!own.mode ? 'selected' : ''}>Automatique (réglage général)</option><option value="aucun" ${own.mode === 'aucun' ? 'selected' : ''}>Aucun</option>${Object.entries(FILL_MODES).map(([k, v]) => `<option value="${k}" ${own.mode === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label data-for="flou miroir image">Flou <b data-out="blur"></b><input type="range" name="blur" min="0" max="20" step="1" value="${cur.blur}"></label>
    <label data-for="flou miroir degrade couleur image">Luminosité <b data-out="light"></b><input type="range" name="light" min="15" max="100" step="5" value="${cur.light}"></label>
    <label data-for="couleur">Couleur<input type="color" name="color" value="${hexOf(cur.color)}"></label>
    <div data-for="image"><div class="sbm-frow"><input type="text" name="img" value="${esc(cur.img)}" placeholder="Image (texture, ciel, motif…)"><a class="sbm-btn" data-pick><span class="fa-solid fa-folder-open"></span></a></div></div>
    <p class="sbm-note">Flou ambiant : la carte agrandie et floutée. Miroir : la carte reflétée de chaque côté. Dégradé : les couleurs des bords de la carte s'étirent vers le noir. Visible par tous les joueurs.</p></div>`;
  const res = await foundry.applications.api.DialogV2.wait({
    window: { title: `Fond de la carte · ${s.name}`, icon: 'fa-solid fa-panorama' }, classes: ['sbm-dialog'], position: { width: 420 }, content, rejectClose: false,
    buttons: [{ action: 'save', label: 'Enregistrer', icon: 'fa-solid fa-check', default: true, callback: () => ({ cfg: read() }) }, { action: 'cancel', label: 'Annuler', icon: 'fa-solid fa-xmark' }],
    render: (event, dlg) => {
      el = dlgEl(dlg, '.sbs-filldlg');
      el.addEventListener('input', sync); el.addEventListener('change', sync);
      el.querySelector('[data-pick]').addEventListener('click', ev => {
        ev.preventDefault(); const inp = el.querySelector('[name="img"]'); const FP = foundry.applications.apps.FilePicker.implementation;
        new FP({ type: 'image', current: inp.value, callback: path => { inp.value = path; sync(); } }).render(true);
      });
      sync();
    }
  });
  if (!res?.cfg) { if (live()) drawFill(); return; }
  await saveSt(x => {
    const r = { ...(x.scenes[s.id] ?? {}) };
    if (res.cfg.mode === 'auto') delete r.fill; else r.fill = res.cfg;
    x.scenes[s.id] = r;
  });
  if (live()) drawFill();
}

/* ---------- fenêtres ---------- */
const dlgEl = (a, sel) => (a instanceof HTMLElement ? a : a?.element)?.querySelector?.(sel);
async function openDecor(f) {
  _dc = new Map();
  const base = fDecor(f, false); const own = st().folders[f.id] ?? {};
  const cur = { ...base }; applyOwn(cur, own); if (!own.icon) cur.icon = SCALES[cur.scale].icon; if (!cur.accent) cur.accent = cur.c1;
  const autoCol = !own.c1 && !own.c2 && !own.accent;
  const content = `<div class="sbm-panel sbs-decor">
    <div class="sbs-prevwrap"><div class="sbs-prev sbs-card sbs-${cur.scale}"><span class="sbs-bg"></span><span class="sbs-tint"></span><span class="sbs-fr"></span><span class="sbs-wm"></span><span class="sbs-gl"></span><span class="sbs-ic"></span><span class="sbs-pn"><b>${esc(f.name)}</b><small></small></span></div></div>
    <fieldset><legend>Échelle et cadre</legend><div class="sbm-grid2">
      <label>Échelle<select name="scale">${Object.entries(SCALES).map(([k, v]) => `<option value="${k}" ${k === cur.scale ? 'selected' : ''}>${v.label}${k === base.scale ? ' (auto)' : ''}</option>`).join('')}</select></label>
      <label>Cadre<select name="frame">${Object.entries(FRAMES).map(([k, v]) => `<option value="${k}" ${k === cur.frame ? 'selected' : ''}>${v}${k === base.frame ? ' (auto)' : ''}</option>`).join('')}</select></label></div></fieldset>
    <fieldset><legend>Image</legend>
      <div class="sbm-frow"><input type="text" name="img" value="${esc(hasImg(own) ? own.img : '')}" placeholder="Chemin de l'image"><a class="sbm-btn" data-pick><span class="fa-solid fa-folder-open"></span></a></div>
      <div class="sbm-grid3"><label>Opacité <b data-out="op"></b><input type="range" name="op" min="0" max="100" step="1" value="${cur.op}"></label>
      <label>Cadrage X <b data-out="x"></b><input type="range" name="x" min="0" max="100" value="${cur.x}"></label>
      <label>Cadrage Y <b data-out="y"></b><input type="range" name="y" min="0" max="100" value="${cur.y}"></label></div></fieldset>
    <fieldset><legend>Icône</legend><input type="text" name="icon" value="${esc(own.icon ?? '')}" placeholder="auto selon l'échelle">
      <div class="sbm-icons">${ICON_PICK.map(i => `<a data-ic="${i}" data-tooltip="${i.slice(3)}"><span class="fa-solid ${i}"></span></a>`).join('')}</div></fieldset>
    <fieldset><legend>Dégradé</legend>
      <label class="sbm-cb"><input type="checkbox" name="auto" ${autoCol ? 'checked' : ''}> Couleurs automatiques (couleur du dossier Foundry)</label>
      <div class="sbm-grid3"><label>Début<input type="color" name="c1" value="${hexOf(cur.c1)}"></label><label>Fin<input type="color" name="c2" value="${hexOf(cur.c2 || '#080a12')}"></label><label>Liseré<input type="color" name="accent" value="${hexOf(cur.accent)}"></label></div>
      <label>Angle <b data-out="angle"></b><input type="range" name="angle" min="0" max="360" value="${cur.angle}"></label></fieldset></div>`;
  let el;
  const read = () => {
    const v = n => el.querySelector(`[name="${n}"]`); const o = {};
    if (v('scale').value !== base.scale) o.scale = v('scale').value;
    if (v('frame').value !== base.frame) o.frame = v('frame').value;
    if (v('img').value.trim()) o.img = v('img').value.trim();
    for (const k of ['op', 'x', 'y', 'angle']) { const n = Number(v(k).value); if (n !== base[k]) o[k] = n; }
    if (v('icon').value.trim()) o.icon = v('icon').value.trim();
    if (!v('auto').checked) { o.c1 = v('c1').value; o.c2 = v('c2').value; o.accent = v('accent').value; }
    return o;
  };
  const preview = () => {
    const d = { ...base }; applyOwn(d, read()); if (!read().icon) d.icon = SCALES[d.scale].icon; if (!d.accent) d.accent = d.c1;
    const pv = el.querySelector('.sbs-prev'); setVars(pv, d);
    pv.className = `sbs-prev sbs-card sbs-${d.scale}`;
    pv.querySelector('.sbs-bg').style.display = hasImg(d) ? '' : 'none';
    pv.querySelector('.sbs-fr').className = `sbs-fr fr-${d.frame}`;
    pv.querySelector('.sbs-wm').className = `sbs-wm ${iconCls(d.icon)}`;
    pv.querySelector('.sbs-ic').className = `sbs-ic ${iconCls(d.icon)}`;
    pv.querySelector('small').textContent = SCALES[d.scale].label;
    for (const k of ['op', 'x', 'y', 'angle']) el.querySelector(`[data-out="${k}"]`).textContent = el.querySelector(`[name="${k}"]`).value + (k === 'angle' ? '°' : '%');
    for (const n of ['c1', 'c2', 'accent']) el.querySelector(`[name="${n}"]`).disabled = el.querySelector('[name="auto"]').checked;
  };
  const res = await foundry.applications.api.DialogV2.wait({
    window: { title: `Habillage · ${f.name}`, icon: 'fa-solid fa-palette' }, classes: ['sbm-dialog'], position: { width: 470 }, content, rejectClose: false,
    buttons: [{ action: 'save', label: 'Enregistrer', icon: 'fa-solid fa-check', default: true, callback: () => ({ own: read() }) },
      { action: 'reset', label: 'Réinitialiser', icon: 'fa-solid fa-rotate-left' }, { action: 'cancel', label: 'Annuler', icon: 'fa-solid fa-xmark' }],
    render: (event, dlg) => {
      el = dlgEl(dlg, '.sbs-decor');
      el.addEventListener('input', preview); el.addEventListener('change', preview);
      el.querySelector('[data-pick]').addEventListener('click', ev => {
        ev.preventDefault(); const inp = el.querySelector('[name="img"]'); const FP = foundry.applications.apps.FilePicker.implementation;
        new FP({ type: 'image', current: inp.value, callback: path => { inp.value = path; preview(); } }).render(true);
      });
      el.querySelector('.sbm-icons').addEventListener('click', ev => { const a = ev.target.closest('[data-ic]'); if (!a) return; ev.preventDefault(); el.querySelector('[name="icon"]').value = a.dataset.ic; preview(); });
      preview();
    }
  });
  if (!res || res === 'cancel') return;
  await saveSt(s => { const own = res === 'reset' ? null : res.own; if (own && Object.keys(own).length) s.folders[f.id] = own; else delete s.folders[f.id]; });
}
async function openMemo(s) {
  const res = await foundry.applications.api.DialogV2.wait({
    window: { title: `Mémo MJ · ${s.name}`, icon: 'fa-solid fa-note-sticky' }, classes: ['sbm-dialog'], position: { width: 420 }, rejectClose: false,
    content: `<div class="sbm-panel"><textarea name="memo" rows="7" class="sbs-ta" placeholder="Ex. : les gardes changent à minuit, la porte nord est piégée…">${esc(scRec(s.id).memo ?? '')}</textarea>
      <p class="sbm-note">Visible par toi seul, en ${G('scMemoMode') === 'hold' ? `maintenant le clic ${G('scMemoDelay')} s` : `survolant ${G('scMemoDelay')} s`} sur la scène.</p></div>`,
    buttons: [{ action: 'save', label: 'Enregistrer', icon: 'fa-solid fa-check', default: true, callback: (ev, btn) => btn.form.elements.memo.value }, { action: 'cancel', label: 'Annuler' }]
  });
  if (typeof res !== 'string' || res === 'cancel') return;
  await saveSt(x => { x.scenes[s.id] = { ...(x.scenes[s.id] ?? {}), memo: res.trim() }; if (!x.scenes[s.id].memo) delete x.scenes[s.id].memo; });
}
async function toggleFav(s) { await saveSt(x => { const r = { ...(x.scenes[s.id] ?? {}) }; r.fav = !r.fav; if (!r.fav) delete r.fav; x.scenes[s.id] = r; }); }
async function openPassages(s) {
  const links = new Set(scRec(s.id).links ?? []); let el;
  const draw = () => {
    el.querySelector('.sbs-cur').innerHTML = links.size ? [...links].map(id => game.scenes.get(id)).filter(Boolean).map(x => `<a class="sbs-chip on" data-rm="${x.id}" style="--c:#8ecae6">${esc(x.name)} <span class="fa-solid fa-xmark"></span></a>`).join('') : '<p class="sbm-note">Aucun passage.</p>';
    const q = norm(el.querySelector('[name="q"]').value);
    const hits = q ? game.scenes.filter(x => x.id !== s.id && !links.has(x.id) && norm(`${x.name} ${pathOf(x)}`).includes(q)).slice(0, 12) : [];
    el.querySelector('.sbs-hits').innerHTML = hits.map(x => `<a class="sbs-hit" data-add="${x.id}"><b>${esc(x.name)}</b><small>${esc(pathOf(x))}</small></a>`).join('');
  };
  const res = await foundry.applications.api.DialogV2.wait({
    window: { title: `Passages · ${s.name}`, icon: 'fa-solid fa-person-walking-arrow-right' }, classes: ['sbm-dialog'], position: { width: 440 }, rejectClose: false,
    content: `<div class="sbm-panel sbs-passdlg"><fieldset><legend>Scènes reliées</legend><div class="sbs-chips sbs-cur"></div></fieldset>
      <fieldset><legend>Ajouter</legend><input type="text" name="q" placeholder="Chercher une scène…" autocomplete="off"><div class="sbs-hits"></div></fieldset>
      <p class="sbm-note">Les passages vont dans les deux sens. Quand tu affiches cette scène, ils apparaissent en haut de l'onglet Scènes.</p></div>`,
    buttons: [{ action: 'save', label: 'Enregistrer', icon: 'fa-solid fa-check', default: true, callback: () => 'save' }, { action: 'cancel', label: 'Annuler' }],
    render: (event, dlg) => {
      el = dlgEl(dlg, '.sbs-passdlg'); draw();
      el.querySelector('[name="q"]').addEventListener('input', draw);
      el.querySelector('[name="q"]').addEventListener('keydown', ev => { if (ev.key === 'Enter') ev.preventDefault(); ev.stopPropagation(); });
      el.addEventListener('click', ev => {
        const rm = ev.target.closest('[data-rm]'); const add = ev.target.closest('[data-add]');
        if (rm) { ev.preventDefault(); links.delete(rm.dataset.rm); draw(); }
        if (add) { ev.preventDefault(); links.add(add.dataset.add); el.querySelector('[name="q"]').value = ''; draw(); }
      });
    }
  });
  if (res !== 'save') return;
  await saveSt(x => {
    const before = new Set(x.scenes[s.id]?.links ?? []);
    x.scenes[s.id] = { ...(x.scenes[s.id] ?? {}), links: [...links] };
    for (const id of links) { const r = x.scenes[id] = { ...(x.scenes[id] ?? {}) }; r.links = [...new Set([...(r.links ?? []), s.id])]; }
    for (const id of before) if (!links.has(id) && x.scenes[id]?.links) x.scenes[id].links = x.scenes[id].links.filter(v => v !== s.id);
  });
}
async function openConfig() {
  const content = `<div class="sbm-panel sbs-cfg">
    <fieldset><legend>Mémo MJ</legend>
      <label>Affichage<select name="scMemoMode"><option value="hold" ${G('scMemoMode') === 'hold' ? 'selected' : ''}>En maintenant le clic</option><option value="hover" ${G('scMemoMode') === 'hover' ? 'selected' : ''}>Au survol</option></select></label>
      <label>Délai <b data-out="d"></b><input type="range" name="scMemoDelay" min="0.2" max="3" step="0.1" value="${G('scMemoDelay')}"></label></fieldset>
    <fieldset><legend>Barre d'outils & clic droit</legend>
      <label class="sbm-cb"><input type="checkbox" name="scTools" ${G('scTools') ? 'checked' : ''}> Barre d'outils en haut de l'onglet (recherche, Arbre / Atlas, filtres, tri)</label>
      <label>Clic droit sur une scène<select name="scMenu"><option value="simple" ${G('scMenu') === 'simple' ? 'selected' : ''}>Simple — Activer, Configurer, Précharger, Position de vue, Navigation, Permissions, Supprimer, Dupliquer, Scenery</option><option value="complet" ${G('scMenu') === 'complet' ? 'selected' : ''}>Complet — tout, plus Mémo MJ, Favorite, Fond, Passages</option></select></label></fieldset>
    <fieldset><legend>Affichage</legend>
      <label>Taille des scènes dans l'arbre<select name="scDensity">${[['grande', 'Grande (Foundry)'], ['moyenne', 'Moyenne'], ['liste', 'Liste compacte']].map(([k, v]) => `<option value="${k}" ${G('scDensity') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="sbm-cb"><input type="checkbox" name="scPins" ${G('scPins') ? 'checked' : ''}> Rangée Favorites / Récentes</label>
      <label class="sbm-cb"><input type="checkbox" name="scPass" ${G('scPass') ? 'checked' : ''}> Barre des passages de la scène affichée</label></fieldset>
    <fieldset><legend>Fond automatique des cartes (tous les joueurs)</legend>
      <label>Fond par défaut<select name="scFillAuto"><option value="aucun" ${G('scFillAuto') === 'aucun' ? 'selected' : ''}>Aucun</option>${Object.entries(FILL_MODES).filter(([k]) => k !== 'image' && k !== 'couleur').map(([k, v]) => `<option value="${k}" ${G('scFillAuto') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>S'applique à<select name="scFillScope">${[['portrait', 'Cartes en portrait'], ['etroites', 'Portrait + paysages étroits'], ['toutes', 'Toutes les cartes']].map(([k, l]) => `<option value="${k}" ${(G('scFillScope') || 'etroites') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Paysage « étroit » : couvre moins de <b data-out="nw"></b> de la largeur de l'écran<input type="range" name="scFillNarrow" min="40" max="95" step="5" value="${Number(G('scFillNarrow')) || 70}"></label>
      <p class="sbm-note">Une carte en paysage est « étroite » si, ajustée à la hauteur de l'écran, elle laisse de grandes marges sur les côtés. Une scène peut avoir son propre fond : clic droit → Fond de la carte (prioritaire).</p></fieldset></div>`;
  let el;
  const res = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Sidebar Manhwa · Scènes', icon: 'fa-solid fa-sliders' }, classes: ['sbm-dialog'], position: { width: 420 }, content, rejectClose: false,
    buttons: [{ action: 'save', label: 'Enregistrer', icon: 'fa-solid fa-check', default: true, callback: () => 'save' }, { action: 'cancel', label: 'Annuler' }],
    render: (event, dlg) => { el = dlgEl(dlg, '.sbs-cfg'); const o = () => { el.querySelector('[data-out="d"]').textContent = `${el.querySelector('[name="scMemoDelay"]').value} s`; const nw = el.querySelector('[data-out="nw"]'); if (nw) nw.textContent = `${el.querySelector('[name="scFillNarrow"]').value} %`; }; el.addEventListener('input', o); o(); }
  });
  if (res !== 'save') return;
  const v = n => el.querySelector(`[name="${n}"]`);
  await game.settings.set(ID, 'scTools', v('scTools').checked);
  await game.settings.set(ID, 'scMenu', v('scMenu').value);
  await game.settings.set(ID, 'scMemoMode', v('scMemoMode').value);
  await game.settings.set(ID, 'scMemoDelay', Number(v('scMemoDelay').value));
  await game.settings.set(ID, 'scDensity', v('scDensity').value);
  await game.settings.set(ID, 'scPins', v('scPins').checked);
  await game.settings.set(ID, 'scPass', v('scPass').checked);
  if (G('scFillAuto') !== v('scFillAuto').value) await game.settings.set(ID, 'scFillAuto', v('scFillAuto').value);
  if ((G('scFillScope') || 'etroites') !== v('scFillScope').value) await game.settings.set(ID, 'scFillScope', v('scFillScope').value);
  if ((Number(G('scFillNarrow')) || 70) !== Number(v('scFillNarrow').value)) await game.settings.set(ID, 'scFillNarrow', Number(v('scFillNarrow').value));
}

/* ---------- branchements ---------- */
Hooks.once('init', () => {
  const reg = (k, o) => game.settings.register(ID, k, o);
  reg('scStore', { scope: 'world', config: false, type: Object, default: {}, onChange: () => {
    const before = JSON.stringify(canvas?.scene ? scRec(canvas.scene.id).fill ?? null : null);
    _st = null; refresh();
    if (canvas?.scene && JSON.stringify(scRec(canvas.scene.id).fill ?? null) !== before) drawFill();
  } });
  reg('scEnabled', { name: 'Habillage de l\'onglet Scènes', hint: 'Échelles, atlas, recherche, passages. Décocher rend l\'onglet d\'origine.', scope: 'client', config: true, type: Boolean, default: true, onChange: () => ui.scenes?.render() });
  reg('scMemoMode', { scope: 'client', config: false, type: String, default: 'hold' });
  reg('scMemoDelay', { scope: 'client', config: false, type: Number, default: 0.6 });
  reg('scDensity', { scope: 'client', config: false, type: String, default: 'grande', onChange: () => refresh() });
  reg('scSort', { scope: 'client', config: false, type: String, default: 'core', onChange: () => { refresh(); } });
  reg('scTools', { name: 'Scènes : barre d\'outils en haut de l\'onglet', hint: 'Recherche, Arbre / Atlas, filtres, tri, favorites / récentes, passages. Désactivée par défaut.', scope: 'client', config: true, type: Boolean, default: false, onChange: () => refresh() });
  reg('scMenu', { name: 'Scènes : clic droit', hint: 'Simple : Activer, Configurer, Précharger, Position de vue, Navigation, Permissions, Supprimer, Dupliquer, Scenery. Complet : tout, plus Mémo MJ, Favorite, Fond de la carte, Passages.', scope: 'client', config: true, type: String, choices: { simple: 'Simple', complet: 'Complet' }, default: 'simple', onChange: () => ui.scenes?.render() });
  reg('scPins', { scope: 'client', config: false, type: Boolean, default: false, onChange: () => refresh() });
  reg('scPass', { scope: 'client', config: false, type: Boolean, default: false, onChange: () => refresh() });
  game.settings.registerMenu(ID, 'scConfig', { name: 'Scènes : réglages', label: 'Réglages des scènes…', hint: 'Barre d\'outils, clic droit, mémo MJ, taille, fond des cartes.', icon: 'fa-solid fa-map', restricted: false, type: class extends foundry.applications.api.ApplicationV2 { static DEFAULT_OPTIONS = { id: 'sbs-menu-shim' }; async render() { await openConfig(); return this; } async _renderHTML() { return ''; } _replaceHTML() {} } });
  reg('scFillAuto', { scope: 'world', config: false, type: String, default: 'aucun', onChange: () => drawFill() });
  reg('scFillScope', { scope: 'world', config: false, type: String, default: 'etroites', onChange: () => drawFill() });
  reg('scFillNarrow', { scope: 'world', config: false, type: Number, default: 70, onChange: () => drawFill() });
});
Hooks.on('renderSceneDirectory', (app, html) => { try { enhance(elOf(html) ?? app.element); } catch (e) { console.error(`${ID} | scènes`, e); } });
Hooks.on('canvasReady', () => { drawFill(); });
Hooks.on('canvasTearDown', () => clearFill());
Hooks.on('canvasReady', () => {
  if (!game.user.isGM || !canvas.scene) return;
  const v = lsGet(LS.viewed, {}); v[canvas.scene.id] = Date.now();
  lsSet(LS.viewed, Object.fromEntries(Object.entries(v).sort((a, b) => b[1] - a[1]).slice(0, 40)));
  for (const a of dirApps()) { renderPins(a.element); renderPass(a.element); }
});
Hooks.on('updateScene', (s, ch) => {
  if (ch.active === true && game.user.isGM && game.users.activeGM?.id === game.user.id) saveSt(x => { x.stats[s.id] = { ...(x.stats[s.id] ?? {}), active: Date.now() }; });
});
Hooks.on('getFolderContextOptions', (app, opts) => {
  if (!isSceneDir(app)) return;
  opts.push({ name: 'Habillage', icon: '<i class="fa-solid fa-palette"></i>', condition: () => game.user.isGM,
    callback: t => { const f = game.folders.get(elOf(t)?.closest('[data-folder-id]')?.dataset.folderId); if (f) openDecor(f); } });
});
/* clic droit « simple » : seulement Activer, Configurer, Permissions, Supprimer, Dupliquer (+ Scenery si le module est là) */
const SIMPLE_KEEP = /^(SCENE\.Activate|SCENE\.Configure|SCENE\.Preload|SCENE\.ToggleNav|MonksSceneNavigation\.SetViewPosition|OWNERSHIP\.Configure|SIDEBAR\.Delete|SIDEBAR\.Duplicate|Activer|Activate|Configurer|Configure|Permissions|Configure Ownership|Supprimer|Delete|Dupliquer|Duplicate|Preload Scene|Précharger.*|Toggle Navigation|.*navigation.*|Set View Position|Position de vue.*|Définir la vue.*|Scenery.*)$/i;
function simpleMenu(opts) {
  const lab = o => { const n = String(o.name ?? ''); const t = game.i18n.has?.(n) ? game.i18n.localize(n) : n; return `${n}|${t}`; };
  const kept = opts.filter(o => lab(o).split('|').some(x => SIMPLE_KEEP.test(x.trim())));
  opts.splice(0, opts.length, ...kept);
}
/* …et pour les entrées ajoutées par des modules chargés après nous : filtrage de `menuItems` juste avant le rendu du menu
 * (1.6.0 retirait les lignes du DOM pendant l'animation d'ouverture → le menu restait à 2 px de haut, « clic droit mort »). */
Hooks.once('setup', () => {
  const CM = foundry.applications?.ux?.ContextMenu?.implementation ?? foundry.applications?.ux?.ContextMenu; if (!CM?.prototype?.render) return;
  const orig = CM.prototype.render;
  CM.prototype.render = function (target, ...rest) {
    try {
      const el = target instanceof HTMLElement ? target : target?.[0];
      if (el?.closest?.('#scenes .directory-item.entry, #scenes li.scene') && G('scMenu') !== 'complet' && Array.isArray(this.menuItems)) {
        const lab = o => { const n = String(o.name ?? ''); const t = game.i18n.has?.(n) ? game.i18n.localize(n) : n; return [n, t]; };
        this.menuItems = this.menuItems.filter(o => lab(o).some(x => SIMPLE_KEEP.test(x.trim())));
      }
    } catch (e) { console.warn(`${ID} | menu simple`, e); }
    return orig.call(this, target, ...rest);
  };
});
/* la barre de navigation des scènes (en haut) utilise le même hook : on n'y touche pas (Précharger, Position de vue, Rappeler les joueurs…) */
const isNav = app => app === ui.nav || app?.id === 'navigation' || app?.id === 'scene-navigation' || /Navigation/.test(app?.constructor?.name ?? '');
/* Précharger et Position de vue : ajoutés au clic droit des scènes s'ils n'y sont pas déjà (Monk's Scene Navigation les met seulement dans la barre) */
/* 1.28.1 : « Définir la vue » — la vue actuelle (position et zoom) devient la vue de départ de la scène ; dans le menu de la barre de navigation et du répertoire */
const setViewOpt = sc => ({ sbs: true, name: 'Définir la vue (position actuelle)', icon: '<i class="fa-solid fa-crop-simple"></i>', condition: () => game.user.isGM,
  callback: async t => { const s = sc(t); if (!s) return; if (s.id !== canvas.scene?.id) return ui.notifications.warn(`Affiche d'abord « ${s.name} » : la vue enregistrée est celle de l'écran.`); const p = canvas.stage.pivot; await s.update({ initial: { x: Math.round(p.x), y: Math.round(p.y), scale: Math.round(canvas.stage.scale.x * 1000) / 1000 } }); ui.notifications.info(`Vue de départ de « ${s.name} » enregistrée.`); } });
function navExtras(opts, sc) {
  const has = re => opts.some(o => re.test(String(o.name ?? '')) || re.test(game.i18n.localize(String(o.name ?? ''))));
  if (!has(/Preload|Précharg/i)) opts.push({ sbs: true, name: 'SCENE.Preload', icon: '<i class="fa-solid fa-download"></i>', condition: () => game.user.isGM,
    callback: t => { const s = sc(t); if (s) game.scenes.preload(s.id, true); } });
  if (!has(/SetViewPosition|Set View|Position de vue|Définir la vue/i)) opts.push(setViewOpt(sc));
}
Hooks.on('getSceneContextOptions', (app, opts) => {
  if (isNav(app)) { const has = opts.some(o => /SetViewPosition|Set View|Position de vue|Définir la vue/i.test(`${o.name} ${game.i18n.localize(String(o.name ?? ''))}`)); if (!has) opts.push(setViewOpt(t => game.scenes.get(elOf(t)?.closest('[data-scene-id]')?.dataset.sceneId))); return; }
  if (opts.some(o => o.sbsDone)) return;
  const sc = t => game.scenes.get(elOf(t)?.closest('[data-entry-id]')?.dataset.entryId);
  if (G('scMenu') !== 'complet') { simpleMenu(opts); navExtras(opts, sc); return; }
  navExtras(opts, sc);
  opts.push(
    { sbs: true, sbsDone: true, name: 'Mémo MJ', icon: '<i class="fa-solid fa-note-sticky"></i>', condition: () => game.user.isGM, callback: t => { const s = sc(t); if (s) openMemo(s); } },
    { sbs: true, name: 'Favorite (oui / non)', icon: '<i class="fa-solid fa-star"></i>', condition: () => game.user.isGM, callback: t => { const s = sc(t); if (s) toggleFav(s); } },
    { sbs: true, name: 'Fond de la carte…', icon: '<i class="fa-solid fa-panorama"></i>', condition: () => game.user.isGM, callback: t => { const s = sc(t); if (s) openFill(s); } },
    { sbs: true, name: 'Passages…', icon: '<i class="fa-solid fa-person-walking-arrow-right"></i>', condition: () => game.user.isGM, callback: t => { const s = sc(t); if (s) openPassages(s); } }
  );
});
