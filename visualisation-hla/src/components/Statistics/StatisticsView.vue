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

// Fonction améliorée pour créer les camemberts
const createPieChart = (data, containerId, title = '') => {
  // Clear previous chart
  d3.select(`#${containerId}`).selectAll('*').remove();

  const width = 320;
  const height = 340;
  const radius = Math.min(width, height - 40) / 2 * 0.8;

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
    .attr('height', height);

  // Ajouter un titre si fourni
  if (title) {
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(title);
  }

  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

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
  [vdjdbStats, pdbStats, vdjdbMhcStats, pdbMhcStats],
  ([newVdjdbStats, newPdbStats, newVdjdbMhcStats, newPdbMhcStats]) => {
    if (newVdjdbStats.length && newPdbStats.length) {
      // Supprimer tous les tooltips existants
      d3.selectAll('.d3-tooltip').remove();
      
      setTimeout(() => {
        // Graphiques de distribution Locus avec titres
        createPieChart(newVdjdbStats, 'vdjdb-pie-stats', `VDJdb Locus Distribution (${vdjdbData.value.length} total)`);
        createPieChart(newPdbStats, 'pdb-pie-stats', `PDB Locus Distribution (${pdbData.value.length} total)`);
        
        // Graphiques MHC par Locus avec titres
        newVdjdbMhcStats.forEach(stat => {
          const totalForLocus = stat.counts.reduce((sum, c) => sum + c.value, 0);
          createPieChart(stat.counts, `vdjdb-mhc-stats-${stat.locus}`, `VDJdb ${stat.locus} MHC Distribution (${totalForLocus} structures)`);
        });
        
        newPdbMhcStats.forEach(stat => {
          const totalForLocus = stat.counts.reduce((sum, c) => sum + c.value, 0);
          createPieChart(stat.counts, `pdb-mhc-stats-${stat.locus}`, `PDB ${stat.locus} MHC Distribution (${totalForLocus} structures)`);
        });
      }, 100);
    }
  }
);

onMounted(() => {
  loadAllData()
})
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-6">
          <v-icon size="large" color="primary" class="mr-3">mdi-chart-pie</v-icon>
          <div>
            <h1 class="text-h4 font-weight-bold">Database Statistics</h1>
            <p class="text-subtitle-1 text-grey-darken-1 mb-0">Visual analysis of HLA structure distributions</p>
          </div>
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
              <div id="vdjdb-pie-stats" style="width: 100%; height: 340px;"></div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="6">
        <v-card class="h-100">
          <v-card-text class="pa-2">
            <div class="chart-container">
              <div id="pdb-pie-stats" style="width: 100%; height: 340px;"></div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- MHC Distribution par Locus -->
      <template v-for="stat in vdjdbMhcStats" :key="`vdjdb-stats-${stat.locus}`">
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-text class="pa-2">
              <div class="chart-container">
                <div :id="`vdjdb-mhc-stats-${stat.locus}`" style="width: 100%; height: 340px;"></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </template>

      <template v-for="stat in pdbMhcStats" :key="`pdb-stats-${stat.locus}`">
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-text class="pa-2">
              <div class="chart-container">
                <div :id="`pdb-mhc-stats-${stat.locus}`" style="width: 100%; height: 340px;"></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </template>
    </v-row>
  </v-container>
</template>

<style scoped>
.chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.gap-6 {
  gap: 2rem;
}
</style>