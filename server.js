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
  pingTimeout: 15000,
  pingInterval: 10000
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
  name: {type: String,default: ""},

  // Username
  username: {type: String,required: true,unique:true},

  // Email
  email: {type: String, required: true, unique: true },

  // Password
  password: { type: String,required: true },

  // Profile Photo
  profilePhoto: {type: String,default: ""},

  // About / Bio
  about: {type: String,default: "Hey there! I am using MK Chat."},

  // Online Status
  isOnline: {
    type: Boolean,
    default: false
  },

  // Last Seen
  lastSeen: {
    type: Date,
    default: null
  },

  // Account Creation Date
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// =============================================================
// MESSAGE SCHEMA
// =============================================================
const MessageSchema = new mongoose.Schema({

  senderId: {
    type: String,
    required: true
  },

  receiverId: {
    type: String,
    required: true
  },
  clientMessageId: {
    type: String,
    default: null
},

  text: {
    type: String,
    required: true
  },

  seen:{
  type:Boolean,
  default:false
},

  // Message edited hai ya nahi
  edited: {
    type: Boolean,
    default: false
  },

  // Reply information
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

  // Forward information
  forwarded: {
    type: Boolean,
    default: false
  },

  originalMessageId: {
    type: String,
    default: null
  },

  originalSenderId: {
    type: String,
    default: null
  },

  deletedFor: {
    type: [String],
    default: []
  },

  createdAt: {
    type: Date,
    default: Date.now    
  },
status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent"
},

deliveredAt: {
    type: Date,
    default: null
},

readAt: {
    type: Date,
    default: null
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

  socket.on("join_room", async (userId) => {
console.log("JOIN ROOM:", userId);
    if (!userId) return;

    socket.join(userId);

    await User.findByIdAndUpdate(userId, {
        isOnline: true,
      lastSeen:null
    });

    socket.userId = userId;


// ============================================================
// MARK PENDING MESSAGES AS DELIVERED WHEN USER CONNECTS
// ============================================================

try {

    const pendingMessages =
        await Message.find({
            receiverId: String(socket.userId),
            status: "sent"
        });

    for (const message of pendingMessages) {

        message.status = "delivered";
        message.deliveredAt = new Date();

        await message.save();

        io.to(String(message.senderId)).emit(
            "message_delivered",
            {
                messageId: String(message._id),
                clientMessageId:
                    message.clientMessageId
            }
        );

    }

} catch (error) {

    console.error(
        "Pending Delivery Error:",
        error.message
    );

}

io.emit("user_status", {
    userId: userId,
    isOnline: true
});
    

    io.emit("user_status", {
        userId: userId,
        isOnline: true
    });

    console.log(userId + " Online");

});

  // Realtime Messaging
socket.on('send_message', async (data) => {

  try {

    const {
    senderId,
    receiverId,
    text,
    replyTo,
    clientMessageId
} = data;

    // Required fields check
    if (
      !senderId ||
      !receiverId ||
      !text
    ) {
      return;
    }
if (clientMessageId) {

    const existingMessage =
        await Message.findOne({
            clientMessageId:
                clientMessageId
        });

    if (existingMessage) {

        io.to(String(senderId)).emit(
            "message_saved",
            existingMessage
        );

        return;
    }
}

    // Save Message to MongoDB
    const newMsg = new Message({

      senderId: senderId,

      receiverId: receiverId,
      clientMessageId: clientMessageId || null,
      

      text: text,
      status: "sent",

      // Reply information
      replyTo: replyTo || null

    });

    

    


  await newMsg.save();
    
io.to(String(senderId)).emit(
    "message_saved",
    newMsg
);
    

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
  socket.on("message_received", async (data) => {

    try {

        const message =
            await Message.findById(data.messageId);

        if (!message) return;

        message.status = "delivered";
        message.deliveredAt = new Date();

        await message.save();

        io.to(String(message.senderId)).emit(
    "message_delivered",
    {
        messageId: String(message._id),
        clientMessageId: message.clientMessageId
    }
);

    } catch (error) {

        console.error(
            "Delivered Error:",
            error.message
        );

    }

});

  socket.on("typing", function(data){

    io.to(data.receiverId).emit("typing",{

        senderId:data.senderId

    });

});

socket.on("stop_typing", function(data){

    io.to(data.receiverId).emit("stop_typing", {
        senderId: data.senderId
    });

});


// ============================================================
// READ MESSAGES
// ============================================================
socket.on("read_messages", async (data) => {

    try {

        if (!data.senderId) {
            return;
        }

        if (!socket.userId) {
            return;
        }

        const result = await Message.updateMany(
            {
                senderId: data.senderId,
                receiverId: socket.userId,
                status: { $ne: "read" }
            },
            {
                $set: {
                    status: "read",
                    seen: true,
                    readAt: new Date()
                }
            }
        );

        console.log(
            "📖 Messages marked read:",
            result.modifiedCount
        );

        if (result.modifiedCount > 0) {

            io.to(String(data.senderId)).emit(
                "messages_read",
                {
                    readerId: String(socket.userId)
                }
            );

        }

    } catch (error) {

        console.error(
            "❌ Read Messages Error:",
            error.message
        );

    }
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

  $and: [

    {
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
    },

    {
      deletedFor: {
        $ne: currentUserId
      }
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
// GET CHAT LIST
// GET /api/chats
// =============================================================

app.get('/api/chats', verifyToken, async (req, res) => {

try {

const currentUserId = String(req.userId);


const messages = await Message.find({

$or:[
{
senderId:currentUserId
},
{
receiverId:currentUserId
}
],

deletedFor:{
$ne:currentUserId
}

})
.sort({
createdAt:-1
});


const chatMap={};


for(let msg of messages){


let otherUserId =
String(msg.senderId) === currentUserId
?
String(msg.receiverId)
:
String(msg.senderId);



if(!chatMap[otherUserId]){


const user =
await User.findById(otherUserId)
.select(
    "name username email about profilePhoto isOnline lastSeen"
);



const unread =
await Message.countDocuments({

senderId:otherUserId,

receiverId:currentUserId,

seen:false

});


chatMap[otherUserId]={

chatMap[otherUserId]={

userId:otherUserId,

name:user?.name || "Unknown",

username:user?.username || "",

email:user?.email || "",

about:user?.about || "",

profilePhoto:user?.profilePhoto || "",

lastMessage:msg.text,
lastMessageTime:msg.createdAt,
  lastMessageStatus:
    msg.status || "sent",

lastMessageSenderId:
    String(msg.senderId),
  
isOnline:user?.isOnline || false,

lastSeen:user?.lastSeen,

unreadCount:unread

};


}

}


res.json({

success:true,

chats:Object.values(chatMap)

});


}

catch(error){

res.status(500).json({

success:false,

error:error.message

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

// =============================================================
// EDIT MESSAGE
// PUT /api/messages/:messageId
// =============================================================

app.put(
  '/api/messages/:messageId',
  verifyToken,
  async (req, res) => {

    try {

      const messageId =
        req.params.messageId;

      const newText =
        req.body.text;


      // Empty message check
      if (
        !newText ||
        !newText.trim()
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Message empty nahi ho sakta"

        });

      }


      // Message find
      const message =
        await Message.findById(
          messageId
        );


      // Message nahi mila
      if (!message) {

        return res.status(404).json({

          success: false,

          error:
            "Message not found"

        });

      }


      // Sirf sender apna message edit karega
      if (
        String(message.senderId) !==
        String(req.userId)
      ) {

        return res.status(403).json({

          success: false,

          error:
            "Aap sirf apne message edit kar sakte hain"

        });

      }


      // Message update
      message.text =
        newText.trim();

      message.edited =
        true;


      // MongoDB me save
      await message.save();


      // Updated message response
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
        error
      );


      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);

app.put(
    "/api/auth/profile",
    verifyToken,
    async (req, res) => {

        try {

            const userId =
                req.userId;

            const {
                name,
                username,
                about
            } = req.body;


            if (!name || !username) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Name aur username required hai"

                });

            }


            // Username kisi aur user ka hai?
            const existingUser =
                await User.findOne({

                    username: username,

                    _id: {
                        $ne: userId
                    }

                });


            if (existingUser) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Username already taken"

                });

            }


            const user =
                await User.findByIdAndUpdate(

                    userId,

                    {
                        name:
                            name.trim(),

                        username:
                            username.trim(),

                        about:
                            about
                                ? about.trim()
                                : ""
                    },

                    {
                        new: true,
                        runValidators: true
                    }

                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    error:
                        "User not found"

                });

            }


            res.json({

                success: true,

                user: {

                    id:
                        String(user._id),

                    name:
                        user.name,

                    username:
                        user.username,

                    email:
                        user.email,

                    about:
                        user.about

                }

            });

        }

        catch (error) {

            console.error(
                "❌ Profile Update Error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);
// =============================================================
// 13. FORWARD MESSAGE
// POST /api/messages/forward
// =============================================================
// =============================================================
// 13. FORWARD MESSAGE
// POST /api/messages/forward
// =============================================================

app.post(
  '/api/messages/forward',
  verifyToken,
  async (req, res) => {

    try {

      const {
        messageId,
        receiverIds
      } = req.body;


      // Check
      if (
        !messageId ||
        !Array.isArray(receiverIds) ||
        receiverIds.length === 0
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Message aur receiver select karo"

        });

      }


      // Original message find
      const originalMessage =
        await Message.findById(
          messageId
        );


      if (!originalMessage) {

        return res.status(404).json({

          success: false,

          error:
            "Original message not found"

        });

      }


      // Current logged-in user
      const senderId =
        String(req.userId);


      // Forwarded messages array
      const forwardedMessages = [];


      // Har selected user ke liye new message
      for (
        const receiverId of receiverIds
      ) {

        // Khud ko forward nahi
        if (
          String(receiverId) ===
          senderId
        ) {

          continue;

        }


        const newMessage =
          new Message({

            senderId:
              senderId,

            receiverId:
              String(receiverId),

            text:
              originalMessage.text,

            forwarded:
              true,

            originalMessageId:
              String(
                originalMessage._id
              ),

            originalSenderId:
              String(
                originalMessage.senderId
              ),

            replyTo:
              null

          });


        // MongoDB save
        await newMessage.save();


        // Array me add
        forwardedMessages.push(
          newMessage
        );


        // Receiver ko realtime
        io.to(
          String(receiverId)
        ).emit(
          'receive_message',
          newMessage
        );


        // Sender ko bhi realtime
        io.to(
          senderId
        ).emit(
          'receive_message',
          newMessage
        );

      }


      // Response
      res.json({

        success: true,

        message:
          "Message forwarded successfully",

        messages:
          forwardedMessages

      });


    } catch (error) {

      console.error(
        "Forward Message Error:",
        error
      );


      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);

// =============================================================
// CLEAR CHAT FOR CURRENT USER ONLY
// DELETE /api/messages/clear-for-me/:userId
// =============================================================

app.delete(
  '/api/messages/clear-for-me/:userId',
  verifyToken,
  async (req, res) => {

    try {

      const currentUserId =
        String(req.userId);

      const selectedUserId =
        String(req.params.userId);


      // Sirf current user ki chat hide hogi
      await Message.updateMany(

        {
          $or: [

            {
              senderId: currentUserId,
              receiverId: selectedUserId
            },

            {
              senderId: selectedUserId,
              receiverId: currentUserId
            }

          ],

          deletedFor: {
            $ne: currentUserId
          }

        },

        {
          $addToSet: {
            deletedFor: currentUserId
          }
        } );

      res.json({

        success: true,

        message:
          "Chat cleared for you"

      });

    } catch (error) {

      console.error(
        "Clear Chat Error:",
        error.message
      );

      res.status(500).json({

        success: false,

        error:
          error.message
      });
   }
  });

  app.get("/api/users/:id/status", verifyToken, async (req, res) => {

    let user = await User.findById(req.params.id)
        .select("isOnline lastSeen");

    if (!user) {

        return res.status(404).json({
            success: false
        });

    }

    res.json({

        success: true,

        isOnline: user.isOnline,

        lastSeen: user.lastSeen

    });

});

  app.get('/api/users/:userId/status', verifyToken, async (req,res)=>{

    try{

        const user =
        await User.findById(req.params.userId)
        .select("isOnline lastSeen");


        if(!user){

            return res.status(404).json({
                success:false,
                error:"User not found"
            });

        }


        res.json({

            success:true,

            isOnline:user.isOnline,

            lastSeen:user.lastSeen

        });


    }
    catch(error){

        res.status(500).json({

            success:false,

            error:error.message

        });

    }

});
// 9. SERVER START
// =============================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 MK Backend Studio Engine Running on Port ${PORT}`);
});
      
