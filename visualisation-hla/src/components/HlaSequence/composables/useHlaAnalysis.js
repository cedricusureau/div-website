// useHlaAnalysis.js
import { ref, reactive } from 'vue';
import { HlaService } from '@/services/hlaService';

export function useHlaAnalysis() {
  const csvData = ref([]);
  const aCsvData = ref([]);
  const bCsvData = ref([]);
  const positions = ref({});
  const alleleSpecificPositionsResult = ref(null);
  const loading = ref(false);
  const error = ref(null);
  
  // État de formulaire local
  const formParams = reactive({
    locus: 'A',
    distance: 3,
    percentage: 20,
    interactionType: 'Peptide',
    allele1 : 'A*02:01',
    allele2 : 'A*03:01'
  });

  async function initializeData() {
    loading.value = true;
    try {
      // Destructure the loaded data
      const { A: aData, B: bData, mhcContacts } = await HlaService.loadData();
      
      // Store the data separately
      csvData.value = mhcContacts;  // Default to mhc_contacts.csv
      aCsvData.value = aData;
      bCsvData.value = bData;
      
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
      const { positionWeighted, alleleSpecificPositions } = await HlaService.getPatchPosition(
        csvData.value,
        formParams.locus,
        formParams.distance,
        formParams.percentage,
        formParams.interactionType,
        formParams.allele1,
        formParams.allele2,
        aCsvData.value,
        bCsvData.value
      );
  
      // Update positions
      positions.value = positionWeighted;
      console.log('New positions calculated:', positions.value);
     
      // Update allele-specific positions
      if (alleleSpecificPositions) {
        console.log('Allele-specific positions:', alleleSpecificPositions);
        alleleSpecificPositionsResult.value = alleleSpecificPositions;
      } else {
        // Reset if no results
        alleleSpecificPositionsResult.value = null;
      }
   
    } catch (err) {
      // Handle and log any errors
      error.value = err.message;
      console.error('Error calculating positions:', err);
      
      // Reset values in case of error
      positions.value = {};
      alleleSpecificPositionsResult.value = null;
    }
  }

  return {
    loading,
    error,
    positions,
    formParams,
    updateParams,
    initializeData,
    calculatePositions,
    // Ajoutez ces lignes si vous voulez y accéder
    aCsvData,
    bCsvData,
    alleleSpecificPositionsResult
  };
}