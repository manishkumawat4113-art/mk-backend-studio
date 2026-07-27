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

// -------------------------------------------------------------
// CORS & SOCKET.IO CONFIGURATION (FIXED FOR RENDER & COMPILERS)
// -------------------------------------------------------------
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io Server Setup with Extended CORS & Transports
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  },
  transports: ['polling', 'websocket'], // Both polling and websocket allowed
  pingTimeout: 60000,
  pingInterval: 25000
});

const JWT_SECRET = process.env.JWT_SECRET || "mk_super_secret_key_whatsapp_2026";

// -------------------------------------------------------------
// 1. MONGODB CONNECT
// -------------------------------------------------------------
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://manishkumawat4113_db_user:mahu4113@manish.ykx2nhi.mongodb.net/?appName=manish";

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected! MK Studio Engine Ready.'))
  .catch(err => console.log('❌ DB Connection Error:', err.message));

// -------------------------------------------------------------
// 2. MONGOOSE SCHEMAS
// -------------------------------------------------------------
const UserSchema = new mongoose.Schema({
  username:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },const
  isOnline:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

 const MessageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true
  },

  receiverId: {
    type: String,
    required: true
  },

  text: {
    type: String,
    required: true
  },

  edited: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

  // Reply message information
  replyTo: {
    messageId: {
      type: String,
      default: null
    },

    senderId: {
      type: String,
      default: null
    },

    text: {
      type: String,
      default: null
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const DynamicRouteSchema = new mongoose.Schema({
  endpoint:     { type: String, required: true, unique: true },
  responseData: Object
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);
const DynamicRoute = mongoose.model('DynamicRoute', DynamicRouteSchema);

// -------------------------------------------------------------
// 3. AUTHENTICATION ROUTES (Signup, Login, Logout)
// -------------------------------------------------------------

// A. Signup Route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: "All fields are required!" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email pehle se registered hai!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.json({ success: true, message: "Account successfully ban gaya! Ab Login karein." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// B. Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required!" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, error: "Email nahi mila!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Galat Password!" });
    }

    // Token Generation
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      message: "Login Successful!",
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// C. Logout Route
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: "Logged out successfully!" });
});

// -------------------------------------------------------------
// 4. DYNAMIC ROUTE ENGINE
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
    res.status(500).json({ success: false, error: err.message });
  }
});

app.all('/api/custom/:endpoint', async (req, res) => {
  try {
    const route = await DynamicRoute.findOne({ endpoint: req.params.endpoint });
    if (route) return res.json(route.responseData);
    res.status(404).json({ success: false, error: "Route Studio me nahi mila!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve Root UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------------------------------------------------
// 5. REALTIME SOCKET.IO ENGINE
// -------------------------------------------------------------
io.on('connection', (socket) => {
  console.log('⚡ User Connected to Socket:', socket.id);

  // Join Personal Room
  socket.on('join_room', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`👤 User ${userId} Joined Room`);
    }
  });

  // Realtime Messaging
socket.on('send_message', async (data) => {

  try {

    const {
      senderId,
      receiverId,
      text,
      replyTo
    } = data;


    // Required fields check
    if (
      !senderId ||
      !receiverId ||
      !text
    ) {
      return;
    }


    // Save Message to MongoDB
    const newMsg = new Message({

      senderId: senderId,

      receiverId: receiverId,

      text: text,

      // Reply information
      replyTo: replyTo || null

    });


    await newMsg.save();


    // Send message to receiver
    io.to(receiverId).emit(
      'receive_message',
      newMsg
    );


    // Send message to sender
    io.to(senderId).emit(
      'receive_message',
      newMsg
    );


  } catch (err) {

    console.error(
      '❌ Socket Message Error:',
      err.message
    );

  }

});
  socket.on('disconnect', () => {
    console.log('❌ User Disconnected:', socket.id);
  });
});

// =============================================================
// 6. JWT AUTH MIDDLEWARE
// =============================================================

function verifyToken(req, res, next) {

  try {

    // Frontend se Authorization header lena
    const authHeader = req.headers.authorization;

    // Agar token nahi mila
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "Authorization token missing"
      });
    }

    // "Bearer TOKEN" me se TOKEN nikalna
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Invalid authorization format"
      });
    }

    // JWT token verify karna
    const decoded = jwt.verify(token, JWT_SECRET);

    // User ID request me save karna
    req.userId = decoded.id;

    // Next route par jana
    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      error: "Invalid or expired token"
    });

  }

}


// =============================================================
// 7. CURRENT LOGGED-IN USER PROFILE
// GET /api/auth/me
// =============================================================

app.get('/api/auth/me', verifyToken, async (req, res) => {

  try {

    // JWT se mili ID se user MongoDB me search
    const user = await User.findById(req.userId)
      .select('-password');

    // User nahi mila
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // User data frontend ko bhejna
    res.json({
      success: true,
      user: user
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});


// =============================================================
// 8. SEARCH USERS FROM MONGODB
// GET /api/users/search?q=username
// =============================================================

app.get('/api/users/search', verifyToken, async (req, res) => {

  try {

    // Search text lena
    const searchText = req.query.q;

    // Agar search text empty hai
    if (!searchText) {
      return res.json({
        success: true,
        users: []
      });
    }

    // MongoDB me username ya email search
    const users = await User.find({
      $or: [
        {
          username: {
            $regex: searchText,
            $options: 'i'
          }
        },
        {
          email: {
            $regex: searchText,
            $options: 'i'
          }
        }
      ]
    })
    .select('-password')
    .limit(20);

    // Search result frontend ko bhejna
    res.json({
      success: true,
      users: users
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});

   // =============================================================
// 10. GET CHAT MESSAGES
// GET /api/messages/:userId
// =============================================================

app.get('/api/messages/:userId', verifyToken, async (req, res) => {

  try {

    // Current logged-in user
    const currentUserId = String(req.userId);

    // Jis user ke saath chat open hai
    const selectedUserId = String(req.params.userId);


    // Dono users ke beech ke messages find
    const messages = await Message.find({

      $or: [

        {
          senderId: currentUserId,
          receiverId: selectedUserId
        },

        {
          senderId: selectedUserId,
          receiverId: currentUserId
        }

      ]

    }).sort({
      createdAt: 1
    });


    // Messages frontend ko bhejna
    res.json({

      success: true,

      messages: messages

    });


  } catch (error) {

    console.error(
      "Get Messages Error:",
      error.message
    );


    res.status(500).json({

      success: false,

      error: error.message

    });

  }

});


// =============================================================
// 11. DELETE MESSAGE
// DELETE /api/messages/:messageId
// =============================================================

app.delete('/api/messages/:messageId', verifyToken, async (req, res) => {

  try {

    // Message ID
    const messageId =
      req.params.messageId;


    // Message find
    const message =
      await Message.findById(messageId);


    // Message nahi mila
    if (!message) {

      return res.status(404).json({

        success: false,

        error: "Message not found"

      });

    }


    // Sirf sender apna message delete kar sakta hai
    if (
      String(message.senderId) !==
      String(req.userId)
    ) {

      return res.status(403).json({

        success: false,

        error:
          "Aap sirf apne messages delete kar sakte hain"

      });

    }


    // Message delete
    await Message.findByIdAndDelete(
      messageId
    );


    // Success response
    res.json({

      success: true,

      message:
        "Message deleted successfully"

    });


  } catch (error) {

    console.error(
      "Delete Message Error:",
      error.message
    );


    res.status(500).json({

      success: false,

      error: error.message

    });

  }

});  

// =============================================================
// 12. EDIT MESSAGE
// PUT /api/messages/:messageId
// =============================================================

app.put('/api/messages/:messageId', verifyToken, async (req, res) => {

  try {

    // Message ID
    const messageId =
      req.params.messageId;

    // New message text
    const newText =
      req.body.text;

    // Text check
    if (
      !newText ||
      !newText.trim()
    ) {

      return res.status(400).json({

        success: false,

        error: "Message empty nahi ho sakta"

      });

    }


    // Message find
    const message =
      await Message.findById(messageId);


    // Message nahi mila
    if (!message) {

      return res.status(404).json({

        success: false,

        error: "Message not found"

      });

    }


    // Sirf sender message edit kar sakta hai
    if (
      String(message.senderId) !==
      String(req.userId)
    ) {

      return res.status(403).json({

        success: false,

        error:
          "Aap sirf apne messages edit kar sakte hain"

      });

    }


    // Message update
    message.text =
      newText.trim();

    message.edited =
      true;


    // Database me save
    await message.save();


    // Updated message return
    res.json({

      success: true,

      message:
        "Message edited successfully",

      updatedMessage:
        message

    });


  } catch (error) {

    console.error(
      "Edit Message Error:",
      error.message
    );


    res.status(500).json({

      success: false,

      error:
        error.message

    });

  }

});

// =============================================================
// 9. SERVER START
// =============================================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 MK Backend Studio Engine Running on Port ${PORT}`);
});
      
