const Pulse = require("../models/Pulse");
const Message = require("../models/Message");
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

        const rawText = (req.body?.messageText && typeof req.body.messageText === "string") ? req.body.messageText.trim() : "";
        const pulseText = rawText || "__pulse__";

        // 1. Create Pulse record in MongoDB
        const pulse = await Pulse.create({
            sender: req.userId,
            receiver: user.connectedUser,
            text: rawText || null
        });

        // 2. Also record pulse as a Message in chat so it persists across restarts
        const pulseMessage = await Message.create({
            sender: req.userId,
            receiver: user.connectedUser,
            text: pulseText,
            isPulse: true
        });

        // 3. Real-time Socket.IO foreground notification
        const io = getIO();
        io.to(user.connectedUser.toString()).emit("pulse_received", {
            pulseId: pulse._id,
            senderId: req.userId,
            senderName: user.name,
            createdAt: pulse.createdAt
        });

        // Emit newMessage to receiver so it shows in chat stream immediately
        io.to(user.connectedUser.toString()).emit("newMessage", pulseMessage);

        // 4. Award Cat XP & sync cat via Socket.IO
        await awardPulseXP(req.userId, user.connectedUser);

        // 5. Immediate push notification to phone background/lockscreen via Expo/FCM
        const receiver = await User.findById(user.connectedUser);
        if (receiver && receiver.pushToken) {
            let senderDisplayName = user.name;
            if (receiver.nicknames) {
                const custom = typeof receiver.nicknames.get === "function"
                    ? receiver.nicknames.get(req.userId.toString())
                    : receiver.nicknames[req.userId.toString()];
                if (custom && custom.trim()) {
                    senderDisplayName = custom.trim();
                }
            }

            const notifBody = rawText
                ? `${senderDisplayName}: ${rawText} 💗`
                : `${senderDisplayName} sent you a pulse 💗`;

            await sendPushNotification(
                receiver.pushToken,
                "Kiwuu",
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
            pulse,
            chatMessage: pulseMessage
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