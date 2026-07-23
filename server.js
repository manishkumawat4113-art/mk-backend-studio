const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Enable CORS for OneCompiler and WebSockets
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = "mk_super_secret_key_whatsapp_2026";

// -------------------------------------------------------------
// 1. MONGODB CONNECT (YAHAN APNA MONGO DB LINK DAALEIN)
// -------------------------------------------------------------
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://manishkumawat4113_db_user:mahu4113@manish.ykx2nhi.mongodb.net/?appName=manish";

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected! MK Studio Engine Ready.'))
  .catch(err => console.log('❌ DB Connection Error:', err.message));

// -------------------------------------------------------------
// 2. MONGOOSE SCHEMAS
// -------------------------------------------------------------
// User Schema for Authentication
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  createdAt:{ type: Date, default: Date.now }
});

// Chat Schema for WhatsApp Messages
const MessageSchema = new mongoose.Schema({
  senderId:   String,
  receiverId: String,
  text:       String,
  createdAt:  { type: Date, default: Date.now }
});

// Dynamic Route Schema (No-Redeploy Feature)
const DynamicRouteSchema = new mongoose.Schema({
  endpoint:     { type: String, required: true, unique: true },
  responseData: Object
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);
const DynamicRoute = mongoose.model('DynamicRoute', DynamicRouteSchema);

// -------------------------------------------------------------
// 3. WHATSAPP AUTHENTICATION ENGINE (Signup, Login, Logout)
// -------------------------------------------------------------

// A. Signup Route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "All fields required!" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email pehle se registered hai!" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.json({ success: true, message: "Account successfully ban gaya! Ab Login karein." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// B. Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email nahi mila!" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Galat Password!" });

    // Auth Token Generate
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      message: "Login Successful!",
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// C. Logout Route
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: "Logged out successfully!" });
});

// -------------------------------------------------------------
// 4. DYNAMIC ENDPOINTS (NO REDEPLOY NEEDED)
// -------------------------------------------------------------
app.post('/studio/save-route', async (req, res) => {
  try {
    const { routeName, responseData } = req.body;
    await DynamicRoute.findOneAndUpdate(
      { endpoint: routeName },
      { responseData },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: `Route '/api/custom/${routeName}' MongoDB me active ho gaya!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.all('/api/custom/:endpoint', async (req, res) => {
  try {
    const route = await DynamicRoute.findOne({ endpoint: req.params.endpoint });
    if (route) return res.json(route.responseData);
    res.status(404).json({ error: "Route Studio me nahi mila!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve Root UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------------------------------------------------
// 5. SOCKET.IO REALTIME MESSAGING ENGINE (WhatsApp Live Chat)
// -------------------------------------------------------------
io.on('connection', (socket) => {
  console.log('⚡ User Socket Connected:', socket.id);

  // Join User's Private Room
  socket.on('join_room', (userId) => {
    socket.join(userId);
  });

  // Handle Realtime Messages
  socket.on('send_message', async (data) => {
    const { senderId, receiverId, text } = data;

    // Save Chat in MongoDB
    const newMsg = new Message({ senderId, receiverId, text });
    await newMsg.save();

    // Broadcast Message to Both Sender & Receiver Live
    io.to(receiverId).emit('receive_message', newMsg);
    io.to(senderId).emit('receive_message', newMsg);
  });

  socket.on('disconnect', () => {
    console.log('User Socket Disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 MK Backend Studio Engine running on port ${PORT}`));
                                   
