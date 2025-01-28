<!-- App.vue -->
<template>
  <v-app>
    <div id="app">
      <h1>HLA-TCR Structures Database</h1>
   
      <!-- Boutons de navigation simple -->
      <div class="nav-buttons">
        <button
          @click="currentView = 'sequence'"
          :class="{ active: currentView === 'sequence' }"
        >
          Sequence Analysis
        </button>
        <button
          @click="currentView = 'structures'"
          :class="{ active: currentView === 'structures' }"
        >
          Structures Database
        </button>
      </div>
      <!-- Composants -->
      <div class="component-container">
        <HlaSequence 
          v-if="currentView === 'sequence'" 
          @switch-to-batch="switchToBatch"
        />
        <HlaStructuresView v-if="currentView === 'structures'" />
        <BatchAnalysis 
          v-if="currentView === 'batch'"
          :analysisParams="batchParams"
          @back-to-sequence="currentView = 'sequence'"
        />
      </div>
    </div>
  </v-app>
</template>

<script>
import { ref } from 'vue'
import HlaSequence from './components/HlaSequence/HlaSequenceAnalysis.vue'
import HlaStructuresView from './components/HlaStructures/HlaStructuresView.vue'
import BatchAnalysis from './components/HlaSequence/components/BatchAnalysis.vue'

export default {
  name: 'App',
  components: {
    HlaSequence,
    HlaStructuresView,
    BatchAnalysis
  },
  setup() {
  const currentView = ref('sequence');
  const batchParams = ref(null);
  
  const switchToBatch = (data) => {
    batchParams.value = {...data};  // Make a shallow copy
    currentView.value = 'batch';
  };

  return {
    currentView,
    batchParams,
    switchToBatch
  };
}
}
</script>

<style>
.nav-buttons {
  margin: 1rem 0;
  display: flex;
  gap: 1rem;
}

.nav-buttons button {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  background-color: white;
}

.nav-buttons button.active {
  background-color: #4a90e2;
  color: white;
}

.component-container {
  margin-top: 1rem;
}
</style>