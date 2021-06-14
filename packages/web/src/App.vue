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
						<v-btn @click="sendMic">Mic</v-btn>
					</v-col>
				</v-row>
			</v-container>
		</v-main>
	</v-app>
</template>

<script lang="ts">
import { Socket } from 'socket.io-client';
import { defineComponent } from 'vue';
// import HelloWorld from './components/HelloWorld.vue';
import Player from './components/Player.vue';

import socket from "./socket";
(window as any).socket = socket;

function createConnection(socket: Socket, {
	polite
} = { polite: true }) {
	const pc = new RTCPeerConnection();

	pc.onconnectionstatechange = state => console.log(state);

	pc.onicecandidate = ({ candidate }) => {
		socket.emit("webrtc-msg", { candidate })
	};
	pc.onnegotiationneeded = async () => {
		const offer = await pc.createOffer();
		if (pc.signalingState != "stable") return;
		await pc.setLocalDescription(offer);
		socket.emit('webrtc-msg', { description: pc.localDescription });
	};

	socket.on("webrtc-msg", async ({ description, candidate }) => {
		console.log("webrtc msg", description, candidate)
		if (description) {
			if (description.type == "offer" && pc.signalingState != "stable") {
				if (!polite) return;
				await Promise.all([
					pc.setLocalDescription({ type: "rollback" }),
					pc.setRemoteDescription(description)
				]);
			} else {
				await pc.setRemoteDescription(description);
			}

			if (description.type === "offer") {
				await pc.setLocalDescription(await pc.createAnswer());
				socket.emit('webrtc-msg', { description: pc.localDescription });
			}
		} else if (candidate) {
			await pc.addIceCandidate(candidate);
		}
	});

	return pc;
}

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
		socket,
	}),
	mounted() {
		(window as any).vue = this;
		socket.on("connect", () => {
			console.log('Connect')
			// socket.emit("webrtc-begin");

			// socket.on('webrtc-ready', async () => {

			// })
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
		},
		async sendMic() {
			navigator.mediaDevices.getUserMedia({
				audio: true,
				video: false
			}).then((media) => {
				const pc = createConnection(socket);

				media.getAudioTracks().forEach(track => {
					pc.addTrack(track);
				});
			});
		}
	},
	computed: {
		sortedTracks() {
			return (this as unknown as { tracks: any[] }).tracks.sort((a, b) => +b.votes - +a.votes);
		}
	}
});
</script>
