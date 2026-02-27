<template>
  <div class="amino-acid-breakdown-chart">
    <!-- Legend -->
    <div class="legend mb-4">
      <v-chip
        v-for="aa in aminoAcids"
        :key="aa.name"
        :color="aa.visible ? aa.color : 'grey'"
        class="mr-2 mb-2"
        size="small"
        @click="toggleAminoAcid(aa.name)"
        style="cursor: pointer"
      >
        <v-icon left size="small">{{ aa.visible ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
        {{ aa.name }} (n={{ aa.count }})
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

// Palette de couleurs catégorielle
const colorScale = d3.scaleOrdinal(d3.schemeCategory10)

// Grouper les données par acide aminé
const dataByAminoAcid = computed(() => {
  const grouped = {}
  props.data.forEach(d => {
    if (!grouped[d.aa]) {
      grouped[d.aa] = []
    }
    grouped[d.aa].push(d.min_distance)
  })
  return grouped
})

// Créer la liste des acides aminés avec leurs propriétés
const aminoAcids = computed(() => {
  return Object.keys(dataByAminoAcid.value)
    .sort()
    .map((aa, index) => ({
      name: aa,
      count: dataByAminoAcid.value[aa].length,
      color: colorScale(index),
      visible: true
    }))
})

// État réactif pour la visibilité
const visibilityState = reactive({})

// Initialiser la visibilité
watch(aminoAcids, (newAA) => {
  newAA.forEach(aa => {
    if (!(aa.name in visibilityState)) {
      visibilityState[aa.name] = true
    }
  })
}, { immediate: true })

/**
 * Toggle visibility of an amino acid
 */
const toggleAminoAcid = (aaName) => {
  visibilityState[aaName] = !visibilityState[aaName]
  const aa = aminoAcids.value.find(a => a.name === aaName)
  if (aa) {
    aa.visible = !aa.visible
  }
  renderChart()
}

/**
 * Render le graphique D3
 */
const renderChart = () => {
  if (!chartContainer.value || props.data.length === 0) return

  // Clear previous chart
  d3.select(chartContainer.value).selectAll('*').remove()

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

  // Calculer KDE pour chaque acide aminé visible
  const kdeDataArray = []
  let maxY = 0

  aminoAcids.value.forEach(aa => {
    if (aa.visible && dataByAminoAcid.value[aa.name]) {
      const kde = positionDistancesService.calculateKDE(dataByAminoAcid.value[aa.name])
      if (kde.x.length > 0) {
        kdeDataArray.push({
          aa: aa.name,
          color: aa.color,
          kde: kde.x.map((x, i) => ({ x, y: kde.y[i] }))
        })
        maxY = Math.max(maxY, ...kde.y)
      }
    }
  })

  if (kdeDataArray.length === 0) return

  // Scales
  const allDistances = props.data.map(d => d.min_distance)
  const x = d3.scaleLinear()
    .domain([0, d3.max(allDistances) * 1.1])
    .range([0, width])

  const y = d3.scaleLinear()
    .domain([0, maxY * 1.15])
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

  // Dessiner chaque KDE
  kdeDataArray.forEach(kdeData => {
    // Aire
    svg.append('path')
      .datum(kdeData.kde)
      .attr('class', `kde-area-${kdeData.aa}`)
      .attr('fill', kdeData.color)
      .attr('opacity', 0.2)
      .attr('d', area)
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 0.4)
        d3.select(`.kde-line-${kdeData.aa}`).attr('stroke-width', 3.5)
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.2)
        d3.select(`.kde-line-${kdeData.aa}`).attr('stroke-width', 2)
      })

    // Ligne
    svg.append('path')
      .datum(kdeData.kde)
      .attr('class', `kde-line-${kdeData.aa}`)
      .attr('fill', 'none')
      .attr('stroke', kdeData.color)
      .attr('stroke-width', 2)
      .attr('d', line)
      .on('mouseover', function() {
        d3.select(this).attr('stroke-width', 3.5)
        d3.select(`.kde-area-${kdeData.aa}`).attr('opacity', 0.4)

        // Tooltip
        const aaInfo = aminoAcids.value.find(a => a.name === kdeData.aa)
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
          .html(`${kdeData.aa}: ${aaInfo.count} structures`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 2)
        d3.select(`.kde-area-${kdeData.aa}`).attr('opacity', 0.2)
        d3.selectAll('.chart-tooltip').remove()
      })
  })

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
    .text(`Distribution par acide aminé - Position ${props.position}`)
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
  name: 'AminoAcidBreakdownChart'
}
</script>

<style scoped>
.amino-acid-breakdown-chart {
  width: 100%;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chart-container {
  width: 100%;
  min-height: 400px;
}
</style>
