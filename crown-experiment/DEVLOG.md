# Directional Thought Experiment - Development Log

**Author**: Carl Kho  
**Date**: March 26, 2025

## Project Overview

This project aims to train the Neurosity Crown 220 headset to recognize directional thoughts using different mental strategies based on EEG signals. The main objective is to investigate which mental strategy yields the best recognition rate for directional commands (up, down, left, right).

## Mental Strategies Being Tested

Based on the recommendations from "Thinking out loud, an open-access EEG-based BCI dataset for inner speech recognition" paper, I'm testing three mental strategies:

1. **Inner Speech**: Thinking about directional words without speaking (mental speech)
2. **Visualization**: Visualizing/imagining the direction without speaking
3. **Pronunciation**: Actually speaking the directional words out loud

## Development Log

### March 26, 2025

#### Initial Setup
- Created basic project structure for experiment
- Implemented HTML/CSS interface for the directional thought experiment
- Started JavaScript implementation based on the paper "EEG BCI Dataset for Inner Speech Recognition"

#### Neurosity Crown Integration
- Successfully integrated with Neurosity Crown BCI device API
- Implemented CrownInterface class for managing device connections and data recording
- Added functions for recording session and trial data

#### Experiment Implementation
- Implemented core workflow for the directional thought experiment:
  - Three modes: Inner Speech, Visualized, and Pronounced Speech
  - Trial sequence with concentration, cue, action, and relax intervals
  - Attention checks to ensure participant engagement
  - Data recording and export functionality
- Added fullscreen mode for better experiment focus
- Added pause/resume functionality

#### Trial Structure
Each trial follows the sequence described in the paper:
1. Concentration interval (0.5s) - White circle appears
2. Cue interval (0.5s) - Direction arrow appears
3. Action interval (2.5s) - User performs mental task (think/visualize/pronounce)
4. Relax interval (1.0s) - Blue circle for relaxation
5. Rest between trials (1.5-2.0s random)

### Next Steps
- Test with actual Neurosity Crown device
- Implement data analysis module for processing recorded EEG data
- Add visualization for recorded data
- Consider adding calibration phase for better signal processing

## Methodology Details

### Training Protocol

- Each training session consists of multiple trials for each direction (up, down, left, right)
- Directions are presented in a randomized order to prevent sequence bias
- Each trial lasts 5 seconds, with a 3-second rest period between trials
- 5 trials per direction in each mental strategy

### Data Collection

- Raw EEG data is collected through the Neurosity SDK
- Signal quality is monitored throughout the session
- Data is saved in JSON format with timestamps for further analysis
- Features extracted include power in different frequency bands (delta, theta, alpha, beta, gamma)

### Analysis Approach

- Comparing frequency patterns between different directions
- Identifying characteristic neural signatures for each direction
- Evaluating which mental strategy provides the most discriminative patterns
- Using statistical methods to quantify the reliability of pattern recognition

## Initial Findings

*To be updated after completing the first training sessions*

## References

- "EEG BCI Dataset for Inner Speech Recognition" (paper included in project folder)
- Neurosity SDK Documentation