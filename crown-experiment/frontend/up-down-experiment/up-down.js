/**
 * Up-Down Inner Speech Experiment
 * 
 * This script handles:
 * 1. Connection to the Crown device
 * 2. Real-time EEG visualization
 * 3. Running the up/down experiment trials
 * 4. Recording data for analysis
 */

// Experiment configuration
const config = {
  // Timing parameters (in milliseconds)
  timings: {
    preparationInterval: 2000,    // 2s - get ready
    concentrationInterval: 500,   // 0.5s - white circle appears
    cueInterval: 1000,            // 1s - direction appears
    actionInterval: 3000,         // 3s - perform the mental task
    restInterval: 2000,           // 2s rest between trials
  },
  
  // Experiment settings
  settings: {
    upTrials: 10,                 // Number of "up" trials
    downTrials: 10,               // Number of "down" trials
    randomizeOrder: true,         // Whether to randomize trial order
    totalTrials: 20,              // Total number of trials (should equal upTrials + downTrials)
  },
  
  // Experiment state
  state: {
    isConnected: false,           // Connection to Crown
    isRunning: false,             // Experiment running status
    currentTrial: 0,              // Current trial number
    currentDirection: null,       // Current direction (up or down)
    sessionStartTime: null,       // When the session started
    trialSequence: [],            // Pre-computed sequence of trials
  },
  
  // Chart configuration
  chart: {
    timeWindow: 5,                // Time window in seconds
    refreshRate: 16,              // Chart refresh rate in milliseconds
    data: {
      labels: [],                 // Time labels for x-axis
      raw: Array(8).fill().map(() => []),   // Raw data for 8 channels
      powerBands: {
        delta: [],
        theta: [],
        alpha: [],
        beta: [],
        gamma: []
      }
    }
  }
};

// DOM Elements
const elements = {
  connectionStatus: document.getElementById('connection-status'),
  connectionText: document.getElementById('connection-text'),
  statusMessage: document.getElementById('status-message'),
  directionDisplay: document.getElementById('direction-display'),
  instructions: document.getElementById('instructions'),
  progressInfo: document.getElementById('progress-info'),
  buttons: {
    connect: document.getElementById('btn-connect'),
    start: document.getElementById('btn-start'),
    stop: document.getElementById('btn-stop')
  },
  inputs: {
    deviceId: document.getElementById('device-id'),
    email: document.getElementById('email'),
    password: document.getElementById('password')
  },
  chart: document.getElementById('brainwaves-chart'),
  bandValues: {
    delta: document.getElementById('delta-value'),
    theta: document.getElementById('theta-value'),
    alpha: document.getElementById('alpha-value'),
    beta: document.getElementById('beta-value'),
    gamma: document.getElementById('gamma-value')
  }
};

// Initialize the chart
let brainwavesChart;

// Initialize the experiment
document.addEventListener('DOMContentLoaded', () => {
  initializeChart();
  addEventListeners();
  
  // Create trial sequence
  generateTrialSequence();
});

/**
 * Initialize the brainwaves chart
 */
function initializeChart() {
  const ctx = elements.chart.getContext('2d');
  
  // Create labels for the time window
  const labels = [];
  const timeWindow = config.chart.timeWindow * 1000; // convert to ms
  const step = 100; // 100ms steps
  for (let i = 0; i < timeWindow; i += step) {
    labels.push(`-${(timeWindow - i) / 1000}s`);
  }
  config.chart.data.labels = labels;
  
  // Initialize each channel data
  for (let i = 0; i < 8; i++) {
    config.chart.data.raw[i] = Array(labels.length).fill(0);
  }
  
  // Create empty power band data arrays
  Object.keys(config.chart.data.powerBands).forEach(band => {
    config.chart.data.powerBands[band] = Array(labels.length).fill(0);
  });
  
  // Create the chart
  brainwavesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: config.chart.data.labels,
      datasets: [
        // Channel 1 (most relevant for speech - left temporal)
        {
          label: 'Channel 4 (Left Temporal)',
          data: config.chart.data.raw[3],
          borderColor: 'rgba(255, 255, 255, 0.8)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
        },
        // Delta band power
        {
          label: 'Delta',
          data: config.chart.data.powerBands.delta,
          borderColor: 'rgba(255, 107, 107, 0.8)',
          borderWidth: 1,
          hidden: true,
          fill: false,
          tension: 0.4,
        },
        // Theta band power
        {
          label: 'Theta',
          data: config.chart.data.powerBands.theta,
          borderColor: 'rgba(254, 202, 87, 0.8)',
          borderWidth: 1,
          hidden: true,
          fill: false,
          tension: 0.4,
        },
        // Alpha band power
        {
          label: 'Alpha',
          data: config.chart.data.powerBands.alpha,
          borderColor: 'rgba(29, 209, 161, 0.8)',
          borderWidth: 1,
          hidden: true,
          fill: false,
          tension: 0.4,
        },
        // Beta band power
        {
          label: 'Beta',
          data: config.chart.data.powerBands.beta,
          borderColor: 'rgba(84, 160, 255, 0.8)',
          borderWidth: 1,
          hidden: false,
          fill: false,
          tension: 0.4,
        },
        // Gamma band power
        {
          label: 'Gamma',
          data: config.chart.data.powerBands.gamma,
          borderColor: 'rgba(197, 108, 240, 0.8)',
          borderWidth: 1,
          hidden: false,
          fill: false,
          tension: 0.4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: 'rgba(255, 255, 255, 0.8)',
            padding: 10,
            boxWidth: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        },
      },
    }
  });
}

/**
 * Add event listeners
 */
function addEventListeners() {
  // Connect button
  elements.buttons.connect.addEventListener('click', connectToCrown);
  
  // Start experiment button
  elements.buttons.start.addEventListener('click', startExperiment);
  
  // Stop experiment button
  elements.buttons.stop.addEventListener('click', stopExperiment);
}

/**
 * Connect to the Crown device
 */
async function connectToCrown() {
  // If already connected, disconnect
  if (config.state.isConnected) {
    updateConnectionStatus('disconnected');
    elements.buttons.connect.textContent = 'Connect';
    config.state.isConnected = false;
    showStatusMessage('Disconnected from Crown device', 'info');
    return;
  }
  
  // Get credentials from form
  const deviceId = elements.inputs.deviceId.value.trim();
  const email = elements.inputs.email.value.trim();
  const password = elements.inputs.password.value.trim();
  
  if (!deviceId || !email || !password) {
    showStatusMessage('Please enter all required fields', 'error');
    return;
  }
  
  // Disable form while connecting
  setInputsDisabled(true);
  updateConnectionStatus('connecting');
  showStatusMessage('Connecting to Crown device...', 'info');
  
  try {
    // Call the API to connect
    const response = await fetch('/api/crown/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ deviceId, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      config.state.isConnected = true;
      updateConnectionStatus('connected');
      showStatusMessage('Successfully connected to Crown device!', 'success');
      elements.buttons.connect.textContent = 'Disconnect';
      
      // Enable start button
      elements.buttons.start.disabled = false;
      
      // Now that we're connected, start listening for brainwave data
      startDataStream();
    } else {
      updateConnectionStatus('disconnected');
      showStatusMessage(`Connection failed: ${data.message}`, 'error');
    }
  } catch (error) {
    console.error('Connection error:', error);
    updateConnectionStatus('disconnected');
    showStatusMessage(`Connection error: ${error.message || 'Unknown error'}`, 'error');
  } finally {
    setInputsDisabled(false);
  }
}

/**
 * Start streaming data from the Crown device
 */
function startDataStream() {
  // Start a WebSocket connection to stream data
  // For this example, we'll simulate data using setInterval
  
  // In a real implementation, you'd subscribe to the WebSocket events
  // or use the Neurosity SDK to get real-time data
  
  // For now, we'll simulate data with random values
  const dataStreamInterval = setInterval(() => {
    if (!config.state.isConnected) {
      clearInterval(dataStreamInterval);
      return;
    }
    
    // Simulate raw EEG data
    for (let i = 0; i < 8; i++) {
      const newValue = Math.random() * 2 - 1; // Random value between -1 and 1
      config.chart.data.raw[i].push(newValue);
      config.chart.data.raw[i].shift();
    }
    
    // Simulate power band data
    const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
    bands.forEach(band => {
      // Create baseline values for each band (more realistic)
      let baseValue;
      switch (band) {
        case 'delta': baseValue = 4 + Math.random() * 2; break; // Higher at rest
        case 'theta': baseValue = 3 + Math.random() * 2; break;
        case 'alpha': baseValue = 2 + Math.random() * 3; break; // Higher when relaxed
        case 'beta': baseValue = 2 + Math.random() * 2; break;  // Higher when thinking
        case 'gamma': baseValue = 1 + Math.random() * 1; break; // Lower normally
        default: baseValue = 2;
      }
      
      // If we're in an active trial with 'up' or 'down', modify the values
      if (config.state.isRunning && config.state.currentDirection) {
        if (config.state.currentDirection === 'up' && band === 'gamma') {
          baseValue += 2; // Increase gamma during 'up' thinking
        } else if (config.state.currentDirection === 'down' && band === 'alpha') {
          baseValue += 2; // Increase alpha during 'down' thinking
        }
      }
      
      const newValue = baseValue + (Math.random() - 0.5);
      config.chart.data.powerBands[band].push(newValue);
      config.chart.data.powerBands[band].shift();
      
      // Update band value display
      elements.bandValues[band].textContent = newValue.toFixed(2);
    });
    
    // Update chart
    brainwavesChart.update();
  }, config.chart.refreshRate);
}

/**
 * Generate the trial sequence
 */
function generateTrialSequence() {
  // Create array with the correct number of up and down trials
  const trials = [
    ...Array(config.settings.upTrials).fill('up'),
    ...Array(config.settings.downTrials).fill('down')
  ];
  
  // Randomize if setting is enabled
  if (config.settings.randomizeOrder) {
    // Fisher-Yates shuffle algorithm
    for (let i = trials.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [trials[i], trials[j]] = [trials[j], trials[i]];
    }
  }
  
  config.state.trialSequence = trials;
}

/**
 * Start the experiment
 */
async function startExperiment() {
  // Check if connected to Crown
  if (!config.state.isConnected) {
    showStatusMessage('Please connect to Crown device first', 'error');
    return;
  }
  
  // Update UI
  elements.buttons.start.disabled = true;
  elements.buttons.stop.disabled = false;
  elements.directionDisplay.classList.remove('show');
  
  // Initialize experiment state
  config.state.isRunning = true;
  config.state.currentTrial = 0;
  config.state.sessionStartTime = Date.now();
  
  // Start Crown recording session
  try {
    const response = await fetch('/api/session/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionInfo: {
          mode: 'inner-speech-up-down',
          startTime: new Date().toISOString(),
          totalTrials: config.settings.totalTrials
        }
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      showStatusMessage(`Failed to start Crown session: ${data.message}`, 'error');
      stopExperiment();
      return;
    }
  } catch (error) {
    console.error('Failed to start Crown session:', error);
    showStatusMessage('Failed to start Crown session due to an error', 'error');
    stopExperiment();
    return;
  }
  
  // Show preparation instructions
  elements.instructions.textContent = 'Experiment starting. Prepare yourself...';
  await sleep(3000);
  
  // Run trials
  await runTrials();
}

/**
 * Run all trials in sequence
 */
async function runTrials() {
  for (let i = 0; i < config.state.trialSequence.length; i++) {
    if (!config.state.isRunning) break;
    
    config.state.currentTrial = i + 1;
    config.state.currentDirection = config.state.trialSequence[i];
    
    elements.progressInfo.textContent = `Trial ${config.state.currentTrial} of ${config.settings.totalTrials}`;
    
    await runSingleTrial(config.state.currentDirection);
  }
  
  // All trials completed
  if (config.state.isRunning) {
    elements.instructions.textContent = 'Experiment completed! Thank you for participating.';
    stopExperiment();
  }
}

/**
 * Run a single trial
 */
async function runSingleTrial(direction) {
  // Start trial with Crown
  try {
    const response = await fetch('/api/trial/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trialInfo: {
          trialNumber: config.state.currentTrial,
          direction: direction,
          condition: 'inner-speech',
          timestamp: new Date().toISOString()
        }
      })
    });
    
    if (!response.ok) {
      console.error('Failed to start Crown trial');
    }
  } catch (error) {
    console.error('Failed to start Crown trial:', error);
  }
  
  // 1. Rest interval
  elements.instructions.textContent = 'Rest and prepare for the next trial...';
  elements.directionDisplay.classList.remove('show');
  await sleep(config.timings.restInterval);
  
  if (!config.state.isRunning) return;
  
  // 2. Preparation period
  elements.instructions.textContent = 'Focus on the center of the screen';
  await sleep(config.timings.preparationInterval);
  
  if (!config.state.isRunning) return;
  
  // 3. Concentration interval
  elements.instructions.textContent = 'Get ready...';
  await sleep(config.timings.concentrationInterval);
  
  if (!config.state.isRunning) return;
  
  // 4. Cue interval
  elements.directionDisplay.textContent = direction.toUpperCase();
  elements.directionDisplay.classList.add('show');
  elements.instructions.textContent = `Think "${direction}" without moving your lips or tongue`;
  await sleep(config.timings.cueInterval);
  
  if (!config.state.isRunning) return;
  
  // 5. Action interval (thinking period)
  elements.instructions.textContent = 'Keep thinking...';
  await sleep(config.timings.actionInterval);
  
  if (!config.state.isRunning) return;
  
  // 6. End of trial
  elements.directionDisplay.classList.remove('show');
  
  // End trial with Crown
  try {
    await fetch('/api/trial/end', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Failed to end Crown trial:', error);
  }
}

/**
 * Stop the experiment
 */
async function stopExperiment() {
  // Update state
  config.state.isRunning = false;
  
  // Update UI
  elements.buttons.start.disabled = false;
  elements.buttons.stop.disabled = true;
  elements.directionDisplay.classList.remove('show');
  
  // End session with Crown if connected
  if (config.state.isConnected) {
    try {
      const response = await fetch('/api/session/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        showStatusMessage(`Experiment completed. Data saved to: ${data.filename}`, 'success');
      } else {
        showStatusMessage('Error saving data: ' + data.message, 'error');
      }
    } catch (error) {
      console.error('Failed to end Crown session:', error);
      showStatusMessage('Error communicating with server', 'error');
    }
  }
}

/**
 * Update the connection status indicator
 */
function updateConnectionStatus(status) {
  // Remove all classes
  elements.connectionStatus.classList.remove('connected', 'disconnected', 'connecting');
  
  // Add appropriate class
  elements.connectionStatus.classList.add(status);
  
  // Update text
  if (status === 'connected') {
    elements.connectionText.textContent = 'Connected';
  } else if (status === 'connecting') {
    elements.connectionText.textContent = 'Connecting...';
  } else {
    elements.connectionText.textContent = 'Disconnected';
  }
}

/**
 * Show a status message
 * @param {string} message - The message to show
 * @param {string} type - The type of message (info, success, error)
 */
function showStatusMessage(message, type = 'info') {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = type;
  
  // Log to console based on type
  if (type === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }
}

/**
 * Enable/disable form inputs
 * @param {boolean} disabled - Whether inputs should be disabled
 */
function setInputsDisabled(disabled) {
  elements.inputs.deviceId.disabled = disabled;
  elements.inputs.email.disabled = disabled;
  elements.inputs.password.disabled = disabled;
  elements.buttons.connect.disabled = disabled;
  
  if (disabled) {
    elements.buttons.connect.textContent = 'Connecting...';
  } else {
    elements.buttons.connect.textContent = config.state.isConnected ? 'Disconnect' : 'Connect';
  }
}

/**
 * Utility function for sleep/delay
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}