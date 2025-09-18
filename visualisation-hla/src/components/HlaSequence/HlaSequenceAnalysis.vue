<template>
  <v-container fluid class="sequence-container">
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
    <div v-if="!loading && !error" class="analysis-container">
      <v-row no-gutters>
        <!-- Colonne formulaire (gauche sur grands écrans) -->
        <v-col 
          cols="12" 
          lg="4" 
          xl="3" 
          class="form-column"
        >
          <HlaAnalysisForm
            :formParams="formParams"
            :loading="loading"
            :filteredPositions="filteredPositionsKeys"
            :selectedPositions="explorationSelectedPositions"
            @update:formParams="wrappedUpdateParams"
            @position-clicked="handlePositionClickFromForm"
          />
          
          <!-- 3D Visualization Button - Outside form layout -->
          <div class="mt-3 px-3">
            <v-btn
              @click="openStructureViewer"
              variant="elevated"
              color="primary"
              block
              class="visualize-3d-btn"
              :disabled="filteredPositionsKeys.length === 0"
              height="48"
            >
              <v-icon class="mr-2">mdi-cube-outline</v-icon>
              <span class="font-weight-medium">Visualize in 3D</span>
            </v-btn>
            <v-fade-transition>
              <div v-if="filteredPositionsKeys.length === 0" class="text-caption text-center text-grey mt-1">
                No positions available for 3D visualization
              </div>
              <div v-else class="text-caption text-center text-grey mt-1">
                {{ filteredPositionsKeys.length }} positions ready for visualization
              </div>
            </v-fade-transition>
          </div>
        </v-col>
        
        <!-- Colonne contenu avec onglets -->
        <v-col 
          cols="12" 
          lg="8" 
          xl="9"
          class="content-column"
        >
          <!-- Onglets stylisés -->
          <div class="tabs-container">
            <div class="tabs-header">
              <button 
                :class="['tab-button', { active: currentTab === 'exploration' }]"
                @click="switchTab('exploration')"
              >
                <span class="tab-icon">🔍</span>
                <span class="tab-text">Exploration</span>
              </button>
              <button 
                :class="['tab-button', { active: currentTab === 'batch' }]"
                @click="switchTab('batch')"
              >
                <span class="tab-icon">📊</span>
                <span class="tab-text">Batch Calculation</span>
              </button>
              <div class="tab-indicator" :class="{ 'batch-active': currentTab === 'batch' }"></div>
            </div>
            
            <!-- Contenu des onglets optimisé avec v-show -->
            <div class="tabs-content">
              <!-- Mode Exploration -->
              <div 
                v-show="currentTab === 'exploration'" 
                class="content-panel exploration-panel"
                :class="{ 'panel-active': currentTab === 'exploration' }"
              >
                <SequenceVisualization
                  :positions="positions"
                  :total-positions="filteredPositionsKeys.length"  
                  :allele-specific-positions-result="alleleSpecificPositionsResult"
                  :cHed="cHed"
                  :tHed="tHed"
                  :filtered-contact-data="filteredContactDataByPositions"
                  :selectedPositions="explorationSelectedPositions"
                  :current-locus="formParams.locus"
                  :totalStructure="totalStructure"
                  @positions-selected="handleExplorationPositionSelection"
                  @allele-changed="handleAlleleChanged"
                />
              </div>
              
              <!-- Mode Batch -->
              <div 
                v-show="currentTab === 'batch'" 
                class="content-panel batch-panel"
                :class="{ 'panel-active': currentTab === 'batch' }"
              >
                <BatchAnalysis
                  :analysis-params="analysisParamsComputed"
                  :initial-selected-positions="batchSelectedPositions"
                  @positions-selected="handleBatchPositionSelection"
                />
              </div>
            </div>
          </div>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script>
import { onMounted, ref, computed, watch, onBeforeUnmount } from 'vue';
import { useHlaAnalysis } from './composables/useHlaAnalysis';
import HlaAnalysisForm from './components/HlaAnalysisForm.vue';
import SequenceVisualization from './components/SequenceVisualization.vue';
import BatchAnalysis from './components/BatchAnalysis.vue';

export default {
  name: 'HlaSequence',
  emits: ['switch-to-batch'],
  components: {
    HlaAnalysisForm,
    SequenceVisualization,
    BatchAnalysis,
  },
  setup() {
    const {
      loading,
      error,
      positions,
      formParams,
      updateParams: originalUpdateParams,
      initializeData,
      calculatePositions,
      aCsvData,
      bCsvData,
      alleleSpecificPositionsResult,
      cHed,
      tHed,
      filteredContactData,
      totalStructure,
      rawPositions
    } = useHlaAnalysis();

    // États séparés pour les positions sélectionnées selon le mode
    const explorationSelectedPositions = ref([]);
    const batchSelectedPositions = ref([]);
    
    // État pour l'onglet actuel
    const currentTab = ref('exploration');
    
    // Pour la mise à jour automatique avec debounce
    const debouncedCalculation = ref(null);

    // Fonction wrapper qui réinitialise les positions sélectionnées selon le mode
    const wrappedUpdateParams = (newParams) => {
      // En mode exploration, réinitialiser les positions sélectionnées
      if (currentTab.value === 'exploration') {
        explorationSelectedPositions.value = [];
      }
      // En mode batch, on garde les positions sélectionnées actuelles
      
      // Appeler la fonction originale
      originalUpdateParams(newParams);
    };

    // Watchers optimisés séparés par type de paramètre
    
    // Watcher pour les paramètres qui nécessitent un recalcul complet (debounced)
    watch(
      () => [formParams.locus, formParams.distance, formParams.percentage, formParams.interactionType],
      () => {
        // Annuler tout calcul précédent en attente
        if (debouncedCalculation.value) {
          clearTimeout(debouncedCalculation.value);
        }
        
        // Définir un nouveau timeout pour le calcul (400ms pour les opérations lourdes)
        debouncedCalculation.value = setTimeout(() => {
          calculatePositions();
          debouncedCalculation.value = null;
        }, 400);
      }
    );
    
    // Watcher pour les paramètres qui ne nécessitent qu'une mise à jour du filtrage (plus rapide)
    watch(
      () => [formParams.showPolymorphicOnly, formParams.entropyThreshold],
      () => {
        // Mise à jour immédiate du filtrage sans debounce
        originalUpdateParams(formParams);
      }
    );
    
    // Watcher pour les allèles (recalcul rapide)
    watch(
      () => [formParams.allele1, formParams.allele2],
      () => {
        if (debouncedCalculation.value) {
          clearTimeout(debouncedCalculation.value);
        }
        
        // Timeout plus court pour les allèles (200ms)
        debouncedCalculation.value = setTimeout(() => {
          calculatePositions();
          debouncedCalculation.value = null;
        }, 200);
      }
    );

    // Computed properties optimisées
    const filteredPositionsKeys = computed(() => Object.keys(positions.value));
    
    // Sets pour les comparaisons O(1) au lieu de Array.includes O(n)
    const explorationSelectedPositionsSet = computed(() => new Set(explorationSelectedPositions.value));
    const batchSelectedPositionsSet = computed(() => new Set(batchSelectedPositions.value));
    
    const analysisParamsComputed = computed(() => ({
      locus: formParams.locus,
      distance: formParams.distance,
      percentage: formParams.percentage,
      interactionType: formParams.interactionType,
      positions: positions.value,
      aCsv: aCsvData.value,
      bCsv: bCsvData.value
    }));

    // Computed property pour les positions actuellement sélectionnées selon le mode
    const currentSelectedPositions = computed(() => {
      return currentTab.value === 'exploration' 
        ? explorationSelectedPositions.value 
        : batchSelectedPositions.value;
    });
    
    // Set pour les positions actuellement sélectionnées (pour optimiser les comparaisons)
    const currentSelectedPositionsSet = computed(() => {
      return currentTab.value === 'exploration' 
        ? explorationSelectedPositionsSet.value 
        : batchSelectedPositionsSet.value;
    });

    // Computed property pour filtrer les données en fonction des positions sélectionnées (optimisé avec Set)
    const filteredContactDataByPositions = computed(() => {
      if (currentSelectedPositions.value.length === 0) {
        return filteredContactData.value;
      }
      const selectedSet = currentSelectedPositionsSet.value;
      return filteredContactData.value.filter(contact =>
        selectedSet.has(String(contact.ResidueID))
      );
    });

    // Surveiller les changements de positions pour mettre à jour les positions sélectionnées (optimisé)
    watch(positions, (newPositions) => {
      const availablePositions = Object.keys(newPositions);
      const availableSet = new Set(availablePositions);
      
      // Mettre à jour les positions d'exploration (filtrer celles qui n'existent plus)
      explorationSelectedPositions.value = explorationSelectedPositions.value.filter(pos => availableSet.has(pos));
      
      // Pour le mode batch, toujours sélectionner TOUTES les positions disponibles
      // C'est le comportement attendu : le batch sélectionne tout par défaut
      if (availablePositions.length > 0) {
        batchSelectedPositions.value = [...availablePositions];
      } else {
        batchSelectedPositions.value = [];
      }
    });

    // Gestion du changement d'onglet
    const switchTab = (tab) => {
      currentTab.value = tab;
      
      // Si on passe en mode batch et qu'aucune position n'est sélectionnée, sélectionner toutes
      if (tab === 'batch' && batchSelectedPositions.value.length === 0 && filteredPositionsKeys.value.length > 0) {
        batchSelectedPositions.value = [...filteredPositionsKeys.value];
      }
    };

    // Gestionnaire pour la sélection de positions depuis la frise (mode exploration)
    const handleExplorationPositionSelection = (positions) => {
      explorationSelectedPositions.value = positions;
    };

    // Gestionnaire pour la sélection de positions depuis le batch
    const handleBatchPositionSelection = (positions) => {
      batchSelectedPositions.value = positions;
    };

    // Gestionnaire pour la sélection de positions depuis le formulaire (mode exploration uniquement) - optimisé
    const handlePositionClickFromForm = (position) => {
      // Cette fonction ne s'applique qu'en mode exploration
      if (currentTab.value !== 'exploration') return;
      
      const positionStr = String(position);
      const currentSet = explorationSelectedPositionsSet.value;
      
      if (currentSet.has(positionStr)) {
        // Position déjà sélectionnée, la retirer
        explorationSelectedPositions.value = explorationSelectedPositions.value.filter(pos => pos !== positionStr);
      } else {
        // Position non sélectionnée, l'ajouter
        explorationSelectedPositions.value = [...explorationSelectedPositions.value, positionStr];
      }
    };

    // Gestionnaire pour le changement d'allèles depuis la visualisation
    const handleAlleleChanged = (alleles) => {
      wrappedUpdateParams({
        allele1: alleles.allele1,
        allele2: alleles.allele2
      });
    };

    // Fonction pour ouvrir le visualiseur 3D
    const openStructureViewer = () => {
      // Utiliser toutes les positions filtrées disponibles, pas seulement les sélectionnées manuellement
      // Cela restaure le comportement attendu de mise en valeur automatique des positions filtrées
      const positionsToSend = filteredPositionsKeys.value.length > 0 
        ? filteredPositionsKeys.value 
        : currentSelectedPositions.value;
      
      // Debug information
      console.log('Opening 3D viewer from Divergence Calculation:')
      console.log('- filteredPositionsKeys:', filteredPositionsKeys.value)
      console.log('- currentSelectedPositions:', currentSelectedPositions.value)
      console.log('- positionsToSend:', positionsToSend)
      
      // Générer l'URL avec les paramètres actuels
      const params = new URLSearchParams({
        view: 'structureViewer',
        locus: formParams.locus,
        positions: positionsToSend.join(','),
        distance: formParams.distance,
        percentage: formParams.percentage,
        interactionType: formParams.interactionType,
        allele1: formParams.allele1 || '',
        allele2: formParams.allele2 || '',
        showPolymorphicOnly: formParams.showPolymorphicOnly,
        entropyThreshold: formParams.entropyThreshold
      });
      
      // Ouvrir dans un nouvel onglet
      window.open(`${window.location.origin}?${params.toString()}`, '_blank');
    };

    onMounted(() => {
      initializeData();
    });
    
    // Nettoyer le timeout en cas de démontage du composant
    onBeforeUnmount(() => {
      if (debouncedCalculation.value) {
        clearTimeout(debouncedCalculation.value);
      }
    });

    return {
      loading,
      error,
      positions,
      formParams,
      wrappedUpdateParams,
      calculatePositions,
      aCsvData,
      bCsvData,
      alleleSpecificPositionsResult,
      cHed,
      tHed,
      filteredContactDataByPositions,
      filteredPositionsKeys,
      analysisParamsComputed,
      handleExplorationPositionSelection,
      handleBatchPositionSelection,
      handlePositionClickFromForm,
      handleAlleleChanged,
      openStructureViewer,
      totalStructure,
      explorationSelectedPositions,
      batchSelectedPositions,
      currentSelectedPositions,
      currentTab,
      switchTab,
      rawPositions
    };
  }
};
</script>

<style scoped>
.sequence-container {
  max-width: 100%;
  padding: 0;
  position: relative;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.analysis-container {
  height: 100%;
}

.form-column {
  padding: 1rem;
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.content-column {
  padding: 1rem;
  min-height: calc(100vh - 120px);
}

/* Mobile adjustments */
@media (max-width: 1023px) {
  .form-column {
    position: static;
    max-height: none;
    overflow-y: visible;
    padding: 0.5rem;
  }
  
  .content-column {
    padding: 0.5rem;
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .content-column {
    padding: 0.25rem;
  }
}

/* Styles pour les onglets */
.tabs-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tabs-header {
  position: relative;
  display: flex;
  background: white;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 0;
  z-index: 10;
}

.tab-button {
  flex: 1;
  padding: 16px 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #666;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 2;
}

.tab-button:first-child {
  border-radius: 12px 0 0 0;
}

.tab-button:last-child {
  border-radius: 0 12px 0 0;
}

.tab-button.active {
  color: #2c3e50;
  background: rgba(74, 144, 226, 0.05);
}

.tab-button:hover:not(.active) {
  color: #4a90e2;
  background: rgba(74, 144, 226, 0.02);
}

.tab-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.tab-button.active .tab-icon {
  transform: scale(1.1);
}

.tab-text {
  font-weight: 600;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 50%;
  height: 3px;
  background: linear-gradient(90deg, #4a90e2, #2d5aa0);
  border-radius: 3px 3px 0 0;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 3;
}

.tab-indicator.batch-active {
  transform: translateX(100%);
}

.tabs-content {
  flex: 1;
  position: relative;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.content-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20px;
  overflow-y: auto;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
}

.content-panel.panel-active {
  opacity: 1;
  transform: translateY(0);
}

.exploration-panel {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.batch-panel {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .tab-button {
    padding: 12px 16px;
    font-size: 14px;
  }
  
  .tab-text {
    display: none;
  }
  
  .tab-icon {
    font-size: 20px;
  }
  
  .content-panel {
    padding: 12px;
  }
}

/* 3D Visualization Button Styles */
.visualize-3d-btn {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%) !important;
}

.visualize-3d-btn:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(25, 118, 210, 0.35) !important;
  transform: translateY(-2px) !important;
}

.visualize-3d-btn:active:not(:disabled) {
  transform: translateY(0) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
}

.visualize-3d-btn:disabled {
  opacity: 0.6;
  background: #e0e0e0 !important;
}

.visualize-3d-btn .v-icon {
  animation: rotate3d 3s linear infinite;
}

.visualize-3d-btn:hover:not(:disabled) .v-icon {
  animation-duration: 1.5s;
}

@keyframes rotate3d {
  0% {
    transform: rotateY(0deg);
  }
  100% {
    transform: rotateY(360deg);
  }
}
</style>