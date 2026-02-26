# Plan de refonte du site div-website avec dataset curé

## ✅ État actuel : DONNÉES PRÊTES

Toutes les données ont été préparées et copiées dans `/public/data/` :

```
✓ curated_metadata.csv              82 KB   (432 structures unifiées)
✓ min_distances_A.csv               7.6 MB  (86,424 lignes)
✓ min_distances_B.csv               6.1 MB  (69,786 lignes)
✓ distances_A.sqlite                13 MB   (base optimisée)
✓ distances_B.sqlite                11 MB   (base optimisée)
✓ contact_targets_A.csv             2.4 KB  (statistiques par position)
✓ contact_targets_B.csv             2.5 KB  (statistiques par position)
✓ polymorphism_distance_variance.csv 6.1 KB (variance par AA)
✓ hla_peptide_contacts_summary_A.csv 659 B
✓ hla_peptide_contacts_summary_B.csv 732 B
✓ structures/alphafold3/            165 MB  (481 fichiers .cif)
✓ structures/tcrmodel2/             120 MB  (478 fichiers .pdb)
```

**Anciennes données sauvegardées** dans `_backup_old_data/` (à supprimer après validation)

---

## 📋 Modifications du code nécessaires

### PHASE 1: Mise à jour de la page "Structures Database"

#### Fichier 1: `/src/services/hlaStructuresService.js`

**Changements à effectuer:**

1. **Remplacer la fonction `loadStructuresData()`** (actuellement lignes ~20-60)

```javascript
// ANCIEN CODE (à supprimer)
export async function loadStructuresData(datasetType) {
  const fileName = datasetType === 'pdb'
    ? '/data/PDB_contact_metadata.csv'
    : '/data/VDJdb_contact_metadata.csv';

  const response = await fetch(fileName);
  // ... parsing spécifique VDJdb/PDB
}

// NOUVEAU CODE
export async function loadStructuresData() {
  const cacheKey = 'curated_structures';

  // Vérifier le cache
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  // Charger les métadonnées unifiées
  const response = await fetch('/data/curated_metadata.csv');
  if (!response.ok) {
    throw new Error(`Erreur lors du chargement: ${response.statusText}`);
  }

  const csvText = await response.text();

  const result = Papa.parse(csvText, {
    header: true,
    delimiter: ',',
    dynamicTyping: true,
    skipEmptyLines: true
  });

  if (result.errors.length > 0) {
    console.warn('Erreurs lors du parsing CSV:', result.errors);
  }

  const data = result.data;

  // Mettre en cache (1 heure)
  setCachedData(cacheKey, data, 3600000);

  return data;
}
```

2. **Ajouter une fonction de filtrage par locus**

```javascript
export function filterByLocus(structures, locus) {
  if (!locus || locus === 'All') {
    return structures;
  }
  return structures.filter(s => s.locus === locus);
}
```

3. **Ajouter une fonction de statistiques**

```javascript
export function getStructureStatistics(structures) {
  const stats = {
    total: structures.length,
    byLocus: {},
    bySource: {},
    avgIpTM: 0,
    minIpTM: Infinity,
    maxIpTM: -Infinity
  };

  structures.forEach(s => {
    // Par locus
    stats.byLocus[s.locus] = (stats.byLocus[s.locus] || 0) + 1;

    // Par source
    stats.bySource[s.best_source] = (stats.bySource[s.best_source] || 0) + 1;

    // ipTM
    const iptm = parseFloat(s.best_iptm);
    if (!isNaN(iptm)) {
      stats.avgIpTM += iptm;
      stats.minIpTM = Math.min(stats.minIpTM, iptm);
      stats.maxIpTM = Math.max(stats.maxIpTM, iptm);
    }
  });

  stats.avgIpTM = stats.avgIpTM / structures.length;

  return stats;
}
```

#### Fichier 2: `/src/components/HlaStructures/HlaStructuresView.vue`

**Changements majeurs:**

1. **Supprimer le système d'onglets VDJdb/PDB** et remplacer par une table unifiée avec filtres par locus

Voici le nouveau code complet du composant (remplacer tout le contenu):

```vue
<template>
  <div class="structures-view">
    <v-container fluid>
      <!-- En-tête -->
      <v-row class="mb-4">
        <v-col cols="12">
          <h1>Database des structures TCR-pMHC</h1>
          <p class="text-subtitle-1">
            {{ filteredStructures.length }} structures curées (HLA Class I - Locus A et B)
          </p>
        </v-col>
      </v-row>

      <!-- Filtres par locus -->
      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <v-chip-group v-model="selectedLocus" mandatory>
            <v-chip value="All" color="primary" variant="outlined">
              Tous ({{ structures.length }})
            </v-chip>
            <v-chip value="A" color="blue" variant="outlined">
              HLA-A ({{ countByLocus('A') }})
            </v-chip>
            <v-chip value="B" color="green" variant="outlined">
              HLA-B ({{ countByLocus('B') }})
            </v-chip>
          </v-chip-group>
        </v-col>

        <v-col cols="12" md="2">
          <v-select
            v-model="selectedSource"
            :items="['All', 'AF3', 'TCRmodel2']"
            label="Source"
            density="compact"
          ></v-select>
        </v-col>

        <v-col cols="12" md="3">
          <v-autocomplete
            v-model="selectedSpecies"
            :items="availableSpecies"
            label="Pathogène"
            clearable
            density="compact"
          ></v-autocomplete>
        </v-col>

        <v-col cols="12" md="3">
          <v-text-field
            v-model="search"
            label="Rechercher"
            prepend-icon="mdi-magnify"
            clearable
            density="compact"
          ></v-text-field>
        </v-col>
      </v-row>

      <!-- Table des structures -->
      <v-row>
        <v-col cols="12">
          <v-data-table
            :headers="headers"
            :items="filteredStructures"
            :loading="loading"
            :search="search"
            :items-per-page="25"
            item-value="curated_id"
            show-expand
            class="elevation-2"
            density="comfortable"
          >
            <!-- Colonne curated_id -->
            <template v-slot:item.curated_id="{ item }">
              <v-chip size="small" color="primary" variant="outlined">
                {{ item.curated_id }}
              </v-chip>
            </template>

            <!-- Colonne locus -->
            <template v-slot:item.locus="{ item }">
              <v-chip size="small" :color="item.locus === 'A' ? 'blue' : 'green'">
                {{ item.locus }}
              </v-chip>
            </template>

            <!-- Colonne allèle -->
            <template v-slot:item.allele="{ item }">
              <code>{{ item.allele }}</code>
            </template>

            <!-- Colonne peptide -->
            <template v-slot:item.peptide="{ item }">
              <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                  <span v-bind="props" style="font-family: monospace">
                    {{ item.peptide }}
                  </span>
                </template>
                <div v-if="item.peptide_gene || item.peptide_species">
                  <div v-if="item.peptide_gene"><strong>Gene:</strong> {{ item.peptide_gene }}</div>
                  <div v-if="item.peptide_species"><strong>Species:</strong> {{ item.peptide_species }}</div>
                </div>
              </v-tooltip>
            </template>

            <!-- Colonne best_source -->
            <template v-slot:item.best_source="{ item }">
              <v-chip
                size="small"
                :color="item.best_source === 'AF3' ? 'purple' : 'orange'"
                variant="outlined"
              >
                {{ item.best_source }}
              </v-chip>
            </template>

            <!-- Colonne best_iptm -->
            <template v-slot:item.best_iptm="{ item }">
              <v-chip size="small" :color="getIptmColor(item.best_iptm)">
                {{ item.best_iptm?.toFixed(2) || 'N/A' }}
              </v-chip>
            </template>

            <!-- Ligne expandable pour CDR3 et infos détaillées -->
            <template v-slot:expanded-row="{ columns, item }">
              <tr>
                <td :colspan="columns.length" class="pa-4 bg-grey-lighten-4">
                  <!-- CDR3 Sequences -->
                  <v-row>
                    <v-col cols="12" md="6">
                      <strong>CDR3 Alpha:</strong>
                      <code class="ml-2">{{ item.CDR3_alpha || 'N/A' }}</code>
                      <span v-if="item.TCRA_V" class="ml-2 text-caption">
                        ({{ item.TCRA_V }} - {{ item.TCRA_J }})
                      </span>
                    </v-col>
                    <v-col cols="12" md="6">
                      <strong>CDR3 Beta:</strong>
                      <code class="ml-2">{{ item.CDR3_beta || 'N/A' }}</code>
                      <span v-if="item.TCRB_V" class="ml-2 text-caption">
                        ({{ item.TCRB_V }} - {{ item.TCRB_J }})
                      </span>
                    </v-col>
                  </v-row>

                  <!-- Peptide Info -->
                  <v-row class="mt-2" v-if="item.peptide_gene || item.peptide_species">
                    <v-col cols="12" md="6">
                      <strong>Peptide Gene:</strong>
                      <span class="ml-2">{{ item.peptide_gene || 'N/A' }}</span>
                    </v-col>
                    <v-col cols="12" md="6">
                      <strong>Peptide Species:</strong>
                      <v-chip size="small" color="info" class="ml-2">
                        {{ item.peptide_species || 'N/A' }}
                      </v-chip>
                    </v-col>
                  </v-row>

                  <!-- Structure Info -->
                  <v-row class="mt-2">
                    <v-col cols="12">
                      <strong>Structure ID:</strong>
                      <span class="ml-2">{{ item.structure_id }}</span>
                    </v-col>
                  </v-row>

                  <!-- Reference -->
                  <v-row class="mt-2" v-if="item.reference">
                    <v-col cols="12">
                      <strong>Reference:</strong>
                      <span class="ml-2 text-caption">{{ item.reference }}</span>
                    </v-col>
                  </v-row>

                  <!-- Actions -->
                  <v-row class="mt-2">
                    <v-col cols="12">
                      <v-btn
                        color="primary"
                        size="small"
                        @click="viewStructure3D(item)"
                      >
                        <v-icon left>mdi-cube-outline</v-icon>
                        Visualiser 3D
                      </v-btn>
                    </v-col>
                  </v-row>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-col>
      </v-row>

      <!-- Statistiques -->
      <v-row class="mt-6">
        <v-col cols="12">
          <h2>Statistiques</h2>
        </v-col>

        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>Distribution par locus</v-card-title>
            <v-card-text>
              <div id="locus-chart"></div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>Distribution par source</v-card-title>
            <v-card-text>
              <div id="source-chart"></div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>Distribution ipTM</v-card-title>
            <v-card-text>
              <div id="iptm-chart"></div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { loadStructuresData, getStructureStatistics } from '../../services/hlaStructuresService'
import * as d3 from 'd3'

// État
const structures = ref([])
const loading = ref(true)
const selectedLocus = ref('All')
const selectedSource = ref('All')
const selectedSpecies = ref(null)
const search = ref('')

// Liste des pathogènes disponibles
const availableSpecies = computed(() => {
  const species = new Set()
  structures.value.forEach(s => {
    if (s.peptide_species) species.add(s.peptide_species)
  })
  return ['All', ...Array.from(species).sort()]
})

// Headers de la table
const headers = [
  { title: 'ID', key: 'curated_id', sortable: true },
  { title: 'Locus', key: 'locus', sortable: true },
  { title: 'Allèle', key: 'allele', sortable: true },
  { title: 'Peptide', key: 'peptide', sortable: true },
  { title: 'Source', key: 'best_source', sortable: true },
  { title: 'ipTM', key: 'best_iptm', sortable: true },
  { title: 'VDJdb', key: 'vdjdb_score', sortable: true }
]

// Structures filtrées
const filteredStructures = computed(() => {
  let filtered = structures.value

  // Filtre par locus
  if (selectedLocus.value !== 'All') {
    filtered = filtered.filter(s => s.locus === selectedLocus.value)
  }

  // Filtre par source
  if (selectedSource.value !== 'All') {
    filtered = filtered.filter(s => s.best_source === selectedSource.value)
  }

  // Filtre par pathogène
  if (selectedSpecies.value && selectedSpecies.value !== 'All') {
    filtered = filtered.filter(s => s.peptide_species === selectedSpecies.value)
  }

  return filtered
})

// Fonctions
function countByLocus(locus) {
  return structures.value.filter(s => s.locus === locus).length
}

function getIptmColor(iptm) {
  if (!iptm) return 'grey'
  if (iptm >= 0.8) return 'success'
  if (iptm >= 0.7) return 'warning'
  return 'error'
}

function viewStructure3D(item) {
  // TODO: Naviguer vers le visualiseur 3D avec l'item
  console.log('Visualiser structure:', item)
}

// Créer les charts D3.js
function createCharts() {
  const stats = getStructureStatistics(structures.value)

  // Chart locus
  createPieChart(
    Object.entries(stats.byLocus).map(([name, value]) => ({ name, value })),
    'locus-chart',
    ['#2196F3', '#4CAF50']
  )

  // Chart source
  createPieChart(
    Object.entries(stats.bySource).map(([name, value]) => ({ name, value })),
    'source-chart',
    ['#9C27B0', '#FF9800']
  )

  // Histogram ipTM
  createIptmHistogram(structures.value, 'iptm-chart')
}

function createPieChart(data, containerId, colors) {
  const width = 250
  const height = 250
  const radius = Math.min(width, height) / 2

  d3.select(`#${containerId}`).selectAll('*').remove()

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`)

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.name))
    .range(colors)

  const pie = d3.pie().value(d => d.value)
  const arc = d3.arc().innerRadius(0).outerRadius(radius)

  svg.selectAll('path')
    .data(pie(data))
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.name))
    .attr('stroke', 'white')
    .style('stroke-width', '2px')

  // Légende
  const legend = svg.selectAll('.legend')
    .data(data)
    .enter()
    .append('g')
    .attr('transform', (d, i) => `translate(${radius + 10}, ${i * 20 - 30})`)

  legend.append('rect')
    .attr('width', 15)
    .attr('height', 15)
    .attr('fill', d => color(d.name))

  legend.append('text')
    .attr('x', 20)
    .attr('y', 12)
    .text(d => `${d.name}: ${d.value}`)
    .style('font-size', '12px')
}

function createIptmHistogram(data, containerId) {
  const width = 250
  const height = 200
  const margin = { top: 20, right: 20, bottom: 30, left: 40 }

  d3.select(`#${containerId}`).selectAll('*').remove()

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)

  const iptmValues = data.map(d => d.best_iptm).filter(v => v !== null && v !== undefined)

  const x = d3.scaleLinear()
    .domain([0.6, 1.0])
    .range([0, width - margin.left - margin.right])

  const bins = d3.histogram()
    .domain(x.domain())
    .thresholds(x.ticks(10))(iptmValues)

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .range([height - margin.top - margin.bottom, 0])

  svg.selectAll('rect')
    .data(bins)
    .enter()
    .append('rect')
    .attr('x', d => x(d.x0))
    .attr('y', d => y(d.length))
    .attr('width', d => x(d.x1) - x(d.x0) - 1)
    .attr('height', d => height - margin.top - margin.bottom - y(d.length))
    .attr('fill', '#2196F3')

  svg.append('g')
    .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5))

  svg.append('g')
    .call(d3.axisLeft(y))
}

// Chargement initial
onMounted(async () => {
  loading.value = true
  try {
    structures.value = await loadStructuresData()
    console.log(`${structures.value.length} structures chargées`)

    // Créer les charts après un court délai
    setTimeout(createCharts, 100)
  } catch (error) {
    console.error('Erreur lors du chargement:', error)
  } finally {
    loading.value = false
  }
})

// Recréer les charts quand les filtres changent
watch([selectedLocus, selectedSource], () => {
  setTimeout(createCharts, 100)
})
</script>

<style scoped>
.structures-view {
  padding: 20px;
}

code {
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}
</style>
```

---

### PHASE 2: Nouvelle page "Distance Explorer"

#### Étape 1: Installer sql.js

```bash
cd /root/websites/div-website/visualisation-hla
npm install sql.js
```

#### Étape 2: Copier le service SQLite

```bash
cp /root/publications/divergence_c1_curated/scripts/04_webapp/distanceExplorerService_sqlite.js \
   src/services/distanceExplorerService.js
```

#### Étape 3: Créer le composant Distance Explorer

**Créer le dossier:**
```bash
mkdir -p src/components/DistanceExplorer
```

**Créer le fichier:** `/src/components/DistanceExplorer/DistanceExplorerView.vue`

```vue
<template>
  <div class="distance-explorer">
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <h1>Explorateur de distances</h1>
          <p class="text-subtitle-1">
            Analyse des distances minimales HLA ↔ TCR/Peptide ({{ totalDistances.toLocaleString() }} mesures)
          </p>
        </v-col>
      </v-row>

      <!-- Filtres de base -->
      <v-row class="mb-4">
        <v-col cols="12" md="3">
          <v-chip-group v-model="selectedLocus" mandatory>
            <v-chip value="A" color="blue">HLA-A</v-chip>
            <v-chip value="B" color="green">HLA-B</v-chip>
          </v-chip-group>
        </v-col>

        <v-col cols="12" md="3">
          <v-select
            v-model="selectedTarget"
            :items="['TCR', 'Peptide', 'Both']"
            label="Cible"
            density="compact"
          ></v-select>
        </v-col>

        <v-col cols="12" md="3">
          <v-text-field
            v-model.number="selectedPosition"
            label="Position (optionnel)"
            type="number"
            min="1"
            max="180"
            clearable
            density="compact"
          ></v-text-field>
        </v-col>

        <v-col cols="12" md="3">
          <v-btn
            color="primary"
            block
            @click="loadDistances"
            :loading="loading"
          >
            Charger les distances
          </v-btn>
        </v-col>
      </v-row>

      <!-- Statistiques rapides -->
      <v-row v-if="distances.length > 0" class="mb-4">
        <v-col cols="12" md="3">
          <v-card color="primary" dark>
            <v-card-text>
              <div class="text-h4">{{ distances.length.toLocaleString() }}</div>
              <div>Distances trouvées</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="success" dark>
            <v-card-text>
              <div class="text-h4">{{ stats.mean.toFixed(2) }} Å</div>
              <div>Distance moyenne</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="warning" dark>
            <v-card-text>
              <div class="text-h4">{{ stats.median.toFixed(2) }} Å</div>
              <div>Distance médiane</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="error" dark>
            <v-card-text>
              <div class="text-h4">{{ stats.min.toFixed(2) }} Å</div>
              <div>Distance minimale</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Résultats -->
      <v-row v-if="distances.length > 0">
        <v-col cols="12">
          <v-card>
            <v-card-title>
              Distances (affichage limité à 100 premières lignes)
            </v-card-title>
            <v-card-text>
              <v-data-table
                :headers="distanceHeaders"
                :items="distances.slice(0, 100)"
                density="compact"
                :items-per-page="25"
              >
                <template v-slot:item.min_distance="{ item }">
                  <v-chip
                    size="small"
                    :color="getDistanceColor(item.min_distance)"
                  >
                    {{ item.min_distance.toFixed(2) }} Å
                  </v-chip>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Placeholder pour visualisations futures -->
      <v-row v-if="distances.length > 0" class="mt-6">
        <v-col cols="12">
          <v-alert type="info" variant="tonal">
            <strong>🚧 Visualisations à venir</strong>
            <ul class="mt-2">
              <li>Heatmap position × acide aminé</li>
              <li>Boxplot par position</li>
              <li>Diagramme Sankey des contacts</li>
            </ul>
            <p class="mt-2 text-caption">
              Voir <code>/root/publications/divergence_c1_curated/scripts/04_webapp/README.md</code>
              pour des exemples d'implémentation
            </p>
          </v-alert>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  loadDistanceDatabase,
  getDistancesByPosition,
  getDistancesByTarget,
  getAllDistances
} from '../../services/distanceExplorerService'

const selectedLocus = ref('A')
const selectedTarget = ref('Peptide')
const selectedPosition = ref(null)
const distances = ref([])
const loading = ref(false)

const totalDistances = computed(() => {
  return selectedLocus.value === 'A' ? 86424 : 69786
})

const distanceHeaders = [
  { title: 'Structure', key: 'structure_id', sortable: true },
  { title: 'Allèle', key: 'allele', sortable: true },
  { title: 'Position', key: 'position', sortable: true },
  { title: 'AA', key: 'aa', sortable: true },
  { title: 'Cible', key: 'target', sortable: true },
  { title: 'Distance', key: 'min_distance', sortable: true }
]

const stats = computed(() => {
  if (distances.value.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0 }
  }

  const sorted = [...distances.value].sort((a, b) => a.min_distance - b.min_distance)
  const sum = sorted.reduce((acc, d) => acc + d.min_distance, 0)

  return {
    mean: sum / sorted.length,
    median: sorted[Math.floor(sorted.length / 2)].min_distance,
    min: sorted[0].min_distance,
    max: sorted[sorted.length - 1].min_distance
  }
})

function getDistanceColor(distance) {
  if (distance < 4) return 'success'
  if (distance < 8) return 'warning'
  return 'error'
}

async function loadDistances() {
  loading.value = true
  try {
    if (selectedPosition.value) {
      // Charger pour une position spécifique
      distances.value = await getDistancesByPosition(
        selectedLocus.value,
        selectedPosition.value
      )
    } else if (selectedTarget.value !== 'Both') {
      // Charger pour une cible spécifique
      distances.value = await getDistancesByTarget(
        selectedLocus.value,
        selectedTarget.value
      )
    } else {
      // Charger tout (attention: lourd!)
      distances.value = await getAllDistances(selectedLocus.value)
    }

    console.log(`${distances.value.length} distances chargées`)
  } catch (error) {
    console.error('Erreur:', error)
    alert(`Erreur lors du chargement: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// Pré-charger la base au montage
onMounted(async () => {
  try {
    await loadDistanceDatabase(selectedLocus.value)
    console.log('Base SQLite chargée avec succès')
  } catch (error) {
    console.error('Erreur lors du chargement de la base:', error)
  }
})
</script>

<style scoped>
.distance-explorer {
  padding: 20px;
}
</style>
```

#### Étape 4: Ajouter la route

**Fichier:** `/src/App.vue`

1. **Importer le composant** (en haut du script):

```javascript
import DistanceExplorerView from './components/DistanceExplorer/DistanceExplorerView.vue'
```

2. **Ajouter l'onglet dans la navigation:**

```vue
<v-tab value="distanceExplorer">
  <v-icon left small class="mr-2">mdi-chart-scatter-plot</v-icon>
  Distance Explorer
</v-tab>
```

3. **Ajouter le contenu dans le v-window:**

```vue
<v-window-item value="distanceExplorer">
  <DistanceExplorerView />
</v-window-item>
```

---

### PHASE 3: Mise à jour du visualiseur 3D

#### Fichier: `/src/components/StructureViewer/StructureViewerPage.vue`

**Trouver la fonction de chargement de structure** (probablement ligne ~100-200) et modifier:

```javascript
// ANCIEN CODE (exemple)
async function loadStructure(structureId) {
  const response = await fetch(`/data/ranked_0_collected/${structureId}.pdb`)
  const pdbData = await response.text()
  viewer.addModel(pdbData, 'pdb')
  viewer.render()
}

// NOUVEAU CODE
async function loadStructure(item) {
  // item doit contenir: structure_file, best_source
  const structurePath = item.structure_file  // Ex: /data/structures/alphafold3/xxx.cif

  try {
    const response = await fetch(structurePath)
    if (!response.ok) {
      throw new Error(`Structure introuvable: ${structurePath}`)
    }

    const structureData = await response.text()

    // Déterminer le format basé sur la source
    const format = item.best_source === 'AF3' ? 'cif' : 'pdb'

    // Charger dans 3Dmol
    viewer.removeAllModels()
    viewer.addModel(structureData, format)
    viewer.setStyle({}, { cartoon: { color: 'spectrum' } })
    viewer.zoomTo()
    viewer.render()

    console.log(`Structure chargée: ${item.curated_id} (format: ${format})`)
  } catch (error) {
    console.error('Erreur lors du chargement de la structure:', error)
    alert(`Impossible de charger la structure: ${error.message}`)
  }
}
```

**Note importante:** Vérifier que la version de 3Dmol.js installée supporte le format CIF. Si problème, mettre à jour:

```bash
npm update 3dmol
```

---

## ✅ Checklist d'implémentation

### Immédiat (✅ fait)
- [x] Diviser min_distances.csv par locus
- [x] Générer les bases SQLite
- [x] Copier les métadonnées unifiées
- [x] Copier les 432 structures 3D (285 MB)
- [x] Copier les fichiers d'analyse
- [x] Sauvegarder les anciennes données

### Phase 1 - Structures Database (2-3 heures)
- [ ] Modifier `src/services/hlaStructuresService.js`
- [ ] Remplacer `src/components/HlaStructures/HlaStructuresView.vue`
- [ ] Tester le chargement des métadonnées (432 structures)
- [ ] Tester les filtres par locus (A: 239, B: 193)
- [ ] Tester l'affichage des CDR3 (expand rows)
- [ ] Vérifier les statistiques D3.js

### Phase 2 - Distance Explorer (4-6 heures)
- [ ] Installer `sql.js`: `npm install sql.js`
- [ ] Copier `distanceExplorerService.js` vers `src/services/`
- [ ] Créer `src/components/DistanceExplorer/DistanceExplorerView.vue`
- [ ] Ajouter l'import dans `App.vue`
- [ ] Ajouter l'onglet dans la navigation
- [ ] Ajouter le v-window-item
- [ ] Tester le chargement SQLite
- [ ] Tester les requêtes de base

### Phase 3 - Visualiseur 3D (1 heure)
- [ ] Modifier `src/components/StructureViewer/StructureViewerPage.vue`
- [ ] Tester avec fichier .cif (AlphaFold3)
- [ ] Tester avec fichier .pdb (TCRmodel2)
- [ ] Vérifier que 3Dmol.js supporte CIF (sinon: `npm update 3dmol`)

### Phase 4 - Tests (1-2 heures)
- [ ] Tester sur Chrome, Firefox, Safari
- [ ] Tester les performances de chargement
- [ ] Tester les filtres et recherches
- [ ] Vérifier l'affichage mobile
- [ ] Valider les exports CSV (si existants)

### Phase 5 - Nettoyage (30 min)
- [ ] Supprimer `public/data/_backup_old_data/` après validation complète
- [ ] Mettre à jour le `CLAUDE.md` du site web
- [ ] Commit Git avec message descriptif
- [ ] Build de production: `npm run build`

---

## 🚨 Points d'attention

### 1. Format CIF et 3Dmol.js
- **Problème potentiel:** 3Dmol.js doit être en version 2.0+ pour supporter CIF
- **Solution:** Vérifier la version dans `package.json`, sinon `npm update 3dmol`
- **Alternative:** Convertir les .cif en .pdb avec BioPython si problème persistant

### 2. Taille des fichiers SQLite
- Les bases SQLite sont plus grosses que les CSV (~13MB vs 7.6MB pour A)
- C'est normal sans compression VACUUM active
- **Option:** Utiliser les CSV si vous préférez (changer dans le service)
- **Option:** Optimiser les SQLite (voir script Python, activer VACUUM)

### 3. Performance mobile
- Les datasets sont lourds (13-11 MB par locus)
- Tester sur mobile 4G
- **Solution:** Limiter l'affichage à 100 lignes par défaut (déjà fait dans le code)

### 4. Chemins des structures
- Les chemins dans `curated_metadata.csv` sont déjà mis à jour vers `/data/structures/...`
- Vérifier que `structure_file` est bien utilisé dans le visualiseur 3D

### 5. Anciennes données
- Sauvegardées dans `_backup_old_data/`
- À supprimer après validation complète du nouveau système
- **Taille libérée:** ~100 MB

---

## 📚 Documentation de référence

### Scripts et guides créés

1. **`/root/publications/divergence_c1_curated/scripts/04_webapp/prepare_web_data.py`**
   - Script Python de préparation des données (déjà exécuté)

2. **`/root/publications/divergence_c1_curated/scripts/04_webapp/README.md`**
   - Guide complet d'utilisation
   - Exemples de code Vue.js
   - Benchmark CSV vs SQLite
   - Exemples de requêtes SQL

3. **`/root/publications/divergence_c1_curated/scripts/04_webapp/distanceExplorerService_sqlite.js`**
   - Service JavaScript complet avec toutes les fonctions
   - Exemples d'utilisation commentés
   - 15+ fonctions de requêtes optimisées

4. **`/root/.claude/plans/graceful-beaming-moth.md`**
   - Plan architectural complet initial
   - Contexte et décisions de design

5. **Ce fichier** (`/root/websites/div-website/PLAN_REFONTE.md`)
   - Modifications exactes du code
   - Guide étape par étape d'implémentation

---

## 🎯 Résumé final

### Ce qui est PRÊT (✅):
- ✅ **Données** : Toutes copiées dans `/public/data/`
- ✅ **Structures 3D** : 481 CIF + 478 PDB (285 MB)
- ✅ **Distances** : CSV (14 MB) + SQLite (24 MB)
- ✅ **Métadonnées** : 432 structures unifiées
- ✅ **Service JavaScript** : Code complet pour SQLite
- ✅ **Anciennes données** : Sauvegardées (backup)

### Ce qu'il faut FAIRE:
1. **Phase 1** : Refactorer HlaStructuresView.vue (code fourni ci-dessus)
2. **Phase 2** : Créer DistanceExplorerView.vue (code fourni ci-dessus)
3. **Phase 3** : Mettre à jour le visualiseur 3D (code fourni ci-dessus)
4. **Phase 4** : Tester tout
5. **Phase 5** : Nettoyer et déployer

### Temps estimé total: 8-12 heures de développement

---

**Bon courage pour l'implémentation ! 🚀**

Toutes les données sont prêtes, le code est fourni, il ne reste plus qu'à copier-coller et tester.

Pour toute question, consultez :
- Le README technique : `/root/publications/divergence_c1_curated/scripts/04_webapp/README.md`
- Le plan architectural : `/root/.claude/plans/graceful-beaming-moth.md`
- Les exemples SQLite : `distanceExplorerService_sqlite.js`
