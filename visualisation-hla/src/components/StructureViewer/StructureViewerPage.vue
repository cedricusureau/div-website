<template>
  <v-container fluid class="structure-viewer-container pa-0">
    <!-- Main content with side-by-side layout - no top header -->
    <v-row class="structure-main-row ma-0" no-gutters>
      <!-- 3D Viewer (Left side - full space) -->
      <v-col cols="12" lg="9" xl="10" class="viewer-column pa-0">
        <v-card class="viewer-card" flat>
          <!-- Loading state -->
          <div v-if="loading" class="d-flex justify-center align-center pa-8">
            <v-progress-circular indeterminate color="primary" size="40"></v-progress-circular>
            <span class="ml-3">Loading 3D structure...</span>
          </div>
          
          <!-- Error state -->
          <v-alert v-if="error" type="error" class="ma-2">
            {{ error }}
          </v-alert>
          
          <!-- 3D Viewer -->
          <div 
            ref="viewerContainer" 
            class="viewer-container-full"
            :class="{ 'viewer-loading': loading }"
          ></div>
        </v-card>
      </v-col>

      <!-- Control Panel (Right side) -->
      <v-col cols="12" lg="3" xl="2" class="controls-column pa-2">
        <v-card class="controls-card" flat>
          <!-- Compact header with title and back button -->
          <v-card-title class="pb-1 px-3 py-2 d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-1" size="small">mdi-cube-outline</v-icon>
              <span class="text-subtitle-1">3D Viewer</span>
            </div>
            <v-btn
              icon
              size="small"
              variant="text"
              @click="goBack"
              class="ml-1"
            >
              <v-icon size="small">mdi-arrow-left</v-icon>
            </v-btn>
          </v-card-title>

          <!-- Compact structure info -->
          <div v-if="structureInfo" class="px-3 pb-2">
            <v-chip 
              color="primary" 
              variant="outlined" 
              size="x-small"
              class="text-caption"
            >
              {{ structureInfo.label }}
            </v-chip>
          </div>

          <!-- Compact selected positions -->
          <div v-if="selectedPositions && selectedPositions.length > 0" class="px-3 pb-2">
            <div class="text-caption mb-1 d-flex align-center">
              <v-icon size="x-small" class="mr-1">mdi-map-marker</v-icon>
              Positions ({{ selectedPositions.length }}) - Click to highlight
            </div>
            <div class="d-flex flex-wrap gap-1">
              <v-chip
                v-for="pos in selectedPositions"
                :key="pos"
                size="x-small"
                :color="highlightedPosition === pos ? 'cyan' : 'red'"
                :variant="highlightedPosition === pos ? 'flat' : 'outlined'"
                class="text-caption position-chip"
                @click="togglePositionHighlight(pos)"
                clickable
              >
                {{ pos }}
              </v-chip>
            </div>
            <div v-if="highlightedPosition" class="text-xs text-cyan mt-1">
              Position {{ highlightedPosition }} highlighted
            </div>
          </div>

          <v-card-text class="px-3 py-2">
            <!-- Structure Selection -->
            <div class="control-group">
              <label class="control-label">
                <v-icon small class="mr-1">mdi-file-document-outline</v-icon>
                Structure
              </label>
              <v-select
                v-model="selectedStructureId"
                :items="structureOptions"
                item-title="text"
                item-value="value"
                @update:model-value="loadStructure"
                density="compact"
                variant="outlined"
              />
            </div>

            <!-- Global Representation -->
            <div class="control-group">
              <label class="control-label">
                <v-icon small class="mr-1">mdi-shape-outline</v-icon>
                Global Style
              </label>
              <v-select
                v-model="globalRepresentation"
                :items="representationOptions"
                density="compact"
                variant="outlined"
              />
            </div>

            <!-- Filtered Position Representation -->
            <div class="control-group">
              <label class="control-label">
                <v-icon small class="mr-1">mdi-molecule</v-icon>
                Filtered Position Style
              </label>
              <v-select
                v-model="hlaRepresentation"
                :items="representationOptions"
                density="compact"
                variant="outlined"
              />
            </div>

            <!-- HLA Positions Display Mode -->
            <div class="control-group">
              <label class="control-label">
                <v-icon small class="mr-1">mdi-layers-triple</v-icon>
                HLA Positions Display
              </label>
              <v-switch
                v-model="showHlaPositionsOverlay"
                density="compact"
                color="primary"
                hide-details
                :label="showHlaPositionsOverlay ? 'Filtered Only' : 'Combined View'"
                class="mb-2"
              />
            </div>


            <!-- Chain Visibility & Colors -->
            <div class="control-group">
              <label class="control-label">
                <v-icon small class="mr-1">mdi-eye</v-icon>
                Chain Visibility
              </label>
              <div class="chain-controls">
                <div 
                  v-for="(color, chain) in chainColors" 
                  :key="chain" 
                  class="chain-item"
                >
                  <div class="chain-info">
                    <div 
                      class="color-dot" 
                      :style="{ 
                        backgroundColor: chainVisibility[chain] ? color : '#ccc',
                        opacity: chainVisibility[chain] ? 1 : 0.5 
                      }"
                    ></div>
                    <span 
                      class="chain-label"
                      :class="{ 'chain-hidden': !chainVisibility[chain] }"
                    >
                      {{ chainLabels[chain] }}
                    </span>
                  </div>
                  <v-btn
                    :color="chainVisibility[chain] ? 'primary' : 'grey'"
                    :variant="chainVisibility[chain] ? 'text' : 'outlined'"
                    size="small"
                    @click="toggleChainVisibility(chain)"
                  >
                    <v-icon size="small">
                      {{ chainVisibility[chain] ? 'mdi-eye' : 'mdi-eye-off' }}
                    </v-icon>
                  </v-btn>
                </div>
              </div>
            </div>

            <!-- Structure Info -->
            <div v-if="structureData" class="control-group">
              <label class="control-label">
                <v-icon small class="mr-1">mdi-information-outline</v-icon>
                Structure Info
              </label>
              <div class="structure-info">
                <div v-if="structureData['TCRmodel2-pmhc-iptm-score']" class="info-item">
                  <span class="info-key">iPTM Score:</span>
                  <v-chip size="small" color="info" variant="outlined">
                    {{ parseFloat(structureData['TCRmodel2-pmhc-iptm-score']).toFixed(3) }}
                  </v-chip>
                </div>
                <div v-if="structureData['TCRmodel2-pmhc-ranking']" class="info-item">
                  <span class="info-key">Ranking:</span>
                  <v-chip size="small" color="success" variant="outlined">
                    {{ structureData['TCRmodel2-pmhc-ranking'] }}
                  </v-chip>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="control-group mt-4">
              <v-btn 
                block 
                color="primary" 
                variant="outlined"
                @click="resetView"
                :disabled="loading"
              >
                <v-icon start>mdi-refresh</v-icon>
                Reset View
              </v-btn>
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
import * as $3Dmol from '3dmol'

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
const showHlaPositionsOverlay = ref(false) // Default: Combined View (global + filtered)

// Individual position highlighting
const highlightedPosition = ref(null)
// Default structure based on locus - best scores
const getDefaultStructureForLocus = (locus) => {
  if (locus === 'B') {
    return '21662_VDJdb_EBNA1_EBV_B_3501_HPVGEADYFEY_score_3' // Best B structure (0.913)
  }
  return '21460_VDJdb_gp100_HomoSapiens_A_0201_YLEPGPVTA_score_3' // Best A structure (0.881)
}

const selectedStructureId = ref(getDefaultStructureForLocus(props.viewerParams?.locus || 'A'))
const structureData = ref(null)

// Get parameters from props or defaults
// eslint-disable-next-line no-unused-vars
const locus = ref(props.viewerParams?.locus || 'A')
const selectedPositions = ref(props.viewerParams?.positions || [])

// Chain colors and visibility for visualization
const chainColors = {
  'A': 'blue',     // TCR Alpha chain
  'B': 'green',    // TCR Beta chain  
  'C': 'orange',   // Peptide chain
  'D': 'purple'    // HLA chain (this is what we want to highlight)
}

const chainLabels = {
  'A': 'TCR Alpha',
  'B': 'TCR Beta', 
  'C': 'Peptide',
  'D': 'HLA'
}

// Chain visibility state
const chainVisibility = ref({
  'A': true,  // TCR Alpha visible by default
  'B': true,  // TCR Beta visible by default
  'C': true,  // Peptide visible by default
  'D': true   // HLA visible by default
})

// Structure options - organized by locus with best scores first
const allStructureOptions = {
  A: [
    { text: '21460 - A*02:01 - YLEPGPVTA - 0.881', value: '21460_VDJdb_gp100_HomoSapiens_A_0201_YLEPGPVTA_score_3' },
    { text: '1983 - A*11:01 - IVTDFSVIK - 0.843', value: '1983_VDJdb_EBNA4_EBV_A_1101_IVTDFSVIK_score_1' },
    { text: '4782 - A*11:01 - IVTDFSVIK - 0.823', value: '4782_VDJdb_EBNA4_EBV_A_1101_IVTDFSVIK_score_1' },
    { text: '21367 - A*02:01 - HMTEVVRHC - 0.803', value: '21367_VDJdb_p53_HomoSapiens_A_0201_HMTEVVRHC_score_3' },
    { text: '21375 - A*01:01 - KVDPIGHVY - 0.784', value: '21375_VDJdb_MAGEA6_HomoSapiens_A_0101_KVDPIGHVY_score_2' },
    { text: '14585 - A*03:01 - KLGGALQAK - 0.770', value: '14585_VDJdb_IE1_CMV_A_0301_KLGGALQAK_score_1' },
    { text: '183 - A*68:01 - DATYQRTRALVR - 0.857', value: '183_VDJdb_NP_InfluenzaA_A_6801_DATYQRTRALVR_score_1' },
    { text: '182 - A*68:01 - DATYQRTRALVR - 0.742', value: '182_VDJdb_NP_InfluenzaA_A_6801_DATYQRTRALVR_score_1' }
  ],
  B: [
    { text: '21662 - B*35:01 - HPVGEADYFEY - 0.913', value: '21662_VDJdb_EBNA1_EBV_B_3501_HPVGEADYFEY_score_3' },
    { text: '21664 - B*35:01 - EPLPQGQLTAY - 0.907', value: '21664_VDJdb_BZLF1_EBV_B_3501_EPLPQGQLTAY_score_3' },
    { text: '21449 - B*07:02 - RVRFFFPSL - 0.883', value: '21449_VDJdb_MAGE-A1_HomoSapiens_B_0702_RVRFFFPSL_score_2' },
    { text: '1834 - B*08:01 - RAKFKQLL - 0.880', value: '1834_VDJdb_BZLF1_EBV_B_0801_RAKFKQLL_score_1' },
    { text: '21457 - B*07:02 - APRGPHGGAASGL - 0.869', value: '21457_VDJdb_NY-ESO-1_HomoSapiens_B_0702_APRGPHGGAASGL_score_3' },
    { text: '21659 - B*35:01 - HPVGEADYFEY - 0.865', value: '21659_VDJdb_EBNA1_EBV_B_3501_HPVGEADYFEY_score_3' },
    { text: '21379 - B*15:01 - VQIISCQY - 0.851', value: '21379_VDJdb_MED13_HomoSapiens_B_1501_VQIISCQY_score_2' },
    { text: '21451 - B*18:01 - EEAAGIGIL - 0.823', value: '21451_VDJdb_MLANA_HomoSapiens_B_1801_EEAAGIGIL_score_2' }
  ]
}

// Computed structure options based on current locus
const structureOptions = computed(() => {
  const currentLocus = locus.value || 'A'
  return allStructureOptions[currentLocus] || allStructureOptions.A
})

const representationOptions = [
  { title: 'Cartoon', value: 'cartoon' },
  { title: 'Stick', value: 'stick' },
  { title: 'Line', value: 'line' },
  { title: 'Sphere', value: 'sphere' }
]

// Computed properties
const structureInfo = computed(() => {
  const option = structureOptions.value.find(opt => opt.value === selectedStructureId.value)
  return option ? { label: option.text } : null
})

// Initialize viewer when component is mounted
onMounted(async () => {
  await initializeViewer()
})

// Clean up when component is unmounted
onBeforeUnmount(() => {
  if (viewer.value) {
    viewer.value.clear()
    viewer.value = null
  }
})

// Watch for representation changes and chain visibility
watch([globalRepresentation, hlaRepresentation, chainVisibility, showHlaPositionsOverlay, highlightedPosition], async () => {
  console.log('Watcher triggered - applying visualization settings...')
  if (viewer.value) {
    await applyVisualizationSettings()
  }
}, { deep: true })

const initializeViewer = async () => {
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
    
    // Verify DOM element exists
    if (!viewerContainer.value) {
      throw new Error('Viewer container element not found')
    }
    
    console.log('Container element found:', viewerContainer.value)
    
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
    console.log('Loading structure:', structureId)
    
    // Clear existing models
    console.log('Clearing existing models...')
    viewer.value.clear()
    
    // Load PDB file from the correct path
    const pdbPath = `/data/ranked_0_collected/${structureId}.pdb`
    console.log('Loading PDB from:', pdbPath)
    
    const response = await fetch(pdbPath)
    if (!response.ok) {
      throw new Error(`Failed to load structure: ${response.status} ${response.statusText}`)
    }
    
    const pdbData = await response.text()
    
    console.log('PDB data loaded, length:', pdbData.length)
    
    // Add to viewer
    await viewer.value.addModel(pdbData, 'pdb')
    console.log('Model added to viewer')
    
    // Apply visualization settings
    await applyVisualizationSettings()
    
    // Set default orientation for HLA structures (HLA domain at bottom, TCR on top)
    viewer.value.rotate(180, 'x')  // Flip vertically to put HLA domain at bottom
    
    // Set zoom and render
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

const applyVisualizationSettings = async () => {
  if (!viewer.value) return
  
  console.log('Applying visualization settings...')
  console.log('showHlaPositionsOverlay:', showHlaPositionsOverlay.value)
  console.log('selectedPositions:', selectedPositions.value)
  
  // Clear all existing styles first (correct way in 3Dmol.js)
  viewer.value.setStyle({}, {})
  
  // Standardize stick radius for consistency
  const stickRadius = 0.3
  const hlaChain = 'D'
  
  if (!showHlaPositionsOverlay.value) {
    // Combined View: Global style + HLA positions in filtered style on top
    console.log('Applying Combined View (global + filtered overlay)')
    
    // Apply global styling to all visible chains (including HLA)
    Object.keys(chainColors).forEach(chain => {
      if (chainVisibility.value[chain]) {
        const style = { color: chainColors[chain] }
        if (globalRepresentation.value === 'stick') {
          style.radius = stickRadius
        }
        viewer.value.setStyle(
          { chain: chain },
          { [globalRepresentation.value]: style }
        )
      }
    })
    
    // Add HLA positions overlay in hlaRepresentation style if positions are selected
    // Using addStyle to layer on top of existing global style
    if (selectedPositions.value && selectedPositions.value.length > 0 && chainVisibility.value[hlaChain]) {
      selectedPositions.value.forEach(position => {
        const posNum = parseInt(position)
        if (!isNaN(posNum)) {
          const isHighlighted = highlightedPosition.value === position
          const style = { 
            color: isHighlighted ? 'cyan' : 'red',
            radius: isHighlighted && hlaRepresentation.value === 'stick' ? 0.5 : 0.3
          }
          
          viewer.value.addStyle(
            { chain: hlaChain, resi: posNum },
            { [hlaRepresentation.value]: style }
          )
        }
      })
    }
    
  } else {
    // Filtered Only View: Global style for all chains, but exclude selected HLA positions from global, show them only in filtered style
    console.log('Applying Filtered Only View')
    
    // Apply global styling to all visible chains
    Object.keys(chainColors).forEach(chain => {
      if (chainVisibility.value[chain]) {
        const style = { color: chainColors[chain] }
        if (globalRepresentation.value === 'stick') {
          style.radius = stickRadius
        }
        
        if (chain === hlaChain && selectedPositions.value && selectedPositions.value.length > 0) {
          // For HLA chain, apply global style to all residues (selected positions will be overridden later)
          viewer.value.setStyle(
            { chain: chain },
            { [globalRepresentation.value]: style }
          )
          
        } else {
          // Non-HLA chains or HLA when no positions selected - apply global style normally
          viewer.value.setStyle(
            { chain: chain },
            { [globalRepresentation.value]: style }
          )
        }
      }
    })
    
    // Now apply filtered style to selected HLA positions only (will override the global style on these positions)
    if (selectedPositions.value && selectedPositions.value.length > 0 && chainVisibility.value[hlaChain]) {
      selectedPositions.value.forEach(position => {
        const posNum = parseInt(position)
        if (!isNaN(posNum)) {
          const isHighlighted = highlightedPosition.value === position
          const style = { 
            color: isHighlighted ? 'cyan' : 'red',
            radius: isHighlighted && hlaRepresentation.value === 'stick' ? 0.5 : 0.3
          }
          
          viewer.value.setStyle(
            { chain: hlaChain, resi: posNum },
            { [hlaRepresentation.value]: style }
          )
        }
      })
    }
  }
  
  viewer.value.render()
}

const togglePositionHighlight = (position) => {
  if (highlightedPosition.value === position) {
    // Si déjà highlighted, désélectionner
    highlightedPosition.value = null
  } else {
    // Sinon, sélectionner cette position
    highlightedPosition.value = position
  }
}

const toggleChainVisibility = async (chain) => {
  console.log('toggleChainVisibility called with chain:', chain)
  console.log('Current visibility:', chainVisibility.value[chain])
  chainVisibility.value[chain] = !chainVisibility.value[chain]
  console.log('New visibility:', chainVisibility.value[chain])
  console.log(`Chain ${chain} (${chainLabels[chain]}) is now ${chainVisibility.value[chain] ? 'visible' : 'hidden'}`)
  
  // Force apply visualization settings immediately
  if (viewer.value) {
    console.log('Force applying visualization settings...')
    await applyVisualizationSettings()
  }
}

const resetView = () => {
  if (viewer.value) {
    viewer.value.zoomTo()
    viewer.value.render()
  }
}

const goBack = () => {
  emit('back-to-analysis')
}
</script>

<style scoped>
.structure-viewer-container {
  padding: 0 !important;
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

.structure-main-row {
  min-height: 100vh;
  max-height: 100vh;
  margin: 0;
}

.viewer-column {
  height: 100vh;
  padding: 0;
}

.controls-column {
  height: 100vh;
  padding: 0;
  border-left: 1px solid #e0e0e0;
  background: #fafafa;
}

.viewer-card {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.controls-card {
  height: 100vh;
  max-height: 100vh;
  overflow-y: auto;
}

.viewer-container-full {
  flex: 1;
  min-height: 100vh;
  height: 100vh;
  width: 100%;
  position: relative;
  margin: 0;
  background: #f5f5f5;
}

.position-chip {
  cursor: pointer;
  transition: all 0.2s ease;
}

.position-chip:hover {
  transform: scale(1.05);
}

.viewer-loading {
  pointer-events: none;
  opacity: 0.7;
}

.control-group {
  margin-bottom: 1rem;
}

.control-label {
  display: flex;
  align-items: center;
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.chain-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.chain-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.chain-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #ccc;
  transition: all 0.3s ease;
}

.chain-label {
  font-size: 0.85rem;
  color: #495057;
  font-weight: 500;
  transition: all 0.3s ease;
}

.chain-hidden {
  color: #999;
  text-decoration: line-through;
}

.structure-info {
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-key {
  font-size: 0.85rem;
  color: #495057;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 1024px) {
  .structure-viewer-container {
    padding: 0.25rem;
  }
  
  .structure-main-row {
    flex-direction: column;
    height: auto;
  }
  
  .viewer-column,
  .controls-column {
    height: auto;
  }
  
  .viewer-container {
    min-height: 400px;
  }
}

@media (max-width: 768px) {
  .control-label {
    font-size: 0.85rem;
  }
  
  .viewer-container {
    min-height: 300px;
  }
}
</style>