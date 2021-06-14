<template>
	<v-app>
		<v-app-bar app></v-app-bar>
		<v-main>
			<v-container fluid>
				<v-row>
					<v-col cols="6">
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
										<v-btn fla text @click="upvote(val.id)">
											<v-icon>mdi-arrow-top-bold</v-icon>
										</v-btn>
									</v-col>
								</v-row>
							</li>
						</ul>
					</v-col>
					<v-col cols="6" style="text-align: center;">
						<player 
							:nowPlaying="nowPlaying || { name: 'naenae' }" 
							:progress="progress"
							:playing="playing"
							@play="socket.emit('play')"
							@pause="socket.emit('pause')"
							@skip="socket.emit('skip')"
						></player>
					</v-col>
				</v-row>
			</v-container>
		</v-main>
	</v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
// import HelloWorld from './components/HelloWorld.vue';
import Player from './components/Player.vue';

import socket from "./socket";
(window as any).socket = socket;

export default defineComponent({
	name: 'App',
	components: {
		Player
	},
	data: () => ({
		tracks: [],
		nowPlaying: null,
		progress: 0,
		playing: false,
		socket
	}),
	mounted() {

		const pc = new RTCPeerConnection();

		pc.onicecandidate = e => {
			socket.emit("webrtc-ice-candidate", e.candidate)
		}
		socket.on("webrtc-ice-candidate", candidate => {
			pc.addIceCandidate(candidate);
		})

		socket.on("connect", () => {
			socket.emit("webrtc-begin");
		});

		socket.on("webrtc-offer", async (desc) => {
			await pc.setRemoteDescription(desc);

			const answer = await pc.createAnswer();

			const media = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: false
			});

			media.getAudioTracks().forEach(track => {
				pc.addTrack(track);
			})

			await pc.setLocalDescription(answer);

			socket.emit("webrtc-answer", answer);
		});

		socket.on("tracks", (tracks) => {
			this.tracks = tracks;
		});

		socket.on("progress", (progress) => {
			this.progress = progress;
		});

		socket.on("playing", (playing) => {
			this.playing = playing;
		});

		socket.on("nowPlaying", (nowPlaying) => {
			this.nowPlaying = nowPlaying;
		});
	},
	methods: {
		upvote(id: string) {
			socket.emit("vote", id)
		}
	},
	computed: {
		sortedTracks() {
			return (this as unknown as { tracks: any[] }).tracks.sort((a, b) => +b.votes - +a.votes);
		}
	}
});
</script>
