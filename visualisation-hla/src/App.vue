<!-- App.vue -->
<template>
  <v-app>
    <v-app-bar 
      color="primary" 
      dark 
      density="comfortable" 
      elevation="2"
      app
    >
      <v-app-bar-title class="header-title">
        <div class="title-main">TCR-Touch</div>
        <div class="title-subtitle">HLA-TCR-Peptide Contact Database</div>
      </v-app-bar-title>
      
      <v-spacer></v-spacer>
      
      <v-tabs 
        v-model="currentView" 
        color="white"
        slider-color="white"
        hide-slider
      >
        <v-tab value="sequence" class="nav-tab">
          <v-icon left small class="mr-2">mdi-dna</v-icon>
          Sequence Analysis
        </v-tab>
        <v-tab value="structures" class="nav-tab">
          <v-icon left small class="mr-2">mdi-molecule</v-icon>
          Structures Database
        </v-tab>
        <v-tab value="statistics" class="nav-tab">
          <v-icon left small class="mr-2">mdi-chart-pie</v-icon>
          Statistics
        </v-tab>
      </v-tabs>
    </v-app-bar>

    <v-main>
      <div class="app-content">
        <HlaSequence 
          v-if="currentView === 'sequence'" 
          @switch-to-batch="switchToBatch"
        />
        <HlaStructuresView v-if="currentView === 'structures'" />
        <StatisticsView v-if="currentView === 'statistics'" />
        <BatchAnalysis 
          v-if="currentView === 'batch'"
          :analysisParams="batchParams"
          @back-to-sequence="currentView = 'sequence'"
        />
      </div>
    </v-main>
  </v-app>
</template>

<script>
import { ref } from 'vue'
import HlaSequence from './components/HlaSequence/HlaSequenceAnalysis.vue'
import HlaStructuresView from './components/HlaStructures/HlaStructuresView.vue'
import StatisticsView from './components/Statistics/StatisticsView.vue'
import BatchAnalysis from './components/HlaSequence/components/BatchAnalysis.vue'

export default {
  name: 'App',
  components: {
    HlaSequence,
    HlaStructuresView,
    StatisticsView,
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
.app-content {
  padding: 1rem;
  max-width: 100%;
}

.header-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
  padding: 8px 0;
}

.title-main {
  font-size: 1.5rem !important;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.title-subtitle {
  font-size: 0.75rem !important;
  font-weight: 400;
  opacity: 0.9;
  margin-top: -2px;
}

.nav-tab {
  font-size: 0.9rem !important;
  text-transform: none !important;
  padding: 0 1rem !important;
  min-width: 160px;
}

.nav-tab .v-icon {
  font-size: 1.1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-content {
    padding: 0.5rem;
  }
  
  .title-main {
    font-size: 1.3rem !important;
  }
  
  .title-subtitle {
    font-size: 0.7rem !important;
  }
  
  .nav-tab {
    min-width: 120px;
    padding: 0 0.5rem !important;
  }
  
  .nav-tab .v-icon {
    display: none !important;
  }
}

@media (max-width: 480px) {
  .title-main {
    font-size: 1.1rem !important;
  }
  
  .title-subtitle {
    font-size: 0.65rem !important;
  }
  
  .nav-tab {
    font-size: 0.8rem !important;
    min-width: 100px;
  }
}
</style>