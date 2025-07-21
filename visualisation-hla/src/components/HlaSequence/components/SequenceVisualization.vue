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

    <!-- Ligne de comparaison des allèles sous la frise -->
    <div class="allele-comparison-line" v-if="alleleSpecificPositionsResult?.mismatches?.length">
      {{ alleleSpecificPositionsResult.mismatches[0]?.allele1?.allele || 'N/A' }} vs {{ alleleSpecificPositionsResult.mismatches[0]?.allele2?.allele || 'N/A' }} • 
      {{ alleleSpecificPositionsResult.totalMismatches || 0 }} mismatches
      <span v-if="getFilteredMismatchCount() > 0" class="filtered-mismatches">
        ({{ getFilteredMismatchCount() }} in filtered positions)
      </span>
    </div>
    
    <!-- Divergence Analysis dans la même section -->
    <div v-if="classicalDivergence !== null || specificDivergence !== null" class="divergence-info">
      <div class="divergence-container">
        <div class="divergence-item">
          <span class="divergence-label">Classical Divergence (HED):</span>
          <span class="divergence-value">{{ classicalDivergence !== null ? classicalDivergence.toFixed(2) : 'N/A' }}</span>
        </div>
        <div class="divergence-item">
          <span class="divergence-label">Targeted Divergence:</span>
          <span class="divergence-value">{{ specificDivergence !== null ? specificDivergence.toFixed(2) : 'N/A' }}</span>
        </div>
      </div>
    </div>
    </div>
    
    <!-- Interactions Details (Sankey Diagram) -->
    <div class="interactions-section" v-if="positions && Object.keys(positions).length > 0" ref="accordionSection">
      <div class="interactions-header clickable-header" @click="togglePeptideInteractions">
        <span class="interactions-title">Interactions Details (Sankey Diagram)</span>
        <span class="interactions-icon">{{ showPeptideInteractions ? '▲' : '▼' }}</span>
      </div>
      
      <transition name="slide">
        <div v-if="showPeptideInteractions" class="interactions-content">
          <PeptideInteractionsSankey 
            :filteredContactData="filteredContactData"
            :selectedPositions="selectedPositionsForSankey"
            :totalStructures="totalStructure"
          />
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import PeptideInteractionsSankey from './PeptideInteractionsSankey.vue';

export default {
  name: 'SequenceVisualization',
  components: {
    PeptideInteractionsSankey
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
    classicalDivergence: {
      type: Number,
      default: null
    },
    specificDivergence: {
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
    }
  },
  data() {
    return {
      hoveredPosition: null,
      hoveredMismatch: null,
      showPeptideInteractions: false,
      colorMap: {
        'Peptide': '#FF6B6B',
        'TCR': '#4ECDC4',
        'Peptide + TCR': '#A78ADB'
      }
    }
  },
  computed: {
    selectedPositionsList() {
      return this.positions ? Object.keys(this.positions) : [];
    },
    selectedPositionsForSankey() {
      console.log("filteredContactData length:", this.filteredContactData.length);
      // MODIFICATION : Utiliser this.selectedPositions (prop) au lieu de this.selectedPositions (data)
      return this.selectedPositions.length > 0 
        ? this.selectedPositions 
        : (this.positions ? Object.keys(this.positions) : []);
    }
  },
  watch: {
    selectedPositions: {
      handler(newSelectedPositions) {
        // Ouvrir automatiquement l'accordéon si des positions sont sélectionnées
        if (newSelectedPositions && newSelectedPositions.length > 0 && !this.showPeptideInteractions) {
          this.showPeptideInteractions = true;
          this.$nextTick(() => {
            this.scrollToAccordion();
          });
        }
      },
      immediate: false
    }
  },
  methods: {
    handleClick(position) {
      console.log('🎭 Sequence position clicked:', position);
      
      // MODIFICATION : Utiliser this.selectedPositions (prop) au lieu de this.selectedPositions (data)
      const positionStr = String(position);
      const index = this.selectedPositions.indexOf(positionStr);
      
      let newSelection;
      if (index !== -1) {
        // Position déjà sélectionnée, la retirer
        newSelection = [...this.selectedPositions];
        newSelection.splice(index, 1);
      } else {
        // Position non sélectionnée, l'ajouter
        newSelection = [...this.selectedPositions, positionStr];
      }
      
      console.log('🎭 Emitting positions-selected:', newSelection);
      // MODIFICATION : Émettre le nouveau tableau au lieu de le stocker localement
      this.$emit('positions-selected', newSelection);
    },
    
    // ... toutes vos autres méthodes restent identiques ...
    togglePeptideInteractions() {
      this.showPeptideInteractions = !this.showPeptideInteractions;
      
      if (this.showPeptideInteractions) {
        this.$nextTick(() => {
          this.scrollToAccordion();
        });
      }
    },
    scrollToAccordion() {
      setTimeout(() => {
        if (this.$refs.accordionSection) {
          const element = this.$refs.accordionSection;
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
      // Compter les mismatches qui sont dans les positions filtrées (celles affichées dans la frise)
      return this.alleleSpecificPositionsResult.mismatches.filter(mismatch => 
        Object.keys(this.positions).includes(String(mismatch.position))
      ).length;
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
.interactions-section {
  background: rgba(248, 249, 250, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(224, 224, 224, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.interactions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid rgba(224, 224, 224, 0.3);
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.clickable-header:hover {
  background: rgba(74, 144, 226, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0 -12px 12px -12px;
}

.clickable-header:hover .interactions-title {
  color: #4a90e2;
}

.clickable-header:hover .interactions-icon {
  color: #2d5aa0;
  transform: scale(1.1);
}

.interactions-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.interactions-title::before {
  content: "📊";
  font-size: 16px;
}

.interactions-icon {
  font-size: 16px;
  color: #4a90e2;
  font-weight: bold;
  transition: transform 0.2s ease;
}

.interactions-content {
  padding-top: 8px;
}

/* Animation de transition pour l'accordéon */
.slide-enter-active, .slide-leave-active {
  transition: max-height 0.3s ease-out;
  max-height: 1000px;
  overflow: hidden;
}

.slide-enter-from, .slide-leave-to {
  max-height: 0;
  overflow: hidden;
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
}
</style>