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
          <v-icon left small class="mr-2">mdi-calculator-variant</v-icon>
          Divergence Calculation
        </v-tab>
        <v-tab value="structures" class="nav-tab">
          <v-icon left small class="mr-2">mdi-molecule</v-icon>
          Structures Database
        </v-tab>
        <v-tab value="statistics" class="nav-tab">
          <v-icon left small class="mr-2">mdi-chart-pie</v-icon>
          Statistics
        </v-tab>
        <v-tab value="tutorial" class="nav-tab">
          <v-icon left small class="mr-2">mdi-school</v-icon>
          Tutorial
        </v-tab>
      </v-tabs>
    </v-app-bar>

    <v-main>
      <main class="app-content" role="main">
        <h1 class="sr-only">TCR-Touch: HLA-TCR-Peptide Contact Database and Analysis Tool</h1>

        <section v-if="currentView === 'sequence'" aria-label="Divergence Calculation">
          <HlaSequence @switch-to-batch="switchToBatch" />
        </section>

        <section v-if="currentView === 'structures'" aria-label="Structures Database">
          <HlaStructuresView @open-3d-viewer="switchToStructureViewer" />
        </section>

        <section v-if="currentView === 'statistics'" aria-label="Statistics">
          <StatisticsView />
        </section>

        <section v-if="currentView === 'tutorial'" aria-label="Tutorial">
          <TutorialView />
        </section>

        <section v-if="currentView === 'batch'" aria-label="Batch Analysis">
          <BatchAnalysis
            :analysisParams="batchParams"
            @back-to-sequence="currentView = 'sequence'"
          />
        </section>

        <section v-if="currentView === 'structureViewer'" aria-label="3D Structure Viewer">
          <StructureViewerPage
            :viewerParams="structureViewerParams"
            @back-to-analysis="currentView = 'sequence'"
          />
        </section>
      </main>
    </v-main>
  </v-app>
</template>

<script>
import { ref, onMounted } from 'vue'
import HlaSequence from './components/HlaSequence/HlaSequenceAnalysis.vue'
import HlaStructuresView from './components/HlaStructures/HlaStructuresView.vue'
import StatisticsView from './components/Statistics/StatisticsView.vue'
import TutorialView from './components/Tutorial/TutorialView.vue'
import BatchAnalysis from './components/HlaSequence/components/BatchAnalysis.vue'
import StructureViewerPage from './components/StructureViewer/StructureViewerPage.vue'

export default {
  name: 'App',
  components: {
    HlaSequence,
    HlaStructuresView,
    StatisticsView,
    TutorialView,
    BatchAnalysis,
    StructureViewerPage
  },
  setup() {
  const currentView = ref('sequence');
  const batchParams = ref(null);
  const structureViewerParams = ref(null);
  
  const switchToBatch = (data) => {
    batchParams.value = {...data};  // Make a shallow copy
    currentView.value = 'batch';
  };

  const switchToStructureViewer = (data) => {
    structureViewerParams.value = {...data};  // Make a shallow copy
    currentView.value = 'structureViewer';
  };

  // Fonction pour vérifier et traiter les paramètres URL
  const checkUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('openTutorial') === 'true') {
      currentView.value = 'tutorial';
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('view') === 'structureViewer') {
      currentView.value = 'structureViewer';
      // Passer les paramètres au visualiseur
      structureViewerParams.value = {
        locus: urlParams.get('locus') || 'A',
        positions: urlParams.get('positions') ? urlParams.get('positions').split(',') : [],
        distance: urlParams.get('distance') || '3',
        percentage: urlParams.get('percentage') || '50',
        interactionType: urlParams.get('interactionType') || 'Peptide or TCR',
        allele1: urlParams.get('allele1') || '',
        allele2: urlParams.get('allele2') || '',
        showPolymorphicOnly: urlParams.get('showPolymorphicOnly') === 'true',
        entropyThreshold: urlParams.get('entropyThreshold') || '0.2'
      };
    }
  };

  // Vérifier les paramètres URL au montage
  onMounted(() => {
    // Petit délai pour s'assurer que tout est bien chargé
    setTimeout(() => {
      checkUrlParams();
    }, 100);
  });

  // Vérifier aussi immédiatement (au cas où)
  checkUrlParams();

  return {
    currentView,
    batchParams,
    structureViewerParams,
    switchToBatch,
    switchToStructureViewer
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

/* Screen reader only class for accessibility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Animation subtile au hover */
button:hover,
a:hover,
.v-btn:hover,
.v-tab:hover {
  transition: transform 0.1s ease;
  transform: scale(1.02);
}
</style>