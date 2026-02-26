<template>
  <div class="distance-charts">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
      <p class="loading-text">Chargement des données de distance...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <v-alert type="error" variant="tonal">
        {{ error }}
      </v-alert>
    </div>

    <!-- Charts -->
    <template v-else-if="positionData.length > 0">
      <!-- Global Distribution -->
      <div class="chart-card">
        <div class="chart-header">
          <h4>Distribution globale</h4>
          <p class="chart-subtitle">Toutes les structures confondues (n={{ positionData.length }})</p>
        </div>
        <GlobalDistributionChart
          :data="positionData"
          :position="positionLabel"
        />
      </div>

      <!-- Target Breakdown -->
      <div class="chart-card">
        <div class="chart-header">
          <h4>Distribution par cible</h4>
          <p class="chart-subtitle">Comparaison Peptide vs TCR</p>
        </div>
        <TargetBreakdownChart
          :data="positionData"
          :position="positionLabel"
        />
      </div>

      <!-- Amino Acid Breakdown -->
      <div class="chart-card">
        <div class="chart-header">
          <h4>Distribution par acide aminé</h4>
          <p class="chart-subtitle">KDE superposés par acide aminé présent à cette position</p>
        </div>
        <AminoAcidBreakdownChart
          :data="positionData"
          :position="positionLabel"
        />
      </div>
    </template>

    <!-- No Data State -->
    <div v-else class="no-data-state">
      <v-alert type="info" variant="tonal">
        Aucune donnée de distance disponible pour la position {{ positionLabel }}
      </v-alert>
    </div>
  </div>
</template>

<script setup>
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
  }
});

// État
const loading = ref(false);
const error = ref(null);
const positionData = ref([]);

// Computed
const positionLabel = computed(() => `${props.position}:${props.locus}`);

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
    console.log(`PositionDistanceCharts: ${data.length} mesures chargées pour ${positionLabel.value}`);
  } catch (err) {
    error.value = `Erreur de chargement: ${err.message}`;
    console.error('Erreur PositionDistanceCharts:', err);
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
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
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
