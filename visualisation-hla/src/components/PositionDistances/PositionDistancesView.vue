<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Position Distance Explorer</h1>
        <p class="text-body-1 mb-6">
          Visualisation de la distribution des distances minimales entre une position HLA
          et le peptide ou le TCR à travers les 432 structures curées.
        </p>
      </v-col>
    </v-row>

    <!-- Position Selector -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <PositionSelector
              v-model:locus="selectedLocus"
              v-model:position="selectedPosition"
              :loading="loading"
              @update="handlePositionUpdate"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
        <p class="mt-4">Chargement des données pour {{ selectedPosition }}:{{ selectedLocus }}...</p>
      </v-col>
    </v-row>

    <!-- Error State -->
    <v-row v-if="error">
      <v-col cols="12">
        <v-alert type="error" dismissible @click:close="error = null">
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>

    <!-- Charts -->
    <template v-if="!loading && positionData.length > 0">
      <!-- Global Distribution -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>Distribution globale</v-card-title>
            <v-card-subtitle>
              Toutes les structures confondues (n={{ positionData.length }})
            </v-card-subtitle>
            <v-card-text>
              <GlobalDistributionChart
                :data="positionData"
                :position="`${selectedPosition}:${selectedLocus}`"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Target Breakdown -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>Distribution par cible</v-card-title>
            <v-card-subtitle>
              Comparaison Peptide vs TCR
            </v-card-subtitle>
            <v-card-text>
              <TargetBreakdownChart
                :data="positionData"
                :position="`${selectedPosition}:${selectedLocus}`"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Amino Acid Breakdown -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>Distribution par acide aminé</v-card-title>
            <v-card-subtitle>
              KDE superposés par acide aminé présent à cette position
            </v-card-subtitle>
            <v-card-text>
              <AminoAcidBreakdownChart
                :data="positionData"
                :position="`${selectedPosition}:${selectedLocus}`"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- No Data State -->
    <v-row v-if="!loading && positionData.length === 0">
      <v-col cols="12">
        <v-alert type="info">
          Aucune donnée disponible pour la position {{ selectedPosition }}:{{ selectedLocus }}
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { positionDistancesService } from '../../services/positionDistancesService'
import PositionSelector from './components/PositionSelector.vue'
import GlobalDistributionChart from './components/GlobalDistributionChart.vue'
import TargetBreakdownChart from './components/TargetBreakdownChart.vue'
import AminoAcidBreakdownChart from './components/AminoAcidBreakdownChart.vue'

// État
const selectedLocus = ref('A')
const selectedPosition = ref(45)
const positionData = ref([])
const loading = ref(false)
const error = ref(null)

// Debounce timer
let debounceTimer = null

/**
 * Charge les données pour la position et le locus sélectionnés
 */
const loadPositionData = async () => {
  loading.value = true
  error.value = null

  try {
    const data = await positionDistancesService.getPositionData(
      selectedLocus.value,
      selectedPosition.value
    )
    positionData.value = data
    console.log(`${data.length} mesures chargées pour ${selectedPosition.value}:${selectedLocus.value}`)
  } catch (err) {
    error.value = `Erreur de chargement: ${err.message}`
    console.error('Erreur loadPositionData:', err)
    positionData.value = []
  } finally {
    loading.value = false
  }
}

/**
 * Handler pour le changement de position (avec debounce)
 */
const handlePositionUpdate = () => {
  // Annuler le timer précédent
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  // Créer un nouveau timer
  debounceTimer = setTimeout(() => {
    loadPositionData()
  }, 300)
}

// Initialisation
onMounted(async () => {
  try {
    await positionDistancesService.init()
    await loadPositionData()
  } catch (err) {
    error.value = `Erreur d'initialisation: ${err.message}`
    console.error('Erreur onMounted:', err)
  }
})

// Cleanup
onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>

<style scoped>
/* Styles spécifiques si nécessaires */
</style>
