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
          @update:formParams="updateParams"
          @analyze="calculatePositions"
        />
        <SequenceVisualization
          :positions="positions"
          :total-positions="Object.keys(positions).length"
          :allele-specific-positions-result="alleleSpecificPositionsResult"
        />
      </div>
    </div>

  </template>
  
  <script>
  import { onMounted } from 'vue';
  import { useHlaAnalysis } from './composables/useHlaAnalysis';
  import HlaAnalysisForm from './components/HlaAnalysisForm.vue';
  import SequenceVisualization from './components/SequenceVisualization.vue';
  
  export default {
    name: 'HlaSequence',
    components: {
      HlaAnalysisForm,
      SequenceVisualization
    },
    setup() {
  const {
    loading,
    error,
    positions,
    formParams,
    updateParams,
    initializeData,
    calculatePositions,
    aCsvData,  
    bCsvData,
    alleleSpecificPositionsResult,
  } = useHlaAnalysis();

  onMounted(() => {
    initializeData();
  });

  return {
    loading,
    error,
    positions,
    formParams,
    updateParams,
    calculatePositions,
    aCsvData,  // Ajoutez cette ligne
    bCsvData,
    alleleSpecificPositionsResult,   // Ajoutez cette ligne
  };
}
}
  </script>