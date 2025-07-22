<template>
  <div class="form-wrapper">
  <div class="form-container">
    <v-card flat class="main-form-card">
      <v-card-text class="pb-2 pt-3">
        
        <!-- En-tête avec lien tutoriel -->
        <div class="form-header">
          <h3 class="form-title">Parameters</h3>
          <v-tooltip bottom>
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon
                size="small"
                variant="text"
                color="primary"
                @click="openTutorial"
                class="tutorial-link"
              >
                <v-icon size="small">mdi-help</v-icon>
              </v-btn>
            </template>
            Need help? Check the tutorial
          </v-tooltip>
        </div>

        <!-- Première ligne : Locus et Type d'interaction -->
        <v-row dense>
          <v-col cols="6">
            <v-select
              :model-value="formParams.locus"
              @update:model-value="updateParam('locus', $event)"
              :items="[{title: 'HLA-A', value: 'A'}, {title: 'HLA-B', value: 'B'}]"
              label="HLA Locus"
              density="comfortable"
              variant="outlined"
              hide-details
              class="select-with-spacing"
            >
              <template #prepend-inner>
                <v-tooltip bottom>
                  <template #activator="{ props }">
                    <v-icon v-bind="props" size="small" color="grey">mdi-help-circle</v-icon>
                  </template>
                  Select the specific HLA class I molecule (A or B) for interaction analysis
                </v-tooltip>
              </template>
            </v-select>
          </v-col>
          
          <v-col cols="6">
            <v-select
              :model-value="formParams.interactionType"
              @update:model-value="updateParam('interactionType', $event)"
              :items="[
                {title: 'Peptide Only', value: 'Peptide'}, 
                {title: 'TCR Only', value: 'TCR'}, 
                {title: 'Peptide and TCR', value: 'Peptide + TCR'},
                {title: 'Peptide or TCR', value: 'Peptide or TCR'}
              ]"
              label="Interaction Type"
              density="comfortable"
              variant="outlined"
              hide-details
              :menu-props="{ maxHeight: 300 }"
              item-props
              class="select-with-spacing"
            >
              <template #prepend-inner>
                <v-tooltip bottom>
                  <template #activator="{ props }">
                    <v-icon v-bind="props" size="small" color="grey">mdi-help-circle</v-icon>
                  </template>
                  Select the type of molecular interactions to analyze
                </v-tooltip>
              </template>
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :title="item.title" class="interaction-item">
                  <template #title>
                    <span class="text-body-2">{{ item.title }}</span>
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </v-col>
        </v-row>

        <!-- Distance slider -->
        <v-row dense class="mt-3">
          <v-col cols="12">
            <div class="slider-group">
              <label class="slider-label">Distance (Å): {{ formParams.distance }}</label>
              <v-slider
                :model-value="formParams.distance"
                @update:model-value="updateParam('distance', $event)"
                min="2"
                max="7.5"
                step="0.5"
                density="compact"
                hide-details
                thumb-label
                color="primary"
              >
                <template #prepend>
                  <v-tooltip bottom>
                    <template #activator="{ props }">
                      <v-icon v-bind="props" size="small" color="grey">mdi-help-circle</v-icon>
                    </template>
                    Maximum distance (in Angstroms) between residues to consider them in contact
                  </v-tooltip>
                </template>
              </v-slider>
            </div>
          </v-col>
        </v-row>
        
        <!-- Frequency slider -->
        <v-row dense class="mt-2">
          <v-col cols="12">
            <div class="slider-group">
              <label class="slider-label">Frequency (%): {{ formParams.percentage }}</label>
              <v-slider
                :model-value="formParams.percentage"
                @update:model-value="updateParam('percentage', $event)"
                min="0"
                max="100"
                step="5"
                density="compact"
                hide-details
                thumb-label
                color="primary"
              >
                <template #prepend>
                  <v-tooltip bottom>
                    <template #activator="{ props }">
                      <v-icon v-bind="props" size="small" color="grey">mdi-help-circle</v-icon>
                    </template>
                    Minimum percentage of structures where the interaction is observed
                  </v-tooltip>
                </template>
              </v-slider>
            </div>
          </v-col>
        </v-row>
        
        <!-- Boutons d'actions rapides -->
        <v-row dense class="mt-2">
          <v-col cols="8">
          </v-col>
          <v-col cols="4" class="text-right">
            <v-btn
              @click="resetToDefaults"
              variant="text"
              size="small"
              color="grey"
              class="reset-btn"
            >
              <v-icon size="small">mdi-restore</v-icon>
              Reset
            </v-btn>
          </v-col>
        </v-row>
        
      </v-card-text>
    </v-card>


    <v-expansion-panels variant="accordion" class="mt-0 mb-3">
      <v-expansion-panel class="advanced-filters-panel">
        <v-expansion-panel-title class="py-0 px-2" style="min-height: 28px !important;">
          <v-icon class="mr-1" size="x-small">mdi-filter-variant</v-icon>
          <span class="text-caption" style="font-size: 0.7rem !important;">Advanced Filters</span>
        </v-expansion-panel-title>
        <v-expansion-panel-text class="pt-1 pb-1 px-2">
          <!-- Filtre polymorphique ultra-compact -->
          <div class="advanced-filter-content">
            <v-checkbox
              :model-value="formParams.showPolymorphicOnly"
              @update:model-value="updateParam('showPolymorphicOnly', $event)"
              label="Do not include non-polymorphic positions"
              density="compact"
              hide-details
              class="checkbox-ultra-compact"
            >
              <template #label>
                <span>Do not include non-polymorphic positions</span>
                <v-tooltip
                  activator="parent"
                  location="top"
                >
                  <div style="max-width: 350px; font-size: 0.8em; line-height: 1.3;">
                    This option excludes non-polymorphic positions from analysis and visualization.
                    Including non-polymorphic positions dilutes all divergence values equally by increasing 
                    the denominator, but preserves relative comparisons between allele pairs when the same 
                    set of positions is used for all comparisons.
                  </div>
                </v-tooltip>
              </template>
            </v-checkbox>
            
            <v-slide-y-transition>
              <div v-if="formParams.showPolymorphicOnly" class="entropy-section">
                <label class="entropy-label">Entropy: {{ formParams.entropyThreshold }}</label>
                <v-slider
                  :model-value="formParams.entropyThreshold"
                  @update:model-value="updateParam('entropyThreshold', $event)"
                  min="0"
                  max="3"
                  step="0.1"
                  density="compact"
                  hide-details
                  thumb-label
                  color="secondary"
                  class="entropy-slider"
                />
              </div>
            </v-slide-y-transition>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Section des positions et batch -->
      
  </div>
  </div>
</template>

<script>
export default {
  name: 'HlaAnalysisForm',
  props: {
    formParams: {
      type: Object,
      required: true,
      default: () => ({
        locus: 'A',
        distance: 3,
        percentage: 20,
        interactionType: 'Peptide or TCR',
        allele1: '',
        allele2: '',
        showPolymorphicOnly: true,
        entropyThreshold: 0.2
      })
    },
    loading: {
      type: Boolean,
      default: false
    },
    filteredPositions: {
      type: Array,
      default: () => []
    },
    selectedPositions: {  
      type: Array,
      default: () => []
    },
  },
  data() {
    return {
      showSuggestions: null,
      currentInput: '',
    }
  },
  methods: {
    updateParam(key, value) {
      this.$emit('update:formParams', {
        ...this.formParams,
        [key]: value
      });
    },
    openTutorial() {
      // Stocker la section de destination dans le localStorage
      localStorage.setItem('tutorialSection', 'section-parameters');
      // Ouvrir dans un nouvel onglet
      window.open(window.location.origin + '?openTutorial=true', '_blank');
    },
    resetToDefaults() {
      // Reset vers les valeurs par défaut
      const defaultParams = {
        locus: 'A',
        distance: 3,
        percentage: 20,
        interactionType: 'Peptide or TCR',
        allele1: '',
        allele2: '',
        showPolymorphicOnly: true,
        entropyThreshold: 0.2
      };
      
      // Mettre à jour tous les paramètres
      Object.keys(defaultParams).forEach(key => {
        this.updateParam(key, defaultParams[key]);
      });
    }
  }
}
</script>

<style scoped>
@import '../styles/loading.css';
@import '../styles/tooltip.css';

.form-container {
  width: 100%;
  max-width: 380px;
  padding: 0;
  margin: 0 auto;
}

/* Wrapper unique harmonisé */
.form-wrapper {
  background: rgba(248, 249, 250, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(224, 224, 224, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  max-width: 420px;
  margin: 0 auto;
}

.main-form-card {
  background-color: transparent !important;
  box-shadow: none !important;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(224, 224, 224, 0.3);
}

.form-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.tutorial-link {
  opacity: 0.7;
  transition: opacity 0.2s;
}

.tutorial-link:hover {
  opacity: 1;
}

.slider-group {
  padding: 0.5rem 0;
}

.slider-group-compact {
  padding: 0.25rem 0;
}

.slider-group-ultra-compact {
  padding: 0.125rem 0;
}

.slider-label {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.25rem;
  display: block;
}

.slider-label-compact {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.125rem;
  display: block;
}

.slider-label-ultra-compact {
  font-size: 0.7rem;
  color: #666;
  margin-bottom: 0.05rem;
  display: block;
}

.checkbox-compact :deep(.v-input__control) {
  min-height: 24px !important;
}

.checkbox-compact :deep(.v-selection-control__wrapper) {
  height: 24px !important;
}

.slider-compact {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

/* Styles pour le panel Advanced Filters séparé et ultra-compact */
.advanced-filters-panel {
  max-width: 100%;
}

.advanced-filters-panel .v-expansion-panel-title {
  font-size: 0.7rem !important;
  line-height: 1.2 !important;
  padding: 2px 8px !important;
  min-height: 28px !important;
}

.advanced-filter-content {
  margin: 0;
  padding: 0;
}

.checkbox-ultra-compact {
  margin: 0 !important;
  padding: 0 !important;
}

.checkbox-ultra-compact :deep(.v-input__control) {
  min-height: 20px !important;
  margin: 0 !important;
}

.checkbox-ultra-compact :deep(.v-selection-control) {
  min-height: 20px !important;
  align-items: center;
}

.checkbox-ultra-compact :deep(.v-selection-control__wrapper) {
  height: 20px !important;
  margin-right: 4px !important;
}

.checkbox-ultra-compact :deep(.v-label) {
  font-size: 0.7rem !important;
  line-height: 1.2 !important;
}

.entropy-section {
  margin-top: 4px;
  margin-bottom: 0;
  padding: 0;
}

.entropy-label {
  font-size: 0.65rem !important;
  color: #666;
  display: block;
  margin-bottom: 2px;
  line-height: 1.2;
}

.entropy-slider {
  margin: 0 !important;
  padding: 0 !important;
}

.entropy-slider :deep(.v-slider) {
  margin: 0 !important;
  min-height: 20px !important;
}

.entropy-slider :deep(.v-slider__container) {
  margin: 0 !important;
  padding: 0 !important;
}

/* Ajuster légèrement la taille du cadre des selects */
.select-with-spacing :deep(.v-field) {
  min-height: 48px !important;
}

.select-with-spacing :deep(.v-field__field) {
  min-height: 48px !important;
  display: flex !important;
  align-items: center !important;
}

.select-with-spacing :deep(.v-field__outline) {
  min-height: 48px !important;
}

.select-with-spacing :deep(.v-field__input) {
  min-height: 48px !important;
  display: flex !important;
  align-items: center !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 0.875rem !important;
  padding-right: 32px !important;
}

.select-with-spacing :deep(.v-select__selection) {
  font-size: 0.875rem !important;
  display: flex !important;
  align-items: center !important;
  height: 100% !important;
  width: 100% !important;
}

.select-with-spacing :deep(.v-select__selection-text) {
  font-size: 0.875rem !important;
  line-height: normal !important;
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
  width: 100% !important;
}

.select-with-spacing :deep(.v-field__append-inner) {
  height: 48px !important;
  display: flex !important;
  align-items: center !important;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .form-container {
    max-width: 100%;
    padding: 0.5rem;
  }
  
  .main-form-card .v-card-text {
    padding: 0.5rem !important;
  }
  
  .slider-group {
    padding: 0.25rem 0;
  }
  
  .slider-group-compact {
    padding: 0.125rem 0;
  }
  
  .slider-group-ultra-compact {
    padding: 0.05rem 0;
  }
  
  .slider-label {
    font-size: 0.8rem;
  }
  
  .slider-label-compact {
    font-size: 0.7rem;
  }
  
  .slider-label-ultra-compact {
    font-size: 0.65rem;
  }
  
  .positions-card .v-card-title {
    font-size: 0.8rem !important;
    padding: 0.5rem !important;
  }
  
  .selection-count {
    font-size: 0.65rem !important;
  }
  
  .positions-card .v-card-text {
    padding: 0.25rem !important;
  }
  
  .position-chip-compact {
    font-size: 0.65rem !important;
    height: 18px !important;
    min-width: 24px !important;
  }
  
  .advanced-filters-panel .v-expansion-panel-title {
    padding: 1px 6px !important;
    min-height: 24px !important;
    font-size: 0.65rem !important;
  }
  
  .checkbox-ultra-compact :deep(.v-label) {
    font-size: 0.65rem !important;
  }
  
  .entropy-label {
    font-size: 0.6rem !important;
  }
}

@media (max-width: 480px) {
  .positions-chips {
    gap: 0.125rem;
  }
  
  .position-chip-vuetify {
    font-size: 0.7rem !important;
    height: 22px !important;
    min-width: auto !important;
  }
  
  .batch-btn {
    font-size: 0.85rem !important;
  }
  
  .example-btn {
    font-size: 0.75rem !important;
  }
  
  .reset-btn {
    font-size: 0.7rem !important;
    padding: 0 6px !important;
  }
  
  /* Responsive pour les boutons d'actions */
  .example-btn .v-icon {
    display: none !important;
  }
  
  .example-btn {
    padding: 0 8px !important;
  }
}

/* Section des positions et batch */
.batch-analysis-floating {
  margin-top: 1rem;
}

.positions-card {
  max-width: 100%;
}

.positions-card .v-card-title {
  font-size: 0.75rem !important;
  font-weight: 500 !important;
  min-height: 32px !important;
}

.selection-count {
  color: #1976d2 !important;
  font-weight: 500 !important;
  font-size: 0.7rem !important;
}

.positions-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.125rem;
  align-items: flex-start;
}

.position-chip-compact {
  cursor: pointer !important;
  transition: all 0.2s ease;
  font-family: 'Courier New', monospace !important;
  font-weight: 500 !important;
  margin: 0 !important;
  height: 20px !important;
  font-size: 0.7rem !important;
  min-width: 28px !important;
}

.position-chip-compact:hover {
  transform: translateY(-1px);
}

.batch-btn {
  font-weight: 500 !important;
  text-transform: none !important;
  transition: all 0.3s ease;
}

/* Transitions pour une meilleure UX */
.v-expansion-panels {
  transition: all 0.3s ease;
}

.positions-card {
  transition: all 0.3s ease;
  animation: fadeInUp 0.4s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slider-group {
  transition: all 0.2s ease;
}

/* Styles pour les nouveaux boutons */
.example-btn {
  text-transform: none !important;
  font-size: 0.8rem !important;
  font-weight: 500 !important;
}

.reset-btn {
  text-transform: none !important;
  font-size: 0.75rem !important;
  opacity: 0.7;
  min-width: auto !important;
  padding: 0 8px !important;
}

.reset-btn:hover {
  opacity: 1;
}

/* Correction de l'affichage des items du select */
.interaction-item {
  font-size: 0.85rem !important;
}

.interaction-item .v-list-item__title {
  font-size: 0.85rem !important;
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
}

/* Amélioration de l'affichage du select */
:deep(.v-select .v-field__input) {
  font-size: 0.85rem !important;
  min-height: auto !important;
  padding: 0 !important;
}

:deep(.v-select .v-field__append-inner) {
  padding-left: 4px !important;
}

/* Amélioration de l'accessibilité */
.position-chip-vuetify:focus {
  outline: 2px solid var(--v-theme-primary);
  outline-offset: 2px;
}

.batch-btn:focus {
  outline: 2px solid var(--v-theme-secondary);
  outline-offset: 2px;
}

.example-btn:focus,
.reset-btn:focus {
  outline: 2px solid var(--v-theme-primary);
  outline-offset: 2px;
}
</style>