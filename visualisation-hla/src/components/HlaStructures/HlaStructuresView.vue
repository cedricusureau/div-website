<script setup>
import { ref, onMounted, computed, getCurrentInstance } from 'vue'
import { loadStructuresData } from '../../services/hlaStructuresService'
import Papa from 'papaparse'
import JSZip from 'jszip'

const allStructures = ref([])
const loading = ref(true)
const error = ref(null)
const activeTab = ref('all')
const search = ref('')
const showColumnSettings = ref(false)
const selected = ref([])

// Filtrer les structures par onglet
const displayedData = computed(() => {
  if (activeTab.value === 'all') return allStructures.value
  return allStructures.value.filter(s => s.locus === activeTab.value)
})

// Headers de colonnes configurables
const headers = ref([
  { title: 'Curated ID', key: 'curated_id', sortable: true, visible: true },
  { title: 'Structure ID', key: 'structure_id', sortable: true, visible: false },
  { title: 'Locus', key: 'locus', visible: true },
  { title: 'Allèle', key: 'allele', visible: true },
  { title: 'Peptide', key: 'peptide', width: '150px', visible: true },
  { title: 'Peptide Gene', key: 'peptide_gene', visible: true },
  { title: 'Peptide Species', key: 'peptide_species', visible: true },
  { title: 'CDR3 Alpha', key: 'CDR3_alpha', visible: false },
  { title: 'CDR3 Beta', key: 'CDR3_beta', visible: false },
  { title: 'TCRA V', key: 'TCRA_V', visible: false },
  { title: 'TCRA J', key: 'TCRA_J', visible: false },
  { title: 'TCRB V', key: 'TCRB_V', visible: false },
  { title: 'TCRB J', key: 'TCRB_J', visible: false },
  { title: 'Best Source', key: 'best_source', visible: true },
  { title: 'Best ipTM', key: 'best_iptm', visible: true },
  { title: 'AF3 ipTM', key: 'af3_iptm', visible: false },
  { title: 'TCRmodel2 ipTM', key: 'tcr_iptm', visible: false },
  { title: 'Reference', key: 'reference', visible: false },
  { title: 'VDJdb Score', key: 'vdjdb_score', visible: false },
  { title: 'Actions', key: 'actions', visible: true, sortable: false, width: '100px' }
])

// Headers visibles uniquement
const visibleHeaders = computed(() => {
  return headers.value.filter(h => h.visible)
})

// Charger toutes les données
const loadAllData = async () => {
  loading.value = true
  try {
    allStructures.value = await loadStructuresData()
    console.log(`${allStructures.value.length} structures chargées`)
  } catch (err) {
    error.value = err.message
    console.error('Erreur de chargement:', err)
  } finally {
    loading.value = false
  }
}

// Fonction d'export CSV
const exportToCSV = (data, filename) => {
  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const exportFileName = computed(() => `structures_${activeTab.value}_${new Date().toISOString().split('T')[0]}.csv`)

const handleExport = () => {
  exportToCSV(displayedData.value, exportFileName.value)
}

// Téléchargement des structures sélectionnées en ZIP
const downloadSelectedStructures = async () => {
  if (!selected.value.length) return

  const zip = new JSZip()

  try {
    const filePromises = selected.value.map(async (curatedId) => {
      try {
        const structure = allStructures.value.find(item => item.curated_id === curatedId)
        if (!structure || !structure.structure_file) {
          throw new Error(`No structure file found for ${curatedId}`)
        }

        const response = await fetch(structure.structure_file)
        if (!response.ok) throw new Error(`Failed to fetch ${structure.structure_file}`)
        const text = await response.text()

        const filename = structure.structure_file.split('/').pop()
        zip.file(filename, text)
      } catch (error) {
        console.error(`Error fetching ${curatedId}:`, error)
      }
    })

    await Promise.all(filePromises)

    const content = await zip.generateAsync({ type: "blob" })

    const url = window.URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = 'selected_structures.zip'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Error creating zip:', error)
  }
}

// Reset visibilité des colonnes
const resetColumnVisibility = () => {
  const defaultVisible = ['curated_id', 'locus', 'allele', 'peptide', 'peptide_gene', 'peptide_species', 'best_source', 'best_iptm', 'actions']

  headers.value.forEach(header => {
    header.visible = defaultVisible.includes(header.key)
  })
}

// Ouvrir le visualiseur 3D
const instance = getCurrentInstance()
const emit = instance.emit

const open3DViewer = (structure) => {
  console.log('Opening 3D viewer for structure:', structure)
  emit('open-3d-viewer', {
    locus: structure.locus,
    structureId: structure.structure_id,
    structureFile: structure.structure_file,
    positions: [],
    distance: '3',
    percentage: '50',
    interactionType: 'Peptide or TCR',
    allele1: '',
    allele2: '',
    showPolymorphicOnly: false,
    entropyThreshold: '0.2'
  })
}

const openTutorial = () => {
  localStorage.setItem('tutorialSection', 'section-structures')
  window.open(window.location.origin + '?openTutorial=true', '_blank')
}

onMounted(() => {
  loadAllData()
})
</script>

<script>
export default {
  name: 'HlaStructuresView',
  emits: ['open-3d-viewer']
}
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center">
            <v-icon color="primary" class="mr-2">mdi-molecule</v-icon>
            <h1 class="text-h5 font-weight-bold mb-0">Structures Database</h1>
          </div>
          <v-tooltip bottom>
            <template #activator="{ props }">
              <v-btn
                icon="mdi-help-circle-outline"
                v-bind="props"
                variant="text"
                color="primary"
                @click="openTutorial"
              ></v-btn>
            </template>
            <span>Open tutorial</span>
          </v-tooltip>
        </div>

        <v-divider class="mb-4"></v-divider>

        <!-- Onglets -->
        <v-tabs v-model="activeTab" color="primary" class="mb-4">
          <v-tab value="all">
            <v-icon left class="mr-2">mdi-view-grid</v-icon>
            All ({{ allStructures.length }})
          </v-tab>
          <v-tab value="A">
            <v-icon left class="mr-2">mdi-alpha-a-circle</v-icon>
            HLA-A ({{ allStructures.filter(s => s.locus === 'A').length }})
          </v-tab>
          <v-tab value="B">
            <v-icon left class="mr-2">mdi-alpha-b-circle</v-icon>
            HLA-B ({{ allStructures.filter(s => s.locus === 'B').length }})
          </v-tab>
        </v-tabs>

        <!-- Barre d'outils -->
        <v-card class="mb-4" elevation="2">
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="search"
                  prepend-inner-icon="mdi-magnify"
                  label="Search"
                  single-line
                  hide-details
                  clearable
                  density="compact"
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="8" class="text-right">
                <v-btn
                  color="primary"
                  variant="outlined"
                  class="mr-2"
                  @click="showColumnSettings = !showColumnSettings"
                >
                  <v-icon left>mdi-view-column</v-icon>
                  Columns
                </v-btn>

                <v-btn
                  color="success"
                  variant="outlined"
                  class="mr-2"
                  @click="handleExport"
                  :disabled="!displayedData.length"
                >
                  <v-icon left>mdi-download</v-icon>
                  Export CSV
                </v-btn>

                <v-btn
                  color="info"
                  variant="outlined"
                  @click="downloadSelectedStructures"
                  :disabled="!selected.length"
                >
                  <v-icon left>mdi-download-multiple</v-icon>
                  Download Selected ({{ selected.length }})
                </v-btn>
              </v-col>
            </v-row>

            <!-- Panneau de configuration des colonnes -->
            <v-expand-transition>
              <v-card v-show="showColumnSettings" class="mt-4" variant="outlined">
                <v-card-title class="text-subtitle-1">
                  Column Visibility
                  <v-btn
                    size="small"
                    variant="text"
                    color="primary"
                    class="ml-2"
                    @click="resetColumnVisibility"
                  >
                    Reset
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <v-row dense>
                    <v-col
                      v-for="header in headers.filter(h => h.key !== 'actions')"
                      :key="header.key"
                      cols="6"
                      md="3"
                    >
                      <v-checkbox
                        v-model="header.visible"
                        :label="header.title"
                        density="compact"
                        hide-details
                      ></v-checkbox>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-expand-transition>
          </v-card-text>
        </v-card>

        <!-- Table de données -->
        <v-card elevation="2">
          <v-data-table
            v-model="selected"
            :headers="visibleHeaders"
            :items="displayedData"
            :search="search"
            :loading="loading"
            :items-per-page="25"
            item-value="curated_id"
            show-select
            class="elevation-1"
          >
            <!-- Colonne Locus -->
            <template #[`item.locus`]="{ item }">
              <v-chip
                size="small"
                :color="item.locus === 'A' ? 'blue' : 'green'"
              >
                {{ item.locus }}
              </v-chip>
            </template>

            <!-- Colonne Allèle -->
            <template #[`item.allele`]="{ item }">
              <code class="text-body-2">{{ item.allele }}</code>
            </template>

            <!-- Colonne Peptide -->
            <template #[`item.peptide`]="{ item }">
              <span style="font-family: monospace; font-weight: 500;">{{ item.peptide }}</span>
            </template>

            <!-- Colonne Best Source -->
            <template #[`item.best_source`]="{ item }">
              <v-chip
                size="small"
                :color="item.best_source === 'AF3' ? 'purple' : 'orange'"
                variant="outlined"
              >
                {{ item.best_source }}
              </v-chip>
            </template>

            <!-- Colonne Best ipTM -->
            <template #[`item.best_iptm`]="{ item }">
              <v-chip
                size="small"
                :color="item.best_iptm >= 0.8 ? 'success' : item.best_iptm >= 0.7 ? 'warning' : 'error'"
              >
                {{ item.best_iptm?.toFixed(3) || 'N/A' }}
              </v-chip>
            </template>

            <!-- Colonne AF3 ipTM -->
            <template #[`item.af3_iptm`]="{ item }">
              <span class="text-body-2">{{ item.af3_iptm?.toFixed(3) || '-' }}</span>
            </template>

            <!-- Colonne TCRmodel2 ipTM -->
            <template #[`item.tcr_iptm`]="{ item }">
              <span class="text-body-2">{{ item.tcr_iptm?.toFixed(3) || '-' }}</span>
            </template>

            <!-- Colonne Actions -->
            <template #[`item.actions`]="{ item }">
              <v-btn
                icon="mdi-cube-outline"
                size="small"
                variant="text"
                color="primary"
                @click="open3DViewer(item)"
              ></v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
code {
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}
</style>
