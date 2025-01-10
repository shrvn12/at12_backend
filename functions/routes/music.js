const { default: axios } = require('axios');
var express = require('express');
require('dotenv').config();
var router = express.Router();
const YTMusic = require('ytmusic-api');

const ytmusic = new YTMusic()
/* GET users listing. */
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
    // Initialize ytmusic library
    await ytmusic.initialize();

    const query = req.query.query;

    // Validate the query parameter
    if (!query || query === "null") {
      return res.status(400).send('Query missing or invalid!');
    }

    // Search for songs using the provided query
    const songs = await ytmusic.searchSongs(query);

    // Return the search results as JSON
    return res.json(songs);
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

router.get('/getInfo', async (req, res) => {
  const { id: videoId } = req.query;

  // Validate the video ID parameter
  if (!videoId) {
    return res.status(400).send('Video ID is required.');
  }

  try {
    console.log('Fetching video details...');
    // Fetch video information from the YouTube API
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${process.env.KEY}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    // Check if the response contains video data
    if (!data.items || data.items.length === 0) {
      return res.status(404).send('Video not found.');
    }

    // Extract basic video details
    const videoDetails = data.items[0];
    const videoInfo = {
      id: videoId,
      title: videoDetails.snippet?.title,
      stats: videoDetails.statistics,
      artist: videoDetails.snippet?.channelTitle, // Placeholder for artist details
      lyrics: null, // Placeholder for lyrics
    };

    console.log('Fetching additional details for artist and lyrics...');
    // Fetch artist and lyrics details asynchronously
    const [songDetails, lyricsDetails] = await Promise.all([
      ytmusic.getSong(videoId),
      ytmusic.getLyrics(videoId),
    ]);

    // Update videoInfo with fetched details
    videoInfo.artist = songDetails.artist || videoInfo.artist;
    videoInfo.lyrics = lyricsDetails || 'Lyrics not found';

    return res.json(videoInfo);
  } catch (err) {
    console.error('Error fetching video info:', err);
    return res.status(500).json({
      error: 'An error occurred while fetching video info.',
      details: err.message,
    });
  }
});


module.exports = router;
