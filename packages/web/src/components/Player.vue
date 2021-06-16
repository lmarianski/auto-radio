<template>
	<h2>Now Playing:</h2> 
	{{ (nowPlaying || {}).name }}<br>
	{{ (nowPlaying || {}).author }}
	<br />
	<div class="progress">
		<div class="bar" :style="{ 'width': ((progress || 0) * 100)+'%' }"></div>
	</div>
	<div class="controls">
		<!-- <v-btn @click="emit"></v-btn> -->
		<v-btn v-if="!playing" @click="$emit('play')">Play</v-btn>
		<v-btn v-else          @click="$emit('pause')">Pause</v-btn>

		<v-btn @click="$emit('skip')">Next</v-btn>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'Player',
	emits: [
		'play',
		'pause',
		'skip'
	],
	props: {
		nowPlaying: Object,
		progress: Number,
		playing: Boolean
	},

	data: () => ({})
});
</script>

<style scoped>
.progress {
	width: 100%;
	height: 15px;

	border-width: 2px;
	border-style: solid;

}

.bar {
	background-color: red;
	height: 11px;
}

</style>