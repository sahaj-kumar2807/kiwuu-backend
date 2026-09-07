const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { getIO } = require("../utils/socket");

const createUser = async (req, res) => {

    try {

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        const userResponse = user.toObject();

        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: userResponse
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};



const getUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");

        res.status(200).json({
            success: true,
            users
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const loginUser = async (req, res) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }
        

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const userResponse = user.toObject();

        delete userResponse.password;

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: userResponse
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const sendConnectionRequest = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const receiver = await User.findOne({ email });

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (receiver._id.toString() === req.userId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot connect with yourself"
            });
        }

        const sender = await User.findById(req.userId);

        if (!sender) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Already connected
        if (
            sender.connectedUser &&
            sender.connectedUser.toString() === receiver._id.toString()
        ) {
            return res.status(400).json({
                success: false,
                message: "You are already connected"
            });
        }

        // Request already sent
        if (
            receiver.connectionRequests.some(
                id => id.toString() === req.userId.toString()
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Connection request already sent"
            });
        }

        // Add sender to receiver's requests
        receiver.connectionRequests.push(req.userId);

        await receiver.save();

        // 🔔 Notify receiver in real-time that they have a new request
        try {
            const io = getIO();
            io.to(receiver._id.toString()).emit('connection_request_received', {
                requesterId: sender._id,
                requesterName: sender.name,
                requesterEmail: sender.email,
            });
        } catch (e) { /* socket not init yet, ignore */ }

        res.status(200).json({
            success: true,
            message: "Connection request sent successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const acceptConnectionRequest = async (req, res) => {
    try {

        const requesterId = req.params.userId;

        const user = await User.findById(req.userId);

        const requester = await User.findById(requesterId);

        if (!user || !requester) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if request exists
        const requestExists = user.connectionRequests.some(
            id => id.toString() === requesterId.toString()
        );

        if (!requestExists) {
            return res.status(400).json({
                success: false,
                message: "Connection request not found"
            });
        }

        // Connect both users
        user.connectedUser = requester._id;
        requester.connectedUser = user._id;

        // Remove request
        user.connectionRequests = user.connectionRequests.filter(
            id => id.toString() !== requesterId.toString()
        );

        await user.save();
        await requester.save();

        // 🔔 Notify BOTH users in real-time that they are now connected
        try {
            const io = getIO();
            const userPayload = {
                _id: user._id,
                name: user.name,
                email: user.email,
            };
            const requesterPayload = {
                _id: requester._id,
                name: requester.name,
                email: requester.email,
            };
            // Tell the requester (the one who sent the original request) they are now connected
            io.to(requester._id.toString()).emit('connection_accepted', {
                connectedUser: userPayload,
            });
            // Also confirm to the acceptor
            io.to(user._id.toString()).emit('connection_accepted', {
                connectedUser: requesterPayload,
            });
        } catch (e) { /* socket not init yet, ignore */ }

        res.status(200).json({
            success: true,
            message: "Connection request accepted"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const rejectConnectionRequest = async (req, res) => {
    try {

        const requesterId = req.params.userId;

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.connectionRequests = user.connectionRequests.filter(
            id => id.toString() !== requesterId.toString()
        );

        await user.save();

        // 🔔 Notify the requester their request was rejected
        try {
            const io = getIO();
            io.to(requesterId.toString()).emit('connection_rejected', {
                rejectedBy: req.userId,
            });
        } catch (e) { /* ignore */ }

        res.status(200).json({
            success: true,
            message: "Connection request rejected"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const disconnectUser = async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (!user.connectedUser) {
            return res.status(400).json({
                success: false,
                message: "You are not connected to anyone"
            });
        }

        const connectedUserId = user.connectedUser;

        const connectedUser = await User.findById(
            connectedUserId
        );

        if (connectedUser) {
            connectedUser.connectedUser = null;
            await connectedUser.save();
        }

        user.connectedUser = null;
        await user.save();

        // 🔔 Notify both parties of disconnection in real-time
        try {
            const io = getIO();
            io.to(connectedUserId.toString()).emit('partner_disconnected', {});
            io.to(req.userId.toString()).emit('partner_disconnected', {});
        } catch (e) { /* ignore */ }

        res.status(200).json({
            success: true,
            message: "Disconnected successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getConnectionRequests = async (req, res) => {
    try {

        const user = await User.findById(req.userId)
            .select("connectionRequests")
            .populate("connectionRequests", "-password");

        res.status(200).json({
            success: true,
            requests: user.connectionRequests
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const updatePushToken = async (req, res) => {
    try {
        const { pushToken } = req.body;

        if (!pushToken) {
            return res.status(400).json({
                success: false,
                message: "Push token is required"
            });
        }

        await User.findByIdAndUpdate(req.userId, { pushToken });

        res.status(200).json({
            success: true,
            message: "Push token updated successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updateNickname = async (req, res) => {
    try {
        const { nickname } = req.body;

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (!user.connectedUser) {
            return res.status(400).json({
                success: false,
                message: "You are not connected to anyone"
            });
        }

        if (!user.nicknames) {
            user.nicknames = new Map();
        }

        const partnerIdStr = user.connectedUser.toString();
        if (nickname && nickname.trim()) {
            user.nicknames.set(partnerIdStr, nickname.trim());
        } else {
            user.nicknames.delete(partnerIdStr);
        }

        user.markModified("nicknames");
        await user.save();

        res.status(200).json({
            success: true,
            message: "Nickname updated successfully",
            nickname: nickname ? nickname.trim() : ""
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createUser,
    getUsers,
    loginUser,
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    getConnectionRequests,
    disconnectUser,
    updatePushToken,
    updateNickname
};