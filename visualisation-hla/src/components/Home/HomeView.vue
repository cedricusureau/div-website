<template>
  <div class="home-container">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="title-primary">TCR-Touch</span>
          <span class="title-subtitle">HLA-TCR-Peptide Contact Database</span>
        </h1>

        <p class="hero-description">
          A comprehensive bioinformatics platform for analyzing HLA-TCR-peptide interactions.
          Explore 3D molecular structures, calculate HLA Evolutionary Divergence (c-HED and t-HED),
          and investigate contact patterns between HLA alleles, T-cell receptors, and peptides.
        </p>

        <div class="hero-actions">
          <v-btn
            color="primary"
            size="large"
            @click="navigateTo('tutorial')"
            class="me-4 mb-2"
            elevation="3"
          >
            <v-icon left>mdi-book-open-variant</v-icon>
            Start with Tutorial
          </v-btn>

          <v-btn
            variant="outlined"
            color="white"
            size="large"
            @click="navigateTo('sequence')"
            class="mb-2"
          >
            <v-icon left>mdi-dna</v-icon>
            Begin Analysis
          </v-btn>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <div class="container">
        <div class="features-grid">
          <!-- Feature 1: HLA Analysis -->
          <v-card class="feature-card" elevation="2" @click="navigateTo('sequence')">
            <v-card-text class="feature-content">
              <div class="feature-icon">
                <v-icon size="48" color="primary">mdi-dna</v-icon>
              </div>
              <h3 class="feature-title">HLA-peptide-TCR Interactions</h3>
              <p class="feature-description">
                Calculate HLA Evolutionary Divergence (c-HED and t-HED) and analyze polymorphic positions
                affecting antigen presentation and T-cell recognition.
              </p>
              <v-btn variant="text" color="primary" class="mt-2">
                Start Analysis →
              </v-btn>
            </v-card-text>
          </v-card>

          <!-- Feature 2: 3D Structures -->
          <v-card class="feature-card" elevation="2" @click="navigateTo('structures')">
            <v-card-text class="feature-content">
              <div class="feature-icon">
                <v-icon size="48" color="primary">mdi-molecule</v-icon>
              </div>
              <h3 class="feature-title">Database</h3>
              <p class="feature-description">
                Visualize amino acid positions in 3D space and examine their spatial relationships within the MHC-peptide-TCR complex.
              </p>
              <v-btn variant="text" color="primary" class="mt-2">
                Explore Structures →
              </v-btn>
            </v-card-text>
          </v-card>

          <!-- Feature 3: Statistics -->
          <v-card class="feature-card" elevation="2" @click="navigateTo('statistics')">
            <v-card-text class="feature-content">
              <div class="feature-icon">
                <v-icon size="48" color="primary">mdi-chart-line</v-icon>
              </div>
              <h3 class="feature-title">Statistics</h3>
              <p class="feature-description">
                Interactive data visualizations provide insights into allele frequencies, structural coverage, and dataset composition.
              </p>
              <v-btn variant="text" color="primary" class="mt-2">
                View Statistics →
              </v-btn>
            </v-card-text>
          </v-card>
        </div>

      </div>
    </section>

    <!-- About Section -->
    <section class="about-section">
      <div class="container">
        <div class="about-content">
          <div class="about-text">
            <h2 class="section-title">About</h2>
            <p>
              Website under development accompanying a scientific publication about t-HED,
              scientific review not yet peer-reviewed. This work is a collaboration between INSERM UMR1342,
              MICS laboratory of CentraleSupélec, and Institut Gustave Roussy.
            </p>
            <p>
              <strong>Research use only</strong><br>
              Contact: <a href="mailto:cedric.usureau@aphp.fr">cedric.usureau@aphp.fr</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'HomeView',
  emits: ['navigate'],
  methods: {
    navigateTo(view) {
      this.$emit('navigate', view);
    }
  }
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
}

/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  color: white;
  padding: 4rem 2rem;
  text-align: center;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  margin-bottom: 1.5rem;
}

.title-primary {
  display: block;
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.title-subtitle {
  display: block;
  font-size: 1.5rem;
  font-weight: 400;
  opacity: 0.9;
}

.hero-description {
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  opacity: 0.95;
}

.hero-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
}

/* Features Section */
.features-section {
  padding: 4rem 2rem;
  background-color: #f8f9fa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 600;
  margin-bottom: 3rem;
  color: #1976d2;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 3rem;
}

.feature-card {
  cursor: pointer;
  transition: all 0.3s ease;
  height: 100%;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
}

.feature-content {
  text-align: center;
  padding: 2rem 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.feature-icon {
  margin-bottom: 1.5rem;
}

.feature-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1976d2;
}

.feature-description {
  line-height: 1.6;
  margin-bottom: 1rem;
  flex-grow: 1;
}


/* About Section */
.about-section {
  padding: 4rem 2rem;
  background: white;
}

.about-content {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.about-text p {
  font-size: 1.1rem;
  line-height: 1.7;
  margin-bottom: 1.5rem;
  color: #555;
}

.about-actions {
  margin-top: 2rem;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

/* Responsive Design */
@media (max-width: 768px) {
  .title-primary {
    font-size: 2.5rem;
  }

  .title-subtitle {
    font-size: 1.2rem;
  }

  .hero-description {
    font-size: 1.1rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }



  .hero-section {
    padding: 3rem 1rem;
  }

  .features-section,
  .about-section {
    padding: 3rem 1rem;
  }
}

@media (max-width: 480px) {
  .title-primary {
    font-size: 2rem;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .hero-actions .v-btn {
    width: 100%;
    max-width: 280px;
  }
}
</style>