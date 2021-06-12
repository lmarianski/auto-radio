<template>
  <v-app>
    <v-main>
      <v-container fluid>
        
      </v-container>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import HelloWorld from './components/HelloWorld.vue';

import socket from "./socket";
(window as any).socket = socket;

export default defineComponent({
  name: 'App',
  components: {
    HelloWorld
  },
  data() {    
return {
    }  
},
  mounted() {
    socket.on("connect", () => {
      console.log('heehoo');
    })
  }
});
</script>
