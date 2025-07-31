<template>
    <v-container fluid class="batch-analysis">
      <div class="header-section d-flex align-center justify-space-between mb-4">
        <h2 class="text-h4 mb-0">Batch Analysis</h2>
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
          Learn about batch analysis
        </v-tooltip>
      </div>
  
      <!-- Sélection des positions en menu déroulant compact -->
      <v-expansion-panels variant="accordion" class="mb-3">
        <v-expansion-panel>
          <v-expansion-panel-title class="py-2">
            <v-icon class="mr-2" size="small">mdi-target</v-icon>
            <span class="text-body-2">Select positions used for batch divergence calculation</span>
            <v-spacer></v-spacer>
            <v-chip size="x-small" color="primary" variant="outlined" class="mr-2">
              {{ selectedPositionsCount }} / {{ totalPositions }} selected
            </v-chip>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="positions-actions mb-2">
              <v-btn 
                size="x-small" 
                color="primary" 
                variant="outlined" 
                @click="selectAllPositions"
                :disabled="selectedPositionsCount === totalPositions"
              >
                Select All
              </v-btn>
              <v-btn 
                size="x-small" 
                color="secondary" 
                variant="outlined" 
                @click="clearAllPositions"
                :disabled="selectedPositionsCount === 0"
                class="ml-2"
              >
                Clear All
              </v-btn>
              <span class="text-caption ml-4 text-grey">
                Uncheck positions to exclude them from divergence calculations
              </span>
            </div>
            
            <div class="positions-chips">
              <v-chip
                v-for="position in availablePositions"
                :key="position"
                :color="selectedPositions.includes(position) ? 'primary' : 'default'"
                :variant="selectedPositions.includes(position) ? 'elevated' : 'outlined'"
                size="x-small"
                class="ma-1 position-chip"
                @click="togglePosition(position)"
                clickable
              >
                {{ position }}
              </v-chip>
            </div>
            
            <v-alert 
              v-if="selectedPositionsCount === 0"
              type="warning" 
              variant="tonal" 
              density="compact"
              class="mt-2"
            >
              Select at least one position for analysis
            </v-alert>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Section HLA Pairs Input - pleine largeur -->
          <!-- Section de saisie des paires HLA -->
          <v-card class="compact-card" elevation="2">
            <v-card-title class="text-subtitle-1 py-2">
              <v-icon left size="small">mdi-format-list-bulleted</v-icon>
              HLA Pairs Input
              <v-spacer></v-spacer>
              <div class="header-actions">
                <v-btn
                  @click="loadExamplePairs"
                  size="x-small"
                  color="secondary"
                  variant="outlined"
                  class="mr-1"
                >
                  <v-icon left size="x-small">mdi-test-tube</v-icon>
                  Examples
                </v-btn>
                <v-btn
                  size="x-small"
                  color="info"
                  variant="text"
                  @click="showInstructions = !showInstructions"
                >
                  <v-icon size="x-small">{{ showInstructions ? 'mdi-help-circle' : 'mdi-help-circle-outline' }}</v-icon>
                </v-btn>
              </div>
            </v-card-title>

        <v-slide-y-transition>
          <v-alert 
            v-if="showInstructions"
            type="info" 
            variant="tonal" 
            density="compact"
            class="mx-4 mb-3"
          >
            <strong>Format:</strong> One pair per line: {{ analysisParams.locus }}*02:01 {{ analysisParams.locus }}*02:06 (space, comma, or semicolon)
          </v-alert>
        </v-slide-y-transition>

            <v-card-text class="py-2">
              <v-textarea
                v-model="hlaInput"
                label="HLA Pairs"
                placeholder="Enter your HLA pairs here..."
                rows="8"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-2"
              />
          
              <!-- Stats et bouton d'analyse compacts -->
              <div class="analysis-section">
                <div class="stats-chips">
                  <v-chip 
                    size="x-small"
                    color="primary" 
                    variant="outlined"
                    class="mr-1"
                  >
                    <v-icon left size="x-small">mdi-format-list-numbered</v-icon>
                    {{ pairCount }} pairs
                  </v-chip>
                  <v-chip 
                    v-if="invalidPairs.length > 0"
                    size="x-small"
                    color="error" 
                    variant="outlined"
                  >
                    <v-icon left size="x-small">mdi-alert</v-icon>
                    {{ invalidPairs.length }} invalid
                  </v-chip>
                </div>
                
                <v-btn 
                  @click="analyzePairs"
                  color="success"
                  variant="elevated"
                  size="small"
                  :disabled="pairCount === 0 || invalidPairs.length > 0 || selectedPositionsCount === 0"
                  :loading="isAnalyzing"
                  class="analyze-btn"
                >
                  <v-icon left size="small">mdi-play</v-icon>
                  Analyze {{ pairCount }} Pairs
                </v-btn>
              </div>
            </v-card-text>
          </v-card>

      <!-- Scatter Plot Visualization -->
      <ScatterPlot 
        v-if="visualizationData.length > 0"
        :visualization-data="visualizationData"
      />
    </v-container>
  </template>
  
  <script>
import { BatchProcessor } from '@/services/batchProcessor';
import ScatterPlot from './ScatterPlot.vue';

  export default {
    name: 'BatchAnalysis',
    components: {
      ScatterPlot
    },
    props: {
      analysisParams: {
        type: Object,
        required: true
      },
      initialSelectedPositions: {
        type: Array,
        default: () => []
      }
    },
    data() {
      return {
        hlaInput: '',
        invalidPairs: [],
        selectedPositions: [],
        isAnalyzing: false,
        showInstructions: false,
        visualizationData: []
      }
    },
    computed: {
      availablePositions() {
        return this.analysisParams.positions ? 
          Object.keys(this.analysisParams.positions).sort((a, b) => Number(a) - Number(b)) : 
          [];
      },
      totalPositions() {
        return this.availablePositions.length;
      },
      selectedPositionsCount() {
        return this.selectedPositions.length;
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
    mounted() {
      // Utiliser les positions sélectionnées du parent, ou toutes par défaut
      if (this.initialSelectedPositions.length > 0) {
        this.selectedPositions = [...this.initialSelectedPositions];
      } else {
        this.selectedPositions = [...this.availablePositions];
      }
    },
    methods: {
      openTutorial() {
        localStorage.setItem('tutorialSection', 'section-csv-results');
        window.open(window.location.origin + '?openTutorial=true', '_blank');
      },
      togglePosition(position) {
        const index = this.selectedPositions.indexOf(position);
        if (index !== -1) {
          this.selectedPositions.splice(index, 1);
        } else {
          this.selectedPositions.push(position);
        }
        // Émettre vers le parent
        this.$emit('positions-selected', [...this.selectedPositions]);
      },
      selectAllPositions() {
        this.selectedPositions = [...this.availablePositions];
        this.$emit('positions-selected', [...this.selectedPositions]);
      },
      clearAllPositions() {
        this.selectedPositions = [];
        this.$emit('positions-selected', [...this.selectedPositions]);
      },
      loadExamplePairs() {
        // Définir des exemples selon le locus
        const examples = {
          A: [
            'A*02:01 A*02:06',
            'A*01:01 A*03:01',
            'A*02:01 A*11:01',
            'A*24:02 A*32:01',
            'A*01:01 A*02:01',
            'A*03:01 A*24:02',
            'A*11:01 A*32:01',
            'A*02:06 A*03:01',
            'A*68:01 A*68:02',
            'A*32:01 A*01:01'
          ],
          B: [
            'B*07:02 B*08:01',
            'B*27:05 B*44:02',
            'B*15:01 B*35:01',
            'B*13:02 B*40:01',
            'B*07:02 B*27:05',
            'B*08:01 B*15:01',
            'B*44:02 B*13:02',
            'B*35:01 B*07:02',
            'B*40:01 B*27:05',
            'B*15:01 B*44:02'
          ]
        };
        
        const locusPairs = examples[this.analysisParams.locus] || examples.A;
        this.hlaInput = locusPairs.join('\n');
        this.showInstructions = false;
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

        this.isAnalyzing = true;

        try {
          // Créer un objet positions filtré avec seulement les positions sélectionnées
          const selectedPositionsObject = this.selectedPositions.reduce((obj, pos) => {
            if (this.analysisParams.positions[pos]) {
              obj[pos] = this.analysisParams.positions[pos];
            }
            return obj;
          }, {});

          const result = await BatchProcessor.processBatchWithVisualization(
            validPairs,
            this.analysisParams.aCsv,
            this.analysisParams.bCsv,
            selectedPositionsObject,
            {
              locus: this.analysisParams.locus,
              distance: this.analysisParams.distance,
              percentage: this.analysisParams.percentage,
              interactionType: this.analysisParams.interactionType
            }
          );

          if (!result || !result.csvContent) {
            console.error('No CSV content generated');
            return;
          }

          // Store visualization data
          this.visualizationData = result.visualizationData || [];

          // Create and trigger download of CSV file
          const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.setAttribute('download', `hla_batch_analysis_${this.selectedPositions.length}pos_${Date.now()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (error) {
          console.error('Error processing pairs:', error);
        } finally {
          this.isAnalyzing = false;
        }
      }
    },
    watch: {
      initialSelectedPositions: {
        immediate: true,
        handler(newSelectedPositions) {
          if (newSelectedPositions && newSelectedPositions.length > 0) {
            this.selectedPositions = [...newSelectedPositions];
          }
        }
      },
      availablePositions: {
        immediate: true,
        handler(newPositions) {
          // Mettre à jour les positions sélectionnées si les disponibles changent
          this.selectedPositions = newPositions.filter(pos => 
            this.selectedPositions.includes(pos)
          );
          // Si aucune position sélectionnée, sélectionner toutes par défaut
          if (this.selectedPositions.length === 0 && newPositions.length > 0) {
            this.selectedPositions = [...newPositions];
          }
        }
      },
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
    max-width: 1200px;
    margin: 0 auto;
    padding: 0.5rem;
    min-height: calc(100vh - 120px);
  }
  
  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .params-card {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  }

  .params-card .v-card-title {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  }

  .param-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .filter-impact {
    border-left: 4px solid #2196F3;
  }

  .positions-card {
    border-left: 4px solid #4CAF50;
  }

  .positions-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    max-height: 140px;
    overflow-y: auto;
    padding: 0.5rem;
    background-color: #fafafa;
    border-radius: 8px;
  }

  .position-chip {
    cursor: pointer !important;
    transition: all 0.2s ease;
    font-family: 'Courier New', monospace;
    font-weight: 500;
  }

  .position-chip:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .positions-actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .analysis-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .stats-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .analyze-btn {
    white-space: nowrap;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .batch-analysis {
      padding: 0.5rem;
    }
    
    .header-section {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
    
    .param-badges {
      justify-content: center;
    }
    
    .positions-chips {
      max-height: 150px;
    }
    
    .analysis-section {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
    }
    
    .stats-chips {
      justify-content: center;
    }
    
    .analyze-btn {
      width: 100%;
    }
    
    .header-actions {
      flex-direction: row;
      justify-content: flex-end;
    }
  }

  @media (max-width: 480px) {
    .batch-analysis {
      padding: 0.25rem;
    }
    
    .param-badges .v-chip {
      font-size: 0.7rem !important;
      height: 24px !important;
    }
    
    .positions-chips {
      max-height: 120px;
      padding: 0.25rem;
    }
    
    .position-chip {
      font-size: 0.7rem !important;
      height: 20px !important;
      min-width: auto !important;
    }
    
    .header-actions .v-btn {
      min-width: auto !important;
      padding: 0 8px !important;
    }
    
    .stats-chips .v-chip {
      font-size: 0.7rem !important;
      height: 22px !important;
    }
  }

  /* Animation pour les chips de position */
  .position-chip {
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  </style>