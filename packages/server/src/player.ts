import fs from "fs";
import path from "path";
import EventEmitter from 'events';
import * as stream from "stream";

import Ffmpeg from 'fluent-ffmpeg';

import ytdl from "ytdl-core";

// import Audic from 'audic';

import Speaker from 'speaker';

import { DBTrack, updateTrack } from "./db";
import spotify, { getYTUrl } from "./spotify";
import e from "express";

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

// import duplex from 'duplexify';

// function ffmpegStream(ffmpeg: Ffmpeg.FfmpegCommand) {
// 	const is = new stream.PassThrough();
// 	const os = new stream.PassThrough();

// 	const str = duplex(is, os);

// 	ffmpeg
// 		.input(is)
// 		.on('error', err => str.emit('error', err))
// 		.pipe(os);

// 	return str;
// }

export class Player extends EventEmitter {

	nowPlaying!: DBTrack;

	private speaker!: Speaker;
	private command!: Ffmpeg.FfmpegCommand;

	playing = false;
	progress = 0;

	constructor() {
		super();

		this.speaker = this.createSpeaker();
	}

	private stateChange() {
		this.emit("playStateChange", this.playing);
	}

	play() {
		this.playing = true;
		this.speaker.uncork();
		this.stateChange();
	}


	pause() {
		this.playing = false;
		this.speaker.cork();
		this.stateChange();
	}

	stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.playing = false;
			this.stateChange();

			const e = () => {
				setTimeout(resolve, 1000);
			}

			if ((this.command as any).done) {
				e();
			} else {
				this.command.once('error', e);
			}
			

			this.command.kill('SIGKILL');
		})
	}

	async destroy() {
		await this.stop();
		this.speaker.destroy();
	}

	private ffmpeg(input: string | stream.Readable, callback?: () => void) {
		return Ffmpeg(input)
			.format('s16le')
			.audioCodec('pcm_s16le')
			.on('start', () => {
				this.playing = true;
				this.emit('start');
			})
			.on('progress', ({ percent }) => {
				this.progress = (percent || 0) / 100;
				this.emit('progress', this.progress);
			})
			.on('error', err => console.error(err.message))
			.on('end', () => {
				this.playing = false;
				this.emit('end');
	
				(this.command as any).done = true;

				console.log('END')

				if (callback)
					callback();
			});
	}

	private createSpeaker(): Speaker {
		return new Speaker({
			channels: 2,
			bitDepth: 16,
			signed: true,
			sampleRate: 48000
		} as any);
	}

	start(track: DBTrack): Promise<void> {
		return new Promise(async (resolve, reject) => {
			if (track) {
				const p = await this.download(track);

				this.nowPlaying = track;

				this.progress = 0;

				// if (this.speaker) {
				// 	this.speaker.destroy();
				// }

				// this.speaker = this.createSpeaker();

				if (this.command) {
					await this.stop();
				}
				console.log("PLAY")

				this.play();

				this.command = this.ffmpeg(p, resolve);
				
				this.command.pipe(this.speaker, { end: false });
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
						}

						filePath = path.join('.', 'data', 'songs', `${track.author} - ${track.name}.mp3`);

						if (!fs.existsSync(filePath)) {
							let flag = false;

							const command = Ffmpeg().input(stream)
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