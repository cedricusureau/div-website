<template>
  <div class="global-distribution-chart">
    <!-- Stats Summary -->
    <div class="stats-summary mb-4">
      <v-chip class="mr-2" size="small">n = {{ stats.n }}</v-chip>
      <v-chip class="mr-2" size="small">Mean: {{ stats.mean }} Å</v-chip>
      <v-chip class="mr-2" size="small">Median: {{ stats.median }} Å</v-chip>
      <v-chip class="mr-2" size="small">Std: {{ stats.std }} Å</v-chip>
      <v-chip class="mr-2" size="small">Min: {{ stats.min }} Å</v-chip>
      <v-chip class="mr-2" size="small">Max: {{ stats.max }} Å</v-chip>
    </div>

    <!-- Chart Container -->
    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup>
/* eslint-disable no-undef */
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import * as d3 from 'd3'
import { positionDistancesService } from '../../../services/positionDistancesService'

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  position: {
    type: String,
    required: true
  }
})

const chartContainer = ref(null)

// Dédupliquer par structure_id (chaque structure a 2 mesures: Peptide + TCR)
// On garde la distance minimale par structure
const uniqueDistances = computed(() => {
  const byStructure = {}
  props.data.forEach(d => {
    const structureId = d.structure_id
    if (!byStructure[structureId] || d.min_distance < byStructure[structureId]) {
      byStructure[structureId] = d.min_distance
    }
  })
  return Object.values(byStructure)
})

// Calculer les stats sur les distances dédupliquées
const stats = computed(() => {
  return positionDistancesService.calculateStats(uniqueDistances.value)
})

/**
 * Render le graphique D3
 */
const renderChart = () => {
  if (!chartContainer.value || uniqueDistances.value.length === 0) return

  // Clear previous chart
  d3.select(chartContainer.value).selectAll('*').remove()

  const distances = uniqueDistances.value

  // Calculer KDE et histogramme
  const kde = positionDistancesService.calculateKDE(distances)
  const histogram = positionDistancesService.calculateHistogram(distances, 30)

  // Dimensions
  const margin = { top: 20, right: 30, bottom: 50, left: 60 }
  const width = chartContainer.value.clientWidth - margin.left - margin.right
  const height = 400 - margin.top - margin.bottom

  const svg = d3.select(chartContainer.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // Scales - Fixed domain [0, 15] Å
  const x = d3.scaleLinear()
    .domain([0, 15])
    .range([0, width])

  const yHist = d3.scaleLinear()
    .domain([0, d3.max(histogram, d => d.count)])
    .range([height, 0])

  const yKde = d3.scaleLinear()
    .domain([0, d3.max(kde.y) * 1.1])
    .range([height, 0])

  // Histogram bars (background)
  svg.selectAll('.hist-bar')
    .data(histogram)
    .enter()
    .append('rect')
    .attr('class', 'hist-bar')
    .attr('x', d => x(d.x0))
    .attr('y', d => yHist(d.count))
    .attr('width', d => Math.max(1, x(d.x1) - x(d.x0) - 1))
    .attr('height', d => height - yHist(d.count))
    .attr('fill', '#E0E0E0')
    .attr('opacity', 0.5)
    .on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 0.8)

      // Tooltip
      const tooltip = d3.select('body').append('div')
        .attr('class', 'chart-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0,0,0,0.8)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '9999')
        .html(`${d.x0.toFixed(1)} - ${d.x1.toFixed(1)} Å<br/>Structures: ${d.count}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.5)
      d3.selectAll('.chart-tooltip').remove()
    })

  // KDE curve (foreground)
  const line = d3.line()
    .x(d => x(d.x))
    .y(d => yKde(d.y))
    .curve(d3.curveBasis)

  // Filter KDE data to [0, 15] range
  const kdeData = kde.x.map((x, i) => ({ x, y: kde.y[i] }))
    .filter(d => d.x >= 0 && d.x <= 15)

  svg.append('path')
    .datum(kdeData)
    .attr('class', 'kde-line')
    .attr('fill', 'none')
    .attr('stroke', '#1976D2')
    .attr('stroke-width', 2.5)
    .attr('d', line)

  // Area under KDE
  const area = d3.area()
    .x(d => x(d.x))
    .y0(height)
    .y1(d => yKde(d.y))
    .curve(d3.curveBasis)

  svg.append('path')
    .datum(kdeData)
    .attr('class', 'kde-area')
    .attr('fill', '#1976D2')
    .attr('opacity', 0.2)
    .attr('d', area)

  // X Axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(10))
    .selectAll('text')
    .style('font-size', '12px')

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 40)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .text('Minimum distance (Å)')

  // Y Axis (KDE)
  svg.append('g')
    .call(d3.axisLeft(yKde).ticks(8))
    .selectAll('text')
    .style('font-size', '12px')

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .text('Density')

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .text(`Global distribution - Position ${props.position}`)
}

/**
 * Watchers
 */
watch(() => props.data, async () => {
  await nextTick()
  renderChart()
}, { deep: true })

/**
 * Lifecycle
 */
onMounted(() => {
  renderChart()
  window.addEventListener('resize', renderChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', renderChart)
  d3.selectAll('.chart-tooltip').remove()
})
</script>

<script>
import { onUnmounted } from 'vue'
export default {
  name: 'GlobalDistributionChart'
}
</script>

<style scoped>
.global-distribution-chart {
  width: 100%;
}

.stats-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chart-container {
  width: 100%;
  min-height: 400px;
}
</style>
