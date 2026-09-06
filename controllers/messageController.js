const Message = require("../models/Message");
const User = require("../models/User");
const { getIO } = require("../utils/socket");


// SEND MESSAGE
const sendMessage = async (req, res) => {
    try {

        const { receiverId, text } = req.body;

        if (!receiverId || !text) {
            return res.status(400).json({
                success: false,
                message: "Receiver and message are required"
            });
        }

        // Find logged-in user
        const sender = await User.findById(req.userId);

        if (!sender) {
            return res.status(404).json({
                success: false,
                message: "Sender not found"
            });
        }

        // Find receiver
        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "Receiver not found"
            });
        }

        // Make sure they are connected
        if (
            !sender.connectedUser ||
            sender.connectedUser.toString() !== receiverId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "You can only message your connected user"
            });
        }

        // Create message
        const message = await Message.create({
            sender: req.userId,
            receiver: receiverId,
            text
        });

        // 🔥 SEND REAL-TIME MESSAGE
        const io = getIO();

        io.to(receiverId.toString()).emit("newMessage", message);

        // Send response back to sender
        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: message
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// GET CHAT
const getMessages = async (req, res) => {
    try {

        const { userId } = req.params;

        const messages = await Message.find({
            $or: [
                {
                    sender: req.userId,
                    receiver: userId
                },
                {
                    sender: userId,
                    receiver: req.userId
                }
            ]
        })
        .sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            messages
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


module.exports = {
    sendMessage,
    getMessages
};