// services/entropyService.js
import Papa from 'papaparse';

export class EntropyService {
  static cache = {
    A: null,
    B: null,
    lastFetch: null
  };

  static CACHE_DURATION = 60 * 60 * 1000; // 1 heure

  static async loadEntropyData() {
    // Vérifier si les données sont déjà en cache et toujours valides
    if (this.isCacheValid()) {
      console.log('Utilisation des données d\'entropie en cache');
      return {
        A: this.cache.A,
        B: this.cache.B
      };
    }

    try {
      // Charger le fichier d'entropie
      const response = await fetch('/data/entropy.csv');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();

      // Parser le CSV avec Papa Parse
      const parsed = await new Promise((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          delimiter: ';',
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      });

      // Séparer les données par locus
      const entropyA = {};
      const entropyB = {};

      parsed.forEach(row => {
        if (row.Locus === 'A') {
          entropyA[row.Position] = row.Entropy;
        } else if (row.Locus === 'B') {
          entropyB[row.Position] = row.Entropy;
        }
      });

      // Mettre à jour le cache
      this.cache.A = entropyA;
      this.cache.B = entropyB;
      this.cache.lastFetch = Date.now();

      return {
        A: entropyA,
        B: entropyB
      };
    } catch (error) {
      console.error('Erreur lors du chargement des données d\'entropie:', error);
      throw error;
    }
  }

  static isCacheValid() {
    return (
      this.cache.A &&
      this.cache.B &&
      this.cache.lastFetch &&
      Date.now() - this.cache.lastFetch < this.CACHE_DURATION
    );
  }

  // Fonction pour filtrer les positions basée sur l'entropie
  static filterPolymorphicPositions(positions, locus, threshold = 0.2) {
    const entropyData = locus === 'A' ? this.cache.A : this.cache.B;
    if (!entropyData) {
      return positions;
    }

    // Filtrer les positions avec entropie >= seuil
    return Object.entries(positions).reduce((filtered, [position, type]) => {
      const entropy = entropyData[position];
      // Inclure seulement si l'entropie est définie et >= seuil
      if (entropy !== undefined && entropy >= threshold) {
        filtered[position] = type;
      }
      return filtered;
    }, {});
  }
}