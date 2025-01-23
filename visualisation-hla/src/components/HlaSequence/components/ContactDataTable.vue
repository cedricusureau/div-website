<template>
    <div class="contact-data-visualization">
      <div class="visualization-header">
        <h2 class="text-lg md:text-xl font-semibold text-gray-800 mb-2 md:mb-4 text-center">
          Contact Analysis for Position {{ selectedPosition }}
        </h2>
      </div>
    
      <div class="charts-container flex-col md:flex-row">
        <!-- TCR Chart -->
        <div class="chart-wrapper">
          <h3 class="text-center text-gray-700 font-medium mb-2">TCR</h3>
          <div id="tcr-pie" class="pie-chart-container"></div>
          <p class="text-xs text-gray-600 mt-1 md:mt-2 text-center">
            Position {{ selectedPosition }} is within {{ threshold }}Å of TCR in 
            {{ getTCRPercentage }}% of structures
          </p>
        </div>
    
        <!-- Peptide Chart -->
        <div class="chart-wrapper">
          <h3 class="text-center text-gray-700 font-medium mb-2">Peptide</h3>
          <div id="peptide-pie" class="pie-chart-container"></div>
          <p class="text-xs text-gray-600 mt-1 md:mt-2 text-center">
            Position {{ selectedPosition }} is within {{ threshold }}Å of peptide in 
            {{ getPeptidePercentage }}% of structures
          </p>
        </div>
      </div>
    </div>
  </template>
    
  <script>
  import { onMounted, onBeforeUnmount, watch, computed, ref } from 'vue';
  import * as d3 from 'd3';
  
  export default {
    name: 'ContactDataTable',
    props: {
      filteredContactData: {
        type: Array,
        required: true
      },
      totalStructures: {
        type: Number,
        required: true
      },
      threshold: {
        type: Number,
        required: true,
        default: 3
      },
      selectedPosition: {
        type: [String, Number],
        required: true
      }
    },
    setup(props) {
      // Responsive sizing with smaller defaults
      const width = ref(250);
      const height = ref(200);
      
      // Update chart dimensions based on screen size
      const updateChartDimensions = () => {
        // Adjust width based on container size
        const container = document.querySelector('.chart-wrapper');
        if (container) {
          width.value = Math.min(container.clientWidth - 30, 350);
          height.value = width.value * 0.8;
        }
      };
      
      // Reactive radius calculation
      const radius = computed(() => Math.min(width.value, height.value) / 2.5);
      
      // Couleurs distinctes pour chaque type
      const colorTCR = d3.scaleOrdinal(['#6366f1', '#e2e8f0']);
      const colorPeptide = d3.scaleOrdinal(['#10b981', '#e2e8f0']);
    
      // Calcul des pourcentages pour les descriptions
      const getTCRPercentage = computed(() => {
        const tcrStructures = new Set(
          props.filteredContactData
            .filter(d => d.InteractingChains.includes('TCRA') || d.InteractingChains.includes('TCRB'))
            .map(d => d.Structure)
        ).size;
        return ((tcrStructures / props.totalStructures) * 100).toFixed(1);
      });
    
      const getPeptidePercentage = computed(() => {
        const peptideStructures = new Set(
          props.filteredContactData
            .filter(d => d.InteractingChains.includes('Peptide'))
            .map(d => d.Structure)
        ).size;
        return ((peptideStructures / props.totalStructures) * 100).toFixed(1);
      });
    
      const createPieChart = (data, containerId, colorScale) => {
        // Clear previous chart
        d3.select(`#${containerId}`).selectAll('*').remove();
    
        const svg = d3.select(`#${containerId}`)
          .append('svg')
          .attr('width', width.value)
          .attr('height', height.value)
          .append('g')
          .attr('transform', `translate(${width.value / 2},${height.value / 2})`);
    
        const pie = d3.pie()
          .value(d => d.value)
          .sort(null);
    
        const arc = d3.arc()
          .innerRadius(0)
          .outerRadius(radius.value);
    
        const arcs = svg.selectAll('arc')
          .data(pie(data))
          .enter()
          .append('g')
          .attr('class', 'arc');
    
        // Sections du camembert
        arcs.append('path')
          .attr('d', arc)
          .attr('fill', (d, i) => colorScale(i))
          .attr('stroke', 'white')
          .style('stroke-width', '1.5px');
    
        // Pourcentages au centre
        arcs.append('text')
          .attr('transform', d => `translate(${arc.centroid(d)})`)
          .attr('dy', '.35em')
          .style('text-anchor', 'middle')
          .style('fill', 'white')
          .style('font-size', '14px')
          .text(d => `${(d.data.percentage).toFixed(1)}%`);
      };
    
      const calculateChartData = () => {
        // Données TCR
        const tcrStructures = new Set(
          props.filteredContactData
            .filter(d => d.InteractingChains.includes('TCRA') || d.InteractingChains.includes('TCRB'))
            .map(d => d.Structure)
        );
        
        const tcrData = [
          {
            name: 'With TCR contacts',
            value: tcrStructures.size,
            percentage: (tcrStructures.size / props.totalStructures) * 100
          },
          {
            name: 'Without TCR contacts',
            value: props.totalStructures - tcrStructures.size,
            percentage: (1 - tcrStructures.size / props.totalStructures) * 100
          }
        ];
    
        // Données Peptide
        const peptideStructures = new Set(
          props.filteredContactData
            .filter(d => d.InteractingChains.includes('Peptide'))
            .map(d => d.Structure)
        );
        
        const peptideData = [
          {
            name: 'With peptide contacts',
            value: peptideStructures.size,
            percentage: (peptideStructures.size / props.totalStructures) * 100
          },
          {
            name: 'Without peptide contacts',
            value: props.totalStructures - peptideStructures.size,
            percentage: (1 - peptideStructures.size / props.totalStructures) * 100
          }
        ];
    
        return { tcrData, peptideData };
      };
    
      const updateCharts = () => {
        const { tcrData, peptideData } = calculateChartData();
        createPieChart(tcrData, 'tcr-pie', colorTCR);
        createPieChart(peptideData, 'peptide-pie', colorPeptide);
      };
    
      onMounted(() => {
        // Initial chart rendering
        updateCharts();
        
        // Add window resize listener for responsiveness
        window.addEventListener('resize', updateChartDimensions);
        updateChartDimensions();
      });
    
      // Watch for changes in data or screen size
      watch([
        () => props.filteredContactData, 
        () => props.totalStructures, 
        width, 
        height
      ], () => {
        updateCharts();
      });
    
      onBeforeUnmount(() => {
        // Clean up event listener
        window.removeEventListener('resize', updateChartDimensions);
        
        // Remove existing charts
        ['tcr-pie', 'peptide-pie'].forEach(id => {
          d3.select(`#${id}`).selectAll('*').remove();
        });
      });
    
      return {
        getTCRPercentage,
        getPeptidePercentage
      };
    }
  };
  </script>
    
  <style scoped>
  .contact-data-visualization {
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
    padding: 0.5rem;
  }
  
  .charts-container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 0.5rem;
    width: 100%;
    flex-wrap: wrap;
  }
  
  .chart-wrapper {
    flex: 1 1 250px;
    min-width: 220px;
    max-width: 350px;
    margin: 0.25rem;
  }
  
  .pie-chart-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: auto;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .charts-container {
      flex-direction: column;
      align-items: center;
    }
  
    .chart-wrapper {
      width: 100%;
      max-width: 350px;
    }
  
    .visualization-header h2 {
      font-size: 1rem;
    }
  }
  
  /* Fallback for browsers without flex */
  .charts-container::after {
    content: '';
    flex-grow: 999999;
  }
  </style>