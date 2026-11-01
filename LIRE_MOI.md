# HASKE Design — React, TypeScript et Tailwind CSS

La nouvelle interface se trouve dans `frontend/`. Elle conserve le bleu marine `#0B2D5B`, l'orange `#FF7800`, le gris `#6B6B6B` et le blanc. Le serveur Python gère les demandes, les fichiers privés, les sessions d'administration et les notifications. SQLite conserve les données dans `data/`.

## Pages

- `/` : Accueil.
- `/services` : les cinq activités, dont la personnalisation de tasses à café et thermos portables.
- `/realisations` : galerie filtrable de maquettes et inspirations.
- `/a-propos` : l'identité et la démarche HASKE.
- `/contact` : coordonnées configurées et accès au brief.
- `/brief` : préparation et envoi d'un projet, pièces jointes et récapitulatif.
- `/admin` : connexion, consultation des demandes et changement de statut.
- `/confidentialite` : information sur les données à compléter avant publication.

Les visuels actuels sont des maquettes de présentation, pas des commandes clients documentées.

## Animations

Les apparitions au défilement, zooms au survol, flèches, filtres de galerie, étapes du brief et menu mobile utilisent CSS et IntersectionObserver, sans bibliothèque supplémentaire. Les contenus restent visibles si l'observation n'est pas disponible ; les animations respectent le réglage système de réduction des mouvements, y compris lorsqu'il change pendant une visite. Les réglages sont dans `frontend/src/motion.css` et `frontend/src/usePageMotion.ts`.

## Démarrage rapide

Prérequis : Node.js 22.12 ou supérieur et Python 3.10 ou supérieur. Depuis la racine du projet dans PowerShell :

```powershell
npm.cmd run setup
npm.cmd run build
$env:ADMIN_PASSWORD = Read-Host 'Mot de passe administrateur (16 caractères minimum)'
$env:PUBLIC_URL = 'http://localhost:8000'
python server.py
```

Ouvrir **http://localhost:8000**. L'administration est à **http://localhost:8000/admin**. Ne pas ouvrir le HTML par double-clic : les routes et les envois nécessitent le serveur.

## Développement avec rechargement automatique

Laisser le serveur Python tourner dans un terminal, puis ouvrir un second terminal dans ce dossier :

```powershell
npm.cmd run dev
```

Ouvrir l'adresse locale affichée par Vite (habituellement `http://127.0.0.1:5173`). Vite transmet les appels `/api` et les images `/assets` au serveur Python sur `http://localhost:8000`. Le proxy adapte l'origine des mutations uniquement en développement ; en production, le navigateur et l'API utilisent le même domaine.

## Organisation

- `frontend/src/` : composants et pages React en TypeScript, styles Tailwind.
- `frontend/package.json` et `frontend/package-lock.json` : dépendances frontend.
- `frontend/dist/` : fichiers générés par la compilation, non suivis dans Git.
- `server.py` : backend WSGI et API ; sert aussi le frontend compilé.
- `assets/` : logo et images de marque.
- `test_server.py` : tests d'intégration du serveur avec base temporaire.
- `Dockerfile` : compilation Node puis exécution Python dans une image finale.
- `DEPLOIEMENT.md` : variables, SMTP, hébergement et exploitation.

Les anciens fichiers HTML, CSS et JavaScript à la racine sont conservés comme version historique. Quand `frontend/dist/index.html` existe, les pages utilisent React. Toute nouvelle modification de l'interface doit être faite dans `frontend/src/`, puis compilée.

## Vérification

```powershell
npm.cmd run typecheck
npm.cmd run build
python -m unittest -v test_server.py
```

Un test de parcours dans Chrome ou Edge installé est aussi disponible après compilation : `npm.cmd run test:browser`. Il utilise une base temporaire, un mot de passe généré et aucune messagerie réelle. Les captures sont enregistrées dans `.qa/`. Définir `CHROME_PATH` si le navigateur n'est pas trouvé automatiquement.

Pour vérifier uniquement les animations et la réduction des mouvements : `npm.cmd run test:browser -- --motion-only`.

## Mise en ligne

Le code est préparé pour le déploiement, mais aucun hébergement n'est créé automatiquement. Renseigner les coordonnées réelles, le domaine, le mot de passe administrateur et le service SMTP. Les e-mails restent en file d'attente sans configuration SMTP. Compléter les informations de confidentialité avant l'ouverture publique. Voir [DEPLOIEMENT.md](DEPLOIEMENT.md).
