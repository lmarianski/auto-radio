import { io } from 'socket.io-client';

const socket = io({
	transports: ['websocket']
});

socket.onAny((event, ...args) => {
	console.log(event, args);
});

if (import.meta.env.DEV) {
	localStorage.debug = '*';
} else {
	localStorage.debug = '';
}

export default socket;