const { default: axios } = require('axios');
var express = require('express');
require('dotenv').config();
var router = express.Router();
const YTMusic = require('ytmusic-api');
const ytm = require('ytmusic_api_unofficial')

const ytmusic = new YTMusic()

function parseYouTubeDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  const hours = parseInt(match?.[1]) || 0;
  const minutes = parseInt(match?.[2]) || 0;
  const seconds = parseInt(match?.[3]) || 0;

  return hours * 3600 + minutes * 60 + seconds;
}


router.get('/', function(req, res, next) {
  res.render('index', { title: 'AT12' });
});

router.get('/search', async (req, res) => {
  try {
    // Initialize ytmusic library
    await ytmusic.initialize();

    const query = req.query.query;

    // Validate the query parameter
    if (!query || query === "null") {
      return res.status(400).send('Query missing or invalid!');
    }

    // Get search suggestions using ytmusic
    const result = await ytmusic.getSearchSuggestions(query);

    // Send the result as JSON response
    return res.json(result);
  } catch (err) {
    // Log the error and send a 500 status response
    console.error('Error during search:', err);
    return res.status(500).json({ error: 'An error occurred while processing the request.', details: err.message });
  }
});

router.get('/searchSong', async (req, res) => {
  try {
    // initialize ytmusic library
    await ytmusic.initialize();

    const query = req.query.query;
    const maxResults = parseInt(req.query.maxResults) || 5;

    // Validate the query parameter
    if (!query || query === "null") {
      return res.status(400).send('Query missing or invalid!');
    }

    // Search for songs using the provided query
    // const songs = await ytmusic.searchSongs(query);
    const songs = await ytm.search(query, 'song');
    const videos = await ytm.search(query, 'video');

    const response = {
      songs: songs.content?.slice(0, maxResults),
      videos: videos.content?.sort((a,b) => a.searchRanking - b.searchRanking).slice(0, maxResults)
    }

    response.songs.map((item) => {
      item.videoId = item.id;
      item.name = item.title;
    });
    response.videos.map((item) => {
      item.videoId = item.id;
      item.name = item.title;
    });

    // Return the search results as JSON
    return res.json(response);
  } catch (err) {
    // Log the error and send a 500 status response
    console.error('Error during song search:', err);
    return res.status(500).json({ error: 'An error occurred while processing the request.', details: err.message });
  }
});

router.get('/getQueue', async (req, res) => {
  try {
    console.log('Initializing ytmusic...');
    await ytmusic.initialize();

    const { query, videoId: providedVideoId } = req.query;
    let videoId = providedVideoId; // Allow reassignment

    console.log('Received query:', query);
    console.log('Received videoId:', videoId);

    // Validate input
    if ((!query || query === "null") && !videoId) {
      return res.status(400).send('Query/videoId missing or invalid!');
    }

    // Fetch videoId if not provided
    if (!videoId) {
      console.log('Fetching videoId using query...');
      const songs = await ytmusic.searchSongs(query);

      videoId = songs[0]?.videoId; // Use the first result's videoId
      if (!videoId) {
        return res.status(404).send('No video found for the given query.');
      }
    }

    // Fetch playlist items
    const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=RDAMVM${videoId}&key=${process.env.KEY}&maxResults=50`;
    console.log('Fetching playlist from URL:', apiUrl);

    const response = await axios.get(apiUrl);
    const items = response.data.items;

    if (!items || items.length === 0) {
      return res.status(404).send('No playlist items found.');
    }

    // Map playlist items to a structured format
    const list = items.map(item => ({
      id: item.snippet?.resourceId?.videoId,
      thumbnails: item.snippet?.thumbnails,
      title: item.snippet?.title,
      artist: { name: item.snippet?.videoOwnerChannelTitle }, // Placeholder for artist
      channel: item.snippet?.videoOwnerChannelTitle
    }));

    return res.json(list);
  } catch (err) {
    console.error('Error fetching queue:', err);
    return res.status(500).json({
      error: 'An error occurred while processing the request.',
      details: err.message,
    });
  }
});

function cleanTitle(rawTitle) {
  // Step 1: Remove unwanted keywords
  const unwantedWords = ["full video", "lyrical", "full audio", "full song", "full album", "full movie", "full", "official video", "official audio", "official song", "official music video", "official full video", "official full song", "official full album", "official full movie", "audio", "song", "album", "movie", "music video", "music", "video", "lyrics", "lyric", "official", "full song audio", "full song video", "full song music video", "full song lyrics", "full song lyric", "full album audio", "full album video", "full album music video", "full album lyrics", "full album lyric"];
  let cleaned = rawTitle;

  unwantedWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });

  // Step 2: Remove leading special characters
  cleaned = cleaned.replace(/^[^a-zA-Z0-9]+/, '');

  // Step 3: Take text before "|" or "-" (whichever comes first)
  const splitByPipe = cleaned.split('|')[0];
  const splitByDash = splitByPipe.split('-')[0];

  // Step 4: Final cleanup
  return splitByDash.trim().replace(/\s{2,}/g, ' ');
}

function parseLyrics(lyricsText) {
  const result = [];
  if (!lyricsText || typeof lyricsText !== 'string') {
    return null;
  }
  const lines = lyricsText.split(/\r?\n/); // Support \n and \r\n

  for (const line of lines) {
    // Try correct format first: [mm:ss.ms] or [mm:ss.mss]
    let match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/);
    if (match) {
      const [, min, sec, ms, text] = match;
      const time = parseInt(min) * 60 + parseInt(sec) + parseInt(ms) / 1000;
      result.push({ time, text: text.trim() });
      continue;
    }

    // Fallback for malformed timestamps like [00:1555]
    match = line.match(/^\[(\d{2}):(\d{3,5})\](.*)$/);
    if (match) {
      const [, min, combined, text] = match;
      // Assume last 2–3 digits are milliseconds, rest are seconds
      const msLength = combined.length > 4 ? 3 : 2;
      const ms = parseInt(combined.slice(-msLength).padEnd(3, '0')); // Normalize to milliseconds
      const sec = parseInt(combined.slice(0, -msLength));
      const time = parseInt(min) * 60 + sec + ms / 1000;
      result.push({ time, text: text.trim() });
    }
  }

  return result;
}

router.get('/trackInfo/:id', async (req, res) => {
  const { id: videoId } = req.params;
  if (!videoId) {
    return res.status(400).send('Video ID is required.');
  }
  console.log('Fetching track info for video ID:', videoId);
  try {
    const details = await ytm.get(videoId);
    res.json(details);
  } catch (error) {
    console.error('Error fetching track info:', error);
    return res.status(500).json({
      error: 'An error occurred while fetching track info.',
      details: error.message,
    });
  }
});

router.get('/getInfo', async (req, res) => {
  const { id: videoId } = req.query;
  await ytmusic.initialize();

  if (!videoId) {
    return res.status(400).send('Video ID is required.');
  }

  try {
    console.log('Fetching video details...');
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${process.env.KEY}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    const additionalDetails = await ytm.get(videoId);

    if (!data.items || data.items.length === 0) {
      return res.status(404).send('Video not found.');
    }

    const videoDetails = data.items[0];
    const rawTitle = videoDetails.snippet?.title || '';
    const cleanedTitle = cleanTitle(rawTitle);
    console.log('Cleaned title:', cleanedTitle);
    const durationISO = videoDetails.contentDetails?.duration;
    const duration = parseYouTubeDuration(durationISO);

    const videoInfo = {
      id: videoId,
      isAudioOnly: additionalDetails?.isAudioOnly || false,
      resultType: additionalDetails?.resultType || null,
      title: rawTitle,
      album: additionalDetails?.album || null,
      stats: videoDetails.statistics,
      artist: additionalDetails.artists || null,
      channelTitle: videoDetails.snippet?.channelTitle,
      thumbnails: videoDetails.snippet?.thumbnails,
      channelId: videoDetails.snippet?.channelId,
      description: videoDetails.snippet?.description,
      publishedAt: videoDetails.snippet?.publishedAt,
      categoryId: videoDetails.snippet?.categoryId,
      duration,
      lyrics: null,
    };

    let lyricsData = [];

    // First attempt: q=<cleanedTitle>
    const primaryRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanedTitle)}+${videoInfo.artist[0].name || ''}`);
    if (primaryRes.ok) {
      lyricsData = await primaryRes.json();
      console.log('Primary lyrics fetch successful:', lyricsData.length, 'results found');
    }
    console.log(duration);
    // Filter by duration
    let filteredByDuration = lyricsData.filter(song => {
      return song.duration && Math.abs(Math.round(song.duration) - duration) <= 2;
    });

    // If nothing matches, try with track_name param
    if (filteredByDuration.length === 0) {
      console.log('No matches with q param, retrying with track_name...');
      const fallbackRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanedTitle)}`);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        filteredByDuration = fallbackData.filter(song => {
          return song.duration && Math.abs(Math.round(song.duration) - duration) <= 2;
        });
      } else {
        console.warn('Fallback request failed:', fallbackRes.status);
      }
    }

    // Select lyrics if any match is found
    const withSynced = filteredByDuration.find(song => song.syncedLyrics);

    videoInfo.lyrics = parseLyrics(withSynced?.syncedLyrics)

    return res.json(videoInfo);
  } catch (err) {
    console.error('Error fetching video info:', err);
    return res.status(500).json({
      error: 'An error occurred while fetching video info.',
      details: err.message,
    });
  }
});

router.get('/lyrics', async (req, res) => {
  const query = req.query.q || "";
  const duration = parseInt(req.query.duration);

  if (!query.length) {
    return res.status(400).send('Query is missing');
  }

  if (isNaN(duration)) {
    return res.status(400).send('Duration (in seconds) is required and must be a number');
  }

  try {
    const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch lyrics');
    }

    const data = await response.json();
    const durationFiltered = data.filter(song => {
      const songDuration = Math.round(song.duration); // in seconds
      return Math.abs(songDuration - duration) <= 3;
    });

    const synced = durationFiltered.find(song => song.syncedLyrics);
    const plain = durationFiltered.find(song => song.plainLyrics);
    return res.json(synced || plain || { message: 'No lyrics found matching criteria' });

  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal server error');
  }
});

router.get('/artist', async (req, res) => {
  const ids = req.query.id;

  // Validate input
  if (!ids || (Array.isArray(ids) && ids.length === 0)) {
    return res.status(400).send('Artist ID(s) are missing');
  }

  const idArray = Array.isArray(ids) ? ids : [ids];
  const results = [];

  try {
    await ytmusic.initialize();
  } catch (err) {
    console.error('[ytmusic.initialize] Failed:', err.message);
  }
  console.log(idArray);
  for (const id of idArray) {
    let artist = null;
    let channelInfo = null;
    let additionalInfo = null;

    try {
      artist = await ytmusic.getArtist(id);
      console.log(`[ytmusic] Artist data fetched for ${id}`);
    } catch (err) {
      console.error(`[ytmusic] Failed for ${id}:`, err.message);
    }

    try {
      const ytRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'snippet,statistics,brandingSettings',
          id: id,
          key: process.env.KEY
        }
      });
      channelInfo = ytRes.data?.items?.[0] || null;
      console.log(`[YouTube API] Channel info fetched for ${id}`);
    } catch (err) {
      console.error(`[YouTube API] Failed for ${id}:`, err.message);
    }

    try {
      additionalInfo = await ytm.get(id);
      console.log(`[ytm] Additional info fetched for ${id}`);
    } catch (err) {
      console.error(`[ytm] Failed for ${id}:`, err.message);
    }

    if (!artist && !channelInfo && !additionalInfo) {
      results.push({ id, error: 'All data sources failed' });
    } else {
      results.push({
        id,
        ...artist,
        channelInfo,
        additionalInfo
      });
    }
  }

  return res.json(results);
});

router.get('/artistInfo/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).send('Artist ID is missing');
  }
  try {
    const response = await ytm.get(id);
    if (!response) {
      return res.status(404).send('Artist not found');
    }
    return res.json(response);
  } catch (error) {
    console.error('Error fetching artist info:', error);
    return res.status(500).json({
      error: 'An error occurred while processing the request.',
      details: error.message
    });
  }
})

router.get('/search/artist', async (req, res) => {
  const query = req.query.q || '';
  if (!query.length) {
    return res.status(400).send('Query is missing');
  }

  try {
    const result = await ytm.search(query, 'artist');
    // let response = [];

    const response = [];
    for (let item of result.content) {
      if (!item.artists) {
        response.push(ytm.get(item.id));
      } else {
        for (const artist of item.artists) {
          response.push(ytm.get(artist.id));
        }
      }
    }
    const resolvedResponse = await Promise.all(response);
    if (resolvedResponse.length === 0) {
      return res.status(404).send('No artists found for the given query');
    }
    return res.json(resolvedResponse);
  } catch (error) {
    console.log('artist search request query', req.query.q);
    console.error('Error during artist search:', error);
    return res.status(500).json({ error: 'An error occurred while processing the request.', details: error.message });
    
  }
})

router.get('/playlist/:id', async (req, res) =>{
  let id = req.params.id;
  if (id.substring(0,2) == 'VL'){
    id = id.substring(2);
  }
  if(!id) {
    return res.status(400).send('Playlist ID is missing');
  }
  try {
    const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&key=${process.env.KEY}&maxResults=50`;

    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${id}&key=${process.env.KEY}`

    const items = await axios.get(playlistItemsUrl);
    const metaData = await axios.get(playlistUrl);
    const response = {
      items: items.data,
      metaData: metaData.data
    }
    return res.json(response);
  } catch (error) {
    console.error('Error during playlist retrieval:', error);
    return res.status(500).json({ error: 'An error occurred while processing the request.', details: error.message });
  }
})

router.get('/search/playlist', async(req, res) => {
  const query = req.query.q;
  try {
    await ytmusic.initialize();
    const result = await ytmusic.searchPlaylists(query);
    res.json(result);
  } catch (error) {
    console.error('Error during playlist search:', error);
    return res.status(500).json({ error: 'An error occurred while processing the request.', details: error.message });
  }
})

module.exports = router;
