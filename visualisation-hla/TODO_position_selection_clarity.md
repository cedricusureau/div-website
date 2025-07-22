# Plan pour clarifier la sélection des positions

## Problème identifié
Confusion entre deux fonctionnalités de sélection de positions :
- **Mode exploration** : Sélection pour filtrer l'affichage Sankey (visualisation)
- **Mode batch** : Sélection pour définir les positions dans le calcul de divergence

## Modifications proposées

### 1. Masquer "Filtered Positions" en mode batch
- Cacher l'onglet "Filtered Positions" du formulaire en mode batch
- Utiliser `v-if="currentMode === 'exploration'"` sur cet onglet

### 2. Clarifier les labels en mode exploration
- Titre : "See interaction details" 
- Tooltip : "Click positions to filter the Sankey diagram interactions display"
- Compteur : "X selected for visualization"

### 3. Améliorer le panneau batch
- Texte clair : "Select positions used for batch divergence calculation"
- Différenciation visuelle des deux types de sélection

### 4. Modifications techniques
- Passer `currentMode` au composant `HlaAnalysisForm`
- Ajuster les conditions d'affichage
- Améliorer les textes explicatifs

## Résultat attendu
Interface claire où les utilisateurs comprennent :
- **Mode exploration** : "Je sélectionne pour voir les interactions Sankey"
- **Mode batch** : "Je sélectionne pour inclure dans mes calculs"

## Files to modify
- `HlaAnalysisForm.vue` : Ajouter condition v-if sur l'onglet positions
- `HlaSequenceAnalysis.vue` : Passer la prop currentMode
- `BatchAnalysis.vue` : Améliorer les textes explicatifs

## Status
- [ ] To implement