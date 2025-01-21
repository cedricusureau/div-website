import _ from 'lodash';
import Papa from 'papaparse';

export class HlaService {
  static async loadData() {
    try {
      const response = await fetch('/data/mhc_contacts.csv');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();
      
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
    } catch (error) {
      console.error('CSV loading error:', error);
      throw new Error('Failed to load CSV data: ' + error.message);
    }
  }

  // Rest of the class remains the same
  static getPatchPosition(data, locus, distanceThreshold, iptmScoreThreshold, percentageThreshold, interactionType = null) {
    // If Score is null or undefined, replace with 1
    data = data.map(row => ({
      ...row,
      Score: row.Score || 1
    }));

    // Initial filtering by locus and threshold
    const filteredData = data.filter(row => 
      row.Locus === locus && 
      parseInt(row.Threshold) === distanceThreshold && 
      parseFloat(row.Score) >= iptmScoreThreshold
    );

    // Rest of the method remains the same...
    const totalStructures = _.uniqBy(filteredData, 'Structure').length;
    const positionInteractions = {};
    const uniquePositions = _.uniq(filteredData.map(row => row.ResidueID));

    uniquePositions.forEach(position => {
      const posData = filteredData.filter(row => row.ResidueID === position);
      
      const peptideStructures = _.uniqBy(
        posData.filter(row => row.InteractingChains.includes('Peptide')), 
        'Structure'
      ).length;
      
      const tcrStructures = _.uniqBy(
        posData.filter(row => row.InteractingChains.includes('TCRA') || row.InteractingChains.includes('TCRB')), 
        'Structure'
      ).length;
      
      const peptidePercentage = (peptideStructures / totalStructures) * 100;
      const tcrPercentage = (tcrStructures / totalStructures) * 100;

      positionInteractions[position] = {
        peptidePercentage,
        tcrPercentage,
        peptideStructures,
        tcrStructures
      };
    });

    const positionWeighted = {};

    Object.entries(positionInteractions).forEach(([position, interactions]) => {
      if (interactionType === 'Peptide' && interactions.peptidePercentage > percentageThreshold) {
        positionWeighted[position] = 'Peptide';
      }
      else if (interactionType === 'TCR' && interactions.tcrPercentage > percentageThreshold) {
        positionWeighted[position] = 'TCR';
      }
      else if (interactionType === 'Peptide + TCR' && 
        interactions.peptidePercentage > percentageThreshold && 
        interactions.tcrPercentage > percentageThreshold
      ) {
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

    return positionWeighted;
  }
}