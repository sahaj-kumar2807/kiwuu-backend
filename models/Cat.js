const mongoose = require("mongoose");

const catSchema = new mongoose.Schema(
    {
        users: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            }
        ],
        name: {
            type: String,
            default: "Mochi"
        },
        xp: {
            type: Number,
            default: 0
        },
        stage: {
            type: String,
            enum: ["kitten", "young", "adult", "majestic"],
            default: "kitten"
        },
        level: {
            type: Number,
            default: 1
        },
        dailyPulseCount: {
            type: Number,
            default: 0
        },
        lastPulseDate: {
            type: String,
            default: ""
        },
        totalPulses: {
            type: Number,
            default: 0
        },
        lastReaction: {
            type: String,
            default: "idle"
        }
    },
    {
        timestamps: true
    }
);

// Index to quickly find cat for two connected users
catSchema.index({ users: 1 });

module.exports = mongoose.model("Cat", catSchema);
