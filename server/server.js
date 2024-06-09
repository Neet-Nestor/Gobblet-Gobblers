const WebSocket = require("ws");

const server = new WebSocket.Server({ port: 8080 });
let players = [];
let gameState = {
  board: Array(3)
    .fill()
    .map(() => Array(3).fill(null)),
  currentPlayer: "X",
  gameStarted: false,
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

// Function to check for a winning combination
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
    const [a, b, c] = pattern;
    if (
      board[a[0]][a[1]] &&
      board[a[0]][a[1]] === board[b[0]][b[1]] &&
      board[a[0]][a[1]] === board[c[0]][c[1]]
    ) {
      return board[a[0]][a[1]];
    }
  }
  return null;
}

// Function to check if the board is full
function isBoardFull(board) {
  return board.every((row) => row.every((cell) => cell !== null));
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
    console.log(
      data.type,
      gameState.gameStarted,
      playerRoles.get(ws),
      gameState.currentPlayer
    );
    if (
      data.type === "move" &&
      gameState.gameStarted &&
      playerRoles.get(ws) === gameState.currentPlayer
    ) {
      const { row, col } = data;
      if (gameState.board[row][col] === null) {
        gameState.board[row][col] = gameState.currentPlayer;

        // Broadcast the move first
        broadcastToAll({
          type: "move",
          row,
          col,
          player: gameState.board[row][col],
          currentPlayer: gameState.currentPlayer, // Current player who made the move
        });

        // Check for a winner after the move
        const winner = checkWin(gameState.board);
        if (winner) {
          // If there's a winner, set game state to not started and notify all clients
          gameState.gameStarted = false;
          broadcastToAll({
            type: "win",
            winner: winner,
          });
        } else if (isBoardFull(gameState.board)) {
          // Check if the board is full and there's no winner: it's a tie
          gameState.gameStarted = false;
          broadcastToAll({
            type: "tie",
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
