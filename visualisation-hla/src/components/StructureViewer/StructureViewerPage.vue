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

          <!-- Mode display indicator -->
          <div class="px-3 pb-1">
            <v-chip
              :color="hasFilteredPositions ? 'success' : 'info'"
              variant="outlined"
              size="x-small"
              class="text-caption"
            >
              {{ hasFilteredPositions ? 'Filtered Positions Mode' : 'Manual Highlighting Mode' }}
            </v-chip>
          </div>

          <!-- Filtered positions mode: show provided positions -->
          <div v-if="hasFilteredPositions && selectedPositions && selectedPositions.length > 0" class="px-3 pb-2">
            <div class="text-caption mb-1 d-flex align-center">
              <v-icon size="x-small" class="mr-1">mdi-map-marker</v-icon>
              Filtered Positions ({{ selectedPositions.length }}) - Click to highlight
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

          <!-- Manual mode: allow manual position input -->
          <div v-else class="px-3 pb-2">
            <div class="text-caption mb-1 d-flex align-center">
              <v-icon size="x-small" class="mr-1">mdi-map-marker-plus</v-icon>
              Highlight HLA Position
            </div>
            <v-text-field
              v-model="manualPositionInput"
              density="compact"
              variant="outlined"
              placeholder="e.g., 65"
              hide-details
              type="number"
              @keyup.enter="highlightManualPosition"
            >
              <template #append-inner>
                <v-btn
                  size="x-small"
                  variant="text"
                  icon
                  @click="highlightManualPosition"
                  :disabled="!manualPositionInput"
                >
                  <v-icon size="small">mdi-magnify</v-icon>
                </v-btn>
              </template>
            </v-text-field>
            <div v-if="manualHighlightedPositions.length > 0" class="mt-2">
              <div class="text-caption mb-1">Highlighted positions:</div>
              <div class="d-flex flex-wrap gap-1">
                <v-chip
                  v-for="pos in manualHighlightedPositions"
                  :key="pos"
                  size="x-small"
                  :color="highlightedPosition === pos ? 'cyan' : 'red'"
                  :variant="highlightedPosition === pos ? 'flat' : 'outlined'"
                  class="text-caption position-chip"
                  closable
                  @click="togglePositionHighlight(pos)"
                  @click:close="removeManualPosition(pos)"
                >
                  {{ pos }}
                </v-chip>
              </div>
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

            <!-- Position Labels Toggle -->
            <div class="control-group">
              <label class="control-label">
                <v-icon small class="mr-1">mdi-label-outline</v-icon>
                Position Labels
              </label>
              <v-switch
                v-model="showPositionLabels"
                density="compact"
                color="primary"
                hide-details
                :label="showPositionLabels ? 'Show Numbers' : 'Hide Numbers'"
                class="mb-2"
              />
            </div>


            <!-- Chain Visibility & Styles -->
            <div class="control-group">
              <label class="control-label">
                <v-icon small class="mr-1">mdi-eye</v-icon>
                Chain Controls
              </label>
              <div class="chain-controls">
                <div 
                  v-for="(color, chain) in chainColors" 
                  :key="chain" 
                  class="chain-item-extended"
                >
                  <!-- Chain info and visibility toggle -->
                  <div class="chain-header">
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
                  
                  <!-- Individual chain style selector -->
                  <div v-if="chainVisibility[chain]" class="chain-style-selector mt-1">
                    <v-select
                      v-model="chainStyles[chain]"
                      :items="chainRepresentationOptions"
                      density="compact"
                      variant="outlined"
                      hide-details
                      :placeholder="`Style for ${chainLabels[chain]}`"
                      class="chain-style-select"
                    />
                  </div>
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
const showPositionLabels = ref(false) // Toggle for position labels

// Individual position highlighting
const highlightedPosition = ref(null)

// Position labels storage
const positionLabels = ref([])

// Manual position highlighting (when no positions from props)
const manualPositionInput = ref('')
const manualHighlightedPositions = ref([])
// Default structure based on locus - best scores
const getDefaultStructureForLocus = (locus) => {
  if (locus === 'B') {
    return '21662_VDJdb_EBNA1_EBV_B_3501_HPVGEADYFEY_score_3' // Best B structure (0.913)
  }
  return '21460_VDJdb_gp100_HomoSapiens_A_0201_YLEPGPVTA_score_3' // Best A structure (0.881)
}

const selectedStructureId = ref(
  props.viewerParams?.structureId || 
  getDefaultStructureForLocus(props.viewerParams?.locus || 'A')
)
const structureData = ref(null)

// Get parameters from props or defaults
// eslint-disable-next-line no-unused-vars
const locus = ref(props.viewerParams?.locus || 'A')

// Detect access mode: if positions are provided, we're in "filtered positions mode"
// If no positions (empty array), we're in "manual mode" (from structure database)
const hasFilteredPositions = computed(() => 
  props.viewerParams?.positions && props.viewerParams.positions.length > 0
)

// In filtered positions mode, use provided positions
// In manual mode, start with empty positions
const selectedPositions = ref(
  hasFilteredPositions.value ? props.viewerParams.positions : []
)

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

// Individual chain styles (override global style when set)
const chainStyles = ref({
  'A': 'global',  // Use global style by default
  'B': 'global',
  'C': 'global', 
  'D': 'global'
})

// Structure options - organized by locus with best scores first
const allStructureOptions = {
  A: [
    { text: '21460 - A*02:01 - YLEPGPVTA - 0.881', value: '21460_VDJdb_gp100_HomoSapiens_A_0201_YLEPGPVTA_score_3' },
    { text: '34114 - A*24:02 - RFPLTFGWCF - 0.875', value: '34114_VDJdb_Nef_HIV-1_A_2402_RFPLTFGWCF_score_3' },
    { text: '34115 - A*24:02 - RYPLTFGWCF - 0.870', value: '34115_VDJdb_Nef_HIV-1_A_2402_RYPLTFGWCF_score_3' },
    { text: '183 - A*68:01 - DATYQRTRALVR - 0.857', value: '183_VDJdb_NP_InfluenzaA_A_6801_DATYQRTRALVR_score_1' },
    { text: '1983 - A*11:01 - IVTDFSVIK - 0.843', value: '1983_VDJdb_EBNA4_EBV_A_1101_IVTDFSVIK_score_1' },
    { text: '21443 - A*24:02 - VYFFLPDHL - 0.835', value: '21443_VDJdb_gp100_HomoSapiens_A_2402_VYFFLPDHL_score_2' },
    { text: '4782 - A*11:01 - IVTDFSVIK - 0.823', value: '4782_VDJdb_EBNA4_EBV_A_1101_IVTDFSVIK_score_1' },
    { text: '21383 - A*24:02 - LYPEFIASI - 0.815', value: '21383_VDJdb_DPY19L4_HomoSapiens_A_2402_LYPEFIASI_score_2' },
    { text: '21367 - A*02:01 - HMTEVVRHC - 0.803', value: '21367_VDJdb_p53_HomoSapiens_A_0201_HMTEVVRHC_score_3' },
    { text: '21375 - A*01:01 - KVDPIGHVY - 0.784', value: '21375_VDJdb_MAGEA6_HomoSapiens_A_0101_KVDPIGHVY_score_2' },
    { text: '14585 - A*03:01 - KLGGALQAK - 0.770', value: '14585_VDJdb_IE1_CMV_A_0301_KLGGALQAK_score_1' },
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

// Chain-specific style options (includes global option)
const chainRepresentationOptions = [
  { title: 'Use Global Style', value: 'global' },
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
  // Debug information
  console.log('StructureViewerPage mounted with props:', props.viewerParams)
  console.log('Positions from props:', props.viewerParams?.positions)
  console.log('Has filtered positions:', hasFilteredPositions.value)
  console.log('Selected positions:', selectedPositions.value)
  
  await initializeViewer()
  
  // In filtered positions mode, automatically show all filtered positions
  // This restores the previous behavior when coming from divergence calculation
  if (hasFilteredPositions.value && selectedPositions.value.length > 0) {
    console.log('Filtered positions mode detected, automatically highlighting filtered positions')
    // The positions are already shown as chips and will be visualized via applyVisualizationSettings
  }
})

// Clean up when component is unmounted
onBeforeUnmount(() => {
  if (viewer.value) {
    viewer.value.clear()
    viewer.value = null
  }
})

// Watch for representation changes and chain visibility
watch([globalRepresentation, hlaRepresentation, chainVisibility, chainStyles, showHlaPositionsOverlay, highlightedPosition], async () => {
  console.log('Watcher triggered - applying visualization settings...')
  if (viewer.value) {
    await applyVisualizationSettings()
  }
}, { deep: true })

// Watch for position labels toggle
watch(showPositionLabels, async () => {
  console.log('Position labels toggle changed:', showPositionLabels.value)
  if (viewer.value) {
    await updatePositionLabels()
  }
})

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
    
    // Update position labels if enabled
    if (showPositionLabels.value) {
      await updatePositionLabels()
    }
    
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
  console.log('manualHighlightedPositions:', manualHighlightedPositions.value)
  
  // Clear all existing styles first (correct way in 3Dmol.js)
  viewer.value.setStyle({}, {})
  
  // Standardize stick radius for consistency
  const stickRadius = 0.3
  const hlaChain = 'D'
  
  // Different logic based on mode:
  // - In filtered positions mode: only highlight the provided filtered positions  
  // - In manual mode: only highlight manually added positions
  let positionsToHighlight = []
  
  if (hasFilteredPositions.value) {
    // Filtered positions mode: use provided positions
    positionsToHighlight = selectedPositions.value || []
  } else {
    // Manual mode: use manually added positions
    positionsToHighlight = manualHighlightedPositions.value || []
  }
  
  if (!showHlaPositionsOverlay.value) {
    // Combined View: Individual or global style + HLA positions in filtered style on top
    console.log('Applying Combined View (individual/global + filtered overlay)')
    
    // Apply individual or global styling to all visible chains
    Object.keys(chainColors).forEach(chain => {
      if (chainVisibility.value[chain]) {
        // Determine which representation to use for this chain
        const chainRepresentation = chainStyles.value[chain] === 'global' 
          ? globalRepresentation.value 
          : chainStyles.value[chain]
        
        const style = { color: chainColors[chain] }
        if (chainRepresentation === 'stick') {
          style.radius = stickRadius
        } else if (chainRepresentation === 'sphere') {
          style.radius = 1 // Uniform sphere size
        }
        viewer.value.setStyle(
          { chain: chain },
          { [chainRepresentation]: style }
        )
      }
    })
    
    // Add HLA positions overlay in hlaRepresentation style if positions are selected
    // Using addStyle to layer on top of existing global style
    if (positionsToHighlight && positionsToHighlight.length > 0 && chainVisibility.value[hlaChain]) {
      positionsToHighlight.forEach(position => {
        const posNum = parseInt(position)
        if (!isNaN(posNum)) {
          const isHighlighted = highlightedPosition.value === position
          const style = { 
            color: isHighlighted ? 'cyan' : 'red'
          }
          
          // Set radius based on representation mode and highlight status
          if (hlaRepresentation.value === 'stick') {
            style.radius = isHighlighted ? 0.5 : 0.3
          } else if (hlaRepresentation.value === 'sphere') {
            // Uniform sphere size: 1 for all positions
            style.radius = 1
          }
          
          viewer.value.addStyle(
            { chain: hlaChain, resi: posNum },
            { [hlaRepresentation.value]: style }
          )
        }
      })
    }
    
  } else {
    // Filtered Only View: Individual or global style for all chains
    console.log('Applying Filtered Only View')
    
    // Apply individual or global styling to all visible chains
    Object.keys(chainColors).forEach(chain => {
      if (chainVisibility.value[chain]) {
        // Determine which representation to use for this chain
        const chainRepresentation = chainStyles.value[chain] === 'global' 
          ? globalRepresentation.value 
          : chainStyles.value[chain]
        
        const style = { color: chainColors[chain] }
        if (chainRepresentation === 'stick') {
          style.radius = stickRadius
        } else if (chainRepresentation === 'sphere') {
          style.radius = 1 // Uniform sphere size
        }
        
        if (chain === hlaChain && positionsToHighlight && positionsToHighlight.length > 0) {
          // For HLA chain, apply individual/global style to all residues (selected positions will be overridden later)
          viewer.value.setStyle(
            { chain: chain },
            { [chainRepresentation]: style }
          )
          
        } else {
          // Non-HLA chains or HLA when no positions selected - apply individual/global style normally
          viewer.value.setStyle(
            { chain: chain },
            { [chainRepresentation]: style }
          )
        }
      }
    })
    
    // Now apply filtered style to selected HLA positions only (will override the global style on these positions)
    if (positionsToHighlight && positionsToHighlight.length > 0 && chainVisibility.value[hlaChain]) {
      positionsToHighlight.forEach(position => {
        const posNum = parseInt(position)
        if (!isNaN(posNum)) {
          const isHighlighted = highlightedPosition.value === position
          const style = { 
            color: isHighlighted ? 'cyan' : 'red'
          }
          
          // Set radius based on representation mode and highlight status
          if (hlaRepresentation.value === 'stick') {
            style.radius = isHighlighted ? 0.5 : 0.3
          } else if (hlaRepresentation.value === 'sphere') {
            // Uniform sphere size: 1 for all positions
            style.radius = 1
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

// Functions for manual position highlighting
const highlightManualPosition = () => {
  const position = manualPositionInput.value.trim()
  if (position && !manualHighlightedPositions.value.includes(position)) {
    manualHighlightedPositions.value.push(position)
    highlightedPosition.value = position // Also set as currently highlighted
    manualPositionInput.value = '' // Clear input
    
    // Apply visualization immediately
    if (viewer.value) {
      applyVisualizationSettings()
      // Update labels if enabled
      if (showPositionLabels.value) {
        updatePositionLabels()
      }
    }
  }
}

const removeManualPosition = (position) => {
  const index = manualHighlightedPositions.value.indexOf(position)
  if (index > -1) {
    manualHighlightedPositions.value.splice(index, 1)
    
    // If this was the highlighted position, clear it
    if (highlightedPosition.value === position) {
      highlightedPosition.value = null
    }
    
    // Re-apply visualization
    if (viewer.value) {
      applyVisualizationSettings()
      // Update labels if enabled
      if (showPositionLabels.value) {
        updatePositionLabels()
      }
    }
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

// Position labels management functions
const updatePositionLabels = async () => {
  if (!viewer.value) return

  // Clear all existing labels first
  clearPositionLabels()

  if (showPositionLabels.value) {
    // Add labels for current positions to highlight
    let positionsToLabel = []
    
    if (hasFilteredPositions.value) {
      // Filtered positions mode: use provided positions
      positionsToLabel = selectedPositions.value || []
    } else {
      // Manual mode: use manually added positions
      positionsToLabel = manualHighlightedPositions.value || []
    }

    console.log('Adding labels for positions:', positionsToLabel)
    await addPositionLabels(positionsToLabel)
  }

  viewer.value.render()
}

const addPositionLabels = async (positions) => {
  if (!viewer.value || !positions || positions.length === 0) return
  
  const hlaChain = 'D'
  
  // Only show labels if HLA chain is visible
  if (!chainVisibility.value[hlaChain]) return

  positions.forEach(position => {
    const posNum = parseInt(position)
    if (!isNaN(posNum)) {
      try {
        // Get CA atoms for this position in HLA chain
        const atoms = viewer.value.getModel().selectedAtoms({
          chain: hlaChain,
          resi: posNum,
          atom: 'CA'
        })

        if (atoms && atoms.length > 0) {
          const atom = atoms[0] // Take the first CA atom for this residue
          
          // Add label at CA position
          const label = viewer.value.addLabel(position.toString(), {
            fontSize: 10,
            fontColor: 'black',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backgroundOpacity: 0.8,
            borderThickness: 1,
            borderColor: 'black',
            inFront: true,
            position: {
              x: atom.x,
              y: atom.y,
              z: atom.z
            }
          })
          
          // Store the label reference
          if (label) {
            positionLabels.value.push({
              position: position,
              label: label,
              atom: atom
            })
            console.log(`Added label for position ${position} at CA atom position`)
          }
        } else {
          console.log(`No CA atom found for position ${position} in chain ${hlaChain}`)
        }
      } catch (error) {
        console.error(`Error adding label for position ${position}:`, error)
      }
    }
  })
}

const clearPositionLabels = () => {
  if (!viewer.value) return

  // Remove all labels from the viewer
  positionLabels.value.forEach(labelInfo => {
    if (labelInfo.label) {
      try {
        viewer.value.removeLabel(labelInfo.label)
      } catch (error) {
        console.error('Error removing label:', error)
      }
    }
  })
  
  // Clear the labels array
  positionLabels.value = []
  console.log('All position labels cleared')
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

.chain-item-extended {
  padding: 0.25rem 0;
  border-bottom: 1px solid #e9ecef;
}

.chain-item-extended:last-child {
  border-bottom: none;
}

.chain-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chain-style-selector {
  margin-top: 0.25rem;
}

.chain-style-select {
  font-size: 0.8rem;
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