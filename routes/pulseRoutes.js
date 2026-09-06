const express = require("express");

const router = express.Router();

const {
    sendPulse,
    getPulses
} = require("../controllers/pulseController");
const auth = require("../middleware/auth");

router.post("/", auth, sendPulse);
router.post("/send", auth, sendPulse);
router.get("/", auth, getPulses);

module.exports = router;