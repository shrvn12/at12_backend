const userModel = require("../models/user.model");
const bcrypt = require("bcrypt");

const verifyPassword = async (req, res, next) => {
    const data = req.body;
    if (!data.email){
        return res.status(403).json({msg: 'Invalid input'});
    }
    const user = await userModel.findOne({email: data.email}).lean();

    if (!user){
        return res.status(404).json({msg:'Account does not exist'});
    }

    req.user = user;

    return bcrypt.compare(data.password, user.password, (err, result) => {
        if (err){
            return res.status(500).json({msg: "Something went wrong"});
        }
        if (result){
            return next();
        } else {
            return res.status(401).json({msg: "password do not match"});
        }
    })
}

module.exports = verifyPassword