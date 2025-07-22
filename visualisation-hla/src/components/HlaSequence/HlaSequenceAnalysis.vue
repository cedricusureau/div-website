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
            :filteredPositions="Object.keys(positions)"
            :selectedPositions="selectedPositions"
            @update:formParams="wrappedUpdateParams"
            @position-clicked="handlePositionClickFromForm"
          />
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
            
            <!-- Contenu des onglets -->
            <div class="tabs-content">
              <div class="content-wrapper" :class="`slide-${currentTab}`">
                <!-- Mode Exploration -->
                <div class="content-panel exploration-panel">
                  <SequenceVisualization
                    :positions="positions"
                    :total-positions="Object.keys(positions).length"  
                    :allele-specific-positions-result="alleleSpecificPositionsResult"
                    :hed="hed"
                    :specific-divergence="specificDivergence"
                    :filtered-contact-data="filteredContactDataByPositions"
                    :selectedPositions="selectedPositions"
                    :current-locus="formParams.locus"
                    @positions-selected="handlePositionSelection"
                    @allele-changed="handleAlleleChanged"
                  />
                </div>
                
                <!-- Mode Batch -->
                <div class="content-panel batch-panel">
                  <BatchAnalysis
                    :analysis-params="{
                      locus: formParams.locus,
                      distance: formParams.distance,
                      percentage: formParams.percentage,
                      interactionType: formParams.interactionType,
                      positions: positions,
                      aCsv: aCsvData,
                      bCsv: bCsvData
                    }"
                  />
                </div>
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
      hed,
      specificDivergence,
      filteredContactData,
      totalStructure,
      rawPositions
    } = useHlaAnalysis();

    // État pour suivre les positions sélectionnées
    const selectedPositions = ref([]);
    
    // État pour l'onglet actuel
    const currentTab = ref('exploration');
    
    // Pour la mise à jour automatique avec debounce
    const debouncedCalculation = ref(null);

    // Fonction wrapper qui réinitialise les positions sélectionnées
    const wrappedUpdateParams = (newParams) => {
      // Réinitialiser les positions sélectionnées à chaque mise à jour du formulaire
      selectedPositions.value = [];
      
      // Appeler la fonction originale
      originalUpdateParams(newParams);
    };

    // Surveiller les changements de formParams pour mise à jour automatique
    watch(formParams, () => {
      // Annuler tout calcul précédent en attente
      if (debouncedCalculation.value) {
        clearTimeout(debouncedCalculation.value);
      }
      
      // Définir un nouveau timeout pour le calcul (300ms)
      debouncedCalculation.value = setTimeout(() => {
        calculatePositions();
        debouncedCalculation.value = null;
      }, 300);
    }, { deep: true });

    // Computed property pour filtrer les données en fonction des positions sélectionnées
    const filteredContactDataByPositions = computed(() => {
      if (selectedPositions.value.length === 0) {
        return filteredContactData.value;
      }
      return filteredContactData.value.filter(contact =>
        selectedPositions.value.includes(String(contact.ResidueID))
      );
    });

    // Surveiller les changements de positions pour réinitialiser les positions sélectionnées
    // si elles n'existent plus après filtrage
    watch(positions, (newPositions) => {
      selectedPositions.value = selectedPositions.value.filter(pos => pos in newPositions);
    });

    // Gestion du changement d'onglet
    const switchTab = (tab) => {
      currentTab.value = tab;
    };

    // Gestionnaire pour la sélection de positions depuis la frise
    const handlePositionSelection = (positions) => {
      selectedPositions.value = positions;
    };

    // AJOUT : Gestionnaire pour la sélection de positions depuis le formulaire
    const handlePositionClickFromForm = (position) => {
      // Utiliser la même logique que dans SequenceVisualization
      const positionStr = String(position);
      const index = selectedPositions.value.indexOf(positionStr);
      
      if (index !== -1) {
        // Position déjà sélectionnée, la retirer
        const newSelection = [...selectedPositions.value];
        newSelection.splice(index, 1);
        selectedPositions.value = newSelection;
      } else {
        // Position non sélectionnée, l'ajouter
        selectedPositions.value = [...selectedPositions.value, positionStr];
      }
    };

    // Gestionnaire pour le changement d'allèles depuis la visualisation
    const handleAlleleChanged = (alleles) => {
      wrappedUpdateParams({
        allele1: alleles.allele1,
        allele2: alleles.allele2
      });
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
      hed,
      specificDivergence,
      filteredContactDataByPositions,
      handlePositionSelection,
      handlePositionClickFromForm,
      handleAlleleChanged,
      totalStructure,
      selectedPositions,
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
  overflow: hidden;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.content-wrapper {
  display: flex;
  width: 200%;
  height: 100%;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.content-wrapper.slide-exploration {
  transform: translateX(0);
}

.content-wrapper.slide-batch {
  transform: translateX(-50%);
}

.content-panel {
  width: 50%;
  height: 100%;
  padding: 20px;
  overflow-y: auto;
}

.exploration-panel {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.batch-panel {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

/* Animations d'entrée pour le contenu */
.content-panel {
  opacity: 1;
  transition: opacity 0.3s ease 0.2s;
}

.content-wrapper.slide-exploration .batch-panel,
.content-wrapper.slide-batch .exploration-panel {
  opacity: 0.3;
  pointer-events: none;
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
</style>