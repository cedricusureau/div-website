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
      <div class="app-content">
        <HlaSequence 
          v-if="currentView === 'sequence'" 
          @switch-to-batch="switchToBatch"
        />
        <HlaStructuresView v-if="currentView === 'structures'" />
        <StatisticsView v-if="currentView === 'statistics'" />
        <TutorialView v-if="currentView === 'tutorial'" />
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
import TutorialView from './components/Tutorial/TutorialView.vue'
import BatchAnalysis from './components/HlaSequence/components/BatchAnalysis.vue'

export default {
  name: 'App',
  components: {
    HlaSequence,
    HlaStructuresView,
    StatisticsView,
    TutorialView,
    BatchAnalysis
  },
  setup() {
  const currentView = ref('sequence');
  const batchParams = ref(null);
  
  const switchToBatch = (data) => {
    batchParams.value = {...data};  // Make a shallow copy
    currentView.value = 'batch';
  };

  // Vérifier si on doit ouvrir le tutoriel automatiquement
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('openTutorial') === 'true') {
    currentView.value = 'tutorial';
    // Nettoyer l'URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

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

/* ========== CURSEURS PERSONNALISÉS ANTICORPS ========== */

/* Curseur anticorps par défaut sur toute l'application */
* {
  cursor: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fcGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%232d5aa0;stop-opacity:1" /><stop offset="100%" style="stop-color:%231e3f73;stop-opacity:1" /></linearGradient><linearGradient id="fabGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%236fa8f5;stop-opacity:1" /><stop offset="100%" style="stop-color:%234a90e2;stop-opacity:1" /></linearGradient></defs><g transform="rotate(-15 12 12)"><rect x="10.25" y="8" width="3.5" height="14" rx="1.75" fill="url(%23fcGradient)"/><path d="M12 8 L6 2" stroke="url(%23fabGradient)" stroke-width="2.5" stroke-linecap="round"/><path d="M12 8 L18 2" stroke="url(%23fabGradient)" stroke-width="2.5" stroke-linecap="round"/><circle cx="6" cy="2" r="1.8" fill="url(%23fabGradient)"/><circle cx="18" cy="2" r="1.8" fill="url(%23fabGradient)"/><circle cx="12" cy="8" r="1.3" fill="url(%23fcGradient)"/></g></svg>') 12 12, auto !important;
}

/* Curseur anticorps interactif pour les éléments cliquables */
button, 
a, 
.v-btn, 
.v-tab, 
.clickable,
[role="button"],
.position-point,
.position-chip,
.tab-button,
.v-icon {
  cursor: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fcActive" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%232d5aa0;stop-opacity:1" /><stop offset="100%" style="stop-color:%231e3f73;stop-opacity:1" /></linearGradient><linearGradient id="fabActive" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ff4757;stop-opacity:1" /><stop offset="100%" style="stop-color:%23c44569;stop-opacity:1" /></linearGradient><filter id="bindingGlow"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g transform="rotate(-15 12 12)"><rect x="10.25" y="8" width="3.5" height="14" rx="1.75" fill="url(%23fcActive)"/><path d="M12 8 L6 2" stroke="url(%23fabActive)" stroke-width="2.8" stroke-linecap="round" filter="url(%23bindingGlow)"/><path d="M12 8 L18 2" stroke="url(%23fabActive)" stroke-width="2.8" stroke-linecap="round" filter="url(%23bindingGlow)"/><circle cx="6" cy="2" r="2" fill="url(%23fabActive)" filter="url(%23bindingGlow)"/><circle cx="18" cy="2" r="2" fill="url(%23fabActive)" filter="url(%23bindingGlow)"/><circle cx="12" cy="8" r="1.3" fill="url(%23fcActive)"/></g></svg>') 12 12, pointer !important;
}

/* Conserver les curseurs appropriés pour l'UX */
input, 
textarea, 
.v-text-field input, 
.v-textarea textarea,
[contenteditable="true"] {
  cursor: text !important;
}

/* Curseur de redimensionnement pour les éléments appropriés */
.v-resizer {
  cursor: col-resize !important;
}

/* Curseur de déplacement pour les éléments draggables */
[draggable="true"] {
  cursor: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fcDrag" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%232d5aa0;stop-opacity:1" /><stop offset="100%" style="stop-color:%231e3f73;stop-opacity:1" /></linearGradient><linearGradient id="fabDrag" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ff4757;stop-opacity:1" /><stop offset="100%" style="stop-color:%23c44569;stop-opacity:1" /></linearGradient></defs><g transform="rotate(-15 12 12)"><rect x="10.25" y="8" width="3.5" height="14" rx="1.75" fill="url(%23fcDrag)"/><path d="M12 8 L6 2" stroke="url(%23fabDrag)" stroke-width="2.8" stroke-linecap="round"/><path d="M12 8 L18 2" stroke="url(%23fabDrag)" stroke-width="2.8" stroke-linecap="round"/><circle cx="6" cy="2" r="2" fill="url(%23fabDrag)"/><circle cx="18" cy="2" r="2" fill="url(%23fabDrag)"/><circle cx="12" cy="8" r="1.3" fill="url(%23fcDrag)"/></g></svg>') 12 12, move !important;
}

/* Curseur par défaut pour les éléments non-interactifs spécifiques */
.v-card-text,
.v-list-item-content,
p, span, div.text {
  cursor: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fcText" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%232d5aa0;stop-opacity:1" /><stop offset="100%" style="stop-color:%231e3f73;stop-opacity:1" /></linearGradient><linearGradient id="fabText" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%236fa8f5;stop-opacity:1" /><stop offset="100%" style="stop-color:%234a90e2;stop-opacity:1" /></linearGradient></defs><g transform="rotate(-15 12 12)"><rect x="10.25" y="8" width="3.5" height="14" rx="1.75" fill="url(%23fcText)"/><path d="M12 8 L6 2" stroke="url(%23fabText)" stroke-width="2.5" stroke-linecap="round"/><path d="M12 8 L18 2" stroke="url(%23fabText)" stroke-width="2.5" stroke-linecap="round"/><circle cx="6" cy="2" r="1.8" fill="url(%23fabText)"/><circle cx="18" cy="2" r="1.8" fill="url(%23fabText)"/><circle cx="12" cy="8" r="1.3" fill="url(%23fcText)"/></g></svg>') 12 12, auto !important;
}

/* Animation subtile au hover pour renforcer l'effet */
button:hover, 
a:hover, 
.v-btn:hover, 
.v-tab:hover {
  transition: transform 0.1s ease;
  transform: scale(1.02);
}
</style>