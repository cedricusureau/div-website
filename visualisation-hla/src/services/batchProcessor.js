// batchProcessor.js
import { getGranthamScore } from './granthamScores';

export class BatchProcessor {
    static async processBatch(pairs, aCsv, bCsv, positions = {}, analysisParams) {
      const result = await this.processBatchWithVisualization(pairs, aCsv, bCsv, positions, analysisParams);
      return result.csvContent;
    }

    static async processBatchWithVisualization(pairs, aCsv, bCsv, positions = {}, analysisParams) {
      // Prepare CSV headers
      const csvResults = [
        [
          'Pair1', 
          'Pair2', 
          'c-HED', 
          't-HED',
          'c-HED_Normalized',
          't-HED_Normalized (0-1)',
          'Locus',
          'Distance Threshold (Å)',
          'Percentage Threshold (%)',
          'Interaction Type',
          'Selected Positions'
        ]
      ];
  
      const weightedPositions = Object.keys(positions);
      let maxHed = 0;
      let maxSpecificDivergence = 0;
      
      // First pass to find maximum values
      const preliminaryResults = [];
      for (const pair of pairs) {
        const [allele1, allele2] = pair;
        const locus = allele1.startsWith('A') ? 'A' : 'B';
        
        console.log(`Processing pair: ${allele1} - ${allele2}`);
        
        const alleleSpecificPositions = this.calculateAlleleSpecificPositions(
          allele1, allele2, aCsv, bCsv, locus
        );
  
        let cHed = 0;
        let tHed = 0;
  
        if (alleleSpecificPositions && alleleSpecificPositions.mismatches) {
          // Calculate c-HED
          const totalGranthamScore = alleleSpecificPositions.mismatches.reduce(
            (sum, mismatch) => sum + (mismatch.granthamScore || 0),
            0
          );
          cHed = totalGranthamScore / 181;
  
          // Calculate t-HED using weighted positions
          const weightedMismatches = alleleSpecificPositions.mismatches.filter(
            mismatch => weightedPositions.includes(mismatch.position)
          );
  
          if (weightedPositions.length > 0) {
            const weightedTotal = weightedMismatches.reduce(
              (sum, mismatch) => sum + (mismatch.granthamScore || 0),
              0
            );
            tHed = weightedTotal / weightedPositions.length;
          }
        }
  
        maxHed = Math.max(maxHed, cHed);
        maxSpecificDivergence = Math.max(maxSpecificDivergence, tHed);
  
        preliminaryResults.push({
          allele1,
          allele2,
          cHed,
          tHed
        });
      }
  
      // Second pass to create normalized results and visualization data
      const visualizationData = [];
      
      for (const result of preliminaryResults) {
        const normalizedCHed = maxHed > 0 ? 
          result.cHed / maxHed : 0;
        const normalizedTHed = maxSpecificDivergence > 0 ? 
          result.tHed / maxSpecificDivergence : 0;
  
        // Add to CSV results
        csvResults.push([
          result.allele1,
          result.allele2,
          result.cHed.toFixed(2),
          result.tHed.toFixed(2),
          normalizedCHed.toFixed(3),
          normalizedTHed.toFixed(3),
          analysisParams.locus,
          analysisParams.distance,
          analysisParams.percentage,
          analysisParams.interactionType,
          weightedPositions.join(', ')
        ]);

        // Add to visualization data
        visualizationData.push({
          pair1: result.allele1,
          pair2: result.allele2,
          cHed: result.cHed,
          tHed: result.tHed,
          normalizedCHed: normalizedCHed,
          normalizedTHed: normalizedTHed,
          pairLabel: `${result.allele1} vs ${result.allele2}`
        });
      }

      return {
        csvContent: this.generateCsv(csvResults),
        visualizationData: visualizationData,
        maxValues: {
          maxHed,
          maxSpecificDivergence
        }
      };
    }

    static generateCsv(rows) {
      if (!rows || !rows.length) {
        console.error('No rows provided to generateCsv');
        return '';
      }

      try {
        return rows.map(row => 
          row.map(cell => {
            if (cell === null || cell === undefined) return '';
            const cellStr = cell.toString();
            return cellStr.includes(',') ? `"${cellStr}"` : cellStr;
          }).join(',')
        ).join('\n');
      } catch (error) {
        console.error('Error generating CSV:', error);
        return '';
      }
    }

    static calculateAlleleSpecificPositions(allele1, allele2, aCsv, bCsv, locus) {
      const alleleSpecificPositions = {
        mismatches: [],
        totalMismatches: 0
      };

      const csvData = locus === 'A' ? aCsv : bCsv;
      const seqIndex = {};
      
      csvData.forEach(row => {
        if (row['AA']) {
          seqIndex[row['AA']] = row;
        }
      });

      const getSequence = (hla) => {
        const sequence = seqIndex[hla];
        if (!sequence) {
          console.warn(`Allele ${hla} not found. Available alleles:`,
            Object.keys(seqIndex).slice(0, 10).join(', ')
          );
          return null;
        }

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

      const seq1 = getSequence(allele1);
      const seq2 = getSequence(allele2);

      if (seq1 && seq2) {
        for (let i = 0; i < 182; i++) {
          if (seq1.sequence[i] !== seq2.sequence[i]) {
            const granthamScore = getGranthamScore(seq1.sequence[i], seq2.sequence[i]);
            alleleSpecificPositions.mismatches.push({
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

        alleleSpecificPositions.totalMismatches = alleleSpecificPositions.mismatches.length;
      }

      return alleleSpecificPositions;
    }
}