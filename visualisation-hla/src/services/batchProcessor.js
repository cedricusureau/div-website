// batchProcessor.js
import { getGranthamScore } from './granthamScores';

export class BatchProcessor {
    static async processBatch(pairs, aCsv, bCsv, positions = {}, analysisParams) {

      // Prepare CSV headers
      const results = [
        [
          'Pair1', 
          'Pair2', 
          'Classical Divergence', 
          'Specific Divergence',
          'Normalized Classical Divergence (0-1)',
          'Normalized Specific Divergence (0-1)',
          'Locus',
          'Distance Threshold (Å)',
          'Percentage Threshold (%)',
          'Interaction Type',
          'Selected Positions'
        ]
      ];
  
      const weightedPositions = Object.keys(positions);
      let maxClassicalDivergence = 0;
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
  
        let classicalDivergence = 0;
        let specificDivergence = 0;
  
        if (alleleSpecificPositions && alleleSpecificPositions.mismatches) {
          // Calculate Classical Divergence
          const totalGranthamScore = alleleSpecificPositions.mismatches.reduce(
            (sum, mismatch) => sum + (mismatch.granthamScore || 0),
            0
          );
          classicalDivergence = totalGranthamScore / 181;
  
          // Calculate Specific Divergence using weighted positions
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
  
        maxClassicalDivergence = Math.max(maxClassicalDivergence, classicalDivergence);
        maxSpecificDivergence = Math.max(maxSpecificDivergence, specificDivergence);
  
        preliminaryResults.push({
          allele1,
          allele2,
          classicalDivergence,
          specificDivergence
        });
      }
  
      // Second pass to create normalized results
      for (const result of preliminaryResults) {
        const normalizedClassical = maxClassicalDivergence > 0 ? 
          result.classicalDivergence / maxClassicalDivergence : 0;
        const normalizedSpecific = maxSpecificDivergence > 0 ? 
          result.specificDivergence / maxSpecificDivergence : 0;
  
        results.push([
          result.allele1,
          result.allele2,
          result.classicalDivergence.toFixed(2),
          result.specificDivergence.toFixed(2),
          normalizedClassical.toFixed(3),
          normalizedSpecific.toFixed(3),
          analysisParams.locus,
          analysisParams.distance,
          analysisParams.percentage,
          analysisParams.interactionType,
          weightedPositions.join(', ')
        ]);
      }

      return this.generateCsv(results); // Add return statement here
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