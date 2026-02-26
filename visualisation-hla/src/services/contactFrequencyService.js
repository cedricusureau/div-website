// services/contactFrequencyService.js

/**
 * Service pour charger et gérer le lookup de fréquence de contacts
 * Positions pré-calculées par distance × quantile (SANS filtre polymorphique)
 */
export class ContactFrequencyService {
  static cache = {
    data: null,
    lastFetch: null
  }

  static CACHE_DURATION = 60 * 60 * 1000 // 1 heure

  /**
   * Charge le fichier contact_frequency_lookup.json
   * @returns {Promise<Object>}
   */
  static async loadContactFrequency() {
    // Vérifier le cache
    if (this.isCacheValid()) {
      console.log('Using cached contact frequency data')
      return this.cache.data
    }

    try {
      const response = await fetch('/data/contact_frequency_lookup.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      this.cache.data = data
      this.cache.lastFetch = Date.now()

      console.log(`Contact frequency data loaded: ${data.metadata.total_configs} configs per mode`)

      return data
    } catch (error) {
      console.error('Error loading contact frequency data:', error)
      // Retourner le cache si disponible
      if (this.cache.data) {
        console.warn('Using cache after error')
        return this.cache.data
      }
      throw new Error('Failed to load contact frequency data: ' + error.message)
    }
  }

  /**
   * Vérifie si le cache est valide
   * @returns {boolean}
   */
  static isCacheValid() {
    return (
      this.cache.data &&
      this.cache.lastFetch &&
      Date.now() - this.cache.lastFetch < this.CACHE_DURATION
    )
  }

  /**
   * Force le rechargement des données
   * @returns {Promise<Object>}
   */
  static async forceReload() {
    this.cache = {
      data: null,
      lastFetch: null
    }
    return this.loadContactFrequency()
  }

  /**
   * Construit la clé de lookup pour une configuration distance/quantile
   * @param {number} distance - Distance (ex: 4.0)
   * @param {number} quantile - Quantile (ex: 0.7)
   * @returns {string} Clé (ex: "d4_0_q0_7")
   */
  static buildLookupKey(distance, quantile) {
    // Format distance: d4_0, d4_5, etc.
    const distStr = distance.toFixed(1).replace('.', '_')

    // Format quantile: q0_3, q0_35, q0_7, etc. (sans zéros inutiles)
    // Arrondir au plus proche 0.05
    const roundedQuantile = Math.round(quantile * 20) / 20
    const quantStr = roundedQuantile.toString().replace('.', '_')

    return `d${distStr}_q${quantStr}`
  }

  /**
   * Récupère les positions pour une configuration donnée
   * @param {string} mode - Mode ('either', 'tcr', ou 'peptide')
   * @param {number} distance - Distance en Å
   * @param {number} quantile - Quantile (0-1)
   * @returns {Object|null} { positions_A: Array, positions_B: Array, distance, quantile }
   */
  static getPositions(mode, distance, quantile) {
    if (!this.cache.data) {
      console.warn('Contact frequency data not loaded')
      return null
    }

    // Vérifier que le mode existe
    if (!this.cache.data.modes[mode]) {
      console.warn(`Mode '${mode}' not found`)
      return null
    }

    // Construire la clé
    const key = this.buildLookupKey(distance, quantile)

    // Récupérer la configuration
    const config = this.cache.data.modes[mode][key]

    if (!config) {
      console.warn(`Configuration '${key}' not found for mode '${mode}'`)
      return null
    }

    return {
      positions_A: config.positions_A || [],
      positions_B: config.positions_B || [],
      distance: config.distance,
      quantile: config.quantile
    }
  }

  /**
   * Récupère les métadonnées du lookup
   * @returns {Object|null}
   */
  static getMetadata() {
    if (!this.cache.data) {
      console.warn('Contact frequency data not loaded')
      return null
    }
    return this.cache.data.metadata
  }

  /**
   * Récupère les ranges de distance et quantile disponibles
   * @returns {Object|null} { distanceRange: [min, max], quantileRange: [min, max] }
   */
  static getRanges() {
    if (!this.cache.data) {
      console.warn('Contact frequency data not loaded')
      return null
    }

    const metadata = this.cache.data.metadata
    return {
      distanceRange: metadata.distance_range || [2.0, 5.0],
      quantileRange: metadata.quantile_range || [0.3, 0.9]
    }
  }

  /**
   * Liste tous les modes disponibles
   * @returns {Array<string>}
   */
  static getModes() {
    if (!this.cache.data) {
      console.warn('Contact frequency data not loaded')
      return []
    }
    return Object.keys(this.cache.data.modes)
  }
}
