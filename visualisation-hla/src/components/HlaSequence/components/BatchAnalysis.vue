<template>
    <v-container fluid class="batch-analysis">
      <div class="header-section">
        <h2 class="text-h4 mb-4">Batch Analysis</h2>
        <v-btn @click="$emit('back-to-sequence')" color="primary" variant="outlined">
          <v-icon left>mdi-arrow-left</v-icon>
          Return to Sequence Analysis
        </v-btn>
      </div>
  
      <!-- Layout en colonnes pour optimiser l'espace -->
      <v-row no-gutters class="mb-4">
        <!-- Colonne gauche: Paramètres et positions -->
        <v-col cols="12" lg="6" class="pr-lg-2">
          <!-- Section des paramètres actifs avec badges -->
          <v-card class="mb-4 params-card compact-card" elevation="2">
            <v-card-title class="text-subtitle-1 bg-primary text-white py-2">
              <v-icon left size="small">mdi-cog</v-icon>
              Active Parameters
            </v-card-title>
            <v-card-text class="py-2">
              <div class="param-badges">
                <v-chip color="primary" variant="elevated" size="small" class="mr-1 mb-1">
                  <v-icon left size="x-small">mdi-dna</v-icon>
                  HLA-{{ analysisParams.locus }}
                </v-chip>
                <v-chip color="success" variant="elevated" size="small" class="mr-1 mb-1">
                  <v-icon left size="x-small">mdi-ruler</v-icon>
                  {{ analysisParams.distance }}Å
                </v-chip>
                <v-chip color="info" variant="elevated" size="small" class="mr-1 mb-1">
                  <v-icon left size="x-small">mdi-percent</v-icon>
                  {{ analysisParams.percentage }}%
                </v-chip>
                <v-chip color="secondary" variant="elevated" size="small" class="mr-1 mb-1">
                  <v-icon left size="x-small">mdi-connection</v-icon>
                  {{ analysisParams.interactionType }}
                </v-chip>
                <v-chip color="orange" variant="elevated" size="small" class="mr-1 mb-1">
                  <v-icon left size="x-small">mdi-filter</v-icon>
                  {{ totalPositions }} positions
                </v-chip>
              </div>
            </v-card-text>
          </v-card>

          <!-- Sélecteur de positions interactif -->
          <v-card class="positions-card compact-card" elevation="2">
            <v-card-title class="text-subtitle-1 py-2">
              <v-icon left size="small">mdi-target</v-icon>
              Select Positions
              <v-spacer></v-spacer>
              <v-chip 
                size="x-small" 
                color="primary" 
                variant="outlined"
              >
                {{ selectedPositionsCount }} / {{ totalPositions }}
              </v-chip>
            </v-card-title>
            <v-card-text class="py-2">
              <div class="positions-actions mb-2">
                <v-btn 
                  size="x-small" 
                  color="primary" 
                  variant="outlined" 
                  @click="selectAllPositions"
                  :disabled="selectedPositionsCount === totalPositions"
                >
                  All
                </v-btn>
                <v-btn 
                  size="x-small" 
                  color="secondary" 
                  variant="outlined" 
                  @click="clearAllPositions"
                  :disabled="selectedPositionsCount === 0"
                  class="ml-1"
                >
                  Clear
                </v-btn>
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
                Select at least one position
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
        
        <!-- Colonne droite: Saisie HLA -->
        <v-col cols="12" lg="6" class="pl-lg-2">
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
                rows="4"
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
        </v-col>
      </v-row>
    </v-container>
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
        selectedPositions: [],
        isAnalyzing: false,
        showInstructions: false
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
      // Par défaut, sélectionner toutes les positions disponibles
      this.selectedPositions = [...this.availablePositions];
    },
    methods: {
      togglePosition(position) {
        const index = this.selectedPositions.indexOf(position);
        if (index !== -1) {
          this.selectedPositions.splice(index, 1);
        } else {
          this.selectedPositions.push(position);
        }
      },
      selectAllPositions() {
        this.selectedPositions = [...this.availablePositions];
      },
      clearAllPositions() {
        this.selectedPositions = [];
      },
      loadExamplePairs() {
        // Définir des exemples selon le locus
        const examples = {
          A: [
            'A*02:01 A*02:06',
            'A*01:01 A*03:01',
            'A*02:01 A*11:01',
            'A*24:02 A*32:01',
            'A*01:01 A*02:01'
          ],
          B: [
            'B*07:02 B*08:01',
            'B*27:05 B*44:02',
            'B*15:01 B*35:01',
            'B*13:02 B*40:01',
            'B*07:02 B*27:05'
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

          const csvContent = await BatchProcessor.processBatch(
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

          if (!csvContent) {
            console.error('No CSV content generated');
            return;
          }

          // Create and trigger download of CSV file
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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