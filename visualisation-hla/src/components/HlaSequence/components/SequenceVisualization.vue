<template>
  <div class="visualization">
    <!-- Frise de visualisation de séquence et divergence -->
    <div class="visualization-section">
    <div class="legend-container">
      <div class="legend">
        <div v-for="(color, type) in colorMap" :key="type" class="legend-item">
          <span class="legend-dot" :style="{ backgroundColor: color }"></span>
          <span class="legend-text">{{ type }}</span>
        </div>
        <div v-if="alleleSpecificPositionsResult?.mismatches?.length" class="legend-item">
          <svg width="20" height="8">
            <line x1="0" y1="4" x2="15" y2="4" stroke="#D85A5A" stroke-width="1" marker-end="url(#legendArrow)" />
          </svg>
          <span class="legend-text">Mismatch</span>
        </div>
      </div>
    </div>
   
    <svg class="sequence-svg"
      viewBox="0 0 800 120"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- Ligne principale -->
      <line
        x1="50"
        y1="80"
        x2="750"
        y2="80"
        stroke="black"
        stroke-width="1"
      />

      <!-- Graduations tous les 20 -->
      <template v-for="i in 9" :key="i">
        <line
          :x1="50 + (i * 20 * 700/180)"
          y1="75"
          :x2="50 + (i * 20 * 700/180)"
          y2="85"
          stroke="#666666"
          stroke-width="0.5"
        />
        <text
          :x="50 + (i * 20 * 700/180)"
          y="98"
          text-anchor="middle"
          font-size="10"
          fill="#666666"
        >
          {{ i * 20 }}
        </text>
      </template>

      <!-- Points des positions trouvées avec hover -->
        <g v-for="(type, position) in positions" :key="position">
          <circle
  :cx="50 + (position * 700/180)"
  cy="80"
  :r="selectedPositions.includes(position) ? 6 : 4"  
  :fill="getColorForType(type)"
  :stroke="selectedPositions.includes(position) ? '#333' : 'none'" 
  stroke-width="2"
  @mouseover="showTooltip(position, type)"
  @mouseout="hideTooltip"
  @click="handleClick(position)"
  class="position-point"
/>
        <text
          v-if="hoveredPosition === position"
          :x="50 + (position * 700/180)"
          y="115"
          text-anchor="middle"
          font-size="10"
          fill="#333"
        >
          {{ position }}
        </text>
      </g>

<!-- Flèches pour les mismatches -->
<template v-if="alleleSpecificPositionsResult?.mismatches">
  <g v-for="mismatch in alleleSpecificPositionsResult.mismatches" :key="'mismatch-'+mismatch.position">
    <g class="arrow-group">
      <!-- Zone de hit qui suit la flèche -->
      <path
        :d="getArrowHitPath(mismatch.position, mismatch.granthamScore)"
        fill="transparent"
        @mouseover="hoveredMismatch = mismatch"
        @mouseout="hoveredMismatch = null"
        class="arrow-hit-area"
      />
      <!-- Ligne de la flèche -->
      <line
        :x1="getXPosition(mismatch.position)"
        :y1="80 - getArrowLength(mismatch.granthamScore)"
        :x2="getXPosition(mismatch.position)"
        y2="75"
        :stroke="getArrowColor(mismatch.position)"
        stroke-width="1"
        :marker-end="getArrowMarkerId(mismatch.position)"
        class="mismatch-arrow"
      />
      <!-- Info au survol -->
      <g v-if="hoveredMismatch === mismatch">
        <text
          :x="getXPosition(mismatch.position)"
          :y="0"
          text-anchor="middle"
          font-size="8"
          :fill="getArrowColor(mismatch.position)"
        >
          <tspan>Pos. {{ mismatch.position }}: {{ mismatch.allele1.aminoAcid }} → {{ mismatch.allele2.aminoAcid }}</tspan>
          <tspan 
            :x="getXPosition(mismatch.position)"
            dy="9"
          >Gr. Score: {{ mismatch.granthamScore }}</tspan>
        </text>
      </g>
    </g>
  </g>
</template>
      <!-- Définition des marqueurs de flèches -->
      <defs>
        <!-- Marqueur pour positions sélectionnées (rouge) -->
        <marker
          id="arrowhead-selected"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <polygon
            points="0 1, 8 4, 0 7"
            fill="#D85A5A"
          />
        </marker>
        <!-- Marqueur pour positions non sélectionnées (gris) -->
        <marker
          id="arrowhead-default"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <polygon
            points="0 1, 8 4, 0 7"
            fill="#333333"
          />
        </marker>
        <!-- Marqueur pour la légende -->
        <marker
          id="legendArrow"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill="#D85A5A"
          />
        </marker>
      </defs>
    </svg>

    <!-- Interface de comparaison d'allèles -->
    <div class="allele-comparison-section">
      <!-- Bouton pour déployer l'interface de comparaison -->
      <div class="comparison-toggle" v-if="!showAlleleComparison">
        <button @click="showAlleleComparison = true" class="compare-btn">
          <span class="compare-icon">🧬</span>
          <span class="compare-text">Compare Alleles</span>
        </button>
      </div>

      <!-- Interface de comparaison déployée -->
      <div v-if="showAlleleComparison" class="allele-comparison-expanded">
        <div class="comparison-header">
          <span class="comparison-title">
            <span class="title-icon">🧬</span>
            Compare Alleles
          </span>
          <button @click="closeComparison" class="close-btn" title="Close comparison">×</button>
        </div>
        
        <div class="allele-inputs">
          <div class="allele-input-group">
            <input
              v-model="allele1Input"
              @input="handleAllele1Input"
              @focus="showSuggestions1 = true"
              @blur="hideSuggestions1"
              placeholder="First allele (e.g., A*02:01)"
              class="allele-input"
              :class="{ 'has-value': currentAllele1 }"
            />
            <div v-if="showSuggestions1 && filteredAlleles1.length > 0" class="suggestions-dropdown">
              <div
                v-for="allele in filteredAlleles1"
                :key="allele"
                @mousedown="selectAllele(1, allele)"
                class="suggestion-item"
              >
                {{ allele }}
              </div>
            </div>
          </div>
          
          <div class="vs-divider">
            <span>vs</span>
          </div>
          
          <div class="allele-input-group">
            <input
              v-model="allele2Input"
              @input="handleAllele2Input"
              @focus="showSuggestions2 = true"
              @blur="hideSuggestions2"
              placeholder="Second allele (e.g., A*03:01)"
              class="allele-input"
              :class="{ 'has-value': currentAllele2 }"
            />
            <div v-if="showSuggestions2 && filteredAlleles2.length > 0" class="suggestions-dropdown">
              <div
                v-for="allele in filteredAlleles2"
                :key="allele"
                @mousedown="selectAllele(2, allele)"
                class="suggestion-item"
              >
                {{ allele }}
              </div>
            </div>
          </div>
          
          <div class="action-buttons">
            <button 
              @click="loadExampleAlleles"
              class="action-btn example-btn cycling"
              :disabled="isLoadingAlleles"
              title="Cliquer pour faire défiler les exemples (5 paires par locus)"
            >
              <span class="example-icon">⟲</span>
              Example
            </button>
            <button 
              @click="resetAlleles"
              class="action-btn reset-btn"
              title="Reset alleles"
            >
              Reset
            </button>
          </div>
        </div>
        
        <!-- Résultats compacts -->
        <div v-if="alleleSpecificPositionsResult?.mismatches?.length || cHed !== null || tHed !== null" class="comparison-results-compact">
          <div class="results-header">
            <span class="results-title">Divergence Results</span>
            <v-tooltip bottom>
              <template #activator="{ props }">
                <button
                  v-bind="props"
                  @click="openTutorial"
                  class="tutorial-link-small"
                  title="Learn about divergence calculations"
                >
                  <v-icon size="x-small">mdi-help-circle-outline</v-icon>
                </button>
              </template>
              Understanding divergence calculations
            </v-tooltip>
          </div>
          <div class="results-line">
            <span v-if="alleleSpecificPositionsResult?.mismatches?.length" class="result-compact">
              <strong>{{ alleleSpecificPositionsResult.totalMismatches || 0 }} mismatches</strong>
              <span 
                v-if="getFilteredMismatchCount() > 0" 
                class="result-filtered-highlight"
                :title="'Number of mismatches in selected positions (red arrows on the sequence)'"
              >
                {{ getFilteredMismatchCount() }} filtered
              </span>
            </span>
            <span v-if="cHed !== null" class="result-compact">
              <span class="result-label-compact">c-HED:</span> <strong>{{ cHed?.toFixed(2) || 'N/A' }}</strong>
            </span>
            <span v-if="tHed !== null" class="result-compact">
              <span class="result-label-compact">t-HED:</span> <strong>{{ tHed?.toFixed(2) || 'N/A' }}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
    </div>
    
    <!-- Position Analysis Section -->
    <div v-if="selectedPositions.length > 0" class="analysis-section" ref="analysisSection">
      <div class="section-header">
        <h2>Position {{ selectedPositions[0] }}:{{ currentLocus }} - Interactions & Distance Analysis</h2>
      </div>

      <!-- Sankey Diagram -->
      <div class="sankey-subsection">
        <h3>Peptide/TCR Interactions</h3>
        <PeptideInteractionsSankey
          :filteredContactData="filteredContactData"
          :selectedPositions="selectedPositions"
          :totalStructures="totalStructure"
        />
      </div>

      <!-- Distance Analysis -->
      <div class="distance-subsection">
        <h3>Distance Distributions</h3>
        <PositionDistanceCharts
          :locus="currentLocus"
          :position="parseInt(selectedPositions[0])"
        />
      </div>
    </div>

    <!-- No Selection Message -->
    <div v-else-if="positions && Object.keys(positions).length > 0" class="no-selection-message">
      <p>👆 Click on a position in the sequence to analyze its interactions and distances</p>
    </div>
  </div>
</template>

<script>
import PeptideInteractionsSankey from './PeptideInteractionsSankey.vue';
import PositionDistanceCharts from './PositionDistanceCharts.vue';

export default {
  name: 'SequenceVisualization',
  components: {
    PeptideInteractionsSankey,
    PositionDistanceCharts
  },
  props: {
    positions: {
      type: Object,
      required: true
    },
    alleleSpecificPositionsResult: {
      type: Object,
      default: () => ({})
    },
    cHed: {
      type: Number,
      default: null
    },
    tHed: {
      type: Number,
      default: null
    },
    filteredContactData: {
      type: Array,
      default: () => []
    },
    totalStructure: {
      type: Number,
      default: 0
    },
    selectedPositions: {
      type: Array,
      default: () => []
    },
    currentLocus: {
      type: String,
      default: 'A'
    }
  },
  data() {
    return {
      hoveredPosition: null,
      hoveredMismatch: null,
      colorMap: {
        'Peptide': '#FF6B6B',
        'TCR': '#4ECDC4',
        'Peptide + TCR': '#A78ADB'
      },
      // États pour la sélection d'allèles
      currentAllele1: '',
      currentAllele2: '',
      allelesList: [],
      isLoadingAlleles: false,
      showAlleleComparison: false,
      // Index pour la rotation des exemples
      exampleIndex: 0,
      allele1Input: '',
      allele2Input: '',
      showSuggestions1: false,
      showSuggestions2: false,
    }
  },
  computed: {
    selectedPositionsList() {
      return this.positions ? Object.keys(this.positions) : [];
    },
    filteredAlleles1() {
      if (!this.allele1Input || this.allele1Input.length < 1) {
        return this.allelesList.slice(0, 10);
      }
      return this.allelesList
        .filter(allele => allele.toLowerCase().includes(this.allele1Input.toLowerCase()))
        .slice(0, 10);
    },
    filteredAlleles2() {
      if (!this.allele2Input || this.allele2Input.length < 1) {
        return this.allelesList.slice(0, 10);
      }
      return this.allelesList
        .filter(allele => allele.toLowerCase().includes(this.allele2Input.toLowerCase()))
        .slice(0, 10);
    }
  },
  watch: {
    selectedPositions: {
      handler(newSelectedPositions) {
        // Scroll vers la section d'analyse si une position est sélectionnée
        if (newSelectedPositions && newSelectedPositions.length > 0) {
          this.$nextTick(() => {
            this.scrollToAnalysis();
          });
        }
      },
      immediate: false
    },
    currentLocus: {
      handler(newLocus) {
        if (newLocus) {
          this.loadAlleles(newLocus);
        }
      },
      immediate: true
    }
  },
  mounted() {
    // Charger les allèles au montage du composant
    if (this.currentLocus) {
      this.loadAlleles(this.currentLocus);
    }
  },
  methods: {
    openTutorial() {
      localStorage.setItem('tutorialSection', 'section-divergence');
      window.open(window.location.origin + '?openTutorial=true', '_blank');
    },
    handleClick(position) {
      console.log('🎭 Sequence position clicked:', position);

      const positionStr = String(position);

      // Sélection unique : si déjà sélectionnée → désélectionner, sinon → sélectionner uniquement celle-ci
      if (this.selectedPositions.length === 1 && this.selectedPositions[0] === positionStr) {
        // Désélectionner
        this.$emit('positions-selected', []);
      } else {
        // Sélectionner uniquement cette position
        this.$emit('positions-selected', [positionStr]);
      }
    },
    
    scrollToAnalysis() {
      setTimeout(() => {
        if (this.$refs.analysisSection) {
          const element = this.$refs.analysisSection;
          const elementRect = element.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + window.pageYOffset;
          const middle = absoluteElementTop - (window.innerHeight / 4);

          window.scrollTo({
            top: middle,
            behavior: 'smooth'
          });
        }
      }, 150);
    },
    getColorForType(type) {
      return this.colorMap[type] || '#999999';
    },
    getFilteredMismatchCount() {
      if (!this.alleleSpecificPositionsResult?.mismatches || !this.positions) {
        return 0;
      }
      // Utiliser les mêmes positions que le calcul de divergence
      // Convertir en strings pour cohérence avec le service
      const positionsAsStrings = Object.keys(this.positions).map(pos => String(pos));
      const filteredMismatches = this.alleleSpecificPositionsResult.mismatches.filter(mismatch => 
        positionsAsStrings.includes(String(mismatch.position))
      );
      
      
      return filteredMismatches.length;
    },
    showTooltip(position) {
      this.hoveredPosition = position;
    },
    hideTooltip() {
      this.hoveredPosition = null;
    },
    getXPosition(position) {
      const positionNum = parseInt(position, 10);
      return 50 + (positionNum * 700/180);
    },
    
    // Méthodes pour la gestion des allèles
    async loadAlleles(locus) {
      try {
        this.isLoadingAlleles = true;
        const response = await fetch(`/data/${locus}.csv`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const csvText = await response.text();
        const lines = csvText.split('\n');
        const headers = lines[0].split(';');
        const aaIndex = headers.indexOf('AA');
        
        if (aaIndex === -1) throw new Error('Column AA not found');
        
        this.allelesList = lines.slice(1)
          .map(line => line.split(';')[aaIndex])
          .filter(allele => allele && allele.trim() !== '')
          .sort();
          
      } catch (error) {
        console.error(`Error loading alleles for ${locus}:`, error);
        this.allelesList = [];
      } finally {
        this.isLoadingAlleles = false;
      }
    },
    
    handleAllele1Input(event) {
      this.allele1Input = event.target.value;
      this.showSuggestions1 = true;
    },
    
    handleAllele2Input(event) {
      this.allele2Input = event.target.value;
      this.showSuggestions2 = true;
    },
    
    selectAllele(alleleNumber, allele) {
      if (alleleNumber === 1) {
        this.currentAllele1 = allele;
        this.allele1Input = allele;
        this.showSuggestions1 = false;
      } else {
        this.currentAllele2 = allele;
        this.allele2Input = allele;
        this.showSuggestions2 = false;
      }
      
      // Émettre l'événement vers le parent pour mettre à jour les paramètres
      this.$emit('allele-changed', {
        allele1: this.currentAllele1,
        allele2: this.currentAllele2
      });
    },
    
    hideSuggestions1() {
      setTimeout(() => {
        this.showSuggestions1 = false;
      }, 150);
    },
    
    hideSuggestions2() {
      setTimeout(() => {
        this.showSuggestions2 = false;
      }, 150);
    },
    
    closeComparison() {
      this.showAlleleComparison = false;
      // Optionnel: reset des allèles si souhaité
      // this.currentAllele1 = '';
      // this.currentAllele2 = '';
      // this.allele1Input = '';
      // this.allele2Input = '';
    },
    
    loadExampleAlleles() {
      const currentLocus = this.currentLocus || 'A';
      
      // Ensemble de 5 paires d'exemples par locus pour la rotation
      const exampleAlleles = {
        A: [
          ['A*02:01', 'A*03:01'],
          ['A*68:01', 'A*68:02'], 
          ['A*02:01', 'A*11:01'],
          ['A*24:02', 'A*32:01'],
          ['A*01:01', 'A*02:01']
        ],
        B: [
          ['B*07:02', 'B*08:01'],
          ['B*27:05', 'B*44:02'],
          ['B*15:01', 'B*35:01'],
          ['B*13:02', 'B*40:01'],
          ['B*07:02', 'B*27:05']
        ]
      };
      
      const examplePairs = exampleAlleles[currentLocus] || exampleAlleles.A;
      
      // Utiliser l'index pour sélectionner la paire actuelle et boucler
      const currentPair = examplePairs[this.exampleIndex % examplePairs.length];
      
      this.currentAllele1 = currentPair[0];
      this.currentAllele2 = currentPair[1];
      this.allele1Input = currentPair[0];
      this.allele2Input = currentPair[1];
      this.showAlleleComparison = true; // Déployer l'interface
      
      // Incrémenter l'index pour le prochain clic
      this.exampleIndex++;
      
      this.$emit('allele-changed', {
        allele1: this.currentAllele1,
        allele2: this.currentAllele2
      });
    },
    
    resetAlleles() {
      this.currentAllele1 = '';
      this.currentAllele2 = '';
      this.allele1Input = '';
      this.allele2Input = '';
      
      this.$emit('allele-changed', {
        allele1: '',
        allele2: ''
      });
    },
    getArrowLength(score) {
      const minLength = 15;
      const maxLength = 75;
      const maxScore = 215;
      return minLength + (score / maxScore) * (maxLength - minLength);
    },
    getArrowHitPath(position, granthamScore) {
      const x = this.getXPosition(position);
      const length = this.getArrowLength(granthamScore);
      const y1 = 75;
      const y2 = 80 - length;
      
      return `
        M ${x - 3} ${y1}
        L ${x - 3} ${y2}
        C ${x - 3} ${y2 - 5}, ${x + 3} ${y2 - 5}, ${x + 3} ${y2}
        L ${x + 3} ${y1}
        Z`;
    },
    isPositionSelected(position) {
      return position in this.positions;
    },
    getArrowColor(position) {
      return this.isPositionSelected(position) ? '#D85A5A' : '#333333';
    },
    getArrowMarkerId(position) {
      return `url(#arrowhead-${this.isPositionSelected(position) ? 'selected' : 'default'})`;
    }
  }
}
</script>

<style scoped>
.visualization {
  /* background removed for harmonized wrappers */
  padding: 8px;
  position: relative;
  width: 100%;
  /* box-shadow removed */
}

.legend-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.legend {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #eee;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.legend-item {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}

.legend-text {
  font-size: 12px;
  color: #333;
}

.sequence-svg {
  width: 100%;
  height: auto;
  display: block;
  max-width: 98%;
}

.position-point {
  transition: r 0.2s, stroke-width 0.2s;
  cursor: pointer;
}

.position-point:hover {
  stroke: #333;
  stroke-width: 1.5;
}

.arrow-hit-area {
  pointer-events: all;
  cursor: pointer;
}

.mismatch-arrow {
  pointer-events: none;
}

svg {
  overflow: visible;
}

.divergence-info {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.divergence-container {
  display: flex;
  justify-content: center;
  gap: 40px;
  flex-wrap: wrap;
}

.divergence-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.divergence-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.divergence-value {
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

/* Style pour la ligne de comparaison des allèles */
.allele-comparison-line {
  text-align: center;
  font-size: 14px;
  color: #666;
  margin: 6px 0 0 0;
  padding: 0;
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

.filtered-mismatches {
  color: #D85A5A;
  font-size: 13px;
  margin-left: 4px;
  font-weight: 500;
}

/* Styles pour les wrappers harmonisés */
.visualization-section,
.analysis-section {
  background: rgba(248, 249, 250, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(224, 224, 224, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

/* No selection message */
.no-selection-message {
  padding: 60px 20px;
  text-align: center;
  font-size: 18px;
  color: #666;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  margin: 20px 0;
}

.no-selection-message p {
  margin: 0;
}

/* Section header */
.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 24px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
}

/* Subsections */
.sankey-subsection {
  margin-bottom: 32px;
}

.distance-subsection {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 2px solid #e0e0e0;
}

.sankey-subsection h3,
.distance-subsection h3 {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 20px 0;
}

/* Styles pour la section de comparaison d'allèles */
.allele-comparison-section {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

/* Bouton de comparaison */
.comparison-toggle {
  display: flex;
  justify-content: center;
  width: 100%;
}

.compare-btn {
  background: linear-gradient(135deg, #4a90e2 0%, #2d5aa0 100%);
  border: none;
  border-radius: 20px;
  padding: 8px 20px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
}

.compare-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
  background: linear-gradient(135deg, #2d5aa0 0%, #1a4480 100%);
}

.compare-icon {
  font-size: 16px;
}

.compare-text {
  font-weight: 600;
}

/* Interface de comparaison déployée */
.allele-comparison-expanded {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px 20px;
  border: 1px solid rgba(224, 224, 224, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  animation: expandInterface 0.3s ease-out;
}

@keyframes expandInterface {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* En-tête de la comparaison */
.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(224, 224, 224, 0.3);
}

.comparison-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.title-icon {
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 0, 0, 0.1);
  color: #d32f2f;
  transform: scale(1.1);
}

/* Inputs d'allèles */
.allele-inputs {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.allele-input-group {
  position: relative;
  flex: 1;
  min-width: 180px;
  max-width: 220px;
}

.allele-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.2s ease;
}

.allele-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.allele-input.has-value {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.02);
}

/* Suggestions dropdown */
.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
}

.suggestion-item:hover {
  background: #f5f5f5;
}

.suggestion-item:last-child {
  border-bottom: none;
}

/* Divider "vs" */
.vs-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 12px;
  font-weight: bold;
  color: #666;
  border: 2px solid #ddd;
  flex-shrink: 0;
}

.allele-selector-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.allele-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.allele-label {
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
  min-width: fit-content;
}

.allele-dropdown {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  background: white;
  cursor: pointer;
  min-width: 120px;
  transition: border-color 0.2s ease;
}

.allele-dropdown:hover {
  border-color: #4a90e2;
}

.allele-dropdown:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.vs-text {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  margin: 0 4px;
}

/* Boutons d'action */
.action-buttons {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: none;
}

.action-btn:hover {
  background: #e9ecef;
  transform: translateY(-1px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.example-btn {
  color: #4a90e2;
  border-color: rgba(74, 144, 226, 0.3);
  position: relative;
  overflow: visible;
}

.example-btn:hover {
  background: rgba(74, 144, 226, 0.05);
  border-color: #4a90e2;
}

/* Icône de cycle avec animation */
.example-icon {
  display: inline-block;
  margin-right: 6px;
  font-size: 14px;
  transition: transform 0.3s ease;
}

/* Animation de rotation continue pour indiquer le cycle */
.example-btn.cycling .example-icon {
  animation: rotate-hint 2s linear infinite;
}

.example-btn:hover .example-icon {
  transform: rotate(180deg);
  animation-play-state: paused;
}

/* Effet de pulsation circulaire pour attirer l'attention */
.example-btn.cycling::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid rgba(74, 144, 226, 0.4);
  border-radius: 8px;
  animation: pulse-circle 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes rotate-hint {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(90deg); }
  50% { transform: rotate(180deg); }
  75% { transform: rotate(270deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse-circle {
  0% { 
    border-color: rgba(74, 144, 226, 0.4);
    transform: scale(1);
  }
  50% { 
    border-color: rgba(74, 144, 226, 0.8);
    transform: scale(1.05);
  }
  100% { 
    border-color: rgba(74, 144, 226, 0.4);
    transform: scale(1);
  }
}

.reset-btn {
  color: #666;
}

.reset-btn:hover {
  background: rgba(255, 0, 0, 0.05);
  border-color: rgba(255, 0, 0, 0.3);
  color: #d32f2f;
}

/* Résultats compacts */
.comparison-results-compact {
  margin-top: 8px;
  padding: 6px 12px;
  background: rgba(248, 249, 250, 0.8);
  border: 1px solid rgba(224, 224, 224, 0.4);
  border-radius: 8px;
  font-size: 13px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.results-title {
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.tutorial-link-small {
  background: none;
  border: none;
  color: #1976d2;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.tutorial-link-small:hover {
  background-color: rgba(25, 118, 210, 0.1);
}

.results-line {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: center;
}

.result-compact {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #2c3e50;
}

.result-label-compact {
  color: #666;
  font-size: 12px;
}

.result-detail {
  color: #666;
  font-size: 11px;
  margin-left: 4px;
}

.result-filtered-highlight {
  color: #d32f2f;
  font-weight: 600;
  font-size: 13px;
  margin-left: 8px;
  padding: 2px 6px;
  background: rgba(211, 47, 47, 0.1);
  border-radius: 4px;
  cursor: help;
  transition: all 0.2s ease;
  border: 1px solid rgba(211, 47, 47, 0.2);
}

.result-filtered-highlight:hover {
  background: rgba(211, 47, 47, 0.15);
  border-color: rgba(211, 47, 47, 0.4);
  transform: scale(1.05);
}

/* Responsive design pour l'interface de comparaison */
@media (max-width: 768px) {
  .allele-inputs {
    flex-direction: column;
    gap: 12px;
  }
  
  .allele-input-group {
    min-width: 240px;
    max-width: 280px;
  }
  
  .vs-divider {
    transform: rotate(90deg);
    width: 28px;
    height: 28px;
    font-size: 11px;
  }
  
  .allele-comparison-expanded {
    padding: 12px 16px;
  }
  
  .comparison-title {
    font-size: 15px;
  }
}

@media (max-width: 520px) {
  .allele-input-group {
    min-width: 200px;
    max-width: 240px;
  }
  
  .allele-input {
    font-size: 13px;
    padding: 8px 10px;
  }
  
  .suggestion-item {
    font-size: 12px;
    padding: 6px 10px;
  }
  
  .compare-btn {
    padding: 6px 16px;
    font-size: 13px;
  }
  
  .action-btn {
    font-size: 11px;
    padding: 4px 8px;
    height: 28px;
  }
  
  .results-line {
    gap: 12px;
    justify-content: center;
  }
  
  .result-compact {
    font-size: 12px;
  }
  
  .result-label-compact {
    font-size: 11px;
  }
  
  .result-detail {
    font-size: 10px;
  }
  
  .result-filtered-highlight {
    font-size: 12px;
    padding: 1px 4px;
    margin-left: 6px;
  }
}

/* Style responsive pour la ligne de comparaison */
@media (max-width: 480px) {
  .allele-comparison-line {
    font-size: 11px;
  }
  
  .filtered-mismatches {
    font-size: 10px;
    display: block;
    margin-top: 2px;
    margin-left: 0;
  }
  
  .positions-selector-header {
    font-size: 12px;
  }
  
  .selector-text {
    font-size: 11px;
  }
  
  .positions-chips .position-chip {
    font-size: 11px;
    padding: 3px 8px;
  }
  
  .allele-selector {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .allele-dropdown {
    min-width: 100px;
    font-size: 11px;
  }
  
  .allele-label {
    font-size: 12px;
  }
}
</style>