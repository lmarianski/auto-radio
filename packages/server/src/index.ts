import path from 'path';

import express from 'express';
import http from 'http';

import * as axios from 'axios';

import { Server } from 'socket.io';

require('auto-radio-web')

const app = express();
const server = http.createServer(app);
const io = new Server(server);

console.log(require.resolve('auto-radio-web'));

const webPath = path.join(require.resolve('auto-radio-web'));
const port = process.env.PORT || 3000;

io.on('connection', (socket) => {
	console.log('Conn');
});

app.use(express.static(webPath));


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

server.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
})
