import sqlite3 from 'sqlite3';

const sql = sqlite3.verbose();

const db = new sql.Database(':memory:');

db.serialize(() => {
	db.run("CREATE TABLE tracks (uri VARCHAR(255), votes INTEGER)")
});

export default db;

export function getTracks() {
	return new Promise((resolve, reject) => {
		db.all('SELECT rowid as id, uri, votes FROM tracks', (err, rows) => {
			if (err)
				return reject(err);
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

export function addTracks(...uris: string[]) {
	db.serialize(() => {
		const stmt = db.prepare("INSERT INTO tracks VALUES (?, 0)")

		uris.forEach(uri => stmt.run(uri));

		stmt.finalize();
	});
}

export function getMostPopular() {
	return new Promise((resolve, reject) => {
		db.all('SELECT rowid as id, uri, votes FROM tracks WHERE votes = (SELECT MAX(votes) FROM tracks)', (err, rows) => {
			if (err)
				return reject(err);
			resolve(rows[0]);
		});
	});
}