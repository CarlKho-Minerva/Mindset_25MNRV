require('dotenv').config();
const { Neurosity } = require('@neurosity/sdk');

// Configuration
const DIRECTIONS = ['up', 'down', 'left', 'right'];
const MODES = ['inner-speech', 'visualized', 'pronounced'];
const SESSION_DURATION = 5000; // milliseconds per trial
const TRIALS_PER_DIRECTION = 5; // number of trials per direction in each mode
const REST_DURATION = 3000; // milliseconds rest between trials

// Connect to your Crown device
async function connectToCrown() {
  const neurosity = new Neurosity({
    deviceId: process.env.DEVICE_ID
  });

  console.log("Authenticating...");
  
  try {
    await neurosity.login({
      email: process.env.EMAIL,
      password: process.env.PASSWORD
    });
    
    console.log("Authentication successful!");
    
    const info = await neurosity.getInfo();
    console.log(`Connected to ${info.name}, model ${info.model}`);
    
    return neurosity;
  } catch (error) {
    console.error("Authentication failed:", error.message);
    process.exit(1);
  }
}

// Sleep function for timing control
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to run a training session
async function runTrainingSession(neurosity, mode) {
  console.log(`\n--- Starting ${mode} training session ---`);

  // Create a data folder for this session
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const sessionData = {
    mode,
    timestamp,
    trials: []
  };

  let subscriptions = [];
  
  // Subscribe to brainwaves data
  const brainwavesSubscription = neurosity.brainwaves("powerByBand").subscribe(brainwaves => {
    // Store the latest brainwaves data
    sessionData.latestBrainwaves = brainwaves;
  });
  
  subscriptions.push(brainwavesSubscription);
  
  // Run trials for each direction in random order
  const randomizedDirections = DIRECTIONS.flatMap(direction => 
    Array(TRIALS_PER_DIRECTION).fill(direction)
  ).sort(() => Math.random() - 0.5);

  for (const direction of randomizedDirections) {
    // Rest period before each trial
    console.log(`\nRest period (${REST_DURATION/1000} seconds)...`);
    await sleep(REST_DURATION);
    
    // Start trial
    console.log(`Think "${direction}" using ${mode === 'inner-speech' ? 'inner speech' : 
                              mode === 'visualized' ? 'visualization' : 
                              'pronunciation'}`);
    
    const startTime = Date.now();
    const trialData = {
      direction,
      startTime,
      brainwaves: []
    };
    
    // Collect data during trial
    const dataCollectionInterval = setInterval(() => {
      if (sessionData.latestBrainwaves) {
        trialData.brainwaves.push({
          timestamp: Date.now(),
          data: JSON.parse(JSON.stringify(sessionData.latestBrainwaves))
        });
      }
    }, 250); // sample every 250ms
    
    await sleep(SESSION_DURATION);
    clearInterval(dataCollectionInterval);
    
    trialData.endTime = Date.now();
    sessionData.trials.push(trialData);
    
    console.log(`Completed trial for "${direction}"`);
  }
  
  // Clean up subscriptions
  subscriptions.forEach(subscription => subscription.unsubscribe());
  
  // Save session data to file
  const fs = require('fs');
  const path = require('path');
  const dataDir = path.join(__dirname, '..', 'data');
  
  if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filename = path.join(dataDir, `${mode}-session-${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(sessionData, null, 2));
  
  console.log(`\nSession complete! Data saved to ${filename}`);
  return filename;
}

// Main function to run the experiment
async function main() {
  console.log("Directional Thought Training");
  console.log("===========================");
  console.log("\nThis experiment will train your Crown device to recognize directional thoughts");
  console.log("using three different mental strategies:");
  console.log("1. Inner speech: Think the word without speaking");
  console.log("2. Visualization: Imagine the direction visually");
  console.log("3. Pronunciation: Say the direction out loud");
  
  const neurosity = await connectToCrown();
  
  // Check signal quality before starting
  console.log("\nChecking signal quality...");
  await new Promise((resolve) => {
    const subscription = neurosity.signalQuality().subscribe(signalQuality => {
      console.log("Signal quality:", signalQuality);
      if (signalQuality.every(channel => channel.quality >= 0.3)) {
        console.log("Signal quality acceptable. Ready to begin!");
        subscription.unsubscribe();
        resolve();
      } else {
        console.log("Please adjust the device for better signal quality.");
      }
    });
  });

  // Run training sessions for each mode
  for (const mode of MODES) {
    const dataFile = await runTrainingSession(neurosity, mode);
    console.log(`Completed ${mode} mode. Data saved to ${dataFile}`);
    
    // Break between modes
    if (mode !== MODES[MODES.length - 1]) {
      console.log("\nTaking a break before the next mode. Press Enter to continue...");
      await new Promise(resolve => process.stdin.once('data', resolve));
    }
  }
  
  console.log("\nAll training sessions completed!");
  process.exit(0);
}

// Start the experiment
main().catch(error => {
  console.error("An error occurred:", error);
  process.exit(1);
});