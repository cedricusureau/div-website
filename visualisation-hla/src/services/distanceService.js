// services/distanceService.js
import Papa from 'papaparse'

/**
 * Service pour charger et gérer les données de distances minimales HLA
 */
export class DistanceService {
  static cache = {
    A: null,
    B: null,
    lastFetch: null
  }

  static CACHE_DURATION = 60 * 60 * 1000 // 1 heure

  /**
   * Charge les données de distances pour les deux locus
   * @returns {Promise<{A: Array, B: Array}>}
   */
  static async loadDistanceData() {
    // Vérifier le cache
    if (this.isCacheValid()) {
      console.log('Using cached distance data')
      return {
        A: this.cache.A,
        B: this.cache.B
      }
    }

    try {
      // Charger les deux fichiers en parallèle
      const [csvTextA, csvTextB] = await Promise.all([
        fetch('/data/min_distances_A.csv').then(r => r.text()),
        fetch('/data/min_distances_B.csv').then(r => r.text())
      ])

      // Parser les CSV
      const parseCSV = (csvText) => {
        return new Promise((resolve) => {
          Papa.parse(csvText, {
            header: true,
            delimiter: ',',
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data)
          })
        })
      }

      const [dataA, dataB] = await Promise.all([
        parseCSV(csvTextA),
        parseCSV(csvTextB)
      ])

      this.cache.A = dataA
      this.cache.B = dataB
      this.cache.lastFetch = Date.now()

      console.log(`Distance data loaded: ${dataA.length} rows (A), ${dataB.length} rows (B)`)

      return {
        A: dataA,
        B: dataB
      }
    } catch (error) {
      console.error('Error loading distance data:', error)
      // Retourner le cache si disponible
      if (this.cache.A && this.cache.B) {
        console.warn('Using cache after error')
        return {
          A: this.cache.A,
          B: this.cache.B
        }
      }
      throw new Error('Failed to load distance data: ' + error.message)
    }
  }

  /**
   * Vérifie si le cache est valide
   * @returns {boolean}
   */
  static isCacheValid() {
    return (
      this.cache.A &&
      this.cache.B &&
      this.cache.lastFetch &&
      Date.now() - this.cache.lastFetch < this.CACHE_DURATION
    )
  }

  /**
   * Force le rechargement des données
   * @returns {Promise<{A: Array, B: Array}>}
   */
  static async forceReload() {
    this.cache = {
      A: null,
      B: null,
      lastFetch: null
    }
    return this.loadDistanceData()
  }

  /**
   * Calcule les quantiles de distances pour un locus et une cible
   * @param {string} locus - Locus ('A' ou 'B')
   * @param {string} target - Cible ('TCR', 'Peptide', ou 'Both')
   * @returns {Object} Quantiles {q10, q25, q50, q75, q90}
   */
  static calculateQuantiles(locus, target = 'Both') {
    const data = this.cache[locus]
    if (!data) {
      console.warn('Distance data not loaded')
      return null
    }

    // Filtrer par cible
    let distances
    if (target === 'Both') {
      distances = data.map(row => row.min_distance)
    } else {
      distances = data
        .filter(row => row.target === target)
        .map(row => row.min_distance)
    }

    // Trier
    distances.sort((a, b) => a - b)

    // Calculer les quantiles
    const quantile = (arr, q) => {
      const pos = (arr.length - 1) * q
      const base = Math.floor(pos)
      const rest = pos - base
      if (arr[base + 1] !== undefined) {
        return arr[base] + rest * (arr[base + 1] - arr[base])
      } else {
        return arr[base]
      }
    }

    return {
      min: distances[0],
      q10: quantile(distances, 0.10),
      q25: quantile(distances, 0.25),
      q50: quantile(distances, 0.50),
      q75: quantile(distances, 0.75),
      q90: quantile(distances, 0.90),
      max: distances[distances.length - 1]
    }
  }

  /**
   * Filtre les positions par seuil de distance
   * @param {string} locus - Locus ('A' ou 'B')
   * @param {number} distanceThreshold - Seuil de distance
   * @param {string} target - Cible ('TCR', 'Peptide', ou 'Both')
   * @param {number} percentageThreshold - Pourcentage minimum de structures (0-100)
   * @returns {Object} Positions avec leurs informations {position: {percentage, structureCount, ...}}
   */
  static getPositionsByDistance(locus, distanceThreshold, target = 'Both', percentageThreshold = 0) {
    const data = this.cache[locus]
    if (!data) {
      console.warn('Distance data not loaded')
      return {}
    }

    // Filtrer par distance et cible
    let filteredData
    if (target === 'Both') {
      filteredData = data.filter(row => row.min_distance <= distanceThreshold)
    } else {
      filteredData = data.filter(row =>
        row.target === target && row.min_distance <= distanceThreshold
      )
    }

    // Grouper par position
    const positionGroups = {}
    filteredData.forEach(row => {
      const pos = row.position
      if (!positionGroups[pos]) {
        positionGroups[pos] = []
      }
      positionGroups[pos].push(row)
    })

    // Calculer le nombre total de structures pour chaque position
    const totalStructuresPerPosition = {}
    const allData = target === 'Both'
      ? data
      : data.filter(row => row.target === target)

    allData.forEach(row => {
      const pos = row.position
      if (!totalStructuresPerPosition[pos]) {
        totalStructuresPerPosition[pos] = new Set()
      }
      totalStructuresPerPosition[pos].add(row.structure_id)
    })

    // Calculer les statistiques pour chaque position
    const positionStats = {}
    Object.entries(positionGroups).forEach(([position, rows]) => {
      const structureIds = new Set(rows.map(r => r.structure_id))
      const structureCount = structureIds.size
      const totalStructures = totalStructuresPerPosition[position]?.size || 1
      const percentage = (structureCount / totalStructures) * 100

      // Appliquer le filtre de pourcentage
      if (percentage >= percentageThreshold) {
        positionStats[position] = {
          structureCount,
          totalStructures,
          percentage: percentage.toFixed(2),
          meanDistance: rows.reduce((sum, r) => sum + r.min_distance, 0) / rows.length,
          target: target
        }
      }
    })

    return positionStats
  }
}
