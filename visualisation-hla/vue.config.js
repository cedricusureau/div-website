module.exports = {
  devServer: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: 'all'
  },
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