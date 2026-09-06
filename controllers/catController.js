const Cat = require("../models/Cat");
const User = require("../models/User");
const { getIO } = require("../utils/socket");

const DAILY_PULSE_LIMIT = 10;
const XP_PER_PULSE = 10;

// Stage calculation helper
const calculateStageAndLevel = (xp) => {
    if (xp >= 700) {
        return { stage: "majestic", level: 4, maxLevelXp: 1500 };
    } else if (xp >= 300) {
        return { stage: "adult", level: 3, maxLevelXp: 700 };
    } else if (xp >= 100) {
        return { stage: "young", level: 2, maxLevelXp: 300 };
    } else {
        return { stage: "kitten", level: 1, maxLevelXp: 100 };
    }
};

const findOrCreateCat = async (userAId, userBId) => {
    let cat = await Cat.findOne({
        users: { $all: [userAId, userBId] }
    });

    if (!cat) {
        cat = await Cat.create({
            users: [userAId, userBId],
            name: "Mochi",
            xp: 0,
            level: 1,
            stage: "kitten",
            dailyPulseCount: 0,
            lastPulseDate: new Date().toISOString().slice(0, 10),
            totalPulses: 0,
            lastReaction: "idle"
        });
    }

    return cat;
};

// GET /cat - Get the shared cat for the logged-in user and partner
const getCat = async (req, res) => {
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

        const cat = await findOrCreateCat(user._id, user.connectedUser);

        const { maxLevelXp } = calculateStageAndLevel(cat.xp);

        res.status(200).json({
            success: true,
            cat: {
                ...cat.toObject(),
                maxLevelXp,
                dailyLimit: DAILY_PULSE_LIMIT
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Award pulse XP and sync via Socket.IO
const awardPulseXP = async (senderId, receiverId) => {
    try {
        const cat = await findOrCreateCat(senderId, receiverId);
        const todayStr = new Date().toISOString().slice(0, 10);

        if (cat.lastPulseDate !== todayStr) {
            cat.dailyPulseCount = 0;
            cat.lastPulseDate = todayStr;
        }

        let xpGained = 0;
        if (cat.dailyPulseCount < DAILY_PULSE_LIMIT) {
            cat.dailyPulseCount += 1;
            cat.xp += XP_PER_PULSE;
            xpGained = XP_PER_PULSE;
        }

        cat.totalPulses += 1;
        cat.lastReaction = "pulse_joy";

        const { stage, level, maxLevelXp } = calculateStageAndLevel(cat.xp);
        cat.stage = stage;
        cat.level = level;

        await cat.save();

        // Sync real-time update to both users through Socket.IO
        try {
            const io = getIO();
            const catPayload = {
                ...cat.toObject(),
                maxLevelXp,
                dailyLimit: DAILY_PULSE_LIMIT,
                xpGained,
                dailyLimitReached: cat.dailyPulseCount >= DAILY_PULSE_LIMIT,
                reaction: "pulse_joy"
            };

            io.to(senderId.toString()).emit("cat_updated", catPayload);
            io.to(receiverId.toString()).emit("cat_updated", catPayload);
        } catch (e) {
            console.log("Socket emit cat_updated failed:", e.message);
        }

        return cat;
    } catch (error) {
        console.error("Error in awardPulseXP:", error);
        return null;
    }
};

module.exports = {
    getCat,
    awardPulseXP,
    calculateStageAndLevel
};
