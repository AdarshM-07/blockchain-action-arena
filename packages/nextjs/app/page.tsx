"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { parseEther } from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const [playerName, setPlayerName] = useState("");
  const { writeContractAsync: writeFindMatch } = useScaffoldWriteContract("GameConsole");
  const { writeContractAsync: writeCancelMatch } = useScaffoldWriteContract("GameConsole");
  const router = useRouter();

  const { data: PlayGroundAddress } = useScaffoldReadContract({
    contractName: "GameConsole",
    functionName: "getMatchAddress",
    args: [connectedAddress],
  });

  const { data: waitingPlayer } = useScaffoldReadContract({
    contractName: "GameConsole",
    functionName: "waitingPlayer",
  });

  const isWaiting =
    waitingPlayer &&
    waitingPlayer !== "0x0000000000000000000000000000000000000000" &&
    waitingPlayer === connectedAddress;

  useEffect(() => {
    if (PlayGroundAddress && PlayGroundAddress !== "0x0000000000000000000000000000000000000000") {
      router.push(`/game/${PlayGroundAddress}`);
    }
  }, [PlayGroundAddress, router]);

  const handleFindMatch = async () => {
    if (!playerName.trim()) {
      alert("Please enter your player name!");
      return;
    }

    try {
      await writeFindMatch({
        functionName: "findMatch",
        args: [playerName],
        value: parseEther("0.001"),
      });
    } catch (error) {
      console.error("Error finding match:", error);
    }
  };

  const handleCancelMatch = async () => {
    try {
      await writeCancelMatch({
        functionName: "cancelMatch",
      });
    } catch (error) {
      console.error("Error canceling match:", error);
    }
  };
  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">Action Arena</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address
              address={connectedAddress}
              chain={targetNetwork}
              blockExplorerAddressLink={
                targetNetwork.id === hardhat.id ? `/blockexplorer/address/${connectedAddress}` : undefined
              }
            />
          </div>
          <div className="mt-10 flex flex-col space-y-4 items-center">
            <div className="w-full max-w-md">
              <input
                type="text"
                placeholder="Enter your player name"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                className="input input-bordered w-full"
              />
            </div>
            {!isWaiting ? (
              <button onClick={handleFindMatch} className="btn btn-primary flex items-center space-x-2">
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span>Find Match (0.001 ETH)</span>
              </button>
            ) : (
              <div className="flex flex-col space-y-2 items-center">
                <div className="text-lg font-semibold text-warning">⏳ Waiting for opponent...</div>
                <button onClick={handleCancelMatch} className="btn btn-error btn-sm">
                  Cancel Match
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
