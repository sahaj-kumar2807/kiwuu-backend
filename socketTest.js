const { io } = require("socket.io-client");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTliZjBiNjA5OTYzMWQxMjk3YWU4ODgiLCJpYXQiOjE3ODg2MDU3NTAsImV4cCI6MTc4OTIxMDU1MH0.W1sqJx95rijCPRmd-YimfJ0vYliuRCW13Xh_e7zUAOQ";

const socket = io("http://localhost:5000", {
    auth: {
        token
    }
});

socket.on("connect", () => {
    console.log("Connected to Kiwuu Socket.IO!");
    console.log("Socket ID:", socket.id);
});

socket.on("pulse_received", (data) => {
    console.log("❤️ PULSE RECEIVED!");
    console.log(data);
});

socket.on("disconnect", () => {
    console.log("Disconnected from Kiwuu");
});