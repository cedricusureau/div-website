# Design : Intégration de l'analyse de distance dans la vue HLA Sequence Analysis

**Date :** 2026-02-26
**Auteur :** Claude Sonnet 4.5
**Statut :** Validé

## Vue d'ensemble

Intégration de l'analyse des distributions de distance directement dans la vue HLA Sequence Analysis, avec passage d'une sélection multiple de positions à une sélection unique pour une analyse approfondie position par position.

## Problème actuel

- La page Position Distance Explorer est séparée de la vue principale d'analyse
- L'utilisateur doit naviguer entre plusieurs pages pour analyser une position
- La sélection multiple dans le Sankey diagram crée une surcharge visuelle
- Pas de vue unifiée combinant interactions (Sankey) et distances

## Solution proposée

### Architecture

```
HLA Sequence Analysis (mode Exploration)
├── Formulaire (gauche)
│   └── Filtres (locus, distance, quantile, hétérozygosité 5% par défaut)
│
└── Contenu (droite)
    ├── Frise de séquence (positions cliquables)
    ├── Comparaison d'allèles (optionnel)
    │
    └── [SI UNE POSITION EST SÉLECTIONNÉE]
        ├── Sankey Diagram (interactions peptide/TCR)
        └── Distance Analysis
            ├── Distribution globale (KDE + histogramme)
            ├── Breakdown par cible (Peptide vs TCR)
            └── Breakdown par acide aminé
```

### Changements principaux

#### 1. Sélection unique au lieu de multiple

**Avant :**
- Clic sur position → ajout/retrait de la sélection (toggle multiple)
- Plusieurs positions sélectionnées simultanément
- Sankey multiplié pour chaque position

**Après :**
- Clic sur position → sélection exclusive de cette position
- Maximum 1 position sélectionnée à la fois
- Clic sur position déjà sélectionnée → désélection
- Analyse focalisée et approfondie

#### 2. État initial

- Aucune position sélectionnée au démarrage
- Message d'invitation : "👆 Cliquez sur une position dans la frise pour analyser ses interactions et distances"
- Sections Sankey et Distance cachées

#### 3. Quand une position est sélectionnée

**Affichage :**
```
┌─────────────────────────────────────────────────┐
│ Position 45:A - Interactions & Distance Analysis│
├─────────────────────────────────────────────────┤
│ Peptide/TCR Interactions (Sankey)               │
│ [Sankey diagram pour position 45]               │
├─────────────────────────────────────────────────┤
│ Distance Distributions                           │
│ • Distribution globale                           │
│ • Breakdown Peptide vs TCR                       │
│ • Breakdown par acide aminé                      │
└─────────────────────────────────────────────────┘
```

## Implémentation technique

### Fichiers à créer

#### 1. PositionDistanceCharts.vue
**Emplacement :** `/visualisation-hla/src/components/HlaSequence/components/PositionDistanceCharts.vue`

**Responsabilités :**
- Recevoir `locus` et `position` en props
- Charger données via `positionDistancesService.getPositionData()`
- Afficher les 3 graphiques (réutilise composants existants)
- Gérer loading/error states

**Structure :**
```vue
<template>
  <div class="distance-charts">
    <div v-if="loading">Chargement...</div>
    <div v-else-if="error">{{ error }}</div>
    <template v-else-if="positionData.length > 0">
      <GlobalDistributionChart :data="positionData" :position="positionLabel" />
      <TargetBreakdownChart :data="positionData" :position="positionLabel" />
      <AminoAcidBreakdownChart :data="positionData" :position="positionLabel" />
    </template>
    <div v-else>Aucune donnée de distance pour cette position</div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { positionDistancesService } from '../../../services/positionDistancesService';
import GlobalDistributionChart from '../../PositionDistances/components/GlobalDistributionChart.vue';
import TargetBreakdownChart from '../../PositionDistances/components/TargetBreakdownChart.vue';
import AminoAcidBreakdownChart from '../../PositionDistances/components/AminoAcidBreakdownChart.vue';

const props = defineProps({
  locus: { type: String, required: true },
  position: { type: Number, required: true }
});

const loading = ref(false);
const error = ref(null);
const positionData = ref([]);

const positionLabel = computed(() => `${props.position}:${props.locus}`);

const loadData = async () => {
  loading.value = true;
  error.value = null;
  try {
    positionData.value = await positionDistancesService.getPositionData(
      props.locus,
      props.position
    );
  } catch (err) {
    error.value = `Erreur: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

watch(() => [props.locus, props.position], loadData, { immediate: true });
</script>
```

### Fichiers à modifier

#### 1. SequenceVisualization.vue

**Changements :**

**A. Modifier handleClick (ligne ~472)**
```javascript
handleClick(position) {
  const positionStr = String(position);

  // Sélection unique : si déjà sélectionnée → désélectionner, sinon → sélectionner
  if (this.selectedPositions.length === 1 && this.selectedPositions[0] === positionStr) {
    this.$emit('positions-selected', []);
  } else {
    this.$emit('positions-selected', [positionStr]);
  }
}
```

**B. Supprimer la section positions-chips (lignes ~309-328)**
```vue
<!-- SUPPRIMER CETTE SECTION -->
<div class="positions-selector-section">
  <div class="positions-selector-header">...</div>
  <div class="positions-chips">...</div>
</div>
```

**C. Remplacer la section "Interactions Details" (lignes ~300-341)**
```vue
<!-- Affichage conditionnel selon sélection -->
<div v-if="selectedPositions.length > 0" class="analysis-section">
  <div class="section-header">
    <h2>Position {{ selectedPositions[0] }}:{{ currentLocus }} - Interactions & Distance Analysis</h2>
  </div>

  <!-- Sankey Diagram -->
  <div class="sankey-subsection">
    <h3>Peptide/TCR Interactions</h3>
    <PeptideInteractionsSankey
      :filteredContactData="filteredContactData"
      :selectedPositions="selectedPositions"
      :totalStructures="totalStructure"
    />
  </div>

  <!-- Distance Analysis -->
  <div class="distance-subsection">
    <h3>Distance Distributions</h3>
    <PositionDistanceCharts
      :locus="currentLocus"
      :position="parseInt(selectedPositions[0])"
    />
  </div>
</div>

<!-- Message si aucune sélection -->
<div v-else class="no-selection-message">
  <p>👆 Cliquez sur une position dans la frise pour analyser ses interactions et distances</p>
</div>
```

**D. Ajouter l'import**
```javascript
import PositionDistanceCharts from './PositionDistanceCharts.vue';

export default {
  components: {
    PeptideInteractionsSankey,
    PositionDistanceCharts  // NOUVEAU
  },
  // ...
}
```

**E. Supprimer le watcher d'auto-ouverture (lignes ~440-444)**
```javascript
// SUPPRIMER ce watcher qui ouvrait automatiquement le Sankey
watch: {
  selectedPositions: {
    handler(newSelectedPositions) {
      if (newSelectedPositions && newSelectedPositions.length > 0 && !this.showPeptideInteractions) {
        this.showPeptideInteractions = true;
      }
    }
  }
}
```

**F. Supprimer togglePeptideInteractions et showPeptideInteractions**
Plus besoin d'accordéon collapsible, la section est toujours visible quand une position est sélectionnée.

#### 2. HlaSequenceAnalysis.vue

**Changements :**

**A. Ajouter l'import du service (ligne ~121)**
```javascript
import { positionDistancesService } from '../../services/positionDistancesService';
```

**B. Initialiser le service dans onMounted (ligne ~364)**
```javascript
onMounted(async () => {
  await initializeData();
  await positionDistancesService.init(); // NOUVEAU
});
```

#### 3. useHlaAnalysis.js

**Vérifier la valeur par défaut :**
```javascript
const formParams = reactive({
  locus: 'A',
  distance: 5,
  quantile: 0.25,
  mode: 'distance',
  showPolymorphicOnly: true,
  heterozygosityThreshold: 5,  // 5% par défaut
  // ...
});
```

### Styles CSS à ajouter

**Dans SequenceVisualization.vue :**
```css
.no-selection-message {
  padding: 60px 20px;
  text-align: center;
  font-size: 18px;
  color: #666;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  margin: 20px 0;
}

.analysis-section {
  margin-top: 24px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
}

.sankey-subsection {
  margin-bottom: 32px;
}

.distance-subsection {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 2px solid #e0e0e0;
}

.sankey-subsection h3,
.distance-subsection h3 {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 20px;
}
```

**Dans PositionDistanceCharts.vue :**
```css
.distance-charts {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.distance-charts > * {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## Considérations spéciales

### Mode Batch inchangé

Le mode "Batch Calculation" conserve la sélection multiple :
- `batchSelectedPositions` reste un array avec toutes les positions
- Seul le mode Exploration passe en sélection unique
- Les deux modes sont indépendants

### Réutilisation de code

**Composants réutilisés :**
- `GlobalDistributionChart.vue` (existant)
- `TargetBreakdownChart.vue` (existant)
- `AminoAcidBreakdownChart.vue` (existant)

**Service réutilisé :**
- `positionDistancesService` (existant, fonctionnel avec SQLite)

**Avantages :**
- Pas de duplication de code
- Tests déjà effectués sur ces composants
- Cohérence visuelle garantie

### Filtre polymorphisme

Le filtre d'hétérozygosité (5% par défaut) s'applique automatiquement aux positions affichées dans la frise via `formParams.heterozygosityThreshold`. Pas besoin de filtre supplémentaire dans le nouveau composant.

## Ordre d'implémentation

1. **Créer PositionDistanceCharts.vue**
   - Nouveau fichier autonome
   - Importe les 3 composants existants
   - ~80 lignes de code

2. **Modifier SequenceVisualization.vue**
   - Modifier handleClick (sélection unique)
   - Supprimer positions-chips
   - Remplacer section Interactions Details
   - Ajouter import PositionDistanceCharts
   - ~100 lignes modifiées

3. **Modifier HlaSequenceAnalysis.vue**
   - Import service
   - Initialisation dans onMounted
   - ~5 lignes ajoutées

4. **Tester**
   - Cliquer sur position → voir Sankey + distances
   - Vérifier changement de position
   - Vérifier désélection
   - Vérifier filtres (locus, hétérozygosité)

## Impact

- **Code nouveau :** ~200 lignes au total
- **Code réutilisé :** 3 composants + 1 service existants
- **Pages supprimées :** PositionDistancesView.vue peut être conservée ou supprimée
- **Breaking changes :** Aucun (mode Batch inchangé)

## Bénéfices

1. **UX améliorée :** Analyse complète d'une position en un seul endroit
2. **Focus :** Une position à la fois = analyse approfondie
3. **Cohérence :** Sankey + distances pour la même position
4. **Simplicité :** Pas de navigation entre pages
5. **Performance :** Chargement à la demande des données de distance

## Notes d'implémentation

- Utiliser `<transition>` Vue.js pour animations smooth
- Gérer le loading state pendant chargement SQLite
- Afficher un message clair si aucune donnée de distance disponible
- Conserver le scroll automatique vers la section analysée lors de la sélection
