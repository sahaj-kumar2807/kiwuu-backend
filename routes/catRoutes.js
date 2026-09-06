const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getCat } = require("../controllers/catController");

router.get("/", auth, getCat);

module.exports = router;
