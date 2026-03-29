"use client";

// Force Next.js HMR to pick up the new PlayGround.json ABI
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { BattleArena } from "~~/components/BattleArena";
import PlayGroundABI from "~~/contracts/PlayGround.json";
import { useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

type MoveType = 0 | 1 | 2 | 3 | 4 | 5;

type PlayerData = {
  playerAddress: `0x${string}`;
  name: string;
  health: bigint;
  basicAttackCount: bigint;
  mediumAttackCount: bigint;
  specialAttackCount: bigint;
};

export default function GamePage() {
  const params = useParams();
  const gameAddress = params.address as string;
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const router = useRouter();

  const [moves, setMoves] = useState<MoveType[]>([0, 0, 0, 0, 0]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);

  const { writeContractAsync } = useWriteContract();
  const { writeContractAsync: writeClearMatch } = useScaffoldWriteContract({ contractName: "GameConsole" });

  const [isReplaying, setIsReplaying] = useState(false);
  const [hasSubmittedMoves, setHasSubmittedMoves] = useState(false);
  const [replayStep, setReplayStep] = useState(0);
  const [replayP1Moves, setReplayP1Moves] = useState<number[]>([]);
  const [replayP2Moves, setReplayP2Moves] = useState<number[]>([]);
  const [prevGameCount, setPrevGameCount] = useState<number | undefined>(undefined);

  const publicClient = usePublicClient({ chainId: targetNetwork.id });

  useEffect(() => {
    if (!publicClient || !gameAddress) return;
    try {
      const unwatch = publicClient.watchContractEvent({
        address: gameAddress as `0x${string}`,
        abi: PlayGroundABI.abi as any,
        eventName: "RoundCalculated",
        onLogs: logs => {
          if (!logs || !logs[0]) return;
          const firstLog = logs[0] as any;
          const args = firstLog.args as any;
          if (args.p1Moves && args.p2Moves) {
            setIsReplaying(prev => {
              if (!prev) {
                setReplayStep(0);
                setReplayP1Moves([...args.p1Moves]);
                setReplayP2Moves([...args.p2Moves]);
                return true;
              }
              return prev;
            });
          }
        },
      });
      return () => unwatch();
    } catch (e) {
      console.error("Watch event error:", e);
    }
  }, [publicClient, gameAddress]);

  // Replay interval
  useEffect(() => {
    if (!isReplaying) return;

    const interval = setInterval(() => {
      setReplayStep(step => {
        if (step >= 4) {
          clearInterval(interval);
          setTimeout(() => {
            setIsReplaying(false);
          }, 1000); // 1 sec after final step
          return step;
        }
        return step + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isReplaying]);

  // Read game data using wagmi's useReadContract with the dynamic address
  const {
    data: player1Raw,
    error: player1Error,
    isLoading: player1Loading,
    refetch: refetchPlayer1,
  } = useReadContract({
    address: gameAddress as `0x${string}`,
    abi: PlayGroundABI.abi,
    functionName: "player1",
    chainId: targetNetwork.id,
  });

  const player1Data: PlayerData | undefined = useMemo(
    () =>
      player1Raw
        ? {
            playerAddress: (player1Raw as any)[0],
            name: (player1Raw as any)[1],
            health: (player1Raw as any)[2],
            basicAttackCount: (player1Raw as any)[3],
            mediumAttackCount: (player1Raw as any)[4],
            specialAttackCount: (player1Raw as any)[5],
          }
        : undefined,
    [player1Raw],
  );

  const {
    data: player2Raw,
    error: player2Error,
    isLoading: player2Loading,
    refetch: refetchPlayer2,
  } = useReadContract({
    address: gameAddress as `0x${string}`,
    abi: PlayGroundABI.abi,
    functionName: "player2",
    chainId: targetNetwork.id,
  });

  const player2Data: PlayerData | undefined = useMemo(
    () =>
      player2Raw
        ? {
            playerAddress: (player2Raw as any)[0],
            name: (player2Raw as any)[1],
            health: (player2Raw as any)[2],
            basicAttackCount: (player2Raw as any)[3],
            mediumAttackCount: (player2Raw as any)[4],
            specialAttackCount: (player2Raw as any)[5],
          }
        : undefined,
    [player2Raw],
  );

  const { data: moveSelectionStartTime, refetch: refetchMoveSelectionStartTime } = useReadContract({
    address: gameAddress as `0x${string}`,
    abi: PlayGroundABI.abi,
    functionName: "moveSelectionStartTime",
    chainId: targetNetwork.id,
  });

  const { data: moveSelectionDuration } = useReadContract({
    address: gameAddress as `0x${string}`,
    abi: PlayGroundABI.abi,
    functionName: "moveSelectionDuration",
    chainId: targetNetwork.id,
  });

  const { data: gameCount, refetch: refetchGameCount } = useReadContract({
    address: gameAddress as `0x${string}`,
    abi: PlayGroundABI.abi,
    functionName: "gameCount",
    chainId: targetNetwork.id,
  });

  // FALLBACK: If useWatchContractEvent fails (due to Anvil HTTP polling issues),
  // we catch the round change via gameCount and fetch the event manually.
  useEffect(() => {
    if (gameCount !== undefined) {
      const currentCount = Number(gameCount);
      if (prevGameCount !== undefined && currentCount !== prevGameCount && !isReplaying) {
        if (publicClient && gameAddress) {
          publicClient
            .getContractEvents({
              address: gameAddress as `0x${string}`,
              abi: PlayGroundABI.abi as any,
              eventName: "RoundCalculated",
              fromBlock: "earliest",
            })
            .then(logs => {
              if (logs && logs.length > 0) {
                const latestLog = logs[logs.length - 1] as any;
                const args = latestLog.args as any;
                if (args && args.p1Moves && args.p2Moves) {
                  setIsReplaying(prev => {
                    if (!prev) {
                      setReplayStep(0);
                      setReplayP1Moves([...args.p1Moves]);
                      setReplayP2Moves([...args.p2Moves]);
                      return true;
                    }
                    return prev;
                  });
                }
              }
            })
            .catch(console.error);
        }
      }
      setPrevGameCount(currentCount);
    }
  }, [gameCount, prevGameCount, isReplaying, publicClient, gameAddress]);

  const { data: gameState, refetch: refetchGameState } = useReadContract({
    address: gameAddress as `0x${string}`,
    abi: PlayGroundABI.abi,
    functionName: "gameState",
    chainId: targetNetwork.id,
  });

  const { refetch: refetchP1Moves } = useReadContract({
    address: gameAddress as `0x${string}`,
    abi: PlayGroundABI.abi,
    functionName: "P1moves",
    chainId: targetNetwork.id,
  });

  const { refetch: refetchP2Moves } = useReadContract({
    address: gameAddress as `0x${string}`,
    abi: PlayGroundABI.abi,
    functionName: "P2moves",
    chainId: targetNetwork.id,
  });

  const { refetch: refetchPlayer1Moved } = useReadContract({
    address: gameAddress as `0x${string}`,
    abi: PlayGroundABI.abi,
    functionName: "player1Moved",
    chainId: targetNetwork.id,
  });

  const { refetch: refetchPlayer2Moved } = useReadContract({
    address: gameAddress as `0x${string}`,
    abi: PlayGroundABI.abi,
    functionName: "player2Moved",
    chainId: targetNetwork.id,
  });

  // Refetch all game data
  const refetchAllData = useCallback(async () => {
    await Promise.all([
      refetchPlayer1(),
      refetchPlayer2(),
      refetchGameCount(),
      refetchGameState(),
      refetchP1Moves(),
      refetchP2Moves(),
      refetchPlayer1Moved(),
      refetchPlayer2Moved(),
      refetchMoveSelectionStartTime(),
    ]);
  }, [
    refetchPlayer1,
    refetchPlayer2,
    refetchGameCount,
    refetchGameState,
    refetchP1Moves,
    refetchP2Moves,
    refetchPlayer1Moved,
    refetchPlayer2Moved,
    refetchMoveSelectionStartTime,
  ]);

  // Mount effect to avoid hydration errors
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log("Game Address:", gameAddress);
    console.log("Connected Address:", connectedAddress);
    console.log("Player 1 Data:", player1Data);
    console.log("Player 2 Data:", player2Data);
    console.log("Player 1 Error:", player1Error);
    console.log("Player 2 Error:", player2Error);
    console.log("Player 1 Loading:", player1Loading);
    console.log("Player 2 Loading:", player2Loading);
    console.log("Target Network:", targetNetwork);
  }, [
    gameAddress,
    connectedAddress,
    player1Data,
    player2Data,
    player1Error,
    player2Error,
    player1Loading,
    player2Loading,
    targetNetwork,
  ]);

  // Auto-refresh data every 3 seconds to catch backend updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isReplaying) {
        refetchAllData();
        console.log("Auto-refreshing game data...");
      }
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [refetchAllData, isReplaying]);

  // Timer countdown - reset when moveSelectionStartTime changes (new round starts)
  useEffect(() => {
    if (!moveSelectionStartTime || !moveSelectionDuration) return;

    // Immediately update timer when moveSelectionStartTime changes
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = Number(moveSelectionStartTime);
      const duration = Number(moveSelectionDuration);
      const endTime = startTime + duration;

      // Only set time remaining if game has started (after waiting phase)
      if (now >= startTime) {
        const remaining = endTime - now;
        setTimeRemaining(remaining > 0 ? remaining : 0);
      } else {
        // During waiting phase, set to full duration
        setTimeRemaining(duration);
      }
    };

    // Run immediately
    updateTimer();

    // Reset moves and submission flag at the start of every round
    setMoves([0, 0, 0, 0, 0]);
    setHasSubmittedMoves(false);

    // Then run every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [moveSelectionStartTime, moveSelectionDuration]); // Removed timeRemaining from dependencies

  const handleMoveChange = (index: number, value: MoveType) => {
    const newMoves = [...moves];
    newMoves[index] = value;
    setMoves(newMoves);
  };

  const handleSubmitMoves = async () => {
    if (hasSubmittedMoves) return;
    try {
      setHasSubmittedMoves(true);
      await writeContractAsync({
        address: gameAddress as `0x${string}`,
        abi: PlayGroundABI.abi,
        functionName: "PerformMoves",
        args: [moves[0], moves[1], moves[2], moves[3], moves[4]],
      });
    } catch (error) {
      console.error("Error submitting moves:", error);
      alert("Failed to submit moves");
      setHasSubmittedMoves(false); // Allow retry on failure
    }
  };

  const handleGoBackHome = async () => {
    try {
      await writeClearMatch({
        functionName: "clearMatchAddress",
      });
      router.push("/");
    } catch (error) {
      console.error("Error clearing match:", error);
      alert("Failed to clear match address");
    }
  };

  const isPlayer = connectedAddress === player1Data?.playerAddress || connectedAddress === player2Data?.playerAddress;
  const now = isMounted ? Math.floor(Date.now() / 1000) : 0;
  const startTime = Number(moveSelectionStartTime || 0);
  const hasGameStarted = isMounted && now >= startTime;
  const isWaitingPhase = isMounted && now < startTime;
  const waitTimeRemaining = isWaitingPhase ? startTime - now : 0;

  const canSubmitMoves =
    isPlayer &&
    (gameState === 0 || gameState === undefined) &&
    hasGameStarted &&
    timeRemaining > 0 &&
    !isReplaying &&
    !hasSubmittedMoves;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold">Action Arena</h1>
          <button onClick={handleGoBackHome} className="btn btn-outline btn-sm">
            ← Go Back Home
          </button>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Game Contract:</p>
          <Address address={gameAddress} />
        </div>
      </div>

      {/* Small Game Status Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-base-300 rounded-lg p-3 px-6 shadow-md mb-6 font-semibold">
        <div className="text-secondary tracking-widest uppercase text-sm md:border-r border-base-100 pr-6">
          Rounds Remaining: <span className="text-xl text-white ml-2">{gameCount?.toString() || "0"}</span>
        </div>
        <div className="text-primary tracking-widest uppercase text-sm md:border-r border-base-100 px-6">
          State:{" "}
          <span className="text-xl text-white ml-2">
            {gameState === undefined ? "Loading" : gameState === 0 ? "Active" : "Over"}
          </span>
        </div>
        <div className="text-accent tracking-widest uppercase text-sm pl-6">
          Timer:{" "}
          <span className="text-xl text-white ml-2">
            {!isMounted
              ? "..."
              : isWaitingPhase
                ? `Wait ${waitTimeRemaining}s`
                : hasGameStarted
                  ? timeRemaining > 0
                    ? `${timeRemaining}s`
                    : "Time's Up"
                  : "Ready"}
          </span>
        </div>
      </div>

      {/* Replay Overlay Visualizer */}
      {/* Health Bars and Round Counter */}
      <div className="card shadow-2xl mb-0 rounded-b-none border-2 border-primary/30 border-b-0 relative z-10 bg-[#110e24]">
        <div className="card-body pb-6 pt-6">
          <div className="relative flex items-center justify-between">
            {/* Left Health Bar (User) */}
            <div className="w-5/12 max-w-sm">
              <div className="bg-black/90 p-2 px-4 rounded-lg border-2 border-yellow-500/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-2xl">🧙</div>
                  <div className="flex-1 flex gap-2 items-baseline">
                    <p className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
                      {connectedAddress === player1Data?.playerAddress
                        ? player1Data?.name
                        : player2Data?.name || "Player"}
                    </p>
                  </div>
                </div>
                <div className="relative h-4 bg-gray-900 rounded border-2 border-gray-700 overflow-hidden shadow-inner">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 via-red-500 to-yellow-500 transition-all duration-500 shadow-xl"
                    style={{
                      width: `${(Number(connectedAddress === player1Data?.playerAddress ? player1Data?.health : player2Data?.health || 0) / 10) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-md"
                    style={{ textShadow: "1px 1px 2px black" }}
                  >
                    {Number(
                      connectedAddress === player1Data?.playerAddress ? player1Data?.health : player2Data?.health || 0,
                    )}{" "}
                    / 10
                  </div>
                </div>
                {/* Attack Stats Attached to Health Bar */}
                <div className="flex gap-4 mt-2 text-[10px] font-bold text-gray-400 justify-center bg-gray-900/50 rounded py-0.5 border border-gray-800">
                  <span className="text-blue-400">
                    Basic:{" "}
                    {connectedAddress === player1Data?.playerAddress
                      ? player1Data?.basicAttackCount?.toString()
                      : player2Data?.basicAttackCount?.toString() || "0"}
                  </span>
                  <span className="text-purple-400">
                    Med:{" "}
                    {connectedAddress === player1Data?.playerAddress
                      ? player1Data?.mediumAttackCount?.toString()
                      : player2Data?.mediumAttackCount?.toString() || "0"}
                  </span>
                  <span className="text-rose-400">
                    Spec:{" "}
                    {connectedAddress === player1Data?.playerAddress
                      ? player1Data?.specialAttackCount?.toString()
                      : player2Data?.specialAttackCount?.toString() || "0"}
                  </span>
                </div>
              </div>
            </div>

            {/* Round Counter */}
            <div className="z-20 transform -translate-y-2">
              <div
                className="bg-gradient-to-b from-yellow-400 to-orange-500 text-black px-6 py-2 rounded-lg font-black text-xl shadow-[0_4px_15px_rgba(0,0,0,0.8)] border-[3px] border-yellow-600 tracking-wider"
                style={{ textShadow: "1px 1px 0px white" }}
              >
                ROUND {6 - (gameCount ? Number(gameCount) : 0)}
              </div>
            </div>

            {/* Right Health Bar (Opponent) */}
            <div className="w-5/12 max-w-sm">
              <div className="bg-black/90 p-2 px-4 rounded-lg border-2 border-yellow-500/50">
                <div className="flex items-center gap-2 mb-1 justify-end">
                  <div className="flex-1 flex gap-2 items-baseline justify-end">
                    <p className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
                      {connectedAddress === player1Data?.playerAddress
                        ? player2Data?.name
                        : player1Data?.name || "Player"}
                    </p>
                  </div>
                  <div className="text-2xl">👺</div>
                </div>
                <div className="relative h-4 bg-gray-900 rounded border-2 border-gray-700 overflow-hidden shadow-inner flex justify-end">
                  <div
                    className="absolute top-0 right-0 h-full bg-gradient-to-l from-red-600 via-red-500 to-yellow-500 transition-all duration-500 shadow-xl"
                    style={{
                      width: `${(Number(connectedAddress === player1Data?.playerAddress ? player2Data?.health : player1Data?.health || 0) / 10) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-md"
                    style={{ textShadow: "1px 1px 2px black" }}
                  >
                    {Number(
                      connectedAddress === player1Data?.playerAddress ? player2Data?.health : player1Data?.health || 0,
                    )}{" "}
                    / 10
                  </div>
                </div>
                {/* Attack Stats Attached to Health Bar */}
                <div className="flex gap-4 mt-2 text-[10px] font-bold text-gray-400 justify-center bg-gray-900/50 rounded py-0.5 border border-gray-800">
                  <span className="text-blue-400">
                    Basic:{" "}
                    {connectedAddress === player1Data?.playerAddress
                      ? player2Data?.basicAttackCount?.toString()
                      : player1Data?.basicAttackCount?.toString() || "0"}
                  </span>
                  <span className="text-purple-400">
                    Med:{" "}
                    {connectedAddress === player1Data?.playerAddress
                      ? player2Data?.mediumAttackCount?.toString()
                      : player1Data?.mediumAttackCount?.toString() || "0"}
                  </span>
                  <span className="text-rose-400">
                    Spec:{" "}
                    {connectedAddress === player1Data?.playerAddress
                      ? player2Data?.specialAttackCount?.toString()
                      : player1Data?.specialAttackCount?.toString() || "0"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Replay Overlay Visualizer (Now Always Visible) */}
      <div className="mb-8 relative z-0">
        <BattleArena
          replayStep={replayStep}
          p1Moves={replayP1Moves}
          p2Moves={replayP2Moves}
          p1Name={player1Data?.name || "Player 1"}
          p2Name={player2Data?.name || "Player 2"}
          isReplaying={isReplaying}
          isReversePerspective={connectedAddress === player2Data?.playerAddress}
        />
      </div>
      {/* Move Selection */}
      {!isPlayer && (
        <div className="alert alert-warning shadow-lg mb-6">
          <div className="w-full">
            <div className="flex items-start gap-2 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current flex-shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>You are not a player in this game. Connect with a player&apos;s wallet to participate.</span>
            </div>
            <div className="text-xs mt-2 opacity-70">
              <p>Connected: {connectedAddress || "No wallet connected"}</p>
              <p>Player 1: {player1Data?.playerAddress || "Loading..."}</p>
              <p>Player 2: {player2Data?.playerAddress || "Loading..."}</p>
            </div>
          </div>
        </div>
      )}

      {isPlayer && (gameState === 0 || gameState === undefined) && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">Select Your Moves (5 moves per round)</h2>
            {!hasGameStarted && <p className="text-warning text-sm mb-4">⏳ Game will start soon...</p>}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {moves.map((move, index) => (
                <div
                  key={index}
                  className="form-control bg-base-300 p-3 rounded-xl border border-base-200 shadow-inner"
                >
                  <label className="label py-1">
                    <span className="label-text font-bold text-primary">Move {index + 1}</span>
                  </label>
                  <select
                    className="select select-bordered select-sm w-full font-semibold focus:outline-none focus:border-primary"
                    value={move}
                    onChange={e => handleMoveChange(index, Number(e.target.value) as MoveType)}
                    disabled={!canSubmitMoves}
                  >
                    <option value={0}>🛡️ Stay</option>
                    <option value={1}>⬆️ Up</option>
                    <option value={2}>⬇️ Down</option>
                    <option value={3}>⚔️ Basic (1💥)</option>
                    <option value={4}>🔥 Medium (2💥)</option>
                    <option value={5}>⚡ Special (3💥)</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="card-actions justify-end mt-4">
              <button className="btn btn-primary btn-lg" onClick={handleSubmitMoves} disabled={!canSubmitMoves}>
                {hasSubmittedMoves ? "✅ Moves Submitted" : "Submit All Moves"}
              </button>
            </div>
            {!canSubmitMoves && hasGameStarted && timeRemaining === 0 && (
              <p className="text-error text-sm mt-2">Time&apos;s up! Waiting for round calculation...</p>
            )}
          </div>
        </div>
      )}

      {/* Game Over */}
      {typeof gameState === "number" && Number(gameState) === 1 && (
        <div className="alert alert-info shadow-lg">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current flex-shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <h3 className="font-bold">Game Over!</h3>
              <div className="text-xs">
                Winner:{" "}
                {(player1Data?.health ?? 0n) > (player2Data?.health ?? 0n)
                  ? `Player 1 (${player1Data?.name})`
                  : (player2Data?.health ?? 0n) > (player1Data?.health ?? 0n)
                    ? `Player 2 (${player2Data?.name})`
                    : "Draw"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
