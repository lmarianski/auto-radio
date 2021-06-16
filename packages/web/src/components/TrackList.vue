<template>
	<ul>
		<li v-for="val in sortedTracks">
			<v-row>
				<v-col cols="9">
					{{ val.name }}
					<br />
					<span>{{ val.author }}</span>
				</v-col>
				<v-col cols="3">
					{{ val.votes }}
					<v-btn icon text @click="upvote(val.id)">
						<v-icon>mdi-plus</v-icon>
					</v-btn>
				</v-col>
			</v-row>
		</li>
	</ul>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// import socket from "../socket";

export default defineComponent({
	name: 'TrackList',
	emits: [
	],
	props: {
		tracks: Array,
	},
	methods: {
		upvote(id: string) {
			(window as any).socket.emit('vote', id);
		}
	},
	computed: {
		sortedTracks(): any[] {
			return (this.tracks as any[])
				.sort((a, b) => +b.votes - +a.votes);
		}
	}
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