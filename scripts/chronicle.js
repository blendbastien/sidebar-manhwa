/* Interface - Manhwa 1.26 — CHRONIQUES : journaux illustrés façon journal papier (gazette, carnet, lettre, rapport, avis).
 * Couverture portrait ou paysage (image, cadrage, voile, gros titre, bandeau du journal, police), catégorie (types d'entrées) + sous-catégorie,
 * date du jeu (Horlogia : « journal du jour », visible dans le calendrier) ou date libre, blocs modifiables sur place
 * (titre, chapeau, texte, colonnes, citation, image, encadré, séparateur), accès par groupes ou joueurs,
 * « Montrer aux joueurs » (fenêtre presque plein écran à fermer d'un clic), Kiosque pour tout relire.
 * Stockage : drapeau flags.sidebar-manhwa.chron + une page texte « Chronique » (copie lisible si le module est désactivé). */
const ID = 'sidebar-manhwa';
const SOCKET = `module.${ID}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => foundry.utils.randomID(8);
const L = () => CONST.DOCUMENT_OWNERSHIP_LEVELS;
const kinds = () => globalThis.SidebarManhwaJournal?.kinds?.() ?? [];
const FP = () => foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;
const enrich = (html, opts) => (foundry.applications?.ux?.TextEditor?.implementation ?? TextEditor).enrichHTML(html ?? '', opts);
const { DocumentSheetV2, ApplicationV2, DialogV2 } = foundry.applications.api;
const H = () => game.modules.get('horlogia-manhwa')?.active ? globalThis.HORLOGIA : null;

export const LAYOUTS = {
  gazette: ['Gazette', 'fa-newspaper', 'Papier crème, grand bandeau, colonnes'],
  carnet: ['Carnet', 'fa-book-open', 'Papier ligné, écriture à la main'],
  lettre: ['Lettre', 'fa-envelope-open-text', 'Papier chaud, texte centré, signature'],
  rapport: ['Rapport', 'fa-folder-closed', 'Machine à écrire, tampon confidentiel'],
  avis: ['Avis', 'fa-scroll', 'Affiche placardée, gros caractères']
};
/* 1.27 — polices (Google Fonts, chargées une fois) : clé → [nom, pile CSS, famille Google, groupe] */
const F = (n, stack, g, grp) => [n, stack, g, grp];
export const FONTS = {
  playfair: F('Playfair Display', "'Playfair Display', Georgia, serif", 'Playfair+Display:ital,wght@0,400;0,700;0,900;1,700', 'Journal'),
  abril: F('Abril Fatface', "'Abril Fatface', Georgia, serif", 'Abril+Fatface', 'Journal'),
  dmserif: F('DM Serif Display', "'DM Serif Display', Georgia, serif", 'DM+Serif+Display:ital@0;1', 'Journal'),
  bodoni: F('Bodoni Moda', "'Bodoni Moda', Didot, serif", 'Bodoni+Moda:ital,wght@0,400;0,700;0,900;1,400', 'Journal'),
  libre: F('Libre Baskerville', "'Libre Baskerville', Baskerville, serif", 'Libre+Baskerville:ital,wght@0,400;0,700;1,400', 'Journal'),
  lora: F('Lora', "'Lora', Georgia, serif", 'Lora:ital,wght@0,400;0,600;0,700;1,400', 'Texte'),
  garamond: F('EB Garamond', "'EB Garamond', Garamond, serif", 'EB+Garamond:ital,wght@0,400;0,700;1,400', 'Texte'),
  cormorant: F('Cormorant Garamond', "'Cormorant Garamond', Garamond, serif", 'Cormorant+Garamond:ital,wght@0,400;0,700;1,400', 'Texte'),
  crimson: F('Crimson Text', "'Crimson Text', Georgia, serif", 'Crimson+Text:ital,wght@0,400;0,700;1,400', 'Texte'),
  spectral: F('Spectral', "'Spectral', Georgia, serif", 'Spectral:ital,wght@0,400;0,700;1,400', 'Texte'),
  merriweather: F('Merriweather', "'Merriweather', Georgia, serif", 'Merriweather:ital,wght@0,400;0,700;0,900;1,400', 'Texte'),
  classique: F('Old Standard', "'Old Standard TT', 'Times New Roman', serif", 'Old+Standard+TT:ital,wght@0,400;0,700;1,400', 'Texte'),
  fell: F('IM Fell English', "'IM Fell English', Georgia, serif", 'IM+Fell+English:ital@0;1', 'Ancien'),
  cinzel: F('Cinzel', "'Cinzel', 'Trajan Pro', serif", 'Cinzel:wght@400;700;900', 'Ancien'),
  pirata: F('Pirata One', "'Pirata One', serif", 'Pirata+One', 'Ancien'),
  rye: F('Rye (western)', "'Rye', serif", 'Rye', 'Ancien'),
  affiche: F('Oswald', "'Oswald', Impact, sans-serif", 'Oswald:wght@400;500;700', 'Affiche'),
  anton: F('Anton', "'Anton', Impact, sans-serif", 'Anton', 'Affiche'),
  bebas: F('Bebas Neue', "'Bebas Neue', Impact, sans-serif", 'Bebas+Neue', 'Affiche'),
  josefin: F('Josefin Sans', "'Josefin Sans', sans-serif", 'Josefin+Sans:ital,wght@0,400;0,700;1,400', 'Affiche'),
  righteous: F('Righteous', "'Righteous', sans-serif", 'Righteous', 'Affiche'),
  orbitron: F('Orbitron (futur)', "'Orbitron', sans-serif", 'Orbitron:wght@400;700;900', 'Affiche'),
  machine: F('Special Elite (machine)', "'Special Elite', 'Courier New', monospace", 'Special+Elite', 'Machine'),
  courier: F('Courier Prime', "'Courier Prime', 'Courier New', monospace", 'Courier+Prime:ital,wght@0,400;0,700;1,400', 'Machine'),
  plume: F('Caveat (plume)', "'Caveat', 'Segoe Script', cursive", 'Caveat:wght@500;700', 'Manuscrit'),
  dancing: F('Dancing Script', "'Dancing Script', cursive", 'Dancing+Script:wght@500;700', 'Manuscrit'),
  kalam: F('Kalam', "'Kalam', cursive", 'Kalam:wght@400;700', 'Manuscrit'),
  marker: F('Permanent Marker', "'Permanent Marker', cursive", 'Permanent+Marker', 'Manuscrit'),
  creepster: F('Creepster (horreur)', "'Creepster', cursive", 'Creepster', 'Fantaisie'),
  metal: F('Metal Mania', "'Metal Mania', cursive", 'Metal+Mania', 'Fantaisie')
};
const FONT_GROUPS = ['Journal', 'Texte', 'Ancien', 'Affiche', 'Machine', 'Manuscrit', 'Fantaisie'];
const fontsLink = () => { if (document.getElementById('sbc-fonts')) return; const l = document.createElement('link'); l.id = 'sbc-fonts'; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?${Object.values(FONTS).map(f => `family=${f[2]}`).join('&')}&display=swap`; document.head.append(l); };
const FS = k => FONTS[k]?.[1] || '';
/* fonds : papier (texture et couleurs) et arrière-plan derrière la feuille */
export const PAPERS = { '': ['Selon le modèle', '#f4ecd8'], creme: ['Crème', '#f4ecd8'], blanc: ['Blanc', '#fbfaf6'], journal: ['Papier journal', '#e4e1d8'], vieilli: ['Vieilli taché', '#ead9b2'], parchemin: ['Parchemin', '#e9d6a8'], kraft: ['Kraft', '#c9a978'], ligne: ['Ligné', '#fbf7ea'], quadrille: ['Quadrillé', '#f7f7f2'], pointille: ['Pointillé', '#faf6ec'], plan: ['Plan bleu', '#1f4e8c'], noir: ['Noir', '#1b1a18'], rose: ['Rose poudré', '#f6e3e3'], menthe: ['Menthe', '#e3f1ea'] };
export const BACKS = { bois: ['Bois sombre', '#3a2a1c'], cuir: ['Cuir', '#4a2618'], nuit: ['Nuit', '#141a2c'], ardoise: ['Ardoise', '#2b3036'], feutre: ['Feutre vert', '#1f3a2c'], bordeaux: ['Bordeaux', '#3a1018'], marbre: ['Marbre', '#d9d6cf'], lin: ['Lin clair', '#cfc5b0'], image: ['Image…', '#555'] };
const SIZES = { s: ['S', 'Petit'], m: ['M', 'Normal'], l: ['L', 'Grand'], xl: ['XL', 'Très grand'] };
/* 1.29.1 — mise en forme directe dans l'éditeur (sur la sélection, ou sur tout le bloc si rien n'est sélectionné) */
const XSIZES = [['0', 'Normale'], ['.8em', 'Petit'], ['1.25em', 'Grand'], ['1.6em', 'Très grand'], ['2.1em', 'Énorme'], ...[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map(n => [`${n}px`, `${n} px`])];
const XTC = ['#1d1a16', '#5b4a30', '#8b1e1e', '#c0392b', '#d35400', '#b7950b', '#1e8449', '#117a65', '#1f4e8c', '#6c3483', '#7f8c8d', '#ffffff'];
const XHL = ['#fff3a0', '#ffd9a0', '#ffb3b3', '#c8f0c0', '#bfe3ff', '#e5ccff', '#f0e0c0', '#d9d9d9'];
const XMARK = 'https://sbcmark.invalid/';
const unwrapEl = n => n.replaceWith(...n.childNodes);
const LAYOUT_FONT = { gazette: 'playfair', carnet: 'plume', lettre: 'classique', rapport: 'machine', avis: 'affiche' };
export const BLOCKS = {
  h: ['Titre', 'fa-heading'], lead: ['Chapeau', 'fa-paragraph'], text: ['Texte', 'fa-align-left'], cols: ['Texte en colonnes', 'fa-table-columns'],
  quote: ['Citation', 'fa-quote-left'], img: ['Image', 'fa-image'], box: ['Encadré', 'fa-square'], sep: ['Séparateur', 'fa-minus']
};
const blank = (t) => ({ id: uid(), t, html: { h: 'Titre de la rubrique', lead: 'Le chapeau résume l\'article en une ou deux phrases.', text: '<p>Écris ton texte ici…</p>', cols: '<p>Un texte long, réparti sur plusieurs colonnes comme dans un vrai journal…</p>', quote: '« Une phrase marquante. »', box: '<p><b>À retenir</b> : une information encadrée.</p>' }[t] || '', who: t === 'quote' ? '— Quelqu\'un' : undefined, src: '', cap: t === 'img' ? 'Légende de l\'image' : undefined, pos: t === 'img' ? 'full' : undefined, n: t === 'cols' ? 2 : undefined, color: t === 'box' ? '#8b1e1e' : undefined, fx: 50, fy: 50 });
export const defaultChron = (name = 'Nouvelle chronique') => ({ v: 1, layout: 'gazette',
  cover: { orient: 'portrait', img: '', fx: 50, fy: 40, dim: 30, mast: 'LA GAZETTE', title: name, sub: 'Sous-titre de la une', accent: '#8b1e1e', font: '', tpos: 'over', no: '' },
  sub: '', tags: [], date: { mode: 'none' }, groups: [],
  blocks: [blank('lead'), blank('text')] });
export const chronOf = e => { const d = e?.getFlag?.(ID, 'chron'); if (!d) return null; const D = defaultChron(e.name); return { ...D, ...d, cover: { ...D.cover, ...(d.cover || {}) }, date: { ...D.date, ...(d.date || {}) }, blocks: Array.isArray(d.blocks) ? d.blocks : D.blocks }; };
export const isChron = e => !!e?.getFlag?.(ID, 'chron');
const stOf = d => ({ tf: d.cover.font || '', mf: '', hf: '', bf: '', paper: '', pcol: '', ink: '', tcol: '', bg: 'bois', bgImg: '', ...(d.st || {}) });
const fontOf = d => FS(stOf(d).tf) || FS(LAYOUT_FONT[d.layout] || 'playfair');
/* 1.29 — dates : précision (jour / mois / année), date facultative pour le texte libre, clés de tri */
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const calOf = id => { const S = H()?.state?.(); if (!S) return null; return (id && S.calendars.find(c => c.id === id)) || (() => { try { return H().now().cal; } catch (e) { return S.calendars[0]; } })(); };
const monthsOf = cal => (cal?.months?.length ? cal.months.map(m => m.name) : MONTHS_FR);
const nn = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
export const dateParts = d => { const x = d?.date || {}; const y = nn(x.y); if (y == null) return null;
  if (x.mode === 'horlogia') { const p = x.prec || 'd'; return { y, m: p === 'y' ? null : nn(x.m) ?? 0, d: p === 'd' ? nn(x.d) ?? 1 : null }; }
  if (x.mode === 'manual') { const m = nn(x.m); return { y, m, d: m == null ? null : nn(x.d) }; } return null; };
const partsLabel = (p, cal) => p ? [p.d, p.m != null ? monthsOf(cal)[p.m] : null, p.y].filter(v => v != null && v !== '').join(' ') : '';
const dateKey = p => p ? p.y * 10000 + (p.m == null ? 0 : p.m + 1) * 100 + (p.d || 0) : null;
const dateLabel = d => { const x = d.date || {}; if (x.mode === 'none' || !x.mode) return ''; if (x.mode === 'manual') return x.label || partsLabel(dateParts(d), calOf(x.cal)); const p = dateParts(d); return p && H() ? partsLabel(p, calOf(x.cal)) : (x.label || ''); };
const relabel = x => { if (x.date.mode === 'horlogia') x.date.label = partsLabel(dateParts(x), calOf(x.date.cal)); };
const stepDate = (x, n) => { const ms = calOf(x.cal)?.months?.length ? calOf(x.cal).months : MONTHS_FR.map(() => ({ days: 30 })); const dz = i => +ms[i]?.days || 30; const p = x.prec || 'd'; let y = +x.y || 0, m = +x.m || 0, dd = +x.d || 1;
  if (p === 'y') y += n; else if (p === 'm') { m += n; while (m < 0) { m += ms.length; y--; } while (m >= ms.length) { m -= ms.length; y++; } }
  else { dd += n; while (dd < 1) { m--; if (m < 0) { m = ms.length - 1; y--; } dd += dz(m); } while (dd > dz(m)) { dd -= dz(m); m++; if (m >= ms.length) { m = 0; y++; } } }
  Object.assign(x, { y, m, d: Math.min(dd, dz(m)) }); };
const kindOf = d => kinds().find(k => k.key === d.kind);

/* ── rendu (lecture et édition) ── */
function coverHTML(d, edit) {
  const c = d.cover; const k = kindOf(d); const ce = f => edit ? ` contenteditable="true" data-f="cover.${f}" spellcheck="false"` : '';
  const dl = dateLabel(d);
  const S = stOf(d); const mast = `<div class="sbc-mast"><span class="no">${esc(c.no || '')}</span><b${ce('mast')}${FS(S.mf) ? ` style="font-family:${FS(S.mf)}"` : ''}>${esc(c.mast || '')}</b><span class="dt">${esc(dl)}</span></div>`;
  const titles = `<div class="sbc-tt">${k ? `<span class="sbc-cat" style="--kc:${esc(k.color)}"><i class="fa-solid ${esc(k.icon)}"></i>${esc(k.name)}${d.sub ? ` · ${esc(d.sub)}` : ''}</span>` : d.sub ? `<span class="sbc-cat">${esc(d.sub)}</span>` : ''}<h1${ce('title')}${S.tcol ? ` style="color:${esc(S.tcol)}"` : ''}>${esc(c.title || '')}</h1><p class="sub"${ce('sub')}>${esc(c.sub || '')}</p></div>`;
  const img = c.img ? `<div class="sbc-cimg" style="background-image:url(&quot;${esc(c.img)}&quot;);background-position:${+c.fx || 50}% ${+c.fy || 50}%;transform:scale(${(+c.zoom || 100) / 100});transform-origin:${+c.fx || 50}% ${+c.fy || 50}%"></div>` : `<div class="sbc-cimg none">${edit ? '<span><i class="fa-solid fa-image"></i> Ajoute une image de couverture</span>' : ''}</div>`;
  /* 1.29.1 : le bouton Image est dans le coin de l'image, jamais sur le titre */
  const pick = edit ? `<span class="sbc-cpick"><a data-act="coverImg"><i class="fa-solid fa-image"></i> Image</a><a data-act="czoom" data-d="-10" data-tooltip="Dézoomer">−</a><b>${+c.zoom || 100} %</b><a data-act="czoom" data-d="10" data-tooltip="Zoomer">+</a></span>` : '';
  return `<header class="sbc-cover ${c.orient === 'landscape' ? 'land' : 'port'} t-${c.tpos === 'above' ? 'above' : 'over'}" style="--dim:${(+c.dim || 0) / 100}">${mast}${c.tpos === 'above' ? titles + `<div class="sbc-cframe">${img}${pick}</div>` : `<div class="sbc-cframe">${img}<div class="sbc-veil"></div>${titles}${pick}</div>`}</header>`;
}
async function blockHTML(b, edit, rel, hf = '') {
  const ce = (k = 'html') => edit ? ` contenteditable="true" data-b="${b.id}" data-k="${k}"` : '';
  const rich = async h => edit ? (h || '') : await enrich(h || '', { relativeTo: rel, secrets: rel?.isOwner });
  let inner = '';
  switch (b.t) {
    case 'h': inner = `<h2${ce()}${FS(hf) && !FS(b.font) ? ` style="font-family:${FS(hf)}"` : ''}>${b.html || ''}</h2>`; break;
    case 'lead': inner = `<p class="lead"${ce()}>${b.html || ''}</p>`; break;
    case 'text': inner = `<div class="txt"${ce()}>${await rich(b.html)}</div>`; break;
    case 'cols': inner = `<div class="txt cols" style="--n:${+b.n || 2}"${ce()}>${await rich(b.html)}</div>`; break;
    case 'quote': inner = `<blockquote><p${ce()}>${b.html || ''}</p><cite${ce('who')}>${esc(b.who || '')}</cite></blockquote>`; break;
    case 'box': inner = `<aside class="box" style="--bx:${esc(b.color || '#8b1e1e')}"${ce()}>${await rich(b.html)}</aside>`; break;
    case 'sep': inner = `<hr class="sbc-sep">`; break;
    case 'img': inner = `<figure class="fig ${esc(b.pos || 'full')}">${b.src ? `<div class="ib"><img src="${esc(b.src)}" style="object-position:${+b.fx || 50}% ${+b.fy || 50}%;transform:scale(${(+b.zoom || 100) / 100});transform-origin:${+b.fx || 50}% ${+b.fy || 50}%"${edit ? '' : ' data-act="zoom"'}></div>` : `<div class="noimg">${edit ? '<i class="fa-solid fa-image"></i> Choisir une image' : ''}</div>`}<figcaption${ce('cap')}>${esc(b.cap || '')}</figcaption></figure>`; break;
  }
  const tc = b.t !== 'box' && b.color; const bst = `${FS(b.font) ? `font-family:${FS(b.font)};--bf:${FS(b.font)};` : ''}${tc ? `color:${esc(b.color)};--bc:${esc(b.color)};` : ''}`; const bcls = `sbc-b b-${b.t}${b.t === 'img' ? ` p-${esc(b.pos || 'full')}` : ''}${b.size ? ` sz-${esc(b.size)}` : ''}${FS(b.font) ? ' hasf' : ''}${tc ? ' hasc' : ''}`;
  if (!edit) return `<section class="${bcls}"${bst ? ` style="${bst}"` : ''}>${inner}</section>`;
  const opts = b.t === 'img' ? `<a data-act="bImg" data-tooltip="Changer l'image"><i class="fa-solid fa-image"></i></a>${['full', 'left', 'right', 'half'].map(p => `<a data-act="bPos" data-v="${p}" class="${(b.pos || 'full') === p ? 'on' : ''}" data-tooltip="${{ full: 'Pleine largeur', left: 'À gauche', right: 'À droite', half: 'Moitié' }[p]}"><i class="fa-solid ${{ full: 'fa-expand', left: 'fa-align-left', right: 'fa-align-right', half: 'fa-table-columns' }[p]}"></i></a>`).join('')}`
    : b.t === 'cols' ? [2, 3].map(n => `<a data-act="bCols" data-v="${n}" class="${(+b.n || 2) === n ? 'on' : ''}">${n} col.</a>`).join('')
    : '';
  const zoomUI = b.t === 'img' && b.src ? `<label class="mini" data-tooltip="Cadrage horizontal">↔<input type="range" data-act="bRange" data-k="fx" min="0" max="100" value="${+b.fx || 50}"></label><label class="mini" data-tooltip="Cadrage vertical">↕<input type="range" data-act="bRange" data-k="fy" min="0" max="100" value="${+b.fy || 50}"></label><label class="mini" data-tooltip="Zoom">🔍<input type="range" data-act="bRange" data-k="zoom" min="50" max="300" step="5" value="${+b.zoom || 100}"></label>` : '';
  const style = `${b.t === 'box' ? `<label class="mini col" data-tooltip="Couleur de l'encadré"><i class="fa-solid fa-palette"></i><input type="color" data-act="bColor" value="${esc(b.color || '#8b1e1e')}"></label>` : ''}${FS(b.font) || b.size || (tc) ? `<a data-act="bStyleClr" data-tooltip="Retirer la police, la taille et la couleur réglées sur tout le bloc (ancienne méthode)"><i class="fa-solid fa-rotate-left"></i></a>` : ''}`;
  return `<section class="${bcls} ed" data-bid="${b.id}"${bst ? ` style="${bst}"` : ''}><div class="sbc-bctl"><span class="ty"><i class="fa-solid ${BLOCKS[b.t]?.[1]}"></i>${BLOCKS[b.t]?.[0]}</span>${opts}${zoomUI}${style}<span class="sp"></span><a data-act="bUp" data-tooltip="Monter"><i class="fa-solid fa-arrow-up"></i></a><a data-act="bDown" data-tooltip="Descendre"><i class="fa-solid fa-arrow-down"></i></a><a data-act="bDup" data-tooltip="Dupliquer"><i class="fa-solid fa-clone"></i></a><a data-act="bDel" class="del" data-tooltip="Supprimer le bloc"><i class="fa-solid fa-trash"></i></a></div>${inner}</section>`;
}
function fontSelect(act, cur, placeholder, mini = false, k = '') { return `<select data-act="${act}"${k ? ` data-k="${k}"` : ''} class="fsel${mini ? ' mini' : ''}" data-tooltip="${placeholder}"><option value="">${mini ? 'Police' : placeholder}</option>${FONT_GROUPS.map(g => `<optgroup label="${g}">${Object.entries(FONTS).filter(([, f]) => f[3] === g).map(([fk, f]) => `<option value="${fk}" style="font-family:${f[1]}"${cur === fk ? ' selected' : ''}>${f[0]}</option>`).join('')}</optgroup>`).join('')}</select>`; }
export const backdropStyle = d => { const S = stOf(d); return S.bg === 'image' && S.bgImg ? `background-image:linear-gradient(#0006,#0006),url(&quot;${esc(S.bgImg)}&quot;);background-size:cover;background-position:center` : ''; };
export const backdropClass = d => `bk-${esc(stOf(d).bg || 'bois')}`;
const insHTML = i => `<div class="sbc-ins" data-at="${i}"><a data-act="insMenu" data-at="${i}"><i class="fa-solid fa-plus"></i> Ajouter un bloc</a></div>`;
export async function chronHTML(d, { edit = false, rel = null } = {}) {
  const parts = []; if (edit) parts.push(insHTML(0));
  const S = stOf(d); fontsLink();
  for (let i = 0; i < d.blocks.length; i++) { parts.push(await blockHTML(d.blocks[i], edit, rel, S.hf)); if (edit) parts.push(insHTML(i + 1)); }
  const vars = `--acc:${esc(d.cover.accent || '#8b1e1e')};--tf:${fontOf(d)};${S.bf ? `--body:${FS(S.bf)};` : ''}${S.pcol ? `--paper:${esc(S.pcol)};` : ''}${S.ink ? `--ink:${esc(S.ink)};--rule:${esc(S.ink)};` : ''}${S.hf ? `--hf:${FS(S.hf)};` : ''}`;
  return `<article class="sbc-paper l-${esc(d.layout)}${S.paper ? ` pp-${esc(S.paper)}` : ''}${S.pcol ? ' pcol' : ''}${edit ? ' editing' : ''}" style="${vars}">${coverHTML(d, edit)}<div class="sbc-content">${parts.join('')}</div><footer class="sbc-foot">${esc(d.cover.mast || '')}${dateLabel(d) ? ` · ${esc(dateLabel(d))}` : ''}</footer></article>`;
}

/* ── accès : groupes (d'aventure et MJ) et joueurs ── */
const ownersOfActor = uuid => { const a = fromUuidSync(uuid); return a ? game.users.filter(u => !u.isGM && a.testUserPermission(u, 'OWNER')).map(u => u.id) : []; };
export function groupList() {
  const out = []; try { for (const p of globalThis.MANHWA?.parties?.() || []) out.push({ id: `p:${p.id}`, name: p.name, color: p.color || '#7cc4ff', icon: 'fa-flag', users: [...new Set((p.members || []).flatMap(m => ownersOfActor(m.uuid)))] }); } catch (e) {}
  try { for (const g of globalThis.MANHWA?.gmGroups?.list?.() || []) out.push({ id: `g:${g.id}`, name: g.name, color: g.color || '#ffc63d', icon: 'fa-crown', users: [...new Set([...(g.users || []), ...(g.actors || []).flatMap(ownersOfActor)])] }); } catch (e) {}
  return out;
}
/* 1.28 — groupe MJ (« univers ») d'une chronique : choisi, sinon celui de sa date Horlogia */
export const gmGroupsAll = () => { try { return globalThis.MANHWA?.gmGroups?.list?.() || []; } catch (e) { return []; } };
const gmGroupsMine = () => { try { return game.user.isGM ? gmGroupsAll() : (globalThis.MANHWA?.gmGroups?.ofUser?.(game.user) || []); } catch (e) { return []; } };
export const gmgOf = d => { if (d?.gmg) return d.gmg === '-' ? '' : d.gmg; const g = d?.date?.g; return g && gmGroupsAll().some(x => x.id === g) ? g : ''; };
const usersOfGroups = ids => [...new Set(groupList().filter(g => ids.includes(g.id)).flatMap(g => g.users))];

/* ── fiche ── */
export class ChronicleSheet extends DocumentSheetV2 {
  static DEFAULT_OPTIONS = { classes: ['sbc-sheet'], window: { resizable: true, icon: 'fa-solid fa-newspaper', controls: [] }, position: { width: 820, height: 860 }, form: { submitOnChange: false, closeOnSubmit: false } };
  constructor(...a) { super(...a); this.editing = false; this.panel = false; this.ptab = 'une'; }
  get title() { return this.document.name; }
  get canEdit() { return this.document.isOwner; }
  _onSubmitForm(c, ev) { ev?.preventDefault?.(); }
  get data() { return this._d ||= foundry.utils.deepClone(chronOf(this.document) || defaultChron(this.document.name)); }
  async _renderHTML() {
    if (!this._dirty) this._d = foundry.utils.deepClone(chronOf(this.document) || defaultChron(this.document.name));
    const d = this.data; const ed = this.editing && this.canEdit;
    const paper = await chronHTML(d, { edit: ed, rel: this.document });
    const fmt = ed ? `<div class="sbc-fmt">${[['bold', 'fa-bold', 'Gras'], ['italic', 'fa-italic', 'Italique'], ['underline', 'fa-underline', 'Souligné'], ['strikeThrough', 'fa-strikethrough', 'Barré'], ['|'], ['h3', 'fa-heading', 'Intertitre'], ['p', 'fa-paragraph', 'Paragraphe'], ['insertUnorderedList', 'fa-list-ul', 'Liste'], ['insertOrderedList', 'fa-list-ol', 'Liste numérotée'], ['|'], ['justifyLeft', 'fa-align-left', 'Gauche'], ['justifyCenter', 'fa-align-center', 'Centré'], ['justifyFull', 'fa-align-justify', 'Justifié'], ['|'], ['createLink', 'fa-link', 'Lien'], ['removeFormat', 'fa-eraser', 'Effacer la mise en forme']].map(x => x[0] === '|' ? '<i class="bar"></i>' : `<a data-fmt="${x[0]}" data-tooltip="${x[2]}"><i class="fa-solid ${x[1]}"></i></a>`).join('')}<i class="bar"></i>${fontSelect('xFont', '', 'Police', true)}<select data-act="xSize" class="fsel mini xsz" data-tooltip="Taille du texte sélectionné"><option value="">Taille</option>${XSIZES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select><a data-xpop="color" aria-label="Couleur du texte"><i class="fa-solid fa-font"></i><u style="background:${this._xc || '#8b1e1e'}"></u></a><a data-xpop="hl" aria-label="Surligner"><i class="fa-solid fa-highlighter"></i><u style="background:${this._xh || '#fff3a0'}"></u></a><a data-xreset data-tooltip="Style normal (retire police, taille et couleurs)"><i class="fa-solid fa-text-slash"></i></a><span class="sp"></span><span class="sv" data-sv>${this._dirty ? 'Modifications…' : 'Enregistré'}</span></div>` : '';
    return `<div class="sbc-wrap${ed ? ' ed' : ''}">${fmt}${ed && this.panel ? this.#panelHTML(d) : ''}<div class="sbc-scroll ${backdropClass(d)}" style="${backdropStyle(d)}">${paper}</div></div>`;
  }
  _replaceHTML(r, c) { const sc = c.querySelector('.sbc-scroll')?.scrollTop || 0; const ps = c.querySelector('.sbc-pbody')?.scrollTop || 0; c.innerHTML = r; const n = c.querySelector('.sbc-scroll'); if (n) n.scrollTop = sc; const p = c.querySelector('.sbc-pbody'); if (p) p.scrollTop = ps; }
  /* 1.29 — panneau compact à onglets : Une · Style · Date & catégorie · Accès */
  #panelHTML(d) {
    const c = d.cover; const S = stOf(d); const lv = L(); const own = this.document.ownership || {}; const players = game.users.filter(u => !u.isGM); const gm = game.user.isGM;
    const seg = (name, cur, list, act = 'set') => `<span class="sbc-seg">${list.map(([v, l, ic, tip]) => `<a data-act="${act}" data-k="${name}" data-v="${v}" class="${cur === v ? 'on' : ''}"${tip ? ` data-tooltip="${tip}"` : ''}>${ic ? `<i class="fa-solid ${ic}"></i>` : ''}${l ? `<span>${l}</span>` : ''}</a>`).join('')}</span>`;
    const rng = (k, l, min, max, step, v, unit = '') => `<label class="rg"><span>${l}</span><input type="range" data-act="set" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}" data-unit="${unit}"><output>${v}${unit}</output></label>`;
    const tabs = [['une', 'Une', 'fa-image-portrait'], ['style', 'Style', 'fa-palette'], ['date', 'Date', 'fa-calendar-days'], ...(gm ? [['acces', 'Accès', 'fa-eye']] : [])];
    if (!tabs.some(t => t[0] === this.ptab)) this.ptab = 'une';
    let body = '';
    if (this.ptab === 'une') body = `<section><h4>Couverture</h4>
        <div class="row">${seg('orient', c.orient, [['portrait', 'Portrait', 'fa-image-portrait'], ['landscape', 'Paysage', 'fa-panorama']])}${seg('tpos', c.tpos || 'over', [['over', '', 'fa-layer-group', 'Titre sur l\'image'], ['above', '', 'fa-heading', 'Titre au-dessus de l\'image']])}</div>
        <div class="row"><a class="btn" data-act="coverImg"><i class="fa-solid fa-folder-open"></i> ${c.img ? 'Changer l\'image' : 'Choisir une image'}</a>${c.img ? `<a class="btn" data-act="coverClr" data-tooltip="Retirer l'image"><i class="fa-solid fa-xmark"></i></a>` : ''}</div>
        ${rng('fx', 'Cadrage ↔', 0, 100, 1, +c.fx || 50, ' %')}${rng('fy', 'Cadrage ↕', 0, 100, 1, +c.fy || 50, ' %')}${rng('zoom', 'Zoom', 50, 300, 5, +c.zoom || 100, ' %')}${rng('dim', 'Voile', 0, 90, 5, +c.dim || 0, ' %')}
        <a class="lnk" data-act="coverReset"><i class="fa-solid fa-rotate-left"></i> Recentrer l'image</a></section>
      <section><h4>Bandeau</h4><div class="g2"><label class="full">Nom du journal<input type="text" data-act="set" data-k="mast" value="${esc(c.mast || '')}"></label><label>Numéro<input type="text" data-act="set" data-k="no" value="${esc(c.no || '')}" placeholder="N° 12"></label><label>Couleur d'accent<input type="color" data-act="set" data-k="accent" value="${esc(c.accent || '#8b1e1e')}"></label></div></section>`;
    else if (this.ptab === 'style') body = `<section><h4>Modèle</h4><div class="sbc-lays mini">${Object.entries(LAYOUTS).map(([k, l]) => `<a data-act="layout" data-v="${k}" class="l-${k}${d.layout === k ? ' on' : ''}" data-tooltip="${esc(l[2])}"><i class="fa-solid ${l[1]}"></i><b>${l[0]}</b></a>`).join('')}</div></section>
      <section><h4>Polices</h4>${[['tf', 'Gros titre', 'Selon le modèle'], ['mf', 'Bandeau', 'Selon le modèle'], ['hf', 'Rubriques', 'Comme le gros titre'], ['bf', 'Articles', 'Selon le modèle']].map(([k, l, ph]) => `<div class="fr"><span>${l}</span>${fontSelect('st', FONTS[S[k]] ? S[k] : '', ph, false, k)}${FONTS[S[k]] ? `<a data-act="stClr" data-k="${k}" data-tooltip="Par défaut"><i class="fa-solid fa-rotate-left"></i></a>` : '<i></i>'}</div>`).join('')}<small class="hint">Chaque bloc peut aussi avoir sa police, sa taille et sa couleur (barre au-dessus du bloc).</small></section>
      <section><h4>Couleurs</h4><div class="colrow">${[['accent', 'Accent', c.accent || '#8b1e1e', 'set'], ['tcol', 'Gros titre', S.tcol || '#ffffff', 'st'], ['ink', 'Encre', S.ink || '#1d1a16', 'st'], ['pcol', 'Papier', S.pcol || (PAPERS[S.paper]?.[1] || '#f4ecd8'), 'st']].map(([k, l, v, act]) => `<label class="cl"><input type="color" data-act="${act}" data-k="${k}" value="${esc(v)}"><span>${l}</span>${act === 'st' && S[k] ? `<a data-act="stClr" data-k="${k}" data-tooltip="Par défaut"><i class="fa-solid fa-rotate-left"></i></a>` : ''}</label>`).join('')}</div></section>
      <section><h4>Papier</h4><div class="sbc-tiles sm">${Object.entries(PAPERS).map(([k, [n, col]]) => `<a data-act="paper" data-v="${k}" class="pp-${k || 'auto'}${(S.paper || '') === k ? ' on' : ''}" style="--sw:${col}" data-tooltip="${esc(n)}"><i></i><span>${n}</span></a>`).join('')}</div></section>
      <section><h4>Arrière-plan</h4><div class="sbc-tiles sm">${Object.entries(BACKS).map(([k, [n, col]]) => `<a data-act="back" data-v="${k}" class="bk-${k}${(S.bg || 'bois') === k ? ' on' : ''}" style="--sw:${col}" data-tooltip="${esc(n)}"><i class="bk-${k}"></i><span>${n}</span></a>`).join('')}</div>${S.bg === 'image' ? `<div class="row"><a class="btn" data-act="bgImg"><i class="fa-solid fa-folder-open"></i> Choisir l'image</a>${S.bgImg ? `<small class="hint">${esc(S.bgImg.split('/').pop())}</small>` : ''}</div>` : ''}</section>`;
    else if (this.ptab === 'date') {
      const Hh = H(); const x = d.date; const dm = x.mode || 'none'; let dateUI = '';
      if (dm === 'horlogia' && Hh) { const HS = Hh.state(); const g = HS.groups.find(z => z.id === x.g) || HS.groups[0]; const cal = HS.calendars.find(z => z.id === (x.cal || g?.cal)) || HS.calendars[0]; const prec = x.prec || 'd'; const md = +cal?.months?.[+x.m || 0]?.days || 31;
        dateUI = `${HS.groups.length > 1 ? `<div class="row"><label class="grow">Groupe (calendrier)<select data-act="dgroup">${HS.groups.map(z => `<option value="${z.id}"${z.id === g?.id ? ' selected' : ''}>${esc(z.name)}</option>`).join('')}</select></label></div>` : ''}
          <div class="row"><span class="lbl">Précision</span>${seg('prec', prec, [['d', 'Jour'], ['m', 'Mois'], ['y', 'Année']], 'dprec')}</div>
          <div class="dpick"><a class="st" data-act="dstep" data-d="-1" data-tooltip="${{ d: 'Jour', m: 'Mois', y: 'Année' }[prec]} précédent${prec === 'y' ? 'e' : ''}"><i class="fa-solid fa-chevron-left"></i></a>${prec === 'd' ? `<input type="number" class="dd" data-act="dpart" data-k="d" min="1" max="${md}" value="${+x.d || 1}" data-tooltip="Jour">` : ''}${prec !== 'y' ? `<select data-act="dpart" data-k="m" data-tooltip="Mois">${(cal?.months || []).map((mo, i) => `<option value="${i}"${+x.m === i ? ' selected' : ''}>${esc(mo.name)}</option>`).join('')}</select>` : ''}<input type="number" class="yy" data-act="dpart" data-k="y" value="${+x.y || 0}" data-tooltip="Année"><a class="st" data-act="dstep" data-d="1" data-tooltip="${{ d: 'Jour', m: 'Mois', y: 'Année' }[prec]} suivant${prec === 'y' ? 'e' : ''}"><i class="fa-solid fa-chevron-right"></i></a></div>
          <div class="row"><a class="btn" data-act="dnow"><i class="fa-solid fa-calendar-day"></i> Aujourd'hui</a><span class="dl">${esc(dateLabel(d))}</span></div>
          <small class="hint">${prec === 'd' ? 'Journal du jour : il apparaît ce jour-là dans le calendrier d\'Horlogia.' : 'Daté au mois ou à l\'année : il se trie dans le Kiosque, mais n\'apparaît pas sur un jour du calendrier.'}</small>`; }
      else if (dm === 'manual') { const MN = monthsOf(calOf(x.cal));
        dateUI = `<div class="row"><label class="grow">Texte affiché<input type="text" data-act="dlabel" value="${esc(x.label || '')}" placeholder="ex. Printemps de l'an 1066"></label></div>
          <span class="lbl">Date pour le tri (facultative)</span>
          <div class="dpick"><input type="number" class="dd" data-act="dman" data-k="d" min="1" max="31" placeholder="Jour" value="${nn(x.d) ?? ''}"><select data-act="dman" data-k="m"><option value="">Mois…</option>${MN.map((n, i) => `<option value="${i}"${nn(x.m) === i ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select><input type="number" class="yy" data-act="dman" data-k="y" placeholder="Année" value="${nn(x.y) ?? ''}"></div>
          <small class="hint">Sans texte, c'est cette date qui s'affiche. Il faut au moins l'année pour que le journal se trie par date.</small>`; }
      body = `<section><h4>Date</h4><div class="row">${seg('dmode', dm, [['none', 'Aucune'], ...(Hh ? [['horlogia', 'Du jeu', 'fa-clock', 'Date du jeu (Horlogia) : visible dans le calendrier']] : []), ['manual', 'Libre', 'fa-pen', 'Texte libre, avec une date facultative pour le tri']])}</div>${dateUI}</section>
      <section><h4>Catégorie</h4><div class="g2"><label>Catégorie<select data-act="kind"><option value="">—</option>${kinds().map(k => `<option value="${esc(k.key)}"${d.kind === k.key ? ' selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label><label>Sous-catégorie<input type="text" data-act="dsub" value="${esc(d.sub || '')}" placeholder="ex. Faits divers"></label>
        <label class="full">Groupe MJ (univers)<select data-act="dgmg"><option value="">${gmgOf(d) && !d.gmg ? `Auto (date) : ${esc(gmGroupsAll().find(g => g.id === gmgOf(d))?.name || '')}` : 'Auto (selon la date)'}</option><option value="-"${d.gmg === '-' ? ' selected' : ''}>Aucun (tous les univers)</option>${gmGroupsAll().map(g => `<option value="${esc(g.id)}"${d.gmg === g.id ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>
        <label class="full">Tags<input type="text" data-act="dtags" value="${esc((d.tags || []).join(', '))}" placeholder="séparés par des virgules"></label></div><small class="hint">Les catégories sont les types d'entrées du Journal (clic droit sur une entrée › Type…).</small></section>`;
    }
    else if (this.ptab === 'acces') { const grp = groupList(); const sees = u => (own[u.id] ?? -1) >= lv.OBSERVER; const edits = u => (own[u.id] ?? -1) >= lv.OWNER; const all = (own.default ?? 0) >= lv.OBSERVER;
      body = `<section><h4>Qui peut le lire</h4>
        <div class="chips"><label class="chip all${all ? ' on' : ''}"><input type="checkbox" data-act="accAll"${all ? ' checked' : ''}>Tous les joueurs</label>${grp.map(g => `<label class="chip${(d.groups || []).includes(g.id) ? ' on' : ''}" style="--gc:${esc(g.color)}"><input type="checkbox" data-act="accGrp" value="${esc(g.id)}"${(d.groups || []).includes(g.id) ? ' checked' : ''}><i class="fa-solid ${g.icon}"></i>${esc(g.name)}<small>${g.users.length}</small></label>`).join('')}</div>
        <div class="chips">${players.map(u => `<label class="chip pl${sees(u) ? ' on' : ''}" style="--gc:${esc(u.color?.css ?? '#9fb0d4')}"><input type="checkbox" data-act="accUser" value="${u.id}"${sees(u) ? ' checked' : ''}>${esc(u.name)}</label>`).join('')}</div></section>
        <section><h4>Qui peut le modifier</h4><div class="chips">${players.map(u => `<label class="chip pl${edits(u) ? ' on' : ''}" style="--gc:${esc(u.color?.css ?? '#9fb0d4')}"><input type="checkbox" data-act="accEdit" value="${u.id}"${edits(u) ? ' checked' : ''}>${esc(u.name)}</label>`).join('')}</div>
        <small class="hint">Cocher un groupe donne l'accès à tous les joueurs de ses personnages. Les joueurs le retrouvent dans le Kiosque et le Journal.</small></section>`; }
    return `<aside class="sbc-panel"><nav class="sbc-ptabs">${tabs.map(([k, l, ic]) => `<a data-act="ptab" data-v="${k}" class="${this.ptab === k ? 'on' : ''}"><i class="fa-solid ${ic}"></i><span>${l}</span></a>`).join('')}</nav><div class="sbc-pbody">${body}</div></aside>`;
  }
  _onFirstRender(ctx, opts) { super._onFirstRender?.(ctx, opts); { const w = Math.round(innerWidth * 0.94), h = Math.round(innerHeight * 0.92); this.setPosition({ width: Math.min(w, 1500), height: h, left: Math.round((innerWidth - Math.min(w, 1500)) / 2), top: Math.round((innerHeight - h) / 2) }); } }
  _onRender(ctx, opts) {
    super._onRender?.(ctx, opts); const el = this.element; const gm = game.user.isGM; const ed = this.editing && this.canEdit;
    const hd = el.querySelector(':scope > .window-header'); hd?.querySelector('.sbc-hctl')?.remove();
    if (hd) { const s = document.createElement('span'); s.className = 'sbc-hctl';
      s.innerHTML = `${gm ? `<button type="button" data-act="show" data-tooltip="Montrer aux joueurs"><i class="fa-solid fa-share"></i><span>Montrer</span></button>` : ''}<button type="button" data-act="kiosk" data-tooltip="Kiosque : toutes les chroniques"><i class="fa-solid fa-store"></i></button>${this.canEdit ? `${ed ? `<button type="button" data-act="panel" class="${this.panel ? 'on' : ''}" data-tooltip="Couverture, modèle, catégorie, date, accès"><i class="fa-solid fa-sliders"></i><span>Réglages</span></button>` : ''}<button type="button" data-act="edit" class="${ed ? 'on' : ''}"><i class="fa-solid ${ed ? 'fa-check' : 'fa-pen'}"></i><span>${ed ? 'Terminé' : 'Modifier'}</span></button>` : ''}`;
      s.addEventListener('click', ev => { const a = ev.target.closest('[data-act]'); if (!a) return; ev.preventDefault(); ev.stopPropagation(); this.#act(a.dataset.act, a); });
      hd.querySelector('.window-title')?.after(s); }
    if (this._bound) return; this._bound = true;
    this._selH = () => { const sl = document.getSelection(); if (!sl?.rangeCount) return; const r = sl.getRangeAt(0); const n = r.commonAncestorContainer; const host = (n.nodeType === 1 ? n : n.parentElement)?.closest?.('[contenteditable="true"][data-b]'); if (host && this.element?.contains(host)) { this._rng = r.cloneRange(); this._ce = host; } };
    document.addEventListener('selectionchange', this._selH);
    el.addEventListener('click', ev => { 
      const xp = ev.target.closest('[data-xpop]'); if (xp) { ev.preventDefault(); return this.#xPop(xp); }
      
      if (ev.target.closest('[data-xreset]')) { ev.preventDefault(); return this.#xApply(sp => sp.removeAttribute('style'), ['font-family', 'font-size', 'color', 'background-color']); }
      const f = ev.target.closest('[data-fmt]'); if (f) { ev.preventDefault(); return this.#fmt(f.dataset.fmt); }
      const a = ev.target.closest('.window-content [data-act]'); if (!a || a.matches('input,select')) return; ev.preventDefault(); this.#act(a.dataset.act, a); });
    el.addEventListener('mousedown', ev => { if (ev.target.closest('[data-fmt], [data-xpop], [data-xc], [data-xreset]')) ev.preventDefault(); });   /* garder la sélection du texte */
    el.addEventListener('input', ev => { const t = ev.target; if (t.matches?.('[contenteditable][data-f],[contenteditable][data-b]')) { this.#grab(t); this.#later(); } else if (t.matches?.('input[type=range][data-act="set"]')) { const o = t.nextElementSibling; if (o?.tagName === 'OUTPUT') o.textContent = t.value + (t.dataset.unit || ''); this.#set(t.dataset.k, Number(t.value), true); } else if (t.matches?.('input[type=range][data-act="bRange"]')) this.#bLive(t); });
    el.addEventListener('change', ev => { const t = ev.target; const a = t.dataset?.act; if (!a) return; this.#change(a, t); });
    el.addEventListener('paste', ev => { if (!ev.target.closest?.('[contenteditable]')) return; const txt = ev.clipboardData?.getData('text/plain'); if (txt == null) return; ev.preventDefault(); document.execCommand('insertText', false, txt); });
    el.addEventListener('focusout', ev => { if (ev.target.matches?.('[contenteditable]')) this.#later(80); });
  }
  _onClose(o) { this.#xClosePop(); if (this._selH) document.removeEventListener('selectionchange', this._selH); this._selH = null; this._bound = false; return super._onClose?.(o); }
  /* 1.29.3 : la palette s'ouvre au-dessus de tout (dans <body>, position fixe) : plus jamais coupée par la fenêtre */
  #xClosePop() { document.querySelectorAll('body > .sbc-xpop').forEach(n => n.remove()); if (this._popOut) document.removeEventListener('mousedown', this._popOut, true); this._popOut = null; this._popFor = null; }
  #xPop(btn) { const k = btn.dataset.xpop; const again = this._popFor === k; this.#xClosePop(); if (again) return; this._popFor = k; const hl = k === 'hl'; try { game.tooltip?.deactivate?.(); } catch (e) { }
    const d = document.createElement('div'); d.className = 'sbc-xpop';
    d.innerHTML = `<b class="tt">${hl ? 'Surligner' : 'Couleur du texte'}</b><div class="sw">${(hl ? XHL : XTC).map(c => `<a data-xc="${c}" title="${c}" style="--c:${c}"></a>`).join('')}</div><div class="ft"><label><input type="color" data-xcustom value="${hl ? (this._xh || '#fff3a0') : (this._xc || '#8b1e1e')}"><span>Autre couleur…</span></label><a data-xc=""><i class="fa-solid fa-ban"></i><span>${hl ? 'Aucun surlignage' : 'Couleur par défaut'}</span></a></div>`;
    document.body.append(d); const br = btn.getBoundingClientRect(); const W = d.offsetWidth, Hh = d.offsetHeight;
    d.style.left = `${Math.max(6, Math.min(innerWidth - W - 6, br.left))}px`; d.style.top = `${br.bottom + 6 + Hh > innerHeight ? Math.max(6, br.top - Hh - 6) : br.bottom + 6}px`;
    d.addEventListener('mousedown', ev => { if (!ev.target.closest('input')) ev.preventDefault(); });
    d.addEventListener('click', ev => { const x = ev.target.closest('[data-xc]'); if (!x) return; ev.preventDefault(); this.#xClosePop(); this.#xColor(k, x.dataset.xc); });
    d.addEventListener('change', ev => { if (!ev.target.matches('[data-xcustom]')) return; const v = ev.target.value; this.#xClosePop(); this.#xColor(k, v); });
    this._popOut = ev => { if (!ev.target.closest('.sbc-xpop, [data-xpop]')) this.#xClosePop(); }; document.addEventListener('mousedown', this._popOut, true); }
  #xColor(k, v) { const p = k === 'hl' ? 'background-color' : 'color'; if (v) { if (k === 'hl') this._xh = v; else this._xc = v; const u = this.element.querySelector(`[data-xpop="${k}"] u`); if (u) u.style.background = v; }
    return this.#xApply(sp => { if (v) sp.style.setProperty(p, v); }, [p]); }
  /* entoure la sélection (ou tout le bloc) d'un <span class="sbcx" style="…"> ; les styles internes de même nature sont retirés */
  #xApply(fn, clear = []) {
    const ce = this._ce; if (!ce?.isConnected || !this.element?.contains(ce)) return ui.notifications.info('Clique d\'abord dans un texte, ou sélectionne les mots à modifier.');
    let r = this._rng; const sel = document.getSelection(); ce.focus({ preventScroll: true });
    if (!r || r.collapsed || !ce.contains(r.commonAncestorContainer)) { r = document.createRange(); r.selectNodeContents(ce); }
    sel.removeAllRanges(); sel.addRange(r);
    document.execCommand('styleWithCSS', false, false); document.execCommand('createLink', false, XMARK);
    let first = null, last = null;
    for (const a of [...ce.querySelectorAll(`a[href="${XMARK}"]`)]) { const sp = document.createElement('span'); sp.className = 'sbcx'; while (a.firstChild) sp.append(a.firstChild); a.replaceWith(sp);
      for (const d of [...sp.querySelectorAll('span.sbcx, span[style], font')]) { if (d.tagName === 'FONT') { unwrapEl(d); continue; } for (const p of clear) d.style.removeProperty(p); if (!d.getAttribute('style')?.trim()) unwrapEl(d); }
      fn(sp); let tg = sp;
      /* fusion : un seul <span> quand on enchaîne plusieurs styles sur le même texte */
      const ch = sp.childNodes.length === 1 ? sp.firstChild : null; if (ch?.nodeType === 1 && ch.classList.contains('sbcx')) { for (const p of [...ch.style]) if (!sp.style.getPropertyValue(p)) sp.style.setProperty(p, ch.style.getPropertyValue(p), ch.style.getPropertyPriority(p)); unwrapEl(ch); }
      const par = sp.parentElement; if (par?.classList.contains('sbcx') && par !== ce && par.childNodes.length === 1) { for (const p of clear) par.style.removeProperty(p); for (const p of [...sp.style]) par.style.setProperty(p, sp.style.getPropertyValue(p), sp.style.getPropertyPriority(p)); unwrapEl(sp); tg = par; }
      first ??= tg.firstChild; last = tg.lastChild; if (!tg.getAttribute('style')?.trim()) unwrapEl(tg); }
    if (first && last) { const nr = document.createRange(); nr.setStartBefore(first); nr.setEndAfter(last); sel.removeAllRanges(); sel.addRange(nr); this._rng = nr.cloneRange(); }
    ce.normalize(); this.#grab(ce); this.#later(); }
  #grab(t) { const d = this.data; if (t.dataset.f) { const k = t.dataset.f.split('.')[1]; d.cover[k] = t.textContent.trim(); return; }
    const b = d.blocks.find(x => x.id === t.dataset.b); if (!b) return; const k = t.dataset.k; b[k] = k === 'html' && !['h', 'lead', 'quote'].includes(b.t) ? t.innerHTML : (k === 'html' ? t.innerHTML : t.textContent.trim()); }
  #later(ms = 700) { this._dirty = true; const sv = this.element?.querySelector('[data-sv]'); if (sv) sv.textContent = 'Modifications…'; clearTimeout(this._t); this._t = setTimeout(() => this.#commit(), ms); }
  async #commit({ mirror = false } = {}) { clearTimeout(this._t); if (!this.canEdit) return; const d = this.data; const upd = { [`flags.${ID}.chron`]: foundry.utils.deepClone(d) }; const nm = String(d.cover.title || '').trim(); if (nm && nm !== this.document.name) upd.name = nm;
    this._saving = true; try { await this.document.update(upd, { sbcSelf: true }); if (mirror) await writeMirror(this.document, d); } finally { this._saving = false; }
    this._dirty = false; const sv = this.element?.querySelector('[data-sv]'); if (sv) sv.textContent = 'Enregistré'; }
  async #struct(fn) { for (const t of this.element.querySelectorAll('[contenteditable]')) this.#grab(t); fn(this.data); this._dirty = true; await this.render(); this.#later(200); }
  #set(k, v, live = false) { const c = this.data.cover; c[k] = v; if (live) { const fr = this.element.querySelector('.sbc-cover'); const img = fr?.querySelector('.sbc-cimg'); if (img && ['fx', 'fy', 'zoom'].includes(k)) { img.style.backgroundPosition = `${+c.fx || 50}% ${+c.fy || 50}%`; img.style.transformOrigin = `${+c.fx || 50}% ${+c.fy || 50}%`; img.style.transform = `scale(${(+c.zoom || 100) / 100})`; const lb = this.element.querySelector('.sbc-cpick b'); if (lb) lb.textContent = `${+c.zoom || 100} %`; } if (k === 'dim') fr?.style.setProperty('--dim', (+c.dim || 0) / 100); this.#later(); return; } this.#struct(x => { x.cover[k] = v; }); }
  #bLive(t) { const b = this.data.blocks.find(x => x.id === t.closest('[data-bid]')?.dataset.bid); if (!b) return; b[t.dataset.k] = Number(t.value); const im = t.closest('[data-bid]').querySelector('.ib img'); if (im) { im.style.objectPosition = `${+b.fx || 50}% ${+b.fy || 50}%`; im.style.transformOrigin = `${+b.fx || 50}% ${+b.fy || 50}%`; im.style.transform = `scale(${(+b.zoom || 100) / 100})`; } this.#later(); }
  #fmt(cmd) { if (cmd === 'h3' || cmd === 'p') return document.execCommand('formatBlock', false, cmd === 'h3' ? 'H3' : 'P'); if (cmd === 'createLink') { const u = prompt('Adresse du lien (https://…) ou @UUID[…]'); if (u) document.execCommand('createLink', false, u); return; } document.execCommand(cmd, false, null); const t = document.activeElement; if (t?.matches?.('[contenteditable]')) { this.#grab(t); this.#later(); } }
  async #change(a, t) {
    if (a === 'xFont') { const v = t.value; t.value = ''; return this.#xApply(sp => { if (FS(v)) sp.style.setProperty('font-family', FS(v), 'important'); }, ['font-family']); }
    if (a === 'xSize') { const v = t.value; t.value = ''; if (!v) return; return this.#xApply(sp => { if (v !== '0') sp.style.setProperty('font-size', v); }, ['font-size']); }
    const d = this.data;
    if (a === 'set') { const v = t.type === 'range' ? Number(t.value) : t.value; return this.#struct(x => { x.cover[t.dataset.k] = v; }); }
    if (a === 'bColor') { const b = d.blocks.find(x => x.id === t.closest('[data-bid]').dataset.bid); return this.#struct(() => { b.color = t.value; }); }
    const bk = () => d.blocks.find(x => x.id === t.closest('[data-bid]')?.dataset.bid);
    if (a === 'st') { const k = t.dataset.k, v = t.value; return this.#struct(x => { x.st = { ...stOf(x), [k]: v }; if (k === 'tf') x.cover.font = ''; }); }
    if (a === 'bFont') { const b = bk(); return this.#struct(() => { b.font = t.value; }); }
    if (a === 'bTcol') { const b = bk(); return this.#struct(() => { b.color = t.value; }); }
    if (a === 'bRange') { this.#bLive(t); return this.#struct(() => {}); }
    if (a === 'kind') return this.#struct(x => { x.kind = t.value; });
    if (a === 'dgmg') return this.#struct(x => { x.gmg = t.value; });
    if (a === 'dsub') return this.#struct(x => { x.sub = t.value.trim(); });
    if (a === 'dtags') return this.#struct(x => { x.tags = t.value.split(',').map(s => s.trim()).filter(Boolean); });
    if (a === 'dlabel') return this.#struct(x => { x.date.label = t.value.trim(); });
    if (a === 'dman') return this.#struct(x => { x.date[t.dataset.k] = nn(t.value); });
    if (a === 'dgroup') { const Hh = H(); const n = Hh.now(t.value); return this.#struct(x => { x.date = { mode: 'horlogia', prec: x.date.prec || 'd', g: n.group.id, cal: n.cal.id, y: n.date.y, m: n.date.m, d: n.date.d }; relabel(x); }); }
    if (a === 'dpart') { const Hh = H(); const S = Hh.state(); return this.#struct(x => { x.date[t.dataset.k] = Number(t.value); const cal = S.calendars.find(c => c.id === x.date.cal) || S.calendars[0]; const md = +cal?.months?.[+x.date.m || 0]?.days || 31; x.date.d = Math.max(1, Math.min(md, +x.date.d || 1)); relabel(x); }); }
    if (['accAll', 'accGrp', 'accUser', 'accEdit'].includes(a)) return this.#access(a, t);
  }
  async #access(a, t) {
    const lv = L(); const own = foundry.utils.deepClone(this.document.ownership || {}); const d = this.data;
    if (a === 'accAll') own.default = t.checked ? Math.max(own.default ?? 0, lv.OBSERVER) : lv.NONE;
    if (a === 'accGrp') { const set = new Set(d.groups || []); t.checked ? set.add(t.value) : set.delete(t.value); d.groups = [...set]; const us = usersOfGroups([t.value]); for (const u of us) if (t.checked) own[u] = Math.max(own[u] ?? -1, lv.OBSERVER); else if ((own[u] ?? -1) === lv.OBSERVER && !usersOfGroups(d.groups).includes(u)) own[u] = lv.INHERIT; }
    if (a === 'accUser') { if (t.checked) own[t.value] = Math.max(own[t.value] ?? -1, lv.OBSERVER); else own[t.value] = lv.INHERIT; }
    if (a === 'accEdit') { own[t.value] = t.checked ? lv.OWNER : lv.OBSERVER; }
    for (const tt of this.element.querySelectorAll('[contenteditable]')) this.#grab(tt);
    await this.document.update({ ownership: own, [`flags.${ID}.chron`]: foundry.utils.deepClone(d) }, { sbcSelf: true }); this._dirty = false; this.render();
  }
  async #act(a, el) {
    const d = this.data; const bid = el?.closest?.('[data-bid]')?.dataset.bid; const bi = d.blocks.findIndex(x => x.id === bid);
    switch (a) {
      case 'edit': if (this.editing) { for (const t of this.element.querySelectorAll('[contenteditable]')) this.#grab(t); await this.#commit({ mirror: true }); this.editing = false; this.panel = false; } else this.editing = true; return this.render();
      case 'panel': this.panel = !this.panel; return this.render();
      case 'show': return showDialog(this.document);
      case 'kiosk': return Kiosk.open();
      case 'zoom': return new foundry.applications.apps.ImagePopout({ src: el.getAttribute('src'), window: { title: this.document.name } }).render(true);
      case 'coverImg': return pickImage(d.cover.img, p => this.#struct(x => { x.cover.img = p; }));
      case 'coverClr': return this.#struct(x => { x.cover.img = ''; });
      case 'set': return this.#struct(x => { if (el.dataset.k === 'dmode') { const m = el.dataset.v; if (m === 'horlogia') { const n = H().now(); x.date = { mode: m, prec: x.date.prec || 'd', g: n.group.id, cal: n.cal.id, y: n.date.y, m: n.date.m, d: n.date.d }; relabel(x); } else x.date = { ...x.date, mode: m, label: m === 'manual' ? (x.date.mode === 'manual' ? x.date.label : '') : '' }; } else x.cover[el.dataset.k] = el.dataset.v; });
      case 'dnow': { const n = H().now(d.date.g); return this.#struct(x => { x.date = { mode: 'horlogia', prec: x.date.prec || 'd', g: n.group.id, cal: n.cal.id, y: n.date.y, m: n.date.m, d: n.date.d }; relabel(x); }); }
      case 'ptab': this.ptab = el.dataset.v; return this.render();
      case 'dprec': return this.#struct(x => { x.date.prec = el.dataset.v; relabel(x); });
      case 'dstep': return this.#struct(x => { stepDate(x.date, Number(el.dataset.d)); relabel(x); });
      case 'coverReset': return this.#struct(x => { x.cover.fx = 50; x.cover.fy = 50; x.cover.zoom = 100; });
      case 'layout': return this.#struct(x => { x.layout = el.dataset.v; });
      case 'insMenu': return this.#insMenu(el, Number(el.dataset.at));
      case 'bUp': if (bi > 0) return this.#struct(x => { [x.blocks[bi - 1], x.blocks[bi]] = [x.blocks[bi], x.blocks[bi - 1]]; }); return;
      case 'bDown': if (bi >= 0 && bi < d.blocks.length - 1) return this.#struct(x => { [x.blocks[bi + 1], x.blocks[bi]] = [x.blocks[bi], x.blocks[bi + 1]]; }); return;
      case 'bDup': return this.#struct(x => { x.blocks.splice(bi + 1, 0, { ...foundry.utils.deepClone(x.blocks[bi]), id: uid() }); });
      case 'bDel': if (!await DialogV2.confirm({ window: { title: 'Supprimer le bloc' }, content: `<p>Supprimer ce bloc « ${esc(BLOCKS[d.blocks[bi]?.t]?.[0] || '')} » ?</p>`, classes: ['sbm-dialog'] })) return; return this.#struct(x => { x.blocks.splice(bi, 1); });
      case 'bImg': return pickImage(d.blocks[bi]?.src, p => this.#struct(x => { x.blocks[bi].src = p; }));
      case 'bPos': return this.#struct(x => { x.blocks[bi].pos = el.dataset.v; });
      case 'czoom': return this.#struct(x => { x.cover.zoom = Math.max(50, Math.min(300, (+x.cover.zoom || 100) + Number(el.dataset.d))); });
      case 'bSize': return this.#struct(x => { x.blocks[bi].size = el.dataset.v === 'm' ? '' : el.dataset.v; });
      case 'bTclr': return this.#struct(x => { x.blocks[bi].color = ''; });
      case 'bStyleClr': return this.#struct(x => { const B = x.blocks[bi]; B.font = ''; B.size = ''; if (B.t !== 'box') B.color = ''; });
      case 'stClr': return this.#struct(x => { x.st = { ...stOf(x), [el.dataset.k]: '' }; });
      case 'paper': return this.#struct(x => { x.st = { ...stOf(x), paper: el.dataset.v, pcol: '' }; });
      case 'back': return this.#struct(x => { x.st = { ...stOf(x), bg: el.dataset.v }; });
      case 'bgImg': return pickImage(stOf(d).bgImg, p => this.#struct(x => { x.st = { ...stOf(x), bg: 'image', bgImg: p }; }));
      case 'bCols': return this.#struct(x => { x.blocks[bi].n = Number(el.dataset.v); });
    }
  }
  #insMenu(el, at) {
    document.querySelector('.sbc-insmenu')?.remove(); const m = document.createElement('div'); m.className = 'sbc-insmenu';
    m.innerHTML = Object.entries(BLOCKS).map(([k, [n, ic]]) => `<a data-t="${k}"><i class="fa-solid ${ic}"></i>${n}</a>`).join('');
    const r = el.getBoundingClientRect(); m.style.left = `${Math.min(r.left, innerWidth - 240)}px`; m.style.top = `${Math.min(r.bottom + 4, innerHeight - 330)}px`; document.body.append(m);
    const off = e => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } }; setTimeout(() => document.addEventListener('pointerdown', off, true));
    m.addEventListener('click', e => { const a = e.target.closest('[data-t]'); if (!a) return; m.remove(); document.removeEventListener('pointerdown', off, true); this.#struct(x => { x.blocks.splice(at, 0, blank(a.dataset.t)); }); });
  }
  async close(o = {}) { if (this.editing && this.canEdit && this.element) { for (const t of this.element.querySelectorAll('[contenteditable]')) this.#grab(t); if (this._dirty) await this.#commit({ mirror: true }).catch(e => console.error(ID, e)); } this.editing = false; this.panel = false; return super.close(o); }
  /* les mises à jour du document (les nôtres pendant la saisie) ne redessinent pas la fiche en cours de modification : le curseur reste en place */
  render(options = {}, _o) { const ctx = (options && typeof options === 'object' ? options.renderContext : null) ?? _o?.renderContext; if (ctx && this.editing && this.rendered) return this; return super.render(options, _o); }
}
const dayLabel = (cal, dt) => `${dt.d} ${cal?.months?.[dt.m]?.name || ''} ${dt.y}`.trim();
function pickImage(cur, cb) { new (FP())({ type: 'image', current: cur || '', callback: p => cb(p) }).render(true); }
/* copie lisible (page texte « Chronique ») pour Foundry sans le module */
async function writeMirror(e, d) {
  const html = `<h1>${esc(d.cover.title)}</h1>${d.cover.sub ? `<p><em>${esc(d.cover.sub)}</em></p>` : ''}${dateLabel(d) ? `<p><small>${esc(dateLabel(d))}</small></p>` : ''}${d.cover.img ? `<p><img src="${esc(d.cover.img)}"></p>` : ''}` + d.blocks.map(b => b.t === 'h' ? `<h2>${b.html}</h2>` : b.t === 'lead' ? `<p><strong>${b.html}</strong></p>` : b.t === 'quote' ? `<blockquote>${b.html}<br>${esc(b.who || '')}</blockquote>` : b.t === 'img' ? (b.src ? `<p><img src="${esc(b.src)}"><br><em>${esc(b.cap || '')}</em></p>` : '') : b.t === 'sep' ? '<hr>' : (b.html || '')).join('');
  const p = e.pages.find(x => x.getFlag(ID, 'role') === 'chron');
  if (p) await p.update({ 'text.content': html }); else await e.createEmbeddedDocuments('JournalEntryPage', [{ name: 'Chronique', type: 'text', text: { format: 1, content: html }, flags: { [ID]: { role: 'chron' } } }]);
}

/* ── création ── */
export async function createChronicle(folderId = null) {
  if (!game.user.isGM && !game.user.can('JOURNAL_CREATE')) return ui.notifications.warn('Tu ne peux pas créer de journal.');
  const r = await DialogV2.wait({ window: { title: 'Nouvelle chronique', icon: 'fa-solid fa-newspaper' }, classes: ['sbm-dialog', 'sbc-newdlg'], position: { width: 560 }, rejectClose: false,
    content: `<div class="sbm-panel"><label>Gros titre<input type="text" name="n" value="" placeholder="ex. Un dragon aperçu au-dessus du port" autofocus></label>
      <div class="sbc-lays">${Object.entries(LAYOUTS).map(([k, l], i) => `<label class="l-${k}"><input type="radio" name="lay" value="${k}"${i ? '' : ' checked'}><i class="fa-solid ${l[1]}"></i><b>${l[0]}</b><small>${l[2]}</small></label>`).join('')}</div>
      <div class="sbc-orsel"><label><input type="radio" name="or" value="portrait" checked><i class="fa-solid fa-image-portrait"></i> Couverture portrait</label><label><input type="radio" name="or" value="landscape"><i class="fa-solid fa-panorama"></i> Couverture paysage</label></div>
      ${H() ? `<label class="sbc-today"><input type="checkbox" name="today" checked> <i class="fa-solid fa-calendar-day"></i> Journal du jour (date d'Horlogia, visible dans le calendrier)</label>` : ''}</div>`,
    buttons: [{ action: 'ok', label: 'Créer', icon: 'fa-solid fa-plus', default: true, callback: (ev, btn) => { const f = btn.form; return { n: f.elements.n.value.trim() || 'Nouvelle chronique', lay: f.querySelector('[name="lay"]:checked')?.value || 'gazette', or: f.querySelector('[name="or"]:checked')?.value || 'portrait', today: !!f.elements.today?.checked }; } }, { action: 'cancel', label: 'Annuler' }] });
  if (!r || r === 'cancel') return null;
  const d = defaultChron(r.n); d.layout = r.lay; d.cover.orient = r.or; d.cover.mast = { gazette: 'LA GAZETTE', carnet: 'Carnet de bord', lettre: 'Correspondance', rapport: 'RAPPORT', avis: 'AVIS' }[r.lay];
  { const all = gmGroupsAll(); const n0 = H()?.now?.(); d.gmg = n0 && all.some(g => g.id === n0.group?.id) ? n0.group.id : all.length === 1 ? all[0].id : ''; }
  if (r.today && H()) { const n = H().now(); d.date = { mode: 'horlogia', g: n.group.id, cal: n.cal.id, y: n.date.y, m: n.date.m, d: n.date.d, label: dayLabel(n.cal, n.date) }; }
  const e = await JournalEntry.create({ name: r.n, folder: folderId, flags: { [ID]: { chron: d }, core: { sheetClass: `${ID}.ChronicleSheet` } }, pages: [{ name: 'Chronique', type: 'text', text: { format: 1, content: '' }, flags: { [ID]: { role: 'chron' } } }] });
  if (e) { const s = e.sheet; if (s instanceof ChronicleSheet) { s.editing = true; s.panel = true; } s.render(true); }
  return e;
}

/* ── montrer aux joueurs : fenêtre presque plein écran, à fermer d'un clic ── */
export async function showDialog(e) {
  if (!game.user.isGM) return; const players = game.users.filter(u => !u.isGM); const grp = groupList();
  const r = await DialogV2.wait({ window: { title: `Montrer — ${e.name}`, icon: 'fa-solid fa-share' }, classes: ['sbm-dialog', 'sbc-showdlg'], position: { width: 560 }, rejectClose: false,
    content: `<div class="sbm-panel"><label class="chip all on"><input type="checkbox" name="all" checked> Tous les joueurs connectés</label>
      ${grp.length ? `<h4>Groupes</h4><div class="chips">${grp.map(g => `<label class="chip" style="--gc:${esc(g.color)}"><input type="checkbox" name="g" value="${esc(g.id)}"><i class="fa-solid ${g.icon}"></i>${esc(g.name)}</label>`).join('')}</div>` : ''}
      <h4>Joueurs</h4><div class="chips">${players.map(u => `<label class="chip" style="--gc:${esc(u.color?.css ?? '#9fb0d4')}"><input type="checkbox" name="u" value="${u.id}">${esc(u.name)}${u.active ? '' : ' <small>(hors ligne)</small>'}</label>`).join('')}</div>
      <label class="sbc-perm"><input type="checkbox" name="perm" checked> Leur donner l'accès : ils pourront le relire dans le Kiosque</label></div>`,
    render: (ev, dlg) => { const el = dlg.element ?? dlg; el.addEventListener('change', x => { if (x.target.name === 'g' || x.target.name === 'u') { if (x.target.checked) el.querySelector('[name="all"]').checked = false; } el.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', !!c.querySelector('input')?.checked)); }); },
    buttons: [{ action: 'ok', label: 'Montrer', icon: 'fa-solid fa-share', default: true, callback: (ev, btn) => { const f = btn.form; return { all: f.elements.all.checked, g: [...f.querySelectorAll('[name="g"]:checked')].map(i => i.value), u: [...f.querySelectorAll('[name="u"]:checked')].map(i => i.value), perm: f.elements.perm.checked }; } }, { action: 'cancel', label: 'Annuler' }] });
  if (!r || r === 'cancel') return;
  const users = r.all ? players.map(u => u.id) : [...new Set([...usersOfGroups(r.g), ...r.u])];
  if (!users.length) return ui.notifications.warn('Personne n\'est choisi (ou les groupes n\'ont pas de joueur).');
  if (r.perm) { const lv = L(); const own = { ...(e.ownership || {}) }; if (r.all) own.default = Math.max(own.default ?? 0, lv.OBSERVER); else for (const id of users) own[id] = Math.max(own[id] ?? -1, lv.OBSERVER); await e.update({ ownership: own }, { sbcSelf: true }); }
  const d = chronOf(e); game.socket.emit(SOCKET, { t: 'chronShow', id: e.id, users, name: e.name, chron: d });
  ui.notifications.info(`« ${e.name} » montré à ${users.map(id => game.users.get(id)?.name).filter(Boolean).join(', ')}.`);
}
export async function showOverlay({ id, name, chron }) {
  document.getElementById('sbc-show')?.remove(); const e = game.journal.get(id); const d = (e && chronOf(e)) || chron; if (!d) return;
  const o = document.createElement('div'); o.id = 'sbc-show'; o.className = 'sbc-show';
  o.innerHTML = `<div class="sbc-showbox"><div class="sbc-showhd"><i class="fa-solid fa-newspaper"></i><b>${esc(name || e?.name || '')}</b><small>Le MJ te montre ce journal</small></div><div class="sbc-scroll ${backdropClass(d)}" style="${backdropStyle(d)}">${await chronHTML(d, { rel: e })}</div><button type="button" class="sbc-close"><i class="fa-solid fa-check"></i> J'ai lu — fermer</button></div>`;
  document.body.append(o); requestAnimationFrame(() => o.classList.add('in'));
  o.querySelector('.sbc-close').addEventListener('click', () => { o.classList.remove('in'); setTimeout(() => o.remove(), 250); });
  o.addEventListener('click', ev => { const z = ev.target.closest('[data-act="zoom"]'); if (z) new foundry.applications.apps.ImagePopout({ src: z.getAttribute('src'), window: { title: name } }).render(true); });
}

/* ── Kiosque (1.29) : filtres Année / Mois / Jour cumulables, regroupement par date, liste compacte ou grille S / M / L ── */
const KPREF = 'sbc-kiosk-prefs';
export class Kiosk extends ApplicationV2 {
  static DEFAULT_OPTIONS = { id: 'sbc-kiosk', classes: ['sbc-kioskapp'], window: { title: 'Kiosque', icon: 'fa-solid fa-store', resizable: true }, position: { width: 1100, height: 780 } };
  static open() { const a = foundry.applications.instances.get('sbc-kiosk') || new Kiosk(); a.render({ force: true }); return a; }
  q = ''; cat = ''; gmg = null; sort = 'date'; view = 'grid'; sz = 's'; grp = 'none'; fy = ''; fm = ''; fd = '';
  constructor(...a) { super(...a); try { const p = JSON.parse(localStorage.getItem(KPREF) || '{}'); for (const k of ['cat', 'sort', 'view', 'sz', 'grp', 'fy', 'fm', 'fd']) if (p[k] != null) this[k] = String(p[k]); } catch (e) { }
    if (!['grid', 'list'].includes(this.view)) this.view = 'grid'; if (!['s', 'm', 'l'].includes(this.sz)) this.sz = 's'; if (!['none', 'y', 'm', 'd'].includes(this.grp)) this.grp = 'none'; if (!['date', 'old', 'name'].includes(this.sort)) this.sort = 'date'; }
  savePrefs() { try { localStorage.setItem(KPREF, JSON.stringify({ cat: this.cat, sort: this.sort, view: this.view, sz: this.sz, grp: this.grp, fy: this.fy, fm: this.fm, fd: this.fd })); } catch (e) { } }
  list() { return game.journal.filter(e => isChron(e) && (game.user.isGM || e.testUserPermission(game.user, 'OBSERVER'))).map(e => { const d = chronOf(e); return { e, d, p: dateParts(d) }; }); }
  async _renderHTML() {
    const gm = game.user.isGM; const q = this.q.toLowerCase(); let L0 = this.list();
    const cats = kinds().filter(k => L0.some(x => x.d.kind === k.key));
    /* groupes MJ (univers) : onglets ; un joueur ne voit que les siens, et arrive sur le sien s'il n'en a qu'un */
    const G = gmGroupsMine(); if (this.gmg === null) this.gmg = !gm && G.length === 1 ? G[0].id : ''; if (this.gmg && this.gmg !== '-' && !G.some(g => g.id === this.gmg)) this.gmg = '';
    if (!gm) L0 = L0.filter(x => { const g = gmgOf(x.d); return !g || G.some(y => y.id === g); });
    const nOf = id => L0.filter(x => (gmgOf(x.d) || '-') === id).length;
    const cal = calOf(); const MN = monthsOf(cal); const maxD = Math.max(28, ...(cal?.months || []).map(m => +m.days || 0), cal ? 0 : 31);
    const { fy, fm, fd } = this; const hasF = fy !== '' || fm !== '' || fd !== '';
    const okDate = p => { if (fy === 'none') return !p; if (!hasF) return true; if (!p) return false; if (fy !== '' && p.y !== +fy) return false; if (fm !== '' && p.m !== +fm) return false; if (fd !== '' && p.d !== +fd) return false; return true; };
    const Lf = L0.filter(({ e, d, p }) => (!q || `${e.name} ${d.cover.sub} ${d.cover.mast} ${d.sub} ${(d.tags || []).join(' ')} ${dateLabel(d)}`.toLowerCase().includes(q)) && (!this.cat || d.kind === this.cat) && (!this.gmg || (gmgOf(d) || '-') === this.gmg) && okDate(p));
    const ct = x => x.e._stats?.createdTime || 0; const dir = this.sort === 'old' ? 1 : -1;
    Lf.sort((a, b) => { if (this.sort === 'name') return a.e.name.localeCompare(b.e.name, 'fr'); const ka = dateKey(a.p), kb = dateKey(b.p); if (ka == null && kb != null) return 1; if (kb == null && ka != null) return -1; return dir * ((ka ?? 0) - (kb ?? 0)) || dir * (ct(a) - ct(b)); });
    const years = [...new Set(L0.map(x => x.p?.y).filter(v => v != null))].sort((a, b) => b - a); if (fy !== '' && fy !== 'none' && !years.includes(+fy)) years.unshift(+fy);
    const shared = e => (e.ownership?.default ?? 0) >= L().OBSERVER || game.users.some(u => !u.isGM && (e.ownership?.[u.id] ?? 0) >= L().OBSERVER);
    const card = ({ e, d }) => { const k = kinds().find(x => x.key === d.kind); const sh = shared(e); const S = stOf(d); const c = d.cover;
      /* la carte reprend le papier, l'encre, les polices, l'accent et le cadrage de la chronique */
      const vars = `--acc:${esc(c.accent || '#8b1e1e')};--tf:${fontOf(d)};${S.pcol ? `--paper:${esc(S.pcol)};` : ''}${S.ink ? `--ink:${esc(S.ink)};--rule:${esc(S.ink)};` : ''}${FS(S.bf) ? `--body:${FS(S.bf)};` : ''}`;
      const pic = c.img ? `<i class="ci" style="background-image:url(&quot;${esc(c.img)}&quot;);background-position:${+c.fx || 50}% ${+c.fy || 50}%;transform:scale(${(+c.zoom || 100) / 100});transform-origin:${+c.fx || 50}% ${+c.fy || 50}%"></i>` : '';
      return `<a class="sbc-kc ${c.orient === 'landscape' ? 'land' : 'port'} ${backdropClass(d)}" data-id="${e.id}" style="${backdropStyle(d)}"><div class="sbc-kp l-${esc(d.layout)}${S.paper ? ` pp-${esc(S.paper)}` : ''}${S.pcol ? ' pcol' : ''}" style="${vars}"><div class="pic">${pic}<span class="mast"${FS(S.mf) ? ` style="font-family:${FS(S.mf)}"` : ''}>${esc(c.mast || '')}</span>${gm ? `<i class="fa-solid ${sh ? 'fa-eye' : 'fa-eye-slash'} vis" data-tooltip="${sh ? 'Visible par des joueurs' : 'MJ seulement'}"></i>` : ''}</div><div class="inf"><b>${esc(e.name)}</b>${c.sub ? `<em class="sb">${esc(c.sub)}</em>` : ''}${dateLabel(d) ? `<small><i class="fa-solid fa-calendar-day"></i>${esc(dateLabel(d))}</small>` : ''}${k ? `<span class="cat" style="--kc:${esc(k.color)}"><i class="fa-solid ${esc(k.icon)}"></i>${esc(k.name)}${d.sub ? ` · ${esc(d.sub)}` : ''}</span>` : d.sub ? `<span class="cat">${esc(d.sub)}</span>` : ''}</div></div></a>`; };
    const row = ({ e, d }) => { const k = kinds().find(x => x.key === d.kind); const sh = shared(e); const S = stOf(d); const c = d.cover; const pc = S.pcol || PAPERS[S.paper]?.[1] || '#f4ecd8'; const dl = dateLabel(d);
      return `<a class="sbc-kr" data-id="${e.id}"><span class="th" style="--pc:${esc(pc)};${c.img ? `background-image:url(&quot;${esc(c.img)}&quot;);background-position:${+c.fx || 50}% ${+c.fy || 50}%` : ''}">${c.img ? '' : `<i class="fa-solid ${esc(LAYOUTS[d.layout]?.[1] || 'fa-newspaper')}"></i>`}</span><span class="nm"><b>${esc(e.name)}</b><small>${esc(c.mast || '')}${c.sub ? ` · ${esc(c.sub)}` : ''}</small></span><span class="dt">${dl ? `<i class="fa-solid fa-calendar-day"></i>${esc(dl)}` : '<em>Sans date</em>'}</span><span class="ct">${k ? `<span class="cat" style="--kc:${esc(k.color)}"><i class="fa-solid ${esc(k.icon)}"></i>${esc(k.name)}</span>` : ''}${d.sub ? `<small>${esc(d.sub)}</small>` : ''}</span>${gm ? `<i class="fa-solid ${sh ? 'fa-eye on' : 'fa-eye-slash'} vis" data-tooltip="${sh ? 'Visible par des joueurs' : 'MJ seulement'}"></i>` : '<i></i>'}</a>`; };
    const items = l => this.view === 'list' ? `<div class="sbc-klist">${l.map(row).join('')}</div>` : `<div class="sbc-kgrid sz-${this.sz}">${l.map(card).join('')}</div>`;
    let body;
    if (!Lf.length) body = `<p class="sbc-none"><i class="fa-solid fa-newspaper"></i> ${L0.length ? 'Aucune chronique ne correspond.' : gm ? 'Aucune chronique pour l\'instant : crée la première avec « Nouvelle chronique ».' : 'Aucune chronique ne t\'a encore été partagée.'}</p>`;
    else if (this.grp !== 'none') {
      const trunc = p => p ? { y: p.y, m: this.grp === 'y' ? null : p.m, d: this.grp === 'd' && p.m != null ? p.d : null } : null;
      const by = new Map(); for (const x of Lf) { const t = trunc(x.p); const key = t ? `${t.y}|${t.m ?? ''}|${t.d ?? ''}` : '~'; if (!by.has(key)) by.set(key, { t, l: [] }); by.get(key).l.push(x); }
      const secs = [...by.values()].sort((a, b) => a.t == null ? 1 : b.t == null ? -1 : (this.sort === 'old' ? 1 : -1) * (dateKey(a.t) - dateKey(b.t)));
      body = secs.map(({ t, l }) => `<section class="sbc-dsec"><h3><i class="fa-solid ${t ? 'fa-calendar-day' : 'fa-circle-question'}"></i>${t ? esc(t.m == null ? `Année ${t.y}` : partsLabel(t, cal)) : 'Sans date'}<small>${l.length}</small></h3>${items(l)}</section>`).join(''); }
    else if (!this.gmg && G.length > 0) { const secs = [...G.map(g => ({ id: g.id, name: g.name, color: g.color, icon: g.icon })), { id: '-', name: 'Tous les univers', color: '#b9a882', icon: 'fa-globe' }].map(g => ({ g, l: Lf.filter(x => (gmgOf(x.d) || '-') === g.id) })).filter(x => x.l.length);
      body = secs.map(({ g, l }) => `<section class="sbc-gsec" style="--gc:${esc(g.color || '#e8dcc0')}"><h3><i class="fa-solid ${esc(g.icon || 'fa-people-group')}"></i>${esc(g.name)}<small>${l.length}</small></h3>${items(l)}</section>`).join(''); }
    else body = items(Lf);
    const segA = (k, list) => `<span class="seg">${list.map(([v, l, tip]) => `<a data-set="${k}" data-v="${v}" class="${this[k] === v ? 'on' : ''}"${tip ? ` data-tooltip="${tip}"` : ''}>${l}</a>`).join('')}</span>`;
    const opt = (v, l, cur) => `<option value="${v}"${String(cur) === String(v) ? ' selected' : ''}>${esc(l)}</option>`;
    return `<div class="sbc-kiosk"><header class="sbc-khd"><div class="brand"><i class="fa-solid fa-newspaper"></i><b>Kiosque</b><small>${L0.length}</small></div>
      <label class="srch"><i class="fa-solid fa-magnifying-glass"></i><input type="search" data-k="q" value="${esc(this.q)}" placeholder="Chercher un titre, un tag…"></label>
      <select data-k="cat" data-tooltip="Catégorie"><option value="">Toutes catégories</option>${cats.map(k => opt(k.key, k.name, this.cat)).join('')}</select>
      <select data-k="sort" data-tooltip="Trier">${[['date', 'Plus récents'], ['old', 'Plus anciens'], ['name', 'Nom (A → Z)']].map(([k, l]) => opt(k, l, this.sort)).join('')}</select>
      <select data-k="grp" data-tooltip="Regrouper par date">${[['none', 'Sans regroupement'], ['y', 'Par année'], ['m', 'Par mois'], ['d', 'Par jour']].map(([k, l]) => opt(k, l, this.grp)).join('')}</select>
      ${segA('view', [['grid', '<i class="fa-solid fa-grip"></i>', 'Grille'], ['list', '<i class="fa-solid fa-list"></i>', 'Liste compacte']])}${this.view === 'grid' ? segA('sz', [['s', 'S', 'Petites cartes'], ['m', 'M', 'Cartes moyennes'], ['l', 'L', 'Grandes cartes']]) : ''}
      ${gm || game.user.can('JOURNAL_CREATE') ? `<a class="new" data-new data-tooltip="Nouvelle chronique"><i class="fa-solid fa-plus"></i><span>Nouvelle</span></a>` : ''}</header>
      <div class="sbc-kfl${hasF ? ' act' : ''}"><span class="lb"><i class="fa-solid fa-calendar-days"></i>Date</span>
      <select data-k="fd"${fy === 'none' ? ' disabled' : ''}>${opt('', 'Tous les jours', fd)}${Array.from({ length: maxD }, (_, i) => opt(i + 1, i + 1, fd)).join('')}</select>
      <select data-k="fm"${fy === 'none' ? ' disabled' : ''}>${opt('', 'Tous les mois', fm)}${MN.map((n, i) => opt(i, n, fm)).join('')}</select>
      <select data-k="fy">${opt('', 'Toutes les années', fy)}${years.map(y => opt(y, y, fy)).join('')}${opt('none', 'Sans date', fy)}</select>
      ${H() ? `<a class="tb" data-today data-tooltip="Journaux du jour actuel du jeu"><i class="fa-solid fa-calendar-day"></i>Aujourd'hui</a>` : ''}${hasF ? `<a class="tb clr" data-clr data-tooltip="Effacer les filtres de date"><i class="fa-solid fa-xmark"></i>Effacer</a>` : ''}
      <span class="cnt">${Lf.length === L0.length ? `${L0.length} chronique${L0.length > 1 ? 's' : ''}` : `${Lf.length} sur ${L0.length}`}</span></div>
      ${G.length ? `<nav class="sbc-gtabs"><a data-gmg="" class="${!this.gmg ? 'on' : ''}" style="--gc:#e8dcc0"><i class="fa-solid fa-layer-group"></i>Tous<em>${L0.length}</em></a>${G.map(g => `<a data-gmg="${esc(g.id)}" class="${this.gmg === g.id ? 'on' : ''}" style="--gc:${esc(g.color || '#ffc63d')}"><i class="fa-solid ${esc(g.icon || 'fa-people-group')}"></i>${esc(g.name)}<em>${nOf(g.id)}</em></a>`).join('')}${nOf('-') ? `<a data-gmg="-" class="${this.gmg === '-' ? 'on' : ''}" style="--gc:#b9a882"><i class="fa-solid fa-globe"></i>Tous les univers<em>${nOf('-')}</em></a>` : ''}</nav>` : ''}<div class="sbc-kbody">${body}</div></div>`;
  }
  _replaceHTML(r, c) { const st = c.querySelector('.sbc-kbody')?.scrollTop || 0; const f = document.activeElement?.dataset?.k === 'q'; c.innerHTML = r; const b = c.querySelector('.sbc-kbody'); if (b) b.scrollTop = st; if (f) { const i = c.querySelector('[data-k="q"]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    if (c.dataset.bound) return; c.dataset.bound = '1';
    c.addEventListener('click', ev => { const k = ev.target.closest('.sbc-kc, .sbc-kr'); if (k) { ev.preventDefault(); return game.journal.get(k.dataset.id)?.sheet.render(true); }
      const gt = ev.target.closest('[data-gmg]'); if (gt) { this.gmg = gt.dataset.gmg; return this.render(); }
      const s = ev.target.closest('[data-set]'); if (s) { this[s.dataset.set] = s.dataset.v; this.savePrefs(); return this.render(); }
      if (ev.target.closest('[data-today]')) { try { const n = H().now(); this.fy = String(n.date.y); this.fm = String(n.date.m); this.fd = String(n.date.d); } catch (e) { } this.savePrefs(); return this.render(); }
      if (ev.target.closest('[data-clr]')) { this.fy = this.fm = this.fd = ''; this.savePrefs(); return this.render(); }
      if (ev.target.closest('[data-new]')) return createChronicle(); });
    c.addEventListener('input', foundry.utils.debounce(ev => { if (ev.target.dataset.k === 'q') { this.q = ev.target.value; this.render(); } }, 200));
    c.addEventListener('change', ev => { const k = ev.target.dataset.k; if (!k || k === 'q') return; this[k] = ev.target.value; if (k === 'fy' && this.fy === 'none') this.fm = this.fd = ''; this.savePrefs(); this.render(); }); }
}

/* ── branchements ── */
Hooks.once('init', () => {
  const DSC = foundry.applications.apps?.DocumentSheetConfig ?? DocumentSheetConfig;
  DSC.registerSheet(JournalEntry, ID, ChronicleSheet, { label: 'Chronique (journal illustré)', makeDefault: false });
});
Hooks.once('ready', () => {
  fontsLink();
  game.socket.on(SOCKET, m => { if (m?.t === 'chronShow' && (m.users || []).includes(game.user.id)) showOverlay(m); });
  const Hh = H(); if (Hh?.registerDayItems) Hh.registerDayItems(({ group, cal, y, m, d }) => game.journal.filter(e => { if (!isChron(e)) return false; if (!game.user.isGM && !e.testUserPermission(game.user, 'OBSERVER')) return false; const x = e.getFlag(ID, 'chron')?.date; return x?.mode === 'horlogia' && (x.prec || 'd') === 'd' && +x.y === y && +x.m === m && +x.d === d && (x.cal || cal.id) === cal.id && (!x.g || x.g === group.id); })
    .map(e => { const c = chronOf(e); const k = kinds().find(z => z.key === c.kind); return { id: `chron:${e.id}`, name: e.name, icon: 'fa-newspaper', color: k?.color || c.cover.accent || '#e8dcc0', sub: k?.name || c.cover.mast, open: () => e.sheet.render(true) }; }));
  globalThis.SidebarManhwaChronicles = { create: createChronicle, kiosk: () => Kiosk.open(), show: showDialog, isChron, chronOf };
});
/* le calendrier d'Horlogia et le Kiosque suivent les chroniques ; une fiche ouverte se met à jour (sauf la nôtre pendant la saisie) */
const touch = e => { if (!isChron(e)) return; for (const a of foundry.applications.instances.values()) { if (a.id === 'horlogia' || a.id === 'sbc-kiosk') a.render(); } };
Hooks.on('createJournalEntry', touch); Hooks.on('deleteJournalEntry', touch);
Hooks.on('updateJournalEntry', (e, ch, opts, userId) => { touch(e); const s = e.sheet; if (s instanceof ChronicleSheet && s.rendered && !(opts?.sbcSelf && userId === game.user.id) && !s._dirty) s.render(); });
/* bouton « Chronique » et « Kiosque » dans l'onglet Journal */
Hooks.on('renderJournalDirectory', (app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0]; const actions = root?.querySelector(':scope > .directory-header .header-actions') ?? root?.querySelector('.directory-header .header-actions'); if (!actions || actions.querySelector('.sbc-newbtn')) return;
  const mk = (cls, ic, t, tip, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = `<i class="fa-solid ${ic}"></i><span>${t}</span>`; b.dataset.tooltip = tip; b.addEventListener('click', fn); return b; };
  if (game.user.isGM || game.user.can('JOURNAL_CREATE')) actions.append(mk('sbc-newbtn', 'fa-newspaper', 'Chronique', 'Nouvelle chronique : journal illustré (couverture, gros titre, articles, date du jeu)', () => createChronicle()));
  actions.append(mk('sbc-kbtn', 'fa-store', 'Kiosque', 'Toutes les chroniques, en couvertures ou en frise', () => Kiosk.open()));
});
