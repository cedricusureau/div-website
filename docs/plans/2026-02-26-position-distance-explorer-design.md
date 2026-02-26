# Position Distance Explorer - Design Document

**Date:** 2026-02-26
**Statut:** Approuvé pour implémentation

## Vue d'ensemble

Nouvelle page permettant de visualiser la distribution des distances d'une position HLA spécifique vis-à-vis du peptide et/ou du TCR. Utilise les bases SQLite `distances_A.sqlite` et `distances_B.sqlite` avec des kernel density plots (KDE) pour visualiser les distributions.

## Architecture

### Structure des composants

```
src/components/PositionDistances/
├── PositionDistancesView.vue          # Container principal
├── components/
│   ├── PositionSelector.vue           # Slider + radio locus + mini aperçu
│   ├── GlobalDistributionChart.vue    # KDE plot distribution globale
│   ├── TargetBreakdownChart.vue       # KDE comparatif Peptide vs TCR
│   └── AminoAcidBreakdownChart.vue    # KDE superposés par acide aminé
└── services/
    └── positionDistancesService.js    # Service SQLite + calculs KDE
```

### Données SQLite

**Schéma de `distances` table:**
```sql
CREATE TABLE distances (
  structure_id TEXT,
  locus TEXT,
  allele TEXT,
  position INTEGER,
  aa TEXT,
  target TEXT,           -- 'Peptide' ou 'TCR'
  min_distance REAL,
  best_source TEXT,
  best_iptm REAL
)
```

**Requête principale:**
```sql
SELECT min_distance, aa, target
FROM distances
WHERE position = ? AND locus = ?
```

## Interface utilisateur

### Layout de la page

```
┌─────────────────────────────────────────┐
│  Position Distance Explorer              │
├─────────────────────────────────────────┤
│  PositionSelector                        │
│  Locus: (•) A  ( ) B                    │
│  [1 ←====•=====→ 182]  Position: 45:A  │
│  [Mini bar chart aperçu]                │
├─────────────────────────────────────────┤
│  Distribution globale                    │
│  [KDE plot + histogram background]      │
│  Stats: n=432, μ=6.2Å, σ=2.1Å          │
├─────────────────────────────────────────┤
│  Distribution par cible                  │
│  [KDE Peptide (bleu) vs TCR (rouge)]   │
│  [Légende interactive]                   │
├─────────────────────────────────────────┤
│  Distribution par acide aminé            │
│  [Multiple KDE overlay avec opacité]    │
│  [Légende: M (n=125), T (n=89), ...]   │
└─────────────────────────────────────────┘
```

### PositionSelector.vue

**Éléments:**
- Radio buttons pour sélectionner le locus (A ou B)
- Slider de 1 à 182 pour la position
- Display de la position courante au format "45:A"
- Mini bar chart montrant le nombre de mesures par position pour le locus actif

**Comportement:**
- Changement de locus → recharge les données du SQLite correspondant
- Changement de position → debounce 300ms → requête SQLite
- Mini bar chart cliquable pour jump à une position

## Visualisations

### 1. GlobalDistributionChart.vue

**Données:** Toutes les valeurs `min_distance` pour position:locus

**Visualisation D3:**
- KDE plot (courbe lissée) avec histogramme en arrière-plan
- Axes: X = Distance (Å), Y = Densité
- Statistiques affichées: n, médiane, moyenne, écart-type
- Tooltips sur hover

### 2. TargetBreakdownChart.vue

**Données:** Filtrées par `target = 'Peptide'` et `target = 'TCR'`

**Visualisation D3:**
- Deux KDE plots superposés
- Couleurs: Peptide (#2196F3 bleu), TCR (#F44336 rouge)
- Légende interactive (clic pour masquer/afficher)
- Même échelle X/Y pour comparaison directe

### 3. AminoAcidBreakdownChart.vue

**Données:** Groupées par colonne `aa`

**Visualisation D3:**
- Multiple KDE plots superposés (un par acide aminé présent)
- Opacité 0.6 pour les courbes, 1.0 pour celle en focus (hover)
- Légende avec nombre de structures par AA: "M (n=125)"
- Palette de couleurs catégorielle D3 (schemeCategory10 ou custom)

## Service technique

### positionDistancesService.js

**Responsabilités:**
- Chargement et cache des bases SQLite (distances_A.sqlite, distances_B.sqlite)
- Requêtes SQL pour récupérer les données par position:locus
- Calcul du KDE (Kernel Density Estimation)
- Calculs statistiques (moyenne, écart-type, médiane)

**API principale:**

```javascript
class PositionDistancesService {
  async init()
  async loadDatabase(locus)
  async getPositionData(locus, position)
  async getPositionCountsByLocus(locus)
  calculateKDE(values, bandwidth, numPoints)
  calculateStats(values)
}
```

### Algorithme KDE (implémentation manuelle)

**Kernel Gaussien:**
```javascript
calculateKDE(values, bandwidth = 'auto', numPoints = 100) {
  // Bandwidth automatique (règle de Silverman)
  if (bandwidth === 'auto') {
    const std = this.standardDeviation(values)
    bandwidth = 1.06 * std * Math.pow(values.length, -1/5)
  }

  // Génération grille d'évaluation
  const min = Math.min(...values)
  const max = Math.max(...values)
  const x = [...] // 100 points de min-10% à max+10%

  // Noyau Gaussien
  const gaussian = (u) => Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI)

  // Calcul densité pour chaque point
  const y = x.map(xi => {
    const density = values.reduce((sum, val) =>
      sum + gaussian((xi - val) / bandwidth), 0
    )
    return density / (values.length * bandwidth)
  })

  return { x, y }
}
```

## Interactivité

### Graphiques D3

- **Hover:** Tooltips avec valeurs exactes
- **Légende interactive:** Clic pour masquer/afficher courbes
- **Responsive:** SVG avec viewBox adaptatif
- **Hauteur fixe:** 300px par graphique

### Optimisations

- **Debounce:** 300ms sur changement de position
- **Cache SQLite:** Connexions DB gardées en mémoire par locus
- **Loading states:** Indicateurs pendant les requêtes

## Palette de couleurs

- Peptide: `#2196F3` (bleu Material Design)
- TCR: `#F44336` (rouge Material Design)
- Acides aminés: `d3.schemeCategory10` ou palette custom
- Opacité overlay: 0.6
- Opacité focus: 1.0

## Intégration

**Router (src/router/index.js):**
```javascript
{
  path: '/position-distances',
  name: 'PositionDistances',
  component: () => import('@/components/PositionDistances/PositionDistancesView.vue'),
  meta: { title: 'Position Distance Explorer' }
}
```

**Navigation:** Ajout d'un lien dans le menu principal

## Dépendances

- **Existantes:** D3.js (déjà dans le projet), sql.js (prévu Phase 2), Vuetify
- **Nouvelles:** Aucune (KDE implémenté manuellement)

## Notes d'implémentation

- Utiliser Vuetify `v-container`, `v-row`, `v-col`, `v-card` pour le layout
- SVG D3 dans des `div` avec sizing responsive
- Pas de lancement automatique du serveur de dev (instruction CLAUDE.md)
- Tests manuels par l'utilisateur

## Prochaines étapes

1. Installer sql.js si pas déjà fait
2. Créer la structure des composants
3. Implémenter positionDistancesService.js avec KDE
4. Créer PositionSelector.vue avec slider et mini chart
5. Créer les 3 composants de visualisation D3
6. Intégrer dans le router et navigation
7. Tests manuels utilisateur