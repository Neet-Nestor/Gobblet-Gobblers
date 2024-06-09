class GobbletGobblers {
  constructor() {
    this.board = Array(3)
      .fill()
      .map(() => Array(3).fill(null));
    this.currentPlayer = "X";
    this.gameStarted = false;
    this.role = null;
    this.ws = new WebSocket("ws://localhost:8080");

    this.ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      switch (data.type) {
        case "playersCount":
          document.getElementById(
            "players-count"
          ).textContent = `Connected Players: ${data.count}`;
          break;
        case "roleAssignment":
          this.role = data.role;
          document.getElementById(
            "role-info"
          ).textContent = `Your role: ${this.role}`;
          break;
        case "start":
            console.log("start")
          this.gameStarted = true;
          this.currentPlayer = data.currentPlayer;
          document.getElementById(
            "status"
          ).textContent = `Game started! It's ${this.currentPlayer}'s turn.`;
          break;
        case "move":
          this.board[data.row][data.col] = data.player;
          this.currentPlayer = data.currentPlayer;
          this.updateBoard();
          document.getElementById(
            "status"
          ).textContent = `It's ${this.currentPlayer}'s turn.`;
          break;
        case "win":
          this.gameStarted = false;
          document.getElementById(
            "status"
          ).textContent = `Player ${data.winner} wins!`;
          document.getElementById("restart-button").style.display = "block";
          break;
        case "tie":
          this.gameStarted = false;
          document.getElementById("status").textContent = "It's a tie!";
          document.getElementById("restart-button").style.display = "block";
          break;
        case "reset":
          this.board = data.board;
          this.currentPlayer = data.currentPlayer;
          this.gameStarted = true;
          this.updateBoard();
          document.getElementById(
            "status"
          ).textContent = `Game reset. It's ${this.currentPlayer}'s turn.`;
          document.getElementById("restart-button").style.display = "none";
          break;
        case "updateTurn":
          this.currentPlayer = data.currentPlayer;
          document.getElementById(
            "status"
          ).textContent = `It's now ${this.currentPlayer}'s turn.`;
          break;
      }
    };

    this.createBoard();
    this.addRestartButtonListener();
  }

  addRestartButtonListener() {
    const restartButton = document.getElementById("restart-button");
    restartButton.addEventListener("click", () => {
      this.ws.send(JSON.stringify({ type: "restart" }));
      restartButton.style.display = "none";
    });
  }

  createBoard() {
    const gameBoard = document.getElementById("game-board");
    gameBoard.innerHTML = ""; // Clear the previous board
    this.board.forEach((row, i) => {
      row.forEach((cell, j) => {
        const cellDiv = document.createElement("div");
        cellDiv.className = "cell";
        cellDiv.dataset.row = i;
        cellDiv.dataset.col = j;
        cellDiv.textContent = this.board[i][j] || "-"; // Showing dash for empty cells
        cellDiv.addEventListener("click", () => {
          console.log(`Cell clicked: ${i}, ${j}`); // Debug: Log when cell is clicked
          this.makeMove(i, j);
        });
        gameBoard.appendChild(cellDiv);
      });
    });
  }

  makeMove(row, col) {
    console.log(`Role: ${this.role}, CurrentPlayer: ${this.currentPlayer}`);
    if (
      this.board[row][col] === null &&
      this.gameStarted &&
      this.role === this.currentPlayer
    ) {
      console.log(`Sending move: ${row}, ${col}`);
      this.ws.send(JSON.stringify({ type: "move", row, col }));
    } else {
      console.log(`Move blocked: ${row}, ${col}`);
      console.log(
        `Board value: ${this.board[row][col]}, Game started: ${this.gameStarted}, Role: ${this.role}, Current Player: ${this.currentPlayer}`
      );
    }
  }

  updateBoard() {
    this.board.forEach((row, i) => {
      row.forEach((cell, j) => {
        const cellDiv = document.querySelector(
          `[data-row="${i}"][data-col="${j}"]`
        );
        cellDiv.textContent = this.board[i][j];
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new GobbletGobblers();
});
