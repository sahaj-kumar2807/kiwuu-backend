const express = require("express");
const auth = require("../middleware/auth");

const {
    sendMessage,
    getMessages
} = require("../controllers/messageController");

const router = express.Router();


// Send a message
router.post("/", auth, sendMessage);


// Get conversation
router.get("/:userId", auth, getMessages);


module.exports = router;