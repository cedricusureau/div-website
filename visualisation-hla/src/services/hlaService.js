import _ from 'lodash';
import Papa from 'papaparse';
import { getGranthamScore } from './granthamScores';

export class HlaService {
    static async loadData() {
        try {
          // Load A.csv
          const responseA = await fetch('/data/A.csv');
          if (!responseA.ok) {
            throw new Error(`HTTP error for A.csv! status: ${responseA.status}`);
          }
          const csvTextA = await responseA.text();
    
          // Load B.csv
          const responseB = await fetch('/data/B.csv');
          if (!responseB.ok) {
            throw new Error(`HTTP error for B.csv! status: ${responseB.status}`);
          }
          const csvTextB = await responseB.text();
    
          // Load mhc_contacts.csv
          const responseMhc = await fetch('/data/mhc_contacts_2.csv');
          if (!responseMhc.ok) {
            throw new Error(`HTTP error for mhc_contacts.csv! status: ${responseMhc.status}`);
          }
          const csvTextMhc = await responseMhc.text();
    
          // Parse CSV function
          const parseCSV = (csvText) => {
            return new Promise((resolve, reject) => {
              Papa.parse(csvText, {
                header: true,
                delimiter: ';',
                dynamicTyping: true, // Automatically convert numbers
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: (error) => reject(error)
              });
            });
          };
    
          // Wait for all CSVs to be parsed
          const [dataA, dataB, dataMhc] = await Promise.all([
            parseCSV(csvTextA),
            parseCSV(csvTextB),
            parseCSV(csvTextMhc)
          ]);
    
          // Return an object with all datasets
          return {
            A: dataA,
            B: dataB,
            mhcContacts: dataMhc
          };
        } catch (error) {
          console.error('CSV loading error:', error);
          throw new Error('Failed to load CSV data: ' + error.message);
        }
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
      }}