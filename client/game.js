class GobbletGobblers {
  constructor() {
    this.board = [
      [[], [], []],
      [[], [], []],
      [[], [], []],
    ];
    this.currentPlayer = "X";
    this.gameStarted = false;
    this.role = null;
    this.selectedSize = null;
    this.availablePieces = { small: 2, medium: 2, large: 2 };
    this.ws = new WebSocket("ws://localhost:8080");

    this.ws.onopen = () => console.log("Connected to the server");
    this.ws.onmessage = this.handleMessage.bind(this);
    this.addNewGameButtonListener();
    this.addPieceSelectionListeners();
    this.createBoard();
    this.updateAvailablePiecesDisplay();
  }

  addNewGameButtonListener() {
    const newGameButton = document.getElementById("new-game-button");
    newGameButton.addEventListener("click", () => {
      this.ws.send(JSON.stringify({ type: "restart" }));
      document.getElementById("status").textContent = "Restarting game...";
    });
  }

  addPieceSelectionListeners() {
    const buttons = document.querySelectorAll(".piece-btn");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        this.selectedSize = button.getAttribute("data-size");
        document.getElementById(
          "status"
        ).textContent = `Selected size: ${this.selectedSize}. Place your piece.`;
      });
    });
  }

  updateAvailablePiecesDisplay() {
    const availablePiecesDiv = document.getElementById("available-pieces");
    availablePiecesDiv.innerHTML = `Available Pieces: <br> Small: ${this.availablePieces.small}, Medium: ${this.availablePieces.medium}, Large: ${this.availablePieces.large}`;
  }

  resetBoard() {
    this.board = [
      [[], [], []],
      [[], [], []],
      [[], [], []],
    ];
    this.createBoard();
    this.updateAvailablePiecesDisplay();
  }

  createBoard() {
    const gameBoard = document.getElementById("game-board");
    gameBoard.innerHTML = "";
    this.board.forEach((row, i) => {
      row.forEach((cell, j) => {
        const cellDiv = document.createElement("div");
        cellDiv.className = "cell";
        cellDiv.dataset.row = i;
        cellDiv.dataset.col = j;
        cellDiv.addEventListener("click", () => this.makeMove(i, j));
        gameBoard.appendChild(cellDiv);
        this.updateCell(i, j);
      });
    });
  }

  updateCell(row, col) {
    const cell = this.board[row][col];
    const cellDiv = document.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );
    cellDiv.innerHTML = cell
      .map(
        (piece) =>
          `<div class="${piece.size} ${
            piece.player
          }">${piece.size[0].toUpperCase()}</div>`
      )
      .join("");
  }

  makeMove(row, col) {
    if (
      this.gameStarted &&
      this.selectedSize &&
      this.availablePieces[this.selectedSize] > 0
    ) {
      this.ws.send(
        JSON.stringify({ type: "move", row, col, size: this.selectedSize })
      );
    }
  }

  handleMessage(message) {
    const data = JSON.parse(message.data);
    console.log(data);
    switch (data.type) {
      case "reset":
        this.resetBoard();
        document.getElementById(
          "status"
        ).textContent = `Game restarted. It's now ${this.currentPlayer}'s turn.`;
        break;
      case "roleAssignment":
        this.role = data.role;
        document.getElementById(
          "role-info"
        ).textContent = `Your role: ${this.role}`;
        break;
      case "start":
        this.gameStarted = true;
        this.currentPlayer = data.currentPlayer;
        document.getElementById(
          "status"
        ).textContent = `Game started! It's ${this.currentPlayer}'s turn.`;
        break;
      case "move":
        this.board[data.row][data.col].push(data.piece);
        this.updateCell(data.row, data.col);
        this.updateAvailablePiecesDisplay();
        document.getElementById(
          "status"
        ).textContent = `It's now ${data.currentPlayer}'s turn.`;
        break;
      case "updatePieces":
        this.availablePieces = data.pieces;
        this.updateAvailablePiecesDisplay();
        break;
      case "win":
        this.gameStarted = false;
        document.getElementById(
          "status"
        ).textContent = `Player ${data.winner} wins!`;
        break;
      case "tie":
        this.gameStarted = false;
        document.getElementById("status").textContent = `The game is a tie!`;
        break;
      case "updateTurn":
        this.currentPlayer = data.currentPlayer;
        document.getElementById(
          "status"
        ).textContent = `It's now ${this.currentPlayer}'s turn.`;
        break;
      case "playersCount":
        document.getElementById(
          "players-count"
        ).textContent = `Connected Players: ${data.count}`;
        break;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new GobbletGobblers();
});
