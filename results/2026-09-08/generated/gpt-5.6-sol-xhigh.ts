import * as readline from "node:readline";

type Player = "X" | "O";
type Cell = Player | null;

const board: Cell[] = Array<Cell>(9).fill(null);
const winningLines: readonly [number, number, number][] = [
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

let currentPlayer: Player = "X";
let gameFinished = false;
let interrupted = false;

function renderBoard(): void {
  const cells = board.map((cell, index) => cell ?? String(index + 1));

  console.log("");
  console.log(` ${cells[0]} | ${cells[1]} | ${cells[2]} `);
  console.log("---+---+---");
  console.log(` ${cells[3]} | ${cells[4]} | ${cells[5]} `);
  console.log("---+---+---");
  console.log(` ${cells[6]} | ${cells[7]} | ${cells[8]} `);
  console.log("");
}

function hasWon(player: Player): boolean {
  return winningLines.some(([a, b, c]) =>
    board[a] === player &&
    board[b] === player &&
    board[c] === player
  );
}

function isDraw(): boolean {
  return board.every((cell) => cell !== null);
}

function takeTurn(): void {
  renderBoard();

  rl.question(`Player ${currentPlayer}, choose a cell (1-9): `, (input) => {
    const value = input.trim();

    if (!/^[1-9]$/.test(value)) {
      console.log("Invalid input. Enter a number from 1 to 9.");
      takeTurn();
      return;
    }

    const index = Number(value) - 1;

    if (board[index] !== null) {
      console.log("That cell is occupied. Choose another cell.");
      takeTurn();
      return;
    }

    board[index] = currentPlayer;

    if (hasWon(currentPlayer)) {
      renderBoard();
      console.log(`Player ${currentPlayer} wins!`);
      gameFinished = true;
      rl.close();
      return;
    }

    if (isDraw()) {
      renderBoard();
      console.log("The game is a draw!");
      gameFinished = true;
      rl.close();
      return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    takeTurn();
  });
}

rl.on("SIGINT", () => {
  interrupted = true;
  console.log("\nGame cancelled.");
  rl.close();
});

rl.on("close", () => {
  if (!gameFinished && !interrupted) {
    console.log("\nGame ended.");
  }
});

console.log("Tic-Tac-Toe");
takeTurn();