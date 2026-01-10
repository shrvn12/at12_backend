const express = require('express');
const verifyToken = require('../middlewares/verifyToken');
const userModel = require('../models/user.model');
const userRouter = express.Router();

userRouter.get('/userInfo', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const userData = await userModel.findById(userId).lean();
        delete userData.password;
        if (!userData) {
            return res.status(404).send({msg: "User not found"});
        }
        res.json(userData);
    } catch (error) {
        console.log('Error while fetching user', error);
        res.status(500).json({msg: "Something went wrong"});
    }
})

userRouter.get('/search', verifyToken, async (req, res) => {
    const userName = req.query.userName;
    if (!userName){
        return res.status('403').json({msg: 'Invalid query'});
    }
    const user = await userModel.findOne({userName});
    return res.json(user);
})

userRouter.get('/likedSongs', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const userData = await userModel.findById(userId).lean();
        if (!userData) {
            return res.status(404).send({msg: "User not found"});
        }   
        res.json(userData.likedSongs);
    } catch (error) {
        console.log('Error while fetching liked songs', error);
        res.status(500).json({msg: "Something went wrong"});
    }
})

userRouter.post('/likeSong', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { songId } = req.body;
        if (!songId) {
            return res.status(400).json({ msg: "Song ID is required" });
        }
        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.status(404).send({msg: "User not found"});
        }
        if (userData.likedSongs.includes(songId)) {
            return res.status(400).json({ msg: "Song already liked" });
        }
        userData.likedSongs.push(songId);
        await userData.save();
        res.json({ msg: "Song liked successfully", success: true });
    } catch (error) {
        console.log('Error while liking song', error);
        res.status(500).json({msg: "Something went wrong"});
    }
});

userRouter.post('/unlikeSong', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { songId } = req.body;
        if (!songId) {
            return res.status(400).json({ msg: "Song ID is required" });
        }
        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.status(404).send({msg: "User not found"});
        }
        if (!userData.likedSongs.includes(songId)) {
            return res.status(400).json({ msg: "Song not liked" });
        }
        userData.likedSongs = userData.likedSongs.filter(id => id !== songId);
        await userData.save();
        res.json({ msg: "Song unliked successfully", success: true });
    } catch (error) {
        console.log('Error while unliking song', error);
        res.status(500).json({msg: "Something went wrong"});
    }
});

module.exports = userRouter;