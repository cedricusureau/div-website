import Papa from 'papaparse';
import _ from 'lodash';

export class HlaSequenceComparisonService {
  /**
   * Load HLA sequences from the CSV file
   * @returns {Promise<Array>} Array of HLA sequence objects
   */
  static async loadHlaSequences() {
    try {
      const response = await fetch('/data/A.csv');
      const csvText = await response.text();
    
      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Validate and clean the loaded data
            const cleanedData = this.validateAndCleanSequences(results.data);
            resolve(cleanedData);
          },
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      throw new Error(`Failed to load HLA sequences: ${error.message}`);
    }
  }

  /**
   * Validate and clean loaded HLA sequences
   * @param {Array} sequences Raw sequence data
   * @returns {Array} Cleaned and validated sequences
   */
  static validateAndCleanSequences(sequences) {
    return sequences.filter(seq => 
      seq.Allele && 
      seq.Sequence && 
      typeof seq.Sequence === 'string'
    ).map(seq => ({
      allele: seq.Allele,
      sequence: seq.Sequence.toUpperCase().replace(/\s/g, ''),
      length: seq.Sequence.length
    }));
  }

  /**
   * Find a specific HLA sequence by allele name
   * @param {Array} sequences Full list of sequences
   * @param {string} allele Allele name to find
   * @returns {Object|null} Matching sequence or null
   */
  static findSequenceByAllele(sequences, allele) {
    return sequences.find(seq => 
      seq.allele.toLowerCase() === allele.toLowerCase()
    );
  }

  /**
   * Compare two HLA sequences and find mismatches
   * @param {string} sequence1 First sequence
   * @param {string} sequence2 Second sequence
   * @returns {Object} Comparison results
   */
  static compareSequences(sequence1, sequence2) {
    // Ensure sequences are of equal length by padding with dashes if needed
    const maxLength = Math.max(sequence1.length, sequence2.length);
    const paddedSeq1 = this.padSequence(sequence1, maxLength);
    const paddedSeq2 = this.padSequence(sequence2, maxLength);

    // Find mismatches
    const mismatches = [];
    for (let i = 0; i < maxLength; i++) {
      if (paddedSeq1[i] !== paddedSeq2[i]) {
        mismatches.push({
          position: i + 1,
          reference: paddedSeq1[i],
          variant: paddedSeq2[i]
        });
      }
    }

    return {
      sequence1: paddedSeq1,
      sequence2: paddedSeq2,
      mismatches: mismatches,
      mismatchCount: mismatches.length,
      mismatchPercentage: (mismatches.length / maxLength) * 100
    };
  }

  /**
   * Pad sequence to a specific length
   * @param {string} sequence Original sequence
   * @param {number} length Desired length
   * @returns {string} Padded sequence
   */
  static padSequence(sequence, length) {
    if (sequence.length >= length) return sequence;
    return sequence + '-'.repeat(length - sequence.length);
  }

  /**
   * Perform a comprehensive HLA sequence comparison
   * @param {Array} sequences Full list of sequences
   * @param {string} allele1 First allele to compare
   * @param {string} allele2 Second allele to compare
   * @returns {Object} Detailed comparison results
   */
  static async performHlaComparison(allele1, allele2) {
    try {
      // Load sequences
      const sequences = await this.loadHlaSequences();

      // Find specific sequences
      const seq1 = this.findSequenceByAllele(sequences, allele1);
      const seq2 = this.findSequenceByAllele(sequences, allele2);

      // Validate sequences
      if (!seq1) throw new Error(`Sequence for ${allele1} not found`);
      if (!seq2) throw new Error(`Sequence for ${allele2} not found`);

      // Compare sequences
      const comparisonResults = this.compareSequences(seq1.sequence, seq2.sequence);

      return {
        allele1: {
          name: allele1,
          sequence: seq1.sequence,
          length: seq1.sequence.length
        },
        allele2: {
          name: allele2,
          sequence: seq2.sequence,
          length: seq2.sequence.length
        },
        comparison: comparisonResults
      };
    } catch (error) {
      console.error('HLA Comparison Error:', error);
      throw error;
    }
  }

  /**
   * Get all available HLA alleles
   * @param {Array} sequences Loaded sequences
   * @returns {Array} List of unique allele names
   */
  static getAvailableAlleles(sequences) {
    return _.uniq(sequences.map(seq => seq.allele));
  }
}
