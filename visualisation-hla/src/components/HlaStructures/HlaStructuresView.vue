/* eslint-disable */
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { loadStructuresData } from '../../services/hlaStructuresService'
import Papa from 'papaparse'

const pdbData = ref([])
const vdjdbData = ref([])
const loading = ref(true)
const error = ref(null)
const activeTab = ref('vdjdb')
const search = ref('')
const showColumnSettings = ref(false)
const selected = ref([]) // Pour stocker les lignes sélectionnées

// Dans la partie script existante, ajoutez après les autres imports :
import * as d3 from 'd3';

// Ajoutez ces computed properties
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

// Ajoutez une fonction pour créer les camemberts
const createPieChart = (data, containerId) => {
  // Clear previous chart
  d3.select(`#${containerId}`).selectAll('*').remove();

  const width = 300;
  const height = 300;
  const radius = Math.min(width, height) / 2 * 0.8;

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.name))
    .range(['#6366f1', '#10b981', '#f59e0b', '#ef4444']);

  // Créer un div pour le tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "d3-tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("border", "solid 1px #ccc")
    .style("border-radius", "5px")
    .style("padding", "10px")
    .style("font-size", "12px")
    .style("box-shadow", "0 0 10px rgba(0,0,0,0.1)")
    .style("pointer-events", "none");

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

  const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  // Arc plus grand pour placer les labels
  const labelArc = d3.arc()
    .innerRadius(radius * 0.6)
    .outerRadius(radius * 0.6);

  const arcs = svg.selectAll('arc')
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
        .style('opacity', 0.8);
      tooltip
        .style("visibility", "visible")
        .html(`${d.data.name}<br>${d.data.value} (${d.data.percentage.toFixed(1)}%)`);
    })
    .on('mousemove', function(event) {
      tooltip
        .style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on('mouseout', function() {
      d3.select(this)
        .style('opacity', 1);
      tooltip
        .style("visibility", "hidden");
    });

  // Ajouter les labels
  arcs.append('text')
    .attr('transform', d => {
      // Ne montrer le texte que pour les sections assez grandes
      if (d.data.percentage < 7) return 'translate(-1000,-1000)'; // Hors de vue
      
      const pos = labelArc.centroid(d);
      return `translate(${pos})`;
    })
    .attr('dy', '0.35em')
    .style('text-anchor', 'middle')
    .style('font-size', '11px')
    .style('fill', '#333')
    .text(d => `${d.data.name}`);

  // Cleanup function
  return () => {
    tooltip.remove();
  };
};

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

// Watch pour logger les éléments sélectionnés
watch(selected, (newSelection) => {
  console.log('Selected structures:', newSelection)
})

// VDJdb table headers with visibility control
const vdjdbHeaders = ref([
  { title: 'Complex ID', key: 'VDJdb_complex_id', sortable: true, visible: true },
  { title: 'Locus', key: 'Locus', visible: true },
  { title: 'MHC', key: 'MHC', visible: true },
  { title: 'Peptide', key: 'Peptide', width: '150px', visible: true },
  { title: 'Peptide species', key: 'Peptide species', visible: true },
  { title: 'TCRA V', key: 'TCRA_V', visible: false },
  { title: 'TCRA CDR3', key: 'TCRA_CDR3', visible: false },
  { title: 'TCRB V', key: 'TCRB_V', visible: false },
  { title: 'TCRB CDR3', key: 'TCRB_CDR3', visible: false },
  { title: 'VDJdb Score', key: 'VDJdb_confidence_score', visible: false },
  { title: 'TCRmodel2 pmhc-iptm score', key: 'TCRmodel2-pmhc-iptm-score', visible: true },
  { title: 'Reference', key: 'Reference', visible: false },
  { title: 'TCRA Sequence', key: 'TCRA_seq', visible: false },
  { title: 'TCRB Sequence', key: 'TCRB_seq', visible: false }
])

// PDB table headers with visibility control
const pdbHeaders = ref([
  { title: 'PDB ID', key: 'pdb_accession_number', visible: true },
  { title: 'Locus', key: 'Locus', visible: true },
  { title: 'MHC', key: 'MHC', visible: true },
  { title: 'Peptide', key: 'Peptide', visible: true },
  { title: 'TCRA Sequence', key: 'TCRA_seq', visible: false },
  { title: 'TCRB Sequence', key: 'TCRB_seq', visible: false },
  { title: 'MHC Chain ID', key: 'MHC ChainID', visible: false },
  { title: 'MHC PDB description', key: 'MHC PDB description', visible: false },
  { title: 'Peptide Chain ID', key: 'Peptide ChainID', visible: false },
  { title: 'Peptide PDB description', key: 'Peptide PDB description', visible: false },
  { title: 'TCRA Chain ID', key: 'TCRA ChainID', visible: false },
  { title: 'TCRA PDB description', key: 'TCRA PDB description', visible: false },
  { title: 'TCRB Chain ID', key: 'TCRB ChainID', visible: false },
  { title: 'TCRB PDB description', key: 'TCRB PDB description', visible: false }
])

// Computed properties for visible headers
const visibleVdjdbHeaders = computed(() => 
  vdjdbHeaders.value.filter(header => header.visible)
)

const visiblePdbHeaders = computed(() => 
  pdbHeaders.value.filter(header => header.visible)
)

// Current headers based on active tab
const currentHeaders = computed(() => 
  activeTab.value === 'vdjdb' ? vdjdbHeaders.value : pdbHeaders.value
)

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

watch(
  [vdjdbStats, pdbStats, vdjdbMhcStats, pdbMhcStats, activeTab],
  ([newVdjdbStats, newPdbStats, newVdjdbMhcStats, newPdbMhcStats, newTab]) => {
    if (newTab === 'stats') {
      // Supprimer tous les tooltips existants avant de recréer les graphiques
      d3.selectAll('.d3-tooltip').remove();
      
      setTimeout(() => {
        // Graphiques de distribution Locus
        createPieChart(newVdjdbStats, 'vdjdb-pie');
        createPieChart(newPdbStats, 'pdb-pie');
        
        // Graphiques MHC par Locus
        newVdjdbMhcStats.forEach(stat => {
          createPieChart(stat.counts, `vdjdb-mhc-${stat.locus}`);
        });
        
        newPdbMhcStats.forEach(stat => {
          createPieChart(stat.counts, `pdb-mhc-${stat.locus}`);
        });
      }, 0);
    }
  }
);
// Method to open PDB link
// Import JSZip at the top of your file after other imports
import JSZip from 'jszip'

const openPdbLink = (pdbId) => {
  window.open(`https://www.rcsb.org/structure/${pdbId}`, '_blank')
}

const downloadSelectedStructures = async () => {
  if (!selected.value.length) return
  
  const zip = new JSZip()
  
  try {
    // Create requests for all selected structures
    const filePromises = selected.value.map(async (complexId) => {
      try {
        // Get the full structure name from the data
        const structure = vdjdbData.value.find(item => item.VDJdb_complex_id === complexId)
        if (!structure || !structure.Structure_fullname) {
          throw new Error(`No structure name found for ${complexId}`)
        }
        
        const response = await fetch(`/data/ranked_0_collected/${structure.Structure_fullname}.pdb`)
        if (!response.ok) throw new Error(`Failed to fetch ${structure.Structure_fullname}`)
        const text = await response.text()
        zip.file(`${structure.Structure_fullname}.pdb`, text)
      } catch (error) {
        console.error(`Error fetching ${complexId}:`, error)
      }
    })

    // Wait for all files to be added to the zip
    await Promise.all(filePromises)
    
    // Generate the zip file
    const content = await zip.generateAsync({ type: "blob" })
    
    // Create download link
    const url = window.URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = 'selected_structures.zip'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Error creating zip:', error)
  }
}

// Reset column visibility to defaults
const resetColumnVisibility = () => {
  const defaultVdjdbVisible = ['MHC', 'Peptide', 'Peptide_species']
  const defaultPdbVisible = ['pdb_accession_number', 'MHC', 'Peptide']
  
  vdjdbHeaders.value.forEach(header => {
    header.visible = defaultVdjdbVisible.includes(header.key)
  })
  
  pdbHeaders.value.forEach(header => {
    header.visible = defaultPdbVisible.includes(header.key)
  })
}

// Ajout de la fonction dans le setup script
const exportToCSV = (data, filename) => {
  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Computed property pour le nom du fichier d'export
const exportFileName = computed(() => `${activeTab.value}_data_${new Date().toISOString().split('T')[0]}.csv`)


// Fonction d'export qui sera utilisée dans le template
const handleExport = () => {
  const data = activeTab.value === 'vdjdb' ? vdjdbData.value : pdbData.value
  exportToCSV(data, exportFileName.value)
}

onMounted(() => {
  loadAllData()
})
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-alert 
          v-if="error" 
          type="error" 
          variant="outlined"
        >
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-tabs v-model="activeTab" color="primary">
          <v-tab value="vdjdb">
            VDJdb ({{ vdjdbData.length }})
          </v-tab>
          <v-tab value="pdb">
            PDB ({{ pdbData.length }})
          </v-tab>
          <v-tab value="stats">
          Statistics
        </v-tab>
        </v-tabs>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" class="d-flex align-center gap-4" v-if="activeTab !== 'stats'">
        <v-text-field
          v-model="search"
          label="Search"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          hide-details
          clearable
          class="flex-grow-1"
        ></v-text-field>
        
        <v-btn
          color="primary"
          variant="outlined"
          @click="showColumnSettings = !showColumnSettings"
        >
          <v-icon start>mdi-cog</v-icon>
          Column Settings
        </v-btn>

        <v-btn
          color="success"
          variant="outlined"
          @click="handleExport"
          prepend-icon="mdi-file-export"
        >
          Export CSV
        </v-btn>
      </v-col>
    </v-row>

    <!-- Column Settings Dialog -->
    <v-dialog v-model="showColumnSettings" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 pa-4">
          Column Settings
          <v-btn
            icon
            variant="plain"
            size="small"
            class="float-right"
            @click="showColumnSettings = false"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <div class="d-flex justify-space-between align-center mb-4">
                <div class="text-subtitle-1">
                  {{ activeTab === 'vdjdb' ? 'VDJdb Columns' : 'PDB Columns' }}
                </div>
                <v-btn
                  color="secondary"
                  variant="tonal"
                  size="small"
                  @click="resetColumnVisibility"
                >
                  Reset to Default
                </v-btn>
              </div>
              
              <v-row>
                <v-col 
                  v-for="header in currentHeaders"
                  :key="header.key"
                  cols="12"
                  sm="6"
                  md="4"
                >
                  <v-checkbox
                    v-model="header.visible"
                    :label="header.title"
                    density="comfortable"
                    hide-details
                  ></v-checkbox>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-window v-model="activeTab">
      <v-window-item value="vdjdb">
        <div v-if="selected.length" class="d-flex align-center gap-4 mb-4">
          <v-chip
            color="primary"
            class="ma-2"
          >
            {{ selected.length }} structure(s) selected
          </v-chip>
          <v-btn
            color="primary"
            variant="tonal"
            :disabled="!selected.length"
            @click="downloadSelectedStructures"
            prepend-icon="mdi-download"
          >
            Download PDB files
          </v-btn>
        </div>
        <v-data-table
          v-model="selected"
          :headers="visibleVdjdbHeaders"
          :items="vdjdbData"
          :search="search"
          :loading="loading"
          items-per-page="10"
          density="comfortable"
          class="elevation-1 mt-4"
          show-select
          item-value="VDJdb_complex_id"
        >
          <template #[`item.VDJdb_confidence_score`]="{ value }">
            <v-chip 
              :color="value === 3 ? 'success' : value === 2 ? 'warning' : 'error'"
              size="small"
              variant="outlined"
            >
              {{ value }}
            </v-chip>
          </template>
          <template #[`item.TCRmodel2-pmhc-iptm-score`]="{ value }">
            <v-chip 
              :color="value > 0.8 ? 'success' : value > 0.5 ? 'warning' : 'error'"
              size="small"
              variant="outlined"
            >
              {{ value.toFixed(3) }}
            </v-chip>
          </template>
          <template #loading>
            <v-progress-linear 
              indeterminate 
              color="primary"
            ></v-progress-linear>
          </template>
        </v-data-table>
      </v-window-item>

      <v-window-item value="pdb">
        <v-data-table
          :headers="visiblePdbHeaders"
          :items="pdbData"
          :search="search"
          :loading="loading"
          items-per-page="10"
          density="comfortable"
          class="elevation-1 mt-4"
        >
          <template #[`item.pdb_accession_number`]="{ item }">
            <v-chip 
              color="primary" 
              variant="outlined" 
              @click="openPdbLink(item.pdb_accession_number)"
            >
              {{ item.pdb_accession_number }}
            </v-chip>
          </template>
          <template #loading>
            <v-progress-linear 
              indeterminate 
              color="primary"
            ></v-progress-linear>
          </template>
        </v-data-table>
      </v-window-item>

      <v-window-item value="stats">
  <v-row>
    <!-- Locus Distribution -->
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title>VDJdb Locus Distribution</v-card-title>
        <v-card-text>
          <div class="chart-container">
            <div id="vdjdb-pie" style="width: 100%; height: 300px;"></div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
    
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title>PDB Locus Distribution</v-card-title>
        <v-card-text>
          <div class="chart-container">
            <div id="pdb-pie" style="width: 100%; height: 300px;"></div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- MHC Distribution par Locus -->
    <template v-for="stat in vdjdbMhcStats" :key="stat.locus">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>VDJdb MHC Distribution - {{ stat.locus }}</v-card-title>
          <v-card-text>
            <div class="chart-container">
              <div :id="`vdjdb-mhc-${stat.locus}`" style="width: 100%; height: 300px;"></div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </template>

    <template v-for="stat in pdbMhcStats" :key="stat.locus">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>PDB MHC Distribution - {{ stat.locus }}</v-card-title>
          <v-card-text>
            <div class="chart-container">
              <div :id="`pdb-mhc-${stat.locus}`" style="width: 100%; height: 300px;"></div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </template>
  </v-row>
</v-window-item>
</v-window>
  </v-container>
</template>

<style scoped>
.v-dialog > .v-card > .v-card-text {
  padding-top: 24px;
}

.gap-4 {
  gap: 1rem;
}

.chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

</style>