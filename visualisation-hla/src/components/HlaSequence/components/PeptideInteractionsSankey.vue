<template>
  <div class="sankey-container">
    <div v-if="loading" class="loading-indicator">
      <LoadingSpinner />
    </div>
    <div v-else-if="!hasPeptideData" class="no-data-message">
      Aucune interaction avec le peptide trouvée pour les positions sélectionnées.
    </div>
    <div v-else class="sankey-chart-wrapper">
      <div ref="sankeyChart" class="sankey-chart"></div>
    </div>
  </div>
</template>

<script>
/* eslint-disable */
import { ref, onMounted, watch, computed, nextTick, onBeforeUnmount } from 'vue';
import * as d3 from 'd3';
import * as d3Sankey from 'd3-sankey';
import LoadingSpinner from './LoadingSpinner.vue';

export default {
  name: 'PeptideInteractionsSankey',
  components: {
    LoadingSpinner
  },
  props: {
    filteredContactData: {
      type: Array,
      required: true
    },
    selectedPositions: {
      type: Array,
      required: true
    },
    totalStructures: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const sankeyChart = ref(null);
    const loading = ref(true);
    const validRows = ref([]);
    const resizeTimer = ref(null);
    const renderAttempts = ref(0);
    const maxRenderAttempts = 5;
    const resizeObserver = ref(null);
    let cleanup = null;
    
    // Fonction pour trouver les lignes valides
const findValidRows = () => {
  const results = [];
  
  if (!props.filteredContactData || props.filteredContactData.length === 0 || 
      !props.selectedPositions || props.selectedPositions.length === 0) {
    return results;
  }
  
  props.filteredContactData.forEach(row => {
    const positionMatches = props.selectedPositions.includes(String(row.ResidueID));
    
    // On garde toutes les lignes pour les positions sélectionnées,
    // qu'elles interagissent avec le peptide, TCRA ou TCRB
    if (positionMatches) {
      results.push(row);
    }
  });
  
  return results;
};

    // Vérifiez si des données d'interaction avec le peptide existent
    const hasPeptideData = computed(() => {
      const results = findValidRows();
      return results.length > 0;
    });
    
    // Mettre à jour validRows quand nécessaire
    const updateValidRows = () => {
      validRows.value = findValidRows();
    };

    // Fonction pour préparer les données pour le diagramme Sankey
    const prepareData = () => {
  updateValidRows();
  
  if (!hasPeptideData.value) {
    return { nodes: [], links: [] };
  }
  
  const filteredData = validRows.value;
  const MIN_STRUCTURES_THRESHOLD = 2; // Seuil minimum de structures pour afficher un lien
  
  // Initialiser les ensembles pour les nœuds
  const mhcNodes = new Set();
  const peptideNodes = new Set();
  const interactionStructures = {}; // Stocker les structures par interaction
  const structuresSet = new Set(); // Ensemble de toutes les structures uniques
  
  // Pour suivre le nombre total d'interactions par nœud
  const nodeInteractionCounts = {};
  
  // Variables pour suivre les interactions TCR
  const tcrAInteractions = {};
  const tcrBInteractions = {};
  
  // Fonction améliorée pour extraire la position du peptide
  const extractPeptidePosition = (pepString) => {
    // Vérifier que l'entrée est une chaîne valide
    if (!pepString || typeof pepString !== 'string') {
      return null;
    }
    
    // Nettoyer la chaîne
    const cleanString = pepString.trim();
    if (cleanString === '') {
      return null;
    }
    
    // Format: texte_NOMBRE (comme LYS_1)
    const underscoreMatch = cleanString.match(/.*_(\d+)$/);
    if (underscoreMatch && underscoreMatch[1]) {
      const position = parseInt(underscoreMatch[1], 10);
      // Filtrer les positions > 15
      if (position > 15) {
        return null;
      }
      return `P${position}`;
    }
    
    // Format: texte suivi d'un nombre à la fin
    const numberMatch = cleanString.match(/(\d+)$/);
    if (numberMatch && numberMatch[1]) {
      const position = parseInt(numberMatch[1], 10);
      // Filtrer les positions > 15
      if (position > 15) {
        return null;
      }
      return `P${position}`;
    }
    
    // Format: contient un nombre n'importe où
    const anyNumberMatch = cleanString.match(/(\d+)/);
    if (anyNumberMatch && anyNumberMatch[1]) {
      const position = parseInt(anyNumberMatch[1], 10);
      // Filtrer les positions > 15
      if (position > 15) {
        return null;
      }
      return `P${position}`;
    }
    
    // Si la chaîne contient un code d'acide aminé à trois lettres, essayer de l'extraire
    const aminoAcidMatch = cleanString.match(/(ALA|ARG|ASN|ASP|CYS|GLN|GLU|GLY|HIS|ILE|LEU|LYS|MET|PHE|PRO|SER|THR|TRP|TYR|VAL)/i);
    if (aminoAcidMatch && aminoAcidMatch[1]) {
      return `P-${aminoAcidMatch[1].toUpperCase()}`;
    }
    
    // Si on ne peut pas extraire une position significative, retourner null
    return null;
  };
  
  // Parcourir les données pour extraire les nœuds et les liens
  filteredData.forEach(row => {
    const mhcResidue = `MHC_${row.ResidueID}`;
    mhcNodes.add(mhcResidue);
    
    // S'assurer que nous avons un identifiant de structure
    const structureId = row.Structure || row.PDB_ID || row.complex_id || `structure_${row.ResidueID}`;
    structuresSet.add(structureId);
    
    // Initialiser le compteur d'interactions pour ce nœud MHC s'il n'existe pas
    if (!nodeInteractionCounts[mhcResidue]) {
      nodeInteractionCounts[mhcResidue] = 0;
    }
    
    // Capture des interactions TCR
    let hasTcraInteraction = false;
    let hasTcrbInteraction = false;
    
    if (typeof row.InteractingChains === 'string') {
      hasTcraInteraction = row.InteractingChains.includes('TCRA');
      hasTcrbInteraction = row.InteractingChains.includes('TCRB');
    } else if (Array.isArray(row.InteractingChains)) {
      hasTcraInteraction = row.InteractingChains.some(chain => chain.includes('TCRA'));
      hasTcrbInteraction = row.InteractingChains.some(chain => chain.includes('TCRB'));
    }
    
    // Enregistrer les interactions TCR
    if (hasTcraInteraction) {
      if (!tcrAInteractions[mhcResidue]) {
        tcrAInteractions[mhcResidue] = new Set();
      }
      tcrAInteractions[mhcResidue].add(structureId);
    }
    
    if (hasTcrbInteraction) {
      if (!tcrBInteractions[mhcResidue]) {
        tcrBInteractions[mhcResidue] = new Set();
      }
      tcrBInteractions[mhcResidue].add(structureId);
    }
    
    // Obtenir les résidus de peptide
    let peptideResidues = [];
    
    if (row.PeptideResidues && typeof row.PeptideResidues === 'string') {
      peptideResidues = row.PeptideResidues.split(', ');
    } else if (row.PeptideResidueID) {
      peptideResidues = [`${row.PeptideResidueID}`];
    } else if (row.PeptideResidue) {
      peptideResidues = [`${row.PeptideResidue}`];
    } else if (row.Peptide && row.Peptide.length > 0) {
      // Créer des entrées de position pour chaque résidu du peptide
      peptideResidues = Array.from(row.Peptide).map((aa, i) => `${aa}_${i+1}`);
    } else {
      // Si on ne peut pas trouver d'information sur le peptide, ignorer cette ligne
      return; // Skip this row
    }
    
    peptideResidues.forEach(pepResidue => {
      // Simplifier le nom du nœud peptide
      const simplifiedName = extractPeptidePosition(pepResidue);
      
      // Ignorer les positions qui n'ont pas pu être extraites
      if (simplifiedName === null) {
        return; // Skip this iteration
      }
      
      // Initialiser le compteur d'interactions pour ce nœud peptide s'il n'existe pas
      if (!nodeInteractionCounts[simplifiedName]) {
        nodeInteractionCounts[simplifiedName] = 0;
      }
      
      // Incrémenter les compteurs d'interactions
      nodeInteractionCounts[mhcResidue]++;
      nodeInteractionCounts[simplifiedName]++;
      
      // Stocker les structures pour chaque interaction
      const key = `${mhcResidue}-${simplifiedName}`;
      if (!interactionStructures[key]) {
        interactionStructures[key] = new Set();
      }
      interactionStructures[key].add(structureId);
    });
  });
  
  // Filtrer les interactions qui n'ont pas au moins MIN_STRUCTURES_THRESHOLD structures
  const validInteractions = Object.entries(interactionStructures)
    .filter(([_, structures]) => structures.size >= MIN_STRUCTURES_THRESHOLD)
    .sort((a, b) => b[1].size - a[1].size); // Trier par nombre de structures décroissant
  
  // Si aucune interaction ne passe le seuil, retourner des tableaux vides
  if (validInteractions.length === 0) {
    console.log(`Aucune interaction n'a au moins ${MIN_STRUCTURES_THRESHOLD} structures`);
    return { nodes: [], links: [] };
  }
  
  // Recalculer les nœuds basés uniquement sur les interactions valides
  mhcNodes.clear();
  peptideNodes.clear();
  
  validInteractions.forEach(([key, _]) => {
    const [mhcNode, peptideNode] = key.split('-');
    mhcNodes.add(mhcNode);
    peptideNodes.add(peptideNode);
  });
  
  // Utiliser le nombre total de structures fourni en prop s'il est disponible
  const totalStructuresCount = props.totalStructures > 0 ? props.totalStructures : structuresSet.size;
  
  // Fonctions pour extraire les numéros des positions
  const extractMhcNumber = (name) => {
    if (!name.startsWith('MHC_')) return 999;
    
    const match = name.match(/MHC_(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    
    return 999;
  };
  
  const extractPeptideNumber = (name) => {
    if (!name.startsWith('P')) return 999;
    // Format P1, P2, etc.
    const match = name.match(/P(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    // Format P-XXX
    return 999;
  };
  
  // Trier les nœuds par leur numéro de position
  const sortedMhcNodes = [...mhcNodes].sort((a, b) => extractMhcNumber(a) - extractMhcNumber(b));
  const sortedPeptideNodes = [...peptideNodes].sort((a, b) => extractPeptideNumber(a) - extractPeptideNumber(b));
  
  // Créer l'objet de données pour d3-sankey avec les nœuds triés
  const nodes = [];
  const nodeMap = {};
  
  // Trouver les valeurs max pour les échelles
  const maxInteractionCount = Math.max(...Object.values(nodeInteractionCounts).filter(count => count > 0));
  
  // Calculer les valeurs totales entrant et sortant pour chaque nœud
  const nodeTotalValues = {};
  validInteractions.forEach(([key, structures]) => {
    const [source, target] = key.split('-');
    const value = structures.size;
    
    if (!nodeTotalValues[source]) nodeTotalValues[source] = 0;
    if (!nodeTotalValues[target]) nodeTotalValues[target] = 0;
    
    nodeTotalValues[source] += value;
    nodeTotalValues[target] += value;
  });
  
  // Trouver le maximum pour l'échelle des liens
  const maxStructureCount = Math.max(...validInteractions.map(([_, structures]) => structures.size));
  
  // Ajouter les nœuds MHC triés
  sortedMhcNodes.forEach((node, index) => {
    const match = node.match(/^MHC_(\d+)$/);
    nodeMap[node] = index;
    nodes.push({ 
      name: node,
      displayName: match ? match[1] : node,
      interactionCount: nodeInteractionCounts[node] || 0,
      interactionRatio: (nodeInteractionCounts[node] || 0) / maxInteractionCount,
      totalValue: nodeTotalValues[node] || 0
    });
  });

  // Et pour les nœuds de peptides
  sortedPeptideNodes.forEach((node, index) => {
    nodeMap[node] = index + sortedMhcNodes.length;
    nodes.push({ 
      name: node,
      displayName: node,
      interactionCount: nodeInteractionCounts[node] || 0,
      interactionRatio: (nodeInteractionCounts[node] || 0) / maxInteractionCount,
      totalValue: nodeTotalValues[node] || 0
    });
  });
  
  // Créer les liens en utilisant la même valeur pour tous les calculs de proportion
  const links = validInteractions.map(([key, structures]) => {
    const [source, target] = key.split('-');
    const structureCount = structures.size;
    
    // Calculer le pourcentage basé sur le nombre total de structures
    const percentage = (structureCount / totalStructuresCount) * 100;
    
    return {
      source: nodeMap[source],
      target: nodeMap[target],
      value: structureCount, // Utiliser directement le nombre de structures comme valeur
      rawValue: structureCount,
      percentage: percentage.toFixed(1),
      percentageRatio: percentage / 100,
      structureCount,
      structureRatio: structureCount / maxStructureCount
    };
  });
  
  // Ajouter les nœuds TCRA et TCRB
  const tcrANodeIndex = nodes.length;
  const tcrBNodeIndex = nodes.length + 1;

  nodes.push({
    name: 'TCRA',
    displayName: 'TCRA',
    interactionCount: Object.values(tcrAInteractions).reduce((sum, set) => sum + set.size, 0),
    interactionRatio: 1, // Pour s'assurer qu'il est bien mis en évidence
    isTcr: true
  });

  nodes.push({
    name: 'TCRB',
    displayName: 'TCRB',
    interactionCount: Object.values(tcrBInteractions).reduce((sum, set) => sum + set.size, 0),
    interactionRatio: 1,
    isTcr: true
  });

  // Ajouter les liens pour TCRA
  Object.entries(tcrAInteractions).forEach(([mhcResidue, structures]) => {
    if (structures.size >= MIN_STRUCTURES_THRESHOLD && nodeMap[mhcResidue] !== undefined) {
      const sourceIndex = nodeMap[mhcResidue];
      const structureCount = structures.size;
      const percentage = (structureCount / totalStructuresCount) * 100;
      
      links.push({
        source: sourceIndex,
        target: tcrANodeIndex,
        value: structureCount,
        rawValue: structureCount,
        percentage: percentage.toFixed(1),
        percentageRatio: percentage / 100,
        structureCount,
        structureRatio: structureCount / maxStructureCount,
        isTcrLink: true
      });
    }
  });

  // Ajouter les liens pour TCRB
  Object.entries(tcrBInteractions).forEach(([mhcResidue, structures]) => {
    if (structures.size >= MIN_STRUCTURES_THRESHOLD && nodeMap[mhcResidue] !== undefined) {
      const sourceIndex = nodeMap[mhcResidue];
      const structureCount = structures.size;
      const percentage = (structureCount / totalStructuresCount) * 100;
      
      links.push({
        source: sourceIndex,
        target: tcrBNodeIndex,
        value: structureCount,
        rawValue: structureCount,
        percentage: percentage.toFixed(1),
        percentageRatio: percentage / 100,
        structureCount,
        structureRatio: structureCount / maxStructureCount,
        isTcrLink: true
      });
    }
  });
  
  return { 
    nodes, 
    links, 
    maxStructureCount, 
    maxInteractionCount, 
    totalStructures: totalStructuresCount 
  };
};

    // Fonction pour dessiner le diagramme
    const drawSankey = (data) => {
  if (!sankeyChart.value || !data.nodes.length) {
    return;
  }
  
  // Nettoyer les tooltips avant de redessiner
  d3.selectAll('.sankey-tooltip').remove();
  
  // Effacer le SVG existant
  d3.select(sankeyChart.value).selectAll('*').remove();
  
  // Obtenir les dimensions réelles du conteneur
  const containerRect = sankeyChart.value.getBoundingClientRect();
  
  // Vérifier si les dimensions sont valides
  if (containerRect.width <= 0 || containerRect.height <= 0) {
    console.log('Dimensions invalides, nouvel essai plus tard...');
    if (renderAttempts.value < maxRenderAttempts) {
      renderAttempts.value++;
      setTimeout(() => drawSankey(data), 200 * renderAttempts.value);
    }
    return;
  }
  
  // Dimensions du graphique
  const width = containerRect.width;
  const height = Math.max(450, containerRect.height);
  
  // Créer le SVG avec les dimensions précises
  const svg = d3.select(sankeyChart.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMin meet');
  
  // Configuration de Sankey avec des marges
  const margin = { top: 40, right: 40, bottom: 20, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Conteneur principal
  const mainGroup = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // Créer un conteneur pour le tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'sankey-tooltip')
    .style('opacity', 0)
    .style('position', 'absolute')
    .style('background-color', 'white')
    .style('border', '1px solid #ccc')
    .style('border-radius', '4px')
    .style('padding', '10px 14px')
    .style('font-size', '13px')
    .style('font-weight', '500')
    .style('pointer-events', 'none')
    .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
    .style('z-index', '10000');
  
  // Nettoyage
  cleanup = () => {
    tooltip.remove();
  };
  
  // Configuration du diagramme Sankey
  const sankey = d3Sankey.sankey()
    .nodeWidth(15)
    .nodePadding(25) // Espacement pour éviter les chevauchements
    .nodeId(d => d.index)
    .nodeAlign(d3Sankey.sankeyLeft)
    .extent([[0, 0], [innerWidth, innerHeight]])
    .iterations(64); // Plus d'itérations pour une meilleure convergence
  
  // Échelle de couleur pour les liens peptide - des bleus plus foncés et plus contrastés
  const colorScale = d3.scaleSequential()
    .domain([0, 1])
    .interpolator(d3.interpolate('#d0e6ff', '#0047AB'));
  
  try {
    // Calculer les positions avec d3-sankey
    const sankeyData = sankey({
      nodes: JSON.parse(JSON.stringify(data.nodes)),
      links: JSON.parse(JSON.stringify(data.links))
    });
    
    // Ajouter le titre du diagramme
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text('Interactions MHC-Peptide-TCR');
    
    // Ajouter des labels pour les côtés
    svg.append('text')
      .attr('x', margin.left - 10)
      .attr('y', 20)
      .attr('text-anchor', 'start')
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('fill', '#4a90e2')
      .text('MHC Positions');
      
    svg.append('text')
      .attr('x', width - margin.right + 10)
      .attr('y', 20)
      .attr('text-anchor', 'end')
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('fill', '#10b981')
      .text('Peptide Positions');
    
    // Ajouter les liens
    mainGroup.append('g')
      .selectAll('.link')
      .data(sankeyData.links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3Sankey.sankeyLinkHorizontal())
      .attr('stroke-width', d => Math.max(1, d.width))
      .attr('stroke', d => {
        if (d.isTcrLink) {
          return d.target.name === 'TCRA' ? '#9333ea' : '#c026d3';
        }
        return colorScale(Math.pow(d.structureRatio, 0.7));
      })
      .attr('stroke-opacity', 0.75)
      .attr('fill', 'none')
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        // Effet de survol
        d3.select(this)
          .attr('stroke-opacity', 1)
          .attr('stroke-width', d => Math.max(1, d.width * 1.2));
          
        // Afficher le tooltip
        const sourceName = d.source.displayName || d.source.name;
        const targetName = d.target.displayName || d.target.name;
        
        tooltip.html(`
          <div style="font-size:14px;margin-bottom:5px;border-bottom:1px solid #eee;padding-bottom:5px">
            Position ${sourceName} → ${targetName}
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px">
            <span>Structures:</span>
            <span style="font-weight:600">${d.structureCount}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span>Pourcentage:</span>
            <span style="font-weight:600;color:${d.isTcrLink ? 
              (d.target.name === 'TCRA' ? '#9333ea' : '#c026d3') : 
              colorScale(d.structureRatio)}">${d.percentage}%</span>
          </div>
        `)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 40) + 'px')
        .style('opacity', 1);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 40) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-opacity', 0.75)
          .attr('stroke-width', d => Math.max(1, d.width));
          
        tooltip.style('opacity', 0);
      });
    
    // Ajouter les nœuds
    const nodeGroups = mainGroup.append('g')
      .selectAll('.node')
      .data(sankeyData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x0}, ${d.y0})`);
    
    // Rectangles des nœuds
    nodeGroups.append('rect')
      .attr('height', d => Math.max(4, d.y1 - d.y0))
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => {
        if (d.isTcr) {
          return d.name === 'TCRA' ? '#9333ea' : '#c026d3';
        }
        
        const isMhc = d.name.startsWith('MHC_');
        // Ajuster la couleur selon l'importance
        return isMhc ? 
          (d.interactionRatio > 0.5 ? '#2065c4' : '#4a90e2') : 
          (d.interactionRatio > 0.5 ? '#08875e' : '#10b981');
      })
      .attr('stroke', '#333')
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('fill', d => {
            if (d.isTcr) {
              return d.name === 'TCRA' ? '#7e22ce' : '#a21caf';
            }
            
            const isMhc = d.name.startsWith('MHC_');
            return isMhc ? '#1a56b3' : '#067a54';
          });
          
        // Mettre en évidence les liens connectés
        mainGroup.selectAll('.link')
          .filter(link => link.source.index === d.index || link.target.index === d.index)
          .attr('stroke-opacity', 1)
          .attr('stroke-width', function(d) {
            return Math.max(1, d.width * 1.2);
          });
          
        // Afficher le tooltip
        let tooltipContent;
        
        if (d.isTcr) {
          tooltipContent = `
            <div style="font-size:14px;margin-bottom:5px;border-bottom:1px solid #eee;padding-bottom:5px">
              ${d.name}
            </div>
            <div style="display:flex;justify-content:space-between">
              <span>Interactions:</span>
              <span style="font-weight:600">${d.interactionCount}</span>
            </div>
          `;
        } else {
          tooltipContent = `
            <div style="font-size:14px;margin-bottom:5px;border-bottom:1px solid #eee;padding-bottom:5px">
              Position ${d.displayName}
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:2px">
              <span>Type:</span>
              <span style="font-weight:600">${d.name.startsWith('MHC_') ? 'MHC' : 'Peptide'}</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span>Interactions:</span>
              <span style="font-weight:600">${d.interactionCount}</span>
            </div>
          `;
        }
        
        tooltip.html(tooltipContent)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 40) + 'px')
        .style('opacity', 1);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 40) + 'px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('fill', d => {
            if (d.isTcr) {
              return d.name === 'TCRA' ? '#9333ea' : '#c026d3';
            }
            
            const isMhc = d.name.startsWith('MHC_');
            return isMhc ? 
              (d.interactionRatio > 0.5 ? '#2065c4' : '#4a90e2') : 
              (d.interactionRatio > 0.5 ? '#08875e' : '#10b981');
          });
          
        mainGroup.selectAll('.link')
          .attr('stroke-opacity', 0.75)
          .attr('stroke-width', d => Math.max(1, d.width));
          
        tooltip.style('opacity', 0);
      });
    
    // Labels des nœuds
    nodeGroups.append('text')
      .attr('x', d => {
        if (d.isTcr) {
          return 20; // Ajustement spécifique pour les nœuds TCR
        }
        return d.name.startsWith('MHC_') ? -8 : 20;
      })
      .attr('y', d => (d.y1 - d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => d.name.startsWith('MHC_') ? 'end' : 'start')
      .attr('font-size', d => {
        if (d.isTcr) return '14px'; // Police plus grande pour TCR
        return d.interactionRatio > 0.7 ? '13px' : '12px';
      })
      .attr('font-weight', d => {
        if (d.isTcr) return 'normal';
        return d.interactionRatio > 0.7 ? 'bold' : 'normal';
      })
      .attr('pointer-events', 'none')
      .text(d => {
        const match = d.name.match(/^MHC_(\d+)$/);
        return match ? match[1] : d.displayName;
      })
      .attr('fill', d => d.isTcr ? '#333' : '#333'); // Texte blanc pour TCR
    
    // Réinitialiser le compteur d'essais
    renderAttempts.value = 0;
  } catch (error) {
    console.error('Erreur lors du dessin du diagramme Sankey:', error);
    if (renderAttempts.value < maxRenderAttempts) {
      renderAttempts.value++;
      setTimeout(() => drawSankey(data), 200 * renderAttempts.value);
    }
  }
};

    // Fonction pour forcer un redessinage complet
    const forceRedraw = () => {
      if (sankeyChart.value && hasPeptideData.value) {
        // Réinitialiser complètement
        d3.select(sankeyChart.value).selectAll('*').remove();
        d3.selectAll('.sankey-tooltip').remove();
        
        // Redessiner
        const data = prepareData();
        drawSankey(data);
      }
    };
    
    // Redessiner avec un délai pour éviter les appels trop fréquents
    const redrawWithDelay = () => {
      if (resizeTimer.value) clearTimeout(resizeTimer.value);
      
      resizeTimer.value = setTimeout(() => {
        renderAttempts.value = 0;
        forceRedraw();
      }, 100);
    };
    
    // Observer les changements du conteneur
    const setupResizeObserver = () => {
      if (sankeyChart.value) {
        resizeObserver.value = new ResizeObserver(() => {
          redrawWithDelay();
        });
        
        resizeObserver.value.observe(sankeyChart.value);
      }
    };
    
    // Nettoyage avant de démonter le composant
    onBeforeUnmount(() => {
      if (resizeObserver.value) {
        resizeObserver.value.disconnect();
      }
      
      if (cleanup) {
        cleanup();
      }
      
      // Supprimer les écouteurs d'événements
      window.removeEventListener('resize', redrawWithDelay);
      
      // Supprimer tous les tooltips existants
      d3.selectAll('.sankey-tooltip').remove();
    });
    
    // Dessiner le diagramme au montage
    onMounted(async () => {
      loading.value = true;
      
      // Attendre que le DOM soit complètement rendu
      await nextTick();
      
      // Séquence d'initialisation progressive
      setTimeout(async () => {
        if (sankeyChart.value) {
          const data = prepareData();
          drawSankey(data);
          setupResizeObserver();
        }
        loading.value = false;
        
        // Ajouter un écouteur pour le redimensionnement
        window.addEventListener('resize', redrawWithDelay);
        
        // Force le redimensionnement après un court délai
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 300);
      }, 100);
    });
    
    // Surveiller les changements dans les données
    watch(
      [() => props.filteredContactData, () => props.selectedPositions],
      async () => {
        loading.value = true;
        renderAttempts.value = 0;
        
        await nextTick();
        
// Forcer un redessinage complet
setTimeout(() => {
          forceRedraw();
          loading.value = false;
          
          // Forcer un autre redessinage après un court délai pour s'assurer que tout est bien rendu
          setTimeout(() => {
            forceRedraw();
          }, 300);
        }, 100);
      },
      { deep: true }
    );
    
    return {
      sankeyChart,
      loading,
      hasPeptideData
    };
  }
};
</script>

<style scoped>
.sankey-container {
  width: 100%;
  height: 450px;
  position: relative;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}

.sankey-chart-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #f9f9fb;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
}

.sankey-chart {
  width: 100%;
  height: 100%;
  display: block;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  width: 100%;
}

.no-data-message {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #666;
  font-style: italic;
  text-align: center;
  padding: 20px;
  width: 100%;
  background-color: #f9f9f9;
  border-radius: 6px;
}

/* Style pour les liens */
:deep(.link) {
  transition: stroke-opacity 0.3s, stroke-width 0.2s;
  stroke-linecap: butt !important;
}

:deep(.node rect) {
  transition: fill 0.3s;
}

:deep(text) {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}
</style>