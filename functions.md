api key= AIzaSyA2d0ZBNt_0IGPBgbRYDlBAWAO77a0Adkk

const ytdl = require("@distube/ytdl-core");
// TypeScript: import ytdl from '@distube/ytdl-core'; with --esModuleInterop
// TypeScript: import * as ytdl from '@distube/ytdl-core'; with --allowSyntheticDefaultImports
// TypeScript: import ytdl = require('@distube/ytdl-core'); with neither of the above

// Download a video
ytdl("http://www.youtube.com/watch?v=aqz-KE-bpKQ").pipe(require("fs").createWriteStream("video.mp4"));

// Get video info
ytdl.getBasicInfo("https://music.youtube.com/watch?v=3R-q79a7n98").then(info => {
  console.log(info);
});

// Get video info with download formats
ytdl.getInfo("https://music.youtube.com/watch?v=3R-q79a7n98").then(info => {
  console.log(info.formats);
});

// const YTMusic = require('ytmusic-api');

// const ytmusic = new YTMusic()

// async function getSongs() {
//     await ytmusic.initialize(/* Optional: Custom cookies */)
//     ytmusic.searchSongs("teri deewani", "SONG").then(songs => {
//         const result = songs.filter((elem) => ['SONG', 'VIDEO'].includes(elem.type));
//         console.log(result);
//     })
// }

// getSongs();
import YTMusic from "ytmusic-api"

const ytmusic = new YTMusic()
await ytmusic.initialize(/* Optional: Custom cookies */)

// ytmusic.search("tu hai ki nahi", "song").then(songs => {
// 	console.log(songs);
// })

// ytmusic.getAlbum("MPREb_KE8N1SGbcgL").then(result => {console.log(result)});

// ytmusic.searchPlaylists("arijit sing").then(result => {console.log(result)});

ytmusic.getPlaylistVideos("PLqDtE0HYNMZOL7BWxNWmJUoRL1VftGn9m").then(result => {console.log(result)});

// ytmusic.getArtist('UCydblD160MSY1o2C6plzTjg').then(res => console.log(res));
// ytmusic.getSearchSuggestions('teri deewani').then(res => console.log(res));
// ytmusic.getAlbum
// ytmusic.getArtist
// ytmusic.getArtistAlbums
// ytmusic.getArtistSongs
// ytmusic.getHomeSections
// ytmusic.getLyrics
// ytmusic.getPlaylist
// ytmusic.getPlaylistVideos
// ytmusic.getSearchSuggestions
// ytmusic.getSong
// ytmusic.getVideo
// ytmusic.initialize
// ytmusic.search
// ytmusic.searchAlbums
// ytmusic.searchArtists
// ytmusic.searchPlaylists
// ytmusic.searchSongs
// ytmusic.searchVideos