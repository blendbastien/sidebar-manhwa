/* Sidebar Manhwa — images de la barre latérale (fonds des cartes de dossiers, vignettes des scènes, objets, acteurs, journal)
 * 1. réduites une fois pour toutes (1.16.1) : l'image d'origine (souvent plusieurs Mo) est ramenée à une vignette
 *    (720 px pour les fonds de cartes, 256 px pour les vignettes des entrées), gardée en mémoire (URL blob)
 *    et dans le cache du navigateur (Cache Storage) → plus de relecture ni de décodage de l'image géante ;
 * 2. préparées à l'avance (1.16.2) : pendant les temps morts, toutes les images des onglets sont préparées, y compris
 *    celles des dossiers fermés → quand on ouvre un dossier, ses images sont déjà là (avant : elles ne se chargeaient
 *    qu'après le clic, à cause du chargement différé de Foundry). */
const CACHE = "sidebar-manhwa-vignettes-v1", BG_W = 720, IMG_W = 256;
const READY = new Map();   /* clé (url|largeur) → url à afficher (blob de la vignette, ou l'originale si on ne peut pas réduire) */
const PENDING = new Map(); /* clé → promesse */
const KEEP = [];           /* vignettes de fond décodées gardées en mémoire (petites) pour un affichage instantané */
const K = (u, w) => `${w}|${u}`;
let IO = null;
const io = () => IO ||= new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { show(e.target); IO.unobserve(e.target); } }, { rootMargin: "250px 0px" });
const cssUrl = u => `url("${String(u).replace(/["\\]/g, "\\$&")}")`;
const keyOf = (u, w) => { try { const x = new URL(u, location.href); x.searchParams.set("sbm-vignette", String(w)); return x.href; } catch (e) { return null; } };

async function makeThumb(url, W) {
  const key = keyOf(url, W); let cache = null;
  try { cache = await caches.open(CACHE); const hit = key && await cache.match(key); if (hit) return hit.headers.get("x-sbm-small") ? url : URL.createObjectURL(await hit.blob()); } catch (e) { cache = null; }
  const small = async () => { if (cache && key) { try { await cache.put(key, new Response("", { headers: { "x-sbm-small": "1" } })); } catch (e) {} } return url; };   /* retenu : pas besoin de la retélécharger la prochaine fois */
  const img = new Image(); img.crossOrigin = "anonymous"; img.decoding = "async"; img.src = url;
  try { await img.decode(); } catch (e) { return url; }   /* pas de CORS ou image cassée : on garde l'originale */
  const nw = img.naturalWidth, nh = img.naturalHeight; if (!nw || !nh) return url;
  const s = W / Math.max(nw, W === IMG_W ? nh : 0); if (s >= 0.83) return small();   /* déjà petite */
  const w = Math.max(1, Math.round(nw * s)), h = Math.max(1, Math.round(nh * s));
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d"); g.imageSmoothingQuality = "high";
  try { g.drawImage(img, 0, 0, w, h); } catch (e) { return url; }
  const blob = await new Promise(res => { try { cv.toBlob(res, "image/webp", W === IMG_W ? 0.86 : 0.82); } catch (e) { res(null); } });
  if (!blob) return url;
  if (cache && key) { try { await cache.put(key, new Response(blob, { headers: { "content-type": "image/webp" } })); } catch (e) {} }
  return URL.createObjectURL(blob);
}
function thumb(url, W = BG_W) { const k = K(url, W);
  if (READY.has(k)) return Promise.resolve(READY.get(k));
  if (!PENDING.has(k)) PENDING.set(k, makeThumb(url, W).catch(() => url).then(t => { READY.set(k, t); PENDING.delete(k); if (t !== url && W === BG_W) { const i = new Image(); i.src = t; KEEP.push(i); } return t; }));
  return PENDING.get(k);
}

/* ── fonds des cartes (variables CSS) ── */
function apply(el, v, u) { const t = READY.get(K(u, BG_W)); if (t) { el.style.setProperty(v, cssUrl(t)); return true; } return false; }
function show(el) { const v = el.dataset.lzv, u = el.dataset.lzu; if (!v || !u) return; el.removeAttribute("data-lzv"); el.removeAttribute("data-lzu");
  if (apply(el, v, u)) return; el.dataset.lzw = u; thumb(u).then(() => { if (el.dataset.lzw === u) { el.removeAttribute("data-lzw"); apply(el, v, u); } }); }
/** attributs à mettre sur un élément construit en HTML */
export const lzAttr = (varName, url) => url ? ` data-lzv="${varName}" data-lzu="${String(url).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"` : "";
/** pour un élément déjà dans la page */
export function lzSet(el, varName, url) { if (!el) return; el.removeAttribute("data-lzw");
  if (!url) { el.style.removeProperty(varName); el.removeAttribute("data-lzv"); el.removeAttribute("data-lzu"); return; }
  if (apply(el, varName, url)) { el.removeAttribute("data-lzv"); el.removeAttribute("data-lzu"); return; }
  el.dataset.lzv = varName; el.dataset.lzu = url; io().observe(el); queue(() => thumb(url).then(() => { if (el.dataset.lzu === url) show(el); })); }
/** cherche les éléments en attente dans un bloc */
export function lazyScan(root) { if (!root?.querySelectorAll) return; const l = root.matches?.("[data-lzu]") ? [root, ...root.querySelectorAll("[data-lzu]")] : root.querySelectorAll("[data-lzu]");
  for (const el of l) { const u = el.dataset.lzu; if (READY.has(K(u, BG_W))) show(el); else { io().observe(el); queue(() => thumb(u).then(() => { if (el.dataset.lzu === u) show(el); })); } } }

/* ── vignettes des entrées (img) : remplacées par leur version réduite, préparées même dans les dossiers fermés ── */
const IMG_SEL = "img.thumbnail, img.sbj-thumb, img.journal-thumbnail";
function srcOf(img) { return img.dataset.sbmo || img.getAttribute("src") || ""; }
function swap(img, u, t) { if (srcOf(img) !== u) return; img.loading = "eager"; if (t && t !== u) { img.dataset.sbmo = u; img.decoding = "sync"; if (img.getAttribute("src") !== t) img.src = t; } }   /* chargée tout de suite, même dans un dossier fermé ; petite vignette peinte dès la 1re image */
function warmImgs(root) { if (!root?.querySelectorAll) return; const list = root.matches?.(IMG_SEL) ? [root] : root.querySelectorAll(IMG_SEL);
  for (const img of list) { const u = srcOf(img); if (!u || /^(data|blob):/.test(u)) continue; const k = K(u, IMG_W);
    if (READY.has(k)) { swap(img, u, READY.get(k)); continue; }
    if (/\/base64data\/|\/thumbs?\//i.test(u)) { img.loading = "eager"; continue; }   /* miniatures de scène générées par Foundry : déjà petites */
    queue(() => thumb(u, IMG_W).then(t => { swap(img, u, t); for (const o of document.querySelectorAll(IMG_SEL)) if (o !== img && srcOf(o) === u) swap(o, u, t); }), img.offsetParent ? 0 : 1); } }
/** prépare toutes les images d'un bloc (fonds + vignettes) */
export function prewarm(root) { lazyScan(root); warmImgs(root); }

/* ── file d'attente : 6 à la fois, les images visibles d'abord, le reste pendant les temps morts ── */
const Q = [[], []]; let running = 0;
function queue(job, pri = 1) { Q[pri].push(job); pump(); }
function pump() { while (running < 6) { const job = Q[0].shift() || Q[1].shift(); if (!job) return; running++;
  const go = () => Promise.resolve().then(job).catch(() => {}).finally(() => { running--; pump(); });
  if (Q[0].length) go(); else setTimeout(go, 0); } }

/** oublie la vignette d'UNE image (1.19.1) : quand une image est remplacée sous le même chemin (ré-upload), la vignette en cache serait l'ancienne */
const BUSTED = new Map();
/** l'url à afficher pour une image : avec un cache-buster si elle a été remplacée pendant la session */
export const bust = url => { const t = BUSTED.get(url); return t ? url + (url.includes("?") ? "&" : "?") + "sbm=" + t : url; };
export async function forgetThumb(url) { if (!url) return; BUSTED.set(url, Date.now()); for (const W of [BG_W, IMG_W]) { const k = K(url, W); const t = READY.get(k); READY.delete(k); PENDING.delete(k); if (t && t !== url) { try { URL.revokeObjectURL(t); } catch (e) {} } }
  try { const cache = await caches.open(CACHE); for (const W of [BG_W, IMG_W]) { const key = keyOf(url, W); if (key) await cache.delete(key); } } catch (e) {}
  /* images déjà affichées avec cette source : on remet l'originale (avec un cache-buster) pour qu'elles se rafraîchissent */
  const b = bust(url);
  for (const img of document.querySelectorAll(IMG_SEL)) if (srcOf(img) === url) { delete img.dataset.sbmo; img.src = b; } }
/** vide les vignettes (après changement d'une image, par exemple) */
export async function clearThumbs() { READY.clear(); try { await caches.delete(CACHE); } catch (e) {} }
/* tout ce qui apparaît dans la barre latérale est pris en charge automatiquement */
Hooks.once("ready", () => { const sb = document.getElementById("sidebar") || document.body; prewarm(sb);
  /* liste des playlists : ses fonds passent déjà par lzSet → on ne la reparcourt pas à chaque lecture (la vue filtrée .sbm-view reste prise en charge) */
  const skip = n => { const pl = ui.playlists?.element; return pl instanceof HTMLElement && pl.contains(n) && !n.closest(".sbm-view"); };
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && !skip(n) && (n.dataset?.lzu || n.matches?.(IMG_SEL) || n.querySelector?.(`[data-lzu], ${IMG_SEL}`))) prewarm(n); }).observe(sb, { childList: true, subtree: true }); });
