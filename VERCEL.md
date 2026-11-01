# Vercel — une seule application Vite

La vitrine se déploie comme un seul projet statique. Aucun service Python ni binding n'est nécessaire. Le backend complet reste dans le dépôt pour une utilisation locale ou avec un hébergement adapté.

## Réglages de l'import

| Champ Vercel | Valeur |
| --- | --- |
| Root Directory | `./` |
| Application / Framework Preset | **Vite** |
| Install Command | `npm run setup` |
| Build Command | `npm run build:vitrine` |
| Output Directory | `frontend/dist` |

`vercel.json` contient ces réglages et la réécriture des routes React vers `/index.html`. Il remplace la précédente configuration multi-services : il n'y a pas deux déploiements à effectuer.

Le build inclut le logo et toutes les images. `.vercelignore` exclut les sources Python et leur configuration du déploiement statique. Les fichiers Python restent disponibles dans GitHub.

## Fonctions de la vitrine

- Pages, galerie, animations, téléphone, localisation et réseaux sociaux.
- Préparation du brief, sauvegarde locale volontaire, copie et export texte.
- Partage du brief préparé sur WhatsApp ; le visiteur valide son envoi dans la conversation.
- Les éventuelles pièces jointes sont à joindre directement dans WhatsApp.
- Aucun appel `/api` depuis la vitrine et aucune base de données nécessaire.
- Aucune administration ni demande enregistrée côté serveur dans ce mode. `/admin` affiche la page introuvable.

Les coordonnées publiées sont définies dans `frontend/src/contact.ts`. Modifier `defaultContact`, faire un commit/push puis redéployer pour mettre à jour ces informations. Les variables backend `CONTACT_*` et `SOCIAL_*` ne sont pas lues par la vitrine autonome. Aucun mot de passe administrateur, secret SMTP ou URL de backend n'est à ajouter dans Vercel.

## Vérification locale

```sh
npm run setup
npm run build:vitrine
python -m unittest -v test_server.py test_vercel.py
npm run test:browser -- --showcase
```

Le test navigateur intercepte l'ouverture WhatsApp sans contacter ce service ni envoyer de message. Il vérifie aussi que le frontend ne fait aucun appel API. Les captures sont dans `.qa/` et ne sont pas publiées.

La vitrine propose un petit bouton rond avec une icône de globe et un repère FR / EN dans l’en-tête, également accessible sur mobile. Le français est la langue initiale ; le choix est mémorisé localement sous `haske-language`. Les traductions anglaises se trouvent dans `frontend/src/en.json`. Les textes libres saisis par les clients restent inchangés et les valeurs des options du brief gardent leur format d’origine pour rester compatibles avec les brouillons et le backend. Le récapitulatif et les messages WhatsApp suivent la langue choisie.

Pour vérifier les deux langues, leur mémorisation et le partage WhatsApp : `npm run test:browser -- --i18n`, après `npm run build:vitrine`.

`npm run build` produit toujours la version connectée pour `server.py` et Docker. Le build Vercel choisit automatiquement le mode vitrine.

L'offre Hobby de Vercel conserve ses conditions d'usage personnel et non commercial. Cette configuration technique ne change pas les conditions applicables à une vitrine professionnelle.

Référence : [Vite sur Vercel](https://vercel.com/docs/frameworks/frontend/vite).
