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
    
  </div>
</template>

<script>
export default {
  name: 'SequenceVisualization',
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
  }
},
  data() {
    return {
      hoveredPosition: null,
      hoveredMismatch: null,
      selectedPosition: null, 
      colorMap: {
        'Peptide': '#FF6B6B',     // Rouge doux
        'TCR': '#4ECDC4',         // Turquoise
        'Peptide + TCR': '#A78ADB' // Violet doux
      }
    }
  },
  methods: {
    handleClick(position) {
    this.selectedPosition = position;
    this.$emit('position-selected', position);
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
      Z`;},

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
}

.legend-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.legend {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 8px 16px;
  border-radius: 2px;
  border: 2px solid #ddd;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  align-items: center;
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
  transition: r 0.2s;
  cursor: pointer;
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
</style>