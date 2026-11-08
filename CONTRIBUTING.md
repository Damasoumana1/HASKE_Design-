# Guide de Contribution - HASKE Design

Bienvenue sur le projet **HASKE Design** ! Ce document décrit le flux de travail et les bonnes pratiques pour collaborer efficacement sur le dépôt.

---

## 1. Démarrage rapide

### A. Cloner le projet
```bash
git clone https://github.com/Damasoumana1/HASKE_Design-.git
cd HASKE_Design-
```

### B. Se positionner sur votre branche dédiée
Pour Alize :
```bash
git fetch origin
git checkout feature/haske-design_alize
```

### C. Environnement & Dépendances
- **Frontend** : Ouvrez directement `index.html` dans votre navigateur ou utilisez une extension de type *Live Server*.
- **Backend (Python)** :
  ```bash
  pip install -r requirements.txt
  ```

---

## 2. Lancer le projet en local

- **Démarrer le serveur de développement :**
  ```bash
  python server.py
  ```
  Le site est alors accessible à l'adresse : `http://localhost:8000` (ou port configuré).

- **Lancer les tests de non-régression :**
  ```bash
  python test_server.py
  ```
  *Assurez-vous que tous les tests passent avec succès (`OK`) avant d'envoyer vos modifications.*

---

## 3. Workflow de travail au quotidien

### A. Avant de commencer à coder
Récupérez toujours la dernière version de votre branche :
```bash
git checkout feature/haske-design_alize
git pull origin feature/haske-design_alize
```

*(Si la branche principale `main` a évolué, vous pouvez la fusionner dans votre branche pour rester synchronisé(e)) :*
```bash
git pull origin main
```

### B. Sauvegarder et publier vos modifications
```bash
# Vérifier les fichiers modifiés
git status

# Ajouter les fichiers
git add .

# Valider avec un message clair
git commit -m "feat(ui): mise à jour du style de la bannière"

# Envoyer vos changements sur GitHub
git push origin feature/haske-design_alize
```

---

## 4. Conventions de messages de commit

Privilégiez les préfixes explicites suivants :
- `feat:` Nouvelle fonctionnalité ou élément d'interface.
- `fix:` Correction d'un bug ou ajustement de style.
- `style:` Mise en forme, CSS, typographie sans modification de la logique.
- `docs:` Documentation, commentaires ou guides.
- `test:` Ajout ou mise à jour de tests.

---

## 5. Proposer vos modifications (Pull Request)

Une fois votre tâche terminée :
1. Rendez-vous sur [GitHub HASKE_Design- Pull Requests](https://github.com/Damasoumana1/HASKE_Design-/pulls).
2. Cliquez sur **"New pull request"**.
3. Sélectionnez :
   - `base`: **`main`**
   - `compare`: **`feature/haske-design_alize`**
4. Décrivez brièvement vos changements et soumettez la Pull Request pour relecture et fusion.
