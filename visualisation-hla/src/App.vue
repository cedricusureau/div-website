<template>
  <div id="app">
    <h1>Visualisation HLA</h1>
    <HlaSequence />
  </div>
</template>

<script>
import HlaSequence from './components/HlaSequence/index.vue'

export default {
  name: 'App',
  components: {
    HlaSequence
  }
}
</script>