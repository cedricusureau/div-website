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

    <!-- Section des allèles optionnels en une ligne -->
    <!-- Section des allèles avec auto-complétion -->
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

    <!-- Bouton analyse -->
    <div class="button-wrapper">
      <button
        @click="$emit('analyze')"
        class="submit-button"
        :disabled="loading"
      >
        Analyze Interactions
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
        allele2: ''
      })
    },
    loading: {
      type: Boolean,
      default: false
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
  font-size: 0.9rem; /* Ajouté */
}

.alleles-inputs {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.allele-input {
  flex: 1;
}

.button-wrapper {
  display: flex;
  justify-content: center;
}

.submit-button {
  padding: 0.75rem 2rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

label {
  font-weight: 500;
  font-size: 0.9rem; /* Ajouté */
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
  padding: 6px 10px;  /* Réduit de 8px 12px */
  font-size: 0.85rem; /* Réduit de 0.9rem */
}

.suggestion-item:hover,
.suggestion-item.selected {
  background-color: #f0f0f0;
}

.alleles-inputs {
  display: flex;
  gap: 1rem;
  flex: 1;
}

/* Ajustements pour le responsive */
@media (max-width: 768px) {
  .alleles-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .optional-label {
    margin-bottom: 0.5rem;
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
</style>