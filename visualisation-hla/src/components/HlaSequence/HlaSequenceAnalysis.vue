<template>
  <div class="sequence-container">
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
    <div v-if="!loading && !error" class="analysis-container">
      <HlaAnalysisForm
        :formParams="formParams"
        :loading="loading"
        @update:formParams="wrappedUpdateParams"
        @open-batch-analysis="handleBatchAnalysis"
      />  
      <SequenceVisualization
        :positions="positions"
        :total-positions="Object.keys(positions).length"
        :allele-specific-positions-result="alleleSpecificPositionsResult"
        :classical-divergence="classicalDivergence"
        :specific-divergence="specificDivergence"
        :filtered-contact-data="filteredContactDataByPositions" 
        @positions-selected="handlePositionSelection"
      />
    </div>
  </div>
</template>

<script>
import { onMounted, ref, computed, watch, onBeforeUnmount } from 'vue';
import { useHlaAnalysis } from './composables/useHlaAnalysis';
import HlaAnalysisForm from './components/HlaAnalysisForm.vue';
import SequenceVisualization from './components/SequenceVisualization.vue';

export default {
  name: 'HlaSequence',
  components: {
    HlaAnalysisForm,
    SequenceVisualization,
  },
  emits: ['switch-to-batch'],
  setup(props, { emit }) {
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
      classicalDivergence,
      specificDivergence,
      filteredContactData,
      totalStructure,
      rawPositions
    } = useHlaAnalysis();

    // État pour suivre les positions sélectionnées
    const selectedPositions = ref([]);
    
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

    // Gestion du batch analysis
    const handleBatchAnalysis = async () => {
      console.log('Starting batch analysis');
      await calculatePositions();
     
      const batchData = {
        locus: formParams.locus,
        distance: formParams.distance,
        percentage: formParams.percentage,
        interactionType: formParams.interactionType,
        positions: Object.assign({}, positions.value),
        aCsv: aCsvData.value,
        bCsv: bCsvData.value    
      };
      
      console.log('Emitting batch data:', batchData);
      emit('switch-to-batch', batchData);
    };

    // Gestionnaire pour la sélection de positions
    const handlePositionSelection = (positions) => {
      selectedPositions.value = positions;
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
      classicalDivergence,
      specificDivergence,
      filteredContactDataByPositions,
      handlePositionSelection,
      totalStructure,
      selectedPositions,
      handleBatchAnalysis,
      rawPositions
    };
  }
};
</script>

<style scoped>
.sequence-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
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
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>