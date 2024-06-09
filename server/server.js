const WebSocket = require("ws");

const server = new WebSocket.Server({ port: 8080 });
let players = [];
let gameState = {
  board: [
    [[], [], []],
    [[], [], []],
    [[], [], []],
  ],
  currentPlayer: "X",
  gameStarted: false,
  pieces: {
    X: { small: 2, medium: 2, large: 2 },
    O: { small: 2, medium: 2, large: 2 },
  },
};

const sizeOrder = {
    'small': 1,
    'medium': 2,
    'large': 3
};

// Use a Map to handle player roles
let playerRoles = new Map();

function broadcastToAll(data) {
  players.forEach((player) => {
    player.send(JSON.stringify(data));
  });
}

function broadcastPlayerCount() {
  broadcastToAll({
    type: "playersCount",
    count: players.length,
  });
}

function checkWin(board) {
  const winPatterns = [
    [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    [
      [0, 2],
      [1, 1],
      [2, 0],
    ],
  ];

  for (const pattern of winPatterns) {
    console.log(
      "Checking pattern:",
      pattern.map(([r, c]) => {
        const cell = board[r][c];
        return cell.length > 0
          ? `${cell[cell.length - 1].player} (${cell[cell.length - 1].size})`
          : "empty";
      })
    );

    if (
      pattern.every(
        ([r, c]) =>
          board[r][c].length > 0 &&
          board[r][c][board[r][c].length - 1].player ===
            board[pattern[0][0]][pattern[0][1]][
              board[pattern[0][0]][pattern[0][1]].length - 1
            ].player
      )
    ) {
      return board[pattern[0][0]][pattern[0][1]][
        board[pattern[0][0]][pattern[0][1]].length - 1
      ].player;
    }
  }
  return null;
}

// Function to send available pieces to each player
function updatePlayerPieces(player) {
  if (playerRoles.has(player)) {
    const role = playerRoles.get(player);
    const pieces = gameState.pieces[role];
    player.send(
      JSON.stringify({
        type: "updatePieces",
        pieces: pieces,
      })
    );
  }
}

server.on("connection", (ws) => {
  if (players.length >= 2) {
    ws.close(); // Limit to two players
    return;
  }

  players.push(ws);
  const role = players.length === 1 ? "X" : "O";
  playerRoles.set(ws, role);
  ws.send(JSON.stringify({ type: "roleAssignment", role: role }));
  console.log("connection", players.length);

  if (players.length === 2) {
    gameState.gameStarted = true;
    players.forEach((player) => {
      player.send(
        JSON.stringify({
          type: "start",
          role: playerRoles.get(player),
          currentPlayer: gameState.currentPlayer,
        })
      );
    });
  }

  // Send player count update to all clients
  broadcastPlayerCount();

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    if (
      data.type === "move" &&
      gameState.gameStarted &&
      playerRoles.get(ws) === gameState.currentPlayer
    ) {
      const { row, col, size } = data;
      console.log(data)
      if (gameState.pieces[gameState.currentPlayer][size] > 0) {
        const targetCell = gameState.board[row][col];
        console.log(gameState.board);
        // Ensure the move is valid (e.g., placing on an empty spot or on a smaller piece)
        if (
          targetCell.length === 0 ||
          sizeOrder[size] > sizeOrder[targetCell[targetCell.length - 1].size]
        ) {
          // Apply the move
          targetCell.push({ size: size, player: gameState.currentPlayer });

          console.log(gameState.board);
          gameState.pieces[gameState.currentPlayer][size]--;
          broadcastToAll({
            type: "move",
            row,
            col,
            piece: { size: size, player: gameState.currentPlayer },
          });

          updatePlayerPieces(ws); // Update only the moving player with new piece counts

          // Check for a winner after the move
          const winner = checkWin(gameState.board);
          if (winner) {
            // If there's a winner, set game state to not started and notify all clients
            gameState.gameStarted = false;
            broadcastToAll({
              type: "win",
              winner: winner,
            });
          } else {
            // Switch the current player
            const nextPlayer = gameState.currentPlayer === "X" ? "O" : "X";
            gameState.currentPlayer = nextPlayer;

            // Notify all clients of the turn change
            broadcastToAll({
              type: "updateTurn",
              currentPlayer: gameState.currentPlayer,
            });
          }
        }
      }
    } else if (data.type === "restart") {
      gameState.board = Array(3)
        .fill()
        .map(() => Array(3).fill(null));
      gameState.currentPlayer = "X"; // Optionally switch the starting player on restart
      gameState.gameStarted = true;

      players.forEach((player) => {
        player.send(
          JSON.stringify({
            type: "reset",
            board: gameState.board,
            currentPlayer: gameState.currentPlayer,
          })
        );
      });
    }
  });

  ws.on("close", () => {
    players = players.filter((player) => player !== ws);
    delete gameState.playerRoles[ws];
    if (players.length < 2) {
      gameState.gameStarted = false;
    }
    broadcastPlayerCount();
  });
});
