/* Sidebar Manhwa — verrou par clé (1.17.0). Table partagée avec Manhwa Sheet et les autres modules via globalThis : la lecture et
 * l'écriture d'un réglage se suivent sans qu'une autre écriture du même réglage s'intercale (statistiques différées + favori cliqué
 * au même instant, deux MJ connectés…). */
const LOCKS = globalThis.__manhwaLocks ||= new Map();
export function withLock(key, fn) { const prev = LOCKS.get(key) || Promise.resolve(); const run = prev.then(fn); const tail = run.catch(() => {}); LOCKS.set(key, tail); tail.then(() => { if (LOCKS.get(key) === tail) LOCKS.delete(key); }); return run; }
