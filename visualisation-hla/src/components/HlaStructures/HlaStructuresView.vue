<script setup>
import { ref, onMounted, computed, watch, getCurrentInstance } from 'vue'
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

// Fonction améliorée pour créer les camemberts
const createPieChart = (data, containerId, title = '') => {
  // Clear previous chart
  d3.select(`#${containerId}`).selectAll('*').remove();

  const width = 320;
  const height = 340; // Un peu plus haut pour le titre
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
      // Ne montrer le texte que pour les sections assez grandes
      if (d.data.percentage < 8) return 'translate(-1000,-1000)'; // Hors de vue
      
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

  // Ajouter une légende
  const legendContainer = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(10, ${height - data.length * 25 - 10})`);

  const legend = legendContainer.selectAll('.legend-item')
    .data(data)
    .enter()
    .append('g')
    .attr('class', 'legend-item')
    .attr('transform', (d, i) => `translate(0, ${i * 20})`);

  legend.append('rect')
    .attr('width', 15)
    .attr('height', 15)
    .style('fill', d => color(d.name))
    .style('stroke', 'white')
    .style('stroke-width', 1);

  legend.append('text')
    .attr('x', 20)
    .attr('y', 12)
    .style('font-size', '12px')
    .style('fill', '#374151')
    .text(d => `${d.name}: ${d.value}`);

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
  { title: 'TCRB Sequence', key: 'TCRB_seq', visible: false },
  { title: 'Actions', key: 'actions', visible: true, sortable: false, width: '100px' }
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
        // Graphiques de distribution Locus avec titres
        createPieChart(newVdjdbStats, 'vdjdb-pie', `VDJdb Locus Distribution (${vdjdbData.value.length} total)`);
        createPieChart(newPdbStats, 'pdb-pie', `PDB Locus Distribution (${pdbData.value.length} total)`);
        
        // Graphiques MHC par Locus avec titres
        newVdjdbMhcStats.forEach(stat => {
          const totalForLocus = stat.counts.reduce((sum, c) => sum + c.value, 0);
          createPieChart(stat.counts, `vdjdb-mhc-${stat.locus}`, `VDJdb ${stat.locus} MHC (${totalForLocus} structures)`);
        });
        
        newPdbMhcStats.forEach(stat => {
          const totalForLocus = stat.counts.reduce((sum, c) => sum + c.value, 0);
          createPieChart(stat.counts, `pdb-mhc-${stat.locus}`, `PDB ${stat.locus} MHC (${totalForLocus} structures)`);
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

const openTutorial = () => {
  localStorage.setItem('tutorialSection', 'section-structures');
  window.open(window.location.origin + '?openTutorial=true', '_blank');
}

// Émission d'événements avec l'instance du composant
const instance = getCurrentInstance()
const emit = instance.emit

// Fonction pour ouvrir le visualiseur 3D avec une structure VDJdb  
const open3DViewer = (structure) => {
  console.log('Opening 3D viewer for structure:', structure)
  emit('open-3d-viewer', {
    locus: structure.Locus,
    structureId: structure.Structure_fullname,
    positions: [], // Pas de positions présélectionnées
    distance: '3',
    percentage: '50',
    interactionType: 'Peptide or TCR',
    allele1: '',
    allele2: '',
    showPolymorphicOnly: false,
    entropyThreshold: '0.2'
  })
}

onMounted(() => {
  loadAllData()
})
</script>

<script>
export default {
  name: 'HlaStructuresView',
  emits: ['open-3d-viewer']
}
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center">
            <v-icon color="primary" class="mr-2">mdi-molecule</v-icon>
            <h1 class="text-h5 font-weight-bold mb-0">Structures Database</h1>
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
            Learn about the Structures Database
          </v-tooltip>
        </div>
        
        <!-- Infobulle explicative -->
        <v-alert 
          type="info" 
          variant="tonal" 
          density="compact"
          class="mb-3"
        >
          <template #prepend>
            <v-icon>mdi-information-outline</v-icon>
          </template>
          <div class="d-flex align-center">
            <span>
              "<strong>VDJdb Structures</strong>": Structures generated with 
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
        
        <v-alert 
          v-if="error" 
          type="error" 
          variant="outlined"
          class="mb-3"
        >
          {{ error }}
        </v-alert>
        
        <v-tabs v-model="activeTab" color="primary">
          <v-tab value="vdjdb">
            VDJdb ({{ vdjdbData.length }})
          </v-tab>
          <v-tab value="pdb">
            PDB ({{ pdbData.length }})
          </v-tab>
        </v-tabs>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" class="d-flex align-center gap-4">
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
          <template #[`item.actions`]="{ item }">
            <v-tooltip bottom>
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  @click="open3DViewer(item)"
                  :disabled="!item.Structure_fullname"
                >
                  <v-icon size="small">mdi-cube-outline</v-icon>
                </v-btn>
              </template>
              <span>Visualiser en 3D</span>
            </v-tooltip>
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