/* Sidebar Manhwa — volet Playlists · v1.4.2
 * Note : Foundry v13 force l'icône « dossier » sur tout <i> enfant direct d'un en-tête de dossier replié
 * (.directory li.folder:not(.expanded) > .folder-header > i::before) : nos icônes sont donc des <span>.
 * Habillage (image, icônes, dégradé), étiquettes, favoris, vues intelligentes,
 * sélection simple / multiple, lecteur joueurs avec votes.
 * Aucune donnée Foundry n'est modifiée : tout vit dans deux réglages de monde (store, votes).
 */
import { lzAttr, lzSet } from './lazy.js';
import { withLock } from './lock.js';
const ID = 'sidebar-manhwa';
const SOCKET = `module.${ID}`;
const STORE_V = 1;
const GROUPS = ['Mood', 'Univers', 'Style', 'Autre'];

const SEED_TAGS = {
  'Fantasy': { group: 'Mood', color: '#7bd88f' }, 'Calme': { group: 'Mood', color: '#8ecae6' },
  'Dark': { group: 'Mood', color: '#9d4edd' }, 'Sad': { group: 'Mood', color: '#5c7cfa' },
  'Épique': { group: 'Mood', color: '#ffb703' }, 'Futuriste': { group: 'Mood', color: '#00d4ff' },
  'Tension': { group: 'Mood', color: '#ef476f' }, 'Hopeful': { group: 'Mood', color: '#ffd166' },
  'Chill': { group: 'Mood', color: '#90e0ef' }, 'Mystère': { group: 'Mood', color: '#b8c0ff' },
  'Système': { group: 'Univers', color: '#4cc9f0' }, 'Eos': { group: 'Univers', color: '#e9c46a' },
  'Andromeda': { group: 'Univers', color: '#219ebc' }, 'Clockwork': { group: 'Univers', color: '#e67e22' },
  'Cordelia': { group: 'Univers', color: '#58b94b' }, 'Eryndor': { group: 'Univers', color: '#d62839' },
  'Hyperion': { group: 'Univers', color: '#a2d2ff' }, 'Inertia': { group: 'Univers', color: '#c77dff' },
  'Nova Stella': { group: 'Univers', color: '#f72585' }, 'Triangulum': { group: 'Univers', color: '#8338ec' }
};

/* Icône proposée d'après le nom (s'adapte à l'arborescence existante). Ordre = priorité. */
const ICONS = [
  [/combat|battle|bataille/, 'fa-swords'], [/epique|epic/, 'fa-crown'],
  [/voiture|car\b/, 'fa-car-side'], [/aeronef|avion/, 'fa-plane'], [/helico/, 'fa-helicopter'],
  [/train/, 'fa-train'], [/\bbus\b/, 'fa-bus'], [/moto/, 'fa-motorcycle'], [/sirene/, 'fa-truck-medical'],
  [/vehicule/, 'fa-car-side'], [/door|porte/, 'fa-door-open'], [/explosion/, 'fa-explosion'],
  [/earthquake|seisme/, 'fa-house-crack'], [/alarme/, 'fa-bell'], [/arme|gun/, 'fa-gun'],
  [/footstep/, 'fa-shoe-prints'], [/\bfeu\b|fire/, 'fa-fire'], [/magie|magic/, 'fa-wand-sparkles'],
  [/monstre/, 'fa-dragon'], [/telephone|phone/, 'fa-phone'], [/verre|glass/, 'fa-wine-glass'],
  [/hopital|hospital/, 'fa-hospital'], [/elevator|ascenseur/, 'fa-elevator'], [/cuisine/, 'fa-utensils'],
  [/\bpc\b|ordinateur/, 'fa-computer'], [/cinemat/, 'fa-film'], [/meteo|pluie|rain/, 'fa-cloud-rain'],
  [/ville|city/, 'fa-city'], [/foule|crowd|arena/, 'fa-people-group'], [/firework/, 'fa-burst'],
  [/futur|science|sci-fi|stellar|interstellar/, 'fa-user-astronaut'], [/fantasy/, 'fa-hat-wizard'],
  [/calme|chill/, 'fa-leaf'], [/dark|horreur|horror/, 'fa-skull'], [/sad|emotion|triste/, 'fa-heart-crack'],
  [/hopeful|espoir/, 'fa-sun'], [/tension|suspense/, 'fa-bolt'], [/course|poursuite|chase/, 'fa-person-running'],
  [/school|ecole/, 'fa-school'], [/menu/, 'fa-bars'], [/radio/, 'fa-radio'],
  [/classique|noblesse/, 'fa-chess-queen'], [/phonk|breakcore/, 'fa-headphones'], [/apocalyp/, 'fa-radiation'],
  [/asiat/, 'fa-torii-gate'], [/steampunk/, 'fa-gear'], [/desert/, 'fa-sun-plant-wilt'],
  [/cordelia|light fantasy/, 'fa-feather'], [/secret/, 'fa-user-secret'], [/post-modern|moderne|modern/, 'fa-building'],
  [/licence|ost/, 'fa-compact-disc'], [/atmosph/, 'fa-cloud-moon'], [/ambient|ambiance/, 'fa-wave-square'],
  [/sfx/, 'fa-burst'], [/univers|monde/, 'fa-earth-europe'], [/divers/, 'fa-shapes'], [/musique|music/, 'fa-music']
];

const ICON_PICK = ['fa-swords', 'fa-crown', 'fa-dragon', 'fa-skull', 'fa-ghost', 'fa-heart-crack', 'fa-leaf', 'fa-sun',
  'fa-moon', 'fa-cloud-moon', 'fa-cloud-rain', 'fa-snowflake', 'fa-fire', 'fa-bolt', 'fa-wand-sparkles', 'fa-hat-wizard',
  'fa-dungeon', 'fa-chess-queen', 'fa-feather', 'fa-gear', 'fa-robot', 'fa-user-astronaut', 'fa-rocket', 'fa-satellite',
  'fa-radiation', 'fa-city', 'fa-building', 'fa-school', 'fa-torii-gate', 'fa-mountain-sun', 'fa-tree', 'fa-water',
  'fa-sun-plant-wilt', 'fa-music', 'fa-compact-disc', 'fa-headphones', 'fa-guitar', 'fa-drum', 'fa-radio', 'fa-film',
  'fa-gamepad', 'fa-masks-theater', 'fa-person-running', 'fa-people-group', 'fa-explosion', 'fa-burst', 'fa-gun',
  'fa-door-open', 'fa-bell', 'fa-car-side', 'fa-train', 'fa-plane', 'fa-helicopter', 'fa-shoe-prints', 'fa-wave-square',
  'fa-earth-europe', 'fa-star', 'fa-gem', 'fa-shield-halved', 'fa-user-secret', 'fa-eye', 'fa-heart'];

/* ---------- utilitaires ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const EMOJI = /[\p{Extended_Pictographic}\u{1F7E0}-\u{1F7EB}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D]/gu;
/* cache d'un passage de rendu : réglage « émojis » lu une fois, totaux / statistiques calculés une seule fois par playlist ou piste */
let _pass = null;
function inPass(fn) { if (_pass) return fn(); _pass = { strip: game.settings.get(ID, 'stripEmoji'), tl: new Map(), pt: new Map(), ps: new Map(), pf: null }; try { return fn(); } finally { _pass = null; } }
const memo = (m, k, f) => { let v = m.get(k); if (v === undefined) m.set(k, v = f()); return v; };
const clean = s => ((_pass ? _pass.strip : game.settings.get(ID, 'stripEmoji')) ? String(s ?? '').replace(EMOJI, '').replace(/\s{2,}/g, ' ').trim() : String(s ?? ''));
const iconCls = ic => (/\bfa-(solid|regular|light|thin|duotone|brands|sharp)\b/.test(ic) ? ic : `fa-solid ${ic}`);
const guessIcon = name => { const n = norm(name); for (const [re, ic] of ICONS) if (re.test(n)) return ic; return ''; };
const skey = (p, s) => `${p.id}.${s.id}`;
const fmtT = t => { t = Math.max(0, Math.floor(Number(t) || 0)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const isActiveGM = () => game.user.isGM && game.users.activeGM?.id === game.user.id;
const hexOf = c => { const s = String(c ?? ''); return /^#[0-9a-f]{6}$/i.test(s) ? s : (/^#[0-9a-f]{3}$/i.test(s) ? '#' + [...s.slice(1)].map(x => x + x).join('') : '#3b4266'); };
const colorOf = f => { const c = f?.color; return c ? (c.css ?? String(c)) : ''; };
const isPlaylistDir = app => (app?.documentName ?? app?.constructor?.documentName ?? app?.collection?.documentName) === 'Playlist';
const elOf = t => (t instanceof HTMLElement ? t : t?.[0] ?? t);

function topFolder(doc) { let c = doc?.folder; if (!c) return null; while (c.folder) c = c.folder; return c; }
function pathOf(doc) { const a = []; let c = doc?.folder; while (c) { a.unshift(clean(c.name)); c = c.folder; } return a.join(' › '); }
function inFolder(doc, f) { let c = doc?.folder; while (c) { if (c.id === f.id) return true; c = c.folder; } return false; }

/* ---------- données ---------- */
let _store = null, _votes = null;
function normalizeStore(s) { s = foundry.utils.deepClone(s || {}); for (const k of ['folders', 'playlists', 'sounds', 'stats', 'tags']) s[k] ??= {}; return s; }
const store = () => (_store ??= normalizeStore(game.settings.get(ID, 'store')));
const votes = () => (_votes ??= foundry.utils.deepClone(game.settings.get(ID, 'votes') || {}));
async function saveStore(mut) {
  return withLock(`set:${ID}.store`, async () => {
    const s = normalizeStore(game.settings.get(ID, 'store'));
    await mut(s); s.v = STORE_V;
    _store = s;
    await game.settings.set(ID, 'store', s);
  });
}
/* empreinte du réglage sans les statistiques d'écoute */
let _sig = null;
const storeSig = s => { const { stats, ...rest } = s || {}; try { return JSON.stringify(rest); } catch (e) { return ''; } };
const plRec = id => store().playlists[id] ?? {};
const sRec = key => store().sounds[key] ?? {};
const tagInfo = n => store().tags[n] ?? { group: 'Autre', color: '#8d99ae' };
const stat = key => store().stats[key] ?? { n: 0, last: 0 };

function implicitTags(p) {
  const t = []; const top = topFolder(p);
  if (top) t.push({ g: 'Catégorie', n: clean(top.name), color: colorOf(top) || '#8d99ae' });
  if (top && /licen/.test(norm(top.name))) t.push({ g: 'Licence', n: clean(p.name), color: '#c77dff' });
  return t;
}
function effTags(p, s) {
  const out = new Map();
  for (const t of implicitTags(p)) out.set(`${t.g}|${t.n}`, t);
  for (const n of [...(plRec(p.id).tags ?? []), ...(s ? sRec(skey(p, s)).tags ?? [] : [])]) {
    const i = tagInfo(n); out.set(`${i.group}|${n}`, { g: i.group, n, color: i.color });
  }
  return [...out.values()];
}
function tally(key) { return _pass ? memo(_pass.tl, key, () => tally0(key)) : tally0(key); }
function tally0(key) {
  const v = votes()[key] || {}; let up = 0, down = 0;
  for (const x of Object.values(v)) { if (x > 0) up++; else if (x < 0) down++; }
  return { up, down, score: up - down, mine: v[game.user.id] || 0 };
}
function plTally(p) { return _pass ? memo(_pass.pt, p.id, () => plTally0(p)) : plTally0(p); }
function plStat(p) { return _pass ? memo(_pass.ps, p.id, () => plStat0(p)) : plStat0(p); }
/* dossiers contenant une playlist en cours (calculé une fois par passage) */
function playingFolders() {
  const build = () => { const set = new Set(); for (const p of game.playlists.playing) { let c = p.folder; while (c) { set.add(c.id); c = c.folder; } } return set; };
  return _pass ? (_pass.pf ??= build()) : build();
}
function plTally0(p) { let up = 0, down = 0; for (const s of p.sounds) { const t = tally(skey(p, s)); up += t.up; down += t.down; } return { up, down, score: up - down }; }
function plStat0(p) { let n = 0, last = 0; for (const s of p.sounds) { const t = stat(skey(p, s)); n += t.n; last = Math.max(last, t.last); } return { n, last }; }

function visibleToPlayers(p) {
  if (plRec(p.id).hidePlayers) return false;
  const top = topFolder(p); const map = game.settings.get(ID, 'playerFolders') || {};
  const k = top ? top.id : '_root';
  if (k in map) return !!map[k];
  return !(top && /sfx|ambient|ambiance/.test(norm(top.name)));
}

/* ---------- habillage ---------- */
let _dc = new Map();
const DEF = { img: '', op: 45, x: 50, y: 50, angle: 110, icon: '', bgIcon: '', c1: '', c2: '', accent: '' };
function applyOwn(d, own) { for (const k of Object.keys(DEF)) if (own?.[k] !== undefined && own[k] !== '' && own[k] !== null) d[k] = own[k]; return d; }
function folderDecor(f, withOwn = true) {
  const ck = `f${f.id}${withOwn ? '' : '~'}`; if (_dc.has(ck)) return _dc.get(ck);
  const par = f.folder ? folderDecor(f.folder) : null;
  const c1 = colorOf(f) || par?.c1 || '#3b4266';
  const d = {
    img: par?.img ?? '', op: par?.op ?? 45, x: par?.x ?? 50, y: par?.y ?? 50, angle: par?.angle ?? 110,
    bgIcon: par?.bgIcon ?? '', c2: par?.c2 ?? '', icon: guessIcon(f.name) || par?.icon || 'fa-folder-open',
    c1, accent: colorOf(f) ? '' : (par?.accent ?? '')
  };
  if (withOwn) applyOwn(d, store().folders[f.id]);
  if (!d.bgIcon) d.bgIcon = d.icon;
  if (!d.accent) d.accent = d.c1;
  _dc.set(ck, d); return d;
}
function playlistDecor(p, withOwn = true) {
  const ck = `p${p.id}${withOwn ? '' : '~'}`; if (_dc.has(ck)) return _dc.get(ck);
  const par = p.folder ? folderDecor(p.folder) : { ...DEF, c1: '#3b4266', icon: 'fa-music', bgIcon: 'fa-music', accent: '#8d99ae' };
  const d = { ...par, icon: guessIcon(p.name) || par.icon };
  if (withOwn) applyOwn(d, plRec(p.id).decor);
  if (!d.accent) d.accent = d.c1;
  _dc.set(ck, d); return d;
}
const hasImg = d => d.img && d.img !== 'none';
function setVars(el, d) {
  el.style.setProperty('--sbm-c1', d.c1);
  el.style.setProperty('--sbm-c2', d.c2 || `color-mix(in srgb, ${d.c1} 18%, #090b14)`);
  el.style.setProperty('--sbm-ang', `${d.angle}deg`);
  el.style.setProperty('--sbm-accent', d.accent);
  el.style.setProperty('--sbm-op', String(d.op / 100));
  el.style.setProperty('--sbm-pos', `${d.x}% ${d.y}%`);
  lzSet(el, '--sbm-img', hasImg(d) ? String(d.img) : '');   /* chargée seulement quand la carte est visible */
}
const varsAttr = d => {
  const parts = [`--sbm-c1:${d.c1}`, `--sbm-c2:${d.c2 || `color-mix(in srgb, ${d.c1} 18%, #090b14)`}`, `--sbm-ang:${d.angle}deg`,
    `--sbm-accent:${d.accent}`, `--sbm-op:${d.op / 100}`, `--sbm-pos:${d.x}% ${d.y}%`];
  return parts.join(';');
};
const layersHTML = d => `${hasImg(d) ? '<span class="sbm-bg sbm-x"></span>' : ''}<span class="sbm-wm sbm-x ${iconCls(d.bgIcon)}"></span>`;
const EQ = '<span class="sbm-eq"><i></i><i></i><i></i></span>';   /* animé : seulement sur la piste en cours et le lecteur */
const EQS = '<span class="sbm-eqs fa-solid fa-volume-high"></span>';   /* fixe : dossiers et playlists qui contiennent la lecture */
function mk(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function btn(cls, icon, tip, fn) {
  const b = mk(`<a class="sbm-b sbm-x ${cls}" role="button" data-tooltip="${esc(tip)}"><i class="${icon}"></i></a>`);
  b.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); fn(ev); });
  b.addEventListener('dblclick', ev => ev.stopPropagation());
  return b;
}

/* ---------- état de l'interface (MJ) ---------- */
const F = { text: '', tags: new Set(), mode: '', favTop: '', drawer: false, open: new Set(['Mood', 'Univers']) };
let selectMode = false; const SEL = new Set(); let anchor = null;

function dirApps() {
  const out = new Set(); if (ui.playlists?.rendered) out.add(ui.playlists);
  for (const app of foundry.applications.instances?.values?.() ?? []) if (isPlaylistDir(app) && app.rendered) out.add(app);
  return [...out];
}
function refreshAll() { _dc = new Map(); inPass(() => { for (const app of dirApps()) enhance(app, app.element); NP.render(); }); }
/* stats seules changées (tri « récents » / « plus joués ») : on ne refait que l'ordre */
function reorderAll() { inPass(() => { for (const app of dirApps()) { const root = app.element; const list = root?.querySelector?.(':scope > .directory-list'); if (!list) continue; saveScroll(root); orderAll(list); restoreScroll(root); } }); }

/* ---------- position de défilement ----------
 * Foundry v13 redessine la liste à chaque lecture : la position est notée avant le rendu (hook preRender
 * + écoute du défilement en secours) puis remise après l'habillage, et encore à l'image suivante. */
const SCR = new WeakMap(); const SCR_SEL = [':scope > .directory-list', ':scope > .sbm-view'];
function scrollSt(root) { let o = SCR.get(root); if (!o) SCR.set(root, o = { pos: [null, null], hold: 0, w: false }); return o; }
const scrollHeld = o => o.hold && Date.now() - o.hold < 1500;
function saveScroll(root) { const o = scrollSt(root); SCR_SEL.forEach((sel, i) => { const e = root.querySelector(sel); if (e) o.pos[i] = e.scrollTop; }); }
function watchScroll(root) {
  const o = scrollSt(root); if (o.w) return; o.w = true;
  root.addEventListener('scroll', ev => { if (scrollHeld(o)) return; const t = ev.target; if (t?.parentElement !== root) return;
    const i = t.classList.contains('directory-list') ? 0 : t.classList.contains('sbm-view') ? 1 : -1; if (i > -1) o.pos[i] = t.scrollTop; }, { capture: true, passive: true });
}
function restoreScroll(root) {
  const o = SCR.get(root); if (!o) return;
  const go = () => SCR_SEL.forEach((sel, i) => { const e = root.querySelector(sel); const v = o.pos[i]; if (e && v != null && Math.abs(e.scrollTop - v) > 1) e.scrollTop = v; });
  go(); requestAnimationFrame(() => { go(); o.hold = 0; });
}

/* ---------- onglet Playlists ---------- */
/* fromRender : appelé par le hook de rendu (la position a été notée avant) ; options.parts sans « directory » → la liste n'a pas été redessinée */
function enhance(app, root, options, fromRender = false) {
  if (!root) return;
  if (!game.settings.get(ID, 'enabled')) { root.classList.remove('sbm'); return; }
  const so = scrollSt(root); watchScroll(root);
  if (fromRender) so.hold ||= Date.now(); else saveScroll(root);
  inPass(() => {
    root.classList.add('sbm');
    root.classList.toggle('sbm-gm', game.user.isGM);
    root.classList.toggle('sbm-select', selectMode && game.user.isGM);
    if (game.user.isGM) ensureBar(root);
    const list = root.querySelector(':scope > .directory-list'); const parts = options?.parts;
    const keep = list?.dataset.sbmDone && Array.isArray(parts) && parts.length && !parts.includes('directory');
    if (!keep) decorateTree(root);
    decoratePlaying(root);
    if (game.user.isGM) { renderView(root); ensureSelBar(root); }
  });
  restoreScroll(root);
}

function decorateTree(root) {
  const list = root.querySelector(':scope > .directory-list'); if (!list) return;
  list.querySelectorAll('.sbm-x').forEach(e => e.remove());
  const gm = game.user.isGM; const pf = playingFolders();
  for (const li of list.querySelectorAll('li.folder')) {
    const f = game.folders.get(li.dataset.folderId); const h = li.querySelector(':scope > header'); if (!f || !h) continue;
    const d = folderDecor(f); h.classList.add('sbm-card', 'sbm-fcard'); setVars(h, d);
    li.dataset.sbmSel = `folder:${f.id}`; li.classList.toggle('sbm-sel', SEL.has(li.dataset.sbmSel));
    h.insertAdjacentHTML('afterbegin', layersHTML(d));
    const nm = h.querySelector('.folder-name');
    if (nm) {
      nm.textContent = clean(nm.textContent);
      nm.before(mk(`<span class="sbm-ic sbm-x ${iconCls(d.icon)}"></span>`));
      const count = (f.contents?.length ?? 0) + (f.getSubfolders?.(true) ?? []).reduce((a, c) => a + (c.contents?.length ?? 0), 0);
      nm.after(mk(`<span class="sbm-meta sbm-x">${pf.has(f.id) ? EQS : ''}<b>${count}</b></span>`));
    }
    if (gm) {
      h.prepend(selCheck(li.dataset.sbmSel, root));
      h.querySelector('.create-button')?.before(btn('sbm-tool', 'fa-solid fa-palette', 'Habillage', () => openDecor([{ k: 'folder', id: f.id }])));
    }
  }
  for (const li of list.querySelectorAll('li.playlist')) {
    const p = game.playlists.get(li.dataset.entryId); const h = li.querySelector(':scope > header'); if (!p || !h) continue;
    const d = playlistDecor(p); const rec = plRec(p.id);
    h.classList.add('sbm-card', 'sbm-pcard'); setVars(h, d); li.style.setProperty('--sbm-accent', d.accent);
    li.dataset.sbmSel = `playlist:${p.id}`; li.classList.toggle('sbm-sel', SEL.has(li.dataset.sbmSel));
    li.classList.toggle('sbm-fav', !!rec.fav);
    h.insertAdjacentHTML('afterbegin', layersHTML(d));
    const exp = h.querySelector(':scope > i.expand');
    const ic = mk(`<span class="sbm-ic sbm-x ${iconCls(d.icon)}"></span>`);
    exp ? exp.after(ic) : h.prepend(ic);
    const lab = h.querySelector('.playlist-name');
    if (lab) {
      const first = [...lab.childNodes].find(n => n.nodeType === 3);
      if (first) first.textContent = clean(first.textContent);
      const t = plTally(p); const tags = (rec.tags ?? []).slice(0, 5);
      lab.append(mk(`<small class="sbm-sub sbm-x">${p.playing ? EQS : ''}<span>${p.sounds.size} piste${p.sounds.size > 1 ? 's' : ''}</span>`
        + `${tags.map(n => `<i class="sbm-dot" style="--c:${esc(tagInfo(n).color)}" data-tooltip="${esc(n)}"></i>`).join('')}`
        + `${gm && rec.hidePlayers ? '<i class="fa-solid fa-eye-slash" data-tooltip="Caché aux joueurs"></i>' : ''}`
        + `${t.up || t.down ? `<span class="sbm-vt"><i class="fa-solid fa-thumbs-up"></i>${t.up}<i class="fa-solid fa-thumbs-down"></i>${t.down}</span>` : ''}</small>`));
    }
    if (gm) {
      h.prepend(selCheck(li.dataset.sbmSel, root));
      const ctl = h.querySelector('.playlist-controls') ?? h;
      ctl.prepend(btn('sbm-tool', 'fa-solid fa-palette', 'Habillage', () => openDecor([{ k: 'playlist', id: p.id }])));
      ctl.prepend(btn('sbm-tool', 'fa-solid fa-tags', 'Étiquettes', () => openTags([{ k: 'playlist', id: p.id }])));
      ctl.prepend(btn('sbm-selonly', 'fa-solid fa-list-check', 'Cocher toutes ses pistes', () => selectSounds(p)));
      ctl.prepend(btn(`sbm-star ${rec.fav ? 'on' : ''}`, `${rec.fav ? 'fa-solid' : 'fa-regular'} fa-star`, 'Favori', () => toggleFav([{ k: 'playlist', id: p.id }])));
    }
  }
  for (const li of list.querySelectorAll('.playlist-sounds > li.sound')) decorSound(li, root, gm);
  orderAll(list); list.dataset.sbmDone = '1';
}

function decorSound(li, root, gm) {
  const p = game.playlists.get(li.dataset.playlistId); const s = p?.sounds.get(li.dataset.soundId);
  const h = li.querySelector(':scope > header'); if (!s || !h) return;
  const key = skey(p, s); const rec = sRec(key);
  li.dataset.sbmSel = `sound:${key}`; li.classList.toggle('sbm-sel', SEL.has(li.dataset.sbmSel));
  li.classList.toggle('sbm-fav', !!rec.fav); li.classList.add('sbm-s');
  const lab = h.querySelector('label'); if (lab) lab.textContent = clean(lab.textContent);
  li.classList.toggle('sbm-on', !!s.playing); li.classList.toggle('sbm-loop', !!s.repeat);
  if (s.playing) lab?.before(mk(`<span class="sbm-x sbm-seq">${EQ}</span>`));
  const t = tally(key);
  const extra = `${(rec.tags ?? []).slice(0, 4).map(n => `<i class="sbm-dot" style="--c:${esc(tagInfo(n).color)}" data-tooltip="${esc(n)}"></i>`).join('')}`
    + `${t.up || t.down ? `<span class="sbm-vt"><i class="fa-solid fa-thumbs-up"></i>${t.up}<i class="fa-solid fa-thumbs-down"></i>${t.down}</span>` : ''}`;
  if (extra) lab?.after(mk(`<span class="sbm-marks sbm-x">${extra}</span>`));
  if (gm) {
    lab?.before(btn(`sbm-star ${rec.fav ? 'on' : ''}`, `${rec.fav ? 'fa-solid' : 'fa-regular'} fa-star`, 'Favori', () => toggleFav([{ k: 'sound', id: key }])));
    h.prepend(selCheck(li.dataset.sbmSel, root));
    h.querySelector('.sound-controls')?.prepend(btn('sbm-tool', 'fa-solid fa-tags', 'Étiquettes', () => openTags([{ k: 'sound', id: key }])));
  }
}

function decoratePlaying(root) {
  const cp = root.querySelector(':scope > .currently-playing'); if (!cp) return;
  cp.querySelectorAll('.sbm-x').forEach(e => e.remove());
  for (const li of cp.querySelectorAll('li.sound')) {
    const p = game.playlists.get(li.dataset.playlistId); if (!p) continue;
    const d = playlistDecor(p); li.classList.add('sbm-card', 'sbm-cp'); setVars(li, d);
    li.insertAdjacentHTML('afterbegin', layersHTML(d));
    const ic = li.querySelector(':scope > header > i'); if (ic) ic.className = `sbm-cpic ${iconCls(d.icon)}`;
    const lab = li.querySelector(':scope > header > label');
    if (lab) { lab.textContent = clean(lab.textContent); lab.append(mk(`<small class="sbm-x sbm-cpl">${esc(clean(p.name))}</small>`)); }
  }
}

function orderAll(list) {
  const mode = game.settings.get(ID, 'sortMode'); const favFirst = game.settings.get(ID, 'favFirst');
  const cmp = (a, b) => (favFirst ? (b.fav - a.fav) : 0)
    || (mode === 'alpha' ? a.name.localeCompare(b.name, 'fr', { sensitivity: 'base', numeric: true }) : 0)
    || (mode === 'recent' ? b.last - a.last : 0) || (mode === 'played' ? b.n - a.n : 0)
    || (mode === 'votes' ? b.score - a.score : 0) || a.idx - b.idx;
  const ols = [list, ...list.querySelectorAll('ol.subdirectory, ol.playlist-sounds')];
  if (mode === 'core' && !favFirst) {   /* ordre Foundry : même résultat, sans aucun calcul */
    for (const ol of ols) { let fi = 0, k = 0; for (const li of ol.children) {
      if (li.classList.contains('folder')) li.style.order = String(fi++);
      else if (li.classList.contains('playlist') ? game.playlists.has(li.dataset.entryId) : (li.classList.contains('sound') && !!game.playlists.get(li.dataset.playlistId)?.sounds.get(li.dataset.soundId))) li.style.order = String(1000 + k++);
    } }
    return;
  }
  const byStat = mode === 'recent' || mode === 'played'; const Z = { n: 0, last: 0 };   /* seules les valeurs utiles au tri sont calculées */
  for (const ol of ols) {
    const items = [...ol.children]; let fi = 0; const ent = [];
    items.forEach((li, idx) => {
      if (li.classList.contains('folder')) { li.style.order = String(fi++); return; }
      if (li.classList.contains('playlist')) {
        const p = game.playlists.get(li.dataset.entryId); if (!p) return;
        const st = byStat ? plStat(p) : Z; ent.push({ li, idx, name: mode === 'alpha' ? clean(p.name) : '', fav: plRec(p.id).fav ? 1 : 0, last: st.last, n: st.n, score: mode === 'votes' ? plTally(p).score : 0 });
      } else if (li.classList.contains('sound')) {
        const p = game.playlists.get(li.dataset.playlistId); const s = p?.sounds.get(li.dataset.soundId); if (!s) return;
        const key = skey(p, s); const st = byStat ? stat(key) : Z;
        ent.push({ li, idx, name: mode === 'alpha' ? clean(s.name) : '', fav: sRec(key).fav ? 1 : 0, last: st.last, n: st.n, score: mode === 'votes' ? tally(key).score : 0 });
      }
    });
    ent.sort(cmp).forEach((e, i) => { e.li.style.order = String(1000 + i); });
  }
}

/* ---------- sélection ---------- */
function selCheck(id, root) {
  const c = mk(`<a class="sbm-check sbm-x" role="button" data-tooltip="Sélectionner (Maj = plage)"><i class="fa-solid fa-check"></i></a>`);
  c.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); toggleSel(id, ev.shiftKey, root); });
  return c;
}
function visibleEl(e) { const r = e.getBoundingClientRect(); return r.height > 0 && e.getClientRects().length > 0; }
function toggleSel(id, shift, root) {
  const kind = id.split(':')[0];
  if (shift && anchor && anchor.split(':')[0] === kind) {
    const els = [...root.querySelectorAll('[data-sbm-sel]')].filter(e => e.dataset.sbmSel.startsWith(kind + ':') && visibleEl(e))
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const ids = els.map(e => e.dataset.sbmSel); let i1 = ids.indexOf(anchor), i2 = ids.indexOf(id);
    if (i1 > -1 && i2 > -1) { if (i1 > i2) [i1, i2] = [i2, i1]; for (let i = i1; i <= i2; i++) SEL.add(ids[i]); }
    else SEL.add(id);
  } else if (SEL.has(id)) SEL.delete(id); else SEL.add(id);
  anchor = id; syncSel();
}
function syncSel() {
  for (const app of dirApps()) {
    const root = app.element;
    root.querySelectorAll('[data-sbm-sel]').forEach(e => e.classList.toggle('sbm-sel', SEL.has(e.dataset.sbmSel)));
    ensureSelBar(root);
  }
}
/* Tout : les pistes visibles (playlists dépliées ou vue filtrée) ; à défaut, les playlists visibles. */
function selectAllVisible(root) {
  const vis = k => [...root.querySelectorAll(`[data-sbm-sel^="${k}:"]`)].filter(visibleEl).map(e => e.dataset.sbmSel);
  const ids = vis('sound').length ? vis('sound') : vis('playlist');
  if (!ids.length) return ui.notifications.info('Rien de visible à sélectionner : déplie une playlist ou filtre d\'abord.');
  ids.forEach(id => SEL.add(id)); syncSel();
}
function selectSounds(p) { for (const s of p.sounds) SEL.add(`sound:${skey(p, s)}`); syncSel(); }
const selTargets = kinds => [...SEL].map(x => { const [k, ...r] = x.split(':'); return { k, id: r.join(':') }; }).filter(t => !kinds || kinds.includes(t.k));

function ensureSelBar(root) {
  let bar = root.querySelector(':scope > .sbm-selbar');
  if (!bar) {
    bar = mk(`<div class="sbm-selbar"><div class="sbm-selcount"></div><div class="sbm-selbtns">
      <a class="sbm-sb" data-a="tags"><i class="fa-solid fa-tags"></i>Étiquettes</a>
      <a class="sbm-sb" data-a="fav"><i class="fa-solid fa-star"></i>Favori</a>
      <a class="sbm-sb" data-a="unfav"><i class="fa-regular fa-star"></i>Retirer</a>
      <a class="sbm-sb" data-a="decor"><i class="fa-solid fa-palette"></i>Habillage</a>
      <a class="sbm-sb" data-a="hide"><i class="fa-solid fa-eye-slash"></i>Cacher</a>
      <a class="sbm-sb" data-a="show"><i class="fa-solid fa-eye"></i>Montrer</a>
      <a class="sbm-sb" data-a="fade"><i class="fa-solid fa-wave-square"></i>Fondu</a>
      <a class="sbm-sb" data-a="all"><i class="fa-solid fa-check-double"></i>Tout</a>
      <a class="sbm-sb" data-a="clear"><i class="fa-solid fa-eraser"></i>Vider</a>
      <a class="sbm-sb sbm-done" data-a="done"><i class="fa-solid fa-check"></i>Terminer</a></div></div>`);
    bar.addEventListener('click', ev => {
      const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return; ev.preventDefault();
      if (a === 'tags') { const t = selTargets(['sound', 'playlist']); if (t.length) openTags(t); }
      if (a === 'fav') { const t = selTargets(['sound', 'playlist']); if (t.length) toggleFav(t, true); }
      if (a === 'unfav') { const t = selTargets(['sound', 'playlist']); if (t.length) toggleFav(t, false); }
      if (a === 'decor') { const t = selTargets(['folder', 'playlist']); if (t.length) openDecor(t); }
      if (a === 'hide' || a === 'show') { const t = selTargets(['playlist']); if (t.length) setHidden(t, a === 'hide'); }
      if (a === 'fade') { const t = selTargets(['sound', 'playlist']); if (t.length) toggleFadeOn(t); }
      if (a === 'all') selectAllVisible(root);
      if (a === 'clear') { SEL.clear(); anchor = null; syncSel(); }
      if (a === 'done') { selectMode = false; SEL.clear(); anchor = null; refreshAll(); }
    });
    root.append(bar);
  }
  const by = k => selTargets([k]).length;
  const n = { folder: by('folder'), playlist: by('playlist'), sound: by('sound') };
  const parts = [n.folder && `${n.folder} dossier${n.folder > 1 ? 's' : ''}`, n.playlist && `${n.playlist} playlist${n.playlist > 1 ? 's' : ''}`, n.sound && `${n.sound} piste${n.sound > 1 ? 's' : ''}`].filter(Boolean);
  bar.querySelector('.sbm-selcount').textContent = parts.length ? parts.join(' · ') : 'Coche des dossiers, playlists ou pistes (Maj = plage)';
  const en = (a, ok) => bar.querySelector(`[data-a="${a}"]`).classList.toggle('off', !ok);
  en('tags', n.playlist + n.sound > 0); en('fav', n.playlist + n.sound > 0); en('unfav', n.playlist + n.sound > 0);
  en('decor', n.folder + n.playlist > 0); en('hide', n.playlist > 0); en('show', n.playlist > 0); en('clear', SEL.size > 0); en('fade', n.playlist + n.sound > 0);
}

/* ---------- barre d'outils + vues ---------- */
const SORTS = { core: 'Ordre Foundry', alpha: 'A → Z', recent: 'Joués récemment', played: 'Les plus joués', votes: 'Préférés des joueurs' };
function ensureBar(root) {
  let bar = root.querySelector(':scope > .sbm-bar');
  if (!game.settings.get(ID, 'tools')) { bar?.remove(); return; }   /* barre d'outils masquée par défaut : 1.6.0 */
  if (!bar) {
    bar = mk(`<div class="sbm-bar">
      <div class="sbm-r1"><label class="sbm-search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" placeholder="Pistes, playlists, étiquettes…" autocomplete="off" spellcheck="false"><a class="sbm-b sbm-clear" data-tooltip="Tout effacer"><i class="fa-solid fa-xmark"></i></a></label>
      <a class="sbm-ib" data-t="select" data-tooltip="Sélection simple / multiple"><i class="fa-solid fa-list-check"></i></a>
      <a class="sbm-ib" data-t="config" data-tooltip="Réglages"><i class="fa-solid fa-sliders"></i></a></div>
      <div class="sbm-r2"><a class="sbm-tb" data-t="fav"><i class="fa-solid fa-star"></i>Favoris</a>
      <a class="sbm-tb" data-t="tags"><i class="fa-solid fa-tags"></i>Étiquettes<b class="sbm-n"></b></a>
      <a class="sbm-tb" data-t="votes"><i class="fa-solid fa-thumbs-up"></i>Avis</a>
      <label class="sbm-sort" data-tooltip="Tri des playlists et des pistes"><i class="fa-solid fa-arrow-down-short-wide"></i><select>${Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label></div>
      <div class="sbm-drawer"></div></div>`);
    const input = bar.querySelector('input'); let deb;
    input.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(() => { F.text = input.value.trim(); renderViews(); }, 140); });
    input.addEventListener('keydown', ev => { if (ev.key === 'Escape') { input.value = ''; F.text = ''; renderViews(); } ev.stopPropagation(); });
    bar.querySelector('.sbm-clear').addEventListener('click', ev => { ev.preventDefault(); input.value = ''; F.text = ''; F.tags.clear(); F.mode = ''; F.favTop = ''; renderViews(); });
    bar.querySelector('select').addEventListener('change', ev => game.settings.set(ID, 'sortMode', ev.target.value));
    bar.addEventListener('click', ev => {
      const t = ev.target.closest('[data-t]')?.dataset.t; const chip = ev.target.closest('[data-chip]'); const grp = ev.target.closest('[data-grp]');
      if (chip) { ev.preventDefault(); const k = chip.dataset.chip; F.tags.has(k) ? F.tags.delete(k) : F.tags.add(k); renderViews(); return; }
      if (grp) { ev.preventDefault(); const g = grp.dataset.grp; F.open.has(g) ? F.open.delete(g) : F.open.add(g); renderViews(); return; }
      if (!t) return; ev.preventDefault();
      if (t === 'fav') { F.mode = F.mode === 'fav' ? '' : 'fav'; F.favTop = ''; }
      if (t === 'votes') F.mode = F.mode === 'votes' ? '' : 'votes';
      if (t === 'tags') F.drawer = !F.drawer;
      if (t === 'select') { selectMode = !selectMode; if (!selectMode) { SEL.clear(); anchor = null; } refreshAll(); return; }
      if (t === 'config') { openConfig(); return; }
      renderViews();
    });
    const head = root.querySelector(':scope > .directory-header');
    head ? head.after(bar) : root.prepend(bar);
  }
  const input = bar.querySelector('input'); if (document.activeElement !== input) input.value = F.text;
  bar.querySelector('select').value = game.settings.get(ID, 'sortMode');
  bar.querySelector('[data-t="fav"]').classList.toggle('on', F.mode === 'fav');
  bar.querySelector('[data-t="votes"]').classList.toggle('on', F.mode === 'votes');
  bar.querySelector('[data-t="tags"]').classList.toggle('on', F.drawer || F.tags.size > 0);
  bar.querySelector('[data-t="select"]').classList.toggle('on', selectMode);
  bar.querySelector('.sbm-n').textContent = F.tags.size ? String(F.tags.size) : '';
  bar.querySelector('.sbm-drawer').innerHTML = drawerHTML();
}

function allTagGroups() {
  const groups = new Map(); const add = (g, n, color) => { if (!groups.has(g)) groups.set(g, new Map()); groups.get(g).set(n, color); };
  for (const f of game.folders.filter(f => f.type === 'Playlist' && !f.folder)) add('Catégorie', clean(f.name), colorOf(f) || '#8d99ae');
  for (const [n, i] of Object.entries(store().tags)) add(i.group || 'Autre', n, i.color);
  for (const p of game.playlists) { const top = topFolder(p); if (top && /licen/.test(norm(top.name))) add('Licence', clean(p.name), '#c77dff'); }
  const order = ['Mood', 'Univers', 'Catégorie', 'Style', 'Licence', 'Autre'];
  return [...groups.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
}
function drawerHTML() {
  const chip = (g, n, c) => `<a class="sbm-chip ${F.tags.has(`${g}|${n}`) ? 'on' : ''}" data-chip="${esc(`${g}|${n}`)}" style="--c:${esc(c)}">${esc(n)}</a>`;
  if (!F.drawer) {
    if (!F.tags.size) return '';
    return `<div class="sbm-chips">${[...F.tags].map(k => { const [g, ...r] = k.split('|'); const n = r.join('|'); const c = g === 'Licence' ? '#c77dff' : (store().tags[n]?.color ?? '#8d99ae'); return chip(g, n, c); }).join('')}</div>`;
  }
  return allTagGroups().map(([g, m]) => {
    const act = [...m.keys()].filter(n => F.tags.has(`${g}|${n}`)).length; const open = F.open.has(g);
    return `<div class="sbm-grp"><a class="sbm-gh" data-grp="${esc(g)}"><i class="fa-solid fa-angle-${open ? 'down' : 'right'}"></i>${esc(g)}<span>${m.size}${act ? ` · ${act} actif${act > 1 ? 's' : ''}` : ''}</span></a>`
      + `${open ? `<div class="sbm-chips">${[...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr')).map(([n, c]) => chip(g, n, c)).join('')}</div>` : ''}</div>`;
  }).join('');
}

function renderViews() { inPass(() => { for (const app of dirApps()) { if (game.user.isGM) { ensureBar(app.element); renderView(app.element); } } }); }

function matchSound(p, s, tagsByGroup, q) {
  if (tagsByGroup.size) {
    const eff = effTags(p, s);
    for (const [g, names] of tagsByGroup) if (!eff.some(t => t.g === g && names.has(t.n))) return false;
  }
  if (q) {
    const hay = norm([s.name, p.name, pathOf(p), ...effTags(p, s).map(t => t.n)].join(' '));
    if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
  }
  return true;
}

function renderView(root) {
  const active = !!(F.text || F.tags.size || F.mode);
  root.classList.toggle('sbm-viewing', active);
  let view = root.querySelector(':scope > .sbm-view');
  if (!active) { if (view) view.innerHTML = ''; return; }
  if (!view) { view = mk('<div class="sbm-view"></div>'); wireView(view, root); }
  const list = root.querySelector(':scope > .directory-list');
  if (list && view.nextElementSibling !== list) list.before(view); else if (!list && !view.isConnected) root.append(view);

  const tagsByGroup = new Map();
  for (const k of F.tags) { const [g, ...r] = k.split('|'); if (!tagsByGroup.has(g)) tagsByGroup.set(g, new Set()); tagsByGroup.get(g).add(r.join('|')); }
  const q = norm(F.text);
  const groups = new Map(); let rows = 0; const LIMIT = 400;
  const plays = [...game.playlists].sort((a, b) => (pathOf(a) + ' ' + a.name).localeCompare(pathOf(b) + ' ' + b.name, 'fr', { numeric: true }));
  let head = '';
  if (F.mode === 'votes') {
    const all = [];
    for (const p of plays) for (const s of p.sounds) { const t = tally(skey(p, s)); if ((t.up || t.down) && matchSound(p, s, tagsByGroup, q)) all.push({ p, s, t }); }
    all.sort((a, b) => b.t.score - a.t.score || b.t.up - a.t.up);
    head = `<div class="sbm-vhead"><i class="fa-solid fa-thumbs-up"></i>Avis des joueurs · ${all.length} piste${all.length > 1 ? 's' : ''} notée${all.length > 1 ? 's' : ''}</div>`;
    view.innerHTML = head + (all.length ? `<ol class="sbm-flat">${all.slice(0, LIMIT).map(r => rowHTML(r.p, r.s, true)).join('')}</ol>` : '<p class="sbm-empty">Aucun vote pour l\'instant.</p>');
    return;
  }
  const favTops = new Map();
  for (const p of plays) {
    const pr = plRec(p.id); const top = topFolder(p);
    if (F.mode === 'fav') {
      const favS = [...p.sounds].filter(s => sRec(skey(p, s)).fav);
      if (!pr.fav && !favS.length) continue;
      if (top) favTops.set(top.id, top); else favTops.set('_root', null);
      if (F.favTop && (top?.id ?? '_root') !== F.favTop) continue;
      const ss = favS.filter(s => matchSound(p, s, tagsByGroup, q));
      if (!ss.length && (q || tagsByGroup.size) && !(pr.fav && matchSound(p, null, new Map(), q))) continue;
      groups.set(p.id, { p, ss: ss.slice(0, Math.max(0, LIMIT - rows)) }); rows += ss.length;
    } else {
      const ss = [...p.sounds].filter(s => matchSound(p, s, tagsByGroup, q));
      if (!ss.length) continue;
      groups.set(p.id, { p, ss: ss.slice(0, Math.max(0, LIMIT - rows)) }); rows += ss.length;
    }
  }
  const nS = [...groups.values()].reduce((a, g) => a + g.ss.length, 0);
  if (F.mode === 'fav') {
    const tops = [...favTops.entries()];
    head = `<div class="sbm-vhead"><i class="fa-solid fa-star"></i>Favoris · ${groups.size} playlist${groups.size > 1 ? 's' : ''} · ${nS} piste${nS > 1 ? 's' : ''}</div>`
      + `<div class="sbm-chips sbm-favtops"><a class="sbm-chip ${F.favTop ? '' : 'on'}" data-favtop="" style="--c:#ffd166">Tous</a>`
      + tops.map(([id, f]) => `<a class="sbm-chip ${F.favTop === id ? 'on' : ''}" data-favtop="${id}" style="--c:${esc(f ? colorOf(f) || '#8d99ae' : '#8d99ae')}">${esc(f ? clean(f.name) : 'Sans dossier')}</a>`).join('') + '</div>';
  } else {
    head = `<div class="sbm-vhead"><i class="fa-solid fa-filter"></i>${nS} piste${nS > 1 ? 's' : ''} dans ${groups.size} playlist${groups.size > 1 ? 's' : ''}${rows > LIMIT ? ` (affichage limité à ${LIMIT})` : ''}</div>`;
  }
  view.innerHTML = head + ([...groups.values()].map(g => groupHTML(g.p, g.ss)).join('') || '<p class="sbm-empty">Rien ne correspond.</p>');
}

function groupHTML(p, ss) {
  const d = playlistDecor(p); const pr = plRec(p.id); const id = `playlist:${p.id}`;
  return `<section class="sbm-grp-v" style="--sbm-accent:${d.accent}">
    <header class="sbm-card sbm-ghead ${SEL.has(id) ? 'sbm-sel' : ''}" data-sbm-sel="${id}" data-pid="${p.id}" style="${varsAttr(d)}"${hasImg(d) ? lzAttr('--sbm-img', String(d.img)) : ''}>${layersHTML(d)}
      <a class="sbm-check"><i class="fa-solid fa-check"></i></a><span class="sbm-ic ${iconCls(d.icon)}"></span>
      <span class="sbm-gname"><b>${esc(clean(p.name))}</b><small>${p.playing ? EQS : ''}${esc(pathOf(p))}</small></span>
      <a class="sbm-b sbm-selonly" data-act="psel" data-tooltip="Cocher toutes ses pistes"><i class="fa-solid fa-list-check"></i></a>
      <a class="sbm-b sbm-star ${pr.fav ? 'on' : ''}" data-act="pfav" data-tooltip="Favori"><i class="${pr.fav ? 'fa-solid' : 'fa-regular'} fa-star"></i></a>
      <a class="sbm-b" data-act="${p.playing ? 'pstop' : 'pplay'}" data-tooltip="${p.playing ? 'Arrêter la playlist' : 'Lancer la playlist'}"><i class="fa-solid fa-${p.playing ? 'square' : 'play'}"></i></a>
    </header>${ss.length ? `<ol>${ss.map(s => rowHTML(p, s)).join('')}</ol>` : ''}</section>`;
}
function rowHTML(p, s, showPl) {
  const key = skey(p, s); const r = sRec(key); const t = tally(key); const id = `sound:${key}`;
  const paused = !s.playing && s.pausedTime; const d = showPl ? playlistDecor(p) : null;
  return `<li class="sbm-srow ${s.playing ? 'is-playing' : ''} ${paused ? 'is-paused' : ''} ${SEL.has(id) ? 'sbm-sel' : ''}" data-sbm-sel="${id}" data-pid="${p.id}" data-sid="${s.id}"${d ? ` style="--sbm-accent:${d.accent}"` : ''}>
    <a class="sbm-check"><i class="fa-solid fa-check"></i></a>
    <a class="sbm-b sbm-star ${r.fav ? 'on' : ''}" data-act="sfav" data-tooltip="Favori"><i class="${r.fav ? 'fa-solid' : 'fa-regular'} fa-star"></i></a>
    <span class="sbm-sname">${s.playing ? EQ : ''}<span title="${esc(s.name)}">${esc(clean(s.name))}</span>${showPl ? `<small><i class="${iconCls(d.icon)}"></i>${esc(clean(p.name))}</small>` : ''}</span>
    <span class="sbm-marks">${(r.tags ?? []).slice(0, 4).map(n => `<i class="sbm-dot" style="--c:${esc(tagInfo(n).color)}" data-tooltip="${esc(n)}"></i>`).join('')}${t.up || t.down ? `<span class="sbm-vt"><i class="fa-solid fa-thumbs-up"></i>${t.up}<i class="fa-solid fa-thumbs-down"></i>${t.down}</span>` : ''}</span>
    <span class="sbm-sctl">
      <a class="sbm-b" data-act="stags" data-tooltip="Étiquettes"><i class="fa-solid fa-tags"></i></a>
      <a class="sbm-b sbm-rep ${s.repeat ? 'on' : ''}" data-act="repeat" data-tooltip="${s.repeat ? 'En boucle (cliquer pour arrêter la boucle)' : 'Lecture unique (cliquer pour boucler)'}"><i class="fa-solid fa-rotate"></i></a>
      ${s.playing ? '<a class="sbm-b" data-act="pause" data-tooltip="Pause"><i class="fa-solid fa-pause"></i></a>' : `<a class="sbm-b sbm-play" data-act="play" data-tooltip="${paused ? 'Reprendre' : 'Lancer'}"><i class="fa-solid fa-play"></i></a>`}
      ${s.playing || paused ? '<a class="sbm-b" data-act="stop" data-tooltip="Arrêter"><i class="fa-solid fa-square"></i></a>' : ''}
    </span></li>`;
}
function wireView(view, root) {
  view.addEventListener('click', async ev => {
    const fav = ev.target.closest('[data-favtop]');
    if (fav) { ev.preventDefault(); F.favTop = fav.dataset.favtop; renderViews(); return; }
    const host = ev.target.closest('[data-sbm-sel]'); if (!host) return;
    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (act === 'psel') { ev.preventDefault(); const pp = game.playlists.get(host.dataset.pid); if (pp) selectSounds(pp); return; }
    if (selectMode && (!act || ev.target.closest('.sbm-check'))) { ev.preventDefault(); toggleSel(host.dataset.sbmSel, ev.shiftKey, root); return; }
    if (ev.target.closest('.sbm-check')) return;
    const p = game.playlists.get(host.dataset.pid); if (!p) return;
    const s = host.dataset.sid ? p.sounds.get(host.dataset.sid) : null;
    if (!act) return; ev.preventDefault();
    if (act === 'pfav') return toggleFav([{ k: 'playlist', id: p.id }]);
    if (act === 'pplay') return p.playAll();
    if (act === 'pstop') return p.stopAll();
    if (!s) return;
    if (act === 'sfav') return toggleFav([{ k: 'sound', id: skey(p, s) }]);
    if (act === 'stags') return openTags([{ k: 'sound', id: skey(p, s) }]);
    if (act === 'play') return p.playSound(s);
    if (act === 'pause') return s.update({ playing: false, pausedTime: s.sound?.currentTime ?? 0 });
    if (act === 'stop') return p.stopSound(s);
    if (act === 'repeat') return s.update({ repeat: !s.repeat });
  });
}

/* ---------- actions ---------- */
async function toggleFav(targets, force) {
  await saveStore(st => {
    const first = targets[0]; const cur = first.k === 'playlist' ? !!st.playlists[first.id]?.fav : !!st.sounds[first.id]?.fav;
    const val = force ?? !cur;
    for (const t of targets) {
      const bag = t.k === 'playlist' ? st.playlists : st.sounds;
      bag[t.id] = { ...(bag[t.id] ?? {}), fav: val }; if (!val) delete bag[t.id].fav;
    }
  });
}
async function setHidden(targets, val) {
  await saveStore(st => { for (const t of targets) { st.playlists[t.id] = { ...(st.playlists[t.id] ?? {}), hidePlayers: val }; if (!val) delete st.playlists[t.id].hidePlayers; } });
  ui.notifications.info(`${targets.length} playlist${targets.length > 1 ? 's' : ''} ${val ? 'cachée(s)' : 'visible(s)'} dans le lecteur des joueurs.`);
}
function dialogEl(a) { return a instanceof HTMLElement ? a : (a?.element ?? elOf(a)); }

/* ---------- habillage : fenêtre ---------- */
async function openDecor(targets) {
  if (!targets.length) return;
  _dc = new Map();
  const t0 = targets[0]; const isF = t0.k === 'folder';
  const doc = isF ? game.folders.get(t0.id) : game.playlists.get(t0.id); if (!doc) return;
  const base = isF ? folderDecor(doc, false) : playlistDecor(doc, false);
  const own = (isF ? store().folders[t0.id] : plRec(t0.id).decor) ?? {};
  const cur = { ...base }; applyOwn(cur, own); if (!cur.bgIcon) cur.bgIcon = cur.icon; if (!cur.accent) cur.accent = cur.c1;
  const autoCol = !own.c1 && !own.c2 && !own.accent;
  const title = targets.length > 1 ? `${targets.length} éléments` : clean(doc.name);
  const content = `<div class="sbm-panel sbm-decor">
    <div class="sbm-prev-wrap"><div class="sbm-card ${isF ? 'sbm-fprev' : 'sbm-pprev'} sbm-prev"><span class="sbm-bg"></span><span class="sbm-wm"></span><span class="sbm-ic"></span><span class="sbm-pn"><b>${esc(title)}</b><small>${isF ? 'Dossier' : 'Playlist'}</small></span></div></div>
    <fieldset><legend>Image</legend>
      <div class="sbm-frow"><input type="text" name="img" value="${esc(own.img && own.img !== 'none' ? own.img : '')}" placeholder="${esc(hasImg(base) ? 'Héritée : ' + base.img.split('/').pop() : 'Aucune (héritée du dossier si définie)')}"><a class="sbm-btn" data-pick="img"><i class="fa-solid fa-folder-open"></i></a></div>
      <label class="sbm-cb"><input type="checkbox" name="noimg" ${own.img === 'none' ? 'checked' : ''}> Aucune image (ne pas hériter)</label>
      <div class="sbm-grid3"><label>Opacité <b data-out="op"></b><input type="range" name="op" min="30" max="60" step="1" value="${Math.min(60, Math.max(30, cur.op))}"></label>
      <label>Cadrage X <b data-out="x"></b><input type="range" name="x" min="0" max="100" value="${cur.x}"></label>
      <label>Cadrage Y <b data-out="y"></b><input type="range" name="y" min="0" max="100" value="${cur.y}"></label></div>
    </fieldset>
    <fieldset><legend>Icônes</legend>
      <div class="sbm-grid2"><label>Icône à gauche<input type="text" name="icon" value="${esc(own.icon ?? '')}" placeholder="auto : ${esc(base.icon)}"></label>
      <label>Icône de fond<input type="text" name="bgIcon" value="${esc(own.bgIcon ?? '')}" placeholder="auto : ${esc(base.bgIcon || base.icon)}"></label></div>
      <div class="sbm-target">Clic dans la grille → <label><input type="radio" name="tgt" value="icon" checked> icône à gauche</label><label><input type="radio" name="tgt" value="bgIcon"> icône de fond</label></div>
      <div class="sbm-icons">${ICON_PICK.map(i => `<a data-ic="${i}" data-tooltip="${i.slice(3)}"><i class="fa-solid ${i}"></i></a>`).join('')}</div>
    </fieldset>
    <fieldset><legend>Dégradé</legend>
      <label class="sbm-cb"><input type="checkbox" name="auto" ${autoCol ? 'checked' : ''}> Couleurs automatiques (couleur du dossier Foundry)</label>
      <div class="sbm-grid3"><label>Début<input type="color" name="c1" value="${hexOf(cur.c1)}"></label>
      <label>Fin<input type="color" name="c2" value="${hexOf(cur.c2 || '#0b0d16')}"></label>
      <label>Liseré<input type="color" name="accent" value="${hexOf(cur.accent)}"></label></div>
      <label>Angle <b data-out="angle"></b><input type="range" name="angle" min="0" max="360" value="${cur.angle}"></label>
    </fieldset>
    ${targets.length > 1 ? `<p class="sbm-note">Appliqué à ${targets.length} éléments.</p>` : ''}</div>`;
  let el;
  const read = () => {
    const f = n => el.querySelector(`[name="${n}"]`);
    const o = {};
    if (f('noimg').checked) o.img = 'none'; else if (f('img').value.trim()) o.img = f('img').value.trim();
    for (const k of ['op', 'x', 'y', 'angle']) { const v = Number(f(k).value); if (v !== base[k]) o[k] = v; }
    if (f('icon').value.trim()) o.icon = f('icon').value.trim();
    if (f('bgIcon').value.trim()) o.bgIcon = f('bgIcon').value.trim();
    if (!f('auto').checked) { o.c1 = f('c1').value; o.c2 = f('c2').value; o.accent = f('accent').value; }
    return o;
  };
  const preview = () => {
    const o = read(); const d = { ...base }; applyOwn(d, o); if (!d.bgIcon) d.bgIcon = d.icon; if (!d.accent) d.accent = d.c1;
    const pv = el.querySelector('.sbm-prev'); setVars(pv, d);
    pv.querySelector('.sbm-bg').style.display = hasImg(d) ? '' : 'none';
    pv.querySelector('.sbm-wm').className = `sbm-wm ${iconCls(d.bgIcon)}`;
    pv.querySelector('.sbm-ic').className = `sbm-ic ${iconCls(d.icon)}`;
    for (const k of ['op', 'x', 'y', 'angle']) el.querySelector(`[data-out="${k}"]`).textContent = el.querySelector(`[name="${k}"]`).value + (k === 'angle' ? '°' : '%');
    for (const n of ['c1', 'c2', 'accent']) el.querySelector(`[name="${n}"]`).disabled = el.querySelector('[name="auto"]').checked;
  };
  const res = await foundry.applications.api.DialogV2.wait({
    window: { title: `Habillage · ${title}`, icon: 'fa-solid fa-palette' }, classes: ['sbm-dialog'], position: { width: 470 },
    content, rejectClose: false,
    buttons: [{ action: 'save', label: 'Enregistrer', icon: 'fa-solid fa-check', default: true, callback: () => ({ own: read() }) },
      { action: 'reset', label: 'Réinitialiser', icon: 'fa-solid fa-rotate-left' },
      { action: 'cancel', label: 'Annuler', icon: 'fa-solid fa-xmark' }],
    render: (event, dlg) => {
      el = dialogEl(dlg)?.querySelector?.('.sbm-decor') ?? dialogEl(event?.target ?? dlg);
      el.addEventListener('input', preview); el.addEventListener('change', preview);
      el.querySelector('[data-pick="img"]').addEventListener('click', ev => {
        ev.preventDefault(); const inp = el.querySelector('[name="img"]');
        const FP = foundry.applications.apps.FilePicker.implementation;
        new FP({ type: 'image', current: inp.value, callback: path => { inp.value = path; el.querySelector('[name="noimg"]').checked = false; preview(); } }).render(true);
      });
      el.querySelector('.sbm-icons').addEventListener('click', ev => {
        const a = ev.target.closest('[data-ic]'); if (!a) return; ev.preventDefault();
        const tgt = el.querySelector('[name="tgt"]:checked').value; el.querySelector(`[name="${tgt}"]`).value = a.dataset.ic; preview();
      });
      preview();
    }
  });
  if (!res || res === 'cancel') return;
  await saveStore(st => {
    for (const t of targets) {
      const own = res === 'reset' ? null : res.own;
      if (t.k === 'folder') { if (own && Object.keys(own).length) st.folders[t.id] = own; else delete st.folders[t.id]; }
      else { st.playlists[t.id] = { ...(st.playlists[t.id] ?? {}) }; if (own && Object.keys(own).length) st.playlists[t.id].decor = own; else delete st.playlists[t.id].decor; }
    }
  });
}

/* ---------- étiquettes : fenêtre ---------- */
async function openTags(targets) {
  if (!targets.length) return;
  const ownOf = t => (t.k === 'playlist' ? plRec(t.id).tags : sRec(t.id).tags) ?? [];
  const reg = foundry.utils.deepClone(store().tags);
  const state = new Map();
  for (const n of Object.keys(reg)) { const c = targets.filter(t => ownOf(t).includes(n)).length; state.set(n, c === 0 ? 'none' : c === targets.length ? 'all' : 'some'); }
  let inherited = '';
  if (targets.length === 1) {
    const t = targets[0]; const p = t.k === 'playlist' ? game.playlists.get(t.id) : game.playlists.get(t.id.split('.')[0]);
    if (p) { const inh = [...implicitTags(p), ...(t.k === 'sound' ? (plRec(p.id).tags ?? []).map(n => ({ g: tagInfo(n).group, n })) : [])]; if (inh.length) inherited = inh.map(x => `${x.g} : ${x.n}`).join(' · '); }
  }
  const label = targets.length === 1 ? (() => { const t = targets[0]; if (t.k === 'playlist') return clean(game.playlists.get(t.id)?.name); const [pid, sid] = t.id.split('.'); return clean(game.playlists.get(pid)?.sounds.get(sid)?.name); })() : `${targets.length} éléments`;
  let el;
  const draw = () => {
    const box = el.querySelector('.sbm-tagbox'); const by = new Map(GROUPS.map(g => [g, []]));
    for (const [n, i] of Object.entries(reg)) (by.get(i.group) ?? by.get('Autre')).push(n);
    box.innerHTML = [...by.entries()].filter(([, a]) => a.length).map(([g, a]) => `<div class="sbm-tg"><h4>${g}</h4><div class="sbm-chips">${a.sort((x, y) => x.localeCompare(y, 'fr')).map(n => `<a class="sbm-chip st-${state.get(n) ?? 'none'}" data-tag="${esc(n)}" style="--c:${esc(reg[n].color)}">${state.get(n) === 'some' ? '<i class="fa-solid fa-minus"></i>' : state.get(n) === 'all' ? '<i class="fa-solid fa-check"></i>' : ''}${esc(n)}</a>`).join('')}</div></div>`).join('');
  };
  const content = `<div class="sbm-panel sbm-tags">
    ${inherited ? `<p class="sbm-note"><i class="fa-solid fa-link"></i> Hérité automatiquement : ${esc(inherited)}</p>` : ''}
    <div class="sbm-tagbox"></div>
    <fieldset><legend>Nouvelle étiquette</legend><div class="sbm-frow"><input type="text" name="nn" placeholder="ex. Fantasy, Neige, Boss…"><select name="ng">${GROUPS.map(g => `<option>${g}</option>`).join('')}</select><input type="color" name="nc" value="#8d99ae"><a class="sbm-btn" data-add><i class="fa-solid fa-plus"></i></a></div></fieldset>
    <p class="sbm-note">Clic : ajouter / retirer. <i class="fa-solid fa-minus"></i> = présente sur une partie de la sélection seulement (inchangée si tu n'y touches pas).</p></div>`;
  const res = await foundry.applications.api.DialogV2.wait({
    window: { title: `Étiquettes · ${label}`, icon: 'fa-solid fa-tags' }, classes: ['sbm-dialog'], position: { width: 440 },
    content, rejectClose: false,
    buttons: [{ action: 'save', label: 'Enregistrer', icon: 'fa-solid fa-check', default: true, callback: () => 'save' },
      { action: 'cancel', label: 'Annuler', icon: 'fa-solid fa-xmark' }],
    render: (event, dlg) => {
      el = dialogEl(dlg)?.querySelector?.('.sbm-tags') ?? dialogEl(event?.target ?? dlg);
      draw();
      el.addEventListener('click', ev => {
        const c = ev.target.closest('[data-tag]');
        if (c) { ev.preventDefault(); const n = c.dataset.tag; state.set(n, state.get(n) === 'all' ? 'none' : 'all'); draw(); return; }
        if (ev.target.closest('[data-add]')) { ev.preventDefault(); add(); }
      });
      const add = () => {
        const n = el.querySelector('[name="nn"]').value.trim(); if (!n) return;
        if (!reg[n]) reg[n] = { group: el.querySelector('[name="ng"]').value, color: el.querySelector('[name="nc"]').value };
        state.set(n, 'all'); el.querySelector('[name="nn"]').value = ''; draw();
      };
      el.querySelector('[name="nn"]').addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); add(); } });
    }
  });
  if (res !== 'save') return;
  await saveStore(st => {
    st.tags = { ...st.tags, ...reg };
    for (const t of targets) {
      const bag = t.k === 'playlist' ? st.playlists : st.sounds; const rec = { ...(bag[t.id] ?? {}) }; const set = new Set(rec.tags ?? []);
      for (const [n, s] of state) { if (s === 'all') set.add(n); else if (s === 'none') set.delete(n); }
      rec.tags = [...set]; if (!rec.tags.length) delete rec.tags; bag[t.id] = rec;
    }
  });
}

/* ---------- réglages ---------- */
async function openConfig() {
  const tops = game.folders.filter(f => f.type === 'Playlist' && !f.folder).sort((a, b) => a.sort - b.sort);
  const map = game.settings.get(ID, 'playerFolders') || {};
  const visTop = f => { const k = f ? f.id : '_root'; return k in map ? !!map[k] : !(f && /sfx|ambient|ambiance/.test(norm(f.name))); };
  const hiddenN = Object.values(store().playlists).filter(r => r.hidePlayers).length;
  const reg = store().tags;
  const content = `<div class="sbm-panel sbm-config">
    <fieldset><legend>Lecteur des joueurs</legend>
      <label class="sbm-cb"><input type="checkbox" name="playerWidget" ${game.settings.get(ID, 'playerWidget') ? 'checked' : ''}> Afficher le lecteur « En écoute » chez les joueurs</label>
      <label class="sbm-cb"><input type="checkbox" name="showTotals" ${game.settings.get(ID, 'showTotals') ? 'checked' : ''}> Les joueurs voient le total des votes</label>
      <label class="sbm-cb"><input type="checkbox" name="maskTitles" ${game.settings.get(ID, 'playerTitles') === 'mask' ? 'checked' : ''}> Masquer le titre des pistes (seule la playlist s'affiche)</label>
      <p class="sbm-note">Dossiers dont la lecture apparaît chez les joueurs :</p>
      <div class="sbm-chips sbm-vis">${tops.map(f => `<label class="sbm-chip ${visTop(f) ? 'on' : ''}" style="--c:${esc(colorOf(f) || '#8d99ae')}"><input type="checkbox" name="vis-${f.id}" ${visTop(f) ? 'checked' : ''}>${esc(clean(f.name))}</label>`).join('')}<label class="sbm-chip ${visTop(null) ? 'on' : ''}" style="--c:#8d99ae"><input type="checkbox" name="vis-_root" ${visTop(null) ? 'checked' : ''}>Sans dossier</label></div>
      ${hiddenN ? `<p class="sbm-note">${hiddenN} playlist(s) cachée(s) individuellement. <label class="sbm-cb"><input type="checkbox" name="unhide"> Toutes les réafficher</label></p>` : ''}
    </fieldset>
    <fieldset><legend>Étiquettes</legend><div class="sbm-treg">${Object.entries(reg).sort((a, b) => GROUPS.indexOf(a[1].group) - GROUPS.indexOf(b[1].group) || a[0].localeCompare(b[0], 'fr')).map(([n, i], k) => `<div class="sbm-frow" data-old="${esc(n)}"><input type="text" name="tn-${k}" value="${esc(n)}"><select name="tg-${k}">${GROUPS.map(g => `<option ${g === i.group ? 'selected' : ''}>${g}</option>`).join('')}</select><input type="color" name="tc-${k}" value="${hexOf(i.color)}"><label class="sbm-del" data-tooltip="Supprimer partout"><input type="checkbox" name="td-${k}"><i class="fa-solid fa-trash"></i></label></div>`).join('')}</div></fieldset>
    <fieldset><legend>Pour toi (ce navigateur)</legend>
      <label class="sbm-cb"><input type="checkbox" name="tools" ${game.settings.get(ID, 'tools') ? 'checked' : ''}> Barre d'outils en haut de l'onglet (recherche, Favoris, Étiquettes, Avis, tri, sélection)</label>
      <label class="sbm-cb"><input type="checkbox" name="favFirst" ${game.settings.get(ID, 'favFirst') ? 'checked' : ''}> Favoris en tête de leur dossier / playlist</label>
      <label class="sbm-cb"><input type="checkbox" name="stripEmoji" ${game.settings.get(ID, 'stripEmoji') ? 'checked' : ''}> Masquer les émojis des noms (affichage seulement)</label>
      <label class="sbm-cb"><input type="checkbox" name="gmWidget" ${game.settings.get(ID, 'gmWidget') ? 'checked' : ''}> Voir aussi le lecteur joueurs (aperçu)</label>
    </fieldset>
    <fieldset><legend>Remise à zéro</legend>
      <label class="sbm-cb"><input type="checkbox" name="resetVotes"> Effacer tous les votes</label>
      <label class="sbm-cb"><input type="checkbox" name="resetStats"> Effacer les statistiques d'écoute (récents / plus joués)</label>
    </fieldset></div>`;
  let el;
  const res = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Sidebar Manhwa · Playlists', icon: 'fa-solid fa-sliders' }, classes: ['sbm-dialog'], position: { width: 480 },
    content, rejectClose: false,
    buttons: [{ action: 'save', label: 'Enregistrer', icon: 'fa-solid fa-check', default: true, callback: () => 'save' }, { action: 'cancel', label: 'Annuler', icon: 'fa-solid fa-xmark' }],
    render: (event, dlg) => {
      el = dialogEl(dlg)?.querySelector?.('.sbm-config') ?? dialogEl(event?.target ?? dlg);
      el.querySelectorAll('.sbm-vis input').forEach(i => i.addEventListener('change', () => i.closest('.sbm-chip').classList.toggle('on', i.checked)));
    }
  });
  if (res !== 'save') return;
  const v = n => el.querySelector(`[name="${n}"]`);
  const pf = {}; for (const f of tops) pf[f.id] = v(`vis-${f.id}`).checked; pf._root = v('vis-_root').checked;
  await game.settings.set(ID, 'playerFolders', pf);
  await game.settings.set(ID, 'playerWidget', v('playerWidget').checked);
  await game.settings.set(ID, 'showTotals', v('showTotals').checked);
  await game.settings.set(ID, 'playerTitles', v('maskTitles').checked ? 'mask' : 'show');
  await game.settings.set(ID, 'favFirst', v('favFirst').checked);
  if (game.settings.get(ID, 'tools') !== v('tools').checked) await game.settings.set(ID, 'tools', v('tools').checked);
  await game.settings.set(ID, 'gmWidget', v('gmWidget').checked);
  if (game.settings.get(ID, 'stripEmoji') !== v('stripEmoji').checked) await game.settings.set(ID, 'stripEmoji', v('stripEmoji').checked);
  if (v('resetVotes').checked) await game.settings.set(ID, 'votes', {});
  const rows = [...el.querySelectorAll('.sbm-treg [data-old]')].map((r, k) => ({ old: r.dataset.old, name: v(`tn-${k}`).value.trim(), group: v(`tg-${k}`).value, color: v(`tc-${k}`).value, del: v(`td-${k}`).checked }));
  await saveStore(st => {
    if (v('unhide')?.checked) for (const r of Object.values(st.playlists)) delete r.hidePlayers;
    if (v('resetStats').checked) st.stats = {};
    const ren = new Map(); const del = new Set(); const tags = {};
    for (const r of rows) { if (r.del || !r.name) { del.add(r.old); continue; } tags[r.name] = { group: r.group, color: r.color }; if (r.name !== r.old) ren.set(r.old, r.name); }
    st.tags = tags;
    const fix = rec => { if (!rec?.tags) return; rec.tags = [...new Set(rec.tags.filter(n => !del.has(n)).map(n => ren.get(n) ?? n))]; if (!rec.tags.length) delete rec.tags; };
    Object.values(st.playlists).forEach(fix); Object.values(st.sounds).forEach(fix);
    for (const k of [...F.tags]) { const [g, ...r] = k.split('|'); const n = r.join('|'); if (del.has(n)) F.tags.delete(k); else if (ren.has(n)) { F.tags.delete(k); F.tags.add(`${tags[ren.get(n)].group}|${ren.get(n)}`); } }
  });
  NP.rebuild();
}

/* ---------- votes & statistiques ---------- */
let voteQ = Promise.resolve();
function applyVote(key, user, val) {
  voteQ = voteQ.then(async () => {
    const v = foundry.utils.deepClone(game.settings.get(ID, 'votes') || {});
    v[key] ??= {}; if (val) v[key][user] = val; else delete v[key][user];
    if (!Object.keys(v[key]).length) delete v[key];
    await game.settings.set(ID, 'votes', v);
  }).catch(e => console.error(ID, e));
  return voteQ;
}
function castVote(key, val) {
  const nv = tally(key).mine === val ? 0 : val;
  if (!game.user.isGM && !game.users.activeGM) return ui.notifications.warn('Le MJ doit être connecté pour enregistrer ton vote.');   /* vérifié avant d'afficher le vote */
  const v = votes(); v[key] ??= {}; if (nv) v[key][game.user.id] = nv; else delete v[key][game.user.id];
  NP.render();
  if (game.user.isGM) return applyVote(key, game.user.id, nv);
  game.socket.emit(SOCKET, { t: 'vote', key, user: game.user.id, v: nv });
}
const pendingStats = new Map(); let statTimer = null;
function bumpStat(key) {
  pendingStats.set(key, (pendingStats.get(key) ?? 0) + 1);
  clearTimeout(statTimer);
  statTimer = setTimeout(() => {
    const batch = new Map(pendingStats); pendingStats.clear(); const now = Date.now();
    saveStore(st => { for (const [k, n] of batch) st.stats[k] = { n: (st.stats[k]?.n ?? 0) + n, last: now }; });
  }, 2500);
}

/* ---------- fondu (manuel) ----------
 * Depuis la 1.5.0 le module ne fait plus aucun fondu lui-même : ni allongement de PlaylistSound#fadeDuration,
 * ni fondu de boucle, ni écriture automatique à la création. Foundry gère seul ses fondus via le champ natif « fondu ».
 * Reste le bouton « Fondu » de la sélection, qui écrit ou efface ce champ natif sur les musiques choisies. */
async function toggleFadeOn(targets) {
  const sounds = [];
  for (const t of targets) {
    if (t.k === 'playlist') { const p = game.playlists.get(t.id); if (p) sounds.push(...p.sounds); }
    else { const [pid, sid] = t.id.split('.'); const snd = game.playlists.get(pid)?.sounds.get(sid); if (snd) sounds.push(snd); }
  }
  if (!sounds.length) return;
  const ms = Math.max(500, Math.round(Number(game.settings.get(ID, 'fadeDefault')) * 1000) || 2000);
  const on = !sounds.every(x => Number(x.fade) > 0);
  const byPl = new Map();
  for (const x of sounds) {
    const upd = { _id: x.id, fade: on ? Math.max(ms, Number(x.fade) || 0) : 0, [`flags.${ID}.-=fade`]: null };
    if (!byPl.has(x.parent)) byPl.set(x.parent, []); byPl.get(x.parent).push(upd);
  }
  for (const [p, ups] of byPl) await p.updateEmbeddedDocuments('PlaylistSound', ups);
  ui.notifications.info(`Fondu Foundry ${on ? `réglé à ${ms / 1000} s` : 'retiré'} sur ${sounds.length} musique${sounds.length > 1 ? 's' : ''}.`);
}

/* ---------- lecteur « En écoute » ---------- */
const NP = {
  el: null, timer: null, keys: '', lsPos: `${ID}.np-pos`, lsCol: `${ID}.np-col`, lsHist: `${ID}.np-hist`, showHist: false,
  enabled() { return game.user.isGM ? game.settings.get(ID, 'gmWidget') : game.settings.get(ID, 'playerWidget'); },
  rebuild() { this.el?.remove(); this.el = null; clearInterval(this.timer); this.timer = null; this.init(); },
  init() {
    if (!this.enabled() || this.el) return;
    this.el = mk('<section id="sbm-np" class="sbm-np"></section>'); document.body.append(this.el);
    let pos = null; try { pos = JSON.parse(localStorage.getItem(this.lsPos)); } catch (e) { /* rien */ }
    this.place(pos ?? { x: 16, y: Math.max(60, window.innerHeight - 420) });
    this.el.addEventListener('pointerdown', ev => this.drag(ev));
    this.el.addEventListener('click', ev => this.click(ev));
    this.el.addEventListener('input', ev => { if (ev.target.name === 'vol') game.settings.set('core', 'globalPlaylistVolume', Number(ev.target.value)); });
    this.render(); this.timer = setInterval(() => this.tick(), 1000);
  },
  place(p) { const w = this.el.offsetWidth || 290, h = this.el.offsetHeight || 80; this.el.style.left = `${Math.min(Math.max(0, p.x), window.innerWidth - w)}px`; this.el.style.top = `${Math.min(Math.max(0, p.y), window.innerHeight - Math.min(h, 120))}px`; },
  drag(ev) {
    if (!ev.target.closest('.sbm-nph') || ev.target.closest('a,button,input')) return;
    ev.preventDefault(); const r = this.el.getBoundingClientRect(); const dx = ev.clientX - r.left, dy = ev.clientY - r.top;
    const mv = e => this.place({ x: e.clientX - dx, y: e.clientY - dy });
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); localStorage.setItem(this.lsPos, JSON.stringify({ x: parseInt(this.el.style.left), y: parseInt(this.el.style.top) })); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  },
  tracks() {
    const out = [];
    for (const p of game.playlists) { if (!p.playing || !visibleToPlayers(p)) continue; for (const s of p.sounds) if (s.playing) out.push({ p, s }); }
    return out;
  },
  hist() { try { return JSON.parse(localStorage.getItem(this.lsHist)) || []; } catch (e) { return []; } },
  record(tr) {
    const h = this.hist().filter(x => !tr.some(t => x.key === skey(t.p, t.s)));
    for (const t of tr) h.unshift({ key: skey(t.p, t.s), at: Date.now() });
    localStorage.setItem(this.lsHist, JSON.stringify(h.slice(0, 12)));
  },
  click(ev) {
    const a = ev.target.closest('[data-np]'); if (!a) return; ev.preventDefault();
    const k = a.dataset.np;
    if (k === 'col') { localStorage.setItem(this.lsCol, localStorage.getItem(this.lsCol) === '1' ? '0' : '1'); this.render(); }
    if (k === 'hist') { this.showHist = !this.showHist; this.render(); }
    if (k === 'up' || k === 'down') castVote(a.closest('[data-key]').dataset.key, k === 'up' ? 1 : -1);
  },
  voteHTML(key) {
    const t = tally(key); const tot = game.user.isGM || game.settings.get(ID, 'showTotals');
    return `<span class="sbm-vote"><a data-np="up" class="${t.mine > 0 ? 'on' : ''}" data-tooltip="J'aime"><i class="fa-solid fa-thumbs-up"></i>${tot && t.up ? `<b>${t.up}</b>` : ''}</a><a data-np="down" class="${t.mine < 0 ? 'on' : ''}" data-tooltip="Pas pour moi"><i class="fa-solid fa-thumbs-down"></i>${tot && t.down ? `<b>${t.down}</b>` : ''}</a></span>`;
  },
  title(p, s) { return game.settings.get(ID, 'playerTitles') === 'mask' && !game.user.isGM ? clean(p.name) : clean(s.name); },
  render() { if (this.el) inPass(() => this._render()); },
  _render() {
    const tr = this.tracks(); const keys = tr.map(t => skey(t.p, t.s)).join(',');
    if (keys !== this.keys) { const prev = new Set(this.keys.split(',')); const fresh = tr.filter(t => !prev.has(skey(t.p, t.s))); if (fresh.length) this.record(fresh); this.keys = keys; }
    const col = localStorage.getItem(this.lsCol) === '1';
    this.el.classList.toggle('col', col); this.el.classList.toggle('idle', !tr.length);
    const head = `<header class="sbm-nph">${tr.length ? EQ : '<i class="fa-solid fa-volume-xmark"></i>'}<b>${tr.length ? 'En écoute' : 'Silence'}</b>${col && tr.length ? `<span class="sbm-npmini">${esc(this.title(tr[0].p, tr[0].s))}${tr.length > 1 ? ` +${tr.length - 1}` : ''}</span>` : ''}
      ${game.user.isGM ? '<span class="sbm-npgm">aperçu joueurs</span>' : ''}<a data-np="hist" class="${this.showHist ? 'on' : ''}" data-tooltip="Historique"><i class="fa-solid fa-clock-rotate-left"></i></a><a data-np="col" data-tooltip="${col ? 'Déplier' : 'Replier'}"><i class="fa-solid fa-${col ? 'up-right-and-down-left-from-center' : 'down-left-and-up-right-to-center'}"></i></a></header>`;
    if (col) { this.el.innerHTML = head; return; }
    const cards = tr.map(({ p, s }) => {
      const d = playlistDecor(p); const key = skey(p, s);
      return `<div class="sbm-card sbm-trk" data-key="${key}" style="${varsAttr(d)}"${hasImg(d) ? lzAttr('--sbm-img', String(d.img)) : ''}>${layersHTML(d)}
        <div class="sbm-cover"><i class="${iconCls(d.icon)}"></i></div>
        <div class="sbm-tm"><b title="${esc(this.title(p, s))}">${esc(this.title(p, s))}</b><small>${esc(clean(p.name))}</small>
        <div class="sbm-prog"><i></i></div><small class="sbm-time"></small></div>${this.voteHTML(key)}</div>`;
    }).join('');
    let hist = '';
    if (this.showHist) {
      const rows = this.hist().map(h => { const [pid, sid] = h.key.split('.'); const p = game.playlists.get(pid); const s = p?.sounds.get(sid); return p && s && visibleToPlayers(p) ? { p, s, key: h.key } : null; }).filter(Boolean);
      hist = `<div class="sbm-hist"><h5>Déjà entendu</h5>${rows.length ? rows.map(r => `<div class="sbm-hrow" data-key="${r.key}"><i class="${iconCls(playlistDecor(r.p).icon)}"></i><span><b>${esc(this.title(r.p, r.s))}</b><small>${esc(clean(r.p.name))}</small></span>${this.voteHTML(r.key)}</div>`).join('') : '<p>Rien encore.</p>'}</div>`;
    }
    const vol = game.settings.get('core', 'globalPlaylistVolume');
    this.el.innerHTML = head + `<div class="sbm-npbody">${cards || '<p class="sbm-npempty">Aucune musique en ce moment.</p>'}</div>${hist}
      <footer class="sbm-npf"><i class="fa-solid fa-volume-${vol > 0 ? 'high' : 'xmark'}"></i><input type="range" name="vol" min="0" max="1" step="0.01" value="${vol}" data-tooltip="Volume de la musique (pour toi)"></footer>`;
    this.tick();
  },
  tick() {
    if (!this.el) return;
    const tr = this.tracks(); const keys = tr.map(t => skey(t.p, t.s)).join(',');
    if (keys !== this.keys) return this.render();
    for (const { p, s } of tr) {
      const card = this.el.querySelector(`.sbm-trk[data-key="${skey(p, s)}"]`); if (!card) continue;
      const cur = s.sound?.currentTime ?? 0; const dur = s.sound?.duration ?? 0;
      card.querySelector('.sbm-prog i').style.width = dur ? `${Math.min(100, (cur / dur) * 100)}%` : '0%';
      card.querySelector('.sbm-time').textContent = dur ? `${fmtT(cur)} / ${fmtT(dur)}` : '';
    }
  }
};

/* ---------- branchements ---------- */
Hooks.once('init', () => {
  const reg = (k, o) => game.settings.register(ID, k, o);
  /* stats seules changées (≈ 2,5 s après chaque lecture) : pas de ré-habillage complet, juste l'ordre si le tri en dépend */
  const onStore = () => {
    const sig = storeSig(game.settings.get(ID, 'store')); const statsOnly = _sig !== null && sig === _sig; _sig = sig; _store = null;
    if (!statsOnly) return refreshAll();
    if (['recent', 'played'].includes(game.settings.get(ID, 'sortMode'))) reorderAll();
  };
  reg('store', { scope: 'world', config: false, type: Object, default: {}, onChange: onStore });
  reg('votes', { scope: 'world', config: false, type: Object, default: {}, onChange: () => { _votes = null; refreshAll(); } });
  reg('playerFolders', { scope: 'world', config: false, type: Object, default: {}, onChange: () => NP.render() });
  reg('playerWidget', { name: 'Lecteur « En écoute » pour les joueurs', hint: 'Fenêtre déplaçable : piste en cours, image de la playlist, progression, volume, votes.', scope: 'world', config: true, type: Boolean, default: false, onChange: () => NP.rebuild() });
  reg('playerTitles', { scope: 'world', config: false, type: String, default: 'show', onChange: () => NP.render() });
  reg('showTotals', { scope: 'world', config: false, type: Boolean, default: true, onChange: () => NP.render() });
  reg('enabled', { name: 'Habillage de l\'onglet Playlists', hint: 'Cartes, étiquettes, favoris et vues. Décocher rend l\'onglet d\'origine.', scope: 'client', config: true, type: Boolean, default: true, onChange: () => ui.playlists?.render() });
  reg('tools', { name: 'Playlists : barre d\'outils en haut de l\'onglet', hint: 'Recherche, Favoris, Étiquettes, Avis, tri, sélection multiple. Désactivée par défaut.', scope: 'client', config: true, type: Boolean, default: false, onChange: () => refreshAll() });
  game.settings.registerMenu(ID, 'plConfig', { name: 'Playlists : réglages', label: 'Réglages des playlists…', hint: 'Lecteur des joueurs, titres, totaux, emoji, fondu, barre d\'outils.', icon: 'fa-solid fa-music', restricted: true, type: class extends foundry.applications.api.ApplicationV2 { static DEFAULT_OPTIONS = { id: 'sbm-menu-shim' }; async render() { await openConfig(); return this; } async _renderHTML() { return ''; } _replaceHTML() {} } });
  reg('stripEmoji', { scope: 'client', config: false, type: Boolean, default: false, onChange: () => ui.playlists?.render() });
  reg('gmWidget', { scope: 'client', config: false, type: Boolean, default: false, onChange: () => NP.rebuild() });
  reg('sortMode', { scope: 'client', config: false, type: String, default: 'core', onChange: () => refreshAll() });
  reg('favFirst', { scope: 'client', config: false, type: Boolean, default: true, onChange: () => refreshAll() });
  reg('fadeDefault', { scope: 'world', config: false, type: Number, default: 2 });   /* durée posée par le bouton « Fondu » (champ natif) */
  /* 1.5.0 : plus aucun fondu automatique — Foundry gère seul les fondus (champ « fondu » natif des musiques). */
});

Hooks.once('ready', async () => {
  game.socket.on(SOCKET, msg => { if (msg?.t === 'vote' && isActiveGM() && game.users.get(msg.user)) applyVote(msg.key, msg.user, msg.v); });
  if (isActiveGM() && !game.settings.get(ID, 'store')?.v) await saveStore(st => { st.tags = { ...SEED_TAGS, ...st.tags }; });
  // 1.2.0 : lecteur masqué par défaut (appliqué une seule fois, ensuite ton choix est respecté)
  if (isActiveGM() && (game.settings.get(ID, 'store')?.mig ?? 0) < 120) {
    await game.settings.set(ID, 'playerWidget', false);
    await saveStore(st => { st.mig = 120; });
  }
  if (localStorage.getItem(`${ID}.mig`) !== '120') { localStorage.setItem(`${ID}.mig`, '120'); if (game.settings.get(ID, 'gmWidget')) await game.settings.set(ID, 'gmWidget', false); }
  _sig = storeSig(game.settings.get(ID, 'store'));
  NP.init();
  if (ui.playlists?.rendered) enhance(ui.playlists, ui.playlists.element);
});

Hooks.on('preRenderPlaylistDirectory', app => { try { const r = app.element; if (r instanceof HTMLElement) { saveScroll(r); scrollSt(r).hold = Date.now(); } } catch (e) { console.error(`${ID} |`, e); } });
Hooks.on('renderPlaylistDirectory', (app, html, context, options) => { try { enhance(app, elOf(html) ?? app.element, options, true); } catch (e) { console.error(`${ID} |`, e); } });
/* habillage en cache : vidé seulement quand un nom, un dossier, une couleur ou un tri change (pas à chaque lecture) */
const DECOR_KEYS = ['name', 'folder', 'color', 'sorting'];
Hooks.on('updateFolder', (f, ch) => { if (f.type === 'Playlist' && DECOR_KEYS.some(k => k in (ch ?? {}))) _dc = new Map(); });
for (const h of ['createFolder', 'deleteFolder']) Hooks.on(h, f => { if (f.type === 'Playlist') _dc = new Map(); });
Hooks.on('updatePlaylist', (p, ch) => { if (DECOR_KEYS.some(k => k in (ch ?? {}))) _dc = new Map(); });
/* 1.24 — cocher / décocher la boucle ne redessine plus tout l'onglet Playlists (c'était ~170 ms à chaque clic) :
 * Foundry redessine l'onglet juste après ce hook ; on saute ce rendu-là et on met seulement la ligne de la piste à jour. */
let LOOP_ONLY = false;
function patchLoop(s) {
  const on = !!s.repeat;
  for (const app of dirApps()) { const r = app.element; if (!r) continue;
    for (const li of r.querySelectorAll(`li.sound[data-sound-id="${s.id}"]`)) { li.classList.toggle('sbm-loop', on); li.querySelector('[data-action="soundRepeat"]')?.classList.toggle('inactive', !on); }
    for (const b of r.querySelectorAll(`.sbm-srow[data-sid="${s.id}"] .sbm-rep`)) { b.classList.toggle('on', on); b.dataset.tooltip = on ? 'En boucle (cliquer pour arrêter la boucle)' : 'Lecture unique (cliquer pour boucler)'; }
  }
}
Hooks.once('setup', () => {
  const PD = foundry.applications.sidebar?.tabs?.PlaylistDirectory; if (!PD) return; const orig = PD.prototype.render;
  PD.prototype.render = function (...a) { if (LOOP_ONLY && this.rendered) return Promise.resolve(this); return orig.apply(this, a); };
});
Hooks.on('updatePlaylistSound', (s, ch) => {
  const keys = Object.keys(ch ?? {}).filter(k => k !== '_id');
  if (keys.length === 1 && keys[0] === 'repeat') { LOOP_ONLY = true; setTimeout(() => { LOOP_ONLY = false; }, 0); patchLoop(s); }
  if (ch.playing === true && isActiveGM()) bumpStat(`${s.parent.id}.${s.id}`); NP.render();
});
for (const h of ['updatePlaylist', 'createPlaylistSound', 'deletePlaylistSound', 'deletePlaylist']) Hooks.on(h, () => NP.render());
Hooks.on('updateSetting', st => { if (st.key === 'core.globalPlaylistVolume') { const r = NP.el?.querySelector('[name="vol"]'); if (r && document.activeElement !== r) r.value = st.value; } });

Hooks.on('getFolderContextOptions', (app, opts) => {
  if (!isPlaylistDir(app)) return;
  opts.push({ name: 'Habillage', icon: '<i class="fa-solid fa-palette"></i>', condition: () => game.user.isGM,
    callback: t => { const id = elOf(t)?.closest('[data-folder-id]')?.dataset.folderId; if (id) openDecor([{ k: 'folder', id }]); } });
});
Hooks.on('getPlaylistContextOptions', (app, opts) => {
  const pid = t => elOf(t)?.closest('[data-entry-id]')?.dataset.entryId;
  opts.push(
    { name: 'Habillage', icon: '<i class="fa-solid fa-palette"></i>', condition: () => game.user.isGM, callback: t => openDecor([{ k: 'playlist', id: pid(t) }]) },
    { name: 'Étiquettes', icon: '<i class="fa-solid fa-tags"></i>', condition: () => game.user.isGM, callback: t => openTags([{ k: 'playlist', id: pid(t) }]) },
    { name: 'Favori (oui / non)', icon: '<i class="fa-solid fa-star"></i>', condition: () => game.user.isGM, callback: t => toggleFav([{ k: 'playlist', id: pid(t) }]) },
    { name: 'Cacher aux joueurs', icon: '<i class="fa-solid fa-eye-slash"></i>', condition: t => game.user.isGM && !plRec(pid(t)).hidePlayers, callback: t => setHidden([{ k: 'playlist', id: pid(t) }], true) },
    { name: 'Montrer aux joueurs', icon: '<i class="fa-solid fa-eye"></i>', condition: t => game.user.isGM && !!plRec(pid(t)).hidePlayers, callback: t => setHidden([{ k: 'playlist', id: pid(t) }], false) }
  );
});
Hooks.on('getPlaylistSoundContextOptions', (app, opts) => {
  const key = t => { const li = elOf(t)?.closest('[data-sound-id]'); return li ? `${li.dataset.playlistId}.${li.dataset.soundId}` : null; };
  opts.push(
    { name: 'Étiquettes', icon: '<i class="fa-solid fa-tags"></i>', condition: () => game.user.isGM, callback: t => openTags([{ k: 'sound', id: key(t) }]) },
    { name: 'Favori (oui / non)', icon: '<i class="fa-solid fa-star"></i>', condition: () => game.user.isGM, callback: t => toggleFav([{ k: 'sound', id: key(t) }]) }
  );
});

globalThis.SidebarManhwa = { store, votes, refresh: refreshAll, openConfig };

