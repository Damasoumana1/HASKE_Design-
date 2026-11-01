# Configuration Vercel — vitrine

Le fichier `vercel.json` prépare deux services dans un seul projet. Cette configuration correspond au choix d'une vitrine avec partage du brief sur WhatsApp. La version complète Python/SQLite reste disponible en local ou avec le Dockerfile.

## Services et routes proposés

| Service | Racine | Entrée | Routes publiques |
| --- | --- | --- | --- |
| `frontend` | `frontend` | Vite, build `npm run build:vitrine` | `/`, `/services`, `/realisations`, `/a-propos`, `/contact`, `/brief`, `/confidentialite` et images |
| `app` | `.` | `vercel_app:application` | `/api/*` ; seules les lectures `/api/contact` et `/api/health` sont actives |

Le catch-all frontend est placé après `/api/*`. Les réécritures internes au service frontend permettent d'ouvrir directement les pages React.

Les appels du navigateur restent des requêtes relatives vers `/api/contact`, sur le même domaine. Il n'existe aucun appel serveur-à-serveur entre les deux services : **aucun binding n'est nécessaire**. Un frontend Vite statique ne peut pas lire un binding réservé aux fonctions à l'exécution. Ne pas inventer de variable `BACKEND_URL` et ne pas injecter d'URL interne dans le JavaScript public.

## Périmètre de la vitrine

- Pages, galerie, animations, téléphone, localisation et liens sociaux.
- Préparation du brief, sauvegarde locale volontaire, copie et export texte.
- Le partage ouvre WhatsApp avec le brief préparé ; le visiteur valide ensuite l'envoi dans WhatsApp.
- Les pièces jointes peuvent être partagées directement dans la conversation WhatsApp.
- Aucun enregistrement de demandes sur Vercel, aucune pièce jointe sur disque et aucune administration en ligne.
- `/admin` affiche la page introuvable dans ce build. Les anciennes API d'administration et de soumission renvoient une indisponibilité explicite, sans accès aux données locales.

`vercel_app.py` n'importe pas `server.py` et ne crée aucun fichier SQLite. Les données locales ne sont pas transférées vers Vercel. L'ajout ultérieur de la gestion des demandes et du contenu depuis l'admin nécessitera un stockage durable externe et une autre configuration.

## Importation après confirmation

1. Envoyer les modifications confirmées sur GitHub.
2. Recharger l'import du dépôt dans Vercel.
3. Conserver la racine du projet `./` et le mode **Services**.
4. Vérifier que les deux services sont nommés `app` et `frontend`, conformément au JSON.
5. Les coordonnées ont déjà des valeurs publiques par défaut. Configurer au besoin `CONTACT_EMAIL`, `CONTACT_PHONE`, `CONTACT_WHATSAPP`, `CONTACT_LOCATION`, `CONTACT_MAPS_URL` et les variables `SOCIAL_*` pour remplacer les informations provisoires.
6. Ne pas définir de secret administrateur ou SMTP pour cette vitrine : ils ne sont pas utilisés.
7. Vérifier les pages, les images et l'ouverture du brief WhatsApp sur le déploiement obtenu.

La compilation `npm run build:vitrine` définit le mode automatiquement. Les variables `VITE_*` sont publiques : ne jamais y mettre de secret. Le nom de projet et le domaine sont choisis dans Vercel ; ils ne sont pas codés en dur.

L'offre Hobby de Vercel impose ses conditions d'usage personnel et non commercial. Une vitrine professionnelle conserve un usage commercial : vérifier le plan approprié avant publication. Cette configuration ne change pas ces conditions.

## Vérifications

```sh
npm run build:vitrine
python -m unittest -v test_server.py test_vercel.py
npm run test:browser -- --showcase
```

Le test navigateur intercepte l'ouverture WhatsApp pour vérifier le texte et le numéro sans contacter WhatsApp ni envoyer de message. `npm run build` restaure ensuite le frontend connecté pour l'aperçu local avec `server.py`.

Les builds locaux et tests applicatifs ne remplacent pas un build Vercel réel. La configuration est proposée pour confirmation avant envoi ; aucun projet Vercel n'est créé ou déployé par ces scripts.

Références : [Services](https://vercel.com/docs/services), [routage](https://vercel.com/docs/services/routing), [bindings](https://vercel.com/docs/services/bindings), [Vite](https://vercel.com/docs/frameworks/frontend/vite).
