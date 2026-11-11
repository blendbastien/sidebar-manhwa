/* Sidebar Manhwa — onglet Journal façon Roll20 (simple, rapide, une icône par type d'entrée),
 * même habillage pour les onglets Objets et Chat. Types d'entrées gérés par le MJ (nom, icône, couleur) ;
 * chaque entrée reçoit un type par clic droit → « Type… ». Aucun journal n'est modifié hors de ce drapeau. */
import { forgetThumb, bust } from './lazy.js';
const ID = 'sidebar-manhwa';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const mk = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const elOf = t => (t instanceof HTMLElement ? t : t?.[0] ?? t);
const G = k => game.settings.get(ID, k);
const dlgEl = (dlg, sel) => { const root = dlg?.element ?? elOf(dlg); return root?.querySelector?.(sel) ?? root; };

/* types par défaut (modifiables par le MJ) */
export const DEFAULT_KINDS = [
  { key: 'note', name: 'Note', icon: 'fa-file-lines', color: '#8d99ae' },
  { key: 'lieu', name: 'Lieu', icon: 'fa-location-dot', color: '#4cc9f0' },
  { key: 'pnj', name: 'Personnage', icon: 'fa-user', color: '#ffd166' },
  { key: 'quete', name: 'Quête', icon: 'fa-scroll', color: '#f4a261' },
  { key: 'objet', name: 'Objet', icon: 'fa-gem', color: '#c77dff' },
  { key: 'regle', name: 'Règle', icon: 'fa-book', color: '#80ed99' },
  { key: 'faction', name: 'Faction', icon: 'fa-flag', color: '#ef476f' },
  { key: 'secret', name: 'Secret MJ', icon: 'fa-user-secret', color: '#9d4edd' }
];
/* ---------- cadrage des vignettes (acteurs, objets, documents) : même réglage que sur la fiche ----------
 * Uniquement du CSS sur l'image déjà affichée : aucune image rechargée, aucun appel au serveur. */
export const POS_LIST = [["center", "Centre"], ["top", "Haut"], ["bottom", "Bas"], ["left", "Gauche"], ["right", "Droite"], ["topleft", "Haut gauche"], ["topright", "Haut droite"], ["bottomleft", "Bas gauche"], ["bottomright", "Bas droite"], ["contain", "Image entière"], ["zoom", "Zoom ×1,5 centre"], ["zoomtop", "Zoom ×1,5 haut"], ["zoombottom", "Zoom ×1,5 bas"], ["zoom2", "Zoom ×2 centre"], ["zoom2top", "Zoom ×2 haut"], ["zoom3top", "Zoom ×3 haut (visage)"]];
const POS_CSS = { center: ["cover", "center center", 1], top: ["cover", "center top", 1], bottom: ["cover", "center bottom", 1], left: ["cover", "left center", 1], right: ["cover", "right center", 1], topleft: ["cover", "left top", 1], topright: ["cover", "right top", 1], bottomleft: ["cover", "left bottom", 1], bottomright: ["cover", "right bottom", 1], contain: ["contain", "center center", 1], zoom: ["cover", "center center", 1.5], zoomtop: ["cover", "center 15%", 1.5], zoombottom: ["cover", "center 85%", 1.5], zoom2: ["cover", "center center", 2], zoom2top: ["cover", "center 12%", 2], zoom3top: ["cover", "center 10%", 3] };
export const framingOf = doc => { if (!doc) return "center"; if (doc.documentName === "JournalEntry") return doc.getFlag(ID, "thumbPos") || "center"; const f = globalThis.MANHWA?.framing; if (f) return f(doc); return doc.system?.portrait || doc.system?.imgPos || "center"; };
/** applique le cadrage à une vignette ; les zooms passent par un cadre qui coupe ce qui dépasse */
export function frameThumb(img, pos) {
  if (!img) return; const c = POS_CSS[pos] || POS_CSS.center; img.style.objectFit = c[0]; img.style.objectPosition = c[1]; img.classList.toggle("sbj-contain", c[0] === "contain");
  let wrap = img.parentElement?.classList.contains("sbj-frame") ? img.parentElement : null;
  if (c[2] !== 1) { if (!wrap) { wrap = document.createElement("span"); wrap.className = "sbj-frame"; img.replaceWith(wrap); wrap.append(img); } img.style.transform = `scale(${c[2]})`; img.style.transformOrigin = c[1]; }
  else { img.style.transform = ""; if (wrap) wrap.replaceWith(img); }
}
function frameAll(root, coll) { for (const li of root.querySelectorAll("li.directory-item.entry")) { const d = coll.get(li.dataset.entryId); const img = li.querySelector("img.thumbnail, img.sbj-thumb"); if (d && img) frameThumb(img, framingOf(d)); } }
/* mise à jour ciblée quand le cadrage change sur une fiche (sans redessiner la liste) */
function reframe(doc) { for (const li of document.querySelectorAll(`li.directory-item.entry[data-entry-id="${doc.id}"]`)) { const img = li.querySelector("img.thumbnail, img.sbj-thumb"); if (img) frameThumb(img, framingOf(doc)); } }
Hooks.on("updateActor", (d, ch) => { if (foundry.utils.hasProperty(ch, "system.portrait")) reframe(d); });
Hooks.on("updateItem", (d, ch) => { if (!d.parent && (foundry.utils.hasProperty(ch, "system.imgPos") || foundry.utils.hasProperty(ch, "system.category"))) reframe(d); });
Hooks.on("updateJournalEntry", (d, ch) => { if (foundry.utils.hasProperty(ch, `flags.${ID}.thumbPos`)) reframe(d); });
/* image d'un document changée (page Image créée / modifiée / supprimée) : la liste du journal ne se redessine pas d'elle-même pour une page → on oublie l'ancienne vignette et on redessine (1.19.1) */
const journalSoon = (() => { let t = null; return () => { clearTimeout(t); t = setTimeout(() => ui.journal?.render(), 80); }; })();
Hooks.on("updateJournalEntryPage", (p, ch) => { if (p.type === "image" && ("src" in ch || "type" in ch)) { forgetThumb(p.src); journalSoon(); } });
Hooks.on("createJournalEntryPage", p => { if (p.type === "image") journalSoon(); });
Hooks.on("deleteJournalEntryPage", p => { if (p.type === "image") journalSoon(); });
/* même chose pour un portrait d'acteur ou une image d'objet remplacés sous le même chemin */
Hooks.on("updateActor", (d, ch) => { if ("img" in ch) forgetThumb(d.img); });
Hooks.on("updateItem", (d, ch) => { if (!d.parent && "img" in ch) forgetThumb(d.img); });
const kinds = () => { const k = G('jKinds'); return Array.isArray(k) && k.length ? k : DEFAULT_KINDS; };
const kindOf = e => { const key = e?.getFlag(ID, 'kind'); return key ? kinds().find(k => k.key === key) ?? null : null; };
const thumbOf = e => { const p = e.pages.contents.find(p => p.type === 'image' && p.src); return p?.src ?? null; };
const sharedWithPlayers = e => { const o = e.ownership ?? {}; if ((o.default ?? 0) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) return true; return game.users.some(u => !u.isGM && (o[u.id] ?? 0) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED); };

/* ---------- noms de dossiers (1.15) : police au choix, gras, taille proportionnelle à la hauteur du dossier ---------- */
const FOLDER_FONTS = { exo: ['Exo 2', "'Exo 2', 'Signika', sans-serif", 1], rajdhani: ['Rajdhani', "'Rajdhani', 'Signika', sans-serif", 1.12], orbitron: ['Orbitron', "'Orbitron', 'Signika', sans-serif", 0.82], cinzel: ['Cinzel', "'Cinzel', serif", 0.95], josefin: ['Josefin Sans', "'Josefin Sans', 'Signika', sans-serif", 1], signika: ['Signika', "'Signika', sans-serif", 1], classic: ['Style d\'origine (petit, avant 1.15)', "'Josefin Sans', 'Signika', sans-serif", 1] };
/* réglages des dossiers et leurs valeurs par défaut (bouton « Réglages par défaut ») */
const FOLDER_DEFAULTS = { jIconJournal: 26, jIconItems: 26, jIconActors: 32, jFolderHJournal: 32, jFolderHItems: 32, jFolderHActors: 32, jFolderFont: 'exo', jFolderText: 100, jSubH: 90, jSubText: 100, jSub2H: 85, jSub2Text: 100, jFolderMode: 'hybrid', jFolderUniform: false, sbWidth: 400, jPerm: 'pic', jNameLines: 2, jIndent: 12, jSticky: true, docStyle: 'auto' };
/* modes des dossiers (1.16) : esthétique / technique */
const FOLDER_MODES = { hybrid: 'Esthétique actuelle · technique Roll20', current: 'Actuel (esthétique et technique)', roll20: 'Full Roll20 (esthétique et technique)' };
const SIZE_KEYS = ['sbWidth', 'jNameLines', 'jIndent', 'jIconJournal', 'jIconItems', 'jIconActors', 'jFolderHJournal', 'jFolderHItems', 'jFolderHActors', 'jFolderText', 'jSubH', 'jSubText', 'jSub2H', 'jSub2Text'];
function applyFolderFont(v = null) { const g = k => v?.[k] ?? G(k), f = FOLDER_FONTS[g('jFolderFont')] ?? FOLDER_FONTS.exo, st = document.documentElement.style, pc = (k, d) => String((Number(g(k)) || d) / 100);
  const H = document.documentElement.classList, mode = FOLDER_MODES[g('jFolderMode')] ? g('jFolderMode') : 'hybrid';
  H.toggle('sbj-fclassic', g('jFolderFont') === 'classic');
  /* technique Roll20 : noms en entier sur plusieurs lignes, bandeau qui grandit, retrait plafonné · esthétique Roll20 : liste claire et plate */
  H.toggle('sbj-wrap', mode !== 'current'); H.toggle('sbj-r20', mode === 'roll20'); H.toggle('sbj-uniform', mode === 'roll20' || !!g('jFolderUniform'));
  st.setProperty('--sbj-ff', f[1]); st.setProperty('--sbj-ffk', String(f[2])); st.setProperty('--sbj-fts', pc('jFolderText', 100));
  st.setProperty('--sbj-sh2', pc('jSubH', 90)); st.setProperty('--sbj-st2', pc('jSubText', 100)); st.setProperty('--sbj-sh3', pc('jSub2H', 85)); st.setProperty('--sbj-st3', pc('jSub2Text', 100));
  if (v) { for (const [app, k] of [[ui.journal, 'jFolderHJournal'], [ui.items, 'jFolderHItems'], [ui.actors, 'jFolderHActors']]) app?.element?.style.setProperty('--sbj-fh', `${Number(g(k)) || 32}px`); }
  applyLayout(g); refitFolders(); }
/* ---------- lisibilité des listes (1.18) : largeur de la barre, retrait des sous-dossiers, permissions sur la vignette, noms sur 2 lignes ---------- */
export const PERM_MODES = { pic: 'Sur la vignette (le nom garde toute la largeur)', under: 'Sous le nom', row: 'À droite du nom (Foundry)' };
const W_MIN = 300, W_MAX = 760;
const clampW = w => Math.max(W_MIN, Math.min(W_MAX, Math.round(Number(w) || 400)));
function applyLayout(g = G) { const H = document.documentElement.classList, st = document.documentElement.style; const pm = PERM_MODES[g('jPerm')] ? g('jPerm') : 'pic';
  for (const k of Object.keys(PERM_MODES)) H.toggle(`sbj-perm-${k}`, pm === k);
  H.toggle('sbj-nosticky', g('jSticky') === false);   /* Foundry v13 colle les dossiers ouverts en haut de la liste pendant le défilement */
  st.setProperty('--sbj-nl', String(Math.max(1, Math.min(3, Number(g('jNameLines')) || 2)))); st.setProperty('--sbj-ind', `${Math.max(4, Math.min(30, Number(g('jIndent')) || 12))}px`);
  setSidebarWidth(g('sbWidth'));
  if (pm !== (applyLayout._pm ?? pm)) for (const app of [ui.journal, ui.items, ui.actors]) app?.render?.(); applyLayout._pm = pm;
  for (const app of [ui.journal, ui.items, ui.actors]) if (app?.element) compactAll(app.element); }
function setSidebarWidth(w) { const sb = document.getElementById('sidebar'); if (sb) sb.style.setProperty('--sidebar-width', `${clampW(w)}px`); }
/* une entrée de liste : la vignette reçoit l'œil, les carrés de permission (module Permission Viewer) et l'étiquette (PNJ, type) → le nom garde la place */
const PERM_SEL = ':scope > .ownership-viewer, :scope > .permissions, :scope > .sbj-meta .ownership-viewer, :scope .sbj-txt .ownership-viewer';
function compactEntry(li) { if (!li?.isConnected) return; const pm = PERM_MODES[G('jPerm')] ? G('jPerm') : 'pic'; if (pm === 'row') return;
  const name = li.querySelector('.entry-name'); const meta = li.querySelector('.sbj-meta'); const ovs = [...li.querySelectorAll('.ownership-viewer, :scope > .permissions')];
  if (pm === 'pic') {
    let pic = li.querySelector(':scope > .sbj-pic');
    if (!pic) { const lead = li.querySelector(':scope > img.thumbnail:not([hidden]), :scope > img.sbj-thumb, :scope > .sbj-ic, :scope > .sbj-frame'); if (!lead || getComputedStyle(lead).display === 'none') { const alt = li.querySelector(':scope > img.sbj-thumb, :scope > .sbj-ic, :scope > img.thumbnail, :scope > .sbj-frame'); if (!alt) return; pic = document.createElement('span'); pic.className = 'sbj-pic'; alt.before(pic); pic.append(alt); } else { pic = document.createElement('span'); pic.className = 'sbj-pic'; lead.before(pic); pic.append(lead); } }
    for (const el of [...(meta?.querySelectorAll('.sbj-eye, .sbj-kind') || []), ...ovs]) if (el.parentElement !== pic) { if (el.classList.contains('sbj-kind') && !el.dataset.tooltip) el.dataset.tooltip = el.textContent.trim(); pic.append(el); }
  } else {   /* sous le nom */
    if (!name) return; let txt = li.querySelector(':scope > .sbj-txt'); if (!txt) { txt = document.createElement('span'); txt.className = 'sbj-txt'; name.before(txt); txt.append(name); }
    let sub = txt.querySelector(':scope > .sbj-sub'); if (!sub) { sub = document.createElement('span'); sub.className = 'sbj-sub'; txt.append(sub); }
    if (meta && meta.parentElement !== sub) sub.append(meta); for (const el of ovs) if (el.parentElement !== sub) sub.append(el);
  } }
function compactAll(root) { if (!root) return; for (const li of root.querySelectorAll('li.directory-item.entry')) compactEntry(li); }
/* les carrés de Permission Viewer sont ajoutés par ce module après notre rendu : on les déplace quand ils apparaissent */
let _cq = new Set(), _ct = 0;
const queueCompact = li => { if (!li) return; _cq.add(li); if (!_ct) _ct = requestAnimationFrame(() => { _ct = 0; const l = [..._cq]; _cq.clear(); for (const x of l) compactEntry(x); }); };
Hooks.once('ready', () => { const sb = document.getElementById('sidebar'); if (!sb) return;
  /* seulement les onglets Journal / Objets / Acteurs (pas les playlists, redessinées à chaque lecture) */
  const inTabs = n => { for (const a of [ui.journal, ui.items, ui.actors]) { const e = a?.element; if (e instanceof HTMLElement && (e === n || e.contains(n) || n.contains(e))) return true; } return false; };
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType !== 1 || !inTabs(n)) continue; if (n.matches?.('.ownership-viewer, .permissions')) queueCompact(n.closest('li.directory-item.entry')); else if (n.matches?.('li.directory-item.entry')) queueCompact(n); else if (n.querySelectorAll) for (const li of n.querySelectorAll('li.directory-item.entry')) queueCompact(li); } }).observe(sb, { childList: true, subtree: true });
  /* poignée : glisser le bord gauche de la barre pour la redimensionner (comme Roll20), double clic = largeur par défaut */
  const content = document.getElementById('sidebar-content'); if (!content || content.querySelector(':scope > .sbm-resize')) return;
  const grip = document.createElement('div'); grip.className = 'sbm-resize'; grip.dataset.tooltip = 'Glisser pour élargir la barre (double clic : largeur par défaut)'; grip.dataset.tooltipDirection = 'LEFT'; content.prepend(grip);
  grip.addEventListener('pointerdown', ev => { if (ev.button !== 0) return; ev.preventDefault(); grip.setPointerCapture(ev.pointerId); grip.classList.add('drag'); const x0 = ev.clientX, w0 = clampW(G('sbWidth')); let w = w0;
    const mv = e => { w = clampW(w0 + (x0 - e.clientX)); setSidebarWidth(w); };
    const up = async () => { grip.removeEventListener('pointermove', mv); grip.classList.remove('drag'); if (w !== w0) await game.settings.set(ID, 'sbWidth', w); };
    grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up, { once: true }); grip.addEventListener('pointercancel', up, { once: true }); });
  grip.addEventListener('dblclick', () => game.settings.set(ID, 'sbWidth', FOLDER_DEFAULTS.sbWidth)); });
const refitFolders = () => requestAnimationFrame(() => { for (const app of [ui.journal, ui.items, ui.actors]) if (app?.element) fitFolderNames(app.element); });
/* le texte du nom dans son propre span (coupé proprement par « … » s'il déborde) */
function wrapFolderNames(root) { for (const h of root.querySelectorAll('li.folder > header .folder-name, li.folder > header h3')) { if (h.querySelector(':scope > .sbj-fn')) continue;
  for (const n of [...h.childNodes]) if (n.nodeType === 3 && n.textContent.trim()) { const sp = document.createElement('span'); sp.className = 'sbj-fn'; sp.lang = game.i18n?.lang || 'fr'; /* césure correcte des noms longs */ sp.textContent = n.textContent.trim(); n.replaceWith(sp); } }
  fitFolderNames(root); if (!root._sbjRO) { root._sbjRO = new ResizeObserver(() => fitFolderNames(root)); root._sbjRO.observe(root); } }
/* un nom trop long : on réduit d'abord sa taille (jusqu'à −22 %), puis, si le dossier est assez haut, il passe sur deux lignes */
function fitFolderNames(root) { if (document.documentElement.classList.contains('sbj-wrap')) { for (const sp of root.querySelectorAll('.sbj-fn')) { sp.classList.remove('sbj-fn2'); sp.style.fontSize = ''; } return; }
  if (!root.isConnected || !root.offsetWidth) return;
  for (const sp of root.querySelectorAll('.sbj-fn')) { sp.classList.remove('sbj-fn2'); sp.style.fontSize = ''; const w = sp.clientWidth; if (!w) continue; const need = sp.scrollWidth; if (need <= w + 1) continue;
    const r = w / need; if (r >= 0.78) sp.style.fontSize = `${(r * 0.985).toFixed(3)}em`; else if ((sp.closest('header')?.offsetHeight || 0) >= 36) sp.classList.add('sbj-fn2'); else sp.style.fontSize = '0.78em'; } }

/* ---------- Journal ---------- */
function enhanceJournal(root) {
  if (!root) return;
  if (!G('jEnabled')) { root.classList.remove('sbj'); return; }
  root.classList.add('sbj');
  root.classList.toggle('sbj-gm', game.user.isGM); root.style.setProperty('--sbj-ic', `${Number(G('jIconJournal')) || 26}px`); root.style.setProperty('--sbj-fh', `${Number(G('jFolderHJournal')) || 32}px`);
  for (const li of root.querySelectorAll('li.directory-item.entry')) {
    const e = game.journal.get(li.dataset.entryId); if (!e) continue;
    li.querySelector(':scope > .sbj-ic, :scope > .sbj-thumb, :scope > .sbj-pic, :scope > .sbj-frame')?.remove(); li.querySelector(':scope > .sbj-meta')?.remove();
    const k = kindOf(e); const th = thumbOf(e);
    const lead = th ? mk(`<img class="sbj-thumb" alt="" loading="lazy" decoding="async" style="--c:${esc(k?.color ?? '#8d99ae')}">`) : mk(`<span class="sbj-ic" style="--c:${esc(k?.color ?? '#8d99ae')}"><i class="fa-solid ${esc(k?.icon ?? 'fa-file-lines')}"></i></span>`);
    if (th) lead.src = bust(th);
    li.prepend(lead);
    const name = li.querySelector('.entry-name');
    const meta = mk(`<span class="sbj-meta">${k ? `<small class="sbj-kind" style="--c:${esc(k.color)}">${esc(k.name)}</small>` : ''}${game.user.isGM ? (sharedWithPlayers(e) ? '<i class="fa-solid fa-eye sbj-eye" data-tooltip="Visible des joueurs"></i>' : '<i class="fa-solid fa-eye-slash sbj-eye off" data-tooltip="MJ seulement"></i>') : ''}</span>`);
    name ? name.after(meta) : li.append(meta);
    li.style.setProperty('--c', k?.color ?? '#8d99ae');
    li.classList.toggle('sbj-hidden', game.user.isGM && !sharedWithPlayers(e));
    if (th) frameThumb(lead, framingOf(e));
  }
  for (const li of root.querySelectorAll('li.directory-item.folder')) {
    const f = game.folders.get(li.dataset.folderId); if (!f) continue;
    li.style.setProperty('--fc', f.color?.css ?? f.color ?? '#4a5a80');
    const h = li.querySelector(':scope > header .folder-name'); if (h && !h.querySelector('.sbj-n')) { const n = f.contents.length + f.children.reduce((a, c) => a + (c.folder?.contents.length ?? 0), 0); h.append(mk(`<b class="sbj-n">${n}</b>`)); }
  }
  wrapFolderNames(root); compactAll(root);
  /* bouton réglages des types (MJ) dans la recherche */
  const search = root.querySelector(':scope > .directory-header search');
  if (search && game.user.isGM && !search.querySelector('.sbj-cfg')) {
    const b = mk('<button type="button" class="inline-control sbj-cfg icon fa-solid fa-tags" data-tooltip="Types d\'entrées du journal"></button>');
    b.addEventListener('click', ev => { ev.preventDefault(); openKinds(); }); search.append(b);
  }
}

/* type d'une entrée : dialogue avec les pastilles des types */
async function pickKind(entries) {
  const cur = entries.length === 1 ? entries[0].getFlag(ID, 'kind') : null;
  const content = `<div class="sbm-panel sbj-pick"><div class="sbj-chips">${kinds().map(k => `<a class="sbj-chip ${k.key === cur ? 'on' : ''}" data-k="${esc(k.key)}" style="--c:${esc(k.color)}"><i class="fa-solid ${esc(k.icon)}"></i>${esc(k.name)}</a>`).join('')}<a class="sbj-chip none ${!cur ? 'on' : ''}" data-k=""><i class="fa-solid fa-ban"></i>Aucun</a></div>
    <p class="sbm-note">${entries.length > 1 ? `${entries.length} entrées` : esc(entries[0].name)} — le type donne l'icône et la couleur dans la liste.</p></div>`;
  const res = await foundry.applications.api.DialogV2.wait({ window: { title: 'Type d\'entrée', icon: 'fa-solid fa-tags' }, classes: ['sbm-dialog'], position: { width: 420 }, content, rejectClose: false,
    buttons: [{ action: 'cancel', label: 'Fermer' }],
    render: (ev, dlg) => { const el = dlgEl(dlg, '.sbj-pick'); el.addEventListener('click', async e => { const a = e.target.closest('[data-k]'); if (!a) return; e.preventDefault(); const k = a.dataset.k;
      for (const en of entries) { if (k) await en.setFlag(ID, 'kind', k); else await en.unsetFlag(ID, 'kind'); } dlg.close(); }); } });
  void res;
}

/* gestion des types (MJ) */
async function openKinds() {
  const list = kinds().map(k => ({ ...k }));
  const row = (k, i) => `<div class="sbj-krow" data-i="${i}"><input type="color" name="c${i}" value="${esc(k.color)}"><input type="text" name="n${i}" value="${esc(k.name)}" placeholder="Nom"><input type="text" name="i${i}" value="${esc(k.icon)}" placeholder="fa-…" class="mono"><span class="sbj-kprev" style="--c:${esc(k.color)}"><i class="fa-solid ${esc(k.icon)}"></i></span><label class="sbm-cb sbj-del" data-tooltip="Supprimer"><input type="checkbox" name="d${i}"><i class="fa-solid fa-trash"></i></label></div>`;
  const content = `<div class="sbm-panel sbj-kinds"><p class="sbm-note">Chaque type : une couleur, un nom, une icône Font Awesome (ex. <code>fa-dragon</code>). Les entrées gardent leur type par sa clé interne ; supprimer un type rend ses entrées « sans type ».</p>
    <div class="sbj-klist">${list.map(row).join('')}</div><a class="sbj-add"><i class="fa-solid fa-plus"></i> Ajouter un type</a>
    <fieldset><legend>Autres onglets</legend>
      <label class="sbm-cb"><input type="checkbox" name="jItems" ${G('jItems') ? 'checked' : ''}> Même habillage pour l'onglet Objets</label>
      <label class="sbm-cb"><input type="checkbox" name="jActors" ${G('jActors') ? 'checked' : ''}> Même habillage pour l'onglet Acteurs</label>
      <label>Style du chat <select name="jChatStyle">${Object.entries(CHAT_STYLES).map(([k, v]) => `<option value="${k}"${chatStyle() === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label></fieldset>
    <fieldset><legend>Lisibilité des listes (ce navigateur)</legend>
      <label>Largeur de la barre latérale <b data-out="w"></b><input type="range" name="sbWidth" min="300" max="760" step="10" value="${G('sbWidth')}"></label>
      <label>Retrait par niveau de sous-dossier <b data-out="ind"></b><input type="range" name="jIndent" min="4" max="30" step="2" value="${G('jIndent')}"></label>
      <label>Lignes pour les noms <b data-out="nl"></b><input type="range" name="jNameLines" min="1" max="3" step="1" value="${G('jNameLines')}"></label>
      <label>Permissions <select name="jPerm">${Object.entries(PERM_MODES).map(([k, v]) => `<option value="${k}"${(G('jPerm') || 'pic') === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>Fiches « Document » (handouts) <select name="docStyle">${Object.entries({ auto: 'Comme la barre latérale', manhwa: 'Manhwa (sombre)', roll20: 'Roll20 (claire et plate)' }).map(([k, v]) => `<option value="${k}"${(G('docStyle') || 'auto') === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="sbm-cb"><input type="checkbox" name="jSticky" ${G('jSticky') !== false ? 'checked' : ''}> Dossiers ouverts collés en haut pendant le défilement (Foundry)</label>
      <p class="sbm-note">La largeur se règle aussi en glissant le bord gauche de la barre (double clic : 400 px). Bandeaux collés : comportement normal de Foundry v13 ; décoché, ils défilent avec la liste comme sur Roll20.</p></fieldset>
    <fieldset><legend>Taille des icônes (ce navigateur)</legend>
      <label>Journal <b data-out="j"></b><input type="range" name="jIconJournal" min="16" max="72" step="2" value="${G('jIconJournal')}"></label>
      <label>Objets <b data-out="i"></b><input type="range" name="jIconItems" min="16" max="72" step="2" value="${G('jIconItems')}"></label>
      <label>Acteurs <b data-out="a"></b><input type="range" name="jIconActors" min="16" max="72" step="2" value="${G('jIconActors')}"></label>
      <label>Dossiers du journal <b data-out="fj"></b><input type="range" name="jFolderHJournal" min="14" max="64" step="2" value="${G('jFolderHJournal')}"></label>
      <label>Dossiers des objets <b data-out="fi"></b><input type="range" name="jFolderHItems" min="14" max="64" step="2" value="${G('jFolderHItems')}"></label>
      <label>Dossiers des acteurs <b data-out="fa"></b><input type="range" name="jFolderHActors" min="14" max="64" step="2" value="${G('jFolderHActors')}"></label></fieldset>
    <fieldset><legend>Noms des dossiers (ce navigateur)</legend>
      <label>Police <select name="jFolderFont">${Object.entries(FOLDER_FONTS).map(([k, v]) => `<option value="${k}"${G('jFolderFont') === k ? ' selected' : ''} style="font-family:${v[1].replace(/"/g, '')}">${v[0]}</option>`).join('')}</select></label>
      <label>Taille du texte <b data-out="ft"></b><input type="range" name="jFolderText" min="40" max="160" step="5" value="${G('jFolderText')}"></label></fieldset>
    <fieldset><legend>Mode des dossiers (ce navigateur)</legend>
      <label>Mode <select name="jFolderMode">${Object.entries(FOLDER_MODES).map(([k, v]) => `<option value="${k}"${(G('jFolderMode') || 'hybrid') === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="sbm-cb"><input type="checkbox" name="jFolderUniform" ${G('jFolderUniform') ? 'checked' : ''}> Même taille à tous les niveaux (comme Roll20)</label>
      <p class="sbm-note">Technique Roll20 : les noms longs passent à la ligne en entier et le bandeau grandit ; le retrait s'arrête après le 4e niveau. Full Roll20 : en plus, la liste claire et plate de Roll20 (+ / –, traits fins).</p></fieldset>
    <fieldset><legend>Sous-dossiers (ce navigateur)</legend>
      <label>Hauteur des sous-dossiers <b data-out="s1"></b><input type="range" name="jSubH" min="40" max="120" step="5" value="${G('jSubH')}"></label>
      <label>Texte des sous-dossiers <b data-out="s2"></b><input type="range" name="jSubText" min="40" max="200" step="5" value="${G('jSubText')}"></label>
      <label>Hauteur des sous-sous-dossiers (et plus) <b data-out="s3"></b><input type="range" name="jSub2H" min="40" max="120" step="5" value="${G('jSub2H')}"></label>
      <label>Texte des sous-sous-dossiers (et plus) <b data-out="s4"></b><input type="range" name="jSub2Text" min="40" max="200" step="5" value="${G('jSub2Text')}"></label>
      <p class="sbm-note">Hauteurs en % de celle des dossiers de l'onglet. Les changements s'affichent tout de suite ; « Annuler » les retire.</p></fieldset></div>`;
  let el;
  const res = await foundry.applications.api.DialogV2.wait({ window: { title: 'Sidebar Manhwa · Journal', icon: 'fa-solid fa-tags' }, classes: ['sbm-dialog'], position: { width: 520 }, content, rejectClose: false,
    buttons: [{ action: 'save', label: 'Enregistrer', icon: 'fa-solid fa-check', default: true, callback: () => 'save' }, { action: 'reset', label: 'Réglages par défaut', icon: 'fa-solid fa-rotate-left', callback: () => 'reset' }, { action: 'cancel', label: 'Annuler' }],
    render: (ev, dlg) => { el = dlgEl(dlg, '.sbj-kinds');
      const outs = () => { el.querySelector('[data-out="w"]').textContent = `${el.querySelector('[name="sbWidth"]').value} px`; el.querySelector('[data-out="ind"]').textContent = `${el.querySelector('[name="jIndent"]').value} px`; el.querySelector('[data-out="nl"]').textContent = el.querySelector('[name="jNameLines"]').value; for (const [k, n] of [['j', 'jIconJournal'], ['i', 'jIconItems'], ['a', 'jIconActors'], ['fj', 'jFolderHJournal'], ['fi', 'jFolderHItems'], ['fa', 'jFolderHActors'], ['ft', 'jFolderText'], ['s1', 'jSubH'], ['s2', 'jSubText'], ['s3', 'jSub2H'], ['s4', 'jSub2Text']]) el.querySelector(`[data-out="${k}"]`).textContent = `${el.querySelector(`[name="${n}"]`).value} ${/^(ft|s\d)$/.test(k) ? '%' : 'px'}`; };
      /* aperçu en direct dans la barre latérale */
      const live = () => { const v = { jSticky: el.querySelector('[name="jSticky"]').checked, jPerm: el.querySelector('[name="jPerm"]').value, jFolderFont: el.querySelector('[name="jFolderFont"]').value, jFolderMode: el.querySelector('[name="jFolderMode"]').value, jFolderUniform: el.querySelector('[name="jFolderUniform"]').checked }; for (const n of SIZE_KEYS) v[n] = Number(el.querySelector(`[name="${n}"]`).value); applyFolderFont(v); };
      el.addEventListener('input', () => { outs(); live(); }); el.addEventListener('change', live); outs();
      el.addEventListener('input', e => { const r = e.target.closest('.sbj-krow'); if (!r) return; const i = r.dataset.i; const p = r.querySelector('.sbj-kprev'); p.style.setProperty('--c', r.querySelector(`[name="c${i}"]`).value); p.firstElementChild.className = `fa-solid ${r.querySelector(`[name="i${i}"]`).value.trim() || 'fa-file-lines'}`; });
      el.querySelector('.sbj-add').addEventListener('click', e => { e.preventDefault(); const i = el.querySelectorAll('.sbj-krow').length; list.push({ key: `k${Date.now().toString(36)}`, name: '', icon: 'fa-star', color: '#8d99ae' }); el.querySelector('.sbj-klist').append(mk(row(list[i], i))); }); } });
  if (res === 'reset') { for (const [k, d] of Object.entries(FOLDER_DEFAULTS)) if (G(k) !== d) await game.settings.set(ID, k, d); applyFolderFont(); ui.journal?.render(); ui.items?.render(); ui.actors?.render(); ui.notifications.info('Sidebar Manhwa : tailles et police des dossiers remises par défaut.'); return; }
  if (res !== 'save') { applyFolderFont(); for (const [app, k] of [[ui.journal, 'jFolderHJournal'], [ui.items, 'jFolderHItems'], [ui.actors, 'jFolderHActors']]) app?.element?.style.setProperty('--sbj-fh', `${Number(G(k)) || 32}px`); return; }
  const out = [];
  el.querySelectorAll('.sbj-krow').forEach(r => { const i = r.dataset.i; const k = list[i]; if (!k || r.querySelector(`[name="d${i}"]`).checked) return; const name = r.querySelector(`[name="n${i}"]`).value.trim(); if (!name) return;
    out.push({ key: k.key, name, icon: r.querySelector(`[name="i${i}"]`).value.trim() || 'fa-file-lines', color: r.querySelector(`[name="c${i}"]`).value }); });
  await game.settings.set(ID, 'jKinds', out);
  const v = n => el.querySelector(`[name="${n}"]`).checked;
  if (G('jItems') !== v('jItems')) await game.settings.set(ID, 'jItems', v('jItems'));
  { const cs = el.querySelector('[name="jChatStyle"]').value; if (!G('jChat')) await game.settings.set(ID, 'jChat', true); if (G('jChatStyle') !== cs) await game.settings.set(ID, 'jChatStyle', cs); }
  if (G('jActors') !== v('jActors')) await game.settings.set(ID, 'jActors', v('jActors'));
  { const ff = el.querySelector('[name="jFolderFont"]').value; if (G('jFolderFont') !== ff) await game.settings.set(ID, 'jFolderFont', ff); }
  { const fm = el.querySelector('[name="jFolderMode"]').value; if (G('jFolderMode') !== fm) await game.settings.set(ID, 'jFolderMode', fm); }
  { const fu = el.querySelector('[name="jFolderUniform"]').checked; if (G('jFolderUniform') !== fu) await game.settings.set(ID, 'jFolderUniform', fu); }
  { const pm = el.querySelector('[name="jPerm"]').value; if (G('jPerm') !== pm) await game.settings.set(ID, 'jPerm', pm); }
  { const sk = el.querySelector('[name="jSticky"]').checked; if (G('jSticky') !== sk) await game.settings.set(ID, 'jSticky', sk); }
  { const ds = el.querySelector('[name="docStyle"]').value; if (G('docStyle') !== ds) await game.settings.set(ID, 'docStyle', ds); }
  for (const n of SIZE_KEYS) { const x = Number(el.querySelector(`[name="${n}"]`).value); if (G(n) !== x) await game.settings.set(ID, n, x); }
}

/* ---------- Objets & Chat : classes d'habillage ---------- */
function enhanceItems(root) { if (!root) return; frameAll(root, game.items); wrapFolderNames(root); if (G('jItems')) requestAnimationFrame(() => compactAll(root)); root.style.setProperty('--sbj-fh', `${Number(G('jFolderHItems')) || 32}px`); root.classList.toggle('sbi', !!G('jItems')); root.style.setProperty('--sbj-ic', `${Number(G('jIconItems')) || 26}px`); for (const li of root.querySelectorAll('li.directory-item.folder')) { const f = game.folders.get(li.dataset.folderId); if (f) li.style.setProperty('--fc', f.color?.css ?? f.color ?? '#4a5a80'); } }
function enhanceActors(root) { if (!root) return; frameAll(root, game.actors); wrapFolderNames(root); root.style.setProperty('--sbj-fh', `${Number(G('jFolderHActors')) || 32}px`); root.classList.toggle('sba', !!G('jActors')); root.style.setProperty('--sbj-ic', `${Number(G('jIconActors')) || 32}px`);
  if (!G('jActors')) return;
  for (const li of root.querySelectorAll('li.directory-item.folder')) { const f = game.folders.get(li.dataset.folderId); if (f) li.style.setProperty('--fc', f.color?.css ?? f.color ?? '#4a5a80'); }
  for (const li of root.querySelectorAll('li.directory-item.entry')) { const a = game.actors.get(li.dataset.entryId); if (!a) continue; li.querySelector(':scope > .sbj-meta')?.remove(); const name = li.querySelector('.entry-name');
    const meta = mk(`<span class="sbj-meta">${game.users.some(u => !u.isGM && u.character?.id === a.id) ? '<small class="sbj-kind" style="--c:#5eead4">Joueur</small>' : ''}${game.user.isGM ? (sharedWithPlayers(a) ? '<i class="fa-solid fa-eye sbj-eye" data-tooltip="Visible des joueurs"></i>' : '<i class="fa-solid fa-eye-slash sbj-eye off" data-tooltip="MJ seulement"></i>') : ''}</span>`); name ? name.after(meta) : li.append(meta); }
  compactAll(root);
}
/* styles du chat (classe sbc-<style> à côté de sbc) */
export const CHAT_STYLES = { foundry: 'Foundry (par défaut, sans habillage)', neon: 'Néon (bleu nuit)', claire: 'Fantasy claire', sombre: 'Fantasy sombre', terminal: 'Terminal système', bulles: 'Messagerie (bulles)', verre: 'Verre dépoli', sang: 'Encre & sang (dark)', sobre: 'Sobre' };
/* style en vigueur : « Parchemin » (avant 1.20) = Fantasy claire ; l'ancienne case « Même habillage pour le Chat » décochée = Foundry */
const chatStyle = () => { if (!G('jChat')) return 'foundry'; const v = G('jChatStyle') || 'neon'; return v === 'parchemin' ? 'claire' : (CHAT_STYLES[v] ? v : 'neon'); };
function styleChat(el) { if (!el) return; const st = chatStyle(), on = st !== 'foundry'; el.classList.toggle('sbc', on); for (const k of Object.keys(CHAT_STYLES)) el.classList.toggle(`sbc-${k}`, on && st === k); el.classList.remove('sbc-parchemin'); }
function enhanceChat(root) { styleChat(root); fixAll(root); }
const applyChat = () => { for (const s of ['#chat', '#chat-notifications', '#chat-popout', '.chat-popout']) document.querySelectorAll(s).forEach(el => { styleChat(el); fixAll(el); }); };
/* ---- lisibilité : un texte écrit en dur pour le parchemin de Foundry (sombre sur clair) devient illisible sur un style sombre, et inversement.
   Après l'affichage, chaque texte du message est comparé à son fond réel ; sous un contraste de 3:1 il prend la couleur lisible du style. */
const rgb = c => { const m = String(c || '').match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
const hexRgb = h => { h = String(h || '').trim(); if (h.startsWith('rgb')) return rgb(h); const m = h.match(/^#([0-9a-f]{3,8})$/i); if (!m) return null; let x = m[1]; if (x.length <= 4) x = [...x].map(c => c + c).join(''); const n = parseInt(x.slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, x.length === 8 ? parseInt(x.slice(6), 16) / 255 : 1]; };
const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
function bgAt(el, msg) {
  for (let e = el; e && e !== msg; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) return null; const c = rgb(cs.backgroundColor); if (c && c[3] >= .55) return c; }
  return hexRgb(getComputedStyle(msg).getPropertyValue('--sbc-bg'));
}
function fixContrast(msg) {
  if (!msg?.isConnected) return;
  for (const e of msg.querySelectorAll('[data-sbc-fix]')) { const o = e.dataset.sbcFix; e.style.removeProperty('color'); if (o && o !== '-') e.style.color = o; delete e.dataset.sbcFix; }
  if (!msg.closest('.sbc')) return;
  const els = [msg.querySelector('.message-header'), ...msg.querySelectorAll('.message-header *, .message-content, .message-content *')].filter(Boolean).slice(0, 400);
  for (const e of els) {
    if (!e.childNodes.length || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const fg = rgb(cs.color), bg = bgAt(e, msg); if (!fg || !bg || fg[3] < .2) continue;
    if (ratio(fg, bg) >= 3) continue;
    const orig = e.style.color || '-'; e.style.setProperty('color', lum(bg) > .35 ? '#1f170d' : '#eef1fb', 'important'); e.dataset.sbcFix = orig;
  }
}
function fixAll(root) { requestAnimationFrame(() => { for (const m of (root || document).querySelectorAll('.chat-message')) fixContrast(m); }); }
/* messagerie : mes messages à droite ; contrôle de lisibilité une fois le message dans la page */
Hooks.on('renderChatMessageHTML', (msg, html) => { const el = html instanceof HTMLElement ? html : html?.[0]; if (!el) return; if ((msg.author?.id ?? msg.user?.id) === game.user.id) el.classList.add('sbc-mine'); let n = 0; const tick = () => { if (el.isConnected) return fixContrast(el); if (n++ < 20) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });

/* ---------- branchements ---------- */
Hooks.once('init', () => {
  const reg = (k, o) => game.settings.register(ID, k, o);
  reg('jEnabled', { name: 'Habillage de l\'onglet Journal', hint: 'Liste simple façon Roll20 : une icône et une couleur par type d\'entrée, vignette des entrées image, marque « visible des joueurs », dossiers en couleur. Décocher rend l\'onglet d\'origine.', scope: 'client', config: true, type: Boolean, default: true, onChange: () => ui.journal?.render() });
  reg('jItems', { name: 'Même habillage pour l\'onglet Objets', scope: 'client', config: true, type: Boolean, default: true, onChange: () => ui.items?.render() });
  reg('jActors', { name: 'Même habillage pour l\'onglet Acteurs', scope: 'client', config: true, type: Boolean, default: true, onChange: () => ui.actors?.render() });
  reg('jChat', { name: 'Habillage du Chat (ancien réglage)', scope: 'client', config: false, type: Boolean, default: true, onChange: applyChat });
  reg('jChatStyle', { name: 'Style du chat', hint: 'Foundry (par défaut), néon, fantasy claire, fantasy sombre, terminal, bulles de messagerie, verre, encre & sang ou sobre.', scope: 'client', config: true, type: String, choices: CHAT_STYLES, default: 'neon', onChange: () => { if (!G('jChat')) game.settings.set(ID, 'jChat', true); else applyChat(); } });
  for (const [k, lbl, fn] of [['jFolderHJournal', 'Journal', () => ui.journal?.render()], ['jFolderHItems', 'Objets', () => ui.items?.render()], ['jFolderHActors', 'Acteurs', () => ui.actors?.render()]])
    reg(k, { name: `Hauteur des dossiers : ${lbl} (px)`, scope: 'client', config: true, type: Number, range: { min: 14, max: 64, step: 2 }, default: 32, onChange: fn });
  reg('jFolderMode', { name: 'Mode des dossiers', hint: 'Esthétique actuelle avec la technique de Roll20 (noms en entier sur plusieurs lignes, retrait plafonné), tout comme avant, ou tout comme Roll20 (liste claire et plate).', scope: 'client', config: true, type: String, choices: FOLDER_MODES, default: 'hybrid', onChange: () => { applyFolderFont(); for (const a of foundry.applications.instances.values()) if (a.constructor?.name === 'RollDocSheet') a.render(); } });
  reg('jFolderUniform', { name: 'Même taille à tous les niveaux de dossiers', hint: 'Comme Roll20 : les sous-dossiers ont la même hauteur et le même texte que les dossiers.', scope: 'client', config: true, type: Boolean, default: false, onChange: () => applyFolderFont() });
  reg('jFolderFont', { name: 'Police des noms de dossiers', hint: 'Pour le Journal, les Objets, les Acteurs et les autres onglets habillés.', scope: 'client', config: true, type: String, choices: Object.fromEntries(Object.entries(FOLDER_FONTS).map(([k, v]) => [k, v[0]])), default: 'exo', onChange: () => applyFolderFont() });
  reg('jFolderText', { name: 'Taille du texte des dossiers (%)', hint: 'Le texte suit déjà la hauteur des dossiers ; ce réglage l\'agrandit ou le réduit en plus.', scope: 'client', config: true, type: Number, range: { min: 40, max: 160, step: 5 }, default: 100, onChange: () => applyFolderFont() });
  for (const [k, name, d, max] of [['jSubH', 'Hauteur des sous-dossiers (% des dossiers)', 90, 120], ['jSubText', 'Texte des sous-dossiers (%)', 100, 200], ['jSub2H', 'Hauteur des sous-sous-dossiers et plus (% des dossiers)', 85, 120], ['jSub2Text', 'Texte des sous-sous-dossiers et plus (%)', 100, 200]])
    reg(k, { name, scope: 'client', config: true, type: Number, range: { min: 40, max, step: 5 }, default: d, onChange: () => applyFolderFont() });
  reg('jIconJournal', { name: 'Taille des icônes : Journal (px)', scope: 'client', config: true, type: Number, range: { min: 16, max: 72, step: 2 }, default: 26, onChange: () => ui.journal?.render() });
  reg('jIconItems', { name: 'Taille des icônes : Objets (px)', scope: 'client', config: true, type: Number, range: { min: 16, max: 72, step: 2 }, default: 26, onChange: () => ui.items?.render() });
  reg('jIconActors', { name: 'Taille des icônes : Acteurs (px)', scope: 'client', config: true, type: Number, range: { min: 16, max: 72, step: 2 }, default: 32, onChange: () => ui.actors?.render() });
  reg('sbWidth', { name: 'Largeur de la barre latérale (px)', hint: 'Foundry : 300 px. Roll20 est presque deux fois plus large. Se règle aussi en glissant le bord gauche de la barre.', scope: 'client', config: true, type: Number, range: { min: W_MIN, max: W_MAX, step: 10 }, default: 400, onChange: v => setSidebarWidth(v) });
  reg('jPerm', { name: 'Permissions dans les listes', hint: 'Où afficher l\'œil « visible des joueurs », les carrés de permission et l\'étiquette PNJ : sur la vignette (le nom garde toute la largeur), sous le nom, ou à droite comme Foundry.', scope: 'client', config: true, type: String, choices: PERM_MODES, default: 'pic', onChange: () => applyLayout() });
  reg('jNameLines', { name: 'Lignes pour les noms des entrées', hint: 'Un nom trop long passe sur 2 (ou 3) lignes au lieu d\'être coupé.', scope: 'client', config: true, type: Number, choices: { 1: '1 ligne', 2: '2 lignes', 3: '3 lignes' }, default: 2, onChange: () => applyLayout() });
  reg('jIndent', { name: 'Retrait par niveau de sous-dossier (px)', hint: 'Avant : 30 px par niveau. Plus petit = plus de place pour les noms dans les sous-dossiers.', scope: 'client', config: true, type: Number, range: { min: 4, max: 30, step: 2 }, default: 12, onChange: () => applyLayout() });
  reg('jSticky', { name: 'Dossiers ouverts collés en haut pendant le défilement', hint: 'Comportement de Foundry v13 : quand on descend dans un dossier ouvert, son bandeau (et celui de ses dossiers parents) reste affiché en haut de la liste. Décocher : les bandeaux défilent avec le reste, comme Roll20.', scope: 'client', config: true, type: Boolean, default: true, onChange: () => applyLayout() });
  reg('jKinds', { scope: 'world', config: false, type: Array, default: [], onChange: () => ui.journal?.render() });
  game.settings.registerMenu(ID, 'jConfig', { name: 'Journal : types d\'entrées', label: 'Types d\'entrées…', hint: 'Nom, icône et couleur de chaque type (Lieu, Personnage, Quête…).', icon: 'fa-solid fa-tags', restricted: true, type: class extends foundry.applications.api.ApplicationV2 { static DEFAULT_OPTIONS = { id: 'sbj-menu-shim' }; async render() { await openKinds(); return this; } async _renderHTML() { return ''; } _replaceHTML() {} } });
});
Hooks.on('renderJournalDirectory', (app, html) => { try { enhanceJournal(elOf(html) ?? app.element); } catch (e) { console.error(`${ID} | journal`, e); } });
Hooks.on('renderItemDirectory', (app, html) => { try { enhanceItems(elOf(html) ?? app.element); } catch (e) { console.error(`${ID} | objets`, e); } });
Hooks.on('renderActorDirectory', (app, html) => { try { enhanceActors(elOf(html) ?? app.element); } catch (e) { console.error(`${ID} | acteurs`, e); } });
Hooks.on('renderChatLog', () => applyChat());
Hooks.once('ready', async () => { if (!G('jChat')) { await game.settings.set(ID, 'jChatStyle', 'foundry'); await game.settings.set(ID, 'jChat', true); } else if (G('jChatStyle') === 'parchemin') await game.settings.set(ID, 'jChatStyle', 'claire'); applyChat(); applyFolderFont(); });
Hooks.on('getJournalEntryContextOptions', (app, opts) => {
  if (opts.some(o => o.sbj)) return;
  const en = t => game.journal.get(elOf(t)?.closest('[data-entry-id]')?.dataset.entryId);
  opts.push({ sbj: true, name: 'Type…', icon: '<i class="fa-solid fa-tags"></i>', condition: () => game.user.isGM, callback: t => { const e = en(t); if (e) pickKind([e]); } });
});
Hooks.on('getFolderContextOptions', (app, opts) => {
  const dn = app?.documentName ?? app?.constructor?.documentName ?? app?.collection?.documentName; if (dn !== 'JournalEntry') return;
  opts.push({ name: 'Type de toutes les entrées…', icon: '<i class="fa-solid fa-tags"></i>', condition: () => game.user.isGM,
    callback: t => { const f = game.folders.get(elOf(t)?.closest('[data-folder-id]')?.dataset.folderId); if (f?.contents.length) pickKind(f.contents); } });
});
globalThis.SidebarManhwaJournal = { kinds, openKinds, pickKind };

/* noms tronqués (acteurs, journaux, objets, dossiers) : au survol prolongé, info-bulle avec le nom complet */
document.addEventListener('pointerover', ev => {
  const el = ev.target?.closest?.('#sidebar .entry-name, #sidebar .folder-name, #sidebar .document-name');
  if (!el || el.dataset.tooltip) return;
  const txt = (el.querySelector('a, span:not(.sbj-n)')?.textContent || el.textContent || '').trim().replace(/\s+/g, ' ');
  const inner = el.querySelector('a') || el;
  if (txt && (inner.scrollWidth > inner.clientWidth + 1 || el.scrollWidth > el.clientWidth + 1 || inner.scrollHeight > inner.clientHeight + 2)) { el.dataset.tooltip = txt; el.dataset.tooltipDirection = 'LEFT'; }
}, true);
