import * as readline from "node:readline";

type Player = "X" | "O";
type Cell = Player | null;

const board: Cell[] = Array<Cell>(9).fill(null);
let currentPlayer: Player = "X";
let finished = false;

const winningLines: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function renderBoard(): void {
  const display = board.map((cell, index) => cell ?? String(index + 1));

  console.log("");
  console.log(` ${display[0]} | ${display[1]} | ${display[2]} `);
  console.log("---+---+---");
  console.log(` ${display[3]} | ${display[4]} | ${display[5]} `);
  console.log("---+---+---");
  console.log(` ${display[6]} | ${display[7]} | ${display[8]} `);
  console.log("");
}

function hasWon(player: Player): boolean {
  return winningLines.some((line) =>
    line.every((index) => board[index] === player),
  );
}

function isDraw(): boolean {
  return board.every((cell) => cell !== null);
}

function finish(message: string): void {
  finished = true;
  renderBoard();
  console.log(message);
  rl.close();
}

function takeTurn(): void {
  renderBoard();

  rl.question(`Player ${currentPlayer}, choose a cell (1-9): `, (answer) => {
    const input = answer.trim();

    if (!/^[1-9]$/.test(input)) {
      console.log("Invalid input. Enter a number from 1 to 9.");
      takeTurn();
      return;
    }

    const cellIndex = Number(input) - 1;

    if (board[cellIndex] !== null) {
      console.log("That cell is already occupied. Choose another cell.");
      takeTurn();
      return;
    }

    board[cellIndex] = currentPlayer;

    if (hasWon(currentPlayer)) {
      finish(`Player ${currentPlayer} wins!`);
      return;
    }

    if (isDraw()) {
      finish("The game is a draw!");
      return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    takeTurn();
  });
}

rl.on("SIGINT", () => {
  if (!finished) {
    finished = true;
    console.log("\nGame ended.");
  }
  rl.close();
});

rl.on("close", () => {
  if (!finished) {
    finished = true;
    console.log("\nGame ended.");
  }
});

console.log("Tic-Tac-Toe");
console.log("Players take turns entering a cell number.");
takeTurn();