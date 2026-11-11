/* Interface Manhwa 1.24 — navigation des scènes et fondu entre les cartes.
 * Remplace Aeris Scene Fade (fondu vers une couleur à chaque changement de scène) et reprend les fonctions de
 * Monk's Scene Navigation utilisées : dossiers dans la barre des scènes (MJ), bouton Retour (scène précédente),
 * vrai nom pour le MJ, clic = afficher / double-clic = activer dans l'onglet Scènes, icônes « active » et
 * « accès joueurs », repli de la barre pendant un combat. Aucune scène n'est modifiée. */
const ID = 'sidebar-manhwa';
const get = (k, d) => { try { return game.settings.get(ID, k); } catch (e) { return d; } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- réglages ---------------- */
Hooks.once('init', () => {
  const reg = (k, o) => game.settings.register(ID, k, o);
  const rr = () => ui.nav?.render();
  reg('fadeOn', { name: 'Scènes : fondu entre les cartes', hint: 'L\'écran passe en fondu à chaque changement de scène (remplace Aeris Scene Fade).', scope: 'world', config: true, type: Boolean, default: true });
  reg('fadeMs', { name: 'Scènes : durée du fondu (secondes)', scope: 'world', config: true, type: Number, default: 1, range: { min: 0.3, max: 3, step: 0.1 } });
  reg('fadeColor', { name: 'Scènes : couleur du fondu', hint: 'Code couleur, ex. #000000 (noir) ou #ffffff (blanc).', scope: 'world', config: true, type: String, default: '#000000' });
  reg('fadeGm', { name: 'Scènes : fondu aussi pour le MJ', scope: 'world', config: true, type: Boolean, default: true });
  reg('fadeName', { name: 'Scènes : nom de la scène pendant le fondu', scope: 'world', config: true, type: Boolean, default: false });
  reg('navFolders', { name: 'Barre des scènes : dossiers (MJ)', hint: 'Toutes les scènes, rangées comme dans l\'onglet Scènes ; clic sur un dossier pour l\'ouvrir.', scope: 'world', config: true, type: Boolean, default: true, onChange: rr });
  reg('navRealName', { name: 'Barre des scènes : vrai nom pour le MJ', hint: 'Le nom de navigation reste en infobulle.', scope: 'world', config: true, type: Boolean, default: true, onChange: rr });
  reg('navBack', { name: 'Barre des scènes : bouton Retour', hint: 'Remonte d\'un dossier dans la barre des scènes.', scope: 'world', config: true, type: Boolean, default: true, onChange: rr });
  reg('navCombat', { name: 'Barre des scènes : repliée pendant un combat', scope: 'world', config: true, type: Boolean, default: true });
  reg('dirClickView', { name: 'Onglet Scènes : clic = afficher, double-clic = activer', hint: 'Au lieu d\'ouvrir la configuration (clic droit › Configurer reste disponible).', scope: 'world', config: true, type: Boolean, default: true });
  reg('dirIcons', { name: 'Onglet Scènes : cadre néon vert sur la scène active, icône « accès joueurs »', scope: 'world', config: true, type: Boolean, default: true, onChange: () => ui.scenes?.render() });
});

/* ---------------- fondu ---------------- */
let OV = null;
function overlay() {
  if (OV?.isConnected) return OV;
  OV = document.createElement('div'); OV.id = 'sbm-fade'; OV.innerHTML = '<b></b>';
  const board = document.getElementById('board'); if (board) board.after(OV); else document.body.appendChild(OV);
  return OV;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
function fadeOn() { return get('fadeOn', true) && (!game.user.isGM || get('fadeGm', true)); }
Hooks.once('setup', () => {
  const Scene = foundry.documents.Scene; const orig = Scene.prototype.view;
  Scene.prototype.view = async function (...args) {
    if (!fadeOn() || !canvas?.ready || game.scenes.viewed?.id === this.id) return orig.apply(this, args);
    const ms = Math.round(Math.max(0.3, Math.min(3, Number(get('fadeMs', 1)) || 1)) * 1000); const ov = overlay();
    ov.style.setProperty('--sbm-fc', get('fadeColor', '#000000') || '#000000'); ov.style.setProperty('--sbm-fd', `${ms}ms`);
    ov.querySelector('b').textContent = get('fadeName', false) ? (this.navName || this.name) : '';
    ov.classList.remove('out'); ov.classList.add('on'); void ov.offsetWidth; ov.classList.add('in');
    const pre = game.scenes.preload?.(this.id); await wait(ms); try { await pre; } catch (e) { /* rien */ }
    let r; try { r = await orig.apply(this, args); } finally { ov.classList.remove('in'); ov.classList.add('out'); setTimeout(() => { if (!ov.classList.contains('in')) ov.classList.remove('on', 'out'); }, ms + 50); }
    return r;
  };
});

/* ---------------- barre des scènes (1.25) ----------------
 * MJ : on parcourt les dossiers en descendant (un dossier remplace la liste, « Retour » remonte d'un niveau) :
 * tout reste dans le coin, en colonne, sans barre de défilement horizontale. « Carte actuelle » = la scène activée. */
let FOLD = null;   /* dossier affiché dans la barre (null = racine) */
const byOrder = (a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name, 'fr');
function sceneLi(s) {
  const gm = game.user.isGM; const real = gm && get('navRealName', true);
  const name = real ? s.name : (s.navName || s.name); const tip = real && s.navName && s.navName !== s.name ? s.navName : (gm && s.navName ? s.name : '');
  const cls = ['ui-control', 'scene', s.isView ? 'view' : '', s.active ? 'active' : '', s.ownership?.default === 0 ? 'gm' : '', s.navigation ? '' : 'sbm-nonav'].filter(Boolean).join(' ');
  return `<li class="${cls}" data-scene-id="${s.id}" data-action="viewScene"${tip ? ` data-tooltip="${esc(tip)}"` : ''}><span class="scene-name ellipsis">${esc(name)}</span></li>`;
}
const countIn = f => game.scenes.filter(s => { let c = s.folder; while (c) { if (c.id === f.id) return true; c = c.folder; } return false; }).length;
function folderLi(f) {
  const n = countIn(f); if (!n) return ''; const col = f.color?.css ?? f.color ?? '';
  return `<li class="ui-control folder sbm-nf" data-sbm-folder="${f.id}"${col ? ` style="--fc:${esc(col)}"` : ''}><span class="folder-name ellipsis"><i class="fa-solid fa-folder"></i>${esc(f.name)}</span><em>${n}</em></li>`;
}
function drawFolders(menu) {
  const cur = FOLD && game.folders.get(FOLD); if (FOLD && !cur) FOLD = null;
  const subs = game.folders.filter(f => f.type === 'Scene' && (f.folder?.id ?? null) === (cur?.id ?? null)).sort(byOrder);
  const scenes = game.scenes.filter(s => (s.folder?.id ?? null) === (cur?.id ?? null)).sort(byOrder);
  const back = cur && get('navBack', true) ? `<a class="sbm-nav-back" data-tooltip="Retour : ${esc(cur.folder?.name || 'toutes les cartes')}"><i class="fa-solid fa-arrow-left" inert></i></a>` : '';
  const head = `<li class="sbm-nav-head">${back}<span class="sbm-nav-crumb"${cur ? ' data-tooltip="Refermer le dossier"' : ''}>${cur ? `<i class="fa-solid fa-folder-open"></i>${esc(cur.name)}` : '<i class="fa-solid fa-map"></i>Toutes les cartes'}</span></li>`;
  menu.innerHTML = head + subs.map(folderLi).join('') + scenes.map(sceneLi).join('');
  menu.scrollTop = 0;
}
function decorateNav(root) {
  if (!root) return; root.classList.add('sbm-nav'); root.querySelector('#sbm-nav-prev')?.remove();
  /* « Carte actuelle » au-dessus de la scène activée */
  root.querySelector('.sbm-nav-lbl')?.remove();
  const act = root.querySelector('#scene-navigation-active');
  if (act && act.querySelector('li.scene.active')) act.insertAdjacentHTML('beforebegin', '<div class="sbm-nav-lbl"><i class="fa-solid fa-location-dot"></i>Carte actuelle</div>');
  /* vrai nom (MJ) */
  if (game.user.isGM && get('navRealName', true)) for (const li of root.querySelectorAll('li.scene[data-scene-id]')) {
    const s = game.scenes.get(li.dataset.sceneId); const nm = li.querySelector('.scene-name'); if (!s || !nm) continue;
    if (s.navName && s.navName !== s.name) { nm.textContent = s.name; li.dataset.tooltip = s.navName; }
  }
  if (!game.user.isGM || !get('navFolders', true)) return;
  let menu = root.querySelector('#scene-navigation-inactive');
  if (!menu) { menu = document.createElement('menu'); menu.id = 'scene-navigation-inactive'; menu.className = 'scene-navigation-menu flexcol'; root.append(menu); }
  menu.classList.add('sbm-nf-root'); drawFolders(menu);
  root.querySelector('#scene-navigation-expand')?.removeAttribute('hidden');
  if (!menu.dataset.sbmBound) {
    menu.dataset.sbmBound = '1';
    menu.addEventListener('click', ev => {
      if (ev.target.closest('li.scene')) return;   /* l'action « viewScene » de Foundry s'en charge */
      const back = ev.target.closest('.sbm-nav-back') || (FOLD && ev.target.closest('.sbm-nav-crumb')); const f = ev.target.closest('li.sbm-nf'); if (!back && !f) return;
      ev.preventDefault(); ev.stopPropagation();
      FOLD = back ? (game.folders.get(FOLD)?.folder?.id ?? null) : f.dataset.sbmFolder; drawFolders(menu);
    });
  }
}
Hooks.on('renderSceneNavigation', (app, html) => { try { decorateNav(html instanceof HTMLElement ? html : app.element); } catch (e) { console.error(`${ID} | navigation`, e); } });
for (const h of ['createFolder', 'updateFolder', 'deleteFolder']) Hooks.on(h, f => { if (f.type === 'Scene' && game.user.isGM && get('navFolders', true)) ui.nav?.render(); });
Hooks.on('updateScene', (s, ch) => { if (game.user.isGM && get('navFolders', true) && ['name', 'folder', 'navName', 'sort'].some(k => k in (ch ?? {}))) ui.nav?.render(); });
for (const h of ['createScene', 'deleteScene']) Hooks.on(h, () => { if (game.user.isGM && get('navFolders', true)) ui.nav?.render(); });

/* repliée pendant un combat */
let WAS_OPEN = null;
Hooks.on('combatStart', () => { if (!get('navCombat', true) || !ui.nav) return; WAS_OPEN = ui.nav.expanded; ui.nav.collapse(); });
Hooks.on('deleteCombat', () => { if (!get('navCombat', true) || !ui.nav) return; if (WAS_OPEN) ui.nav.expand(); WAS_OPEN = null; });

/* ---------------- onglet Scènes ---------------- */
Hooks.once('setup', () => {
  const SD = foundry.applications.sidebar.tabs.SceneDirectory; if (!SD) return; const proto = SD.prototype; const orig = proto._onClickEntry;
  proto._onClickEntry = async function (event, target, options) {
    if (game.user.isGM && get('dirClickView', true) && !event?.shiftKey && !event?.ctrlKey && !event?.metaKey) {
      const id = target?.closest?.('[data-entry-id]')?.dataset.entryId; const s = id && game.scenes.get(id);
      if (s) { event.preventDefault?.(); return s.view(); }
    }
    return orig.call(this, event, target, options);
  };
});
function decorateDir(root) {
  if (!root || !game.user.isGM) return;
  if (get('dirClickView', true) && !root.dataset.sbmDbl) {
    root.dataset.sbmDbl = '1';
    root.addEventListener('dblclick', ev => { const li = ev.target.closest('li.directory-item.scene[data-entry-id], li.scene[data-entry-id]'); if (!li || !get('dirClickView', true)) return; ev.preventDefault(); ev.stopPropagation(); game.scenes.get(li.dataset.entryId)?.activate(); });
  }
  root.querySelectorAll('.sbm-scico').forEach(e => e.remove());
  if (!get('dirIcons', true)) return;
  for (const li of root.querySelectorAll('li.directory-item.scene[data-entry-id]')) {
    const s = game.scenes.get(li.dataset.entryId); if (!s) continue; li.classList.toggle('sbm-active', !!s.active);
    const own = s.ownership || {}; const def = own.default ?? 0; const special = Object.entries(own).some(([k, v]) => k !== 'default' && v > def && v > 0 && game.users.get(k) && !game.users.get(k).isGM);   /* le MJ créateur est toujours propriétaire : on l'ignore */
    const ic = [];
    if (def > 0 || special) ic.push(`<i class="fa-solid ${special ? 'fa-user-lock' : 'fa-users'}" data-tooltip="${special ? 'Accès réglé joueur par joueur' : 'Visible des joueurs'}"></i>`);
    if (!ic.length) continue;
    const host = li.querySelector('.entry-name, .document-name, a') || li;
    host.insertAdjacentHTML('beforeend', `<span class="sbm-scico">${ic.join('')}</span>`);
  }
}
Hooks.on('renderSceneDirectory', (app, html) => { try { decorateDir(html instanceof HTMLElement ? html : app.element); } catch (e) { console.error(`${ID} | onglet scènes`, e); } });
Hooks.on('updateScene', (s, ch) => { if (('active' in (ch ?? {}) || 'ownership' in (ch ?? {})) && ui.scenes?.rendered) decorateDir(ui.scenes.element); });
