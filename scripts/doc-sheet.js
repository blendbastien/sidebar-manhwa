/* Sidebar Manhwa — fiche « Document » façon Roll20 pour les entrées de journal
   Vue : image, description, notes du MJ (MJ seulement), boutons « Montrer aux joueurs » et « Modifier ».
   Édition : nom, joueurs qui le voient, joueurs qui peuvent le modifier, type et tags, image, description, notes du MJ ; dupliquer, archiver, supprimer.
   Les données restent des pages Foundry normales (Image / Description / Notes du MJ), lisibles aussi avec la fiche d'origine. */
import { POS_LIST } from './journal.js';
import { forgetThumb, bust } from './lazy.js';
const ID = 'sidebar-manhwa';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PAGES = { img: 'Image', desc: 'Description', gm: 'Notes du MJ' };
const L = () => CONST.DOCUMENT_OWNERSHIP_LEVELS;
const kinds = () => globalThis.SidebarManhwaJournal?.kinds?.() ?? [];
/* fonds de fiche (choix par journal, réglage par défaut dans les paramètres du module) */
export const BACKGROUNDS = { nuit: 'Nuit (bleu profond)', crepuscule: 'Crépuscule (violet)', braise: 'Braise (rouge ambré)', abysse: 'Abysse (bleu-vert)', emeraude: 'Émeraude', acier: 'Acier (gris bleuté)', aurore: 'Aurore (rose doré)', image: 'Image du journal, assombrie' };
const dimOf = e => { const d = Number(e.getFlag(ID, 'bgDim')); return Number.isFinite(d) && e.getFlag(ID, 'bgDim') !== undefined ? d : Number(game.settings.get(ID, 'docBgDim') ?? 65); };
/* esthétique de la fiche (1.19) : Manhwa (sombre) ou Roll20 (claire et plate) ; « auto » suit le mode des dossiers de la barre latérale */
export const DOC_STYLES = { auto: 'Comme la barre latérale (Roll20 si les dossiers sont en « Full Roll20 »)', manhwa: 'Manhwa (sombre, fonds au choix)', roll20: 'Roll20 (claire et plate)' };
const docStyle = () => { const v = game.settings.get(ID, 'docStyle') || 'auto'; return v === 'auto' ? (game.settings.get(ID, 'jFolderMode') === 'roll20' ? 'roll20' : 'manhwa') : v; };
export const refreshDocSheets = () => { for (const a of foundry.applications.instances.values()) if (a instanceof RollDocSheet) a.render(); };
const bgOf = e => { const b = e.getFlag(ID, 'bg'); return BACKGROUNDS[b] ? b : (game.settings.get(ID, 'docBg') || 'nuit'); };

const { DocumentSheetV2 } = foundry.applications.api;
const FP = () => foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;
const enrich = (html, opts) => (foundry.applications?.ux?.TextEditor?.implementation ?? TextEditor).enrichHTML(html ?? '', opts);

export class RollDocSheet extends DocumentSheetV2 {
  static DEFAULT_OPTIONS = { classes: ['sbd-sheet'], window: { resizable: true, icon: 'fa-solid fa-file-lines', controls: [] }, position: { width: 560, height: 640 }, form: { submitOnChange: false, closeOnSubmit: false } };
  constructor(...a) { super(...a); this.editing = false; }
  get title() { return this.document.name; }
  get entry() { return this.document; }
  page(key) { const ps = this.entry.pages.contents; return ps.find(p => p.getFlag(ID, 'role') === key) ?? ps.find(p => p.name === PAGES[key] && (key === 'img' ? p.type === 'image' : p.type === 'text')) ?? (key === 'desc' ? ps.find(p => p.type === 'text' && !ps.some(q => q.getFlag(ID, 'role') === 'gm' && q.id === p.id) && p.name !== PAGES.gm) ?? null : key === 'img' ? ps.find(p => p.type === 'image') ?? null : null); }
  get canEdit() { return this.entry.isOwner; }
  /* la fiche gère elle-même l'enregistrement : le bouton « enregistrer » de l'éditeur de texte (disquette) passe par ici et enregistre sans quitter l'édition */
  _onSubmitForm(config, event) { event?.preventDefault?.(); }
  /* fermer avec la croix pendant la modification : on enregistre, et la prochaine ouverture montre le document (plus le formulaire) */
  async close(options = {}) {
    if (this.editing && this.canEdit && this.element?.querySelector('.sbd-form') && !options.sbdNoSave) { try { await this.#save(true, true); } catch (err) { console.error(ID, err); } }
    this.editing = false; return super.close(options);
  }
  _onRender(context, options) { super._onRender?.(context, options); const b = bgOf(this.entry); this.element.dataset.sbdBg = b; this.element.classList.toggle('sbd-r20', docStyle() === 'roll20'); const img = this.page('img')?.src || ''; this.element.style.setProperty('--sbd-img', img ? `url("${bust(img).replace(/"/g, '%22')}")` : 'none'); this.element.style.setProperty('--sbd-dim', String(dimOf(this.entry) / 100));
    const hd = this.element.querySelector(':scope > .window-header'); if (hd) { hd.querySelector('.sbd-hctl')?.remove(); const s = document.createElement('span'); s.className = 'sbd-hctl'; s.innerHTML = this._head || ''; s.addEventListener('click', ev => { const a = ev.target.closest('[data-act]'); if (!a) return; ev.preventDefault(); ev.stopPropagation(); this.#act(a.dataset.act, a); }); s.addEventListener('pointerdown', ev => ev.stopPropagation()); const ctl = hd.querySelector('.header-control'); hd.insertBefore(s, ctl || null); } }

  async _renderHTML() {
    const e = this.entry; const gm = game.user.isGM;
    const img = this.page('img')?.src || e.getFlag(ID, 'img') || '';
    const desc = this.page('desc')?.text?.content || '';
    const notes = this.page('gm')?.text?.content || '';
    const kind = kinds().find(k => k.key === e.getFlag(ID, 'kind'));
    const tags = (e.getFlag(ID, 'tags') || []);
    if (this.editing && this.canEdit) { this._head = `<span class="sbd-editing"><i class="fa-solid fa-pen"></i> Modification</span>`; return this.#editHTML(e, img, desc, notes, kind, tags); }
    const [descH, notesH] = await Promise.all([enrich(desc, { secrets: e.isOwner, relativeTo: e }), gm ? enrich(notes, { secrets: true, relativeTo: e }) : '']);
    const shared = (e.ownership?.default ?? 0) >= L().OBSERVER || game.users.some(u => !u.isGM && (e.ownership?.[u.id] ?? 0) >= L().OBSERVER);
    /* plus de seconde barre : type, visibilité et boutons vont dans l'en-tête de la fenêtre (voir _onRender) */
    this._head = `${kind ? `<span class="sbd-kind" style="--c:${esc(kind.color)}"><i class="fa-solid ${esc(kind.icon)}"></i>${esc(kind.name)}</span>` : ''}${gm ? `<i class="fa-solid ${shared ? 'fa-eye' : 'fa-eye-slash'} sbd-vis" data-tooltip="${shared ? 'Visible des joueurs' : 'MJ seulement'}"></i>` : ''}${gm ? `<button type="button" data-act="show" data-tooltip="Montrer aux joueurs"><i class="fa-solid fa-share"></i><span>Montrer</span></button>` : ''}${this.canEdit ? `<button type="button" data-act="edit" data-tooltip="Modifier"><i class="fa-solid fa-pen"></i><span>Modifier</span></button>` : ''}`;
    return `<div class="sbd">
      ${tags.length ? `<div class="sbd-tags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      <section class="sbd-body">
        ${img ? `<figure class="sbd-img"><img src="${esc(bust(img))}" data-act="zoom">${this.canEdit ? `<a class="sbd-imgchg" data-act="pickimg" data-tooltip="Changer l'image"><i class="fa-solid fa-image"></i></a>` : ''}</figure>` : ''}
        <div class="sbd-text">${descH || '<p class="sbd-empty">—</p>'}</div>
        ${gm ? `<h3 class="sbd-gmh"><i class="fa-solid fa-user-secret"></i> Notes du MJ <small>(visibles uniquement par le MJ)</small></h3><div class="sbd-text gm">${notesH || '<p class="sbd-empty">—</p>'}</div>` : ''}
      </section></div>`;
  }
  #editHTML(e, img, desc, notes, kind, tags) {
    const players = game.users.filter(u => !u.isGM);
    const own = e.ownership || {}; const lvl = L();
    const sees = u => (own[u.id] ?? -1) >= lvl.OBSERVER || (own.default ?? 0) >= lvl.OBSERVER;
    const edits = u => (own[u.id] ?? -1) >= lvl.OWNER || (own.default ?? 0) >= lvl.OWNER;
    const PK = globalThis.MANHWA?.pickers;   /* barre de recherche façon Roll20 (Manhwa Sheet) ; sinon cases à cocher */
    const chips = (name, test) => PK ? PK.field({ mode: 'user', name, selected: players.filter(test).map(u => u.id), multi: true, placeholder: "Pseudo d'un joueur ou nom de son personnage…" }) : players.map(u => `<label class="sbd-chip"><input type="checkbox" name="${name}" value="${u.id}"${test(u) ? ' checked' : ''}><span style="--c:${esc(u.color?.css ?? u.color ?? '#8d99ae')}">${esc(u.name)}</span></label>`).join('');
    const kindOpts = `<option value="">—</option>${kinds().map(k => `<option value="${esc(k.key)}"${kind?.key === k.key ? ' selected' : ''}>${esc(k.name)}</option>`).join('')}`;
    const nSee = players.filter(sees).length, nEdit = players.filter(edits).length;
    const sum = [(own.default ?? 0) >= lvl.OBSERVER ? 'visible de tous' : nSee ? `visible de ${nSee} joueur${nSee > 1 ? 's' : ''}` : 'MJ seulement', (own.default ?? 0) >= lvl.OWNER ? 'modifiable par tous' : nEdit ? `modifiable par ${nEdit}` : '', kind ? kind.name : '', tags.length ? `${tags.length} tag${tags.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
    return `<div class="sbd editing"><div class="sbd-form">
      <div class="sbd-namerow"><label class="grow">Nom<input type="text" name="name" value="${esc(e.name)}"></label><button type="button" class="sbd-setbtn${this._setOpen ? ' on' : ''}" data-act="settings" data-tooltip="Paramètres : permissions, type, tags, fond, image"><i class="fa-solid fa-gear"></i><span>Paramètres</span></button></div>
      <div class="sbd-setsum${this._setOpen ? ' off' : ''}" data-act="settings"><i class="fa-solid fa-sliders"></i> ${esc(sum)}</div>
      <div class="sbd-set${this._setOpen ? '' : ' off'}">
      <div class="sbd-field"><span>Dans le journal des joueurs</span><div class="sbd-chips"><label class="sbd-chip all"><input type="checkbox" name="seeAll"${(own.default ?? 0) >= lvl.OBSERVER ? ' checked' : ''}><span>Tous les joueurs</span></label>${chips('see', sees)}</div></div>
      <div class="sbd-field"><span>Peut être modifié par</span><div class="sbd-chips"><label class="sbd-chip all"><input type="checkbox" name="editAll"${(own.default ?? 0) >= lvl.OWNER ? ' checked' : ''}><span>Tous les joueurs</span></label>${chips('edit', edits)}</div></div>
      <div class="sbd-row"><label>Type<select name="kind">${kindOpts}</select></label><label class="grow">Tags<input type="text" name="tags" value="${esc(tags.join(', '))}" placeholder="séparés par des virgules"></label></div>
      <div class="sbd-row sbd-bgrow"><label class="grow">Fond de la fiche<select name="bg">${Object.entries(BACKGROUNDS).map(([k, v]) => `<option value="${k}"${bgOf(e) === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label><label class="grow sbd-dim${bgOf(e) === 'image' ? '' : ' off'}">Assombrissement <b>${dimOf(e)} %</b><input type="range" name="bgDim" min="0" max="95" step="5" value="${dimOf(e)}"></label></div>
      <label>Image<span class="sbd-inline"><input type="text" name="img" value="${esc(img)}"><button type="button" data-act="browse"><i class="fa-solid fa-folder-open"></i></button><button type="button" data-act="clearimg" title="Retirer l'image"><i class="fa-solid fa-xmark"></i></button></span></label><label>Cadrage de la vignette (barre latérale)<select name="thumbPos">${POS_LIST.map(([k, l]) => `<option value="${k}"${(e.getFlag(ID, 'thumbPos') || 'center') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <figure class="sbd-img small${img ? '' : ' empty'}" data-act="browse">${img ? `<img src="${esc(bust(img))}">` : `<i class="fa-solid fa-image"></i><span>Cliquer pour choisir une image</span>`}</figure>
      <label>Description &amp; notes</label><prose-mirror name="desc" class="sbd-pm" value="${esc(desc)}">${desc}</prose-mirror>
      ${game.user.isGM ? `<label>Notes du MJ <small>(visibles uniquement par le MJ)</small></label><prose-mirror name="gm" class="sbd-pm" value="${esc(notes)}">${notes}</prose-mirror>` : ''}
      <footer class="sbd-foot">
        <span class="left">${game.user.isGM ? `<button type="button" data-act="duplicate"><i class="fa-solid fa-copy"></i> Dupliquer</button><button type="button" data-act="archive"><i class="fa-solid fa-box-archive"></i> Archiver</button>` : ''}<button type="button" data-act="delete" class="danger"><i class="fa-solid fa-trash"></i> Supprimer le document</button></span>
        <span class="right"><button type="button" data-act="save" class="primary"><i class="fa-solid fa-check"></i> Enregistrer</button><button type="button" data-act="cancel">Annuler</button></span>
      </footer></div></div>`;
  }
  _replaceHTML(r, c) { c.innerHTML = r; globalThis.MANHWA?.pickers?.bind(c); this.#grips(c); if (!c.dataset.sbdBound) { c.dataset.sbdBound = '1'; c.addEventListener('click', ev => { const a = ev.target.closest('[data-act]'); if (!a) return; if (a.tagName !== 'IMG') ev.preventDefault(); this.#act(a.dataset.act, a); });
      c.addEventListener('change', ev => { if (ev.target.name === 'bg') { this.element.dataset.sbdBg = ev.target.value; this.element.querySelector('.sbd-dim')?.classList.toggle('off', ev.target.value !== 'image'); } });
      c.addEventListener('input', ev => { if (ev.target.name === 'bgDim') { this.element.style.setProperty('--sbd-dim', String(ev.target.value / 100)); ev.target.previousElementSibling.textContent = `${ev.target.value} %`; } });
      /* bouton « enregistrer » (disquette) de l'éditeur de texte : l'élément <prose-mirror> émet un événement « save » */
      c.addEventListener('save', ev => { if (ev.target?.tagName === 'PROSE-MIRROR' && this.editing && this.canEdit) { ev.preventDefault?.(); this.#save(true); } }, true); } }

  /* éditeurs de texte redimensionnables (comme Roll20) : poignée à glisser sous l'éditeur, hauteur retenue */
  #grips(c) {
    for (const pm of c.querySelectorAll('prose-mirror.sbd-pm')) { const n = pm.getAttribute('name'); const key = `sbd-pmh-${n}`; let h = 0; try { h = Number(localStorage.getItem(key)) || 0; } catch (e) {} if (h) pm.style.height = `${h}px`;
      const g = document.createElement('div'); g.className = 'sbd-grip'; g.innerHTML = `<span class="bar" data-tooltip="Glisser pour agrandir"></span>`;   /* 1.19 : plus de plein écran (il cassait la fiche) */ pm.after(g);
      g.querySelector('.bar').addEventListener('pointerdown', ev => { ev.preventDefault(); const y0 = ev.clientY, h0 = pm.getBoundingClientRect().height; g.setPointerCapture(ev.pointerId); g.classList.add('drag');
        const mv = e => { pm.style.height = `${Math.max(140, Math.min(2000, h0 + e.clientY - y0))}px`; }; const up = () => { g.classList.remove('drag'); g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); try { localStorage.setItem(key, String(Math.round(pm.getBoundingClientRect().height))); } catch (e) {} };
        g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); }); }
  }
  async #act(act, el) {
    const e = this.entry;
    switch (act) {
      case 'settings': { this._setOpen = !this._setOpen; const f = this.element.querySelector('.sbd-form'); f?.querySelector('.sbd-set')?.classList.toggle('off', !this._setOpen); f?.querySelector('.sbd-setsum')?.classList.toggle('off', this._setOpen); f?.querySelector('.sbd-setbtn')?.classList.toggle('on', this._setOpen); return; }   /* simple affichage : rien n'est perdu de ce qui est en cours de saisie */
      case 'edit': this.editing = true; return this.render();
      case 'cancel': this.editing = false; return this.render();
      case 'show': return showTo(e);
      case 'zoom': { const src = el.getAttribute('src'); new (foundry.applications?.apps?.ImagePopout ?? ImagePopout)({ src, window: { title: e.name } }).render({ force: true }); return; }
      case 'browse': { const inp = this.element.querySelector('[name="img"]'); new (FP())({ type: 'image', current: inp.value, callback: p => { forgetThumb(p); inp.value = p; const fig = this.element.querySelector('.sbd-form .sbd-img'); if (fig) { fig.classList.remove('empty'); fig.innerHTML = `<img src="${esc(bust(p))}">`; } this.element.style.setProperty('--sbd-img', `url("${bust(p).replace(/"/g, '%22')}")`); } }).render(true); return; }
      case 'pickimg': { const cur = this.page('img')?.src || ''; new (FP())({ type: 'image', current: cur, callback: p => { forgetThumb(p); this.#setImage(p); } }).render(true); return; }
      case 'clearimg': { this.element.querySelector('[name="img"]').value = ''; const fig = this.element.querySelector('.sbd-form .sbd-img'); if (fig) { fig.classList.add('empty'); fig.innerHTML = `<i class="fa-solid fa-image"></i><span>Cliquer pour choisir une image</span>`; } return; }
      case 'save': return this.#save();
      case 'duplicate': { const d = e.toObject(); delete d._id; d.name = `${e.name} (copie)`; const n = await JournalEntry.create(d); n?.sheet.render(true); return; }
      case 'archive': { let f = game.folders.find(x => x.type === 'JournalEntry' && x.name === 'Archives' && !x.folder); if (!f && game.user.isGM) f = await Folder.create({ name: 'Archives', type: 'JournalEntry', color: '#4a4a4a' }); if (f) await e.update({ folder: f.id }); ui.notifications.info(`« ${e.name} » archivé.`); this.editing = false; return this.render(); }
      case 'delete': { const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: 'Supprimer le document' }, content: `<p>Supprimer <b>${esc(e.name)}</b> ? Définitif.</p>` }); if (ok) { await this.close({ sbdNoSave: true }); await e.delete(); } return; }
    }
  }
  async #setImage(src) {
    const e = this.entry; const p = this.page('img');
    if (p) await p.update({ src, flags: { [ID]: { role: 'img' } } }); else await e.createEmbeddedDocuments('JournalEntryPage', [{ name: PAGES.img, type: 'image', src, sort: -1000, flags: { [ID]: { role: 'img' } } }]);
    await e.update({ [`flags.${ID}.img`]: src }); this.render(); ui.journal?.render();
  }
  async #save(stay = false, quiet = false) {
    if (this._saving) return; this._saving = true; try {
    const e = this.entry; const f = this.element.querySelector('.sbd-form'); const v = n => f.querySelector(`[name="${n}"]`);
    const name = v('name').value.trim() || e.name; const img = v('img').value.trim();
    const desc = v('desc')?.value ?? ''; const gmNotes = v('gm')?.value;
    const tags = v('tags').value.split(',').map(x => x.trim()).filter(Boolean); const kind = v('kind').value; const bg = v('bg')?.value || bgOf(e); const bgDim = Number(v('bgDim')?.value ?? dimOf(e));
    /* propriétés : défaut (tous) puis par joueur */
    const lvl = L(); const ownership = { ...(e.ownership || {}) };
    const editAll = v('editAll').checked, seeAll = v('seeAll').checked;
    ownership.default = editAll ? lvl.OWNER : seeAll ? lvl.OBSERVER : lvl.NONE;
    const picked = n => new Set([...f.querySelectorAll(`[name="${n}"]`)].filter(i => i.type === 'hidden' || i.checked).map(i => i.value));
    const pEdit = picked('edit'), pSee = picked('see');
    for (const u of game.users.filter(x => !x.isGM)) { const ed = pEdit.has(u.id), se = pSee.has(u.id); const want = ed ? lvl.OWNER : se ? lvl.OBSERVER : null; if (want === null) delete ownership[u.id]; else ownership[u.id] = want; }
    /* pages : image / description / notes du MJ */
    const creates = [], updates = [], deletes = [];
    const pImg = this.page('img'), pDesc = this.page('desc'), pGm = this.page('gm');
    if (img) { if (pImg) updates.push({ _id: pImg.id, src: img, name: PAGES.img, flags: { [ID]: { role: 'img' } } }); else creates.push({ name: PAGES.img, type: 'image', src: img, sort: 0, flags: { [ID]: { role: 'img' } } }); } else if (pImg) deletes.push(pImg.id);
    if (pDesc) updates.push({ _id: pDesc.id, 'text.content': desc, 'text.format': 1 }); else creates.push({ name: PAGES.desc, type: 'text', text: { format: 1, content: desc }, sort: 100000, flags: { [ID]: { role: 'desc' } } });
    if (gmNotes !== undefined) { if (pGm) updates.push({ _id: pGm.id, 'text.content': gmNotes, 'text.format': 1 }); else if (gmNotes.replace(/<[^>]+>/g, '').trim()) creates.push({ name: PAGES.gm, type: 'text', text: { format: 1, content: gmNotes }, sort: 200000, ownership: { default: lvl.NONE }, flags: { [ID]: { role: 'gm' } } }); }
    if (deletes.length) await e.deleteEmbeddedDocuments('JournalEntryPage', deletes);
    if (updates.length) await e.updateEmbeddedDocuments('JournalEntryPage', updates);
    if (creates.length) await e.createEmbeddedDocuments('JournalEntryPage', creates);
    await e.update({ name, ownership, [`flags.${ID}.tags`]: tags, [`flags.${ID}.kind`]: kind, [`flags.${ID}.doc`]: true, [`flags.${ID}.img`]: img, [`flags.${ID}.bg`]: bg, [`flags.${ID}.bgDim`]: bgDim, [`flags.${ID}.thumbPos`]: v('thumbPos')?.value || 'center' });
    if (quiet) return; if (stay) ui.notifications.info(`« ${name} » enregistré.`); else { this.editing = false; this.render(); }
    } finally { this._saving = false; }
  }
}

/* « Montrer aux joueurs » : tout le monde, ou certains joueurs choisis avec la barre de recherche (comme Roll20) */
async function showTo(e) {
  const PK = globalThis.MANHWA?.pickers; const J = foundry.documents?.collections?.Journal ?? globalThis.Journal;
  if (!PK) return (e.show ? e.show(true) : J.show(e, { force: true }));
  const r = await foundry.applications.api.DialogV2.wait({ window: { title: `Montrer « ${e.name} »`, icon: 'fa-solid fa-share' }, classes: ['sbm-dialog', 'ms-dialog', 'ms-rdlg', 'sbd-showdlg'], position: { width: 460 },
    content: `<div class="sbd-show"><label class="sbd-chip all"><input type="radio" name="who" value="all" checked><span>Tous les joueurs</span></label><label class="sbd-chip all"><input type="radio" name="who" value="some"><span>Seulement :</span></label>${PK.field({ mode: 'user', name: 'to', multi: true, placeholder: "Pseudo d'un joueur ou nom de son personnage…" })}<label class="sbd-perm"><input type="checkbox" name="perm" checked> Leur donner aussi l'accès dans leur journal</label></div>`,
    render: (ev, dlg) => { const el = dlg.element ?? dlg; PK.bind(el); el.querySelector('.ms-rin')?.addEventListener('focus', () => { el.querySelector('[name="who"][value="some"]').checked = true; }); el.querySelector('.ms-rsel')?.addEventListener('change', () => { el.querySelector('[name="who"][value="some"]').checked = true; }); },
    buttons: [{ action: 'ok', label: 'Montrer', icon: 'fa-solid fa-share', default: true, callback: (ev, btn) => { const f = btn.form; const some = f.querySelector('[name="who"]:checked')?.value === 'some'; return { users: some ? [...f.querySelectorAll('[name="to"]')].map(i => i.value) : null, perm: f.querySelector('[name="perm"]').checked }; } }, { action: 'cancel', label: 'Annuler' }], rejectClose: false });
  if (!r || r === 'cancel') return; if (r.users && !r.users.length) return ui.notifications.warn('Choisis au moins un joueur.');
  const users = r.users || game.users.filter(u => !u.isGM).map(u => u.id);
  if (r.perm && game.user.isGM) { const lvl = CONST.DOCUMENT_OWNERSHIP_LEVELS; const own = { ...(e.ownership || {}) }; if (!r.users) own.default = Math.max(own.default ?? 0, lvl.OBSERVER); else for (const id of users) own[id] = Math.max(own[id] ?? -1, lvl.OBSERVER); await e.update({ ownership: own }); }
  try { await J.show(e, { force: true, users }); } catch (err) { await e.show?.(true); }
  ui.notifications.info(`« ${e.name} » montré à ${r.users ? users.map(id => game.users.get(id)?.name).filter(Boolean).join(', ') : 'tous les joueurs'}.`);
}

/* création d'un document depuis l'onglet Journal */
export async function createDocument(folderId = null) {
  const name = await foundry.applications.api.DialogV2.prompt({ window: { title: 'Nouveau document' }, classes: ['sbm-dialog'], content: `<div class="sbm-panel"><label>Nom<input type="text" name="n" autofocus></label></div>`, ok: { label: 'Créer', callback: (ev, btn) => btn.form.elements.n.value.trim() }, rejectClose: false });
  if (!name) return null;
  const e = await JournalEntry.create({ name, folder: folderId, flags: { [ID]: { doc: true }, core: { sheetClass: `${ID}.RollDocSheet` } }, pages: [{ name: PAGES.desc, type: 'text', text: { format: 1, content: '' }, flags: { [ID]: { role: 'desc' } } }] });
  if (e) { const s = e.sheet; if (s instanceof RollDocSheet) s.editing = true; s.render(true); }
  return e;
}

/* journaux créés depuis Foundry (bouton « Créer », « + » d'un dossier…) : fiche Document par défaut, page Description prête.
   On ne touche pas aux journaux créés par d'autres modules avec leurs propres pages (Calendaria, quêtes…). */
Hooks.on('preCreateJournalEntry', (doc, data, options, userId) => {
  if (userId !== game.user.id || !game.settings.get(ID, 'docDefault')) return;
  if (foundry.utils.getProperty(data, 'flags.core.sheetClass')) return;
  /* imports (Transfert Last Horizon, compendiums, duplication de monde) : on garde la fiche d'origine */
  if (options?.keepId || options?.pack || data._id || data._stats?.compendiumSource || (data.pages?.filter(p => (p.type ?? 'text') === 'text').length ?? 0) > 2) return;
  const pages = data.pages ?? [];
  if (pages.some(p => p.type && !['text', 'image'].includes(p.type))) return;
  if (Object.keys(data.flags ?? {}).some(k => !['core', ID].includes(k))) return;
  const upd = { [`flags.core.sheetClass`]: `${ID}.RollDocSheet`, [`flags.${ID}.doc`]: true };
  if (!pages.length) upd.pages = [{ name: PAGES.desc, type: 'text', text: { format: 1, content: '' }, flags: { [ID]: { role: 'desc' } } }];
  doc.updateSource(upd);
});
Hooks.on('createJournalEntry', (doc, options, userId) => { if (userId !== game.user.id || doc.getFlag('core', 'sheetClass') !== `${ID}.RollDocSheet`) return; const t = doc.pages.contents[0]; if (doc.pages.size === 1 && t?.type === 'text' && !t.text?.content) { const s = doc.sheet; if (s instanceof RollDocSheet) { s.editing = true; setTimeout(() => { if (s.rendered) s.render(); }, 300); } } });

Hooks.once('init', () => {
  game.settings.register(ID, 'docDefault', { name: 'Journal : nouveaux journaux en fiche « Document »', hint: 'Les journaux créés depuis l\'onglet (bouton Créer, « + » d\'un dossier) s\'ouvrent avec la fiche façon Roll20. Les journaux d\'autres modules (Calendaria…) ne sont pas touchés.', scope: 'world', config: true, type: Boolean, default: true });
  game.settings.register(ID, 'docBg', { name: 'Journal : fond par défaut des fiches « Document »', hint: 'Chaque journal peut choisir le sien dans « Modifier ».', scope: 'world', config: true, type: String, choices: BACKGROUNDS, default: 'nuit', onChange: () => { for (const a of foundry.applications.instances.values()) if (a instanceof RollDocSheet) a.render(); } });
  game.settings.register(ID, 'docBgDim', { name: 'Journal : assombrissement par défaut du fond « image »', hint: 'En %, pour les fiches Document dont le fond est l\'image du journal. Chaque journal peut avoir le sien.', scope: 'world', config: true, type: Number, range: { min: 0, max: 95, step: 5 }, default: 65, onChange: () => { for (const a of foundry.applications.instances.values()) if (a instanceof RollDocSheet) a.render(); } });
  game.settings.register(ID, 'docStyle', { name: 'Journal : esthétique des fiches « Document »', hint: 'Manhwa (sombre, fonds au choix), Roll20 (claire et plate, comme les handouts de Roll20), ou comme la barre latérale.', scope: 'client', config: true, type: String, choices: DOC_STYLES, default: 'auto', onChange: () => refreshDocSheets() });
  game.settings.registerMenu(ID, 'docConvert', { name: 'Journal : convertisseur Roll20', label: 'Convertir des journaux…', hint: 'Passe les journaux existants en fiche Document (image, description, notes du MJ) et répare ceux qui sont mal formés.', icon: 'fa-solid fa-wand-magic-sparkles', restricted: true, type: class extends foundry.applications.api.ApplicationV2 { static DEFAULT_OPTIONS = { id: 'sbd-convert-shim' }; async render() { await openConverter(); return this; } async _renderHTML() { return ''; } _replaceHTML() {} } });
  const DSC = foundry.applications?.apps?.DocumentSheetConfig ?? DocumentSheetConfig;
  DSC.registerSheet(JournalEntry, ID, RollDocSheet, { label: 'Document (façon Roll20)', makeDefault: false });
});
Hooks.on('renderJournalDirectory', (app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0]; if (!root || !game.settings.get(ID, 'jEnabled')) return;
  const actions = root.querySelector(':scope > .directory-header .header-actions'); if (!actions || actions.querySelector('.sbd-new')) return;
  if (!(game.user.isGM || game.user.can('JOURNAL_CREATE'))) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'sbd-new'; b.innerHTML = '<i class="fa-solid fa-file-circle-plus"></i><span>Document</span>'; b.dataset.tooltip = 'Nouveau document façon Roll20 (image, description, notes du MJ)';
  b.addEventListener('click', () => createDocument()); actions.append(b);
});

/* ───────── convertisseur / réparateur : journaux existants → fiche Document ─────────
   Rôles des pages : première page image → Image ; page texte nommée « Notes du MJ » / « GM… » → Notes du MJ ; première autre page texte → Description.
   Les autres pages de texte peuvent être fusionnées dans la description (titre de la page en Titre 2), puis supprimées.
   Image enregistrée seulement par Monk's Enhanced Journal → recopiée en vraie page Image. Pages d'autres types (Calendaria, PDF, vidéo…) : journal laissé tel quel. */
const GM_RX = /^(notes?\s*(du\s*)?mj|gm(\s*notes?)?|notes?\s*mj|secret)/i;
export function diagnose(e) {
  const pages = e.pages.contents; const other = pages.filter(p => !['text', 'image'].includes(p.type));
  if (other.length) return { state: 'incompatible', why: `page ${other[0].type.split('.').pop()}` };
  const isDoc = e.getFlag('core', 'sheetClass') === `${ID}.RollDocSheet`;
  const roles = new Set(pages.map(p => p.getFlag(ID, 'role')).filter(Boolean));
  const texts = pages.filter(p => p.type === 'text'); const imgs = pages.filter(p => p.type === 'image');
  const mejImg = e.flags?.['monks-enhanced-journal']?.img || pages.map(p => p.flags?.['monks-enhanced-journal']?.img).find(Boolean);
  const issues = [];
  if (!isDoc) issues.push('fiche d\'origine');
  if (texts.length && !roles.has('desc')) issues.push('description non repérée');
  if (!texts.length) issues.push('pas de description');
  if (imgs.length && !roles.has('img')) issues.push('image non repérée');
  if (!imgs.length && mejImg) issues.push('image MEJ à recopier');
  const extra = texts.filter(p => !GM_RX.test(p.name)).length - 1; if (extra > 0) issues.push(`${extra} page${extra > 1 ? 's' : ''} de texte en plus`);
  /* journal appartenant à un autre module (Calendaria, quêtes…) : proposé mais pas coché d'office */
  const foreign = Object.keys(e.flags || {}).filter(k => !['core', ID, 'monks-enhanced-journal', 'journal-thumbnail', 'exportSource'].includes(k));
  if (foreign.length && issues.length) issues.unshift(`journal du module ${foreign[0]}`);
  return { state: issues.length ? (isDoc ? 'repair' : 'convert') : 'ok', why: issues.join(', '), extra: Math.max(0, extra), foreign: foreign.length > 0 };
}
export async function convertEntry(e, { merge = true } = {}) {
  const d = diagnose(e); if (d.state === 'incompatible' || d.state === 'ok') return d.state;
  const pages = e.pages.contents.slice().sort((a, b) => a.sort - b.sort);
  const imgs = pages.filter(p => p.type === 'image'), texts = pages.filter(p => p.type === 'text');
  const gm = texts.find(p => p.getFlag(ID, 'role') === 'gm') ?? texts.find(p => GM_RX.test(p.name));
  const descP = texts.find(p => p.getFlag(ID, 'role') === 'desc') ?? texts.find(p => p !== gm);
  const updates = [], creates = [], deletes = [];
  if (imgs[0]) updates.push({ _id: imgs[0].id, [`flags.${ID}.role`]: 'img' });
  else { const mej = e.flags?.['monks-enhanced-journal']?.img || pages.map(p => p.flags?.['monks-enhanced-journal']?.img).find(Boolean) || e.getFlag(ID, 'img'); if (mej) creates.push({ name: PAGES.img, type: 'image', src: mej, sort: -1000, flags: { [ID]: { role: 'img' } } }); }
  if (gm) updates.push({ _id: gm.id, [`flags.${ID}.role`]: 'gm' });
  let content = descP?.text?.content || '';
  if (merge) for (const p of texts) { if (p === gm || p === descP) continue; content += `<h2>${esc(p.name)}</h2>${p.text?.content || ''}`; deletes.push(p.id); }
  if (descP) updates.push({ _id: descP.id, [`flags.${ID}.role`]: 'desc', 'text.content': content, 'text.format': 1 });
  else creates.push({ name: PAGES.desc, type: 'text', text: { format: 1, content }, flags: { [ID]: { role: 'desc' } } });
  if (updates.length) await e.updateEmbeddedDocuments('JournalEntryPage', updates);
  if (creates.length) await e.createEmbeddedDocuments('JournalEntryPage', creates);
  if (deletes.length) await e.deleteEmbeddedDocuments('JournalEntryPage', deletes);
  await e.update({ 'flags.core.sheetClass': `${ID}.RollDocSheet`, [`flags.${ID}.doc`]: true });
  return 'done';
}
export async function openConverter(filter = null) {
  const list = game.journal.filter(j => j.isOwner && (!filter || filter(j))).sort((a, b) => (a.folder?.name || '').localeCompare(b.folder?.name || '', 'fr') || a.name.localeCompare(b.name, 'fr'));
  const rows = list.map(j => { const d = diagnose(j); const st = { ok: ['ok', 'fa-circle-check', 'Document'], convert: ['cv', 'fa-wand-magic-sparkles', 'À convertir'], repair: ['rp', 'fa-screwdriver-wrench', 'À réparer'], incompatible: ['no', 'fa-ban', 'Incompatible'] }[d.state];
    return `<label class="sbd-cv-row ${st[0]}"><input type="checkbox" name="j" value="${j.id}"${(d.state === 'convert' || d.state === 'repair') && !d.foreign ? ' checked' : ''}${d.state === 'ok' || d.state === 'incompatible' ? ' disabled' : ''}><span class="st"><i class="fa-solid ${st[1]}"></i>${st[2]}</span><b>${esc(j.name)}</b><small>${esc(j.folder?.name || '—')}</small><em>${esc(d.why)}</em></label>`; }).join('');
  const n = s => list.filter(j => diagnose(j).state === s).length;
  const content = `<div class="sbm-panel sbd-cv"><p class="sbm-note">${n('convert')} à convertir · ${n('repair')} à réparer · ${n('ok')} déjà en Document · ${n('incompatible')} incompatibles (pages Calendaria, PDF, vidéo… — laissés tels quels).</p>
    <div class="sbd-cv-tools"><a data-sel="all">Tout cocher</a> · <a data-sel="none">Tout décocher</a><label class="sbm-cb"><input type="checkbox" name="merge" checked> Fusionner les autres pages de texte dans la description (chaque page devient un Titre 2)</label></div>
    <div class="sbd-cv-list">${rows || '<p class="sbm-note">Aucun journal.</p>'}</div></div>`;
  let el;
  const r = await foundry.applications.api.DialogV2.wait({ window: { title: 'Convertisseur Roll20', icon: 'fa-solid fa-wand-magic-sparkles' }, classes: ['sbm-dialog'], position: { width: 680 }, content, rejectClose: false,
    buttons: [{ action: 'go', label: 'Convertir la sélection', icon: 'fa-solid fa-wand-magic-sparkles', default: true, callback: () => 'go' }, { action: 'cancel', label: 'Fermer' }],
    render: (ev, dlg) => { el = (dlg?.element ?? dlg)?.querySelector?.('.sbd-cv'); el.addEventListener('click', e2 => { const a = e2.target.closest('[data-sel]'); if (!a) return; e2.preventDefault(); el.querySelectorAll('input[name="j"]:not(:disabled)').forEach(i => i.checked = a.dataset.sel === 'all'); }); } });
  if (r !== 'go') return;
  const ids = [...el.querySelectorAll('input[name="j"]:checked')].map(i => i.value); const merge = el.querySelector('[name="merge"]').checked;
  let done = 0; const bar = ui.notifications.info(`Conversion : 0 / ${ids.length}`, { progress: true });
  for (const id of ids) { const j = game.journal.get(id); if (!j) continue; try { if (await convertEntry(j, { merge }) === 'done') done++; } catch (err) { console.error(`${ID} | conversion ${j.name}`, err); } bar?.update?.({ pct: (ids.indexOf(id) + 1) / ids.length, message: `Conversion : ${ids.indexOf(id) + 1} / ${ids.length}` }); }
  ui.notifications.info(`${done} journal${done > 1 ? 'aux' : ''} converti${done > 1 ? 's' : ''} en fiche Document.`);
}
/* conversion : uniquement depuis les paramètres du module (menu « Convertir des journaux… ») — plus de bouton ni de clic droit */

