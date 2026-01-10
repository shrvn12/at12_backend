const mongoose = require('mongoose');

const userSchema = {
    name: String,
    email: String,
    password: String,
    emailVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationTokenExpiry: Date,
    likedSongs: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}

const userModel = mongoose.model('user', userSchema);

module.exports = userModel;