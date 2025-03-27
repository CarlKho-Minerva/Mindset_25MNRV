const fs = require('fs');
const path = require('path');

// Function to load session data from files
function loadSessionData(sessionFilePath) {
  try {
    const data = fs.readFileSync(sessionFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading session data: ${error.message}`);
    return null;
  }
}

// Function to extract features from brainwave data
function extractFeatures(sessionData) {
  if (!sessionData || !sessionData.trials || sessionData.trials.length === 0) {
    console.error('Invalid session data');
    return null;
  }

  const extractedFeatures = {
    mode: sessionData.mode,
    timestamp: sessionData.timestamp,
    directionFeatures: {}
  };

  // Group trials by direction
  const trialsByDirection = {};
  for (const trial of sessionData.trials) {
    if (!trialsByDirection[trial.direction]) {
      trialsByDirection[trial.direction] = [];
    }
    trialsByDirection[trial.direction].push(trial);
  }

  // Extract features for each direction
  for (const [direction, trials] of Object.entries(trialsByDirection)) {
    const directionData = {
      averagePowerByBand: {
        delta: [],
        theta: [],
        alpha: [],
        beta: [],
        gamma: []
      },
      trialCount: trials.length
    };

    // Process each trial for this direction
    for (const trial of trials) {
      if (!trial.brainwaves || trial.brainwaves.length === 0) continue;
      
      // Calculate average power for each frequency band in this trial
      const trialAverages = {
        delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0
      };
      
      let sampleCount = 0;
      for (const sample of trial.brainwaves) {
        const data = sample.data;
        if (!data || !data.data) continue;
        
        // Average across all channels
        for (const channel of data.data) {
          trialAverages.delta += channel.delta || 0;
          trialAverages.theta += channel.theta || 0;
          trialAverages.alpha += channel.alpha || 0;
          trialAverages.beta += channel.beta || 0;
          trialAverages.gamma += channel.gamma || 0;
        }
        sampleCount++;
      }
      
      // Complete the averaging if we have samples
      if (sampleCount > 0) {
        const channelCount = trial.brainwaves[0]?.data?.data?.length || 1;
        const totalSamples = sampleCount * channelCount;
        
        directionData.averagePowerByBand.delta.push(trialAverages.delta / totalSamples);
        directionData.averagePowerByBand.theta.push(trialAverages.theta / totalSamples);
        directionData.averagePowerByBand.alpha.push(trialAverages.alpha / totalSamples);
        directionData.averagePowerByBand.beta.push(trialAverages.beta / totalSamples);
        directionData.averagePowerByBand.gamma.push(trialAverages.gamma / totalSamples);
      }
    }
    
    extractedFeatures.directionFeatures[direction] = directionData;
  }

  return extractedFeatures;
}

// Function to calculate simple statistics from features
function calculateStatistics(features) {
  if (!features || !features.directionFeatures) return null;
  
  const statistics = {
    mode: features.mode,
    timestamp: features.timestamp,
    directionStats: {}
  };
  
  for (const [direction, data] of Object.entries(features.directionFeatures)) {
    statistics.directionStats[direction] = {
      bandAverages: {},
      bandStdDeviations: {}
    };
    
    // Calculate average and standard deviation for each frequency band
    for (const band of ['delta', 'theta', 'alpha', 'beta', 'gamma']) {
      const values = data.averagePowerByBand[band];
      
      // Calculate average
      const average = values.length ? 
        values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      
      // Calculate standard deviation
      let stdDev = 0;
      if (values.length > 0) {
        const squaredDiffs = values.map(val => Math.pow(val - average, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        stdDev = Math.sqrt(variance);
      }
      
      statistics.directionStats[direction].bandAverages[band] = average;
      statistics.directionStats[direction].bandStdDeviations[band] = stdDev;
    }
  }
  
  return statistics;
}

// Function to print analysis results
function printAnalysisResults(statistics) {
  console.log(`\n=== Analysis Results for ${statistics.mode} mode ===`);
  console.log(`Session timestamp: ${statistics.timestamp}\n`);
  
  for (const [direction, stats] of Object.entries(statistics.directionStats)) {
    console.log(`\nDirection: ${direction.toUpperCase()}`);
    console.log('-------------------------------');
    
    console.log('Average power by frequency band:');
    for (const [band, avg] of Object.entries(stats.bandAverages)) {
      console.log(`  ${band.padEnd(5)}: ${avg.toFixed(6)}`);
    }
    
    console.log('\nStandard deviation by frequency band:');
    for (const [band, stdDev] of Object.entries(stats.bandStdDeviations)) {
      console.log(`  ${band.padEnd(5)}: ${stdDev.toFixed(6)}`);
    }
  }
}

// Main analysis function
function analyzeSessionData(filePath) {
  console.log(`Analyzing session data from: ${filePath}`);
  
  const sessionData = loadSessionData(filePath);
  if (!sessionData) {
    console.error('Failed to load session data.');
    return;
  }
  
  const features = extractFeatures(sessionData);
  if (!features) {
    console.error('Failed to extract features from session data.');
    return;
  }
  
  const statistics = calculateStatistics(features);
  if (!statistics) {
    console.error('Failed to calculate statistics from features.');
    return;
  }
  
  printAnalysisResults(statistics);
  
  // Save the analysis results
  const analysisDir = path.join(path.dirname(filePath), '..', 'analysis');
  if (!fs.existsSync(analysisDir)){
    fs.mkdirSync(analysisDir, { recursive: true });
  }
  
  const analysisFilePath = path.join(
    analysisDir, 
    `analysis-${statistics.mode}-${statistics.timestamp}.json`
  );
  
  fs.writeFileSync(analysisFilePath, JSON.stringify(statistics, null, 2));
  console.log(`\nAnalysis results saved to: ${analysisFilePath}`);
}

// If called directly as a script, analyze the file provided as an argument
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Please provide a session data file path to analyze.');
    console.log('Usage: node analyze-data.js <session-data-file.json>');
    process.exit(1);
  }
  
  const filePath = args[0];
  analyzeSessionData(filePath);
}

module.exports = {
  loadSessionData,
  extractFeatures,
  calculateStatistics,
  printAnalysisResults,
  analyzeSessionData
};