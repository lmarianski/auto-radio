import sqlite3 from 'sqlite3';

import fs from 'fs';
import { resolveTrack } from './player';

const sql = sqlite3.verbose();

const flag = !fs.existsSync("./data/db.sqlite")

const db = new sql.Database('./data/db.sqlite');

if (flag) {
	db.serialize(() => {
		db.run("CREATE TABLE tracks (uri VARCHAR(255) UNIQUE, name VARCHAR(255), author VARCHAR(255), votes INTEGER)")
	});
}

export default db;

export interface DBTrack {
	id: number;
	uri: string;
	name: string;
	author: string;
	votes: number;
};

export function getTracks(): Promise<DBTrack[]> {
	return new Promise((resolve, reject) => {
		db.all('SELECT rowid as id, uri, name, author, votes FROM tracks', (err, rows) => {
			if (err)
				return reject(err);

			// rows = rows.map(el => resolveTrack(el, songs));

			resolve(rows);
		});
	});
};

export function incrementVotes(...rowIds: number[]) {
	db.serialize(() => {
		const stmt = db.prepare("UPDATE tracks SET votes = votes + 1 WHERE rowid = ?")

		rowIds.forEach(rowId => stmt.run(rowId));

		stmt.finalize();
	});
}

export function resetVotes(...rowIds: number[]) {
	db.serialize(() => {
		const stmt = db.prepare("UPDATE tracks SET votes = 0 WHERE rowid = ?")

		rowIds.forEach(rowId => stmt.run(rowId));

		stmt.finalize();
	});
}

export async function addTracks(...uris: string[]) {
	// db.serialize(() => {
	const stmt = db.prepare("INSERT INTO tracks VALUES (?, ?, ?, 0)")

	const tracks = await Promise.all(uris.map(el => resolveTrack(el)));

	tracks.forEach(el => stmt.run(el.uri, el.name, el.author));

	stmt.finalize();

	// return tracks;
	// });
}

export function updateTrack(track: DBTrack) {
	db.serialize(() => {
		const stmt = db.prepare("UPDATE tracks SET uri = ?, name = ?, author = ?, votes = ? WHERE rowid = ?")

		stmt.run(track.uri, track.name, track.author, track.votes || 0, track.id);

		stmt.finalize();
	});
}

export function getMostPopular(): Promise<DBTrack> {
	return new Promise((resolve, reject) => {
		db.all('SELECT rowid as id, uri, name, author, votes FROM tracks WHERE votes = (SELECT MAX(votes) FROM tracks)', (err, rows) => {
			if (err)
				return reject(err);

			resolve(rows[0]);
		});
	});
}