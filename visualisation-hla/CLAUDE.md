# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Project Setup
```bash
npm install
```

### Development Server
```bash
npm run serve
```
Starts the development server at http://localhost:8080 with hot-reload enabled.

### Production Build
```bash
npm run build  
```

### Linting
```bash
npm run lint
```

## Application Architecture

This is a Vue 3 application for HLA (Human Leukocyte Antigen) sequence analysis and visualization built with Vuetify 3. The application provides sophisticated bioinformatics analysis capabilities with interactive data visualizations.

### Main Application Structure

**App.vue**: Main application container with navigation between four main views:
- Divergence Calculation (`HlaSequenceAnalysis.vue`)
- Structures Database (`HlaStructuresView.vue`)  
- Statistics (`StatisticsView.vue`)
- Tutorial (`TutorialView.vue`)

### Core Components

**HlaSequenceAnalysis.vue** (`src/components/HlaSequence/HlaSequenceAnalysis.vue`):
- Main orchestrator for HLA sequence analysis
- Interactive parameter form with real-time analysis
- Uses Vue 3 Composition API with debounced calculations (300ms)
- Manages position selection and filtering state

**HlaStructuresView.vue** (`src/components/HlaStructures/HlaStructuresView.vue`):
- Database browser for VDJdb and PDB structures
- D3.js pie charts for statistical analysis
- Bulk PDB file download with ZIP compression
- CSV export functionality

**StatisticsView.vue** (`src/components/Statistics/StatisticsView.vue`):
- Dedicated statistics page with D3.js visualizations
- Interactive pie charts for database distributions
- Comprehensive statistical analysis of HLA data

**TutorialView.vue** (`src/components/Tutorial/TutorialView.vue`):
- Comprehensive tutorial system with 8 sections
- Interactive navigation with scroll-to-section functionality
- Scientific explanations of HED calculations and methodology
- Step-by-step workflow guidance

### Key Services

**hlaService.js** (`src/services/hlaService.js`):
- Core data processing engine with smart caching (1-hour validity)
- Parallel CSV loading for performance
- Complex position analysis based on peptide/TCR interactions
- Allele-specific sequence comparison with Grantham scoring
- HED (HLA Evolutionary Divergence) calculations
- Key methods: `getPatchPosition()`, `calculateAlleleSpecificPositions()`

**entropyService.js** (`src/services/entropyService.js`):
- Polymorphism analysis using entropy-based filtering
- Cached entropy data by locus
- Default threshold: 0.2

### Architecture Patterns

**Composition API**: Uses Vue 3 Composition API throughout with composables for business logic abstraction.

**useHlaAnalysis.js** (`src/components/HlaSequence/composables/useHlaAnalysis.js`):
- Main business logic composable
- Reactive state management for analysis parameters
- Computed properties for entropy filtering
- Async data loading orchestration

**Caching Strategy**: Implements smart caching for performance:
- Service-level caching with timestamp validation
- Data persistence across component re-renders

### Data Processing Pipeline

1. **CSV Data Loading**: Parallel loading of A.csv, B.csv, mhc_contacts_peptides.csv
2. **Multi-level Filtering**: Distance → Interaction type → Percentage → Entropy
3. **Real-time Analysis**: Debounced calculations preserve user interactions
4. **Comparative Analysis**: Allele sequence alignment with HED calculations

### Technology Stack

- **Vue 3**: Composition API, reactive system
- **Vuetify 3**: Material Design component library
- **D3.js**: Interactive data visualizations and statistical charts
- **PapaParse**: CSV parsing
- **JSZip**: File compression for bulk downloads

### Data Structure

**public/data/**: Contains CSV files with HLA data:
- `A.csv`, `B.csv`: HLA allele sequences
- `mhc_contacts_peptides.csv`: Peptide-MHC interaction data
- `entropy.csv`: Polymorphism data
- `ranked_0_collected/`: PDB structure files

### Development Notes

- Use debounced calculations for performance in real-time analysis
- Implement proper loading states and error handling for async operations
- Follow Vue 3 Composition API patterns consistently
- Maintain caching strategies for data-intensive operations
- Component styling uses a mix of global styles and component-specific CSS
- Tutorial links use localStorage-based navigation for cross-tab functionality
- HED terminology used consistently throughout (replaced "Classical Divergence")

### User Interface Features

- **Interactive Tutorial System**: Comprehensive 8-section tutorial with scroll navigation
- **Contextual Help Links**: Discrete help icons throughout the interface linking to relevant tutorial sections
- **Modern Material Design**: Clean, professional interface using Vuetify 3 components
- **Responsive Layout**: Optimized for desktop and mobile viewing
- **Smart Navigation**: Tutorial opens in new tabs with automatic section navigation

### Performance Considerations

- Parallel data loading for CSV files
- Smart caching with 1-hour validity periods
- Debounced user input (300ms) for real-time analysis
- Computed properties for reactive filtering
- Lazy loading of heavy data visualizations

###TODO
- Faire une page d'accueil 