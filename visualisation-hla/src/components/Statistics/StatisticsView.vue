/* eslint-disable */
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { loadStructuresData } from '../../services/hlaStructuresService'
import * as d3 from 'd3';

const pdbData = ref([])
const vdjdbData = ref([])
const loading = ref(true)
const error = ref(null)

// Computed properties pour les statistiques
const vdjdbStats = computed(() => {
  if (!vdjdbData.value.length) return [];
  
  const counts = {};
  vdjdbData.value.forEach(item => {
    counts[item.Locus] = (counts[item.Locus] || 0) + 1;
  });
  
  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    percentage: (value / vdjdbData.value.length) * 100
  }));
});

const pdbStats = computed(() => {
  if (!pdbData.value.length) return [];
  
  const counts = {};
  pdbData.value.forEach(item => {
    counts[item.Locus] = (counts[item.Locus] || 0) + 1;
  });
  
  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    percentage: (value / pdbData.value.length) * 100
  }));
});

const vdjdbMhcStats = computed(() => {
  if (!vdjdbData.value.length) return [];
  
  const statsByLocus = {};
  vdjdbData.value.forEach(item => {
    if (!statsByLocus[item.Locus]) {
      statsByLocus[item.Locus] = {};
    }
    statsByLocus[item.Locus][item.MHC] = (statsByLocus[item.Locus][item.MHC] || 0) + 1;
  });
  
  return Object.entries(statsByLocus).map(([locus, mhcCounts]) => ({
    locus,
    counts: Object.entries(mhcCounts).map(([mhc, count]) => ({
      name: mhc,
      value: count,
      percentage: (count / vdjdbData.value.length) * 100
    }))
  }));
});

const pdbMhcStats = computed(() => {
  if (!pdbData.value.length) return [];
  
  const statsByLocus = {};
  pdbData.value.forEach(item => {
    if (!statsByLocus[item.Locus]) {
      statsByLocus[item.Locus] = {};
    }
    statsByLocus[item.Locus][item.MHC] = (statsByLocus[item.Locus][item.MHC] || 0) + 1;
  });
  
  return Object.entries(statsByLocus).map(([locus, mhcCounts]) => ({
    locus,
    counts: Object.entries(mhcCounts).map(([mhc, count]) => ({
      name: mhc,
      value: count,
      percentage: (count / pdbData.value.length) * 100
    }))
  }));
});

// Nouvelles statistiques pour les pathogènes
const vdjdbSpeciesStats = computed(() => {
  if (!vdjdbData.value.length) return [];
  
  const speciesCounts = {};
  vdjdbData.value.forEach(item => {
    const species = item['Peptide species'] || 'Unknown';
    speciesCounts[species] = (speciesCounts[species] || 0) + 1;
  });
  
  // Trier par fréquence et garder les top 8
  const sorted = Object.entries(speciesCounts)
    .map(([name, value]) => ({ name, value, percentage: (value / vdjdbData.value.length) * 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
    
  return sorted;
});


// Statistiques des scores de confiance
const confidenceStats = computed(() => {
  if (!vdjdbData.value.length) return [];
  
  const confidenceCounts = { '1': 0, '2': 0, '3': 0 };
  
  vdjdbData.value.forEach(item => {
    const score = item['VDJdb_confidence_score'] || item.VDJdb_confidence_score;
    if (score >= 1 && score <= 3) {
      const scoreKey = Math.floor(score).toString();
      confidenceCounts[scoreKey] = (confidenceCounts[scoreKey] || 0) + 1;
    }
  });
  
  return Object.entries(confidenceCounts).map(([name, value]) => ({
    name,
    value,
    percentage: (value / vdjdbData.value.length) * 100
  }));
});

// Statistiques des scores TCRmodel2 (histogramme 0.6-1.0)
const tcrModelScoreStats = computed(() => {
  if (!vdjdbData.value.length) return [];
  
  // Définir les bins dans l'ordre croissant
  const orderedBins = [
    { key: '0.60-0.65', min: 0.60, max: 0.65 },
    { key: '0.65-0.70', min: 0.65, max: 0.70 },
    { key: '0.70-0.75', min: 0.70, max: 0.75 },
    { key: '0.75-0.80', min: 0.75, max: 0.80 },
    { key: '0.80-0.85', min: 0.80, max: 0.85 },
    { key: '0.85-0.90', min: 0.85, max: 0.90 },
    { key: '0.90-0.95', min: 0.90, max: 0.95 },
    { key: '0.95-1.00', min: 0.95, max: 1.00 }
  ];
  
  // Initialiser tous les bins à zéro
  const scoreCounts = {};
  orderedBins.forEach(bin => {
    scoreCounts[bin.key] = 0;
  });
  
  // Compter les scores dans chaque bin
  vdjdbData.value.forEach(item => {
    const score = parseFloat(item['TCRmodel2-pmhc-iptm-score'] || item.modelScore || 0);
    if (score >= 0.6 && score <= 1.0) {
      const bin = orderedBins.find(b => score >= b.min && (score < b.max || (b.max === 1.0 && score <= 1.0)));
      if (bin) {
        scoreCounts[bin.key]++;
      }
    }
  });
  
  // Retourner dans l'ordre des bins
  return orderedBins.map(bin => ({
    name: bin.key,
    value: scoreCounts[bin.key],
    percentage: (scoreCounts[bin.key] / vdjdbData.value.length) * 100
  }));
});

// Fonction améliorée pour créer les camemberts
const createPieChart = (data, containerId, title = '') => {
  // Clear previous chart
  d3.select(`#${containerId}`).selectAll('*').remove();
  
  // Get container dimensions dynamically
  const container = d3.select(`#${containerId}`);
  const containerRect = container.node().getBoundingClientRect();
  const width = Math.max(containerRect.width, 400);
  const height = 400; // Plus de hauteur pour le titre
  const radius = Math.min(width - 60, height - 100) / 2; // Plus d'espace

  // Couleurs plus distinctes et professionnelles
  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.name))
    .range(['#2563eb', '#059669', '#dc2626', '#7c3aed', '#ea580c', '#0891b2']);

  // Créer un div pour le tooltip amélioré
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "d3-tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "rgba(0, 0, 0, 0.9)")
    .style("color", "white")
    .style("border-radius", "8px")
    .style("padding", "12px")
    .style("font-size", "13px")
    .style("font-weight", "500")
    .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
    .style("pointer-events", "none")
    .style("z-index", "1000");

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('max-width', '100%')
    .style('height', 'auto');

  // Ajouter un titre si fourni avec gestion multi-lignes
  if (title) {
    const titleElement = svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#374151');
    
    // Diviser le titre si trop long
    const words = title.split(' ');
    if (words.length > 4) {
      const midpoint = Math.ceil(words.length / 2);
      titleElement.append('tspan')
        .attr('x', width / 2)
        .attr('dy', '0')
        .text(words.slice(0, midpoint).join(' '));
      titleElement.append('tspan')
        .attr('x', width / 2)
        .attr('dy', '1.2em')
        .text(words.slice(midpoint).join(' '));
    } else {
      titleElement.text(title);
    }
  }

  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2 + 10})`);

  const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  // Arc plus grand pour placer les labels
  const labelArc = d3.arc()
    .innerRadius(radius * 0.7)
    .outerRadius(radius * 0.7);

  const arcs = g.selectAll('arc')
    .data(pie(data))
    .enter()
    .append('g')
    .attr('class', 'arc');

  // Ajouter les sections avec interactions
  arcs.append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.name))
    .attr('stroke', 'white')
    .style('stroke-width', '2px')
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .style('opacity', 0.8)
        .attr('transform', 'scale(1.05)');
      tooltip
        .style("visibility", "visible")
        .html(`<div style="text-align: center;">
                 <strong>${d.data.name}</strong><br/>
                 ${d.data.value} structures<br/>
                 <span style="color: #fbbf24;">${d.data.percentage.toFixed(1)}%</span>
               </div>`);
    })
    .on('mousemove', function(event) {
      tooltip
        .style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on('mouseout', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .style('opacity', 1)
        .attr('transform', 'scale(1)');
      tooltip
        .style("visibility", "hidden");
    });

  // Ajouter les labels avec pourcentages
  arcs.append('text')
    .attr('transform', d => {
      if (d.data.percentage < 8) return 'translate(-1000,-1000)';
      const pos = labelArc.centroid(d);
      return `translate(${pos})`;
    })
    .attr('dy', '-0.1em')
    .style('text-anchor', 'middle')
    .style('font-size', '11px')
    .style('font-weight', '600')
    .style('fill', '#fff')
    .text(d => `${d.data.name}`);

  // Ajouter les pourcentages sous les labels
  arcs.append('text')
    .attr('transform', d => {
      if (d.data.percentage < 8) return 'translate(-1000,-1000)';
      const pos = labelArc.centroid(d);
      return `translate(${pos})`;
    })
    .attr('dy', '0.8em')
    .style('text-anchor', 'middle')
    .style('font-size', '10px')
    .style('fill', '#fff')
    .text(d => `${d.data.percentage.toFixed(1)}%`);

  // Légendes supprimées comme demandé

  return () => {
    tooltip.remove();
  };
};

// Fonction pour créer des histogrammes
const createHistogram = (data, containerId, title = '') => {
  d3.select(`#${containerId}`).selectAll('*').remove();
  
  const container = d3.select(`#${containerId}`);
  const containerRect = container.node().getBoundingClientRect();
  const width = Math.max(containerRect.width, 400);
  const height = 400;
  const margin = { top: 60, right: 30, bottom: 50, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('max-width', '100%')
    .style('height', 'auto');

  if (title) {
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(title);
  }

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Échelles
  const xScale = d3.scaleBand()
    .domain(data.map(d => d.name))
    .range([0, chartWidth])
    .padding(0.1);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
    .range([chartHeight, 0]);

  // Barres
  g.selectAll('.bar')
    .data(data)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', d => xScale(d.name))
    .attr('y', d => yScale(d.value))
    .attr('width', xScale.bandwidth())
    .attr('height', d => chartHeight - yScale(d.value))
    .attr('fill', '#2563eb')
    .attr('stroke', 'white')
    .style('stroke-width', '1px');

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale))
    .selectAll('text')
    .style('font-size', '10px')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end');

  g.append('g')
    .call(d3.axisLeft(yScale))
    .selectAll('text')
    .style('font-size', '10px');
};

// Charger les données au montage
const loadAllData = async () => {
  loading.value = true
  error.value = null
  
  try {
    const [pdbResults, vdjdbResults] = await Promise.all([
      loadStructuresData('pdb'),
      loadStructuresData('vdjdb')
    ])
    
    pdbData.value = pdbResults
    vdjdbData.value = vdjdbResults
  } catch (err) {
    error.value = err.message
    console.error('Error loading data:', err)
  } finally {
    loading.value = false
  }
}

// Watch pour créer les graphiques quand les données sont prêtes
watch(
  [vdjdbStats, pdbStats, vdjdbMhcStats, pdbMhcStats, vdjdbSpeciesStats, confidenceStats],
  () => {
    if (vdjdbStats.value.length && pdbStats.value.length) {
      // Supprimer tous les tooltips existants
      d3.selectAll('.d3-tooltip').remove();
      
      setTimeout(() => {
        // Graphiques de distribution Locus avec titres
        createPieChart(vdjdbStats.value, 'vdjdb-pie-stats', `VDJdb Locus Distribution (${vdjdbData.value.length} total)`);
        createPieChart(pdbStats.value, 'pdb-pie-stats', `PDB Locus Distribution (${pdbData.value.length} total)`);
        
        // Graphiques MHC par Locus avec titres
        vdjdbMhcStats.value.forEach(stat => {
          const totalForLocus = stat.counts.reduce((sum, c) => sum + c.value, 0);
          createPieChart(stat.counts, `vdjdb-mhc-stats-${stat.locus}`, `VDJdb ${stat.locus} MHC Distribution (${totalForLocus} structures)`);
        });
        
        pdbMhcStats.value.forEach(stat => {
          const totalForLocus = stat.counts.reduce((sum, c) => sum + c.value, 0);
          createPieChart(stat.counts, `pdb-mhc-stats-${stat.locus}`, `PDB ${stat.locus} MHC Distribution (${totalForLocus} structures)`);
        });
        
        // Graphique de distribution des pathogènes
        if (vdjdbSpeciesStats.value.length) {
          createPieChart(vdjdbSpeciesStats.value, 'vdjdb-species-stats', 'VDJdb Pathogen Distribution');
        }
        
        // Graphiques des scores de qualité
        if (confidenceStats.value.length) {
          createPieChart(confidenceStats.value, 'confidence-stats', 'VDJdb Confidence Score Distribution');
        }
        if (tcrModelScoreStats.value.length) {
          createHistogram(tcrModelScoreStats.value, 'tcrmodel-score-stats', 'TCRmodel2 Score Distribution (0.6-1.0)');
        }
      }, 100);
    }
  }
);

const openTutorial = () => {
  localStorage.setItem('tutorialSection', 'section-interface');
  window.open(window.location.origin + '?openTutorial=true', '_blank');
}

onMounted(() => {
  loadAllData()
})
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-6">
          <div class="d-flex align-center">
            <v-icon size="large" color="primary" class="mr-3">mdi-chart-pie</v-icon>
            <div>
              <h1 class="text-h4 font-weight-bold">Database Statistics</h1>
              <p class="text-subtitle-1 text-grey-darken-1 mb-0">Visual analysis of HLA structure distributions</p>
            </div>
          </div>
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
            Learn about database statistics
          </v-tooltip>
        </div>
        
        <!-- Infobulle explicative -->
        <v-alert 
          type="info" 
          variant="tonal" 
          density="compact"
          class="mb-4"
        >
          <template #prepend>
            <v-icon>mdi-information-outline</v-icon>
          </template>
          <div class="d-flex align-center">
            <span>
              "<strong>VDJdb
                Structures</strong>": Structures generated with 
              <a 
                href="https://academic.oup.com/nar/article/51/W1/W569/7151345" 
                target="_blank" 
                class="text-primary text-decoration-none font-weight-medium"
              >
                TCRmodel2
              </a>
              from sequences extracted from the 
              <a 
                href="https://vdjdb.cdr3.net/" 
                target="_blank" 
                class="text-primary text-decoration-none font-weight-medium"
              >
                VDJdb
              </a>
              database
            </span>
          </div>
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-if="error">
      <v-col cols="12">
        <v-alert type="error" variant="outlined">
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="text-subtitle-1 mt-4">Loading statistics data...</p>
      </v-col>
    </v-row>

    <v-row v-if="!loading && !error">
      <!-- Vue d'ensemble -->
      <v-col cols="12" class="mb-4">
        <v-card variant="outlined">
          <v-card-text class="pa-4">
            <v-row align="center">
              <v-col cols="auto">
                <v-icon size="48" color="primary">mdi-database</v-icon>
              </v-col>
              <v-col>
                <div class="d-flex gap-6">
                  <div class="text-center">
                    <div class="text-h3 font-weight-bold text-primary">{{ vdjdbData.length }}</div>
                    <div class="text-subtitle-2 text-grey-darken-1">VDJdb Structures</div>
                  </div>
                  <div class="text-center">
                    <div class="text-h3 font-weight-bold text-success">{{ pdbData.length }}</div>
                    <div class="text-subtitle-2 text-grey-darken-1">PDB Structures</div>
                  </div>
                  <div class="text-center">
                    <div class="text-h3 font-weight-bold text-info">{{ vdjdbData.length + pdbData.length }}</div>
                    <div class="text-subtitle-2 text-grey-darken-1">Total Structures</div>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Graphiques principaux -->
      <v-col cols="12" md="6">
        <v-card class="h-100">
          <v-card-text class="pa-2">
            <div class="chart-container">
              <div id="vdjdb-pie-stats" style="width: 100%; height: 400px;"></div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="6">
        <v-card class="h-100">
          <v-card-text class="pa-2">
            <div class="chart-container">
              <div id="pdb-pie-stats" style="width: 100%; height: 400px;"></div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- MHC Distribution par Locus - Ordre A puis B -->
      <!-- VDJdb A -->
      <template v-for="stat in vdjdbMhcStats.filter(s => s.locus === 'A')" :key="`vdjdb-stats-${stat.locus}`">
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-text class="pa-2">
              <div class="chart-container">
                <div :id="`vdjdb-mhc-stats-${stat.locus}`" style="width: 100%; height: 400px;"></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </template>

      <!-- VDJdb B -->
      <template v-for="stat in vdjdbMhcStats.filter(s => s.locus === 'B')" :key="`vdjdb-stats-${stat.locus}`">
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-text class="pa-2">
              <div class="chart-container">
                <div :id="`vdjdb-mhc-stats-${stat.locus}`" style="width: 100%; height: 400px;"></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </template>

      <!-- PDB A -->
      <template v-for="stat in pdbMhcStats.filter(s => s.locus === 'A')" :key="`pdb-stats-${stat.locus}`">
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-text class="pa-2">
              <div class="chart-container">
                <div :id="`pdb-mhc-stats-${stat.locus}`" style="width: 100%; height: 400px;"></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </template>

      <!-- PDB B -->
      <template v-for="stat in pdbMhcStats.filter(s => s.locus === 'B')" :key="`pdb-stats-${stat.locus}`">
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-text class="pa-2">
              <div class="chart-container">
                <div :id="`pdb-mhc-stats-${stat.locus}`" style="width: 100%; height: 400px;"></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </template>

      <!-- Nouvelle section: Statistiques des pathogènes -->
      <v-col cols="12" class="mt-8">
        <v-divider class="mb-4"></v-divider>
        <div class="d-flex align-center mb-4">
          <v-icon color="success" class="mr-2">mdi-bacteria</v-icon>
          <h2 class="text-h5 font-weight-bold">Pathogen Analysis</h2>
        </div>
      </v-col>

      <!-- Graphique de distribution des pathogènes -->
      <v-col cols="12" md="6" v-if="vdjdbSpeciesStats.length">
        <v-card class="h-100">
          <v-card-text class="pa-2">
            <div class="chart-container">
              <div id="vdjdb-species-stats" style="width: 100%; height: 400px;"></div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Section des métriques de qualité -->
      <v-col cols="12" class="mt-6">
        <v-divider class="mb-4"></v-divider>
        <div class="d-flex align-center mb-4">
          <v-icon color="info" class="mr-2">mdi-chart-line</v-icon>
          <h2 class="text-h5 font-weight-bold">Quality Metrics</h2>
        </div>
      </v-col>

      <!-- Graphiques des scores de qualité -->
      <v-col cols="12" md="6" v-if="confidenceStats.length">
        <v-card class="h-100">
          <v-card-text class="pa-2">
            <div class="chart-container">
              <div id="confidence-stats" style="width: 100%; height: 400px;"></div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="6" v-if="tcrModelScoreStats.length">
        <v-card class="h-100">
          <v-card-text class="pa-2">
            <div class="chart-container">
              <div id="tcrmodel-score-stats" style="width: 100%; height: 400px;"></div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 400px;
}

.chart-container svg {
  max-width: 100%;
  height: auto;
}

.gap-6 {
  gap: 2rem;
}
</style>