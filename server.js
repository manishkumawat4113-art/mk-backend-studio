const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test Route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "MK Backend Studio Server is Running 🚀"
    });
});

// API Status
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        backend: "MK Backend Studio",
        status: "online"
    });
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `🚀 MK Backend Server running on port ${PORT}`
    );
});
