<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { loadStructuresData } from '../../services/hlaStructuresService'
import * as d3 from 'd3'

const allStructures = ref([])
const loading = ref(true)
const error = ref(null)

// Statistiques par locus
const locusStats = computed(() => {
  if (!allStructures.value.length) return []

  const counts = {}
  allStructures.value.forEach(item => {
    counts[item.locus] = (counts[item.locus] || 0) + 1
  })

  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    percentage: (value / allStructures.value.length) * 100
  }))
})

// Statistiques par source (AF3 / TCRmodel2)
const sourceStats = computed(() => {
  if (!allStructures.value.length) return []

  const counts = {}
  allStructures.value.forEach(item => {
    counts[item.best_source] = (counts[item.best_source] || 0) + 1
  })

  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    percentage: (value / allStructures.value.length) * 100
  }))
})

// Statistiques par pathogène (top 10)
const pathogenStats = computed(() => {
  if (!allStructures.value.length) return []

  const speciesCounts = {}
  allStructures.value.forEach(item => {
    const species = item.peptide_species || 'Unknown'
    speciesCounts[species] = (speciesCounts[species] || 0) + 1
  })

  // Trier par fréquence et garder les top 10
  const sorted = Object.entries(speciesCounts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: (value / allStructures.value.length) * 100
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return sorted
})

// Statistiques MHC par locus (top 10 allèles par locus)
const mhcStatsByLocus = computed(() => {
  if (!allStructures.value.length) return []

  const statsByLocus = {}
  allStructures.value.forEach(item => {
    if (!statsByLocus[item.locus]) {
      statsByLocus[item.locus] = {}
    }
    statsByLocus[item.locus][item.allele] = (statsByLocus[item.locus][item.allele] || 0) + 1
  })

  return Object.entries(statsByLocus).map(([locus, alleleCounts]) => {
    const sortedAlleles = Object.entries(alleleCounts)
      .map(([allele, count]) => ({
        name: allele,
        value: count,
        percentage: (count / allStructures.value.length) * 100
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 allèles

    return {
      locus,
      counts: sortedAlleles
    }
  })
})

// Statistiques de qualité ipTM (histogramme)
const iptmStats = computed(() => {
  if (!allStructures.value.length) return []

  const bins = [
    { key: '0.60-0.65', min: 0.60, max: 0.65 },
    { key: '0.65-0.70', min: 0.65, max: 0.70 },
    { key: '0.70-0.75', min: 0.70, max: 0.75 },
    { key: '0.75-0.80', min: 0.75, max: 0.80 },
    { key: '0.80-0.85', min: 0.80, max: 0.85 },
    { key: '0.85-0.90', min: 0.85, max: 0.90 },
    { key: '0.90-0.95', min: 0.90, max: 0.95 },
    { key: '0.95-1.00', min: 0.95, max: 1.00 }
  ]

  const scoreCounts = {}
  bins.forEach(bin => {
    scoreCounts[bin.key] = 0
  })

  allStructures.value.forEach(item => {
    const score = parseFloat(item.best_iptm)
    if (score >= 0.6 && score <= 1.0) {
      const bin = bins.find(b => score >= b.min && (score < b.max || (b.max === 1.0 && score <= 1.0)))
      if (bin) {
        scoreCounts[bin.key]++
      }
    }
  })

  return bins.map(bin => ({
    name: bin.key,
    value: scoreCounts[bin.key],
    percentage: (scoreCounts[bin.key] / allStructures.value.length) * 100
  }))
})

// Fonction pour créer les camemberts
const createPieChart = (data, containerId, title = '') => {
  d3.select(`#${containerId}`).selectAll('*').remove()

  const width = 600
  const height = 400
  const radius = Math.min(300, height - 100) / 2

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.name))
    .range(['#2563eb', '#059669', '#dc2626', '#7c3aed', '#ea580c', '#0891b2', '#f59e0b', '#10b981'])

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
    .style("z-index", "1000")

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width)
    .attr('height', height)

  if (title) {
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(title)
  }

  const g = svg.append('g')
    .attr('transform', `translate(200, ${height / 2 + 20})`)

  const pie = d3.pie()
    .value(d => d.value)
    .sort(null)

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius)

  const arcs = g.selectAll('arc')
    .data(pie(data))
    .enter()
    .append('g')
    .attr('class', 'arc')

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
        .attr('transform', 'scale(1.05)')
      tooltip
        .style("visibility", "visible")
        .html(`<div style="text-align: center;">
                 <strong>${d.data.name}</strong><br/>
                 ${d.data.value} structures<br/>
                 <span style="color: #fbbf24;">${d.data.percentage.toFixed(1)}%</span>
               </div>`)
    })
    .on('mousemove', function(event) {
      tooltip
        .style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px")
    })
    .on('mouseout', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .style('opacity', 1)
        .attr('transform', 'scale(1)')
      tooltip.style("visibility", "hidden")
    })

  // Légende
  const legendX = radius + 20
  const legend = g.selectAll('.legend')
    .data(data.slice(0, 8))
    .enter()
    .append('g')
    .attr('class', 'legend')
    .attr('transform', (d, i) => `translate(${legendX}, ${-radius + i * 25})`)

  legend.append('rect')
    .attr('width', 18)
    .attr('height', 18)
    .attr('fill', d => color(d.name))
    .style('stroke', 'white')
    .style('stroke-width', 1)

  legend.append('text')
    .attr('x', 24)
    .attr('y', 14)
    .style('font-size', '12px')
    .style('fill', '#374151')
    .text(d => `${d.name}: ${d.value}`)

  return () => {
    tooltip.remove()
  }
}

// Fonction pour créer un histogramme
const createHistogram = (data, containerId, title = '') => {
  d3.select(`#${containerId}`).selectAll('*').remove()

  const margin = { top: 60, right: 30, bottom: 60, left: 60 }
  const width = 500 - margin.left - margin.right
  const height = 400 - margin.top - margin.bottom

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  if (title) {
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(title)
  }

  const x = d3.scaleBand()
    .range([0, width])
    .domain(data.map(d => d.name))
    .padding(0.2)

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end')
    .style('font-size', '10px')

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
    .range([height, 0])

  svg.append('g')
    .call(d3.axisLeft(y))

  svg.selectAll('bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', d => x(d.name))
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => height - y(d.value))
    .attr('fill', '#2196F3')
    .style('cursor', 'pointer')
    .on('mouseover', function() {
      d3.select(this).style('opacity', 0.7)
    })
    .on('mouseout', function() {
      d3.select(this).style('opacity', 1)
    })
}

// Watcher pour créer les charts quand les données changent
watch(allStructures, (newData) => {
  if (newData.length > 0) {
    setTimeout(() => {
      createPieChart(locusStats.value, 'locus-chart', 'Distribution by Locus')
      createPieChart(sourceStats.value, 'source-chart', 'Distribution by Source')
      createPieChart(pathogenStats.value, 'pathogen-chart', 'Top 10 Species')
      createHistogram(iptmStats.value, 'iptm-chart', 'ipTM Distribution (Quality)')

      // Charts MHC per locus
      mhcStatsByLocus.value.forEach(stat => {
        createPieChart(stat.counts, `mhc-${stat.locus}-chart`, `HLA-${stat.locus} Top 10 Alleles`)
      })
    }, 100)
  }
}, { deep: true })

// Charger les données
const loadAllData = async () => {
  loading.value = true
  try {
    allStructures.value = await loadStructuresData()
    console.log(`${allStructures.value.length} structures chargées pour les statistiques`)
  } catch (err) {
    error.value = err.message
    console.error('Erreur de chargement:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAllData()
})
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <v-icon color="primary" class="mr-2">mdi-chart-bar</v-icon>
          <h1 class="text-h5 font-weight-bold mb-0">Structure Statistics</h1>
        </div>
        <v-divider class="mb-6"></v-divider>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="mt-4">Loading data...</p>
      </v-col>
    </v-row>

    <!-- Error -->
    <v-row v-if="error">
      <v-col cols="12">
        <v-alert type="error">{{ error }}</v-alert>
      </v-col>
    </v-row>

    <!-- Statistiques générales -->
    <v-row v-if="!loading && !error">
      <v-col cols="12" md="3">
        <v-card color="primary" dark elevation="3">
          <v-card-text>
            <div class="text-h3 mb-2">{{ allStructures.length }}</div>
            <div class="text-subtitle-1">Total Structures</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card color="blue" dark elevation="3">
          <v-card-text>
            <div class="text-h3 mb-2">{{ locusStats.find(s => s.name === 'A')?.value || 0 }}</div>
            <div class="text-subtitle-1">HLA-A Structures</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card color="green" dark elevation="3">
          <v-card-text>
            <div class="text-h3 mb-2">{{ locusStats.find(s => s.name === 'B')?.value || 0 }}</div>
            <div class="text-subtitle-1">HLA-B Structures</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card color="purple" dark elevation="3">
          <v-card-text>
            <div class="text-h3 mb-2">{{ pathogenStats.length }}</div>
            <div class="text-subtitle-1">Distinct Species</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Charts -->
    <v-row v-if="!loading && !error" class="mt-4">
      <v-col cols="12">
        <h2 class="text-h6 mb-4">Distributions</h2>
      </v-col>

      <!-- Locus et Source -->
      <v-col cols="12" md="6">
        <v-card elevation="2">
          <v-card-text>
            <div id="locus-chart" style="min-height: 400px;"></div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card elevation="2">
          <v-card-text>
            <div id="source-chart" style="min-height: 400px;"></div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Pathogènes -->
      <v-col cols="12" md="6">
        <v-card elevation="2">
          <v-card-text>
            <div id="pathogen-chart" style="min-height: 400px;"></div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- ipTM Quality -->
      <v-col cols="12" md="6">
        <v-card elevation="2">
          <v-card-text>
            <div id="iptm-chart" style="min-height: 400px;"></div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- MHC Alleles per locus -->
      <v-col cols="12">
        <h2 class="text-h6 mt-6 mb-4">MHC Alleles Distribution</h2>
      </v-col>

      <v-col cols="12" md="6" v-for="stat in mhcStatsByLocus" :key="stat.locus">
        <v-card elevation="2">
          <v-card-text>
            <div :id="`mhc-${stat.locus}-chart`" style="min-height: 400px;"></div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.v-card {
  transition: transform 0.2s;
}

.v-card:hover {
  transform: translateY(-4px);
}
</style>
