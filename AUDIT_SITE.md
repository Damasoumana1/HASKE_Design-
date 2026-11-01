# Audit du site HASKE Design

Date : 1er novembre 2026. Périmètre : archive locale HTML, CSS, JavaScript et images. Aucun fichier du site modifié.

## Conclusion

La base est légère et structurée pour une vitrine avec préparation de brief. Avant une publication destinée à obtenir des clients, la priorité est de rendre possible le contact après le récapitulatif. Le configurateur reste volontairement sans envoi : c'est une limite commerciale, pas un dysfonctionnement par rapport au LIRE_MOI.

## Constats et actions

| Priorité | Constat vérifié | Conséquence | Action recommandée |
| --- | --- | --- | --- |
| Haute | Aucun lien de contact HASKE Design : les liens de navigation renvoient aux sections de la page. Le récapitulatif propose seulement copie et téléchargement (`index.html`, étapes du configurateur et pied de page). | Le visiteur prépare un brief mais ne sait pas où le transmettre. « Parlons de votre projet » mène aussi au configurateur. | Ajouter des coordonnées professionnelles vérifiées et une action de contact au récapitulatif et dans le pied de page. |
| Haute si site public | `index.html:6` contient `noindex,nofollow,noarchive`. | La page demande aux moteurs de ne pas l'indexer. | Retirer cette directive lors d'une publication destinée au référencement. La conserver si la vitrine doit rester une prévisualisation ; elle ne constitue pas un contrôle d'accès. |
| Moyenne | `style.css:2` applique l'orange `#ff7800` aux éléments `em`, notamment dans les titres sur blanc. Rapport de contraste calculé : **2,65:1**. | Contraste inférieur au seuil de 3:1 utilisé pour les grands textes ; lecture difficile pour certains visiteurs. | Assombrir l'orange utilisé pour le texte sur blanc ; conserver l'orange de marque dans les éléments décoratifs. |
| Moyenne | De nombreux textes et commandes ont des tailles de 8 à 11 px : descriptions, notes, filtres, sauvegarde et textes du formulaire (`style.css`). | Lecture exigeante, surtout sur téléphone. Ce constat ne suffit pas à conclure seul à une non-conformité. | Agrandir les textes utiles et les commandes secondaires, puis vérifier le rendu et le zoom à 200 %. |
| Moyenne | Plusieurs commandes sont très compactes : `.quiet`, `.filter`, `.text-link` et `.menu-toggle` dans `style.css`. | Risque de sélection difficile au doigt. | Mesurer les zones cliquables dans le navigateur et agrandir les cibles trop petites ; prévoir des espacements suffisants. |
| Moyenne | Sans JavaScript, le formulaire reste visible à la première étape, mais « Continuer » ne fonctionne pas. Aucun message `noscript`. | En cas de script indisponible, le visiteur reste bloqué sans explication. | Ajouter un message de repli avec un moyen de contact. |
| Moyenne | Le brouillon peut inclure coordonnées et description, reste en stockage local et n'a pas d'expiration (`app.js`, `draftData` et restauration). | Sur un appareil partagé, ces informations peuvent être restaurées lors d'une visite ultérieure. | Afficher l'avertissement près de la sauvegarde avant le clic et envisager une durée de conservation. Le stockage est déjà facultatif et un effacement est prévu. |
| Basse | Absence de métadonnées Open Graph, d'image de partage et d'URL canonique dans le document. | Présentation des liens partagés peu maîtrisée ; URL de référence non explicitée. | Ajouter ces éléments quand le domaine public est connu. |
| Basse | La galerie présente uniquement des maquettes, explicitement annoncées comme telles. | La preuve de réalisations et l'expérience de l'atelier restent peu documentées. | Ajouter des projets réels autorisés, avec contexte et résultat, lorsqu'ils sont disponibles. |

## Points solides

- Structure statique simple, sans dépendances JavaScript externes ni compilation.
- Environ **165 Kio** pour l'ensemble HTML, CSS, JavaScript et WebP de l'archive, y compris une image non référencée dans la page. Ce chiffre n'est pas une mesure du transfert réseau.
- Images WebP, dimensions déclarées et chargement différé des images de galerie.
- Langue française déclarée, titre et description présents, un titre principal, lien d'évitement, labels de formulaire, dialogues natifs et annonces de statut.
- Gestion du mouvement réduit et styles de focus prévus.
- Validation des champs requis et des quantités dans le code ; export texte et repli de copie prévus.
- Valeurs utilisateur insérées via `textContent` dans le récapitulatif ; échappement des valeurs utilisées pour générer les champs.
- Sauvegarde volontaire, effacement du brouillon et confirmation de remise à zéro prévus.

## Vérifications et limites

- `node --check app.js` : réussi.
- Analyse du HTML : aucun identifiant dupliqué, aucune ancre interne manquante, aucune ressource `src` manquante.
- Contraste orange/blanc calculé à partir des couleurs CSS.
- Aucun test d'interaction en navigateur, capture mobile, audit Lighthouse ou mesure Core Web Vitals effectué : l'outil de navigateur n'était pas disponible directement dans l'environnement.
- L'affichage responsive, le fonctionnement réel du presse-papiers, les téléchargements, le cycle de sauvegarde/restauration et les lecteurs d'écran restent à tester en navigateur.
- Aucun domaine ni hébergement fourni : HTTPS, en-têtes HTTP, cache, compression et contrôles d'accès non évalués.
- Cette analyse du code ne constitue pas une certification d'accessibilité ni une recherche exhaustive de vulnérabilités.

## Ordre conseillé

1. Ajouter les coordonnées et l'action de contact après le brief.
2. Choisir le statut public ou privé de la publication et adapter l'indexation.
3. Corriger le contraste et améliorer la lisibilité des petits textes.
4. Tester les quatre prestations sur ordinateur et téléphone, avec clavier, sauvegarde, restauration, effacement, copie et téléchargement.
5. Compléter les métadonnées de partage et les preuves de réalisations.
