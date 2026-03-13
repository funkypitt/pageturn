# PageTurn

Extension Chrome et bookmarklet qui convertit les pages web en lecture paginée — comme un livre. Idéal pour les écrans e-ink, mais fonctionne sur n'importe quel écran.

## Fonctionnalités

- **Changement de page instantané** — aucune animation ni défilement, essentiel pour les écrans e-ink
- **Détection automatique du contenu** — Substack, Medium, WordPress, Ghost, Dev.to, Hashnode, Blogger, Hugo, Jekyll, et plus
- **Nettoyage** — supprime barres de navigation, publicités, sidebars, formulaires d'abonnement, commentaires
- **Compteur de pages** — affiche la position (ex. "3 / 12")
- **Clavier + tactile** — flèches, espace, swipe, ou tap sur les bords de l'écran
- **Responsive** — s'adapte au redimensionnement en conservant la position de lecture
- **Zéro collecte de données** — tout s'exécute localement

## Installation

### Extension Chrome

Disponible sur le [Chrome Web Store](https://chrome.google.com/webstore).

Ou chargement manuel :
1. Cloner ce dépôt
2. Ouvrir `chrome://extensions/`
3. Activer le **mode développeur**
4. Cliquer **Charger l'extension non empaquetée** et sélectionner le dossier du projet

### Bookmarklet

Ouvrir `bookmarklet.html` et glisser le lien dans la barre de favoris.

## Utilisation

Cliquer sur l'icône PageTurn ou appuyer sur **Alt+P** sur n'importe quel article.

### Raccourcis clavier

| Touche | Action |
|--------|--------|
| `→` / `Espace` | Page suivante |
| `←` / `Maj+Espace` | Page précédente |
| `Début` / `Fin` | Première / dernière page |
| `Échap` | Quitter le mode lecture |
| `Alt+P` | Activer/désactiver PageTurn |

### Navigation tactile

- **Swipe gauche** → page suivante
- **Swipe droite** → page précédente
- **Tap bord droit** → page suivante
- **Tap bord gauche** → page précédente

## Stack technique

Vanilla JavaScript / HTML / CSS — aucune dépendance externe. Extension Chrome Manifest v3.

## Structure

```
manifest.json       # Manifest Chrome Extension v3
background.js       # Service worker (raccourci clavier)
popup.html/js       # Interface popup de l'extension
content.js          # Script de pagination (version extension)
content.css         # Styles de mise en page paginée
bookmarklet.js      # Version bookmarklet autonome
bookmarklet.min.js  # Version minifiée
bookmarklet.html    # Page d'installation du bookmarklet
icons/              # Icônes de l'extension
store/              # Assets Chrome Web Store
```

## Intégration e-ink

Si [Tinta4PlusU](https://github.com/funkypitt/Tinta4Plus-Universal) est actif, PageTurn envoie automatiquement une commande de rafraîchissement e-ink après chaque changement de page pour éliminer les artefacts de ghosting.
