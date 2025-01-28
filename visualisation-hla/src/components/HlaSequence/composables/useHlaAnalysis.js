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
  const classicalDivergence = ref(null);
  const specificDivergence = ref(null);
  const filteredContactData = ref([]);
  const totalStructure = ref(null);
 
  // État de formulaire local
  const formParams = reactive({
    locus: 'A',
    distance: 3,
    percentage: 20,
    interactionType: 'Peptide or TCR',
    allele1: '',
    allele2: ''
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

  function updateParams(newParams) {
    Object.assign(formParams, newParams);
  }

  async function calculatePositions() {
    if (!csvData.value.length) return;
   
    try {
      const result = await HlaService.getPatchPosition(
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
      positions.value = result.positionWeighted;
      
      // Store the new detailed data
      filteredContactData.value = result.filteredData;

      // Important : mettre à jour totalStructure avant de l'utiliser
      const uniqueStructures = new Set(result.filteredData.map(d => d.Structure));
      totalStructure.value = uniqueStructures.size;
      
      // Update allele-specific positions
      if (result.alleleSpecificPositions) {
        alleleSpecificPositionsResult.value = result.alleleSpecificPositions;
      } else {
        alleleSpecificPositionsResult.value = null;
      }
      
      // Update divergence values
      classicalDivergence.value = result.classicalDivergence;
      specificDivergence.value = result.specificDivergence;
   
    } catch (err) {
      error.value = err.message;
      console.error('Error calculating positions:', err);
      
      // Reset all values
      positions.value = {};
      filteredContactData.value = null;
      alleleSpecificPositionsResult.value = null;
      classicalDivergence.value = null;
      specificDivergence.value = null;
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
    aCsvData,
    bCsvData,
    alleleSpecificPositionsResult,
    classicalDivergence,
    specificDivergence,
    filteredContactData,    
    totalStructure
  };
}