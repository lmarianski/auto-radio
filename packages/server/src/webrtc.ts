import { Server, Socket } from 'socket.io';

import Peer from 'simple-peer';
import wrtc from 'wrtc';

// Object.assign(this, wrtc);

// const { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription } = wrtc;

export default class WebRTCManager {
	constructor(io: Server) {
		io.use((socket, next) => {
			const peer = new Peer({
				wrtc
			});

			socket.on('peer-signal', (data) => {
				console.log("peer-signal")
				peer.signal(data);
			});

			peer.on('signal', (data) => {
				socket.emit('peer-signal', data);
			});

			next();
		});
	}
}


// import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription } from 'wrtc';

// export default class WebRTCManager {

// 	servers = undefined;

// 	connections: {
// 		[key: string]: RTCPeerConnection;
// 	} = {};

// 	constructor(io: Server, { polite } = { polite: false }) {
// 		io.use((socket, next) => {

// 			// socket.on('webrtc', () => {
// 			if (this.connections[socket.id]) {
// 				this.connections[socket.id].close();
// 			}

// 			this.connections[socket.id] = this.createConnection(socket);
// 			socket.on("webrtc-msg", (data) => this.onWebRTCMessage(socket, data));
// 			// })

// 			// socket.on('webrtc-begin', async () => {
// 			// 	if (this.connections[socket.id]) {
// 			// 		const {listener, pc} = this.connections[socket.id];

// 			// 		console.log("Close old conn")

// 			// 		pc.close();
// 			// 		socket.removeListener("webrtc-msg", listener);
// 			// 	}

// 			// 	const pc = this.createConnection(socket);

// 			// 	const listener = (data: any) => this.onWebRTCMessage(socket, pc, data);
// 			// 	socket.on("webrtc-msg", listener);

// 			// 	this.connections[socket.id] = {
// 			// 		pc,
// 			// 		listener
// 			// 	}

// 			// 	socket.emit("webrtc-ready");
// 			// });

// 			next();
// 		});
// 	}

// 	createConnection(socket: Socket) {
// 		const pc = new RTCPeerConnection(this.servers);

// 		pc.onicecandidate = ({candidate}) => {
// 			socket.emit('webrtc-msg', {candidate});
// 		};
// 		pc.onnegotiationneeded = async () => {
// 			const offer = await pc.createOffer();
// 			if (pc.signalingState != "stable") return;
// 			await pc.setLocalDescription(offer);
// 			socket.emit('webrtc-msg', { description: pc.localDescription });
// 		};

// 		pc.ontrack = ({streams}) => {
// 			// console.log("Track received", track);
// 			// track.on("", () => {});
// 			streams[0].getTracks()[0].addEventListener('data', () => {
// 				console.log("DAta")
// 			});
// 		}

// 		return pc;
// 	}

// 	private async onWebRTCMessage(
// 		socket: Socket,
// 		{description, candidate}: {
// 			description: RTCSessionDescription,
// 			candidate: RTCIceCandidate
// 		},
// 		opts = {polite: true}
// 	) {
// 		const pc = this.connections[socket.id];

// 		if (description) {
// 			if (description.type == "offer" && pc.signalingState != "stable") {
// 				if (!opts.polite) return;
// 				await Promise.all([
// 					pc.setLocalDescription({ type: "rollback" } as any),
// 					pc.setRemoteDescription(description)
// 				]);
// 			} else {
// 				await pc.setRemoteDescription(description);
// 			}

// 			if (description.type === "offer") {
// 				await pc.setLocalDescription(await pc.createAnswer());
// 				socket.emit('webrtc-msg', { description: pc.localDescription });
// 			}
// 		} else if (candidate) {
// 			await pc.addIceCandidate(candidate);
// 		}
// 	}

// 	private onIceCandidate(pc: RTCPeerConnection, e: any) {

// 	}

// 	private onIceStateChange(pc: RTCPeerConnection, e: any) {

// 	}

// }