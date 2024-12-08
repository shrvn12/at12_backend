const express = require('express');
const ytdl = require("@distube/ytdl-core");
const cors = require("cors");
const axios = require("axios");
const YTMusic = require('ytmusic-api');

const ytmusic = new YTMusic()
const app = express();
app.use(cors());

app.get('/audio', async(req, res) => {
    const url = req.query.url;
    const search = req.query.search;

    ytmusic.searchSongs(`${search}`).then(async songs => {
        songs = songs.map(obj => obj.videoId);
        const collector = [];
        const url = `https://music.youtube.com/watch?v=${songs[0]}`;
        await ytdl.getInfo(`${url}`).then((info) => {
            console.log(info);
            const result = info.formats.filter((el) => el.hasAudio);
            collector.push(result[0]);
        })
        res.json(collector);
    }).catch(err => {res.send(err)});
})

app.get('/search', async(req, res) => {
    const query = req.query.query;
    ytmusic.getSearchSuggestions(`${query}`).then(async (result) => {
        res.json(result);
    }).catch(err => {
        console.log(err);
        res.json(err);
    })
})

app.get('/searchSong', async(req, res) => {
    const query = req.query.query;
    console.log(query);
    if (!query || query == "null") {
        return res.send('query missing!')
    }

    ytmusic.searchSongs(`${query}`).then(async songs => {
        res.json(songs);
    }).catch(err => {
        console.log(err);
        res.json(err);
    });
})

app.get('/album', async(req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.send('query missing!')
    }
    ytmusic.getAlbum(`${query}`).then(async songs => {
        res.json(songs);
    }).catch(err => {
        console.log(err);
        res.json(err);
    });
})

app.get('/playlist', async(req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.send('query missing!')
    }
    ytmusic.getPlaylistVideos(`${query}`).then(async songs => {
        res.json(songs);
    }).catch(err => {
        console.log(err);
        res.json(err);
    });
})

app.get('/video', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.send('query missing!')
    }
    const url = `https://music.youtube.com/watch?v=${query}`;
       return await ytdl.getInfo(`${url}`).then((info) => {
            // info = info.formats.filter((el) => el.hasAudio);
            return res.json({videoDetails: info?.videoDetails, formats: info?.formats.filter((el) => el.hasAudio).sort((a,b) => a.bitrate > b.bitrate)});
        })
})

app.get('/query/:ytquery/:id', async (req, res) => {
    const ytquery = req.params.ytquery;
    const id = req.params.id;
    if (!ytquery || !id) {
        return res.send('query missing!')
    }
    ytmusic[ytquery](`${id}`).then(async songs => {
        res.json(songs);
    }).catch(err => {
        console.log(err);
        res.json(err);
    });
})

app.get('/getSongList', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.send('query missing!')
    }
    console.log(query);
    axios.get(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=RDAMVM${query}&key=AIzaSyA2d0ZBNt_0IGPBgbRYDlBAWAO77a0Adkk&maxResults=5`)
    .then(async response => {
        const list = response.data.items.map((item) => {return {id: item.snippet?.resourceId?.videoId, thumbnails:item.snippet?.thumbnails} });
        return res.json(list);
        let result = [];
        for (let song of list) {
            let item = {};
            item.thumbnails = song.thumbnails;
            await ytmusic.searchSongs(`${song}`).then(async searchResult => {
                item.artist = searchResult[0].artist.name;
            }).catch(err => {
                console.log(err);
                res.json(err);
            });

            const url = `https://music.youtube.com/watch?v=${song.id}`;
            await ytdl.getInfo(`${url}`).then((info) => {
                console.log(info);
                const result = info.formats.filter((el) => el.hasAudio);
                item.url = result[0].url;
            })
            result.push(item);
        }
        res.json(result);
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
})

app.get('/getQueue', async (req, res) => {
    const query = req.query.query;
    if (!query || query == "null") {
        return res.send('query missing!')
    }
    ytmusic.searchSongs(`${query}`).then(async songs => {
        // return res.json(songs);
        console.log(songs);
        const id = songs[0]?.videoId;
        axios.get(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=RDAMVM${id}&key=AIzaSyA2d0ZBNt_0IGPBgbRYDlBAWAO77a0Adkk&maxResults=100`)
        .then(async response => {
            // return res.json(response.data);
            const list = response.data.items.map((item) => {return {id: item.snippet?.resourceId?.videoId, thumbnails:item.snippet?.thumbnails} });
            return res.json(list);});
    }).catch(err => {
        console.log(err);
        res.json(err);
    });
})

app.listen(4500, async () => {
    try {
        console.log('running at 4500');
        await ytmusic.initialize(/* Optional: Custom cookies */);
    } catch (error) {
        console.log(error);
    }
})