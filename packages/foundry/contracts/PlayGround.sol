//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PlayGround {
    address public owner;
    uint8 public gameCount = 5;
    uint256 public moveSelectionStartTime;
    uint256 public constant moveSelectionDuration = 30;
    uint256 public constant waitDuration = 10;
    enum Gamestate {
        Active,
        Over
    }
    Gamestate public gameState;

    event RoundCalculated(
        uint8 roundNumber,
        uint256 player1Health,
        uint256 player2Health,
        uint256 nextRoundStartTime,
        uint8[5] p1Moves,
        uint8[5] p2Moves
    );

    modifier activeGame() {
        require(gameState == Gamestate.Active, "Game is Ended");
        _;
    }
    uint8 P1initstate = 0;
    uint8 P2initstate = 0;
    struct Player {
        address playerAddress;
        string name;
        uint256 health;
        uint8 basicAttackCount;
        uint8 mediumAttackCount;
        uint8 specialAttackCount;
    }

    Player public player1;
    Player public player2;

    // Replaced Moves struct with fixed-size arrays — eliminates getMoveByIndex dispatch
    uint8[6] public P1moves;
    uint8[6] public P2moves;

    constructor(
        address _owner,
        address _player1,
        string memory _name1,
        address _player2,
        string memory _name2
    ) payable {
        owner = _owner;
        moveSelectionStartTime = block.timestamp + waitDuration;
        player1 = Player(_player1, _name1, 10, 3, 2, 1);
        player2 = Player(_player2, _name2, 10, 3, 2, 1);
        gameState = Gamestate.Active;
    }

    bool public player1Moved = false;
    bool public player2Moved = false;

    function PerformMoves(
        uint8 _move1,
        uint8 _move2,
        uint8 _move3,
        uint8 _move4,
        uint8 _move5
    ) public activeGame {
        require(
            msg.sender == player1.playerAddress ||
                msg.sender == player2.playerAddress,
            "Only registered players can perform moves"
        );
        require(
            block.timestamp <= moveSelectionStartTime + moveSelectionDuration,
            "Move selection period has ended"
        );
        require(
            block.timestamp > moveSelectionStartTime,
            "Game has not started yet"
        );

        // Auto-convert attacks to stay if exhausted within the 5 moves
        Player memory currentPlayer = msg.sender == player1.playerAddress
            ? player1
            : player2;
        uint8[5] memory moves = [_move1, _move2, _move3, _move4, _move5];
        uint8 basicRemaining = currentPlayer.basicAttackCount;
        uint8 mediumRemaining = currentPlayer.mediumAttackCount;
        uint8 specialRemaining = currentPlayer.specialAttackCount;

        for (uint i = 0; i < 5; i++) {
            if (moves[i] == 3) {
                if (basicRemaining > 0) {
                    basicRemaining--;
                } else {
                    moves[i] = 0;
                }
            } else if (moves[i] == 4) {
                if (mediumRemaining > 0) {
                    mediumRemaining--;
                } else {
                    moves[i] = 0;
                }
            } else if (moves[i] == 5) {
                if (specialRemaining > 0) {
                    specialRemaining--;
                } else {
                    moves[i] = 0;
                }
            }
        }

        // Write directly to storage array — no intermediate copy needed
        if (msg.sender == player1.playerAddress) {
            P1moves[0] = moves[0];
            P1moves[1] = moves[1];
            P1moves[2] = moves[2];
            P1moves[3] = moves[3];
            P1moves[4] = moves[4];
            P1moves[5] = 0;
            player1.basicAttackCount = basicRemaining;
            player1.mediumAttackCount = mediumRemaining;
            player1.specialAttackCount = specialRemaining;
            player1Moved = true;
        } else {
            P2moves[0] = moves[0];
            P2moves[1] = moves[1];
            P2moves[2] = moves[2];
            P2moves[3] = moves[3];
            P2moves[4] = moves[4];
            P2moves[5] = 0;
            player2.basicAttackCount = basicRemaining;
            player2.mediumAttackCount = mediumRemaining;
            player2.specialAttackCount = specialRemaining;
            player2Moved = true;
        }
    }

    function calculateResult() public activeGame {
        require(
            block.timestamp >= moveSelectionStartTime + moveSelectionDuration ||
                (player1Moved && player2Moved),
            "Result calculation not allowed yet"
        );
        gameCount--;

        // Load all moves into memory once — replaces ~20+ getMoveByIndex calls
        uint8[6] memory p1m;
        uint8[6] memory p2m;
        for (uint i = 0; i < 6; i++) {
            p1m[i] = P1moves[i];
            p2m[i] = P2moves[i];
        }

        uint8[5] memory p1MovesArray;
        uint8[5] memory p2MovesArray;
        for (uint i = 0; i < 5; i++) {
            p1MovesArray[i] = p1m[i];
            p2MovesArray[i] = p2m[i];
        }

        // Compute position states — direct array access instead of getMoveByIndex
        uint8[6] memory P1states;
        uint8[6] memory P2states;

        for (uint i = 0; i < 6; i++) {
            if (p1m[i] == 0) {
                P1states[i] = P1initstate;
            } else if (p1m[i] == 1) {
                P1states[i] = 1;
            } else if (p1m[i] == 2) {
                P1states[i] = 0;
            }
            if (p2m[i] == 0) {
                P2states[i] = P2initstate;
            } else if (p2m[i] == 1) {
                P2states[i] = 1;
            } else if (p2m[i] == 2) {
                P2states[i] = 0;
            }

            P1initstate = P1states[i];
            P2initstate = P2states[i];
        }

        // Calculate damage — all lookups via cached memory arrays
        uint8 p1Damage = 0;
        uint8 p2Damage = 0;
        for (uint i = 0; i < 5; i++) {
            uint8 p1Move = p1m[i];
            uint8 p2Move = p2m[i];

            if (p1Move >= 3 && P1states[i] == P2states[i + 1]) {
                int8 damage = int8(p1Move) - 2;
                if (i > 0 && p2m[i - 1] >= 3 && P1states[i] == P2states[i - 1]) {
                    damage = damage - int8(p2m[i - 1] - 2);
                }
                if (p2Move >= 3 && P1states[i] == P2states[i]) {
                    damage = damage - int8(p2Move - 2);
                }
                if (p2m[i + 1] >= 3) {
                    damage = damage - int8(p2m[i + 1] - 2);
                }
                p2Damage += damage > 0 ? uint8(damage) : 0;
            }
            if (p2Move >= 3 && P2states[i] == P1states[i + 1]) {
                int8 damage = int8(p2Move) - 2;
                if (i > 0 && p1m[i - 1] >= 3 && P2states[i] == P1states[i - 1]) {
                    damage = damage - int8(p1m[i - 1] - 2);
                }
                if (p1Move >= 3 && P2states[i] == P1states[i]) {
                    damage = damage - int8(p1Move - 2);
                }
                if (p1m[i + 1] >= 3) {
                    damage = damage - int8(p1m[i + 1] - 2);
                }
                p1Damage += damage > 0 ? uint8(damage) : 0;
            }
        }

        if (p1Damage >= player1.health) {
            player1.health = 0;
        } else {
            player1.health -= p1Damage;
        }

        if (p2Damage >= player2.health) {
            player2.health = 0;
        } else {
            player2.health -= p2Damage;
        }

        if (player1.health == 0 || player2.health == 0 || gameCount == 0) {
            gameOver();
            gameState = Gamestate.Over;
            emit RoundCalculated(gameCount, player1.health, player2.health, 0, p1MovesArray, p2MovesArray);
        } else {
            moveSelectionStartTime = block.timestamp + waitDuration;
            // Reset storage arrays
            for (uint i = 0; i < 6; i++) {
                P1moves[i] = 0;
                P2moves[i] = 0;
            }
            player1Moved = false;
            player2Moved = false;
            emit RoundCalculated(
                gameCount,
                player1.health,
                player2.health,
                moveSelectionStartTime,
                p1MovesArray,
                p2MovesArray
            );
        }
    }

    function gameOver() internal {
        if (player1.health == player2.health) {
            (bool success, ) = payable(owner).call{value: address(this).balance}("");
            require(success, "Transfer failed");
        } else if (player1.health < player2.health) {
            (bool success, ) = payable(player2.playerAddress).call{
                value: 0.0015 ether
            }("");
            require(success, "Transfer failed");
            (bool success2, ) = payable(owner).call{value: 0.0005 ether}("");
            require(success2, "Transfer failed");
        } else if (player2.health < player1.health) {
            (bool success, ) = payable(player1.playerAddress).call{
                value: 0.0015 ether
            }("");
            require(success, "Transfer failed");
            (bool success2, ) = payable(owner).call{value: 0.0005 ether}("");
            require(success2, "Transfer failed");
        }
    }
}
