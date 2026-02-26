// services/hlaStructuresService.js
import Papa from 'papaparse'

// ============================================
// CACHE MANAGEMENT
// ============================================

const cache = new Map()

function getCachedData(key) {
  const cached = cache.get(key)
  if (!cached) return null

  const now = Date.now()
  if (now - cached.timestamp > cached.ttl) {
    cache.delete(key)
    return null
  }

  return cached.data
}

function setCachedData(key, data, ttl = 3600000) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

// ============================================
// LOAD CURATED STRUCTURES DATA
// ============================================

/**
 * Charge les métadonnées des structures curées unifiées
 * @returns {Promise<Array>} Liste des structures avec métadonnées complètes
 */
export async function loadStructuresData() {
  const cacheKey = 'curated_structures'

  // Vérifier le cache
  const cached = getCachedData(cacheKey)
  if (cached) {
    console.log('Données chargées depuis le cache')
    return cached
  }

  try {
    // Charger les métadonnées unifiées
    const response = await fetch('/data/curated_metadata.csv')
    if (!response.ok) {
      throw new Error(`Erreur lors du chargement: ${response.statusText}`)
    }

    const csvText = await response.text()

    const result = Papa.parse(csvText, {
      header: true,
      delimiter: ',',
      dynamicTyping: true,
      skipEmptyLines: true
    })

    if (result.errors.length > 0) {
      console.warn('Erreurs lors du parsing CSV:', result.errors)
    }

    const data = result.data

    console.log(`${data.length} structures chargées depuis curated_metadata.csv`)

    // Mettre en cache (1 heure)
    setCachedData(cacheKey, data, 3600000)

    return data
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error)
    throw error
  }
}

// ============================================
// FILTERING FUNCTIONS
// ============================================

/**
 * Filtre les structures par locus HLA
 * @param {Array} structures - Liste des structures
 * @param {string} locus - Locus à filtrer ('A', 'B', ou 'All')
 * @returns {Array} Structures filtrées
 */
export function filterByLocus(structures, locus) {
  if (!locus || locus === 'All') {
    return structures
  }
  return structures.filter(s => s.locus === locus)
}

/**
 * Fonction de filtrage générique (conservée pour compatibilité)
 * @param {Array} data - Données à filtrer
 * @param {Object} filters - Objet contenant les filtres {key: value}
 * @returns {Array} Données filtrées
 */
export function filterStructures(data, filters) {
  return data.filter(structure => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true // Ignorer les filtres vides

      const fieldValue = structure[key]
      if (!fieldValue) return false // Gestion des valeurs manquantes

      if (typeof value === 'string') {
        return fieldValue.toString().toLowerCase().includes(value.toLowerCase())
      }
      if (typeof value === 'number') {
        return fieldValue === value
      }
      return false
    })
  })
}

// ============================================
// STATISTICS FUNCTIONS
// ============================================

/**
 * Calcule les statistiques sur un ensemble de structures
 * @param {Array} structures - Liste des structures
 * @returns {Object} Statistiques complètes
 */
export function getStructureStatistics(structures) {
  const stats = {
    total: structures.length,
    byLocus: {},
    bySource: {},
    avgIpTM: 0,
    minIpTM: Infinity,
    maxIpTM: -Infinity
  }

  let iptmSum = 0
  let iptmCount = 0

  structures.forEach(s => {
    // Par locus
    stats.byLocus[s.locus] = (stats.byLocus[s.locus] || 0) + 1

    // Par source
    stats.bySource[s.best_source] = (stats.bySource[s.best_source] || 0) + 1

    // ipTM
    const iptm = parseFloat(s.best_iptm)
    if (!isNaN(iptm)) {
      iptmSum += iptm
      iptmCount++
      stats.minIpTM = Math.min(stats.minIpTM, iptm)
      stats.maxIpTM = Math.max(stats.maxIpTM, iptm)
    }
  })

  stats.avgIpTM = iptmCount > 0 ? iptmSum / iptmCount : 0

  return stats
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Exporte les données en CSV
 * @param {Array} data - Données à exporter
 * @param {string} filename - Nom du fichier de sortie
 */
export function exportToCSV(data, filename) {
  try {
    const csv = Papa.unparse(data, {
      delimiter: ';',
      header: true,
      skipEmptyLines: true
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href) // Libération de la mémoire
  } catch (error) {
    console.error('Erreur lors de l\'export CSV:', error)
    throw error
  }
}
