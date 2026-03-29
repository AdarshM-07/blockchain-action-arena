# ⚔️ Blockchain Action Arena

**A fully on-chain PvP fighting game built on Ethereum with real-time blockchain interaction, smart contract-based matchmaking, and automated round calculation using event-driven architecture.**

## 🎮 Overview

This is a fully on-chain fighting game where players:
- Deposit 0.001 ETH to enter matchmaking
- Battle for 5 rounds with 30-second move selection per round
- Use strategic positioning (up/down) and attacks (basic/medium/special)
- Winner takes 0.0015 ETH, owner receives 0.0005 ETH platform fee

⚙️ Built using **Next.js 15**, **Foundry**, **Wagmi v2**, **Viem**, and **TypeScript** (Scaffold-ETH 2).

## ✨ Features

- ✅ **Decentralized Matchmaking**: Players find opponents via smart contract
- ⚔️ **5-Round Combat**: Strategic battles with health management (starts at 10)
- 🎯 **Attack Varieties**: Basic (1💥), Medium (2💥), Special (3💥) with limited uses
- 🔄 **Auto Round Calculation**: Backend service triggers results from owner's account
- ⏱️ **Real-time Updates**: Game state refreshes every 3 seconds
- 🎨 **Side-by-side UI**: Clean interface showing both players' stats
- 🛡️ **Attack Exhaustion**: Automatic conversion to "stay" when attacks depleted
- 💰 **Prize Pool**: 0.0015 ETH to winner, 0.0005 ETH platform fee

## 🏗️ Architecture

### Smart Contracts (Solidity)
- **GameConsole.sol**: Matchmaking system, emits `MatchFound` events
- **PlayGround.sol**: Individual game logic with 5 rounds, damage calculation, prize distribution

### Frontend (Next.js 15 + TypeScript)
- Real-time battle interface with animated arena
- Move selection UI with 6 strategic options
- Auto-refresh player stats every 3 seconds
- Responsive design with TailwindCSS + DaisyUI
- Integrated block explorer view

### Backend Service (Node.js)
- Monitors active games via `MatchFound` contract events
- Tracks game completion time per round
- Automatically calls `calculateResult()` when move selection expires
- Runs from owner's account to pay gas fees

## 🛠️ Tech Stack

- **Blockchain**: Ethereum (Anvil local testnet)
- **Contracts**: Solidity ^0.8.0, Foundry
- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS, DaisyUI
- **Web3**: wagmi v2, viem
- **Backend**: Node.js, ethers.js v6

## 📦 Requirements & Installation

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## 🚀 Quickstart

### 1. Clone and install

```bash
git clone https://github.com/AdarshM-07/blockchain-action-arena
cd blockchain-action-arena
yarn install
```

### 2. Run a local blockchain

```bash
yarn chain
```

This starts an Anvil local Ethereum network on `http://127.0.0.1:8545`.

### 3. Deploy contracts (in a new terminal)

```bash
yarn deploy
```

This deploys GameConsole and PlayGround contracts. Note the GameConsole address from the output.

### 4. Setup and start backend service (in a new terminal)

```bash
cd backend-service
npm install
```

Edit `backend-service/index.js` and update:
- `GAME_CONSOLE_ADDRESS`: Use the address from step 3
- `OWNER_PRIVATE_KEY`: Default is first Anvil account (already set)

```bash
npm start
```

### 5. Start the frontend (in a new terminal)

```bash
cd packages/nextjs
yarn dev
```

Visit your app on: `http://localhost:3000`

## 🎯 How to Play

### Step 1: Find a Match
1. Connect your wallet (use Anvil test accounts)
2. Click "Find Match" and deposit 0.001 ETH
3. Wait for another player to join

### Step 2: Battle
- **Waiting Phase** (10s): Prepare your strategy
- **Move Selection** (30s): Choose 5 moves:
  - **No Move**: Stay in position
  - **Move Up/Down**: Change lanes
  - **Basic Attack**: 1 damage (3 available)
  - **Medium Attack**: 2 damage (2 available)
  - **Special Attack**: 3 damage (1 available)
- Submit your moves before time runs out

### Step 3: Round Results
- Backend automatically calculates when time expires
- Damage is dealt based on positioning and timing
- Game refreshes with updated health and attack counts

### Step 4: Victory
- Game ends after 5 rounds or when a player reaches 0 health
- Winner receives 0.0015 ETH
- Owner receives 0.0005 ETH platform fee

## 📁 Project Structure

```
blockchain-action-arena/
├── packages/
│   ├── foundry/              # Smart contracts
│   │   ├── contracts/
│   │   │   ├── GameConsole.sol
│   │   │   └── PlayGround.sol
│   │   ├── script/
│   │   │   ├── Deploy.s.sol
│   │   │   ├── DeployHelpers.s.sol
│   │   │   └── VerifyAll.s.sol
│   │   └── test/             # Contract tests
│   └── nextjs/               # Frontend (Next.js 15)
│       ├── app/
│       │   ├── page.tsx      # Home page (matchmaking)
│       │   ├── game/[address]/page.tsx  # Game battle page
│       │   └── blockexplorer/
│       ├── components/
│       │   ├── BattleArena.tsx       # Game visualization
│       │   ├── Header.tsx
│       │   └── Footer.tsx
│       └── contracts/        # Contract ABIs
└── backend-service/          # Automated round calculation
    ├── index.js
    └── package.json
```

## 🎮 Game Mechanics

### Attack System
- **Basic Attack (3 uses)**: 1 damage per attack
- **Medium Attack (2 uses)**: 2 damage per attack
- **Special Attack (1 use)**: 3 damage per attack
- Attacks auto-convert to "Stay" when all uses are exhausted

### Positioning & Defense
- **Up Position**: Move to upper lane
- **Down Position**: Move to lower/ground lane
- **Stay**: Remain in current position
- Attacks only hit if both players are in the same lane

### Damage Calculation
- Damage is applied based on positioning during move calculation
- Player health starts at 10 and decreases with each successful attack
- Game ends when a player reaches 0 health or after 5 rounds

### Timer System
- **10 seconds**: Waiting phase (new round prep)
- **30 seconds**: Move selection phase (choose and submit 5 moves)
- **Auto-calculation**: Backend triggers `calculateResult()` when time expires

## 🐛 Troubleshooting

**Frontend won't start**
- Ensure you're in `packages/nextjs` directory
- Try: `rm -rf .next node_modules && yarn install && yarn dev`
- Check that port 3000 is not in use

**Backend not working**
- Check `GAME_CONSOLE_ADDRESS` matches deployed address in `backend-service/index.js`
- Verify blockchain is running: `yarn chain`
- Check backend console for connection errors

**Timer shows "Time's Up" during waiting phase**
- Refresh the page
- Check browser console for errors
- Verify local blockchain is still running

**Can't submit moves**
- Ensure you're one of the two players in the game
- Verify timer shows positive seconds (not in waiting phase)
- Check that your wallet is properly connected

**Game state not updating**
- Backend service must be running to calculate results
- Check `npm start` output in backend-service terminal
- Verify `OWNER_PRIVATE_KEY` has sufficient balance for gas fees

## 🔧 Development

**Run contract tests:**
```bash
cd packages/foundry
forge test
```

**Redeploy contracts:**
```bash
yarn deploy
```

**Clean build cache:**
```bash
rm -rf packages/nextjs/.next
```

## 📝 Smart Contract Details

### GameConsole
- `findMatch()`: Enter matchmaking with 0.001 ETH
- `cancelMatch()`: Get refund if no opponent found
- `clearMatchAddress()`: Remove game mapping after completion

### PlayGround
- `PerformMoves()`: Submit 5 moves for current round
- `calculateResult()`: Process round (called by owner/backend)
- Emits `RoundCalculated` event on completion

## ✅ Recent Updates

- ✨ Improved game page rendering with optimized React hooks
- 🔧 Enhanced BattleArena component with better memoization
- 🎨 Refined UI with better player positioning visualization
- 📝 Fixed all ESLint warnings and TypeScript errors
- 🚀 Improved code quality and performance

## 🚀 Future Enhancements

- [ ] Advanced replay system (already has basic replay)
- [ ] Leaderboard and player statistics
- [ ] Ranked matchmaking with ELO rating
- [ ] NFT rewards for winners
- [ ] Mobile optimization
- [ ] Multi-game dashboard
- [ ] Chat during matchmaking
- [ ] Custom avatar support

## 📞 Support

For issues or questions, please open an issue on GitHub.

