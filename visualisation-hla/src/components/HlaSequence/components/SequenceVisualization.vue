<template>
  <div class="visualization">
    <div class="legend">
      <div v-for="(color, type) in colorMap" :key="type" class="legend-item">
        <span class="legend-dot" :style="{ backgroundColor: color }"></span>
        <span class="legend-text">{{ type }}</span>
      </div>
      <!-- Mise à jour de la légende des mismatches avec une flèche -->
      <div v-if="alleleSpecificPositionsResult?.mismatches?.length" class="legend-item">
        <svg width="20" height="8">
          <line x1="0" y1="4" x2="15" y2="4" stroke="#D85A5A" stroke-width="1" marker-end="url(#legendArrow)" />
        </svg>
        <span class="legend-text">Mismatch</span>
      </div>
    </div>
   
    <svg class="sequence-svg"
    viewBox="0 0 800 175"
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
          r="4"
          :fill="getColorForType(type)"
          @mouseover="showTooltip(position, type)"
          @mouseout="hideTooltip"
          class="position-point"
        />
        <text
          v-if="hoveredPosition === position"
          :x="50 + (position * 700/180)"
          y="65"
          text-anchor="middle"
          font-size="12"
          fill="#333"
        >
          {{ position }}
        </text>
      </g>

      <!-- Flèches pour les mismatches -->
      <template v-if="alleleSpecificPositionsResult?.mismatches">
        <g v-for="mismatch in alleleSpecificPositionsResult.mismatches" :key="'mismatch-'+mismatch.position">
          <!-- Invisible wider hit area -->
          <rect
            :x="getXPosition(mismatch.position) - 10"
            :y="80 - getArrowLength(mismatch.granthamScore)"
            width="20"
            :height="getArrowLength(mismatch.granthamScore)"
            fill="transparent"
            @mouseover="hoveredMismatch = mismatch"
            @mouseout="hoveredMismatch = null"
            class="arrow-hit-area"
          />
          <!-- Arrow line -->
          <line
            :x1="getXPosition(mismatch.position)"
            :y1="80 - getArrowLength(mismatch.granthamScore)"
            :x2="getXPosition(mismatch.position)"
            y2="75"
            stroke="#333333"
            stroke-width="1"
            marker-end="url(#arrowhead)"
            class="mismatch-arrow"
          />
          <!-- Info au survol -->
          <g v-if="hoveredMismatch === mismatch">
            <text
              :x="getXPosition(mismatch.position)"
              :y="0"
              text-anchor="middle"
              font-size="8"
              fill="#333333"
            >
              <tspan>Pos. {{ mismatch.position }}: {{ mismatch.allele1.aminoAcid }} → {{ mismatch.allele2.aminoAcid }}</tspan>
              <tspan 
                :x="getXPosition(mismatch.position)"
                dy="9"
              >Gr. Score: {{ mismatch.granthamScore }}</tspan>
            </text>
          </g>
        </g>
      </template>

      <!-- Définition des flèches -->
      <defs>
        <!-- Flèche principale -->
        <marker
          id="arrowhead"
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
        <!-- Flèche de la légende -->
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
            fill="#333333"
          />
        </marker>
      </defs>
    </svg>
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
    }
  },
  data() {
    return {
      hoveredPosition: null,
      hoveredMismatch: null,
      colorMap: {
        'Peptide': '#FF6B6B',     // Soft Red
        'TCR': '#4ECDC4',         // Teal
        'Peptide + TCR': '#A78ADB' // Soft Purple
      }
    }
  },
  methods: {
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
      // On veut des flèches entre 15 et 45 pixels de long
      const minLength = 15;
      const maxLength = 75;
      const maxScore = 215;
      
      return minLength + (score / maxScore) * (maxLength - minLength);
    }
  }
}
</script>

<style scoped>
.visualization {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  position: relative;
  width: 95%;
}

.sequence-svg {
  width: 98%;
  height: auto;
  display: block;
  max-width: 100%;
}

.legend {
  position: absolute;
  top: 15px;
  right: 60px;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}

.legend-text {
  font-size: 12px;
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
</style>