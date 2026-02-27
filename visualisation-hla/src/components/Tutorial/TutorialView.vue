<template>
  <v-container fluid class="tutorial-container">
    <div class="tutorial-header">
      <h1 class="tutorial-title">
        <v-icon color="primary" class="mr-3">mdi-school</v-icon>
        TCR-Touch Tutorial
      </h1>
      <p class="tutorial-subtitle">
        Learn how to use the HLA-TCR-Peptide Contact Database for divergence analysis
      </p>
    </div>

    <!-- Navigation des sections -->
    <v-card class="tutorial-nav-card mb-6">
      <v-card-text class="py-3">
        <div class="tutorial-sections">
          <v-btn
            v-for="section in sections"
            :key="section.id"
            :variant="currentSection === section.id ? 'elevated' : 'text'"
            :color="currentSection === section.id ? 'primary' : 'default'"
            @click="scrollToSection(section.id)"
            class="tutorial-nav-btn"
            size="small"
          >
            <v-icon left size="small">{{ section.icon }}</v-icon>
            {{ section.title }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Contenu du tutoriel -->
    <div class="tutorial-content">
      <!-- Section 1: Introduction -->
      <div :id="'section-' + sections[0].id" class="tutorial-section">
        <v-card class="tutorial-card">
          <v-card-title class="section-title">
            <v-icon color="primary" class="mr-2">{{ sections[0].icon }}</v-icon>
            {{ sections[0].title }}
          </v-card-title>
          <v-card-text>
            <p class="tutorial-text">
              <strong>TCR-Touch</strong> is a comprehensive website for studying HLA-TCR-peptide interactions and calculating targeted divergence between HLA alleles.
            </p>
            
            <div class="concept-section">
              <h3 class="subsection-title">🎯 t-HED (Targeted HED): Core Concept</h3>
              <p class="tutorial-text">
                The <strong>t-HED (Targeted HLA Evolutionary Divergence)</strong> is a metric inspired by the <strong>c-HED (Classical HLA Evolutionary Divergence)</strong> 
                <span class="publication-links">
                  [<a href="https://www.nature.com/articles/s41591-019-0639-4" target="_blank" class="publication-link">Chowell, 2019</a>, 
                  <a href="http://dx.doi.org/10.1093/molbev/msy116" target="_blank" class="publication-link">Lenz et al., 2018</a>]
                </span>, but calculated using only 
                specific positions of the HLA molecule that are functionally relevant for immune recognition.
              </p>
              
              <p class="tutorial-text">
                Unlike the c-HED (classical HLA Evolutionary Divergence), which sums differences across all 181 positions in the peptide-binding domains, 
                t-HED (targeted HED) calculates divergence only for positions directly involved in contact with peptides or TCRs. 
                t-HED therefore emphasises these biologically important sites.
              </p>
            </div>

            <div class="database-section">
              <h3 class="subsection-title">🏛️ Structural Database</h3>
              <p class="tutorial-text">
                Our analysis is based on a curated set of three-dimensional structures derived from TCR sequences in the
                <a href="https://www.nature.com/articles/s41592-022-01578-0" target="_blank" class="publication-link"><strong>VDJdb database</strong></a>,
                generated using two complementary computational approaches:
              </p>
              <ul class="feature-list">
                <li><strong><a href="https://alphafold.ebi.ac.uk/" target="_blank" class="publication-link">AlphaFold3</a>:</strong> State-of-the-art deep learning predictions for HLA-TCR-peptide complexes</li>
                <li><strong><a href="https://academic.oup.com/nar/article/51/W1/W569/7151345" target="_blank" class="publication-link">TCRmodel2</a>:</strong> Specialized modeling for TCR-pMHC interactions</li>
              </ul>
              <p class="tutorial-text">
                For each unique TCR-peptide-HLA combination, only the structure with the <strong>best ipTM score</strong> (Interface Predicted Template Modeling) is retained, ensuring high-quality structural data for contact analysis.
              </p>

              <p class="tutorial-text">
                The website identifies HLA positions where <strong>at least one atom</strong> of an HLA amino acid
                is within <strong>X Angstroms</strong> of at least one atom of a peptide and/or TCR amino acid.
              </p>
            </div>


            <v-alert type="info" variant="tonal" class="my-4">
              <strong>What you can do with TCR-Touch:</strong>
              <ul class="mt-2">
                <li>Calculate c-HED and t-HED between HLA-A and HLA-B alleles</li>
                <li>Filter positions based on interaction types (Peptide, TCR, or both)</li>
                <li>Apply distance thresholds (2.0-5.0 Å) and quantile filters to select HLA positions based on your criteria</li>
                <li>Visualize sequence positions and amino acid mismatches with comprehensive visualization of interactions</li>
                <li>Explore filtered positions in interactive 3D molecular structures</li>
                <li>Perform batch analysis on multiple allele pairs to calculate t-HED on your cohort</li>
                <li>Browse the complete structures database with statistics</li>
              </ul>
            </v-alert>
          </v-card-text>
        </v-card>
      </div>

      <!-- Section 2: Interface Overview -->
      <div :id="'section-' + sections[1].id" class="tutorial-section">
        <v-card class="tutorial-card">
          <v-card-title class="section-title">
            <v-icon color="primary" class="mr-2">{{ sections[1].icon }}</v-icon>
            {{ sections[1].title }}
          </v-card-title>
          <v-card-text>
            <p class="tutorial-text">
              The main interface is divided into two tabs: <strong>Divergence Calculation</strong> and <strong>Batch Calculation</strong>.
            </p>
            
            <div class="interface-section">
              <h3 class="subsection-title">🔍 Divergence Calculation Mode</h3>
              <p>Interactive analysis of HLA allele pairs with real-time visualization:</p>
              <ul class="feature-list">
                <li><strong>Parameter Control:</strong> Adjust distance thresholds, interaction types, and entropy filters</li>
                <li><strong>Sequence Visualization:</strong> Interactive SVG timeline showing contact positions</li>
                <li><strong>Allele Comparison:</strong> Compare specific allele pairs with mismatch analysis</li>
                <li><strong>Sankey Diagram:</strong> Detailed interaction patterns visualization</li>
              </ul>
            </div>

            <div class="interface-section">
              <h3 class="subsection-title">📊 Batch Calculation Mode</h3>
              <p>Process multiple allele pairs simultaneously:</p>
              <ul class="feature-list">
                <li><strong>Bulk Input:</strong> Enter multiple HLA pairs for analysis</li>
                <li><strong>Position Selection:</strong> Choose which positions to include in calculations</li>
                <li><strong>CSV Export:</strong> Download results for further analysis</li>
              </ul>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Section 3: Structures Database -->
      <div :id="'section-' + sections[2].id" class="tutorial-section">
        <v-card class="tutorial-card">
          <v-card-title class="section-title">
            <v-icon color="primary" class="mr-2">{{ sections[2].icon }}</v-icon>
            {{ sections[2].title }}
          </v-card-title>
          <v-card-text>
            <p class="tutorial-text">
              The Structures Database tab provides comprehensive access to our structural data collection, 
              allowing you to explore, filter, and download the structural information used in TCR-Touch analyses.
            </p>
            
            <div class="structures-overview">
              <h3 class="subsection-title">📊 Database Overview</h3>
              <p class="tutorial-text">
                Our database contains curated HLA-TCR-peptide complex structures organized in an interactive table
                with powerful filtering and export capabilities.
              </p>
            </div>

            <div class="structures-sources">
              <h3 class="subsection-title">🔬 Structure Sources</h3>

              <div class="source-explanation">
                <h4>📐 Computational Structure Predictions</h4>
                <p class="tutorial-text">
                  All structures in our database are derived from TCR sequences in the
                  <a href="https://www.nature.com/articles/s41592-022-01578-0" target="_blank" class="publication-link"><strong>VDJdb database</strong></a>
                  and generated using two complementary computational methods:
                </p>
                <ul class="feature-list">
                  <li><strong>AlphaFold3:</strong> Deep learning-based structure prediction for protein complexes</li>
                  <li><strong>TCRmodel2:</strong> Specialized TCR-pMHC complex modeling</li>
                </ul>

                <v-alert type="info" variant="tonal" class="my-4">
                  <strong>Quality Control:</strong> For each unique TCR-peptide-HLA combination, only the structure with the
                  <strong>highest ipTM score</strong> (Interface Predicted Template Modeling) is retained, ensuring that
                  contact analysis is performed on the most reliable structural models.
                </v-alert>
              </div>
            </div>

            <div class="database-features">
              <h3 class="subsection-title">🔧 Interactive Features</h3>
              
              <div class="feature-section">
                <h4>📋 Customizable Columns</h4>
                <p class="tutorial-text">
                  The data table allows you to customize which information is displayed:
                </p>
                <ul class="feature-list">
                  <li><strong>Show/Hide columns:</strong> Toggle visibility of specific data fields</li>
                  <li><strong>Reorder columns:</strong> Drag and drop to organize information</li>
                  <li><strong>Sort and filter:</strong> Find specific structures quickly</li>
                  <li><strong>Search functionality:</strong> Global search across all visible columns</li>
                </ul>
              </div>

              <div class="feature-section">
                <h4>⬇️ Download Options</h4>
                <p class="tutorial-text">
                  Multiple download formats available for different analysis needs:
                </p>
                <ul class="feature-list">
                  <li><strong>Individual structures:</strong> Download specific PDB/model files</li>
                  <li><strong>Bulk download:</strong> ZIP archives of multiple structures</li>
                  <li><strong>Metadata CSV:</strong> Tabular data for spreadsheet analysis</li>
                  <li><strong>3D Visualization:</strong> Click any structure to open it in the interactive 3D viewer</li>
                </ul>
              </div>

            </div>
            
            <v-alert type="info" variant="tonal" class="my-4">
              <strong>💡 Tip:</strong> Click on any structure entry in the database to open it in the interactive 
              <a href="#" @click="scrollToSection('3d-viewer')" class="tutorial-link">3D Viewer</a> 
              where you can explore the molecular structure, adjust visualization styles, and manually highlight specific positions.
            </v-alert>

          </v-card-text>
        </v-card>
      </div>

      <!-- Section 4: 3D Viewer -->
      <div :id="'section-' + sections[3].id" class="tutorial-section">
        <v-card class="tutorial-card">
          <v-card-title class="section-title">
            <v-icon color="primary" class="mr-2">{{ sections[3].icon }}</v-icon>
            {{ sections[3].title }}
          </v-card-title>
          <v-card-text>
            <p class="tutorial-text">
              The 3D Viewer provides interactive visualization of HLA-TCR-peptide structures, allowing you to explore 
              filtered positions and their spatial relationships in three-dimensional space.
            </p>
            
            <div class="viewer-access">
              <h3 class="subsection-title">🚀 Accessing the 3D Viewer</h3>
              <p class="tutorial-text">
                The 3D Viewer can be accessed in two ways:
              </p>
              <ul class="feature-list">
                <li><strong>From Divergence Analysis:</strong> Click the "View in 3D" and highlight filtered positions</li>
                <li><strong>From Structures Database:</strong> Click on any structure entry to open it in the 3D viewer</li>
              </ul>
              
              <v-alert type="info" variant="tonal" class="my-4">
                <strong>Two Modes Available:</strong>
                <ul class="mt-2">
                  <li><strong>Filtered Positions Mode:</strong> When accessed from analysis results, displays your filtered HLA positions</li>
                  <li><strong>Manual Highlighting Mode:</strong> When accessed from database, allows manual position selection</li>
                </ul>
              </v-alert>
            </div>
            
            <div class="viewer-features">
              <h3 class="subsection-title">🎮 Interactive Controls</h3>
              
              <div class="control-section">
                <h4>🏗️ Structure Selection</h4>
                <p class="tutorial-text">
                  Choose from high-quality structures organized by HLA locus, with confidence scores displayed for each option.
                </p>
              </div>
              
              <div class="control-section">
                <h4>🎨 Visualization Styles</h4>
                <ul class="feature-list">
                  <li><strong>Global Style:</strong> Controls the representation for all chains (Cartoon, Stick, Line, Sphere)</li>
                  <li><strong>Filtered Position Style:</strong> Special rendering for your selected HLA positions</li>
                  <li><strong>Individual Chain Styles:</strong> Override global style for specific chains (TCR Alpha, TCR Beta, Peptide, HLA)</li>
                </ul>
                
                <v-alert type="success" variant="tonal" class="my-4">
                  <strong>Style Priority System:</strong>
                  <ol class="mt-2">
                    <li>Individual chain styles (highest priority)</li>
                    <li>Global style (medium priority)</li>
                    <li>Filtered position highlighting (always visible when enabled)</li>
                  </ol>
                </v-alert>
              </div>
              
              <div class="control-section">
                <h4>👁️ Display Options</h4>
                <ul class="feature-list">
                  <li><strong>HLA Positions Display:</strong> Toggle between "Combined View" (global + highlighted) and "Filtered Only"</li>
                  <li><strong>Position Labels:</strong> Show/hide amino acid position numbers at carbon alpha atoms</li>
                  <li><strong>Chain Visibility:</strong> Show/hide individual molecular components</li>
                </ul>
              </div>
              
              <div class="control-section">
                <h4>🔍 Position Highlighting</h4>
                <p class="tutorial-text">
                  <strong>Filtered Positions Mode:</strong> Click on position chips to highlight specific residues in cyan.
                </p>
                <p class="tutorial-text">
                  <strong>Manual Mode:</strong> Enter position numbers to add custom highlights and explore structure manually.
                </p>
              </div>
            </div>
            
            <div class="chain-info">
              <h3 class="subsection-title">🔗 Chain Color Coding</h3>
              <div class="chain-legend">
                <div class="chain-item-legend">
                  <div class="color-dot-legend" style="background-color: blue;"></div>
                  <span><strong>TCR Alpha Chain:</strong> T-cell receptor α chain</span>
                </div>
                <div class="chain-item-legend">
                  <div class="color-dot-legend" style="background-color: green;"></div>
                  <span><strong>TCR Beta Chain:</strong> T-cell receptor β chain</span>
                </div>
                <div class="chain-item-legend">
                  <div class="color-dot-legend" style="background-color: orange;"></div>
                  <span><strong>Peptide Chain:</strong> Presented peptide antigen</span>
                </div>
                <div class="chain-item-legend">
                  <div class="color-dot-legend" style="background-color: purple;"></div>
                  <span><strong>HLA Chain:</strong> MHC class I molecule (focus of analysis)</span>
                </div>
              </div>
            </div>
            
            <div class="viewer-tips">
              <h3 class="subsection-title">💡 Usage Tips</h3>
              <ul class="feature-list">
                <li><strong>Navigation:</strong> Left-click and drag to rotate, scroll to zoom, right-click and drag to pan</li>
                <li><strong>Best Practices:</strong> Use "Cartoon" for overall structure, "Stick" for detailed interactions</li>
                <li><strong>Performance:</strong> Hide unnecessary chains when focusing on specific interactions</li>
                <li><strong>Analysis:</strong> Enable position labels when documenting specific residues</li>
                <li><strong>Comparison:</strong> Switch between structures to compare binding sites across different complexes</li>
              </ul>
              
              <v-alert type="warning" variant="tonal" class="my-4">
                <strong>Remember:</strong> The 3D viewer helps visualize the spatial context of your filtered positions. 
                Red highlights show all filtered positions, while cyan indicates the currently selected position for detailed examination.
              </v-alert>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Section 5: Parameters Guide -->
      <div :id="'section-' + sections[4].id" class="tutorial-section">
        <v-card class="tutorial-card">
          <v-card-title class="section-title">
            <v-icon color="primary" class="mr-2">{{ sections[4].icon }}</v-icon>
            {{ sections[4].title }}
          </v-card-title>
          <v-card-text>
            <div class="parameter-section">
              <h3 class="subsection-title">🎯 Key Parameters</h3>
              
              <v-row>
                <v-col cols="12" md="6">
                  <div class="parameter-item">
                    <h4>HLA Locus</h4>
                    <p>Choose between HLA-A or HLA-B for your analysis.</p>
                  </div>
                  
                  <div class="parameter-item">
                    <h4>Distance Threshold (Å)</h4>
                    <p>Maximum distance between residues to consider them in contact (2.0 - 5.0 Å).</p>
                    <v-chip color="info" size="small">Recommended: 3.0-4.0 Å</v-chip>
                  </div>
                </v-col>
                
                <v-col cols="12" md="6">
                  <div class="parameter-item">
                    <h4>Quantile Filter (q)</h4>
                    <p>Select positions based on their contact frequency quantile (0.0-1.0).</p>
                    <v-chip color="info" size="small">Recommended: q = 0.5 (median)</v-chip>
                  </div>

                  <div class="parameter-item">
                    <h4>Interaction Type</h4>
                    <p>Filter positions based on interaction partners:</p>
                    <ul class="interaction-types">
                      <li><strong>Peptide Only:</strong> Positions contacting peptides</li>
                      <li><strong>TCR Only:</strong> Positions contacting T-cell receptors</li>
                      <li><strong>Peptide + TCR:</strong> Positions contacting both</li>
                      <li><strong>Peptide or TCR:</strong> Any interaction</li>
                    </ul>
                  </div>
                </v-col>
              </v-row>

              <div class="quantile-section">
                <h3 class="subsection-title">📊 Understanding the Quantile Filter</h3>
                <p class="tutorial-text">
                  The quantile parameter (q) allows you to select positions based on their relative contact frequency ranking.
                  A quantile of q means keeping only positions that are contacted more frequently than q × 100% of all positions.
                </p>

                <v-alert type="warning" variant="tonal" class="my-4">
                  <strong>Example:</strong> If positions have different contact frequencies across structures:
                  <ul class="mt-2">
                    <li><strong>Position 65:</strong> Contacted in 85% of structures (high frequency)</li>
                    <li><strong>Position 123:</strong> Contacted in 50% of structures (medium frequency)</li>
                    <li><strong>Position 187:</strong> Contacted in 10% of structures (low frequency)</li>
                  </ul>
                  <br>
                  <strong>With q = 0.5 (median):</strong> Only positions with above-median contact frequency are included (positions 65 and 123).
                  <br>
                  <strong>With q = 0.75:</strong> Only positions in the top 25% of contact frequency are included (position 65 only).
                </v-alert>

                <p class="tutorial-text">
                  The quantile filter allows you to focus on:
                </p>
                <ul class="feature-list">
                  <li><strong>High quantile (q = 0.75-0.9):</strong> Core binding sites, most consistently contacted positions</li>
                  <li><strong>Medium quantile (q = 0.5):</strong> Positions with above-average contact frequency</li>
                  <li><strong>Low quantile (q = 0.25):</strong> Include more variable positions, broader coverage</li>
                </ul>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Section 6: Divergence Analysis -->
      <div :id="'section-' + sections[5].id" class="tutorial-section">
        <v-card class="tutorial-card">
          <v-card-title class="section-title">
            <v-icon color="primary" class="mr-2">{{ sections[5].icon }}</v-icon>
            {{ sections[5].title }}
          </v-card-title>
          <v-card-text>
            <div class="divergence-section">
              <h3 class="subsection-title">📊 Understanding Divergence Metrics</h3>
              
              <div class="metric-explanation">
                <h4>c-HED (Classical HLA Evolutionary Divergence)</h4>
                <p>Classical HLA Evolutionary Divergence calculated across all 181 positions of the HLA sequence.</p>
                <div class="formula">
                  <code>c-HED = Σ(Grantham Scores) / 181</code>
                </div>
              </div>

              <div class="metric-explanation">
                <h4>t-HED (Targeted HED)</h4>
                <p>Targeted HLA Evolutionary Divergence calculated only for positions that meet your filtering criteria (positions in contact with peptides and/or TCRs).</p>
                <div class="formula">
                  <code>t-HED = Σ(Grantham Scores in filtered positions) / Number of filtered positions</code>
                </div>
              </div>

              <v-alert type="success" variant="tonal" class="my-4">
                <strong>Interpreting Divergence Scores:</strong>
                <ul class="mt-2">
                  <li>Higher values indicate greater evolutionary divergence between alleles</li>
                  <li>Because c-HED and t-HED use different denominators, you should normalise both scores on a 0–1 scale before comparing them</li>
                  <li>A high normalised t-HED highlights large differences at functionally relevant positions</li>
                  <li>Compare values within the same parameter set for meaningful results</li>
                </ul>
              </v-alert>
              
              <v-alert type="success" variant="tonal" class="my-4">
                <strong>🔬 3D Visualization:</strong> After calculating divergence scores, click the "View in 3D" button 
                to explore your filtered positions in interactive molecular structures. See the 
                <a href="#" @click="scrollToSection('3d-viewer')" class="tutorial-link">3D Viewer section</a> 
                for detailed guidance on using the visualization tools.
              </v-alert>

              <div class="grantham-section">
                <h4>Grantham Score</h4>
                <p>Measures the physicochemical distance between amino acids based on:</p>
                <ul>
                  <li>Composition (atomic weight)</li>
                  <li>Polarity</li>
                  <li>Molecular volume</li>
                </ul>
                <p>Range: 0 (identical) to 215 (maximum difference)</p>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Section 7: Workflow -->
      <div :id="'section-' + sections[6].id" class="tutorial-section">
        <v-card class="tutorial-card">
          <v-card-title class="section-title">
            <v-icon color="primary" class="mr-2">{{ sections[6].icon }}</v-icon>
            {{ sections[6].title }}
          </v-card-title>
          <v-card-text>
            <div class="workflow-section">
              <h3 class="subsection-title">🚀 Step-by-Step Analysis</h3>
              
              <v-timeline density="compact" class="workflow-timeline">
                <v-timeline-item
                  v-for="(step, index) in workflowSteps"
                  :key="index"
                  :dot-color="step.color"
                  size="small"
                >
                  <template #icon>
                    <v-icon size="small">{{ step.icon }}</v-icon>
                  </template>
                  <div class="timeline-content">
                    <h4>{{ step.title }}</h4>
                    <p>{{ step.description }}</p>
                    <v-chip v-if="step.tip" color="warning" size="small" class="mt-1">
                      💡 {{ step.tip }}
                    </v-chip>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Section 8: Understanding CSV Results -->
      <div :id="'section-' + sections[7].id" class="tutorial-section">
        <v-card class="tutorial-card">
          <v-card-title class="section-title">
            <v-icon color="primary" class="mr-2">{{ sections[7].icon }}</v-icon>
            {{ sections[7].title }}
          </v-card-title>
          <v-card-text>
            <div class="csv-section">
              <h3 class="subsection-title">📊 Batch Analysis Output</h3>
              
              <p class="tutorial-text">
                When you perform batch analysis, TCR-Touch generates a comprehensive CSV file containing divergence metrics 
                for all your allele pairs. Understanding this output is crucial for proper interpretation of your results.
              </p>

              <div class="csv-columns-section">
                <h4>📋 CSV Columns Explained</h4>
                <div class="columns-grid">
                  <div class="column-group">
                    <h5>Basic Information</h5>
                    <ul class="column-list">
                      <li><strong>Allele1, Allele2:</strong> The compared HLA alleles</li>
                      <li><strong>c-HED:</strong> Raw c-HED value (sum of Grantham scores / 181)</li>
                      <li><strong>t-HED:</strong> Raw t-HED value (sum of Grantham scores / filtered positions)</li>
                      <li><strong>Positions_Count:</strong> Number of positions used for t-HED calculation</li>
                    </ul>
                  </div>
                  
                  <div class="column-group">
                    <h5>Normalized Values</h5>
                    <ul class="column-list">
                      <li><strong>c-HED_Normalized:</strong> c-HED normalized between 0-1</li>
                      <li><strong>t-HED_Normalized:</strong> t-HED normalized between 0-1</li>
                    </ul>
                  </div>
                </div>
              </div>

              <v-alert type="warning" variant="tonal" class="my-4">
                <strong>⚠️ Important: Why Normalization Matters</strong>
                <p class="mt-2">
                  c-HED and t-HED values <strong>cannot be compared directly</strong> because they use different denominators:
                </p>
                <ul class="mt-2">
                  <li><strong>c-HED:</strong> Always divided by 181 positions (Exon 2-3)</li>
                  <li><strong>t-HED:</strong> Divided by variable number of filtered positions (e.g., 5-50 positions)</li>
                </ul>
                <p class="mt-2">
                  <strong>Normalization (0-1 scale)</strong> allows meaningful comparison where <strong>1 = highest value</strong> in your dataset.
                </p>
                <p class="mt-2">
                  <strong>Important:</strong> Normalization is performed on your specific HLA data. The normalized values could change if the highest value in your dataset changes (e.g., adding new allele pairs with higher divergence).
                </p>
              </v-alert>

              <div class="interpretation-section">
                <h4>🔍 Interpretation Strategies</h4>
                
                <div class="interpretation-example">
                  <h5>Identifying Interesting Allele Pairs</h5>
                  <p>After normalization, you can identify biologically relevant patterns:</p>
                  
                  <v-row>
                    <v-col cols="12" md="6">
                      <div class="pattern-box high-classical">
                        <h6>High Classical, Low Targeted</h6>
                        <p><strong>Pattern:</strong> Classical_Normalized = 0.9, Targeted_Normalized = 0.2</p>
                        <p><strong>Interpretation:</strong> Alleles differ globally but are similar at functionally important contact sites</p>
                        <p><strong>Biological relevance:</strong> May have similar immune recognition profiles despite overall sequence divergence</p>
                      </div>
                    </v-col>
                    
                    <v-col cols="12" md="6">
                      <div class="pattern-box high-targeted">
                        <h6>Low Classical, High Targeted</h6>
                        <p><strong>Pattern:</strong> Classical_Normalized = 0.3, Targeted_Normalized = 0.8</p>
                        <p><strong>Interpretation:</strong> Alleles are globally similar but differ at critical contact positions</p>
                        <p><strong>Biological relevance:</strong> May have distinct immune recognition despite overall sequence similarity</p>
                      </div>
                    </v-col>
                  </v-row>
                </div>
              </div>

              <div class="analysis-tips-section">
                <h4>💡 Analysis Tips</h4>
                <ul class="tips-list">
                  <li><strong>Focus on normalized values</strong> for cross-metric comparisons</li>
                  <li><strong>Use raw values</strong> when comparing within the same metric type</li>
                  <li><strong>Filter by criteria:</strong> You can post-filter results based on minimum position counts or specific divergence ranges</li>
                </ul>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Section 9: Advanced Features -->
      <div :id="'section-' + sections[8].id" class="tutorial-section">
        <v-card class="tutorial-card">
          <v-card-title class="section-title">
            <v-icon color="primary" class="mr-2">{{ sections[8].icon }}</v-icon>
            {{ sections[8].title }}
          </v-card-title>
          <v-card-text>
            <div class="advanced-section">
              <h3 class="subsection-title">🔬 Advanced Analysis Features</h3>
              
              <div class="feature-group">
                <h4>Polymorphic Filtering</h4>
                <p>Exclude non-polymorphic positions to focus on variable sites:</p>
                <ul>
                  <li>Uses entropy-based filtering (Shannon entropy)</li>
                  <li>Adjustable entropy threshold (0.0 - 3.0)</li>
                  <li>Higher threshold = more stringent filtering</li>
                  <li>Entropy depends on mismatch frequency: entropy close to 0 means the position rarely shows mismatches when comparing two randomly selected alleles</li>
                </ul>
              </div>


              <div class="feature-group">
                <h4>Sankey Diagram</h4>
                <p>The Sankey diagram provides detailed visualization of interaction patterns between HLA positions and their molecular partners. 
                Crystal structures show that the peptide accounts for roughly 12–49% of the contact surface, while TCR α and β chains contribute about half each. 
                Exploring TCR contacts helps explain differences in immune recognition beyond peptide binding:</p>
                
                <div class="sankey-explanation">
                  <h5>🎨 Color Coding in the SVG Timeline</h5>
                  <p>Positions on the sequence visualization are color-coded based on their interaction patterns:</p>
                  <ul>
                    <li><strong>Red (Peptide):</strong> Positions that primarily contact peptide residues</li>
                    <li><strong>Teal (TCR):</strong> Positions that primarily interact with T-cell receptor chains</li>
                    <li><strong>Purple (Peptide + TCR):</strong> Positions that contact both peptides and TCR simultaneously</li>
                  </ul>
                  
                  <h5>📊 Sankey Flow Visualization</h5>
                  <p>When you select specific positions, the Sankey diagram shows:</p>
                  <ul>
                    <li><strong>Flow direction:</strong> From HLA positions (left) to interaction partners (right)</li>
                    <li><strong>Flow thickness:</strong> Proportional to interaction frequency in the database</li>
                    <li><strong>Detailed breakdowns:</strong> Which specific amino acids are involved in contacts</li>
                    <li><strong>TCR chain specificity:</strong> Whether interactions involve TCR-α (TCRA) or TCR-β (TCRB) chains</li>
                  </ul>
                  
                  <div class="sankey-example">
                    <h5>💡 Practical Example</h5>
                    <p><strong>HLA-A analysis scenario:</strong></p>
                    <ul>
                      <li><strong>Position 65 (Blue/TCR):</strong> Shows frequent contact with TCR. Selecting this position reveals which TCR amino acids the amino acid at position 65 interacts with.</li>
                      <li><strong>Position 66 (Red/Peptide):</strong> Primarily interacts with peptide. The Sankey diagram will show which peptide amino acids the amino acid at position 66 interacts with.</li>
                    </ul>
                    <p><strong>Interactive exploration:</strong> Click on positions in the timeline to filter the Sankey diagram and focus on specific interaction patterns.</p>
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Section 10: Position Distance Analysis -->
      <div :id="'section-' + sections[9].id" class="tutorial-section">
        <v-card class="tutorial-card">
          <v-card-title class="section-title">
            <v-icon color="primary" class="mr-2">{{ sections[9].icon }}</v-icon>
            {{ sections[9].title }}
          </v-card-title>
          <v-card-text>
            <p class="tutorial-text">
              When you click on a specific HLA position in the sequence visualization, you can access detailed
              distance distribution analysis through three complementary charts. This feature helps you understand
              the structural context of each contact position.
            </p>

            <div class="distance-analysis-section">
              <h3 class="subsection-title">📊 Three Analysis Charts</h3>

              <div class="chart-explanation">
                <h4>1. Global Distribution</h4>
                <p class="tutorial-text">
                  Shows the overall distribution of minimum distances (in Angstroms) between the selected HLA position
                  and its interaction partners across all structures in the database.
                </p>
                <ul class="feature-list">
                  <li><strong>X-axis:</strong> Distance in Angstroms (Å)</li>
                  <li><strong>Y-axis:</strong> Probability density (KDE - Kernel Density Estimation)</li>
                  <li><strong>Interpretation:</strong> A peak at low distances indicates consistent close contacts; wide distributions suggest variable binding modes</li>
                </ul>
              </div>

              <div class="chart-explanation">
                <h4>2. Distribution by Target</h4>
                <p class="tutorial-text">
                  Compares the distance distributions separately for <strong>Peptide</strong> and <strong>TCR</strong> contacts.
                  This helps identify whether a position primarily contacts the peptide, the TCR, or both.
                </p>
                <ul class="feature-list">
                  <li><strong>Red curve:</strong> Distances to Peptide residues</li>
                  <li><strong>Teal curve:</strong> Distances to TCR residues</li>
                  <li><strong>Interpretation:</strong> Non-overlapping curves indicate distinct interaction roles; overlapping curves suggest dual function</li>
                </ul>
              </div>

              <div class="chart-explanation">
                <h4>3. Distribution by Amino Acid</h4>
                <p class="tutorial-text">
                  Shows how the distance distribution varies depending on which amino acid is present at the HLA position
                  across different alleles. This reveals allele-specific binding patterns.
                </p>
                <ul class="feature-list">
                  <li><strong>Multiple curves:</strong> Each color represents a different amino acid found at this position</li>
                  <li><strong>Interpretation:</strong> Similar curves across amino acids suggest position-driven contacts; divergent curves indicate amino acid-specific interactions</li>
                </ul>

                <v-alert type="success" variant="tonal" class="my-4">
                  <strong>💡 Practical Use:</strong> If two amino acids show very different distance profiles at a position,
                  this could explain why allele pairs differing at this position have distinct functional properties.
                </v-alert>
              </div>
            </div>

            <div class="distance-access-section">
              <h3 class="subsection-title">🖱️ How to Access</h3>
              <ol class="access-steps">
                <li>Navigate to the <strong>Divergence Calculation</strong> tab in the HLA Analysis page</li>
                <li>Set your analysis parameters and click <strong>Analyze</strong></li>
                <li>In the sequence visualization, click on any <strong>position chip</strong> (colored boxes)</li>
                <li>Switch to the <strong>"Distance Analysis"</strong> tab in the position detail panel</li>
                <li>The three charts will load automatically for the selected position</li>
              </ol>
            </div>

            <v-alert type="info" variant="tonal" class="my-4">
              <strong>📝 Note:</strong> Distance data is computed from all structures in the database for the selected locus.
              The number of structures contributing to each analysis is displayed in the chart headers.
            </v-alert>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- Bouton pour remonter en haut -->
    <v-fab
      v-if="showScrollTop"
      icon="mdi-arrow-up"
      location="bottom end"
      color="primary"
      @click="scrollToTop"
      class="scroll-top-btn"
    />
  </v-container>
</template>

<script>
export default {
  name: 'TutorialView',
  data() {
    return {
      currentSection: 'introduction',
      showScrollTop: false,
      isScrollingFromClick: false,
      sections: [
        {
          id: 'introduction',
          title: 'Introduction',
          icon: 'mdi-home'
        },
        {
          id: 'interface',
          title: 'Interface Overview',
          icon: 'mdi-view-dashboard'
        },
        {
          id: 'structures',
          title: 'Structures Database',
          icon: 'mdi-database'
        },
        {
          id: '3d-viewer',
          title: '3D Viewer',
          icon: 'mdi-cube-outline'
        },
        {
          id: 'parameters',
          title: 'Parameters Guide',
          icon: 'mdi-tune'
        },
        {
          id: 'divergence',
          title: 'Divergence Analysis',
          icon: 'mdi-chart-line'
        },
        {
          id: 'workflow',
          title: 'Analysis Workflow',
          icon: 'mdi-format-list-numbered'
        },
        {
          id: 'csv-results',
          title: 'Batch Calculation: Understanding CSV Results',
          icon: 'mdi-file-table'
        },
        {
          id: 'advanced',
          title: 'Advanced Features',
          icon: 'mdi-cog'
        },
        {
          id: 'position-distances',
          title: 'Position Distance Analysis',
          icon: 'mdi-chart-bell-curve-cumulative'
        }
      ],
      workflowSteps: [
        {
          title: 'Set Parameters',
          description: 'Choose your HLA locus, distance threshold, quantile filter, and interaction type.',
          icon: 'mdi-tune',
          color: 'primary',
          tip: 'Start with default values (A, 3.0Å, q=0.5, Peptide or TCR)'
        },
        {
          title: 'Select Alleles',
          description: 'Use the "Compare Alleles" button to choose two HLA alleles for comparison.',
          icon: 'mdi-dna',
          color: 'secondary',
          tip: 'Use "Example" button to load test data'
        },
        {
          title: 'Analyze Results',
          description: 'Review the sequence visualization, mismatches, and divergence values.',
          icon: 'mdi-chart-bar',
          color: 'success',
          tip: 'Red arrows show positions with amino acid differences - arrow length is proportional to Grantham score'
        },
        {
          title: 'Explore Interactions',
          description: 'Use the Sankey diagram to understand interaction patterns in detail.',
          icon: 'mdi-chart-sankey',
          color: 'info',
          tip: 'Click positions on the timeline to filter the Sankey diagram'
        },
        {
          title: 'Batch Analysis (Optional)',
          description: 'Switch to batch mode to analyze multiple allele pairs at once.',
          icon: 'mdi-format-list-bulleted',
          color: 'warning',
          tip: 'Results are exported as CSV for further analysis'
        }
      ]
    }
  },
  mounted() {
    window.addEventListener('scroll', this.handleScroll);
    
    // Vérifier si on doit naviguer vers une section spécifique
    const targetSection = localStorage.getItem('tutorialSection');
    if (targetSection) {
      setTimeout(() => {
        const element = document.getElementById(targetSection);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
          // Mettre à jour la section courante
          const sectionId = targetSection.replace('section-', '');
          this.currentSection = sectionId;
        }
        // Nettoyer le localStorage
        localStorage.removeItem('tutorialSection');
      }, 500);
    }
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
  },
  methods: {
    scrollToSection(sectionId) {
      this.currentSection = sectionId;
      this.isScrollingFromClick = true;
      
      const element = document.getElementById('section-' + sectionId);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
        
        // Réactiver la détection automatique après l'animation
        setTimeout(() => {
          this.isScrollingFromClick = false;
        }, 1000); // 1 seconde pour laisser le temps à l'animation de finir
      }
    },
    scrollToTop() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    },
    handleScroll() {
      this.showScrollTop = window.pageYOffset > 300;
      
      // Ne pas mettre à jour la section si on est en train de défiler suite à un clic
      if (this.isScrollingFromClick) {
        return;
      }
      
      // Update current section based on scroll position
      const sections = this.sections.map(s => s.id);
      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById('section-' + sections[i]);
        if (element && element.getBoundingClientRect().top <= 100) {
          this.currentSection = sections[i];
          break;
        }
      }
    }
  }
}
</script>

<style scoped>
.tutorial-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.tutorial-header {
  text-align: center;
  margin-bottom: 2rem;
}

.tutorial-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tutorial-subtitle {
  font-size: 1.2rem;
  color: #666;
  font-weight: 400;
  margin: 0;
}

.tutorial-nav-card {
  position: sticky;
  top: 80px;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tutorial-sections {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.tutorial-nav-btn {
  text-transform: none;
  font-weight: 500;
}

.tutorial-content {
  margin-top: 1.5rem;
}

.tutorial-section {
  margin-bottom: 2rem;
  scroll-margin-top: 150px;
}

.tutorial-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-radius: 8px;
}

.section-title {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  font-size: 1.4rem;
  font-weight: 600;
  color: #2c3e50;
}

.tutorial-text {
  font-size: 1.05rem;
  line-height: 1.5;
  color: #444;
  margin-bottom: 0.8rem;
}

.subsection-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 1.2rem 0 0.8rem 0;
}

.interface-section {
  margin: 1.5rem 0;
  padding: 1.2rem;
  background: rgba(74, 144, 226, 0.04);
  border-radius: 6px;
  border-left: 3px solid #4a90e2;
}

.feature-list {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.feature-list li {
  margin: 0.5rem 0;
  line-height: 1.5;
}

.parameter-section {
  margin: 1rem 0;
}

.parameter-item {
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.parameter-item h4 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.parameter-item p {
  color: #555;
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.interaction-types {
  margin-top: 0.5rem;
  padding-left: 1.5rem;
}

.interaction-types li {
  margin: 0.3rem 0;
}

.divergence-section {
  margin: 1rem 0;
}

.metric-explanation {
  margin: 2rem 0;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(76, 175, 80, 0.1) 100%);
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

.metric-explanation h4 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.formula {
  background: #f5f5f5;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  margin: 1rem 0;
  font-family: 'Courier New', monospace;
  border-left: 3px solid #4caf50;
}

.grantham-section {
  margin: 2rem 0;
  padding: 1.5rem;
  background: rgba(255, 193, 7, 0.1);
  border-radius: 8px;
  border-left: 4px solid #ffc107;
}

.grantham-section h4 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.workflow-section {
  margin: 1rem 0;
}

.workflow-timeline {
  margin: 2rem 0;
}

.timeline-content h4 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.timeline-content p {
  color: #555;
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.advanced-section {
  margin: 1rem 0;
}

.feature-group {
  margin: 2rem 0;
  padding: 1.5rem;
  background: rgba(156, 39, 176, 0.05);
  border-radius: 8px;
  border-left: 4px solid #9c27b0;
}

.feature-group h4 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.feature-group p {
  color: #555;
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.feature-group ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.feature-group li {
  margin: 0.3rem 0;
  color: #555;
}

/* Nouvelles sections pour l'introduction détaillée */
.concept-section,
.database-section,
.quantile-section {
  margin: 1.5rem 0;
  padding: 1.2rem;
  border-radius: 6px;
  border-left: 3px solid;
}

.concept-section {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.04) 0%, rgba(74, 144, 226, 0.08) 100%);
  border-left-color: #4a90e2;
}

.database-section {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.04) 0%, rgba(76, 175, 80, 0.08) 100%);
  border-left-color: #4caf50;
}

.quantile-section {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.04) 0%, rgba(255, 152, 0, 0.08) 100%);
  border-left-color: #ff9800;
}

.concept-section h3,
.database-section h3,
.quantile-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #2c3e50;
  font-weight: 600;
}

.publication-links {
  font-size: 0.9em;
  color: #666;
}

.publication-link {
  color: #4a90e2;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.publication-link:hover {
  color: #2d5aa0;
  text-decoration: underline;
}

.quantile-section .feature-list {
  margin-left: 0;
  padding-left: 1.5rem;
}

.quantile-section .feature-list li {
  margin: 0.8rem 0;
  line-height: 1.4;
  color: #444;
}

/* Styles pour la section CSV Results */
.csv-section {
  margin: 1rem 0;
}

.csv-columns-section {
  margin: 2rem 0;
  padding: 1.5rem;
  background: rgba(33, 150, 243, 0.05);
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.csv-columns-section h4 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 1rem;
}

.columns-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 1rem;
}

.column-group {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid rgba(33, 150, 243, 0.2);
}

.column-group h5 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.column-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.column-list li {
  margin: 0.8rem 0;
  padding-left: 1rem;
  position: relative;
  line-height: 1.4;
  color: #444;
}

.column-list li::before {
  content: "•";
  color: #2196f3;
  position: absolute;
  left: 0;
  font-weight: bold;
}

.interpretation-section {
  margin: 2rem 0;
}

.interpretation-section h4 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 1rem;
}

.interpretation-example h5 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.pattern-box {
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid;
  margin: 1rem 0;
}

.pattern-box h6 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.pattern-box p {
  margin: 0.5rem 0;
  line-height: 1.4;
  color: #555;
}

.high-classical {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(76, 175, 80, 0.1) 100%);
  border-left-color: #4caf50;
}

.high-targeted {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.1) 100%);
  border-left-color: #ff9800;
}

.analysis-tips-section {
  margin: 2rem 0;
  padding: 1.5rem;
  background: rgba(156, 39, 176, 0.05);
  border-radius: 8px;
  border-left: 4px solid #9c27b0;
}

.analysis-tips-section h4 {
  color: #2c3e50;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 1rem;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

.tips-list li {
  margin: 1rem 0;
  padding-left: 2rem;
  position: relative;
  line-height: 1.5;
  color: #444;
}

.tips-list li::before {
  content: "💡";
  position: absolute;
  left: 0;
  top: 0;
}

/* Styles pour la section Structures Database */
.structures-overview,
.structures-tabs,
.database-features {
  margin: 2rem 0;
}

/* Styles pour la section 3D Viewer */
.viewer-access,
.viewer-features,
.chain-info,
.viewer-tips {
  margin: 2rem 0;
}

.control-section {
  margin: 1.5rem 0;
  padding: 1rem;
  background: rgba(76, 175, 80, 0.05);
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

.control-section h4 {
  color: #2e7d32;
  margin-bottom: 0.5rem;
}

.chain-legend {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(156, 39, 176, 0.05);
  border-radius: 8px;
  border-left: 4px solid #9c27b0;
}

.chain-item-legend {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.color-dot-legend {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
  flex-shrink: 0;
}

.structures-tabs {
  background: rgba(33, 150, 243, 0.05);
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.tab-explanation {
  margin: 1.5rem 0;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  border: 1px solid rgba(33, 150, 243, 0.2);
}

.tab-explanation h4 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.database-features {
  background: rgba(76, 175, 80, 0.05);
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

.feature-section {
  margin: 1.5rem 0;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.feature-section h4 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.scroll-top-btn {
  position: fixed !important;
}

/* Styles pour la section Structures Sources */
.structures-sources {
  margin: 2rem 0;
  background: rgba(33, 150, 243, 0.05);
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.source-explanation {
  margin: 1.5rem 0;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  border: 1px solid rgba(33, 150, 243, 0.2);
}

.source-explanation h4 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

/* Styles pour la section Position Distance Analysis */
.distance-analysis-section {
  margin: 2rem 0;
}

.chart-explanation {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: rgba(255, 152, 0, 0.05);
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}

.chart-explanation h4 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.chart-explanation p {
  color: #555;
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.distance-access-section {
  margin: 2rem 0;
  padding: 1.5rem;
  background: rgba(76, 175, 80, 0.05);
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

.distance-access-section h3 {
  margin-top: 0;
}

.access-steps {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.access-steps li {
  margin: 0.8rem 0;
  line-height: 1.5;
  color: #444;
}

/* Responsive */
@media (max-width: 768px) {
  .tutorial-container {
    padding: 1rem 0.5rem;
  }
  
  .tutorial-title {
    font-size: 2rem;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .tutorial-subtitle {
    font-size: 1rem;
  }
  
  .tutorial-sections {
    gap: 4px;
  }
  
  .tutorial-nav-btn {
    font-size: 0.8rem;
    padding: 0 0.5rem;
  }
  
  .tutorial-nav-btn .v-icon {
    display: none;
  }
  
  .section-title {
    font-size: 1.2rem;
    padding: 1rem;
  }
  
  .tutorial-text {
    font-size: 1rem;
  }
  
  .interface-section,
  .parameter-item,
  .metric-explanation,
  .feature-group,
  .csv-columns-section,
  .analysis-tips-section,
  .structures-tabs,
  .database-features {
    padding: 1rem;
    margin: 1rem 0;
  }
  
  .tab-explanation,
  .feature-section {
    padding: 0.8rem;
    margin: 1rem 0;
  }
  
  .columns-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .pattern-box {
    padding: 1rem;
    margin: 0.5rem 0;
  }
}

@media (max-width: 480px) {
  .tutorial-nav-card {
    position: static;
  }
  
  .tutorial-sections {
    flex-direction: column;
    align-items: stretch;
  }
  
  .tutorial-nav-btn {
    justify-content: flex-start;
  }
}
</style>