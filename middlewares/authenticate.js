const jwt = require("jsonwebtoken");
const User = require("../models/userSchema");

const Authenticate = async (req, res, next)=>{
    try {
        const authToken = req.cookies.authToken || req.headers.authorization;
        
        if (!authToken) {
          return res.status(401).json({ error: "Authentication failed" });
        }
        const token = req.cookies.authToken;
        const verifyToken = jwt.verify(token, process.env.SECRET_KEY);
        const currentUser = await User.findOne({_id:verifyToken._id, "tokens.token":token});
        if(!currentUser){
            throw new Error("User not found");
        }
        req.token= token;
        req.currentUser = currentUser;
        req.userId = currentUser._id

        next();

    } catch (error) {
        console.log(error)
    }
}

module.exports = Authenticate;
