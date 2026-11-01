# HASKE Design

Site web de HASKE Design, atelier créatif à Ouagadougou, Karpala (Burkina Faso) : conception graphique, impression publicitaire, personnalisation textile, tasses à café et thermos portables, créations sur toile.

## Technologies

- **Frontend** : React, TypeScript, Tailwind CSS et Vite.
- **Backend** : Python WSGI, SQLite et administration authentifiée.
- **Déploiement serveur** : Docker avec stockage persistant.

## Fonctionnalités

Navigation multi-pages, galerie filtrable, animations accessibles, contact WhatsApp, configurateur de brief, pièces jointes privées, brouillons locaux facultatifs, exports et gestion des demandes dans l'administration.

Les visuels sont des maquettes et illustrations. Les liens Facebook, TikTok et LinkedIn sont provisoires et doivent être remplacés par les profils officiels. La modification des contenus du site depuis l'administration n'est pas encore implémentée.

## Démarrage local

Prérequis : Node.js 22.12+ et Python 3.10+.

```powershell
npm.cmd run setup
npm.cmd run build
$env:ADMIN_PASSWORD = Read-Host 'Mot de passe administrateur (16 caractères minimum)'
$env:PUBLIC_URL = 'http://localhost:8000'
python server.py
```

Site : `http://localhost:8000` · Administration : `http://localhost:8000/admin`.

Les commandes `npm` fonctionnent aussi sur macOS et Linux ; adapter la définition des variables d'environnement au terminal utilisé. Aucun mot de passe administrateur par défaut n'est fourni.

## Vérification

```sh
npm run typecheck
npm run build
python -m unittest -v test_server.py
```

Un workflow GitHub Actions lance la compilation du frontend et les tests du backend à chaque push sur `main` et sur les pull requests.

## Documentation et hébergement

- [Guide du projet](LIRE_MOI.md)
- [Configuration et déploiement](DEPLOIEMENT.md)
- [Vercel Services : vitrine avec WhatsApp](VERCEL.md)

La version connectée nécessite un serveur Python et un stockage persistant pour SQLite. Le mode Vercel `npm run build:vitrine` publie les pages et le brief à partager sur WhatsApp, avec une API publique sans état pour les coordonnées ; il n'active pas l'administration ni l'enregistrement des demandes. L'adaptation complète à un stockage externe n'est pas encore réalisée.

Les coordonnées officielles, secrets d'administration, SMTP, sauvegardes et informations de confidentialité doivent être configurés avant une ouverture publique. Les données locales, fichiers `.env`, captures de test, dépendances et fichiers compilés sont exclus du dépôt.
