const jwt = require("jsonwebtoken");
const Admin = require("../models/adminModel");
require("dotenv").config();

const adminAuth = async (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        return res.status(401).send({ error: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res
                .status(403)
                .send({ error: "Access denied. Admin privileges required." });
        }

        req.user = admin;
        next();
    } catch (error) {
        res.status(400).send({ error: "Invalid token." });
        console.error(error);
    }
};

const verifyAdmin = async (req, res) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        return res.status(401).send({ error: "Access denied. No token provided.", success: false });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res
                .status(403)
                .send({ error: "Access denied. Admin privileges required.", success: false });
        }
        return res.status(200).send({ success: true });
    } catch (error) {
        res.status(400).send({ error: "Invalid token.", success: false });
        console.error(error);
    }
};

module.exports = { adminAuth, verifyAdmin };
