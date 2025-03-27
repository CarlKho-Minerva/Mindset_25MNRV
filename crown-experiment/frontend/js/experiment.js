/**
 * Directional Thought Experiment - Frontend Controller
 * 
 * This script controls the experiment workflow based on the paper:
 * "EEG BCI Dataset for Inner Speech Recognition"
 */

// Experiment configuration
const config = {
  // Timing parameters (in milliseconds)
  timings: {
    concentrationInterval: 500,   // 0.5s - white circle appears
    cueInterval: 500,            // 0.5s - arrow appears
    actionInterval: 2500,        // 2.5s - perform the mental task
    relaxInterval: 1000,         // 1.0s - blue circle
    restIntervalMin: 1500,       // Minimum rest between trials
    restIntervalMax: 2000,       // Maximum rest between trials
    modeAnnouncementDuration: 3000, // Mode announcement duration
  },
  
  // Experiment states
  state: {
    currentMode: null,  // Default mode: inner-speech, visualized, pronounced
    isRunning: false,
    isPaused: false,
    currentDirection: null,
    currentTrial: 0,
    totalTrials: 40,            // Trials per session
    lastDirection: null,
    sessionStartTime: null,
    questionProbability: 0.15,   // 15% chance to ask a question after a trial
    isConnectedToCrown: false,
    attentionChecks: []
  },
  
  // Available directions
  directions: ['up', 'down', 'left', 'right']
};

// DOM Elements
const elements = {};

// Initialize the experiment
document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  addEventListeners();
  positionElements();
  
  // Handle window resize
  window.addEventListener('resize', positionElements);
});

/**
 * Cache DOM elements for performance
 */
function cacheElements() {
  elements.container = document.getElementById('experiment-container');
  elements.instructionArea = document.getElementById('instruction-area');
  elements.timerArea = document.getElementById('timer-area');
  elements.stimulusArea = document.getElementById('stimulus-area');
  elements.focusCircle = document.getElementById('focus-circle');
  elements.triangles = {
    up: document.getElementById('triangle-up'),
    down: document.getElementById('triangle-down'),
    left: document.getElementById('triangle-left'),
    right: document.getElementById('triangle-right')
  };
  elements.buttons = {
    connect: document.getElementById('btn-connect'),
    inner: document.getElementById('btn-inner'),
    visualized: document.getElementById('btn-visualized'),
    pronounced: document.getElementById('btn-pronounced'),
    start: document.getElementById('btn-start'),
    pause: document.getElementById('btn-pause'),
    stop: document.getElementById('btn-stop'),
    fullscreen: document.getElementById('fullscreen-btn'),
    confirmConnect: document.getElementById('btn-confirm-connect'),
    cancelConnect: document.getElementById('btn-cancel-connect')
  };
  elements.questionPanel = document.getElementById('question-panel');
  elements.feedbackArea = document.getElementById('feedback-area');
  elements.blackBackground = document.getElementById('black-background');
  elements.connectionModal = document.getElementById('connection-modal');
  elements.connectionStatus = document.getElementById('connection-status');
  elements.connectionText = document.getElementById('connection-text');
  elements.statusMessage = document.getElementById('status-message');
  elements.inputs = {
    deviceId: document.getElementById('device-id'),
    email: document.getElementById('email'),
    password: document.getElementById('password')
  };
}

/**
 * Add event listeners to buttons
 */
function addEventListeners() {
  // Mode selection buttons
  elements.buttons.inner.addEventListener('click', () => setMode('inner-speech'));
  elements.buttons.visualized.addEventListener('click', () => setMode('visualized'));
  elements.buttons.pronounced.addEventListener('click', () => setMode('pronounced'));
  
  // Control buttons
  elements.buttons.start.addEventListener('click', startExperiment);
  elements.buttons.pause.addEventListener('click', pauseExperiment);
  elements.buttons.stop.addEventListener('click', stopExperiment);
  
  // Connect button for Crown
  elements.buttons.connect.addEventListener('click', showConnectionModal);
  elements.buttons.confirmConnect.addEventListener('click', connectToCrown);
  elements.buttons.cancelConnect.addEventListener('click', hideConnectionModal);
  
  // Fullscreen button
  elements.buttons.fullscreen.addEventListener('click', toggleFullscreen);
  
  // Direction buttons for attention checks
  document.querySelectorAll('.direction-btn').forEach(btn => {
    btn.addEventListener('click', (e) => checkAttention(e.target.dataset.direction));
  });
}

/**
 * Position elements on the screen
 */
function positionElements() {
  // Position triangles around the circle
  const triangleDistance = 120; // Distance from center to triangle
  
  // Up triangle
  const upTriangle = elements.triangles.up;
  upTriangle.style.top = `calc(50% - ${triangleDistance}px)`;
  upTriangle.style.left = '50%';
  
  // Down triangle
  const downTriangle = elements.triangles.down;
  downTriangle.style.top = `calc(50% + ${triangleDistance}px)`;
  downTriangle.style.left = '50%';
  
  // Left triangle
  const leftTriangle = elements.triangles.left;
  leftTriangle.style.top = '50%';
  leftTriangle.style.left = `calc(50% - ${triangleDistance}px)`;
  
  // Right triangle
  const rightTriangle = elements.triangles.right;
  rightTriangle.style.top = '50%';
  rightTriangle.style.left = `calc(50% + ${triangleDistance}px)`;
}

/**
 * Show the Crown connection modal
 */
function showConnectionModal() {
  elements.connectionModal.style.display = 'flex';
  elements.connectionModal.classList.add('fade-in');
}

/**
 * Hide the Crown connection modal
 */
function hideConnectionModal() {
  elements.connectionModal.classList.remove('fade-in');
  elements.connectionModal.classList.add('fade-out');
  setTimeout(() => {
    elements.connectionModal.style.display = 'none';
    elements.connectionModal.classList.remove('fade-out');
  }, 500);
}

/**
 * Connect to Neurosity Crown device
 */
async function connectToCrown() {
  // If already connected, disconnect
  if (config.state.isConnectedToCrown) {
    updateConnectionStatus('disconnected');
    elements.buttons.connect.textContent = 'Connect Crown';
    config.state.isConnectedToCrown = false;
    hideConnectionModal();
    showStatusMessage('Disconnected from Crown device', 'info');
    return;
  }
  
  // Get credentials from form inputs
  const deviceId = elements.inputs.deviceId.value.trim();
  const email = elements.inputs.email.value.trim();
  const password = elements.inputs.password.value.trim();
  
  if (!deviceId || !email || !password) {
    showStatusMessage('Please enter all required fields', 'error');
    return;
  }
  
  // Disable form while connecting
  setConnectFormState(false);
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
      config.state.isConnectedToCrown = true;
      updateConnectionStatus('connected');
      showStatusMessage('Successfully connected to Crown device!', 'success');
      elements.buttons.connect.textContent = 'Disconnect Crown';
      
      // Wait a moment before closing modal
      setTimeout(() => {
        hideConnectionModal();
        setConnectFormState(true);
      }, 1500);
    } else {
      updateConnectionStatus('disconnected');
      showStatusMessage(`Connection failed: ${data.message}`, 'error');
      setConnectFormState(true);
    }
  } catch (error) {
    console.error('Connection error:', error);
    updateConnectionStatus('disconnected');
    showStatusMessage(`Connection error: ${error.message || 'Unknown error'}`, 'error');
    setConnectFormState(true);
  }
}

/**
 * Set mode for the experiment
 */
function setMode(mode) {
  // Cannot change mode during running experiment
  if (config.state.isRunning && !config.state.isPaused) {
    return;
  }
  
  config.state.currentMode = mode;
  
  // Update UI with visual feedback
  elements.buttons.inner.classList.remove('active');
  elements.buttons.visualized.classList.remove('active');
  elements.buttons.pronounced.classList.remove('active');
  
  // Add active class to selected mode button
  if (mode === 'inner-speech') {
    elements.buttons.inner.classList.add('active');
  } else if (mode === 'visualized') {
    elements.buttons.visualized.classList.add('active');
  } else if (mode === 'pronounced') {
    elements.buttons.pronounced.classList.add('active');
  }
  
  // Update instruction text
  let instructionText = 'Select a mode and press Start Session';
  if (mode === 'inner-speech') {
    instructionText = 'INNER SPEECH MODE: Think the direction word without moving your lips or tongue';
  } else if (mode === 'visualized') {
    instructionText = 'VISUALIZED MODE: Visualize an arrow pointing in the direction';
  } else if (mode === 'pronounced') {
    instructionText = 'PRONOUNCED SPEECH MODE: Say the direction out loud clearly';
  }
  
  elements.instructionArea.textContent = instructionText;
  
  // Enable start button if mode is selected
  elements.buttons.start.disabled = false;
}

/**
 * Start the experiment
 */
async function startExperiment() {
  // Mode must be selected
  if (!config.state.currentMode) {
    showStatusMessage('Please select a mode first (Inner Speech, Visualized, or Pronounced Speech)', 'error');
    return;
  }
  
  // If paused, resume
  if (config.state.isPaused) {
    resumeExperiment();
    return;
  }
  
  // Reset experiment state
  config.state.isRunning = true;
  config.state.isPaused = false;
  config.state.currentTrial = 0;
  config.state.sessionStartTime = Date.now();
  config.state.attentionChecks = generateAttentionChecks();
  
  // Update UI
  elements.buttons.start.disabled = true;
  elements.buttons.pause.disabled = false;
  elements.buttons.stop.disabled = false;
  elements.buttons.inner.disabled = true;
  elements.buttons.visualized.disabled = true;
  elements.buttons.pronounced.disabled = true;
  
  // Show black background for experiment mode (except for pronounced mode)
  if (config.state.currentMode !== 'pronounced') {
    elements.blackBackground.style.display = 'block';
    elements.blackBackground.classList.add('fade-in');
  }
  
  // Start Crown recording if connected
  if (config.state.isConnectedToCrown) {
    try {
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionInfo: {
            mode: config.state.currentMode,
            startTime: new Date().toISOString(),
            totalTrials: config.state.totalTrials
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
  }
  
  // Announce mode and begin
  await announceModeAndWait();
  runNextTrial();
}

/**
 * Generate random points for attention checks
 */
function generateAttentionChecks() {
  const numChecks = Math.floor(config.state.totalTrials * config.state.questionProbability);
  const checks = [];
  
  while (checks.length < numChecks) {
    const trialNum = Math.floor(Math.random() * config.state.totalTrials) + 1;
    if (!checks.includes(trialNum)) {
      checks.push(trialNum);
    }
  }
  
  return checks.sort((a, b) => a - b);
}

/**
 * Announce the experimental mode and wait 3 seconds
 */
async function announceModeAndWait() {
  return new Promise(resolve => {
    const modeMessages = {
      'inner-speech': 'INNER SPEECH MODE: Think the direction word without speaking',
      'visualized': 'VISUALIZATION MODE: Imagine moving in the direction',
      'pronounced': 'PRONOUNCED SPEECH MODE: Say the direction word aloud'
    };
    
    elements.instructionArea.textContent = modeMessages[config.state.currentMode];
    elements.timerArea.textContent = 'Starting in 3...';
    
    setTimeout(() => {
      elements.timerArea.textContent = 'Starting in 2...';
      setTimeout(() => {
        elements.timerArea.textContent = 'Starting in 1...';
        setTimeout(() => {
          elements.timerArea.textContent = '';
          resolve();
        }, 1000);
      }, 1000);
    }, 1000);
  });
}

/**
 * Run the next trial
 */
async function runNextTrial() {
  if (!config.state.isRunning || config.state.isPaused) return;
  
  // Increment trial counter
  config.state.currentTrial++;
  
  // Check if experiment is complete
  if (config.state.currentTrial > config.state.totalTrials) {
    stopExperiment();
    return;
  }
  
  // Update UI
  elements.timerArea.textContent = `Trial ${config.state.currentTrial} of ${config.state.totalTrials}`;
  
  // Calculate random rest interval between trials
  const restDuration = Math.floor(
    Math.random() * (config.timings.restIntervalMax - config.timings.restIntervalMin) + 
    config.timings.restIntervalMin
  );
  
  // Rest interval before starting the trial
  elements.timerArea.textContent = 'Rest...';
  elements.focusCircle.style.backgroundColor = '#4c76b2';  // Blue for rest
  await sleep(restDuration);
  
  if (!config.state.isRunning || config.state.isPaused) return;
  
  // Choose random direction
  const directionIndex = Math.floor(Math.random() * config.directions.length);
  config.state.currentDirection = config.directions[directionIndex];
  config.state.lastDirection = config.state.currentDirection;
  
  // Start trial with Crown if available
  if (config.state.isConnectedToCrown) {
    try {
      const response = await fetch('/api/trial/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trialInfo: {
            trialNumber: config.state.currentTrial,
            direction: config.state.currentDirection,
            condition: config.state.currentMode,
            timestamp: new Date().toISOString()
          }
        })
      });
      
      const data = await response.json();
      if (!data.success) {
        console.error('Failed to start Crown trial:', data.message);
      }
    } catch (error) {
      console.error('Failed to start Crown trial:', error);
    }
  }
  
  // ---- TRIAL SEQUENCE ----
  
  // 1. Concentration interval (0.5s)
  elements.focusCircle.style.display = 'block';
  elements.focusCircle.style.backgroundColor = 'white';
  elements.timerArea.textContent = 'Focus on the circle';
  await sleep(config.timings.concentrationInterval);
  
  if (!config.state.isRunning || config.state.isPaused) return;
  
  // 2. Cue interval (0.5s)
  showDirection(config.state.currentDirection);
  elements.timerArea.textContent = `Cue: ${config.state.currentDirection}`;
  await sleep(config.timings.cueInterval);
  
  if (!config.state.isRunning || config.state.isPaused) return;
  
  // 3. Action interval (2.5s)
  hideAllDirections();
  
  // Different instructions based on mode
  const actionInstructions = {
    'inner-speech': `Think the word: ${config.state.currentDirection}`,
    'visualized': `Imagine moving: ${config.state.currentDirection}`,
    'pronounced': `Say aloud: ${config.state.currentDirection}`
  };
  
  elements.timerArea.textContent = actionInstructions[config.state.currentMode];
  await sleep(config.timings.actionInterval);
  
  if (!config.state.isRunning || config.state.isPaused) return;
  
  // 4. Relax interval (1.0s)
  elements.focusCircle.style.backgroundColor = 'blue';
  elements.timerArea.textContent = 'Relax (don\'t blink)';
  await sleep(config.timings.relaxInterval);
  
  if (!config.state.isRunning || config.state.isPaused) return;
  
  // End of trial
  elements.focusCircle.style.backgroundColor = '';
  elements.timerArea.textContent = '';
  
  // End trial with Crown if available
  if (config.state.isConnectedToCrown) {
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
  
  // Check if we need an attention check
  if (config.state.attentionChecks.includes(config.state.currentTrial)) {
    await showAttentionCheck();
  }
  
  // Continue to the next trial
  runNextTrial();
}

/**
 * Show the specified direction triangle
 */
function showDirection(direction) {
  hideAllDirections();
  elements.triangles[direction].classList.add('show');
}

/**
 * Hide all direction triangles
 */
function hideAllDirections() {
  Object.values(elements.triangles).forEach(triangle => {
    triangle.classList.remove('show');
  });
}

/**
 * Show attention check screen
 */
function showAttentionCheck() {
  return new Promise(resolve => {
    // Pause experiment timer
    config.state.isPaused = true;
    
    // Show question panel with animation
    elements.questionPanel.style.display = 'block';
    elements.questionPanel.classList.add('fade-in');
    elements.feedbackArea.textContent = '';
    
    // Store resolve function to be called after response
    window.attentionCheckResolve = resolve;
  });
}

/**
 * Handle attention check response
 */
function checkAttention(selectedDirection) {
  const correctDirection = config.state.lastDirection;
  const isCorrect = selectedDirection === correctDirection;
  
  // Show feedback
  elements.feedbackArea.textContent = isCorrect ? 
    'Correct! Continuing experiment...' : 
    `Incorrect. The direction was ${correctDirection}. Please pay more attention.`;
  elements.feedbackArea.style.color = isCorrect ? '#4caf50' : '#ff4545';
  
  // Continue experiment after brief delay
  setTimeout(() => {
    elements.questionPanel.classList.add('fade-out');
    
    setTimeout(() => {
      elements.questionPanel.style.display = 'none';
      elements.questionPanel.classList.remove('fade-in', 'fade-out');
      
      // Resume experiment
      config.state.isPaused = false;
      if (window.attentionCheckResolve) {
        window.attentionCheckResolve();
        window.attentionCheckResolve = null;
      }
    }, 500);
  }, 2000);
}

/**
 * Pause the experiment
 */
function pauseExperiment() {
  if (!config.state.isRunning) return;
  
  config.state.isPaused = !config.state.isPaused;
  
  if (config.state.isPaused) {
    elements.buttons.pause.textContent = 'Resume';
    elements.instructionArea.textContent = 'Experiment paused';
    hideAllDirections();
  } else {
    elements.buttons.pause.textContent = 'Pause';
    elements.instructionArea.textContent = '';
    runNextTrial();
  }
}

/**
 * Stop the experiment
 */
async function stopExperiment() {
  if (!config.state.isRunning) return;
  
  config.state.isRunning = false;
  config.state.isPaused = false;
  
  // Reset UI
  elements.buttons.start.disabled = false;
  elements.buttons.pause.disabled = true;
  elements.buttons.stop.disabled = true;
  elements.buttons.inner.disabled = false;
  elements.buttons.visualized.disabled = false;
  elements.buttons.pronounced.disabled = false;
  elements.buttons.pause.textContent = 'Pause';
  
  hideAllDirections();
  elements.focusCircle.style.backgroundColor = 'white';
  
  // Hide black background
  if (elements.blackBackground.style.display === 'block') {
    elements.blackBackground.classList.add('fade-out');
    setTimeout(() => {
      elements.blackBackground.style.display = 'none';
      elements.blackBackground.classList.remove('fade-in', 'fade-out');
    }, 500);
  }
  
  // End session with Crown if available
  if (config.state.isConnectedToCrown) {
    try {
      const response = await fetch('/api/session/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        elements.instructionArea.textContent = `Experiment completed. Data saved to: ${data.filename}`;
        showStatusMessage(`Experiment completed. Data saved to: ${data.filename}`, 'success');
      } else {
        elements.instructionArea.textContent = 'Experiment completed, but there was an error saving data.';
        showStatusMessage('Error saving data: ' + data.message, 'error');
      }
    } catch (error) {
      console.error('Failed to end Crown session:', error);
      elements.instructionArea.textContent = 'Experiment completed, but there was an error saving data.';
      showStatusMessage('Error communicating with server', 'error');
    }
  } else {
    elements.instructionArea.textContent = 'Experiment completed.';
    showStatusMessage('Experiment completed successfully', 'success');
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
 * Enable/disable connection form inputs
 */
function setConnectFormState(enabled) {
  elements.inputs.deviceId.disabled = !enabled;
  elements.inputs.email.disabled = !enabled;
  elements.inputs.password.disabled = !enabled;
  elements.buttons.confirmConnect.disabled = !enabled;
  
  if (!enabled) {
    elements.buttons.confirmConnect.innerHTML = '<div class="loading-spinner"></div> Connecting...';
  } else {
    elements.buttons.confirmConnect.textContent = 'Connect';
  }
}

/**
 * Show a status message
 */
function showStatusMessage(message, type) {
  // Set message in modal if it's open
  if (elements.statusMessage) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = '';
    elements.statusMessage.classList.add(type);
  }
  
  // Always log to console
  if (type === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log(`Error attempting to enable full-screen mode: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

/**
 * Utility function for sleep/delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}