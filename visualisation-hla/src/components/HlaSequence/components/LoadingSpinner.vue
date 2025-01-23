<template>
    <div class="loading-spinner">
      <svg 
        viewBox="0 0 38 38" 
        xmlns="http://www.w3.org/2000/svg" 
        stroke="#007bff"
      >
        <g 
          transform="translate(1 1)" 
          stroke-width="2" 
          fill="none" 
          fill-rule="evenodd"
        >
          <circle 
            stroke-opacity=".5" 
            cx="18" 
            cy="18" 
            r="18"
          />
          <path d="M36 18c0-9.94-8.06-18-18-18">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 18 18"
              to="360 18 18"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      </svg>
    </div>
  </template>
  
  <script>
  export default {
    name: 'LoadingSpinner'
  }
  </script>
  
  <style scoped>
  .loading-spinner {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }
  
  .loading-spinner svg {
    width: 24px;
    height: 24px;
  }
  </style>