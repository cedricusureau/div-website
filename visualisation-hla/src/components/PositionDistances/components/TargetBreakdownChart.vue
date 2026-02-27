<template>
  <div class="target-breakdown-chart">
    <!-- Legend -->
    <div class="legend mb-4">
      <v-chip
        :color="targets.Peptide.visible ? targets.Peptide.color : 'grey'"
        class="mr-2"
        @click="toggleTarget('Peptide')"
        style="cursor: pointer"
      >
        <v-icon left size="small">{{ targets.Peptide.visible ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
        Peptide (n={{ peptideCount }})
      </v-chip>
      <v-chip
        :color="targets.TCR.visible ? targets.TCR.color : 'grey'"
        @click="toggleTarget('TCR')"
        style="cursor: pointer"
      >
        <v-icon left size="small">{{ targets.TCR.visible ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
        TCR (n={{ tcrCount }})
      </v-chip>
    </div>

    <!-- Chart Container -->
    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup>
/* eslint-disable no-undef */
import { ref, onMounted, watch, nextTick, computed, reactive } from 'vue'
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

const targets = reactive({
  Peptide: {
    color: '#2196F3',
    visible: true
  },
  TCR: {
    color: '#F44336',
    visible: true
  }
})

// Séparer les données par target
const peptideData = computed(() =>
  props.data.filter(d => d.target === 'Peptide').map(d => d.min_distance)
)

const tcrData = computed(() =>
  props.data.filter(d => d.target === 'TCR').map(d => d.min_distance)
)

const peptideCount = computed(() => peptideData.value.length)
const tcrCount = computed(() => tcrData.value.length)

/**
 * Toggle visibility of a target
 */
const toggleTarget = (target) => {
  targets[target].visible = !targets[target].visible
  renderChart()
}

/**
 * Render le graphique D3
 */
const renderChart = () => {
  if (!chartContainer.value || props.data.length === 0) return

  // Clear previous chart
  d3.select(chartContainer.value).selectAll('*').remove()

  // Calculer KDE pour chaque target
  const peptideKde = positionDistancesService.calculateKDE(peptideData.value)
  const tcrKde = positionDistancesService.calculateKDE(tcrData.value)

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

  // Scales
  const allDistances = [...peptideData.value, ...tcrData.value]
  const x = d3.scaleLinear()
    .domain([0, d3.max(allDistances) * 1.1])
    .range([0, width])

  const allYValues = [...peptideKde.y, ...tcrKde.y]
  const y = d3.scaleLinear()
    .domain([0, d3.max(allYValues) * 1.15])
    .range([height, 0])

  // Ligne et aire pour KDE
  const line = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.y))
    .curve(d3.curveBasis)

  const area = d3.area()
    .x(d => x(d.x))
    .y0(height)
    .y1(d => y(d.y))
    .curve(d3.curveBasis)

  // Peptide KDE
  if (targets.Peptide.visible && peptideData.value.length > 0) {
    const peptideKdeData = peptideKde.x.map((x, i) => ({ x, y: peptideKde.y[i] }))

    svg.append('path')
      .datum(peptideKdeData)
      .attr('class', 'kde-area-peptide')
      .attr('fill', targets.Peptide.color)
      .attr('opacity', 0.3)
      .attr('d', area)

    svg.append('path')
      .datum(peptideKdeData)
      .attr('class', 'kde-line-peptide')
      .attr('fill', 'none')
      .attr('stroke', targets.Peptide.color)
      .attr('stroke-width', 2.5)
      .attr('d', line)
  }

  // TCR KDE
  if (targets.TCR.visible && tcrData.value.length > 0) {
    const tcrKdeData = tcrKde.x.map((x, i) => ({ x, y: tcrKde.y[i] }))

    svg.append('path')
      .datum(tcrKdeData)
      .attr('class', 'kde-area-tcr')
      .attr('fill', targets.TCR.color)
      .attr('opacity', 0.3)
      .attr('d', area)

    svg.append('path')
      .datum(tcrKdeData)
      .attr('class', 'kde-line-tcr')
      .attr('fill', 'none')
      .attr('stroke', targets.TCR.color)
      .attr('stroke-width', 2.5)
      .attr('d', line)
  }

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
    .text('Distance minimale (Å)')

  // Y Axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(8))
    .selectAll('text')
    .style('font-size', '12px')

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .text('Densité')

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .text(`Comparaison Peptide vs TCR - Position ${props.position}`)

  // Stats annotations
  if (targets.Peptide.visible && peptideData.value.length > 0) {
    const peptideStats = positionDistancesService.calculateStats(peptideData.value)
    svg.append('text')
      .attr('x', width - 10)
      .attr('y', 20)
      .attr('text-anchor', 'end')
      .style('font-size', '12px')
      .style('fill', targets.Peptide.color)
      .text(`Peptide: μ=${peptideStats.mean}Å, σ=${peptideStats.std}Å`)
  }

  if (targets.TCR.visible && tcrData.value.length > 0) {
    const tcrStats = positionDistancesService.calculateStats(tcrData.value)
    svg.append('text')
      .attr('x', width - 10)
      .attr('y', 40)
      .attr('text-anchor', 'end')
      .style('font-size', '12px')
      .style('fill', targets.TCR.color)
      .text(`TCR: μ=${tcrStats.mean}Å, σ=${tcrStats.std}Å`)
  }
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
})
</script>

<script>
import { onUnmounted } from 'vue'
export default {
  name: 'TargetBreakdownChart'
}
</script>

<style scoped>
.target-breakdown-chart {
  width: 100%;
}

.legend {
  display: flex;
  gap: 8px;
}

.chart-container {
  width: 100%;
  min-height: 400px;
}
</style>
