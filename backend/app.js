const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const dotenv=require('dotenv');
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(bodyParser.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI).then(()=>{console.log("MongoDB connected")}).catch((e)=>{console.log(e)});

// User schema
const userSchema = new mongoose.Schema({
  name: String,
  points: { type: Number, default: 0 },
  history: [
    {
      pointsAwarded: Number,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const User = mongoose.model("User", userSchema);

// Claim points route
app.post("/claim", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "UserId is required" });

  try {
    const randomPoints = Math.floor(Math.random() * 10) + 1; // Generate random points between 1 and 10
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { points: randomPoints } },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    // Fetch updated rankings
    const rankings = await User.find({})
      .sort({ points: -1 })
      .select("name points");

    // Emit real-time update
    io.emit("updateRankings", rankings);

    res.json({ message: "Points claimed successfully", user, rankings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get rankings route, initially when the frontend loads we can use this route to get rankings
app.get("/rankings", async (req, res) => {
  try {
    const rankings = await User.find({}).sort({ points: -1 }).select("name points");
    res.json(rankings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/history/:userId", async (req, res) => {
    const { userId } = req.params;
  
    try {
      const user = await User.findById(userId).select("name history");
  
      if (!user) return res.status(404).json({ error: "User not found" });
  
      res.json({ name: user.name, history: user.history });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});
