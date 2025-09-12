# TASK: Implémentation des Interactions 3D en Temps Réel

## 🎯 Objectif
Permettre de visualiser les interactions TCR/Peptide avec une position HLA sélectionnée en calculant les distances 3D en temps réel sur la structure PDB active.

## 📋 Contexte
- **Problème identifié** : Les données CSV ne correspondent pas aux structures PDB individuelles (numérotation TCR différente)
- **Solution proposée** : Calcul de distance 3D directement sur la structure chargée dans 3Dmol.js
- **Avantage** : Biologiquement précis, temps réel, applicable à toutes les structures

## 🛠 Plan d'Implémentation Détaillé

### Phase 1 : Interface Utilisateur
#### 1.1 Bouton "Show Interactions" 
- **Localisation** : À côté du chip de position highlighted (quand une position est sélectionnée)
- **Apparence** : Petit bouton avec icône 🔍 "Show Interactions"
- **État** : Activé seulement quand `highlightedPosition` est défini
- **Toggle** : Peut être activé/désactivé pour masquer les interactions

#### 1.2 Contrôle de Distance
- **Type** : Slider compact 3-8 Ångström
- **Position** : Sous le bouton "Show Interactions" quand activé
- **Valeur par défaut** : 5Å
- **Label** : "Interaction Distance: X Å"

### Phase 2 : Logique de Calcul 3D

#### 2.1 Extraction des Coordonnées
```javascript
// Obtenir les atomes de la position HLA sélectionnée
const hlaPosition = parseInt(highlightedPosition.value)
const hlaAtoms = viewer.value.getModel().selectedAtoms({
  chain: 'D',
  resi: hlaPosition
})

// Récupérer les coordonnées centrales
const hlaCenter = calculateAtomCenter(hlaAtoms)
```

#### 2.2 Recherche des Interactions
```javascript
// Trouver tous les atomes à distance X
const nearbyAtoms = viewer.value.getModel().selectedAtoms({
  withinDistance: interactionDistance, // 5Å par défaut
  location: hlaCenter
})

// Filtrer par chaînes TCR (A,B) et Peptide (C)
const interactingAtoms = nearbyAtoms.filter(atom => 
  ['A', 'B', 'C'].includes(atom.chain)
)

// Grouper par résidu pour éviter les doublons
const interactingResidues = groupByResidue(interactingAtoms)
```

#### 2.3 Cache et Performance
- **Cache des calculs** par position pour éviter les recalculs
- **Debouncing** sur le changement de distance (300ms)
- **Nettoyage** quand position change ou mode désactivé

### Phase 3 : Visualisation 3D

#### 3.1 Application des Styles
```javascript
// Pour chaque résidu interagissant
interactingResidues.forEach(residue => {
  const style = {
    color: getChainColor(residue.chain), // Conserver couleur originale
    radius: 0.4 // Légèrement plus gros que normal
  }
  
  // Appliquer en stick par-dessus la vue globale
  viewer.value.addStyle(
    { chain: residue.chain, resi: residue.resi },
    { stick: style }
  )
})
```

#### 3.2 Indicateurs Visuels
- **TCR Alpha (A)** : Stick bleu (couleur originale)
- **TCR Beta (B)** : Stick vert (couleur originale) 
- **Peptide (C)** : Stick orange (couleur originale)
- **Taille** : radius 0.4 (plus visible que 0.3 normal)
- **Style** : Toujours stick pour uniformité

#### 3.3 Zoom Intelligent
```javascript
// Calculer la boîte englobante des interactions
const boundingBox = calculateBoundingBox([
  hlaAtoms,
  ...interactingAtoms
])

// Zoomer sur la zone d'interaction avec marge
viewer.value.zoomTo({
  center: boundingBox.center,
  zoom: calculateOptimalZoom(boundingBox)
})
```

### Phase 4 : Intégration avec l'Architecture Existante

#### 4.1 Variables Réactives
```javascript
const showInteractions = ref(false)
const interactionDistance = ref(5) // Å
const interactingResidues = ref([])
```

#### 4.2 Watchers
```javascript
// Recalculer quand position ou distance change
watch([highlightedPosition, interactionDistance, showInteractions], 
  async () => {
    if (showInteractions.value && highlightedPosition.value) {
      await calculateInteractions()
    } else {
      clearInteractions()
    }
  }
)
```

#### 4.3 Fonction de Calcul Principale
```javascript
const calculateInteractions = async () => {
  if (!viewer.value || !highlightedPosition.value) return
  
  try {
    // 1. Obtenir coordonnées HLA
    const hlaAtoms = getHlaPositionAtoms(highlightedPosition.value)
    
    // 2. Calculer interactions
    const interactions = findInteractingResidues(hlaAtoms, interactionDistance.value)
    
    // 3. Mettre à jour état
    interactingResidues.value = interactions
    
    // 4. Appliquer visualisation
    await applyInteractionVisualization(interactions)
    
    // 5. Zoomer (optionnel)
    if (interactions.length > 0) {
      zoomToInteractionSite(hlaAtoms, interactions)
    }
    
  } catch (error) {
    console.error('Error calculating interactions:', error)
  }
}
```

## 🔄 États et Transitions

### États Possibles
1. **Aucune position** : Pas de bouton interactions
2. **Position sélectionnée** : Bouton "Show Interactions" disponible  
3. **Interactions OFF** : Vue normale avec position highlighted
4. **Interactions ON** : Position + résidus interagissants + zoom

### Transitions
- Sélection position → Affichage bouton
- Clic "Show Interactions" → Calcul + Affichage
- Changement distance → Recalcul + Mise à jour
- Désélection position → Reset tout

## ⚡ Considérations Performance

### Optimisations
- **Cache** : Stocker résultats par position-distance
- **Debouncing** : Éviter calculs excessifs sur slider
- **Lazy loading** : Calcul seulement si activé
- **Cleanup** : Nettoyer styles précédents

### Limites
- **Structures complexes** : Peut être lent sur très grosses structures
- **Mémoire** : Attention au cache qui peut grossir
- **3Dmol.js** : Dépendant des capacités de la librairie

## 📝 Tests à Effectuer

### Cas de Test
1. **Sélection position** → Bouton apparaît
2. **Activation interactions** → Calcul et affichage corrects
3. **Changement distance** → Mise à jour temps réel
4. **Position sans interactions** → Gestion élégante
5. **Performance** → Test avec plusieurs positions
6. **Zoom** → Cadrage optimal sur interactions
7. **Désactivation** → Nettoyage complet

### Structures de Test
- Structure avec beaucoup d'interactions (test performance)
- Structure avec peu d'interactions (test cas limite)
- Différentes positions HLA (couverture fonctionnelle)

## 🎨 Interface Mockup

```
┌─────────────────────────────────┐
│ Position 65 highlighted         │
│ [🔍 Show Interactions] [OFF]    │  
│                                 │
│ [WHEN ON:]                      │
│ Interaction Distance: 5Å        │
│ ▬▬▬▬●▬▬▬▬ (3-8Å)              │
│                                 │
│ Found: 3 TCR + 2 Peptide        │
│ • TCR-A: 145, 167               │
│ • TCR-B: 98                     │  
│ • Peptide: 3, 7                 │
└─────────────────────────────────┘
```

## 🚀 Priorités d'Implémentation

### High Priority (P0)
1. Bouton Show Interactions + état
2. Calcul de distance 3D basique
3. Affichage stick des résidus trouvés

### Medium Priority (P1)
4. Slider distance avec temps réel
5. Zoom intelligent sur zone
6. Cache et optimisations

### Low Priority (P2)
7. Statistiques détaillées d'interactions
8. Export des interactions trouvées
9. Animations de transition

## ⚠️ Risques et Mitigations

### Risques Identifiés
- **Performance** : Calculs lents sur grosses structures
- **3Dmol.js Limits** : API peut avoir limitations
- **UX Complexity** : Interface peut devenir surchargée

### Mitigations
- Tests performance précoces
- Fallback si calculs échouent  
- Interface progressive (bouton → détails)
- Documentation claire pour utilisateur

---

**Auteur**: Claude Code  
**Date**: 2025-09-12  
**Status**: Prêt pour implémentation  
**Complexité**: Moyenne-Élevée  
**Durée estimée**: 2-3 heures