# Directional Thought Recognition with Neurosity Crown

This project implements a training system for recognizing directional thoughts (up, down, left, right) using the Neurosity Crown EEG headset. It explores three mental strategies for commanding direction through brain signals:

1. Inner Speech: Thinking about directional words without speaking
2. Visualization: Visualizing/imagining the direction without speaking
3. Pronunciation: Actually speaking the directional words out loud

## Setup

### Prerequisites

- Neurosity Crown device (Crown 220)
- Node.js (v12 or higher)
- npm (v6 or higher)

### Installation

1. Clone or download this repository
2. Install dependencies:
```
npm install
```

3. Configure your Neurosity credentials:
   - Edit the `.env` file in the project root
   - Add your Neurosity email, password, and device ID:
```
EMAIL=your_email@example.com
PASSWORD=your_password
DEVICE_ID=your_device_id
```

## Usage

### Running a Training Session

1. Ensure your Crown device is turned on and connected
2. Run the directional training script:
```
node src/directional-training.js
```

3. Follow the on-screen instructions:
   - The script will authenticate with your Crown device
   - Check signal quality before starting
   - Guide you through trials for each mental strategy
   - Automatically save collected data for analysis

### Analyzing Collected Data

After completing training sessions, you can analyze the collected data:

```
node src/analyze-data.js data/[session-file-name].json
```

Replace `[session-file-name].json` with the name of the session data file you want to analyze.

## Project Structure

```
crown-experiment/
├── .env                   # Environment variables (credentials)
├── DEVLOG.md              # Development log and progress notes
├── README.md              # This file
├── package.json           # Project dependencies
├── data/                  # Folder for collected session data
│   └── ...                # Session data files (generated during training)
├── src/                   # Source code
│   ├── directional-training.js  # Main training script
│   └── analyze-data.js    # Data analysis utility
└── analysis/              # Analysis results (generated during analysis)
    └── ...                # Analysis files
```

## Customization

You can customize the training parameters by editing the constants at the top of `src/directional-training.js`:

- `DIRECTIONS`: The directions to include in training
- `MODES`: The mental strategies to test
- `SESSION_DURATION`: Duration of each trial in milliseconds
- `TRIALS_PER_DIRECTION`: Number of trials for each direction
- `REST_DURATION`: Rest time between trials in milliseconds

## Troubleshooting

### Connection Issues

If you're having trouble connecting to your Crown device:

1. Make sure your Crown device is turned on and has sufficient battery
2. Verify your credentials in the `.env` file
3. Ensure your device has an active internet connection
4. Try restarting your Crown device

### Signal Quality Issues

If signal quality is poor:

1. Adjust the headset to ensure good contact with your scalp
2. Make sure the electrodes are clean
3. Try wetting the electrodes slightly for better conductivity
4. Sit in a quiet environment with minimal electrical interference

## Further Development

Check DEVLOG.md for ongoing progress notes and plans for further development.