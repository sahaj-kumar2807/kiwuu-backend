const Pulse = require("../models/Pulse");
const User = require("../models/User");
const { getIO } = require("../utils/socket");
const { awardPulseXP } = require("./catController");
const { sendPushNotification } = require("../utils/pushService");

const sendPulse = async (req, res) => {
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

        const pulse = await Pulse.create({
            sender: req.userId,
            receiver: user.connectedUser
        });

        // 1. Real-time Socket.IO foreground notification
        const io = getIO();
        io.to(user.connectedUser.toString()).emit("pulse_received", {
            pulseId: pulse._id,
            senderId: req.userId,
            senderName: user.name,
            createdAt: pulse.createdAt
        });

        // 2. Award Cat XP & sync cat via Socket.IO
        await awardPulseXP(req.userId, user.connectedUser);

        // 3. Real phone background/lock-screen push notification via Expo
        const receiver = await User.findById(user.connectedUser);
        if (receiver && receiver.pushToken) {
            const notifBody = req.body?.messageText
                ? `${user.name}: "${req.body.messageText}" ❤️`
                : `${user.name} misses you ❤️`;

            sendPushNotification(
                receiver.pushToken,
                "🥝 Kiwuu",
                notifBody,
                {
                    screen: "chat",
                    senderId: req.userId.toString(),
                    pulseId: pulse._id.toString()
                }
            );
        }

        res.status(201).json({
            success: true,
            message: "Pulse sent ❤️",
            pulse
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const getPulses = async (req, res) => {
    try {

        const pulses = await Pulse.find({
            receiver: req.userId
        })
        .populate("sender", "name email")
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            pulses
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

module.exports = {
    sendPulse,
    getPulses
};