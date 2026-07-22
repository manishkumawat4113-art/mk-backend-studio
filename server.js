const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;


// Middleware
app.use(express.json());


// Home API
app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "🚀 MK Backend Studio is running!",
        status: "online"
    });

});


// Status API
app.get("/api/status", (req, res) => {

    res.json({
        success: true,
        backend: "MK Backend Studio",
        status: "online"
    });

});


// Start Server
app.listen(PORT, () => {

    console.log(
        `MK Backend Studio running on port ${PORT}`
    );

});
