// Main server for Crown experiment
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { CrownInterface } = require('./neurosity-integration');

// Initialize the server
const app = express();
const PORT = process.env.PORT || 3000;

// For parsing JSON in request body
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Store crown interface instance
let crownInterface = null;
let currentSession = null;
let currentTrial = null;

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// API endpoints
app.post('/api/crown/connect', async (req, res) => {
  try {
    if (crownInterface && crownInterface.isConnected) {
      return res.json({ success: true, message: 'Already connected' });
    }
    
    crownInterface = new CrownInterface();
    
    // Get credentials from .env if not provided in request
    const deviceId = req.body.deviceId || process.env.DEVICE_ID;
    const email = req.body.email || process.env.EMAIL;
    const password = req.body.password || process.env.PASSWORD;
    
    if (!deviceId || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing credentials. Provide in request or set in .env file' 
      });
    }
    
    const success = await crownInterface.initialize(deviceId, email, password);
    
    if (success) {
      return res.json({ 
        success: true, 
        message: 'Connected to Crown device successfully' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to connect to Crown device' 
      });
    }
  } catch (error) {
    console.error('Crown connection error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Connection error: ${error.message}` 
    });
  }
});

app.post('/api/session/start', async (req, res) => {
  try {
    if (!crownInterface || !crownInterface.isConnected) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not connected to Crown device' 
      });
    }
    
    const { sessionInfo } = req.body;
    
    if (!sessionInfo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Session info required' 
      });
    }
    
    // Create unique session ID
    const sessionId = `session_${Date.now()}`;
    const success = await crownInterface.startSession({
      id: sessionId,
      ...sessionInfo
    });
    
    if (success) {
      currentSession = sessionId;
      return res.json({ 
        success: true, 
        sessionId: sessionId,
        message: 'Session started successfully' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to start session' 
      });
    }
  } catch (error) {
    console.error('Session start error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Session error: ${error.message}` 
    });
  }
});

app.post('/api/trial/start', async (req, res) => {
  try {
    if (!crownInterface || !crownInterface.isConnected) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not connected to Crown device' 
      });
    }
    
    if (!currentSession) {
      return res.status(400).json({ 
        success: false, 
        message: 'No active session' 
      });
    }
    
    const { trialInfo } = req.body;
    
    if (!trialInfo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Trial info required' 
      });
    }
    
    const success = await crownInterface.startTrial(trialInfo);
    
    if (success) {
      currentTrial = trialInfo.trialNumber;
      return res.json({ 
        success: true, 
        message: 'Trial started successfully' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to start trial' 
      });
    }
  } catch (error) {
    console.error('Trial start error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Trial error: ${error.message}` 
    });
  }
});

app.post('/api/trial/end', async (req, res) => {
  try {
    if (!crownInterface || !currentTrial) {
      return res.status(400).json({ 
        success: false, 
        message: 'No active trial' 
      });
    }
    
    const success = await crownInterface.endTrial();
    
    if (success) {
      currentTrial = null;
      return res.json({ 
        success: true, 
        message: 'Trial ended successfully' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to end trial' 
      });
    }
  } catch (error) {
    console.error('Trial end error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Trial error: ${error.message}` 
    });
  }
});

app.post('/api/session/end', async (req, res) => {
  try {
    if (!crownInterface || !currentSession) {
      return res.status(400).json({ 
        success: false, 
        message: 'No active session' 
      });
    }
    
    const sessionData = await crownInterface.endSession();
    
    if (sessionData) {
      const filename = `data/crown_${sessionData.mode || 'experiment'}_${sessionData.id}.json`;
      const fullPath = path.join(__dirname, '..', filename);
      
      fs.writeFileSync(
        fullPath, 
        JSON.stringify(sessionData, null, 2)
      );
      
      currentSession = null;
      
      return res.json({ 
        success: true, 
        filename: filename,
        message: 'Session ended and data saved successfully' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to end session' 
      });
    }
  } catch (error) {
    console.error('Session end error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Session error: ${error.message}` 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});