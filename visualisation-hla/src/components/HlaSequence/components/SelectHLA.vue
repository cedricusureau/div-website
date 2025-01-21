<template>
    <div class="select-hla" v-if="positions">
      <div class="hla-card">
        <h3>Sélection HLA</h3>
        <div class="positions-summary">
          <div v-for="(type, position) in positions" :key="position" class="position-item">
            <span class="position-dot" :style="{ backgroundColor: getColorForType(type) }"></span>
            <span class="position-details">
              Position {{ position }} - {{ type }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'SelectHLA',
    props: {
      positions: {
        type: Object,
        required: true
      }
    },
    data() {
      return {
        colorMap: {
          'Peptide': '#FF6B6B',
          'TCR': '#4ECDC4',
          'Peptide + TCR': '#A78ADB'
        }
      }
    },
    methods: {
      getColorForType(type) {
        return this.colorMap[type] || '#999999';
      }
    }
  }
  </script>
  
  <style scoped>
  .select-hla {
    margin-top: 20px;
    width: 100%;
  }
  
  .hla-card {
    background-color: #f5f5f5;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .positions-summary {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 10px;
  }
  
  .position-item {
    display: flex;
    align-items: center;
    padding: 8px;
    background-color: white;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
  
  .position-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 10px;
  }
  
  .position-details {
    font-size: 14px;
  }
  
  h3 {
    margin: 0 0 15px 0;
    color: #333;
  }
  </style>