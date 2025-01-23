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
        :classical-divergence="classicalDivergence"
        :specific-divergence="specificDivergence"
        @position-selected="handlePositionSelection"
      />
      <ContactDataTable
      v-if="selectedPosition"
      :filtered-contact-data="filteredContactDataByPosition"
      :total-structures="totalStructure"
      :threshold="formParams.distance"
      :selected-position="selectedPosition"
      />
    </div>
  </div>
</template>
<script>
import { onMounted, ref, computed } from 'vue';
import { useHlaAnalysis } from './composables/useHlaAnalysis';
import HlaAnalysisForm from './components/HlaAnalysisForm.vue';
import SequenceVisualization from './components/SequenceVisualization.vue';
import ContactDataTable from './components/ContactDataTable.vue';
export default {
  name: 'HlaSequence',
  components: {
    HlaAnalysisForm,
    SequenceVisualization,
    ContactDataTable
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
      classicalDivergence,
      specificDivergence,
      filteredContactData,
      positionDetails,
      totalStructure
    } = useHlaAnalysis();
    // État pour suivre la position sélectionnée
    const selectedPosition = ref(null);
    // Computed property pour filtrer les données en fonction de la position sélectionnée
    const filteredContactDataByPosition = computed(() => {
  if (!selectedPosition.value) {
    return filteredContactData.value;
  }
  return filteredContactData.value.filter(contact =>
    String(contact.ResidueID) === String(selectedPosition.value)
  );
});
    // Gestionnaire pour la sélection de position
    const handlePositionSelection = (position) => {
      selectedPosition.value = position;
    };
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
      aCsvData,
      bCsvData,
      alleleSpecificPositionsResult,
      classicalDivergence,
      specificDivergence,
      filteredContactDataByPosition,
      positionDetails,
      handlePositionSelection,
      totalStructure,
      selectedPosition
    };
  }
}
</script>