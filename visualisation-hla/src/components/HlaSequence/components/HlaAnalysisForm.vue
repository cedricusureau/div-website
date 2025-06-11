<template>
  <div class="form-container">
    <!-- Paramètres principaux en deux colonnes -->
    <div class="main-form">
      <!-- Première colonne : Locus et Type d'interaction -->
      <div class="form-column">
        <div class="form-group">
          <div class="tooltip-container">
            <label for="locus">
              HLA Locus
              <span class="tooltip">Select the specific HLA class I molecule (A or B) for interaction analysis</span>
            </label>
          </div>
          <select
            id="locus"
            :value="formParams.locus"
            @change="updateParam('locus', $event.target.value)"
            class="form-control"
          >
            <option value="A">HLA-A</option>
            <option value="B">HLA-B</option>
          </select>
        </div>

        <div class="form-group">
          <div class="tooltip-container">
            <label for="interactionType">
              Interaction Type
              <span class="tooltip">Select the type of molecular interactions to analyze</span>
            </label>
          </div>
          <select
            id="interactionType"
            :value="formParams.interactionType"
            @change="updateParam('interactionType', $event.target.value)"
            class="form-control"
          >
            <option value="Peptide">Peptide Only</option>
            <option value="TCR">TCR Only</option>
            <option value="Peptide + TCR">Peptide and TCR</option>
            <option value="Peptide or TCR">Peptide or TCR</option>
          </select>
        </div>
      </div>

      <!-- Deuxième colonne : Distance et Pourcentage -->
      <div class="form-column">
        <div class="form-group">
          <div class="tooltip-container">
            <label for="distance">
              Maximum Interaction Distance (Å)
              <span class="tooltip">Maximum distance (in Angstroms) between residues to consider them in contact</span>
            </label>
          </div>
          <input
            type="number"
            id="distance"
            :value="formParams.distance"
            @input="updateParam('distance', Number($event.target.value))"
            min="2"
            max="10"
            step="0.5"
            class="form-control"
          >
        </div>

        <div class="form-group">
          <div class="tooltip-container">
            <label for="percentage">
              Minimum Interaction Frequency (%)
              <span class="tooltip">Minimum percentage of structures where the interaction is observed</span>
            </label>
          </div>
          <input
            type="number"
            id="percentage"
            :value="formParams.percentage"
            @input="updateParam('percentage', Number($event.target.value))"
            min="0"
            max="100"
            class="form-control"
          >
        </div>
      </div>
    </div>



    <!-- Options de filtrage -->
    <div class="filter-options">
      <div class="polymorphic-filter">
        <div class="checkbox-wrapper">
          <input
            type="checkbox"
            id="showPolymorphicOnly"
            :checked="formParams.showPolymorphicOnly"
            @change="updateParam('showPolymorphicOnly', $event.target.checked)"
            class="filter-checkbox"
          >
          <label for="showPolymorphicOnly">
            Do not show non-polymorphic positions
          </label>
        </div>
        
        <div class="threshold-input" v-if="formParams.showPolymorphicOnly">
          <label for="entropyThreshold" class="threshold-label">Entropy threshold:</label>
          <input
            type="number"
            id="entropyThreshold"
            :value="formParams.entropyThreshold"
            @input="updateParam('entropyThreshold', Number($event.target.value))"
            min="0"
            max="3"
            step="0.1"
            class="threshold-control"
          >
        </div>
      </div>
    </div>

    <!-- Section des allèles optionnels en une ligne -->
    <div class="optional-alleles">
      <div class="alleles-row">
        <label class="optional-label">Compare HLA sequences (optional):</label>
        <div class="alleles-inputs">
          <div class="autocomplete-container">
            <input
              type="text"
              :value="formParams.allele1"
              @input="handleAlleleInput(1, $event.target.value)"
              @focus="showSuggestions = 1"
              @blur="handleBlur"
              class="form-control allele-input"
              :class="{ 'invalid-allele': invalidAlleles.allele1 }"
              placeholder="First allele (e.g., A*02:01)"
            >
            <div v-if="showSuggestions === 1 && filteredAlleles.length > 0" class="suggestions-list">
              <div
                v-for="allele in filteredAlleles"
                :key="allele"
                @mousedown.prevent="selectAllele(1, allele)"
                class="suggestion-item"
                :class="{ 'selected': allele === formParams.allele1 }"
              >
                {{ allele }}
              </div>
            </div>
          </div>

          <div class="autocomplete-container">
            <input
              type="text"
              :value="formParams.allele2"
              @input="handleAlleleInput(2, $event.target.value)"
              @focus="showSuggestions = 2"
              @blur="handleBlur"
              class="form-control allele-input"
              :class="{ 'invalid-allele': invalidAlleles.allele2 }"
              placeholder="Second allele (e.g., A*02:06)"
            >
            <div v-if="showSuggestions === 2 && filteredAlleles.length > 0" class="suggestions-list">
              <div
                v-for="allele in filteredAlleles"
                :key="allele"
                @mousedown.prevent="selectAllele(2, allele)"
                class="suggestion-item"
                :class="{ 'selected': allele === formParams.allele2 }"
              >
                {{ allele }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bouton Batch Analysis flottant -->
    <div class="batch-analysis-floating">
      <!-- Affichage des positions filtré -->
<div v-if="filteredPositions && filteredPositions.length > 0" class="selected-positions-display">
  <span class="positions-label">Filtered positions ({{ filteredPositions.length }}):</span>
  <div class="positions-list">
    <span 
      v-for="(position, index) in filteredPositions" 
      :key="position"
      class="position-chip"
      :class="{ 'selected': selectedPositions.includes(position) }"
      @click="togglePosition(position)"
      :title="`Click to ${selectedPositions.includes(position) ? 'deselect' : 'select'} position ${position}`"
    >
      {{ position }}<span v-if="index < filteredPositions.length - 1"></span>
    </span>
  </div>
</div>
      
      <button
        @click="openBatchAnalysis"
        class="batch-floating-button"
        :disabled="loading"
        title="Run batch analysis with current parameters"
      >
        <svg class="batch-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <path d="M8 12h8"/>
          <path d="M12 8v8"/>
        </svg>
        <span class="batch-text">Batch Analysis</span>
      </button>
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
        interactionType: 'Peptide',
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
    }
  },
  data() {
    return {
      showSuggestions: null,
      currentInput: '',
      allelesList: [],
      isLoadingAlleles: true,
      invalidAlleles: {
        allele1: false,
        allele2: false
      }
    }
  },
  watch: {
    'formParams.locus': {
      immediate: true,
      async handler(newLocus) {
        await this.loadAlleles(newLocus);
      }
    },
    'formParams.allele1'(newValue) {
      this.validateAllele('allele1', newValue);
    },
    'formParams.allele2'(newValue) {
      this.validateAllele('allele2', newValue);
    }
  },
  methods: {
    async loadAlleles(locus) {
      try {
        this.isLoadingAlleles = true;
        const response = await fetch(`/data/alleles${locus}.txt`);
        const text = await response.text();
        this.allelesList = text.split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'));
        
        // Revalider les allèles après chargement de la nouvelle liste
        this.validateAllele('allele1', this.formParams.allele1);
        this.validateAllele('allele2', this.formParams.allele2);
      } catch (error) {
        console.error(`Erreur lors du chargement des allèles ${locus}:`, error);
        this.allelesList = [];
      } finally {
        this.isLoadingAlleles = false;
      }
    },
    validateAllele(alleleField, value) {
      if (!value) {
        this.invalidAlleles[alleleField] = false;
        return;
      }
      this.invalidAlleles[alleleField] = !this.allelesList.includes(value);
    },
        togglePosition(position) {
      // Émettre l'événement vers le parent pour qu'il gère la sélection
      this.$emit('position-clicked', position);
    },
    updateParam(key, value) {
      if (key === 'locus') {
        this.updateParam('allele1', '');
        this.updateParam('allele2', '');
        this.invalidAlleles.allele1 = false;
        this.invalidAlleles.allele2 = false;
      }
      this.$emit('update:formParams', {
        ...this.formParams,
        [key]: value
      });
    },
    handleAlleleInput(inputNumber, value) {
      this.currentInput = value;
      this.showSuggestions = inputNumber;
      this.updateParam(`allele${inputNumber}`, value);
    },
    selectAllele(inputNumber, allele) {
      this.updateParam(`allele${inputNumber}`, allele);
      this.showSuggestions = null;
      this.currentInput = '';
      // La validation se fera automatiquement via le watcher
    },
    handleBlur() {
      setTimeout(() => {
        this.showSuggestions = null;
        this.currentInput = '';
      }, 200);
    },
    openBatchAnalysis() {
      const currentParams = {
        locus: this.formParams.locus,
        distance: this.formParams.distance,
        percentage: this.formParams.percentage,
        interactionType: this.formParams.interactionType
      };
      this.$emit('open-batch-analysis', currentParams);
    }
  },
  computed: {
    filteredAlleles() {
      if (this.isLoadingAlleles) return [];
      if (!this.currentInput) return this.allelesList.slice(0, 10);
      
      const input = this.currentInput.toLowerCase();
      return this.allelesList
        .filter(allele => allele.toLowerCase().includes(input))
        .slice(0, 10);
    }
  }
}
</script>

<style scoped>
@import '../styles/loading.css';
@import '../styles/tooltip.css';

.form-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 15px;
}

.main-form {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.form-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-control {
  padding: 0.35rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}

/* Auto-update indicator */
.auto-update-indicator {
  margin: 1rem 0;
  padding: 0.75rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid #dee2e6;
  border-radius: 6px;
  text-align: center;
}

.indicator-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #495057;
  font-size: 0.85rem;
  font-weight: 500;
}

.auto-icon {
  width: 16px;
  height: 16px;
  animation: gentle-spin 3s linear infinite;
}

@keyframes gentle-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.indicator-text {
  color: #6c757d;
}

.filter-options {
  margin: 1rem 0;
  padding: 0.5rem 0;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
}

.polymorphic-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.threshold-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.threshold-label {
  font-size: 0.9rem;
  white-space: nowrap;
}

.threshold-control {
  width: 60px;
  padding: 0.25rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}

.optional-alleles {
  margin-bottom: 1.5rem;
}

.alleles-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.optional-label {
  white-space: nowrap;
  font-weight: 500;
  font-size: 0.9rem;
}

.alleles-inputs {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.allele-input {
  flex: 1;
}

/* Section Batch Analysis redessinée */
.batch-analysis-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border: 1px solid #d6d9e7;
  border-radius: 8px;
  position: relative;
}

.section-header {
  margin-bottom: 1rem;
  text-align: center;
}

.section-header h4 {
  margin: 0 0 0.5rem 0;
  color: #4c63d2;
  font-size: 1.1rem;
  font-weight: 600;
}

.section-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.4;
}

.batch-analysis-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
}

.batch-analysis-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

.batch-analysis-button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.batch-icon,
.arrow-icon {
  width: 18px;
  height: 18px;
}

.arrow-icon {
  transition: transform 0.2s ease;
}

.batch-analysis-button:hover:not(:disabled) .arrow-icon {
  transform: translateX(2px);
}

label {
  font-weight: 500;
  font-size: 0.9rem;
}

.autocomplete-container {
  position: relative;
  flex: 1;
}

.suggestions-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 180px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 1000;
}

.suggestion-item {
  padding: 6px 10px;
  font-size: 0.85rem;
}

.suggestion-item:hover,
.suggestion-item.selected {
  background-color: #f0f0f0;
}

/* Ajustements pour le responsive */
@media (max-width: 768px) {
  .main-form {
    flex-direction: column;
    gap: 1rem;
  }
  
  .alleles-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .optional-label {
    margin-bottom: 0.5rem;
  }
  
  .polymorphic-filter {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .threshold-input {
    margin-left: 1.5rem;
    margin-top: 0.5rem;
  }
  
  .batch-floating-button {
    position: relative;
    top: 0;
    right: 0;
    margin-top: 1rem;
    width: 100%;
    justify-content: center;
  }
  
  .selected-positions-display {
    margin-right: 0;
    margin-bottom: 0.5rem;
    text-align: center;
  }
}

.invalid-allele {
  border-color: #dc3545;
  box-shadow: 0 0 0 2px #dc3545;
}

.invalid-allele:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}
/* Bouton Batch Analysis flottant */
.batch-analysis-floating {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.selected-positions-display {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid #dee2e6;
  border-radius: 12px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  color: #495057;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  animation: slideInFromRight 0.3s ease-out;
}

.positions-label {
  font-weight: 600;
  color: #6c757d;
  margin-right: 0.5rem;
}

.positions-list {
  font-weight: 500;
  color: #495057;
  font-family: 'Courier New', monospace;
}

.batch-floating-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
}

.batch-floating-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  background: linear-gradient(135deg, #5856eb 0%, #7c3aed 100%);
}

.batch-floating-button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(148, 163, 184, 0.2);
}

.batch-icon {
  width: 16px;
  height: 16px;
}

.batch-text {
  white-space: nowrap;
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Mise à jour des styles responsive */
@media (max-width: 768px) {
  .batch-analysis-floating {
    align-items: center;
  }
  
  .batch-floating-button {
    width: 100%;
    justify-content: center;
  }
  
  .selected-positions-display {
    text-align: center;
    margin-bottom: 0.5rem;
  }
}

.positions-list {
  font-weight: 500;
  color: #495057;
  font-family: 'Courier New', monospace;
  line-height: 1.4;
}

.position-chip {
  display: inline-block;
  padding: 2px 6px;
  margin: 1px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.position-chip:hover {
  background-color: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}

.position-chip.selected {
  background-color: #6366f1;
  color: white;
  border-color: #6366f1;
  font-weight: 600;
}

.position-chip.selected:hover {
  background-color: #5856eb;
  border-color: #5856eb;
}
</style>