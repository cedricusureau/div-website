# src/components/HlaSequence/components/HlaAnalysisForm.vue
<template>
  <div class="form-container">
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

    <button
      @click="$emit('analyze')"
      class="submit-button"
      :disabled="loading"
    >
      Analyze Interactions
    </button>
  </div>
</template>

<script>
export default {
  name: 'HlaAnalysisForm',
  props: {
    formParams: {
      type: Object,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['analyze', 'update:formParams'],
  methods: {
    updateParam(key, value) {
      this.$emit('update:formParams', {
        ...this.formParams,
        [key]: value
      });
    }
  }
}
</script>

<style scoped>
@import '../styles/loading.css';
@import '../styles/form.css';
@import '../styles/tooltip.css';
</style>