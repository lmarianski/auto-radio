import "./polyfills";

import { createApp } from 'vue'
import App from './App.vue'



// localStorage.debug = '*';

const app = createApp(App);
window.vue = app;

app.mount('#app');

// (app as any).$io = io();
