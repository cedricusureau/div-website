# Plan d'amélioration des statistiques HLA

## Analyse de la structure des données

### 1. **VDJdb_contact_metadata.csv** (Données d'interaction TCR-MHC)
- **22 colonnes** avec informations structurales et biologiques riches
- **Colonnes clés pour statistiques :**
  - `Locus` (A/B/C) - Loci MHC classe I
  - `MHC` - Allèles HLA spécifiques (A*02:01, B*35:08, etc.)
  - `Peptide` - Séquences peptidiques présentées
  - `Peptide gene` - Gènes sources (EBNA1, CMV, InfluenzaA, etc.)
  - `Peptide species` - Organismes sources (EBV, CMV, HIV-1, SARS-CoV-2, etc.)
  - `VDJdb_confidence_score` - Scores de qualité (1-3)
  - `TCRmodel2-pmhc-iptm-score` - Scores de prédiction structurale (0-1)
  - `TCRA_CDR3/TCRB_CDR3` - Séquences de récepteurs de cellules T
  - `TCRA_V/TCRA_J/TCRB_V/TCRB_J` - Segments géniques TCR

### 2. **PDB_contact_metadata.csv** (Données de structures expérimentales)
- **14 colonnes** axées sur l'information structurale
- **Colonnes clés pour statistiques :**
  - `pdb_accession_number` - IDs PDB
  - `Locus` (A/B) - Loci MHC classe I
  - `MHC` - Allèles HLA
  - `Peptide` - Séquences peptidiques
  - `TCRA_seq/TCRB_seq` - Séquences TCR complètes

### 3. **Fichiers de données de support :**
- `mhc_contacts_peptides.csv` - Données d'analyse de contacts avec seuils et types d'interaction
- `entropy.csv` - Données de polymorphisme par position et locus
- `A.csv/B.csv` - Séquences complètes d'allèles HLA avec 341 positions chacune

## Statistiques actuellement implémentées

La page Statistiques affiche actuellement :
1. **Comptages de base** - Total des structures VDJdb/PDB
2. **Distribution par locus** - Graphiques en camembert A vs B
3. **Distribution MHC par locus** - Répartition des allèles HLA

## Améliorations statistiques proposées

### **Phase 1 : Analyse des pathogènes/maladies**
1. **Graphiques de distribution des pathogènes**
   - Camemberts montrant la distribution par `Peptide species` (EBV, CMV, InfluenzaA, SARS-CoV-2, HIV-1, etc.)
   - Analyse séparée pour les données VDJdb vs PDB


### **Phase 2 : Métriques de qualité et confiance**
3. **Analyse des scores de confiance**
   - Distribution des scores de confiance VDJdb (1-3)
   - Distributions des scores de prédiction TCRmodel2

### **Phase 3 : Analyse des peptides et TCR**
5. **Caractéristiques des peptides**
   - Distributions de longueur des peptides
   - Peptides les plus fréquents dans les jeux de données

## Approche technique

1. **Traitement des données** : Étendre les propriétés calculées existantes pour analyser de nouvelles dimensions
2. **Visualisation** : Utiliser des camemberts D3.js, graphiques en barres, et histogrammes cohérents avec le design actuel
3. **Performance** : Implémenter la mise en cache côté client pour les statistiques calculées
4. **Intégration UI** : Ajouter de nouvelles cartes de statistiques suivant les patterns de design Vuetify actuels

Cette analyse révèle de riches opportunités pour des insights statistiques significatifs qui fourniraient un contexte scientifique précieux pour les chercheurs utilisant l'outil de visualisation HLA.