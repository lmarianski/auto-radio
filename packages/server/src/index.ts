import path from 'path';
import http from 'http';

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { Server } from 'socket.io';

import db, { addTracks, DBTrack, getMostPopular, getTracks, incrementVotes, updateTrack } from "./db";
import spotify, { getYTUrl } from "./spotify";
import { Player } from './player';
import WebRTCManager from './webrtc';


// console.log(spotify);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const player = new Player();

const webPath = path.join('..', 'web', 'dist');
const port = process.env.PORT || 3000;


app.use(express.static(webPath));

// new WebRTCManager(io);

// io.use(WebRTCManager);

io.on('connection', async (socket) => {
	socket.emit('tracks', await getTracks());
	socket.emit('nowPlaying', player.nowPlaying);
	socket.emit('playing', player.playing);

	socket.on('getTracks', async () => {
		socket.emit('tracks', await getTracks());
	});

	socket.on('spotify-search', async term => {
		const results = (await (await spotify).searchTracks(term)).body.tracks;
		socket.emit('spotify-search', results);
	});

	socket.on('vote', async (id) => {
		incrementVotes(id);
		io.emit('tracks', await getTracks());
	});

	socket.on('addTrack', async (uri) => {
		await addTracks(uri);
		io.emit('tracks', await getTracks());
	});
	socket.on('pause', async (id) => {
		player.pause();
	});
	socket.on('play', async (id) => {
		player.play();
	});
	socket.on('skip', async (id) => {
		skip();
	});
	socket.on('start', async (uri) => {
		// addTracks(uri);
		// io.emit("tracks", await getTracks());
			//https://open.spotify.com/track/7qH6ICtmf08M8l3bvM27Gc?si=2c5bf0f2d2eb4c71
		let tracks = (await getTracks()).filter(el => el.uri === uri);

		if (tracks.length === 0) {
			await addTracks(uri);
			tracks = (await getTracks()).filter(el => el.uri === uri)
		}

		if (tracks[0]) {
			player.start(tracks[0]).then(() => {
				console.log("Playback done");
			});
		}
	});
});

function skip() {
	player.stop();
	playNext();
}

player.on('playStateChange', (state) => {
	io.emit("playing", state);
})

player.on('start', () => {
	io.emit('nowPlaying', player.nowPlaying);
})

player.on('progress', el => {
	console.log((el*100).toFixed(2)+"%");
	io.emit('progress', el);
});

function pick<T>(arr: T[], num: number): T[] {
	return new Array(num)
		.fill(0)
		.map(el => Math.floor(Math.random()*arr.length))
		.map(el => arr[el])
}

const playNext = async () => {
	const track = await getMostPopular();

	if (track) {
		console.log("Now playing: "+track.name+" by "+track.author, );

		player.start(track).then(() => {
			playNext();
		})

		track.votes = 0;
		updateTrack(track);

		const tracks = await getTracks();
		// const votes = Math.floor(Math.random()*tracks.length)+Math.floor(tracks.length/2);

		const votes = Math.floor(tracks.length/2);

		pick(tracks, votes).forEach(el => {
			if (el.uri !== track.uri) {
				el.votes++;

				updateTrack(el);
			}
		})
		
		io.emit("tracks", tracks);
	}
};

server.listen(port, async () => {
	console.log(`Example app listening at http://localhost:${port}`);

	//https://open.spotify.com/track/7qH6ICtmf08M8l3bvM27Gc?si=2c5bf0f2d2eb4c71
	// play('spotify:7qH6ICtmf08M8l3bvM27Gc').then(() => {
	// 	console.log("Playback done");
	// });

	await spotify;

	playNext();
});

// if (process.env.MODE === 'dev') {
// 	app.get("/*", (oreq, ores) => {
// 		// if (!oreq.path.includes("socket.io")) {
// 			axios.default({
// 				method: oreq.method as axios.Method,
// 				baseURL: 'http://localhost:3003/',
// 				url: oreq.path,
// 				headers: oreq.headers,
// 				responseType: "stream",
// 			}).then(pres => {
// 				ores.writeHead(pres.status, pres.statusText, pres.headers);
// 				pres.data.pipe(ores);
// 			}).catch(async e => {
// 				// we got an error
// 				// console.log(await streamToString(e.response.data));
// 				// console.log(e.response.status);
// 				// console.log(e.response.headers);
// 				try {
// 					// attempt to set error message and http status
// 					ores.writeHead(e.response.status);
// 					ores.write(e.response.statusText);
// 				} catch (e) {
// 					// ignore
// 				}
// 				ores.end();
// 			});
// 		// }
// 	});
// }