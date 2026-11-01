# HASKE Design — React et backend Python

Pour la configuration Vercel en mode vitrine avec WhatsApp, suivre [VERCEL.md](VERCEL.md). Ce guide décrit la version complète avec SQLite et administration connectée.

Le frontend React / TypeScript / Tailwind CSS se compile avec Vite. Le backend Python conserve les briefs et leurs pièces jointes dans SQLite, fournit les sessions d'administration et gère une file de notifications SMTP. Le frontend compilé et l'API sont servis sur la même origine.

## Démarrer sous Windows

Depuis ce dossier dans PowerShell :

```powershell
npm.cmd run setup
npm.cmd run build
$env:ADMIN_PASSWORD = Read-Host 'Mot de passe administrateur (16 caractères minimum)'
$env:PUBLIC_URL = 'http://localhost:8000'
python server.py
```

Ouvrir `http://localhost:8000`, puis `http://localhost:8000/admin`. Le serveur de développement utilise uniquement la bibliothèque standard Python. Le double-clic sur `index.html` et `python -m http.server` ne permettent pas d'utiliser les fonctions connectées. Pour modifier l'interface avec rechargement automatique, lancer `npm.cmd run dev` dans un second terminal ; le serveur Python doit rester actif sur le port 8000.

Le mot de passe est fourni par l'environnement, sans valeur par défaut. Pour le changer, redémarrer avec un nouveau mot de passe et supprimer les sessions en base pour invalider immédiatement les anciennes connexions.

## Variables à configurer

Les variables sont lues dans l'environnement du processus. Un fichier `.env` n'est pas chargé automatiquement et ne doit pas être publié.

| Variable | Rôle |
| --- | --- |
| `ADMIN_PASSWORD` | Secret administrateur long, aléatoire, au moins 16 caractères. |
| `PUBLIC_URL` | Origine exacte du site, par exemple `https://votre-domaine.example`, sans chemin ni slash final. Les envois provenant d'une autre origine sont refusés. |
| `CONTACT_EMAIL` | Adresse professionnelle affichée dans le site et destinataire des alertes administrateur. |
| `CONTACT_PHONE` | Numéro affiché, avec indicatif international. |
| `CONTACT_WHATSAPP` | Numéro WhatsApp international, chiffres uniquement. |
| `CONTACT_LOCATION` | Adresse ou localisation affichée ; Ouagadougou, Karpala par défaut. |
| `CONTACT_MAPS_URL` | Lien HTTPS vers le point Google Maps exact. Par défaut le bouton affiche le quartier de Karpala, pas un point précis de l'atelier. Le rendez-vous exact peut être demandé sur WhatsApp. |
| `SOCIAL_FACEBOOK`, `SOCIAL_INSTAGRAM`, `SOCIAL_TIKTOK`, `SOCIAL_LINKEDIN`, `SOCIAL_YOUTUBE` | Liens HTTPS des comptes à afficher dans le footer. Facebook, TikTok et LinkedIn pointent provisoirement vers les pages d'accueil des plateformes ; les remplacer par les profils officiels avant publication. Instagram et YouTube apparaissent uniquement si configurés. |
| `SMTP_HOST` | Hôte SMTP avec STARTTLS. Sans cette variable, les notifications restent en attente. |
| `SMTP_PORT` | Port SMTP, 587 par défaut. |
| `SMTP_FROM` | Adresse d'expédition vérifiée auprès du fournisseur. |
| `SMTP_USER`, `SMTP_PASSWORD` | Identifiants du fournisseur SMTP. |
| `DATA_DIR` | Répertoire persistant de la base SQLite ; `data/` par défaut. |
| `APP_ENV` | `production` pour servir avec Waitress. |
| `HOST`, `PORT` | Adresse d'écoute et port ; `127.0.0.1` et `8000` par défaut. |

Les notifications sont tentées toutes les 60 secondes, avec un maximum de dix tentatives. La demande reste enregistrée si SMTP échoue. L'administration indique le nombre de notifications en attente. Après correction SMTP, on peut réinitialiser les tentatives des messages non envoyés via une opération de maintenance en base. Une panne entre l'envoi SMTP et son enregistrement peut entraîner un doublon de notification.

## Hébergement

Utiliser un serveur ou une plateforme acceptant un conteneur avec un volume persistant. Docker compile le frontend dans une étape Node puis copie les fichiers compilés dans l'image Python finale. Hors Docker, exécuter `npm.cmd run setup`, `npm.cmd run build`, puis `python -m pip install -r requirements.txt` avant de démarrer avec `APP_ENV=production`. Le serveur refuse de démarrer en production si le frontend compilé est absent. Cette application ne se déploie pas telle quelle sur un hébergement uniquement statique ni sur Sites/Cloudflare Workers.

```powershell
docker build -t haske-design .
docker run --env-file .env.production -p 8000:8000 -v haske-data:/data haske-design
```

Le fichier local `.env.production`, à créer hors du dépôt et à conserver privé, contient les variables sous la forme `NOM=valeur`. Le conteneur démarre sans privilèges administrateur. Il utilise Waitress et stocke ses données dans `/data`.

Placer le service derrière un reverse proxy HTTPS, avec limite du corps de requête à 15 Mo et délais adaptés aux fichiers. Ne pas exposer directement le port applicatif à Internet. Configurer `PUBLIC_URL` sur le domaine HTTPS final. Les cookies d'administration sont alors `Secure`, `HttpOnly` et `SameSite=Strict`.

Exécuter une seule instance applicative avec cette base SQLite et son volume. Le limiteur utilise l'adresse du pair réseau et ne fait pas confiance à `X-Forwarded-For` : derrière un proxy, la limite peut être partagée entre tous les visiteurs. Pour du trafic public, ajouter une limitation par IP au reverse proxy et adapter la limite globale applicative si nécessaire.

## Données et exploitation

- Demandes, pièces jointes, sessions et file e-mail sont stockées dans `haske.sqlite3`. Les fichiers ne sont servis qu'après authentification et toujours en téléchargement.
- Sauvegarder la base régulièrement avec l'API de sauvegarde SQLite. Une simple copie du fichier actif sans les fichiers WAL peut être incomplète. Conserver les sauvegardes dans un emplacement privé et tester leur restauration.
- La validation vérifie les tailles, extensions et signatures PDF/images. Elle ne remplace pas une analyse antivirus. Traiter les fichiers reçus comme des documents non fiables.
- Une référence de réception n'est pas un portail client : elle sert à retrouver la demande auprès de l'atelier. Aucun endpoint public ne permet de lire les briefs.
- Prévoir une politique de conservation et une procédure de suppression des données. Cette version n'a pas de purge automatique ni de bouton d'effacement des demandes dans l'administration.
- La gestion du portfolio, les comptes clients et le paiement ne sont pas inclus dans cette première version.

## Avant ouverture publique

1. Configurer les coordonnées réelles, le domaine, SMTP et les secrets dans l'hébergeur.
2. Compléter `/confidentialite` avec l'identité de l'entreprise, les contacts, prestataires et règles de conservation ; ajouter les informations légales adaptées à l'activité.
3. Vérifier le parcours complet sur ordinateur et téléphone, y compris téléchargement des pièces jointes et réception réelle des e-mails.
4. Configurer les sauvegardes, le HTTPS, la surveillance des erreurs et la protection contre les abus au proxy.
5. Adapter la directive `noindex` dans `frontend/index.html` seulement quand la publication de la vitrine est souhaitée ; conserver l'administration hors indexation. Pour un besoin SEO avancé avec aperçu distinct de chaque page sur les réseaux sociaux, prévoir du prérendu ou un rendu serveur : cette version utilise React côté navigateur.

## Tests

```powershell
python -m unittest -v test_server.py
npm.cmd run typecheck
npm.cmd run build
```

Les tests utilisent une base temporaire indépendante et ne déclenchent aucun envoi SMTP. Ils vérifient l'enregistrement, les fichiers privés, les sessions, les statuts, les doublons de soumission, la validation, le contrôle d'origine et la limitation des connexions.

Après compilation, `npm.cmd run test:browser` vérifie les routes et images, les débordements sur ordinateur/mobile, le menu mobile, l'envoi d'un brief, la connexion administrateur et la modification de son statut. Il nécessite Chrome ou Edge installé et génère des captures sous `.qa/`, avec des données de test isolées et sans envoi SMTP. Le build Docker et la livraison réelle des e-mails doivent être vérifiés sur l'environnement de déploiement.
