const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// CORS enable taaki OneCompiler se backend request block na ho
app.use(cors());
app.use(express.json());

// Express static folder fix
app.use(express.static(path.join(__dirname, 'public')));

// Root route ("/") fix - Direct index.html file serve karega
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



// In-memory data + routes.json fallback
const DB_FILE = path.join(__dirname, 'routes.json');
let routesMemory = {};

// Load existing routes
if (fs.existsSync(DB_FILE)) {
  try {
    routesMemory = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    routesMemory = {};
  }
}

// 1. Dynamic API Route (OneCompiler se iss URL par fetch request aayegi)
app.all('/api/:endpoint', (req, res) => {
  const endpoint = req.params.endpoint;

  if (routesMemory[endpoint]) {
    return res.status(200).json(routesMemory[endpoint]);
  } else {
    return res.status(404).json({ 
      success: false, 
      message: `Route '/api/${endpoint}' not found in MK Backend Studio!` 
    });
  }
});

// 2. Save Route API (Studio Dashboard se new API links banane ke liye)
app.post('/studio/save-route', (req, res) => {
  const { routeName, responseData } = req.body;

  if (!routeName || !responseData) {
    return res.status(400).json({ error: "Route Name and Data are required!" });
  }

  // Save to memory and file
  routesMemory[routeName] = responseData;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(routesMemory, null, 2));
  } catch (e) {
    console.log("File write skipped, saved in memory.");
  }

  res.json({ 
    success: true, 
    message: `Route '/api/${routeName}' successfully active ho gaya hai!` 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MK Backend Studio running on port ${PORT}`);
});
