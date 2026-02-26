import { ref, shallowRef, reactive } from 'vue';
import { HlaService } from '@/services/hlaService';
import { PolymorphismService } from '@/services/polymorphismService';

export function useHlaAnalysis() {
  // Utiliser shallowRef pour les grandes structures de données qui ne changent pas souvent
  const aCsvData = shallowRef([]);
  const bCsvData = shallowRef([]);
  const positions = shallowRef({});
  const rawPositions = shallowRef({}); // Stocke toutes les positions avant filtrage polymorphique
  const polymorphismData = shallowRef({
    A: {},
    B: {}
  });

  // Utiliser ref normal pour les valeurs primitives ou les objets qui changent souvent
  const alleleSpecificPositionsResult = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const cHed = ref(null);
  const tHed = ref(null);
  const totalStructure = ref(null);

  // État de formulaire local
  const formParams = reactive({
    locus: 'A',
    mode: 'either', // 'either', 'tcr', 'peptide'
    distance: 4.0,
    quantile: 0.7,
    allele1: '',
    allele2: '',
    showPolymorphicOnly: true
  });

  async function initializeData() {
    loading.value = true;
    try {
      // Charger les données HLA (séquences) et les services auxiliaires
      const { A: aData, B: bData } = await HlaService.loadData();
      aCsvData.value = aData;
      bCsvData.value = bData;

      // Charger les données de polymorphisme
      const polymorphismDataResult = await PolymorphismService.loadPolymorphismData();
      polymorphismData.value = polymorphismDataResult;

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
    if (!aCsvData.value.length || !bCsvData.value.length) return;

    try {
      const result = HlaService.getPatchPosition(
        formParams.locus,
        formParams.mode,
        formParams.distance,
        formParams.quantile,
        formParams.showPolymorphicOnly,
        formParams.allele1,
        formParams.allele2,
        aCsvData.value,
        bCsvData.value,
        null // visiblePositions pour calcul tHed (sera ajouté plus tard si nécessaire)
      );

      // Les positions sont déjà filtrées selon showPolymorphicOnly
      positions.value = result.positionWeighted;
      rawPositions.value = result.positionWeighted; // Plus de distinction nécessaire

      // Nombre fixe de structures curées
      totalStructure.value = result.totalStructures;

      // Update allele-specific positions
      if (result.alleleSpecificPositions) {
        alleleSpecificPositionsResult.value = result.alleleSpecificPositions;
      } else {
        alleleSpecificPositionsResult.value = null;
      }

      // Update divergence values
      cHed.value = result.cHed;
      tHed.value = result.tHed;

    } catch (err) {
      error.value = err.message;
      console.error('Error calculating positions:', err);

      // Reset all values
      rawPositions.value = {};
      positions.value = {};
      alleleSpecificPositionsResult.value = null;
      cHed.value = null;
      tHed.value = null;
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
    cHed,
    tHed,
    totalStructure,
    polymorphismData,
    rawPositions,
    filteredContactData: shallowRef([]) // Deprecated - kept for backward compatibility
  };
}