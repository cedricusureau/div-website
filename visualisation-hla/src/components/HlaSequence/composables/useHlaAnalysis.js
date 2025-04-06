import { ref, reactive, computed } from 'vue';
import { HlaService } from '@/services/hlaService';
import { EntropyService } from '@/services/entropyService';

export function useHlaAnalysis() {
  const csvData = ref([]);
  const aCsvData = ref([]);
  const bCsvData = ref([]);
  const positions = ref({});
  const rawPositions = ref({}); // Stocke toutes les positions avant filtrage
  const alleleSpecificPositionsResult = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const classicalDivergence = ref(null);
  const specificDivergence = ref(null);
  const filteredContactData = ref([]);
  const totalStructure = ref(null);
  const entropyData = ref({
    A: {},
    B: {}
  });
 
  // État de formulaire local
  const formParams = reactive({
    locus: 'A',
    distance: 3,
    percentage: 20,
    interactionType: 'Peptide or TCR',
    allele1: '',
    allele2: '',
    showPolymorphicOnly: true,
    entropyThreshold: 0.2
  });

  // Computed pour les positions filtrées par entropie
  const filteredPositions = computed(() => {
    if (!formParams.showPolymorphicOnly) {
      return rawPositions.value;
    }
    
    const locusEntropyData = entropyData.value[formParams.locus] || {};
    const threshold = formParams.entropyThreshold; // Utiliser le seuil paramétrable
    
    return Object.entries(rawPositions.value).reduce((filtered, [position, type]) => {
      const entropy = locusEntropyData[position];
      // Inclure seulement si l'entropie est définie et >= seuil
      if (entropy !== undefined && entropy >= threshold) {
        filtered[position] = type;
      }
      return filtered;
    }, {});
  });

  async function initializeData() {
    loading.value = true;
    try {
      // Charger les données HLA
      const { A: aData, B: bData, mhcContacts } = await HlaService.loadData();
      csvData.value = mhcContacts;
      aCsvData.value = aData;
      bCsvData.value = bData;
      
      // Charger les données d'entropie
      const entropyDataResult = await EntropyService.loadEntropyData();
      entropyData.value = entropyDataResult;
      
      await calculatePositions();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  function updateParams(newParams) {
    Object.assign(formParams, newParams);
    
    // Si nous changeons le filtrage d'entropie ou le seuil, mettre à jour les positions
    if ('showPolymorphicOnly' in newParams || 'entropyThreshold' in newParams) {
      positions.value = filteredPositions.value;
    }
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

      // Stocker toutes les positions non filtrées
      rawPositions.value = result.positionWeighted;
      
      // Appliquer le filtre d'entropie
      positions.value = filteredPositions.value;
      
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
      rawPositions.value = {};
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
    totalStructure,
    entropyData,
    rawPositions
  };
}