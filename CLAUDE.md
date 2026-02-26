# Instructions pour le site div-website

## Projet

Site web de visualisation des structures TCR-pMHC avec analyse des divergences HLA.

## Tests et développement

**IMPORTANT**: Ne pas lancer automatiquement le serveur de développement pour les tests.
- L'utilisateur teste de son côté et fait un retour
- Ne pas utiliser `npm run serve` automatiquement
- L'utilisateur validera manuellement l'interface

## Structure du projet

```
visualisation-hla/
├── public/data/           # Fichiers de données
│   ├── curated_metadata.csv          # 432 structures unifiées
│   ├── distances_A.sqlite            # Base SQLite locus A
│   ├── distances_B.sqlite            # Base SQLite locus B
│   ├── min_distances_A.csv           # Distances locus A (CSV)
│   ├── min_distances_B.csv           # Distances locus B (CSV)
│   └── structures/
│       ├── alphafold3/               # Structures AF3 (.cif)
│       └── tcrmodel2/                # Structures TCRmodel2 (.pdb)
├── src/
│   ├── components/
│   │   ├── HlaStructures/            # Page base de données structures
│   │   ├── DistanceExplorer/         # Page explorateur de distances
│   │   └── StructureViewer/          # Visualiseur 3D
│   └── services/
│       ├── hlaStructuresService.js   # Service structures (refactorisé)
│       └── distanceExplorerService.js # Service distances (à créer)
└── package.json
```

## Refonte en cours

### Phase 1: Structures Database ✅
- Service unifié pour charger `curated_metadata.csv`
- Table unifiée avec filtres par locus (A/B)
- Charts D3.js (distribution locus, source, ipTM)

### Phase 2: Distance Explorer (à faire)
- Installation de sql.js
- Création du service SQLite
- Nouvelle page d'exploration des distances

### Phase 3: Visualiseur 3D (à adapter)
- 3dmol.js version 2.5.2 déjà installé (support CIF)
- Adapter les chemins de fichiers vers `/data/structures/`

## Notes importantes

- Le fichier `curated_metadata.csv` contient les colonnes de base
- Les métadonnées complètes (Peptide gene, species, etc.) ne sont pas encore intégrées
- L'ancien système VDJdb/PDB est dans `_backup_old_data/`
