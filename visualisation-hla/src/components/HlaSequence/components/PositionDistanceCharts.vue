<template>
  <div class="distance-charts">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
      <p class="loading-text">Loading distance data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <v-alert type="error" variant="tonal">
        {{ error }}
      </v-alert>
    </div>

    <!-- Charts -->
    <template v-else-if="filteredData.length > 0">
      <!-- Global Distribution -->
      <div class="chart-card">
        <div class="chart-header">
          <h4>Global Distribution</h4>
          <p class="chart-subtitle">{{ modeLabel }} (n={{ uniqueStructureCount }} structures)</p>
        </div>
        <GlobalDistributionChart
          :data="filteredData"
          :position="positionLabel"
          :isVisible="isVisible"
        />
      </div>

      <!-- Target Breakdown (only shown in 'either' mode) -->
      <div v-if="contactMode === 'either'" class="chart-card">
        <div class="chart-header">
          <h4>Distribution by Target</h4>
          <p class="chart-subtitle">Peptide vs TCR Comparison</p>
        </div>
        <TargetBreakdownChart
          :data="filteredData"
          :position="positionLabel"
          :isVisible="isVisible"
        />
      </div>

      <!-- Amino Acid Breakdown -->
      <div class="chart-card">
        <div class="chart-header">
          <h4>Distribution by Amino Acid</h4>
          <p class="chart-subtitle">Overlaid KDE by amino acid present at this position</p>
        </div>
        <AminoAcidBreakdownChart
          :data="filteredData"
          :position="positionLabel"
          :isVisible="isVisible"
        />
      </div>
    </template>

    <!-- No Data State -->
    <div v-else class="no-data-state">
      <v-alert type="info" variant="tonal">
        No distance data available for position {{ positionLabel }}
      </v-alert>
    </div>
  </div>
</template>

<script setup>
/* eslint-disable no-undef */
import { ref, watch, computed } from 'vue';
import { positionDistancesService } from '../../../services/positionDistancesService';
import GlobalDistributionChart from '../../PositionDistances/components/GlobalDistributionChart.vue';
import TargetBreakdownChart from '../../PositionDistances/components/TargetBreakdownChart.vue';
import AminoAcidBreakdownChart from '../../PositionDistances/components/AminoAcidBreakdownChart.vue';

const props = defineProps({
  locus: {
    type: String,
    required: true,
    validator: (value) => ['A', 'B'].includes(value)
  },
  position: {
    type: Number,
    required: true,
    validator: (value) => value >= 1 && value <= 182
  },
  contactMode: {
    type: String,
    default: 'either',
    validator: (value) => ['either', 'tcr', 'peptide'].includes(value)
  },
  isVisible: {
    type: Boolean,
    default: true
  }
});

// État
const loading = ref(false);
const error = ref(null);
const positionData = ref([]);

// Computed
const positionLabel = computed(() => `${props.position}:${props.locus}`);

// Filtrer les données selon le mode de contact
const filteredData = computed(() => {
  if (props.contactMode === 'either') {
    return positionData.value;
  } else if (props.contactMode === 'tcr') {
    return positionData.value.filter(d => d.target === 'TCR');
  } else if (props.contactMode === 'peptide') {
    return positionData.value.filter(d => d.target === 'Peptide');
  }
  return positionData.value;
});

// Label du mode pour l'affichage (utilisé dans le template)
// eslint-disable-next-line no-unused-vars
const modeLabel = computed(() => {
  if (props.contactMode === 'tcr') return 'TCR only';
  if (props.contactMode === 'peptide') return 'Peptide only';
  return 'Peptide + TCR';
});

// Nombre de structures uniques (basé sur les données filtrées)
const uniqueStructureCount = computed(() => {
  const structureIds = new Set(filteredData.value.map(d => d.structure_id));
  return structureIds.size;
});

/**
 * Charge les données de distance pour la position et le locus
 */
const loadData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const data = await positionDistancesService.getPositionData(
      props.locus,
      props.position
    );
    positionData.value = data;
    console.log(`PositionDistanceCharts: ${data.length} measurements loaded for ${positionLabel.value}`);
  } catch (err) {
    error.value = `Loading error: ${err.message}`;
    console.error('PositionDistanceCharts error:', err);
    positionData.value = [];
  } finally {
    loading.value = false;
  }
};

// Watcher pour recharger quand locus ou position change
watch(
  () => [props.locus, props.position],
  () => {
    loadData();
  },
  { immediate: true }
);
</script>

<style scoped>
.distance-charts {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 500px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  gap: 16px;
}

.loading-text {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.error-state,
.no-data-state {
  padding: 20px 0;
}

.chart-card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.chart-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.chart-header {
  margin-bottom: 16px;
}

.chart-header h4 {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 4px 0;
}

.chart-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .chart-card {
    padding: 16px;
  }

  .chart-header h4 {
    font-size: 16px;
  }

  .chart-subtitle {
    font-size: 13px;
  }
}
</style>
