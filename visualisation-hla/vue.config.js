module.exports = {
  css: {
    loaderOptions: {
      css: {
        // This helps webpack find your CSS files
        modules: {
          auto: true
        }
      }
    }
  },
  configureWebpack: {
    resolve: {
      alias: {
        '@styles': '@/components/HlaSequence/styles'
      }
    }
  }
}