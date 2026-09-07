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
    updatePushToken,
    updateNickname
} = require("../controllers/userController");

router.post("/push-token", auth, updatePushToken);
router.put("/nickname", auth, updateNickname);


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

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const userObj = user.toObject();
        if (userObj.connectedUser) {
            const partnerIdStr = userObj.connectedUser._id.toString();
            let nickname = "";
            if (user.nicknames) {
                nickname = user.nicknames.get ? user.nicknames.get(partnerIdStr) : user.nicknames[partnerIdStr];
            }
            userObj.connectedUser.nickname = nickname || "";
        }

        res.status(200).json({
            success: true,
            user: userObj
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
});


module.exports = router;