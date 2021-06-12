import path from 'path';
import http from 'http';

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { Server } from 'socket.io';

import db, { addTracks, getTracks, incrementVotes } from "./db";
import spotifyB, { getYTUrl } from "./spotify";
// console.log(spotify);

const spotify = spotifyB();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const webPath = path.join('..', 'web', 'dist');
const port = process.env.PORT || 3000;

app.use(express.static(webPath));

io.on('connection', (socket) => {
	socket.on('getTracks', async () => {
		socket.emit('tracks', await getTracks());
	});
	socket.on("vote", (id) => {
		incrementVotes(id);
	});
	socket.on("addTrack", async (uri) => {
		addTracks(uri);
		io.emit("tracks", await getTracks());
	});
	socket.on("play", async (uri) => {
		// addTracks(uri);
		// io.emit("tracks", await getTracks());
			//https://open.spotify.com/track/7qH6ICtmf08M8l3bvM27Gc?si=2c5bf0f2d2eb4c71
		play(uri).then(() => {
			console.log("Playback done");
		});
	});
});

server.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)

	//https://open.spotify.com/track/7qH6ICtmf08M8l3bvM27Gc?si=2c5bf0f2d2eb4c71
	// play('spotify:7qH6ICtmf08M8l3bvM27Gc').then(() => {
	// 	console.log("Playback done");
	// });
});

import ytdl from 'ytdl-core';

import lame from '@suldashi/lame';
import Speaker from 'speaker';

import ffmpeg from 'fluent-ffmpeg';

import fs from 'fs';


const songsFilePath = path.join("data", "songs.json");
let songs: {
	[key: string]: {
		name: string;
		author: string;
	}
} = {};

songs = Object.assign(songs, JSON.parse(
	fs.readFileSync(songsFilePath).toString()));

function addSong(uri: string, name: string, author: string) {
	songs[uri] = {
		name, author
	};
	fs.writeFileSync(songsFilePath, JSON.stringify(songs, null, "\t"));
}

function play(uri: string): Promise<void> {
	return new Promise(async (resolve, reject) => {
		const [service, id] = uri.split(":");

		if (id) {
			const p = await download(uri);
			console.log("Done")

			const decoder = new lame.Decoder();
			const speaker = new Speaker();
			// const p  = path.join("data", "songs", "Jon Hopkins - Candles.mp3")

			fs.createReadStream(p)
				.pipe(decoder)
				.pipe(speaker);

			speaker.on("finish", () => {
				return resolve();
			})
		}
	});
}

function isURL(str: string) {
	let url;
	try {
		url = new URL(str);
	} catch (_) {
		return false;
	}
	return url;
}

function download(uri: string): Promise<string> {
	return new Promise(async (resolve, reject) => {
		let [service, id] = uri.split(":");

		let i, song, url;

		const songDir = path.join('.', 'data', 'songs');
		let filePath = '';

		url = isURL(uri);
		if (url && uri.includes("youtube")) {
			service = "youtube";
			id = (url as URL).searchParams.get('v') as string;
			
			uri = service+":"+id;
		}

		if (song = songs[uri]) {
			filePath = path.join(songDir, `${song.author} - ${song.name}.mp3`)

			console.log(song)

			// return;

			if (fs.existsSync(filePath)) {
				return resolve(filePath);
			} else {
				// service = "youtube";
				i = await getYTUrl({
					name: song.name,
					artists: [
						{ name: song.author }
					]
				});
			}
		}

		switch (service) {
			case ("spotify"):
				if (!i) {
					await spotify;
					i = await getYTUrl(id);
				}
			case ("youtube"):
				const stream = ytdl(i || 'http://www.youtube.com/watch?v=' + id, {
					quality: 'highestaudio',
					filter: 'audioonly'
					// filter: (format) => format.hasVideo === false && format.hasAudio === true && format.container === "mp4"
				});


				stream.on('info', (info, format) => {
					let title: string = info.videoDetails.title;
					title = title.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
					let [author, name] = title.split("-");
					
					if (author && !name) {
						name = author;
						author = "Unknown";
					}

					filePath = path.join('.', 'data', 'songs', `${author} - ${name}.mp3`);

					info.formats.forEach((el: any) => {
						console.log(el.mimeType);
					})

					if (!songs[uri]) {
						addSong(uri, name, author);
					}

					if (!fs.existsSync(filePath)) {
						ffmpeg(stream)
							.format('mp3')
							.pipe(fs.createWriteStream(filePath))
							.on('end', () => resolve(filePath));
					} else {
						return resolve(filePath);
					}
				});

				stream.on('error', (err) => {
					console.error(err);
				})

				// stream.on('end', () => {
				// 	return resolve(filePath);
				// })
				break;
			default:
				return reject();
		}
	});
}







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