import SpotifyWebApi from 'spotify-web-api-node';
import ytSearch from 'youtube-search';

let tm = 0;

const spotifyApi = new SpotifyWebApi({
	clientId: process.env.SPOTIFY_CLIENT_ID,
	clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
	// redirectUri: 'http://www.example.com/callback'
});

export default function login(expired?: boolean) {
	if (tm) {
		clearTimeout(tm);
	}
	return spotifyApi.clientCredentialsGrant().then(
		data => {
			if (expired || !spotifyApi.getAccessToken()) {
				console.log('The access token expires in ' + data.body['expires_in']);
				console.log('The access token is ' + data.body['access_token']);

				// Save the access token so that it's used in future calls
				spotifyApi.setAccessToken(data.body['access_token']);

				tm = setTimeout(login, data.body['expires_in'] * 1000)
			}
			return spotifyApi;
		}
	);
}

type Track = {
	name: string;
	artists: [
		{
			name: string;
		}
	]
};

/**
 * Gets a YouTube link to a spotify track
 * @param trackId Spotify track id
 */
export async function getYTUrl(id: string): Promise<string>;
export async function getYTUrl(track: Track): Promise<string>;
export async function getYTUrl(trackOrId: string | Track): Promise<string> {
	const track = typeof trackOrId === 'object' ? 
	trackOrId :
	(await spotifyApi.getTrack(trackOrId)).body;

	let results: any[] = [{}];

	try {

		results = (await ytSearch(`${track.artists[0].name} ${track.name}`, {
			key: process.env.YT_KEY,
			type: 'video',
			order: 'rating',
			videoCategoryId: '10' //Music
		})).results;

	} catch (e) {
		if (e) {
			console.error("Error: YT Search error")
			// console.dir(e, 0);
		}
	}
	return results[0].link;
}

// export default spotifyApi;