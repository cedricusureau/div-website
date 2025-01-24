import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify' // ✅ Import Vuetify

const app = createApp(App)

app.use(vuetify) // ✅ Make sure Vuetify is used globally
app.mount('#app')

console.log('Vuetify Loaded:', vuetify) // 🔍 Debugging