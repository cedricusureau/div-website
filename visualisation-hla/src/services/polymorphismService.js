// services/polymorphismService.js
import Papa from 'papaparse'

/**
 * Service pour charger et gérer les données de polymorphisme HLA
 */
export class PolymorphismService {
  static cache = {
    A: null,
    B: null,
    lastFetch: null
  }

  static CACHE_DURATION = 60 * 60 * 1000 // 1 heure

  /**
   * Charge les données de polymorphisme pour les deux locus
   * @returns {Promise<{A: Object, B: Object}>}
   */
  static async loadPolymorphismData() {
    // Vérifier le cache
    if (this.isCacheValid()) {
      console.log('Using cached polymorphism data')
      return {
        A: this.cache.A,
        B: this.cache.B
      }
    }

    try {
      // Charger les deux fichiers en parallèle
      const [csvTextA, csvTextB] = await Promise.all([
        fetch('/data/polymorphic_positions_A.csv').then(r => r.text()),
        fetch('/data/polymorphic_positions_B.csv').then(r => r.text())
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

      // Convertir en dictionnaires position -> données
      const convertToDict = (data) => {
        const dict = {}
        data.forEach(row => {
          dict[row.Position] = {
            heterozygosity: row.Heterozygosity,
            n_aa: row.N_AA,
            aa_distribution: row.AA_Distribution,
            selected: row.Selected === 'Yes'
          }
        })
        return dict
      }

      this.cache.A = convertToDict(dataA)
      this.cache.B = convertToDict(dataB)
      this.cache.lastFetch = Date.now()

      console.log(`Polymorphism data loaded: ${Object.keys(this.cache.A).length} positions (A), ${Object.keys(this.cache.B).length} positions (B)`)

      return {
        A: this.cache.A,
        B: this.cache.B
      }
    } catch (error) {
      console.error('Error loading polymorphism data:', error)
      // Retourner le cache si disponible
      if (this.cache.A && this.cache.B) {
        console.warn('Using cache after error')
        return {
          A: this.cache.A,
          B: this.cache.B
        }
      }
      throw new Error('Failed to load polymorphism data: ' + error.message)
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
   * @returns {Promise<{A: Object, B: Object}>}
   */
  static async forceReload() {
    this.cache = {
      A: null,
      B: null,
      lastFetch: null
    }
    return this.loadPolymorphismData()
  }

  /**
   * Filtre les positions par score de polymorphisme
   * @param {Object} positions - Dictionnaire des positions
   * @param {string} locus - Locus ('A' ou 'B')
   * @param {number} threshold - Seuil de polymorphisme (heterozygosity)
   * @param {boolean} polymorphicOnly - Si true, ne garde que les positions polymorphiques
   * @returns {Object} Positions filtrées
   */
  static filterByPolymorphism(positions, locus, threshold = 0, polymorphicOnly = false) {
    const polymorphismData = this.cache[locus]
    if (!polymorphismData) {
      console.warn('Polymorphism data not loaded')
      return positions
    }

    // Si le filtre n'est pas activé, retourner toutes les positions
    if (!polymorphicOnly) {
      return positions
    }

    // Si le filtre est activé, filtrer par seuil d'hétérozygotie
    const filtered = {}
    Object.entries(positions).forEach(([position, value]) => {
      const polyData = polymorphismData[position]

      if (!polyData) {
        // Si pas de données de polymorphisme, ne pas inclure la position
        return
      }

      // Garder uniquement les positions avec hétérozygosité >= threshold
      if (polyData.heterozygosity >= threshold) {
        filtered[position] = value
      }
    })

    return filtered
  }
}
