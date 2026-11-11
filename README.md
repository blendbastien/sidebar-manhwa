# Interface - Manhwa — `sidebar-manhwa`

Refonte de la barre latérale : Playlists, Scènes, Journal façon Roll20, fiche Document, Chroniques et Kiosque, navigation des scènes, boutons du haut thémés.

Code de la version **1.30.2** (dernière release), pour Foundry VTT v13.

## Liens avec la suite Manhwa

La suite compte un système (Fiche - Manhwa) et 11 modules. La Fiche est le centre : les données partagées y vivent et les modules les lisent via `globalThis.MANHWA`.

- Suit le thème `data-ms-theme` posé par la Fiche.
- Lit `HORLOGIA` (Horlogia) pour dater les Chroniques.
- Règle commune : un module ne plante jamais si un autre est absent (vérifier `game.modules.get(id)?.active` avant d'appeler son API).

## Livraison

1. Augmenter `version` dans `module.json` (jamais deux livraisons au même numéro).
2. Construire le zip, qui doit contenir le dossier `sidebar-manhwa/` :
   ```bash
   mkdir -p build/sidebar-manhwa && git archive HEAD | tar -x -C build/sidebar-manhwa
   cd build && zip -qr sidebar-manhwa.zip sidebar-manhwa
   ```
3. Créer la release GitHub `vX.Y.Z` avec **exactement 2 fichiers** : `module.json` et `sidebar-manhwa.zip`. Le manifeste pointe vers `releases/latest/download/…`.
4. The Forge : Bazaar → *Install From Manifest* avec l'URL versionnée `https://github.com/blendbastien/sidebar-manhwa/releases/download/vX.Y.Z/module.json`. Ne jamais utiliser *Update All Packages*.
5. Redémarrer le monde de test, vérifier la version installée et tester.
