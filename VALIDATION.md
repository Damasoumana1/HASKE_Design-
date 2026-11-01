# Validation de la refonte React

Vérifications réalisées le 1er novembre 2026 dans l'environnement Windows local.

- TypeScript strict : réussi (`npm.cmd run typecheck`).
- Compilation de production : réussie (`npm.cmd run build`).
- Backend : sept tests d'intégration réussis, couvrant notamment les quatre prestations, les fichiers privés, les statuts, les sessions, l'idempotence, les limites de requêtes et les notifications avec panne SMTP simulée.
- Chrome : routes publiques et administration ouvertes directement, images chargées, menu mobile ouvert et fermé au clavier, absence de débordement horizontal aux tailles vérifiées.
- Parcours réel via l'interface React : création d'une demande d'impression, réception d'une référence, connexion administrateur, consultation du projet et enregistrement du statut « En discussion ».
- Aucune exception JavaScript relevée pendant le parcours automatisé.
- Revue visuelle de l'accueil sur ordinateur et mobile : validée. Palette de marque conservée.

Tailles vérifiées : ordinateur 1440 × 1000 ; mobile 390 × 844. Les captures locales de la dernière exécution sont dans `.qa/run-1793520823877/`.

Les tests navigateur utilisent une base distincte et ne transmettent aucun e-mail. La livraison SMTP réelle, le build Docker, le HTTPS de l'hébergeur et les performances réseau de production ne sont pas validés ici. Aucun déploiement public effectué.
