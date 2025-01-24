import _ from 'lodash';
import Papa from 'papaparse';
import { getGranthamScore } from './granthamScores';


export class HlaService {
   // Cache statique pour stocker les données
   static cache = {
    A: null,
    B: null,
    mhcContacts: null,
    lastFetch: null
  };

  // Durée de validité du cache (par exemple, 1 heure)
  static CACHE_DURATION = 60 * 60 * 1000; 

  static async loadData() {
    // Vérifier si les données sont déjà en cache et toujours valides
    if (this.isCacheValid()) {
      console.log('Utilisation des données en cache');
      return {
        A: this.cache.A,
        B: this.cache.B,
        mhcContacts: this.cache.mhcContacts
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

      // Charger tous les fichiers en parallèle
      const [csvTextA, csvTextB, csvTextMhc] = await Promise.all([
        fetchCSV('A.csv'),
        fetchCSV('B.csv'),
        fetchCSV('mhc_contacts_2.csv')
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
            // Retirer l'option chunk pour éviter les problèmes de mémoire
          });
        });
      };

      // Parser tous les CSV en parallèle
      const [dataA, dataB, dataMhc] = await Promise.all([
        parseCSV(csvTextA),
        parseCSV(csvTextB),
        parseCSV(csvTextMhc)
      ]);

      // Mettre à jour le cache
      this.cache.A = dataA;
      this.cache.B = dataB;
      this.cache.mhcContacts = dataMhc;
      this.cache.lastFetch = Date.now();

      return {
        A: dataA,
        B: dataB,
        mhcContacts: dataMhc
      };
    } catch (error) {
      console.error('CSV loading error:', error);
      // Si une erreur survient pendant le chargement, utiliser le cache si disponible
      if (this.cache.A && this.cache.B && this.cache.mhcContacts) {
        console.warn('Utilisation du cache après erreur de chargement');
        return {
          A: this.cache.A,
          B: this.cache.B,
          mhcContacts: this.cache.mhcContacts
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
      this.cache.mhcContacts &&
      this.cache.lastFetch &&
      Date.now() - this.cache.lastFetch < this.CACHE_DURATION
    );
  }

  // Méthode pour forcer le rechargement des données
  static async forceReload() {
    this.cache = {
      A: null,
      B: null,
      mhcContacts: null,
      lastFetch: null
    };
    return this.loadData();
  }
  
  static getPatchPosition(
    data,
    locus,
    distanceThreshold,
    percentageThreshold,
    interactionType = null,
    allele1 = null,
    allele2 = null,
    aCsv,
    bCsv
  ) {
    if (allele1) console.log('allele1:', allele1);
    if (allele2) console.log('allele2:', allele2);

    // Initial filtering by locus and threshold
    const filteredData = data.filter(row =>
      row.Locus === locus &&
      parseFloat(row.Threshold) === distanceThreshold
    );

    const totalStructures = _.uniqBy(filteredData, 'Structure').length;
    const positionInteractions = {};
    const uniquePositions = _.uniq(filteredData.map(row => row.ResidueID));

    // Store detailed contact information for each position

    uniquePositions.forEach(position => {
      const posData = filteredData.filter(row => row.ResidueID === position);

      // Get peptide interactions
      const peptideContacts = posData.filter(row =>
        row.InteractingChains.includes('Peptide')
      );
      const peptideStructures = _.uniqBy(peptideContacts, 'Structure');

      // Get TCR interactions
      const tcrContacts = posData.filter(row =>
        row.InteractingChains.includes('TCRA') ||
        row.InteractingChains.includes('TCRB')
      );
      const tcrStructures = _.uniqBy(tcrContacts, 'Structure');

      const peptidePercentage = (peptideStructures.length / totalStructures) * 100;
      const tcrPercentage = (tcrStructures.length / totalStructures) * 100;

      positionInteractions[position] = {
        peptidePercentage,
        tcrPercentage,
        peptideStructures: peptideStructures.length,
        tcrStructures: tcrStructures.length
      };
    });

    const positionWeighted = {};
    Object.entries(positionInteractions).forEach(([position, interactions]) => {
      if (interactionType === 'Peptide' &&
        interactions.peptidePercentage > percentageThreshold) {
        positionWeighted[position] = 'Peptide';
      }
      else if (interactionType === 'TCR' &&
        interactions.tcrPercentage > percentageThreshold) {
        positionWeighted[position] = 'TCR';
      }
      else if (interactionType === 'Peptide + TCR' &&
        interactions.peptidePercentage > percentageThreshold &&
        interactions.tcrPercentage > percentageThreshold) {
        positionWeighted[position] = 'Peptide + TCR';
      }
      else if (interactionType === 'Peptide or TCR') {
        if (interactions.peptidePercentage > percentageThreshold &&
          interactions.tcrPercentage > percentageThreshold) {
          positionWeighted[position] = 'Peptide + TCR';
        } else if (interactions.peptidePercentage > percentageThreshold) {
          positionWeighted[position] = 'Peptide';
        } else if (interactions.tcrPercentage > percentageThreshold) {
          positionWeighted[position] = 'TCR';
        }
      }
    });

    let classicalDivergence = null;
    let specificDivergence = null;
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
        classicalDivergence = totalGranthamScore / 181;

        const weightedPositions = Object.keys(positionWeighted);
        const weightedMismatches = alleleSpecificPositions.mismatches.filter(
          mismatch => weightedPositions.includes(mismatch.position)
        );

        if (weightedPositions.length > 0) {
          const weightedTotal = weightedMismatches.reduce(
            (sum, mismatch) => sum + (mismatch.granthamScore || 0),
            0
          );
          specificDivergence = weightedTotal / weightedPositions.length;
        }
      }
    }

    return {
      positionWeighted,
      alleleSpecificPositions,
      classicalDivergence,
      specificDivergence,
      filteredData,
      totalStructures
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