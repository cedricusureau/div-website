<template>
  <div class="position-selector">
    <!-- Locus Selection -->
    <div class="mb-4">
      <label class="text-subtitle-1 font-weight-bold mb-2 d-block">Locus HLA</label>
      <v-radio-group
        :model-value="locus"
        @update:model-value="handleLocusChange"
        inline
        hide-details
      >
        <v-radio label="HLA-A" value="A"></v-radio>
        <v-radio label="HLA-B" value="B"></v-radio>
      </v-radio-group>
    </div>

    <!-- Position Slider -->
    <div class="mb-4">
      <label class="text-subtitle-1 font-weight-bold mb-2 d-block">
        Position: {{ position }}:{{ locus }}
      </label>
      <v-slider
        :model-value="position"
        @update:model-value="handlePositionChange"
        :min="1"
        :max="182"
        :step="1"
        thumb-label
        :disabled="loading"
        color="primary"
      >
        <template v-slot:append>
          <v-text-field
            :model-value="position"
            @update:model-value="handlePositionInputChange"
            type="number"
            :min="1"
            :max="182"
            style="width: 80px"
            density="compact"
            hide-details
            variant="outlined"
            :disabled="loading"
          ></v-text-field>
        </template>
      </v-slider>
    </div>

    <!-- Mini Bar Chart Preview -->
    <div class="preview-chart-container">
      <label class="text-subtitle-1 font-weight-bold mb-2 d-block">
        Aperçu du nombre de mesures par position (Locus {{ locus }})
      </label>
      <div ref="chartContainer" class="preview-chart"></div>
    </div>
  </div>
</template>

<script setup>
/* eslint-disable no-undef */
import { ref, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { positionDistancesService } from '../../../services/positionDistancesService'

const props = defineProps({
  locus: {
    type: String,
    default: 'A'
  },
  position: {
    type: Number,
    default: 45
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:locus', 'update:position', 'update'])

const chartContainer = ref(null)
const positionCounts = ref([])
const chartLoading = ref(false)

/**
 * Charge les comptages de positions pour le locus actuel
 */
const loadPositionCounts = async () => {
  chartLoading.value = true
  try {
    const counts = await positionDistancesService.getPositionCountsByLocus(props.locus)
    positionCounts.value = counts
    await nextTick()
    renderChart()
  } catch (error) {
    console.error('Erreur chargement position counts:', error)
  } finally {
    chartLoading.value = false
  }
}

/**
 * Render le mini bar chart avec D3
 */
const renderChart = () => {
  if (!chartContainer.value || positionCounts.value.length === 0) return

  // Clear previous chart
  d3.select(chartContainer.value).selectAll('*').remove()

  const margin = { top: 10, right: 10, bottom: 30, left: 40 }
  const width = chartContainer.value.clientWidth - margin.left - margin.right
  const height = 120 - margin.top - margin.bottom

  const svg = d3.select(chartContainer.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // Scales
  const x = d3.scaleLinear()
    .domain([1, 182])
    .range([0, width])

  const y = d3.scaleLinear()
    .domain([0, d3.max(positionCounts.value, d => d.count)])
    .range([height, 0])

  // Bars
  svg.selectAll('.bar')
    .data(positionCounts.value)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.position))
    .attr('y', d => y(d.count))
    .attr('width', Math.max(1, width / 182))
    .attr('height', d => height - y(d.count))
    .attr('fill', d => d.position === props.position ? '#1976D2' : '#BDBDBD')
    .attr('opacity', 0.8)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      handlePositionChange(d.position)
    })
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('opacity', 1)
        .attr('fill', '#1976D2')

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
        .html(`Position ${d.position}: ${d.count} mesures`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .attr('opacity', 0.8)
        .attr('fill', d.position === props.position ? '#1976D2' : '#BDBDBD')

      d3.selectAll('.chart-tooltip').remove()
    })

  // X Axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(10))
    .selectAll('text')
    .style('font-size', '10px')

  // Y Axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .style('font-size', '10px')

  // Labels
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 5)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .text('Position')

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 12)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .text('Mesures')
}

/**
 * Handlers
 */
const handleLocusChange = (newLocus) => {
  emit('update:locus', newLocus)
  emit('update')
}

const handlePositionChange = (newPosition) => {
  const pos = parseInt(newPosition)
  if (pos >= 1 && pos <= 182) {
    emit('update:position', pos)
    emit('update')
  }
}

const handlePositionInputChange = (value) => {
  const pos = parseInt(value)
  if (!isNaN(pos)) {
    handlePositionChange(pos)
  }
}

/**
 * Watchers
 */
watch(() => props.locus, () => {
  loadPositionCounts()
})

watch(() => props.position, () => {
  renderChart()
})

/**
 * Lifecycle
 */
onMounted(() => {
  loadPositionCounts()

  // Re-render on window resize
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
  name: 'PositionSelector'
}
</script>

<style scoped>
.position-selector {
  width: 100%;
}

.preview-chart-container {
  margin-top: 24px;
}

.preview-chart {
  width: 100%;
  min-height: 120px;
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 8px;
}
</style>
