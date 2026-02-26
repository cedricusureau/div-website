<template>
  <v-container fluid class="structure-viewer-container">
    <v-row>
      <v-col cols="12">
        <v-card flat class="main-viewer-card">
          <v-card-title class="d-flex justify-space-between align-center">
            <div>
              <h2 class="text-h5">3D Structure Viewer</h2>
              <v-chip 
                v-if="structureInfo" 
                color="primary" 
                variant="outlined" 
                size="small"
                class="mt-1"
              >
                {{ structureInfo.label }}
              </v-chip>
            </div>
            <v-btn
              color="primary"
              variant="outlined"
              @click="goBack"
            >
              <v-icon start>mdi-arrow-left</v-icon>
              Back to Analysis
            </v-btn>
          </v-card-title>

          <v-card-subtitle v-if="selectedPositions && selectedPositions.length > 0">
            <div class="d-flex align-center gap-2 mt-2">
              <v-icon small color="info">mdi-map-marker</v-icon>
              <span class="text-subtitle-2">Highlighted Positions ({{ selectedPositions.length }}):</span>
              <div class="d-flex flex-wrap gap-1">
                <v-chip
                  v-for="pos in selectedPositions"
                  :key="pos"
                  size="small"
                  color="red"
                  variant="outlined"
                >
                  {{ pos }}
                </v-chip>
              </div>
            </div>
          </v-card-subtitle>

          <v-card-text>
            <div class="viewer-controls mb-3">
              <v-row>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="selectedStructureId"
                    :items="availableStructures"
                    item-title="label"
                    item-value="id"
                    label="Select Structure"
                    density="compact"
                    variant="outlined"
                    @update:model-value="loadStructure"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="8">
                  <!-- Contrôles pour la structure globale -->
                  <div class="control-section mb-2">
                    <div class="control-label">Structure globale :</div>
                    <v-btn-toggle
                      v-model="globalRepresentation"
                      mandatory
                      density="compact"
                      divided
                      class="mr-3"
                    >
                      <v-btn value="cartoon" size="small">Cartoon</v-btn>
                      <v-btn value="surface" size="small">Surface</v-btn>
                      <v-btn value="stick" size="small">Stick</v-btn>
                      <v-btn value="line" size="small">Line</v-btn>
                    </v-btn-toggle>
                  </div>
                  
                  <!-- Contrôles pour les positions HLA sélectionnées -->
                  <div class="control-section mb-2">
                    <div class="control-label">Positions HLA sélectionnées :</div>
                    <v-btn-toggle
                      v-model="hlaRepresentation"
                      mandatory
                      density="compact"
                      divided
                      class="mr-3"
                    >
                      <v-btn value="stick" size="small">Stick</v-btn>
                      <v-btn value="sphere" size="small">Sphere</v-btn>
                      <v-btn value="surface" size="small">Surface</v-btn>
                      <v-btn value="ball+stick" size="small">Ball+Stick</v-btn>
                    </v-btn-toggle>
                  </div>
                  
                  <div class="d-flex justify-end gap-2 mt-2">
                    <v-btn
                      color="primary"
                      variant="outlined"
                      size="small"
                      @click="centerView"
                    >
                      <v-icon start>mdi-crosshairs-gps</v-icon>
                      Center
                    </v-btn>
                    
                    <v-btn
                      color="secondary"
                      variant="outlined"
                      size="small"
                      @click="downloadScreenshot"
                    >
                      <v-icon start>mdi-camera</v-icon>
                      Screenshot
                    </v-btn>
                  </div>
                </v-col>
              </v-row>
            </div>

            <div 
              ref="viewerContainer" 
              class="structure-viewer"
              :style="{ height: '600px', position: 'relative', backgroundColor: '#f5f5f5' }"
            >
              <div v-if="loading" class="viewer-loading">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                <p class="mt-3">Loading 3D structure...</p>
              </div>
              <div v-if="error" class="viewer-error">
                <v-icon color="error" size="48">mdi-alert-circle</v-icon>
                <p class="mt-3 text-error">{{ error }}</p>
                <v-btn @click="retryLoad" color="primary" variant="outlined" class="mt-2">
                  <v-icon start>mdi-refresh</v-icon>
                  Retry
                </v-btn>
              </div>
            </div>

            <v-divider class="my-3"></v-divider>

            <div class="info-section">
              <div class="text-subtitle-2 mb-2">
                <v-icon start small>mdi-information</v-icon>
                Structure Information
              </div>
              <div v-if="structureData" class="structure-metadata">
                <v-chip size="small" color="info" class="mr-2 mb-1">
                  Locus: {{ structureData.Locus }}
                </v-chip>
                <v-chip size="small" color="info" class="mr-2 mb-1">
                  MHC: {{ structureData.MHC }}
                </v-chip>
                <v-chip size="small" color="info" class="mr-2 mb-1">
                  Peptide: {{ structureData.Peptide }}
                </v-chip>
                <v-chip 
                  v-if="structureData['TCRmodel2-pmhc-iptm-score']"
                  size="small" 
                  color="success" 
                  class="mr-2 mb-1"
                >
                  Score: {{ parseFloat(structureData['TCRmodel2-pmhc-iptm-score']).toFixed(3) }}
                </v-chip>
              </div>
            </div>

            <div class="mt-3">
              <div class="text-caption text-grey">
                <strong>Controls:</strong> Left-click + drag to rotate | Right-click + drag to zoom | Scroll wheel to zoom
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
/* eslint-env node */
/* global defineProps, defineEmits */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
// import * as $3Dmol from '3dmol' // Temporarily disabled

const props = defineProps({
  viewerParams: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['back-to-analysis'])

const viewerContainer = ref(null)
const viewer = ref(null)
const loading = ref(false)
const error = ref(null)
const globalRepresentation = ref('cartoon')
const hlaRepresentation = ref('stick')
const selectedStructureId = ref('34238') // Default structure
const structureData = ref(null)

// Get parameters from props or defaults
const locus = ref(props.viewerParams?.locus || 'A')
const selectedPositions = ref(props.viewerParams?.positions || [])

const defaultStructures = {
  A: '34238',
  B: '28707'
}

const availableStructures = ref([
  { id: '34238', label: '34238 - HLA-A*02:01 - SMLGIGIVPV (Score: 0.935)' },
  { id: '28707', label: '28707 - HLA-B*51:01 - TAFTIPSI (Score: 0.933)' },
])

const structureInfo = computed(() => {
  const structure = availableStructures.value.find(s => s.id === selectedStructureId.value)
  return structure || null
})

const initViewer = async () => {
  if (!viewerContainer.value) return
  
  try {
    console.log('Initializing 3Dmol viewer...')
    loading.value = true
    error.value = null
    
    // Clear any existing viewer
    if (viewer.value) {
      viewer.value.clear()
    }
    
    // Wait for DOM
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Create 3Dmol viewer
    viewer.value = $3Dmol.createViewer(viewerContainer.value, {
      backgroundColor: 'white'
    })
    
    console.log('3Dmol viewer created successfully')
    
    // Load default structure
    await loadStructure(selectedStructureId.value)
    
  } catch (err) {
    console.error('Error initializing viewer:', err)
    error.value = `Failed to initialize 3D viewer: ${err.message}`
  } finally {
    loading.value = false
  }
}

const loadStructure = async (structureId) => {
  if (!viewer.value) return
  
  loading.value = true
  error.value = null
  
  try {
    console.log(`Loading structure ${structureId}...`)
    
    // Load metadata
    const metadataResponse = await fetch('/data/VDJdb_contact_metadata.csv')
    if (!metadataResponse.ok) {
      throw new Error('Failed to load structure metadata')
    }
    
    const metadataText = await metadataResponse.text()
    const lines = metadataText.split('\n')
    const headers = lines[0].split(';')
    
    const structureLine = lines.find(line => line.startsWith(structureId + ';'))
    if (structureLine) {
      const values = structureLine.split(';')
      structureData.value = {}
      headers.forEach((header, index) => {
        structureData.value[header] = values[index]
      })
    }
    
    const structureFullname = structureData.value?.Structure_fullname
    if (!structureFullname) {
      throw new Error('Structure name not found in metadata')
    }
    
    // Clear existing models
    console.log('Clearing existing models...')
    viewer.value.removeAllModels()
    
    // Load PDB file
    console.log(`Loading PDB file: ${structureFullname}.pdb`)
    const pdbPath = `/data/ranked_0_collected/${structureFullname}.pdb`
    const response = await fetch(pdbPath)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDB file: ${response.status} - ${response.statusText}`)
    }
    
    const pdbData = await response.text()
    
    // Add model to viewer
    viewer.value.addModel(pdbData, 'pdb')
    
    // Apply representation
    updateRepresentation()
    
    // Highlight selected positions if any
    if (selectedPositions.value && selectedPositions.value.length > 0) {
      highlightHLAPositions()
    }
    
    // Auto zoom and render
    viewer.value.zoomTo()
    viewer.value.render()
    
    console.log('Structure loaded successfully')
    
  } catch (err) {
    console.error('Error loading structure:', err)
    error.value = `Failed to load structure: ${err.message}`
  } finally {
    loading.value = false
  }
}

const updateRepresentation = () => {
  if (!viewer.value) return
  
  try {
    console.log(`Updating global representation to: ${globalRepresentation.value}`)
    
    // Clear existing styles
    viewer.value.removeAllSurfaces()
    viewer.value.setStyle({}, {})
    
    // Define unique colors for each chain
    const chainColors = {
      'A': 'blue',     // TCR Alpha chain
      'B': 'green',    // TCR Beta chain  
      'C': 'orange',   // Peptide chain
      'D': 'purple',   // HLA chain
      'E': 'yellow',   // Additional chain
      'F': 'cyan'      // Additional chain
    }
    
    // Apply global representation with chain-specific colors
    Object.keys(chainColors).forEach(chain => {
      const color = chainColors[chain]
      let chainStyle = {}
      
      switch (globalRepresentation.value) {
        case 'cartoon':
          chainStyle = { cartoon: { color: color } }
          break
        case 'surface':
          viewer.value.addSurface($3Dmol.SurfaceType.VDW, { 
            opacity: 0.6, 
            color: color 
          }, { chain: chain })
          chainStyle = { cartoon: { color: color } }
          break
        case 'stick':
          chainStyle = { stick: { radius: 0.15, color: color } }
          break
        case 'line':
          chainStyle = { line: { color: color } }
          break
        default:
          chainStyle = { cartoon: { color: color } }
      }
      
      viewer.value.setStyle({ chain: chain }, chainStyle)
    })
    
    // Apply specific highlighting to HLA positions
    if (selectedPositions.value && selectedPositions.value.length > 0) {
      highlightHLAPositions()
    }
    
    viewer.value.render()
    console.log('Representation updated successfully')
    
  } catch (err) {
    console.error('Error updating representation:', err)
  }
}

const highlightHLAPositions = () => {
  if (!viewer.value || !selectedPositions.value || selectedPositions.value.length === 0) return
  
  try {
    console.log('Highlighting HLA positions:', selectedPositions.value)
    
    // Define HLA chain identifier (chain D for HLA molecules)
    const hlaChain = 'D'
    
    selectedPositions.value.forEach(position => {
      const selection = { 
        chain: hlaChain,
        resi: parseInt(position) 
      }
      
      // Apply HLA-specific representation style
      let hlaStyle = {}
      switch (hlaRepresentation.value) {
        case 'stick':
          hlaStyle = { stick: { radius: 0.4, color: 'red' } }
          break
        case 'sphere':
          hlaStyle = { sphere: { radius: 1.0, color: 'red' } }
          break
        case 'surface':
          hlaStyle = { surface: { opacity: 0.8, color: 'red' } }
          break
        case 'ball+stick':
          hlaStyle = { 
            stick: { radius: 0.3, color: 'red' },
            sphere: { radius: 0.6, color: 'red' }
          }
          break
        default:
          hlaStyle = { stick: { radius: 0.4, color: 'red' } }
      }
      
      viewer.value.setStyle(selection, hlaStyle)
    })
    
    viewer.value.render()
    
  } catch (err) {
    console.error('Error highlighting HLA positions:', err)
  }
}


const centerView = () => {
  if (!viewer.value) return
  try {
    viewer.value.zoomTo()
    viewer.value.render()
  } catch (err) {
    console.error('Error centering view:', err)
  }
}

const downloadScreenshot = () => {
  if (!viewer.value) return
  
  try {
    const canvas = viewer.value.pngURI()
    const link = document.createElement('a')
    link.download = `structure_${selectedStructureId.value}_${Date.now()}.png`
    link.href = canvas
    link.click()
  } catch (err) {
    console.error('Screenshot error:', err)
  }
}

const retryLoad = () => {
  loadStructure(selectedStructureId.value)
}

const goBack = () => {
  emit('back-to-analysis')
}

watch(globalRepresentation, () => {
  updateRepresentation()
})

watch(hlaRepresentation, () => {
  updateRepresentation()
})

watch(() => props.viewerParams, (newParams) => {
  if (newParams?.positions) {
    selectedPositions.value = newParams.positions
    if (viewer.value) {
      updateRepresentation()
    }
  }
  if (newParams?.locus) {
    locus.value = newParams.locus
    // Load default structure for the locus
    if (defaultStructures[newParams.locus]) {
      selectedStructureId.value = defaultStructures[newParams.locus]
      if (viewer.value) {
        loadStructure(selectedStructureId.value)
      }
    }
  }
}, { deep: true })

onMounted(() => {
  // Set default structure based on locus
  if (defaultStructures[locus.value]) {
    selectedStructureId.value = defaultStructures[locus.value]
  }
  
  // Initialize viewer
  nextTick(() => {
    initViewer()
  })
})

onBeforeUnmount(() => {
  if (viewer.value) {
    viewer.value.clear()
  }
})
</script>

<style scoped>
.structure-viewer-container {
  max-width: 100%;
  padding: 1rem;
}

.main-viewer-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.structure-viewer {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.viewer-loading,
.viewer-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 10;
}

.structure-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.info-section {
  background: rgba(248, 249, 250, 0.5);
  border-radius: 8px;
  padding: 1rem;
}

.control-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
  min-width: 140px;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .structure-viewer-container {
    padding: 0.5rem;
  }
  
  .structure-viewer {
    height: 400px !important;
  }
  
  .viewer-controls .v-btn-toggle .v-btn {
    font-size: 0.75rem;
    padding: 0 8px;
  }
  
  .viewer-controls .v-btn-toggle .v-icon {
    display: none;
  }
}
</style>