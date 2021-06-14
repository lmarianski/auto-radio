import fs from "fs";
import path from "path";
import EventEmitter from 'events';

import ffmpeg from 'fluent-ffmpeg';
import ytdl from "ytdl-core";

import Audic from 'audic';

import { DBTrack, updateTrack } from "./db";
import spotify, { getYTUrl } from "./spotify";

export async function resolveTrack(uri: string, dbtrack?: DBTrack) {
	let tr = {} as DBTrack;

	if (dbtrack) {
		Object.assign(tr, dbtrack);
	} else {
		tr.votes = 0;
		tr.uri = uri;
	}

	if (!tr.name || !tr.author) {
		const [service, id] = uri.split(":");

		switch (service) {
			case ("spotify"):
				const spotTrack = await (await spotify).getTrack(id);

				tr.name = spotTrack.body.name;
				tr.author = spotTrack.body.artists[0].name;
				break;
		}
	}

	return tr;
}


export class Player extends EventEmitter {

	nowPlaying!: DBTrack;

	audio!: Audic;

	private int!: NodeJS.Timeout;

	constructor() {
		super();
	}

	pause() {
		console.log("Paused")
		this.audio.pause();
	}

	play() {
		this.audio.play();
	}

	stop() {
		console.log("Stop");
		this.audio.destroy();
		clearInterval(this.int);
	}

	start(track: DBTrack): Promise<void> {
		return new Promise(async (resolve, reject) => {
			if (track) {
				const p = await this.download(track);
				
				if (this.audio) {
					console.log("Audio exists")
					this.stop();
				}
				
				this.audio = new Audic(p);

				this.audio.play();
				this.nowPlaying = track;

				this.int = setInterval(() => {
					let flag = false;

					if (this.audio) {
						const prg = this.audio.currentTime/this.audio.duration;
						if (prg === 0 && !flag) {
							flag = true;

							setTimeout(() => {
								resolve();
							}, this.audio.duration*1000);
						
							this.emit('start');
						}

						if (prg >= 0 && this.audio.playing) {
							this.emit('progress', prg);
						}

						if (prg === 1) {
							clearInterval(this.int);
							this.emit('end');
						}
					}
				}, 1000);

			}
		});
	}

	download(track: DBTrack): Promise<string> {
		return new Promise(async (resolve, reject) => {
			let [service, id] = track.uri.split(":");

			let i, url;

			const songDir = path.join('.', 'data', 'songs');
			let filePath = '';

			// url = isURL(uri);
			// if (url && uri.includes("youtube")) {
			// 	service = "youtube";
			// 	id = (url as URL).searchParams.get('v') as string;

			// 	uri = service+":"+id;
			// }

			if (track.name && track.author) {
				filePath = path.join(songDir, `${track.author} - ${track.name}.mp3`)

				if (fs.existsSync(filePath)) {
					return resolve(filePath);
				} else {
					service = "youtube";
					i = await getYTUrl({
						name: track.name,
						artists: [
							{ name: track.author }
						]
					});
				}
			}

			switch (service) {
				case ("spotify"):
					if (!i) {
						// await spotify;
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

						console.log(title);
						title = title.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
						if (title.includes("(")) {
							title = title.substring(0, title.indexOf("(") - 1);
						}
						if (title.includes("Ft.")) {
							title = title.substring(0, title.indexOf("Ft.") - 1);
						}
						let [author, name] = title.split("-");

						author = author.trim();
						name = name.trim();


						if (author && !name) {
							name = author;
							author = "Unknown";
						}

						info.formats.forEach((el: any) => {
							console.log(el.mimeType);
						})

						if (!track.author || !track.name) {
							if (!track.author) {
								track.author = author;
							}

							if (!track.name) {
								track.name = name;
							}

							updateTrack(track);
						}

						filePath = path.join('.', 'data', 'songs', `${track.author} - ${track.name}.mp3`);

						if (!fs.existsSync(filePath)) {
							let flag = false;

							const command = ffmpeg().input(stream)
								.format('mp3')
								.on('start', (commandLine) => {
									console.log('Spawned FFmpeg with command: ' + commandLine);
								})
								.on('progress', (progress) => {
									console.log('Processing: ' + progress.percent + '% done', progress);
								})
								.on('error', err => !flag ? reject(err) : resolve(filePath))
								.on('end', () => resolve(filePath));

							command.pipe(fs.createWriteStream(filePath));

							// setTimeout(() => {
							// 	flag = true;
							// 	command.kill("SIGKILL");
							// }, 30000);
						} else {
							return resolve(filePath);
						}
					});

					stream.on('error', (err) => {
						reject(err);
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

}