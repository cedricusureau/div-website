// useHlaAnalysis.js
import { ref, reactive } from 'vue';
import { HlaService } from '@/services/hlaService';

export function useHlaAnalysis() {
  const csvData = ref([]);
  const positions = ref({});
  const loading = ref(false);
  const error = ref(null);
  
  // État de formulaire local
  const formParams = reactive({
    locus: 'A',
    distance: 3,
    percentage: 20,
    interactionType: 'Peptide'
  });

  async function initializeData() {
    loading.value = true;
    try {
      csvData.value = await HlaService.loadData();
      await calculatePositions();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  // Fonction pour mettre à jour les paramètres
  function updateParams(newParams) {
    console.log('Updating params to:', newParams);
    Object.assign(formParams, newParams);
  }

  async function calculatePositions() {
    console.log('Current params:', formParams);
    if (!csvData.value.length) return;

    try {
      const result = await HlaService.getPatchPosition(
        csvData.value,
        formParams.locus,
        formParams.distance,
        0,
        formParams.percentage,
        formParams.interactionType
      );
      positions.value = result;
      console.log('New positions calculated:', positions.value);
    } catch (err) {
      error.value = err.message;
    }
  }

  return {
    loading,
    error,
    positions,
    formParams,
    updateParams,
    initializeData,
    calculatePositions
  };
}