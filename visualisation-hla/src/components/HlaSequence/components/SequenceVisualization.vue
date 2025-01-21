<template>
    <div class="visualization">
      <div class="legend">
        <div v-for="(color, type) in colorMap" :key="type" class="legend-item">
          <span class="legend-dot" :style="{ backgroundColor: color }"></span>
          <span class="legend-text">{{ type }}</span>
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
      }
    },
    data() {
  return {
    hoveredPosition: null,
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
      }
    }
  }
  </script>
  
  <style scoped>
  .visualization {
    width: 100%;
    position: relative;
    overflow: visible; /* Permet à la légende de déborder si nécessaire */
  }
  
  .visualization-container {
    background-color: #f5f5f5;
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;
    position: relative;
    width: 100%;
    min-height: 200px; /* Assure un espace minimum pour la visualisation */
  }
  
  .legend {
    position: absolute;
    top: 20px;
    right: 20px;
    background-color: rgba(255, 255, 255, 0.9);
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #ddd;
    z-index: 10; /* Assure que la légende reste au-dessus des autres éléments */
    max-width: 200px; /* Largeur maximale de la légende */
  }
  
  .sequence-svg {
    width: 100%;
    height: auto;
    display: block;
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
  
  /* Styles responsives */
@media (max-width: 768px) {
  .legend {
    position: static; /* La légende passe en haut sur mobile */
    margin-bottom: 15px;
    max-width: 100%;
  }
  
  .visualization-container {
    padding: 10px;
  }
}

  .legend-text {
    font-size: 12px;
  }
  
  .position-point {
    transition: r 0.2s;
    cursor: pointer;
  }
  
  .position-point:hover {
    r: 6;
  }
  </style>