const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

const {
    createUser,
    getUsers,
    loginUser,
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    getConnectionRequests,
    disconnectUser,
    updatePushToken
} = require("../controllers/userController");

router.post("/push-token", auth, updatePushToken);


router.post("/register", createUser);

router.post("/login", loginUser);

router.post("/connect", auth, sendConnectionRequest);

router.get("/connection-requests", auth, getConnectionRequests);

router.post(
    "/connection-requests/:userId/accept",
    auth,
    acceptConnectionRequest
);

router.post(
    "/connection-requests/:userId/reject",
    auth,
    rejectConnectionRequest
);

router.post("/disconnect", auth, disconnectUser);
router.get("/", getUsers);


router.get("/me", auth, async (req, res) => {
    try {

        const user = await User
            .findById(req.userId)
            .select("-password")
            .populate("connectedUser", "-password")
            .populate("connectionRequests", "-password");

        res.status(200).json({
            success: true,
            user
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
});


module.exports = router;