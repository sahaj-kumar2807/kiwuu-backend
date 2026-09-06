const { io } = require("socket.io-client");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTliZjBjNTA5OTYzMWQxMjk3YWU4ODkiLCJpYXQiOjE3ODg2MDYxNzQsImV4cCI6MTc4OTIxMDk3NH0.ZtNuuYvj0a4X5U9rrbD-ANwOnsZZ9cqzBU1WBbWiViE";

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