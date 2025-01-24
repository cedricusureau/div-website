// services/hlaStructuresService.js
import Papa from 'papaparse'

// Fonction pour charger les données depuis un fichier CSV dans le dossier public
export const loadStructuresData = async (datasetType) => {
  try {
    // Définition du chemin du fichier en fonction du type de données
    const filename = datasetType === 'pdb' 
      ? '/data/PDB_contact_metadata.csv' 
      : '/data/VDJdb_contact_metadata.csv'

    // Utilisation de fetch pour récupérer le fichier CSV
    const response = await fetch(filename)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const text = await response.text()
    
    // Analyse du CSV avec Papa Parse
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          // Traitement des données selon le type de dataset
          const processedData = results.data.map(row => {
            if (datasetType === 'pdb') {
              return {
                ...row,
                // Calcul de la longueur des séquences pour PDB
                sequenceLength: {
                  TCRA: row.TCRA_seq?.length || 0,
                  TCRB: row.TCRB_seq?.length || 0
                }
              }
            } else {
              // Traitement spécifique pour VDJdb
              return {
                ...row,
                modelScore: Number(row['TCRmodel2-pmhc-iptm-score'])?.toFixed(3) || '0.000',
                confidence: Number(row.VDJdb_confidence_score) || 0
              }
            }
          })
          
          // Filtrage des entrées invalides
          const validData = processedData.filter(row => {
            return datasetType === 'pdb' 
              ? row.pdb_accession_number 
              : row.VDJdb_complex_id
          })
          
          resolve(validData)
        },
        error: (error) => reject(error)
      })
    })
  } catch (error) {
    console.error(`Erreur lors du chargement des données ${datasetType}:`, error)
    throw error
  }
}

// Fonction de filtrage améliorée avec gestion des types
export const filterStructures = (data, filters) => {
  return data.filter(structure => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true // Ignorer les filtres vides
      
      const fieldValue = structure[key]
      if (!fieldValue) return false // Gestion des valeurs manquantes
      
      if (typeof value === 'string') {
        return fieldValue.toString().toLowerCase().includes(value.toLowerCase())
      }
      if (typeof value === 'number') {
        return fieldValue === value
      }
      return false
    })
  })
}

// Fonction d'export avec gestion des erreurs
export const exportToCSV = (data, filename) => {
  try {
    const csv = Papa.unparse(data, {
      delimiter: ';',
      header: true,
      skipEmptyLines: true
    })
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href) // Libération de la mémoire
  } catch (error) {
    console.error('Erreur lors de l\'export CSV:', error)
    throw error
  }
}