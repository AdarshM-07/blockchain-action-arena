# Backend Service - Game Round Calculator

Automated service that listens for game events and calls `calculateResult()` from the owner's account when move selection time expires.

## Overview

This service is critical for the on-chain PvP game as it:
- Monitors for new matches via `MatchFound` events
- Tracks all active games in progress
- Triggers round calculation when time expires
- Manages gas costs via owner's account
- Ensures fair, timely round completion

## Setup

### 1. Install dependencies:
```bash
cd backend-service
npm install
```

### 2. Configure in `index.js`:

Update these variables with your deployment details:
```javascript
const RPC_URL = "http://127.0.0.1:8545";           // Your blockchain RPC
const OWNER_PRIVATE_KEY = "0x...";                 // Owner's private key
const GAME_CONSOLE_ADDRESS = "0x...";              // Deployed GameConsole address
```

### 3. Start the service:
```bash
npm start
# or
node index.js
```

## How It Works

1. **Event Listening**
   - Subscribes to `MatchFound` events from GameConsole contract
   - Extracts game address from event data
   
2. **Game Tracking**
   - Stores game in monitoring list with initial metadata
   - Fetches `moveSelectionStartTime` and `moveSelectionDuration`
   
3. **Time Monitoring**
   - Every 5 seconds, checks all active games
   - Calculates if `now >= moveSelectionStartTime + moveSelectionDuration`
   
4. **Round Calculation**
   - When time expires, calls `calculateResult()` on the game contract
   - Transaction is signed with owner's account (covers gas)
   - Emits `RoundCalculated` event which frontend listens for
   
5. **Cleanup**
   - Removes completed games from monitoring
   - Continues monitoring new games

## Configuration

| Variable | Purpose |
|----------|---------|
| `RPC_URL` | Blockchain RPC endpoint (Anvil for local development) |
| `OWNER_PRIVATE_KEY` | Private key of account that pays for gas |
| `GAME_CONSOLE_ADDRESS` | Address of deployed GameConsole contract |

## Troubleshooting

**Service won't start**
- Check Node.js version: `node --version` (should be >= v20.18.3)
- Verify RPC_URL is correct and blockchain is running
- Check OWNER_PRIVATE_KEY format (should start with 0x)

**Games not calculating**
- Verify backend is running and shows "Listening for MatchFound events..."
- Check GAME_CONSOLE_ADDRESS matches your deployment
- Ensure owner account has sufficient ETH for gas fees

**Connection errors**
- Ensure `yarn chain` is running (if using Anvil)
- Verify RPC_URL matches your blockchain setup
- Check firewall/network settings

## Implementation Details

The service uses:
- **ethers.js v6**: For blockchain interaction
- **WebSocket**: For real-time event listening
- **Polling**: 5-second intervals to check game state

## Gas Fee Management

- Owner account pays all `calculateResult()` transaction fees
- Ensure owner has sufficient ETH balance
- For Anvil testnet, first account has unlimited balance by default
