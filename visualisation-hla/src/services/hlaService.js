import Papa from 'papaparse';
import { getGranthamScore } from './granthamScores';
import { ContactFrequencyService } from './contactFrequencyService';
import { PolymorphismService } from './polymorphismService';

export class HlaService {
   // Cache statique pour stocker les données
   static cache = {
    A: null,
    B: null,
    lastFetch: null,
    contactData: null
  };

  // Durée de validité du cache (par exemple, 1 heure)
  static CACHE_DURATION = 60 * 60 * 1000;

  static async loadData() {
    // Vérifier si les données sont déjà en cache et toujours valides
    if (this.isCacheValid()) {
      console.log('Utilisation des données en cache');
      return {
        A: this.cache.A,
        B: this.cache.B
      };
    }

    try {
      // Fonction helper pour charger un fichier CSV
      const fetchCSV = async (filename) => {
        const response = await fetch(`/data/${filename}`);
        if (!response.ok) {
          throw new Error(`HTTP error for ${filename}! status: ${response.status}`);
        }
        return response.text();
      };

      // Charger les fichiers de séquences HLA
      const [csvTextA, csvTextB] = await Promise.all([
        fetchCSV('A.csv'),
        fetchCSV('B.csv')
      ]);

      // Fonction de parsing optimisée
      const parseCSV = (csvText) => {
        return new Promise((resolve) => {
          Papa.parse(csvText, {
            header: true,
            delimiter: ';',
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
          });
        });
      };

      // Parser les CSV en parallèle
      const [dataA, dataB] = await Promise.all([
        parseCSV(csvTextA),
        parseCSV(csvTextB)
      ]);

      // Charger les services auxiliaires en parallèle
      await Promise.all([
        ContactFrequencyService.loadContactFrequency(),
        PolymorphismService.loadPolymorphismData()
      ]);

      // Mettre à jour le cache
      this.cache.A = dataA;
      this.cache.B = dataB;
      this.cache.lastFetch = Date.now();

      return {
        A: dataA,
        B: dataB
      };
    } catch (error) {
      console.error('CSV loading error:', error);
      // Si une erreur survient pendant le chargement, utiliser le cache si disponible
      if (this.cache.A && this.cache.B) {
        console.warn('Utilisation du cache après erreur de chargement');
        return {
          A: this.cache.A,
          B: this.cache.B
        };
      }
      throw new Error('Failed to load CSV data: ' + error.message);
    }
  }

  // Vérifier si le cache est valide
  static isCacheValid() {
    return (
      this.cache.A &&
      this.cache.B &&
      this.cache.lastFetch &&
      Date.now() - this.cache.lastFetch < this.CACHE_DURATION
    );
  }

  // Méthode pour forcer le rechargement des données
  static async forceReload() {
    this.cache = {
      A: null,
      B: null,
      lastFetch: null,
      contactData: null
    };
    return this.loadData();
  }

  /**
   * Charge les données de contact peptide/MHC depuis le fichier CSV
   * @returns {Promise<Array>} Données de contact
   */
  static async loadContactData() {
    // Utiliser le cache si disponible
    if (this.cache.contactData) {
      console.log('Utilisation des données de contact en cache');
      return this.cache.contactData;
    }

    try {
      const response = await fetch('/data/mhc_contact_peptides.csv');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();

      return new Promise((resolve) => {
        Papa.parse(csvText, {
          header: true,
          delimiter: ';',
          dynamicTyping: false, // Garder tout en string pour éviter les problèmes de typage
          skipEmptyLines: true,
          complete: (results) => {
            // Mettre en cache
            this.cache.contactData = results.data;
            console.log(`Données de contact chargées: ${results.data.length} lignes`);
            resolve(results.data);
          },
          error: (error) => {
            console.error('Erreur de parsing CSV:', error);
            resolve([]);
          }
        });
      });
    } catch (error) {
      console.error('Erreur de chargement des données de contact:', error);
      return [];
    }
  }
  
  /**
   * Obtient les positions de contact selon les paramètres donnés
   * @param {string} locus - Locus ('A' ou 'B')
   * @param {string} mode - Mode ('either', 'tcr', ou 'peptide')
   * @param {number} distance - Distance en Å
   * @param {number} quantile - Quantile (0-1)
   * @param {boolean} polymorphicOnly - Appliquer le filtre polymorphique
   * @param {string} allele1 - Premier allèle pour calcul de divergence (optionnel)
   * @param {string} allele2 - Deuxième allèle pour calcul de divergence (optionnel)
   * @param {Array} aCsv - Données de séquences HLA-A
   * @param {Array} bCsv - Données de séquences HLA-B
   * @param {Object} visiblePositions - Positions visibles (pour calcul tHed)
   * @param {number} heterozygosityThreshold - Seuil d'hétérozygotie en % (0-100)
   * @returns {Object}
   */
  static getPatchPosition(
    locus,
    mode,
    distance,
    quantile,
    polymorphicOnly = false,
    allele1 = null,
    allele2 = null,
    aCsv,
    bCsv,
    visiblePositions = null,
    heterozygosityThreshold = 5
  ) {

    // Récupérer les positions pour tous les modes nécessaires
    const peptideResult = ContactFrequencyService.getPositions('peptide', distance, quantile);
    const tcrResult = ContactFrequencyService.getPositions('tcr', distance, quantile);
    const lookupResult = ContactFrequencyService.getPositions(mode, distance, quantile);

    if (!peptideResult || !tcrResult || !lookupResult) {
      console.error('Could not retrieve positions from contact frequency lookup');
      return {
        positionWeighted: {},
        alleleSpecificPositions: null,
        cHed: null,
        tHed: null,
        filteredData: [],
        totalStructures: 0
      };
    }

    // Récupérer les positions selon le locus
    const positions = locus === 'A' ? lookupResult.positions_A : lookupResult.positions_B;
    const peptidePositions = locus === 'A' ? peptideResult.positions_A : peptideResult.positions_B;
    const tcrPositions = locus === 'A' ? tcrResult.positions_A : tcrResult.positions_B;

    // Convertir en Sets pour faciliter les comparaisons
    const peptideSet = new Set(peptidePositions);
    const tcrSet = new Set(tcrPositions);

    // Créer le dictionnaire de positions avec types appropriés
    let positionWeighted = {};
    positions.forEach(position => {
      const inPeptide = peptideSet.has(position);
      const inTcr = tcrSet.has(position);

      if (inPeptide && inTcr) {
        positionWeighted[position] = 'Peptide + TCR';
      } else if (inPeptide) {
        positionWeighted[position] = 'Peptide';
      } else if (inTcr) {
        positionWeighted[position] = 'TCR';
      } else {
        // Position dans le mode sélectionné mais pas dans peptide ou tcr individuellement
        // Assigner un type par défaut selon le mode
        positionWeighted[position] = mode === 'either' ? 'Peptide + TCR' :
                                      mode === 'peptide' ? 'Peptide' : 'TCR';
      }
    });

    // Appliquer le filtre polymorphique si demandé
    if (polymorphicOnly) {
      positionWeighted = PolymorphismService.filterByPolymorphism(
        positionWeighted,
        locus,
        heterozygosityThreshold, // seuil d'hétérozygotie en %
        true // polymorphicOnly
      );
    }

    // Calculer les divergences si deux allèles sont fournis
    let cHed = null;
    let tHed = null;
    let alleleSpecificPositions = null;

    if (allele1 && allele2) {
      alleleSpecificPositions = this.calculateAlleleSpecificPositions(
        allele1,
        allele2,
        aCsv,
        bCsv,
        locus
      );

      if (alleleSpecificPositions && alleleSpecificPositions.mismatches) {
        const totalGranthamScore = alleleSpecificPositions.mismatches.reduce(
          (sum, mismatch) => sum + (mismatch.granthamScore || 0),
          0
        );
        cHed = totalGranthamScore / 181;

        // Utiliser les positions visibles si fournies, sinon utiliser toutes les positions
        const positionsForCalculation = visiblePositions ? Object.keys(visiblePositions) : Object.keys(positionWeighted);
        // Convertir toutes les positions en strings pour cohérence
        const positionsAsStrings = positionsForCalculation.map(pos => String(pos));
        const weightedMismatches = alleleSpecificPositions.mismatches.filter(
          mismatch => positionsAsStrings.includes(String(mismatch.position))
        );

        if (positionsForCalculation.length > 0) {
          const weightedTotal = weightedMismatches.reduce(
            (sum, mismatch) => sum + (mismatch.granthamScore || 0),
            0
          );
          tHed = weightedTotal / positionsForCalculation.length;
        }
      }
    }

    // Nombre de structures par locus (basé sur curated_metadata.csv)
    const totalStructures = locus === 'A' ? 239 : 193;

    return {
      positionWeighted,
      alleleSpecificPositions,
      cHed,
      tHed,
      filteredData: [], // Plus utilisé avec le nouveau système
      totalStructures // 239 pour locus A, 193 pour locus B
    };
  }

  static calculateAlleleSpecificPositions(allele1, allele2, aCsv, bCsv, locus) {
    const alleleSpecificPositions = {
      mismatches: [],
      totalMismatches: 0
    };

    // Récupérer le CSV approprié
    const csvData = locus === 'A' ? aCsv : bCsv;

    // Créer un objet indexé par 'AA'
    const seqIndex = {};
    csvData.forEach(row => {
      if (row['AA']) {
        seqIndex[row['AA']] = row;
      }
    });

    // Fonction pour récupérer la séquence
    const getSequence = (hla) => {
      const sequence = seqIndex[hla];

      if (!sequence) {
        console.warn(`Allèle ${hla} non trouvé. Allèles disponibles:`,
          Object.keys(seqIndex).slice(0, 10).join(', ')
        );
        return null;
      }

      // Filtrer et trier les colonnes de position
      const sequenceColumns = Object.keys(sequence)
        .filter(key => !isNaN(parseInt(key)) && parseInt(key) > 0 && parseInt(key) <= 341)
        .sort((a, b) => parseInt(a) - parseInt(b));

      const sequenceData = sequenceColumns.map(col => sequence[col]);

      return {
        allele: hla,
        sequenceColumns,
        sequence: sequenceData
      };
    };

    // Récupérer les séquences
    const seq1 = getSequence(allele1);
    const seq2 = getSequence(allele2);

    // Comparer les séquences si les deux sont disponibles
    if (seq1 && seq2) {
      const findMismatches = (seq1, seq2) => {
        const mismatches = [];

        for (let i = 0; i < 182; i++) {
          if (seq1.sequence[i] !== seq2.sequence[i]) {
            const granthamScore = getGranthamScore(seq1.sequence[i], seq2.sequence[i]);

            mismatches.push({
              position: seq1.sequenceColumns[i],
              allele1: {
                allele: seq1.allele,
                aminoAcid: seq1.sequence[i]
              },
              allele2: {
                allele: seq2.allele,
                aminoAcid: seq2.sequence[i]
              },
              granthamScore: granthamScore
            });
          }
        }

        return mismatches;
      };

      alleleSpecificPositions.mismatches = findMismatches(seq1, seq2);
      alleleSpecificPositions.totalMismatches = alleleSpecificPositions.mismatches.length;

      // Limit console log to prevent overwhelming output
      console.log(`Mismatches between ${allele1} and ${allele2}:`,
        alleleSpecificPositions.mismatches.slice(0, 10),
        `(${alleleSpecificPositions.totalMismatches} total)`
      );
    } else {
      console.warn(`Could not compare sequences for ${allele1} and ${allele2}`);
    }

    return alleleSpecificPositions;
  }
}