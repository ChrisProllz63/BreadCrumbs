# Changelog - BreadCrumbs Investigation Graph

## Version Mise a Jour - Mars 2026 (Sources & Timeline)

Modifications complementaires ajoutees sur la version modifiee.

---

## Nouvelles Fonctionnalites

### 1. Champ Source ajoute aux nodes
- Ajout d'un champ optionnel Source pour chaque node.
- Selecteur a 2 sections: Windows et Linux.
- Source persistante via localStorage.

### 2. Champ Source ajoute aux edges
- Ajout d'un champ optionnel Source pour chaque edge.
- Selecteur a 2 sections: Windows et Linux.
- La valeur est stockee dans sourceArtifact.

### 3. Sources visibles dans la timeline
- Les items Node affichent leur Source si renseignee.
- Les items Edge affichent leur Source si renseignee.
- Affichage conditionnel pour ne pas surcharger la timeline.

### 4. Traductions et alignement des donnees
- Traduction des libelles en anglais pour l'UI et les donnees Windows.
- Remplacement des sources Linux avec un jeu d'artefacts Linux dedie.
- Traduction des champs Linux en anglais:
  - categories
  - sources
  - descriptions

### 5. Correctifs annexes
- Harmonisation du bouton Lists dans la toolbar.
- Verification de build/syntaxe sans erreurs sur src/App.jsx.

---

## Fichiers Impactes

- src/App.jsx
- README.md
- CHANGELOG.md

---

## Version Modifiée - Mars 2026

Modifications apportées au code original de [oaboelrous/BreadCrumbs](https://github.com/oaboelrous/BreadCrumbs.git)

---

## 🎯 Nouvelles Fonctionnalités

### 1. **Contrôles de Zoom Avancés** ✨
- **Ajout de 4 boutons de zoom** dans la barre d'outils du graphe:
  - `+` Zoom avant (×1.2)
  - `−` Zoom arrière (÷1.2)
  - `100%` Réinitialiser le zoom à 1.0
  - `↗` Recentrer sur les nœuds

#### Code Ajouté:
```javascript
// Constantes de zoom
const MIN_ZOOM = 0.2;    // Limite minimale
const MAX_ZOOM = 3;      // Limite maximale

// Fonctions de manipulation du zoom
const zoomIn = () => {
  setZoom((z) => Math.min(MAX_ZOOM, z * 1.2));
};

const zoomOut = () => {
  setZoom((z) => Math.max(MIN_ZOOM, z / 1.2));
};

const resetZoom = () => {
  setZoom(1);
};

// Recentrage intelligent sur tous les nœuds
const recenterOnNodes = () => {
  // Calcule la boîte englobante de tous les nœuds
  // Centre la vue sur leur centroïde
  // Applique le zoom courant pour un positionnement précis
  // ...
};
```

**Limites de zoom:** 0.2× à 3× (empêche le zoom excessif)

**Fonctionnalité de recentrage:**
- Calcule les coordonnées min/max de tous les nœuds
- Centre la vue sur le centroïde du graphe
- Respect du niveau de zoom actuel
- Gère les cas où aucun nœud n'existe (réinitialise au centre)

---

### 2. **Panneau Nodes & Edges List** 📋
- **Nouveau bouton "Listes"** dans la barre d'outils pour basculer la visibilité
- **Panneau dédié** affichant tous les nœuds et arêtes du graphe
- **Sélection interactive:** Cliquer sur un élément dans la liste pour le sélectionner dans le graphe
- **Mise en évidence visuelle:**
  - Nœuds sélectionnés: fond **bleu**
  - Arêtes sélectionnées: fond **jaune**

#### Code Ajouté:
```javascript
// État pour contrôler la visibilité du panneau
const [showEntityList, setShowEntityList] = useState(false);

// Handlers de sélection depuis la liste
const handleSelectNodeFromList = (nodeId) => {
  setSelectedNode(nodeId);
  setSelectedEdge(null);
};

const handleSelectEdgeFromList = (edgeId) => {
  setSelectedEdge(edgeId);
  setSelectedNode(null);
};
```

**Éléments du panneau:**
- Liste scrollable de tous les nœuds avec code couleur par type
- Liste scrollable de toutes les arêtes avec labels des relations
- Réaction visuelle immédiate aux clics
- Affichage des détails nœud/arête dans le panneau adjacent

---

### 3. **Correction - Affichage des Détails du Nœud** 🐛
- **Problème original:** Les détails du nœud ne s'affichaient pas quand le panneau "Listes" était ouvert
- **Cause:** Condition `!showEntityList` empêchait le rendu des détails
- **Solution:** Suppression de la condition restrictive

#### Code Corrigé:
```javascript
// Avant (❌ incorrect)
{selectedNode && !showEntityList && (() => {
  // Détails du nœud
})}

// Après (✅ correct)
{selectedNode && (() => {
  // Détails du nœud - toujours affichés
})}
```

**Impact:** Les panneaux peuvent maintenant coexister correctement:
- Liste (Nodes & Edges) + Détails du nœud sélectionné
- Liste + Détails de l'arête sélectionnée
- Affichage simultané sans conflit

---

## 📊 Fichiers Modifiés

### `src/App.jsx` (fichier principal)

**Sections ajoutées/modifiées:**

1. **État (useState hooks)**
   - `[showEntityList, setShowEntityList]` - Nouveau

2. **Constantes**
   - `MIN_ZOOM = 0.2` - Nouveau
   - `MAX_ZOOM = 3` - Nouveau

3. **Fonctions**
   - `zoomIn()` - Nouvelle
   - `zoomOut()` - Nouvelle
   - `resetZoom()` - Nouvelle
   - `recenterOnNodes()` - Nouvelle
   - `handleSelectNodeFromList()` - Nouvelle
   - `handleSelectEdgeFromList()` - Nouvelle

4. **Interface utilisateur**
   - Boutons de zoom (+, −, 100%, ↗) dans la toolbar
   - Bouton "Listes" pour basculer le panneau d'entités
   - Panneau Nodes & Edges avec sélection interactive
   - Correction de la condition de rendu des détails du nœud

---

## 🎨 Changements Visuels

### Toolbar Graphique
**Avant:** Boutons Re-layout, Findings
**Après:** Boutons Re-layout, Findings, Listes, + (zoom), − (zoom), 100% (reset), ↗ (center)

### Panneaux Droits
**avant:** Alternance: Détails du nœud OU Détails de l'arête OU Findings OU Vide

**Après:** 
- Détails du nœud + Listes peuvent coexister
- Détails de l'arête + Listes peuvent coexister
- Sélection depuis la liste met à jour immédiatement l'affichage

---

## 🧪 Données de Test

Un fichier **sample-data.json** a été créé pour tester toutes les fonctionnalités:
- 12 nœuds de différents types (email, IP, host, user, file, process, domain, registry)
- 10 arêtes avec directionn alités variées (uni→, bi↔, none—)
- 6 findings avec timestamps
- Positions pré-calculées pour un graphe layoutisé

### Import:
1. Ouvrir l'app sur `http://localhost:5175/`
2. Cliquer **Import**
3. Sélectionner `sample-data.json`

---

## 📈 Améliorations d'UX

| Aspect | Avant | Après |
|--------|-------|-------|
| **Zoom** | Molette uniquement | Molette + 4 boutons |
| **Limites de zoom** | Non limitées | 0.2× à 3× |
| **Recentrage** | Manuel (drag) | Bouton 1-clic |
| **Listes** | Intégrées aux détails | Panneau séparé & persistent |
| **Sélection** | Clic nœud/arête uniquement | Clic direct OU depuis liste |
| **Vue simultanée** | Impossible | Possible (liste + détails) |

---

## 🔧 Détails Techniques

### Dépendances
Aucune dépendance supplémentaire ajoutée. Utilisation exclusive des hooks React standard:
- `useState`
- `useEffect`
- `useRef`
- `useCallback`
- `useMemo`

### Performance
- Recentrage: O(n) - un seul scan des positions des nœuds
- Sélection depuis liste: O(1) - simple state update
- Zoom: O(1) - modification directe du zoom state

### Compatibilité
- React 18.3.1 ✓
- Vite 5.4.21 ✓
- Tous les navigateurs supportant ES2020+ ✓

---

## ✅ Tests Validés

- [x] Boutons zoom (+/−/100%/↗) fonctionnels
- [x] Limites de zoom respectées (0.2× ≤ zoom ≤ 3×)
- [x] Recentrage calcule correctement le centroïde
- [x] Panneau Listes affiche tous les nœuds/arêtes
- [x] Sélection depuis liste met à jour les détails
- [x] Mise en évidence visuelle des éléments sélectionnés
- [x] Coexistence des panneaux (liste + détails)
- [x] Build sans erreurs (`npm run build` ✓)
- [x] Dev server démarre sans problèmes

---

## 📝 Notes

- Toutes les fonctionnalités sont indépendantes et n'affectent pas le code existant
- localStorage persiste automatiquement tous les changements
- L'interface est entièrement responsive et fonctionnelle au clavier/souris
- Les nouveaux boutons suivent le style et la palette de couleurs originaux

**Dernière mise à jour:** 27 mars 2026
