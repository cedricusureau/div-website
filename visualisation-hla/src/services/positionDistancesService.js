import initSqlJs from 'sql.js';

/**
 * Service pour charger et analyser les distances HLA par position
 * Utilise les bases SQLite distances_A.sqlite et distances_B.sqlite
 */
export class PositionDistancesService {
  constructor() {
    this.dbConnections = { A: null, B: null };
    this.sqljs = null;
    this.initialized = false;
  }

  /**
   * Initialise sql.js
   */
  async init() {
    if (this.initialized) return;

    try {
      this.sqljs = await initSqlJs({
        locateFile: file => `/sql-wasm/${file}`
      });
      this.initialized = true;
      console.log('sql.js initialisé');
    } catch (error) {
      console.error('Erreur initialisation sql.js:', error);
      throw error;
    }
  }

  /**
   * Charge la base de données SQLite pour un locus donné
   * @param {string} locus - 'A' ou 'B'
   * @returns {Promise<Database>}
   */
  async loadDatabase(locus) {
    if (!this.initialized) {
      await this.init();
    }

    // Utiliser le cache si disponible
    if (this.dbConnections[locus]) {
      return this.dbConnections[locus];
    }

    try {
      const response = await fetch(`/data/distances_${locus}.sqlite`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status} pour distances_${locus}.sqlite`);
      }

      const buffer = await response.arrayBuffer();
      this.dbConnections[locus] = new this.sqljs.Database(new Uint8Array(buffer));
      console.log(`Base distances_${locus}.sqlite chargée`);

      return this.dbConnections[locus];
    } catch (error) {
      console.error(`Erreur chargement base ${locus}:`, error);
      throw error;
    }
  }

  /**
   * Récupère toutes les données pour une position donnée
   * @param {string} locus - 'A' ou 'B'
   * @param {number} position - Position HLA (1-182)
   * @returns {Promise<Array>} Array d'objets {min_distance, aa, target, structure_id, allele}
   */
  async getPositionData(locus, position) {
    const db = await this.loadDatabase(locus);

    try {
      // Utiliser paramètres nommés avec sql.js
      const stmt = db.prepare('SELECT min_distance, aa, target, structure_id, allele FROM distances WHERE position = $position');
      stmt.bind({ $position: position });

      const results = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(row);
      }
      stmt.free();

      console.log(`Position ${position}:${locus} - ${results.length} résultats trouvés`);
      return results;
    } catch (error) {
      console.error(`Erreur requête position ${position}:${locus}:`, error);
      return [];
    }
  }

  /**
   * Récupère le nombre de mesures par position pour un locus
   * Utilisé pour le mini-graphique aperçu
   * @param {string} locus - 'A' ou 'B'
   * @returns {Promise<Array>} Array d'objets {position, count}
   */
  async getPositionCountsByLocus(locus) {
    const db = await this.loadDatabase(locus);

    try {
      const result = db.exec(
        'SELECT position, COUNT(*) as count FROM distances GROUP BY position ORDER BY position'
      );

      if (!result || result.length === 0) {
        return [];
      }

      const values = result[0].values;
      return values.map(row => ({
        position: row[0],
        count: row[1]
      }));
    } catch (error) {
      console.error(`Erreur comptage positions ${locus}:`, error);
      return [];
    }
  }

  /**
   * Calcule les statistiques de base d'un array de valeurs
   * @param {Array<number>} values
   * @returns {Object} {mean, median, std, min, max, n}
   */
  calculateStats(values) {
    if (!values || values.length === 0) {
      return { mean: 0, median: 0, std: 0, min: 0, max: 0, n: 0 };
    }

    const n = values.length;
    const sorted = [...values].sort((a, b) => a - b);

    // Moyenne
    const mean = values.reduce((sum, val) => sum + val, 0) / n;

    // Médiane
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    // Écart-type
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const std = Math.sqrt(variance);

    return {
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      std: parseFloat(std.toFixed(2)),
      min: parseFloat(sorted[0].toFixed(2)),
      max: parseFloat(sorted[n - 1].toFixed(2)),
      n
    };
  }

  /**
   * Calcule le Kernel Density Estimation (KDE) avec noyau Gaussien
   * @param {Array<number>} values - Valeurs à analyser
   * @param {number|string} bandwidth - Largeur de bande ('auto' ou valeur numérique)
   * @param {number} numPoints - Nombre de points pour la grille d'évaluation
   * @returns {Object} {x: Array, y: Array, bandwidth: number}
   */
  calculateKDE(values, bandwidth = 'auto', numPoints = 100) {
    if (!values || values.length === 0) {
      return { x: [], y: [], bandwidth: 0 };
    }

    // Bandwidth automatique (règle de Silverman)
    if (bandwidth === 'auto') {
      const stats = this.calculateStats(values);
      bandwidth = 1.06 * stats.std * Math.pow(values.length, -1 / 5);
    }

    // Éviter bandwidth trop petit
    if (bandwidth < 0.1) bandwidth = 0.1;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    // Grille d'évaluation (étendre de 10% de chaque côté)
    const x = Array.from({ length: numPoints }, (_, i) => {
      return min - range * 0.1 + (range * 1.2) * i / (numPoints - 1);
    });

    // Noyau Gaussien
    const gaussian = (u) => Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);

    // Calcul de la densité pour chaque point de la grille
    const y = x.map(xi => {
      const density = values.reduce((sum, val) => {
        const u = (xi - val) / bandwidth;
        return sum + gaussian(u);
      }, 0);
      return density / (values.length * bandwidth);
    });

    return { x, y, bandwidth };
  }

  /**
   * Calcule un histogramme
   * @param {Array<number>} values
   * @param {number} numBins - Nombre de bins (par défaut: règle de Sturges)
   * @returns {Array} Array d'objets {x0, x1, count, density}
   */
  calculateHistogram(values, numBins = null) {
    if (!values || values.length === 0) {
      return [];
    }

    // Règle de Sturges pour le nombre de bins
    if (!numBins) {
      numBins = Math.ceil(Math.log2(values.length) + 1);
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / numBins;

    // Initialiser les bins
    const bins = Array.from({ length: numBins }, (_, i) => ({
      x0: min + i * binWidth,
      x1: min + (i + 1) * binWidth,
      count: 0
    }));

    // Remplir les bins
    values.forEach(val => {
      const binIndex = Math.min(
        Math.floor((val - min) / binWidth),
        numBins - 1
      );
      bins[binIndex].count++;
    });

    // Calculer la densité (normaliser par largeur de bin et total)
    const totalCount = values.length;
    bins.forEach(bin => {
      bin.density = bin.count / (totalCount * binWidth);
    });

    return bins;
  }

  /**
   * Ferme les connexions aux bases de données
   */
  close() {
    Object.values(this.dbConnections).forEach(db => {
      if (db) db.close();
    });
    this.dbConnections = { A: null, B: null };
  }
}

// Instance singleton
export const positionDistancesService = new PositionDistancesService();
