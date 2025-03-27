// neurosity-integration.js
// Integration with Neurosity Crown device for EEG measurement

const { Neurosity } = require("@neurosity/sdk");

class CrownInterface {
  constructor() {
    this.deviceId = null;
    this.neurosity = null;
    this.isConnected = false;
    this.currentUser = null;
    this.listeners = [];
    this.dataLog = [];
    this.recording = false;
    this.currentTrial = null;
    this.sessionData = {};
  }

  async initialize(deviceId, email, password) {
    try {
      this.deviceId = deviceId;
      this.neurosity = new Neurosity({
        deviceId
      });
      
      console.log("Logging in...");
      await this.neurosity.login({
        email,
        password
      });
      
      this.currentUser = await this.neurosity.getUser();
      console.log(`Logged in as ${this.currentUser.email}`);
      this.isConnected = true;
      
      // Subscribe to status to monitor connection
      this.neurosity.status().subscribe(status => {
        console.log("Status:", status);
        this.isConnected = status.state === "online";
      });
      
      return true;
    } catch (error) {
      console.error("Failed to initialize Crown:", error);
      return false;
    }
  }

  async startSession(sessionInfo) {
    if (!this.isConnected) {
      console.error("Cannot start session: Crown not connected");
      return false;
    }
    
    this.sessionData = {
      ...sessionInfo,
      startTime: new Date().toISOString(),
      trials: []
    };
    
    // Subscribe to raw EEG data
    this.addListener(
      this.neurosity.brainwaves("raw").subscribe(brainwaves => {
        if (this.recording && this.currentTrial) {
          // Add data to current trial
          this.currentTrial.data.push({
            timestamp: Date.now(),
            brainwaves
          });
        }
      })
    );
    
    console.log("Session started:", this.sessionData.id);
    return true;
  }
  
  async startTrial(trialInfo) {
    if (!this.isConnected) {
      console.error("Cannot start trial: Crown not connected");
      return false;
    }
    
    this.recording = true;
    this.currentTrial = {
      ...trialInfo,
      startTime: new Date().toISOString(),
      data: []
    };
    
    console.log(`Started trial ${trialInfo.id}, direction: ${trialInfo.direction}, condition: ${trialInfo.condition}`);
    return true;
  }
  
  async endTrial() {
    if (!this.recording || !this.currentTrial) {
      console.error("No active trial to end");
      return false;
    }
    
    this.currentTrial.endTime = new Date().toISOString();
    this.sessionData.trials.push(this.currentTrial);
    
    console.log(`Ended trial ${this.currentTrial.id}, recorded ${this.currentTrial.data.length} data points`);
    
    this.recording = false;
    this.currentTrial = null;
    return true;
  }
  
  async endSession() {
    if (!this.sessionData.startTime) {
      console.error("No active session to end");
      return false;
    }
    
    this.sessionData.endTime = new Date().toISOString();
    
    // Clean up all subscriptions
    this.listeners.forEach(subscription => subscription.unsubscribe());
    this.listeners = [];
    
    console.log(`Session ended: ${this.sessionData.id}`);
    return this.sessionData;
  }
  
  saveSessionData(filename = null) {
    const dataToSave = {
      ...this.sessionData,
      device: this.deviceId,
      user: this.currentUser ? this.currentUser.email : null,
      savedAt: new Date().toISOString()
    };
    
    // If in browser
    if (typeof window !== 'undefined') {
      const dataStr = JSON.stringify(dataToSave, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const downloadLink = document.createElement('a');
      const actualFilename = filename || `crown_session_${dataToSave.id}_${new Date().toISOString().slice(0,10)}.json`;
      
      downloadLink.href = url;
      downloadLink.download = actualFilename;
      downloadLink.click();
      
      console.log(`Session data saved to ${actualFilename}`);
      return true;
    } 
    // If in Node.js
    else if (typeof process !== 'undefined') {
      const fs = require('fs');
      const actualFilename = filename || `crown_session_${dataToSave.id}_${new Date().toISOString().slice(0,10)}.json`;
      
      fs.writeFileSync(actualFilename, JSON.stringify(dataToSave, null, 2));
      console.log(`Session data saved to ${actualFilename}`);
      return true;
    }
    
    console.error("Could not determine environment for saving data");
    return false;
  }
  
  addListener(subscription) {
    this.listeners.push(subscription);
  }
  
  disconnect() {
    if (this.listeners.length > 0) {
      this.listeners.forEach(subscription => subscription.unsubscribe());
      this.listeners = [];
    }
    
    this.isConnected = false;
    this.currentUser = null;
    this.neurosity = null;
    console.log("Disconnected from Crown");
    return true;
  }
}

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CrownInterface };
} else {
  window.CrownInterface = CrownInterface;
}