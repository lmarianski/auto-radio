import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';


let peer: Peer.Instance;

export function createPeer(socket: Socket) {
	if (!peer) {
		peer = new Peer({
			initiator: true
		});

		socket.on('peer-signal', (data) => {
			peer.signal(data);
		});

		peer.on('signal', data => {
			socket.emit('peer-signal', data)
		});
	}
	return peer;
}