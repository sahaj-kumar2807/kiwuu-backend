require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const express = require("express");
const { setIO } = require("./utils/socket");
const pulseRoutes = require("./routes/pulseRoutes");
const app = express();
const testRoutes = require("./routes/testRoutes");
const logger = require("./middleware/logger");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const messageRoutes = require("./routes/messageRoutes");
const catRoutes = require("./routes/catRoutes");

const PORT = 5000;
app.use(cors());
app.use(express.json());
app.use(logger);
app.use("/messages", messageRoutes);
app.use("/pulse", pulseRoutes);
app.use("/cat", catRoutes);
app.use("/test", testRoutes);
app.use("/users", userRoutes);
app.get("/", (req, res) => {
    res.send("kiwuu backend is alive ❤️");
});

app.get("/hello", (req, res) => {
    res.send("Hello from kiwuu!");
});
connectDB();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});
setIO(io);

io.on("connection", (socket) => {

    try {

        const token = socket.handshake.auth.token;

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        socket.userId = decoded.userId;

        socket.join(socket.userId.toString());

        console.log("User connected:", socket.userId);
        console.log("Socket ID:", socket.id);

    } catch (error) {

        console.log("Socket authentication failed");

        socket.disconnect();

        return;
    }

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.userId);
    });

});

server.listen(PORT, () => {
    console.log(`kiwuu server running on port ${PORT}`);
});
