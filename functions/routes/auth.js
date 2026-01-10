const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const userModel = require('../models/user.model');
const validateFields = require("../middlewares/validator");
const verifyPassword = require('../middlewares/verifyPassword');
const verifyToken = require('../middlewares/verifyToken');
require('dotenv').config();

const authRouter = express.Router();
const salt = process.env.salt;

authRouter.get('/', (req, res) => {
    res.send('Auth router');
})

authRouter.get('/userInfo', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const userData = await userModel.findById(userId).lean();
        delete userData.password;
        if (!userData) {
            return res.status(404).send({msg: "User not found"});
        }
        userData.success = true;
        res.json(userData);
    } catch (error) {
        console.log('Error while fetching user', error);
        res.status(500).json({msg: "Something went wrong"});
    }
})

authRouter.post('/register', validateFields(["name", "email", "password"]), async (req, res) => {
    try {
        const data = req.body;

        const email = data.email.trim().toLowerCase();

        const userExists = await userModel.findOne({
            $or: [
                { email },
            ]
        }).lean();

        if (userExists) {
            return res.status(409).json({ msg: 'User already exists' });
        }

        const payload = {
            name: data.name.trim(),
            email,
            password:  bcrypt.hashSync(data.password, +salt),
            emailVerified: false,
        };

        const user = new userModel(payload);
        await user.save();
        return res.json({ msg: 'Registration successful', success: true });
    } catch (error) {
        console.log('error while registration', error);
        res.status(500).send({ msg: 'error while registration', error });
    }
})

authRouter.post('/login', validateFields(["password"]), verifyPassword, async(req, res) => {
    try {
        const user = req.user;
        const remember = req.body.remember || false;
        delete user.password;
        
        const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.clearCookie('token');
        
        // FIXED: Cookie settings for cross-origin requests
        const cookieOptions = {
            httpOnly: true,
            secure: false, // For http://localhost
            sameSite: 'None', // Use 'lax' for http, 'none' requires https
            path: '/'
        };
        
        if (remember) {
            cookieOptions.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        }
        
        // For production, use these settings:
        // secure: process.env.NODE_ENV === 'production', // true for https
        // sameSite: 'none' (still needed for cross-origin)

        res.cookie('token', token, cookieOptions);
        res.status(200).send({msg: 'login successful', success: true, ...user});
    } catch (error) {
        console.log('error while login', error);
        res.status(500).json({msg: "error while login", error});
    }
})

authRouter.post('/logout', (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: false, // For http://localhost
            sameSite: 'None', // Use 'lax' for http, 'none' requires https
        });
        res.status(200).send({msg: 'logout successful', success: true});
    } catch (error) {
        console.log('error while logout', error);
        res.status(500).json({msg: "error while logout", error});
    }
})

// POST /auth/send-verification-email
authRouter.post('/send-verification-email', async (req, res) => {
  try {
    const { email } = req.body;
    console.log(req.body);
    if (!email) {
        console.log('Email or name not provided');
      return res.status(400).json({ message: 'Email and name are required' });
    }

    // 1️⃣ Check if user exists
    const user = await userModel.findOne({ email });
    if (!user) {
        console.log('User not found for email:', email);
        return res.status(404).json({ message: 'User not found' });
    }

    // 2️⃣ Check if already verified
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // 3️⃣ Check token validity
    let token = user.verificationToken;
    let tokenExpired = !user.verificationTokenExpiry || user.verificationTokenExpiry < Date.now();

    if (!token || tokenExpired) {
      token = crypto.randomBytes(32).toString('hex');
      user.verificationToken = token;
      user.verificationTokenExpiry = Date.now() + 3600000; // 1 hour
      await user.save();
    }

    // 4️⃣ Create a transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or use a service like SendGrid / Mailgun
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // 5️⃣ Build the email
    const verifyLink = `http://127.0.0.1:5001/at12-da517/us-central1/api/auth/verify-email?token=${token}`;

    const html = await new Promise((resolve, reject) => {
        res.render(
        "emails/verifyEmail",
        { name:user.name, verifyLink },
        (err, renderedHtml) => {
            if (err) reject(err);
            else resolve(renderedHtml);
        }
        );
    });

    const mailOptions = {
      from: `"At12" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: 'Verify Your Email Address',
      html
    };

    // 6️⃣ Send email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: 'Verification email sent successfully',
      success: true,
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
});

authRouter.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.render('verification/failed');
            // return res.status(400).json({ msg: 'Invalid request' });
        }
        console.log('Verification token:', token);
        const user = await userModel.findOne({
            verificationToken: token,
            verificationTokenExpiry: { $gt: Date.now() }
        });
        if (!user) {
            return res.render('verification/failed');
            // return res.status(400).json({ msg: 'Invalid request' });
        }
        user.emailVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiry = undefined;
        await user.save();
        res.render('verification/success');
        // res.json({ msg: 'Email verified successfully', success: true });
    } catch (error) {
        console.log('Error verifying email', error);
        res.render('verification/failed');
        // res.status(500).json({ msg: 'Error verifying email' });
    }
});


module.exports = authRouter;