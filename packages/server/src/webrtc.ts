import { Socket, Server } from 'socket.io';

import { RTCPeerConnection, RTCIceCandidate } from 'werift';

export default class WebRTCManager {

	servers = undefined;

	// connections: {
	// 	[key: string]: {
	// 		pc: RTCPeerConnection;
	// 	}
	// } = {};

	constructor(io: Server) {
		io.use((socket, next) => {

			socket.on('webrtc-begin', async () => {
				const conn = this.createConnection(socket);

				const desc = await conn.createOffer();

				await conn.setLocalDescription(desc);

				socket.emit('webrtc-offer', desc);

				socket.once('webrtc-answer', async (desc) => {
					await conn.setRemoteDescription(desc);
				});
			});

			next();
		});
	}

	createConnection(socket: Socket) {
		const pc = new RTCPeerConnection(this.servers);
	
		pc.onicecandidate = event => {
			socket.emit('webrtc-ice-candidate', event.candidate);
		};
		socket.on('webrtc-ice-candidate', (candidate: RTCIceCandidate) => {
			pc.addIceCandidate(candidate);
		});

		// pc.onconnectionstatechange = (e) => this.onIceStateChange(pc)
	


		return pc;
	}

	private onIceCandidate(pc: RTCPeerConnection, e: any) {

	}

	private onIceStateChange(pc: RTCPeerConnection, e: any) {

	}

}
