<template>
  <div class="scatter-plot-container">
    <div class="plot-header d-flex align-center justify-space-between mb-3">
      <h3 class="text-h6 mb-0">
        <v-icon left size="small">mdi-chart-scatter-plot</v-icon>
        HLA Pairs Visualization
      </h3>
      <v-btn
        @click="togglePlot"
        size="small"
        variant="outlined"
        color="primary"
      >
        <v-icon left size="small">{{ showPlot ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
        {{ showPlot ? 'Hide' : 'Show' }}
      </v-btn>
    </div>

    <v-slide-y-transition>
      <v-card v-if="showPlot" class="plot-card" elevation="2">
        <v-card-text class="pa-4">
          <div class="plot-info mb-3">
            <div class="d-flex flex-wrap gap-2">
              <v-chip size="small" color="info" variant="outlined">
                <v-icon left size="x-small">mdi-chart-scatter-plot</v-icon>
                {{ visualizationData.length }} pairs
              </v-chip>
              <v-chip size="small" color="primary" variant="outlined">
                X: HED Normalized (0-1)
              </v-chip>
              <v-chip size="small" color="secondary" variant="outlined">
                Y: Targeted Divergence Normalized (0-1)
              </v-chip>
            </div>
          </div>
          
          <div 
            ref="plotContainer" 
            class="scatter-plot"
            :style="{ height: plotHeight + 'px' }"
          ></div>

          <div class="plot-legend mt-3">
            <div class="text-caption text-grey">
              <strong>Hover over points to see HLA pair details.</strong>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-slide-y-transition>
  </div>
</template>

<script>
import * as d3 from 'd3';

export default {
  name: 'ScatterPlot',
  props: {
    visualizationData: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  data() {
    return {
      showPlot: true,
      plotHeight: 400,
      margin: { top: 20, right: 30, bottom: 60, left: 80 },
      tooltip: null
    }
  },
  computed: {
    plotWidth() {
      return Math.max(600, this.$refs.plotContainer?.clientWidth || 600);
    },
    innerWidth() {
      return this.plotWidth - this.margin.left - this.margin.right;
    },
    innerHeight() {
      return this.plotHeight - this.margin.top - this.margin.bottom;
    }
  },
  mounted() {
    this.createPlot();
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    if (this.tooltip) {
      this.tooltip.remove();
    }
  },
  watch: {
    visualizationData: {
      handler() {
        this.createPlot();
      },
      deep: true
    },
    showPlot(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.createPlot();
        });
      }
    }
  },
  methods: {
    togglePlot() {
      this.showPlot = !this.showPlot;
    },
    
    handleResize() {
      if (this.showPlot) {
        this.$nextTick(() => {
          this.createPlot();
        });
      }
    },
    
    createPlot() {
      if (!this.showPlot || !this.$refs.plotContainer || !this.visualizationData.length) {
        return;
      }

      // Clear previous plot
      d3.select(this.$refs.plotContainer).selectAll("*").remove();

      // Create tooltip
      if (this.tooltip) {
        this.tooltip.remove();
      }
      this.tooltip = d3.select("body").append("div")
        .attr("class", "scatter-tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "8px 12px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "9999");

      // Set up SVG
      const svg = d3.select(this.$refs.plotContainer)
        .append("svg")
        .attr("width", this.plotWidth)
        .attr("height", this.plotHeight);

      const g = svg.append("g")
        .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

      // Scales
      const xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, this.innerWidth]);

      const yScale = d3.scaleLinear()
        .domain([0, 1])
        .range([this.innerHeight, 0]);

      // Color scale based on combined divergence  
      const colorScale = d3.scaleSequential()
        .domain([0, Math.max(...this.visualizationData.map(d => Math.max(d.normalizedHed, d.normalizedTargetedDivergence)))])
        .interpolator(d3.interpolateViridis);

      // Add axes
      g.append("g")
        .attr("transform", `translate(0,${this.innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .append("text")
        .attr("x", this.innerWidth / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("HED Normalized");

      g.append("g")
        .call(d3.axisLeft(yScale).ticks(6))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -this.innerHeight / 2)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Targeted Divergence Normalized");

      // Add grid lines
      g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${this.innerHeight})`)
        .call(d3.axisBottom(xScale)
          .tickSize(-this.innerHeight)
          .tickFormat("")
        )
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.3);

      g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
          .tickSize(-this.innerWidth)
          .tickFormat("")
        )
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.3);

      // Add diagonal line x=y
      g.append("line")
        .attr("x1", 0)
        .attr("y1", this.innerHeight)
        .attr("x2", this.innerWidth)
        .attr("y2", 0)
        .style("stroke", "#666")
        .style("stroke-width", 1)
        .style("stroke-dasharray", "5,5")
        .style("opacity", 0.4);

      // Add points
      g.selectAll(".dot")
        .data(this.visualizationData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.normalizedHed))
        .attr("cy", d => yScale(d.normalizedTargetedDivergence))
        .attr("r", 6)
        .style("fill", d => colorScale(Math.max(d.normalizedHed, d.normalizedTargetedDivergence)))
        .style("opacity", 0.8)
        .style("stroke", "#fff")
        .style("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
          // Highlight point
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr("r", 8)
            .style("stroke-width", 2)
            .style("opacity", 1);

          // Show tooltip
          this.tooltip.transition()
            .duration(200)
            .style("opacity", .9);
          
          this.tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${d.pairLabel}</div>
            <div>HED: ${d.hed.toFixed(3)}</div>
            <div>Targeted Divergence: ${d.targetedDivergence.toFixed(3)}</div>
            <div>HED Normalized: ${d.normalizedHed.toFixed(3)}</div>
            <div>Targeted Divergence Normalized: ${d.normalizedTargetedDivergence.toFixed(3)}</div>
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", (event) => {
          // Reset point
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr("r", 6)
            .style("stroke-width", 1.5)
            .style("opacity", 0.8);

          // Hide tooltip
          this.tooltip.transition()
            .duration(500)
            .style("opacity", 0);
        });

      // Add title
      svg.append("text")
        .attr("x", this.plotWidth / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("HLA Pairs Divergence Comparison");
    }
  }
}
</script>

<style scoped>
.scatter-plot-container {
  width: 100%;
  margin-top: 1rem;
}

.plot-card {
  background: #fafafa;
  border-left: 4px solid #1976D2;
}

.plot-header {
  padding: 0.5rem 0;
}

.scatter-plot {
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: white;
}

.plot-info {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.plot-legend {
  text-align: center;
  border-top: 1px solid #e0e0e0;
  padding-top: 0.75rem;
}

/* Grid lines */
:deep(.grid line) {
  stroke: #e0e0e0;
}

:deep(.grid path) {
  stroke-width: 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .scatter-plot-container {
    margin-top: 0.5rem;
  }
  
  .plot-info {
    justify-content: center;
  }
  
  .plot-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }
  
  .plot-header .v-btn {
    align-self: center;
  }
}

@media (max-width: 480px) {
  .plot-info .v-chip {
    font-size: 0.7rem !important;
    height: 22px !important;
  }
}
</style>