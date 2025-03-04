<template>
    <div class="batch-analysis">
      <div class="header-section">
        <h2>Batch Analysis</h2>
        <button @click="$emit('back-to-sequence')" class="back-button">
          Return to Sequence Analysis
        </button>
      </div>
  
      <div class="collapsible-section">
        <div class="collapsible-header" @click="toggleParams">
          <h3>Selected Parameters</h3>
          <span class="toggle-icon">{{ isParamsOpen ? '▼' : '▶' }}</span>
        </div>
        <div class="collapsible-content" v-show="isParamsOpen">
          <div class="params-summary">
            <p>Locus: {{ analysisParams.locus }}</p>
            <p>Distance: {{ analysisParams.distance }}Å</p>
            <p>Percentage: {{ analysisParams.percentage }}%</p>
            <p>Interaction Type: {{ analysisParams.interactionType }}</p>
            <div class="positions-summary">
              <h4>Selected Positions:</h4>
              <p>{{ selectedPositionsText }}</p>
            </div>
          </div>
        </div>
      </div>
  
      <div class="input-section">
        <div class="collapsible-header" @click="toggleInstructions">
          <h3>Check Instructions</h3>
          <span class="toggle-icon">{{ isInstructionsOpen ? '▼' : '▶' }}</span>
        </div>
        <div class="collapsible-content" v-show="isInstructionsOpen">
          <p class="input-instructions">
            Enter one HLA pair per line, separated by a space, comma (,), or semicolon (;).
            <br>
            Example format:
            <br>
            A*02:01 A*02:06
            <br>
            A*01:01,A*03:01
            <br>
            A*02:01;A*11:01
          </p>
        </div>
  
        <textarea
          v-model="hlaInput"
          class="hla-input"
          placeholder="Enter your HLA pairs here..."
          rows="10"
        ></textarea>
        <div class="input-stats">
          <span>{{ pairCount }} pairs entered</span>
          <span v-if="invalidPairs.length > 0" class="error-text">
            {{ invalidPairs.length }} invalid pairs found
          </span>
        </div>
        <button 
          @click="analyzePairs"
          class="analyze-button"
          :disabled="pairCount === 0 || invalidPairs.length > 0"
        >
          Analyze {{ pairCount }} Pairs
        </button>
      </div>
    </div>
  </template>
  
  <script>
import { BatchProcessor } from '@/services/batchProcessor';

  export default {
    name: 'BatchAnalysis',
    props: {
      analysisParams: {
        type: Object,
        required: true
      }
    },
    emits: ['back-to-sequence'],
    data() {
      return {
        hlaInput: '',
        invalidPairs: [],
        isParamsOpen: false,
        isInstructionsOpen: false
      }
    },
    computed: {
      selectedPositionsText() {
        return this.analysisParams.positions ? 
          Object.keys(this.analysisParams.positions).join(', ') : 
          'No positions selected';
      },
      hlaPairs() {
        return this.hlaInput
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      },
      pairCount() {
        return this.hlaPairs.length;
      }
    },
    methods: {
      toggleParams() {
        this.isParamsOpen = !this.isParamsOpen;
      },
      toggleInstructions() {
        this.isInstructionsOpen = !this.isInstructionsOpen;
      },
      validatePair(pair) {
  // Split using any combination of spaces, commas, semicolons, or tabs
  const parts = pair.split(/[\s,;\t]+/).filter(part => part.length > 0);
  if (parts.length !== 2) return false;
  
  // Updated regex to allow for variable number of digits after the colon
  const hlaFormat = new RegExp(`^${this.analysisParams.locus}\\*\\d{2}:\\d{1,}$`);
  return parts.every(part => hlaFormat.test(part.trim()));
},
      async analyzePairs() {
  const validPairs = this.hlaPairs
    .filter(pair => this.validatePair(pair))
    .map(pair => pair.split(/[\s,;]+/).filter(part => part.length > 0));

  try {
    const csvContent = await BatchProcessor.processBatch(
      validPairs,
      this.analysisParams.aCsv,
      this.analysisParams.bCsv,
      this.analysisParams.positions,
      {
        locus: this.analysisParams.locus,
        distance: this.analysisParams.distance,
        percentage: this.analysisParams.percentage,
        interactionType: this.analysisParams.interactionType
      }
    );

    if (!csvContent) {
      console.error('No CSV content generated');
      return;
    }

    // Create and trigger download of CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'hla_divergence_analysis.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error processing pairs:', error);
  }
}
    },
    watch: {
      hlaInput: {
        handler() {
          this.invalidPairs = this.hlaPairs
            .filter(pair => !this.validatePair(pair));
        }
      }
    }
  }
  </script>
  
  <style scoped>
  .batch-analysis {
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  }
  
  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    position: sticky;
    top: 0;
    background-color: white;
    padding: 10px 0;
    z-index: 10;
  }
  
  .collapsible-section {
    margin: 20px 0;
  }
  
  .collapsible-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background-color: #f5f5f5;
    cursor: pointer;
    border-radius: 4px;
  }
  
  .collapsible-header:hover {
    background-color: #e9ecef;
  }
  
  .toggle-icon {
    font-size: 12px;
  }
  
  .collapsible-content {
    padding: 15px;
    border: 1px solid #f5f5f5;
    border-top: none;
    border-radius: 0 0 4px 4px;
  }
  
  .params-summary {
    margin: 10px 0;
  }
  
  .input-section {
    margin: 20px 0;
  }
  
  .input-instructions {
    margin: 10px 0;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 4px;
    font-size: 0.9em;
    line-height: 1.6;
  }
  
  .hla-input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
    margin: 10px 0;
  }
  
  .input-stats {
    display: flex;
    justify-content: space-between;
    margin: 10px 0;
    font-size: 0.9em;
  }
  
  .error-text {
    color: #dc3545;
  }
  
  .analyze-button {
    padding: 10px 20px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin: 10px 0;
  }
  
  .analyze-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  
  .analyze-button:hover:not(:disabled) {
    background-color: #218838;
  }
  
  .back-button {
    padding: 8px 16px;
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .back-button:hover {
    background-color: #357abd;
  }
  </style>