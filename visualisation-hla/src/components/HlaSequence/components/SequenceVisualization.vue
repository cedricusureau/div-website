<template>
  <div class="visualization">
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
      viewBox="0 0 800 150"
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
          y="100"
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
          :r="selectedPosition === position ? 6 : 4"  
          :fill="getColorForType(type)"
          :stroke="selectedPosition === position ? '#333' : 'none'" 
          stroke-width="2"
          @mouseover="showTooltip(position, type)"
          @mouseout="hideTooltip"
          @click="handleClick(position)"
          class="position-point"
        />
        <text
          v-if="hoveredPosition === position"
          :x="50 + (position * 700/180)"
          y="100"
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

    <div class="divergence-info" v-if="classicalDivergence !== null || specificDivergence !== null">
      <div class="divergence-container">
        <div class="divergence-item">
          <span class="divergence-label">Classical Divergence (HED):</span>
          <span class="divergence-value">{{ classicalDivergence !== null ? classicalDivergence.toFixed(2) : 'N/A' }}</span>
        </div>
        <div class="divergence-item">
          <span class="divergence-label">Specific Divergence:</span>
          <span class="divergence-value">{{ specificDivergence !== null ? specificDivergence.toFixed(2) : 'N/A' }}</span>
        </div>
      </div>
    </div>
    
    <!-- Section de l'accordéon pour les interactions peptidiques -->
    <div class="peptide-interactions-section" v-if="Object.keys(positions).length > 0" ref="accordionSection">
      <div class="accordion-header" @click="togglePeptideInteractions">
        <span class="accordion-title">Peptide Interactions</span>
        <span class="accordion-icon">{{ showPeptideInteractions ? '▲' : '▼' }}</span>
      </div>
      
      <transition name="slide">
        <div v-if="showPeptideInteractions" class="accordion-content">
          <PeptideInteractionsSankey 
            :filteredContactData="filteredContactData"
            :selectedPositions="selectedPositionsList"
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
    totalStructure: {  // Ajout de cette prop si elle n'existe pas déjà
      type: Number,
      default: 0
    },
  },
  data() {
    return {
      hoveredPosition: null,
      hoveredMismatch: null,
      selectedPosition: null,
      showPeptideInteractions: false,
      colorMap: {
        'Peptide': '#FF6B6B',     // Rouge doux
        'TCR': '#4ECDC4',         // Turquoise
        'Peptide + TCR': '#A78ADB' // Violet doux
      }
    }
  },
  computed: {
    selectedPositionsList() {
      return Object.keys(this.positions);
    }
  },
  methods: {
    handleClick(position) {
      this.selectedPosition = position;
      this.$emit('position-selected', position);
    },
    togglePeptideInteractions() {
      this.showPeptideInteractions = !this.showPeptideInteractions;
      
      // Si l'accordéon s'ouvre, planifier un défilement vers cette section
      if (this.showPeptideInteractions) {
        this.$nextTick(() => {
          this.scrollToAccordion();
        });
      }
    },
    scrollToAccordion() {
      // Attendre un court délai pour permettre à l'animation de transition de commencer
      setTimeout(() => {
        if (this.$refs.accordionSection) {
          // Calculer la position de défilement
          const element = this.$refs.accordionSection;
          const elementRect = element.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + window.pageYOffset;
          const middle = absoluteElementTop - (window.innerHeight / 4);
          
          // Défiler en douceur vers l'accordéon
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
      // Le score Grantham va de 0 à 215 (max théorique)
      // On veut des flèches entre 15 et 75 pixels de long
      const minLength = 15;
      const maxLength = 75;
      const maxScore = 215;
     
      return minLength + (score / maxScore) * (maxLength - minLength);
    },
    getArrowHitPath(position, granthamScore) {
      const x = this.getXPosition(position);
      const length = this.getArrowLength(granthamScore);
      const y1 = 75;  // Position basse de la flèche
      const y2 = 80 - length;  // Position haute de la flèche
     
      // Créer un path qui entoure la flèche avec une marge de 5px
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
  background-color: #ffffff;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  position: relative;
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
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

/* Style pour l'accordéon */
.peptide-interactions-section {
  margin-top: 30px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.accordion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f8f9fa;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.accordion-header:hover {
  background-color: #e9ecef;
}

.accordion-title {
  font-size: 16px;
  font-weight: 500;
  color: #4a90e2;
}

.accordion-icon {
  font-size: 14px;
  color: #4a90e2;
}

.accordion-content {
  padding: 0;
  overflow: hidden;
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
</style>