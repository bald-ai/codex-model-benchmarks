import * as readline from "node:readline";
import { stdin, stdout } from "node:process";

type Player = "X" | "O";
type Cell = Player | null;

const board: Cell[] = Array<Cell>(9).fill(null);
const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

let currentPlayer: Player = "X";
let finished = false;

function renderBoard(): void {
  console.log();
  for (let row = 0; row < 3; row++) {
    const cells = [0, 1, 2].map((column) => {
      const index = row * 3 + column;
      return board[index] ?? String(index + 1);
    });

    console.log(` ${cells.join(" | ")} `);
    if (row < 2) console.log("---+---+---");
  }
  console.log();
}

function hasWon(player: Player): boolean {
  return winningLines.some(([a, b, c]) =>
    board[a] === player &&
    board[b] === player &&
    board[c] === player
  );
}

function finish(message: string): void {
  finished = true;
  console.log(message);
  rl.close();
}

function promptMove(): void {
  if (finished) return;

  rl.question(`Player ${currentPlayer}, choose a cell (1-9): `, (answer) => {
    if (finished) return;

    const value = answer.trim();

    if (!/^[1-9]$/.test(value)) {
      console.log("Invalid input. Enter a single number from 1 to 9.");
      promptMove();
      return;
    }

    const index = Number(value) - 1;

    if (board[index] !== null) {
      console.log("That cell is occupied. Choose an empty cell.");
      promptMove();
      return;
    }

    board[index] = currentPlayer;
    renderBoard();

    if (hasWon(currentPlayer)) {
      finish(`Player ${currentPlayer} wins!`);
      return;
    }

    if (board.every((cell) => cell !== null)) {
      finish("It's a draw!");
      return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    promptMove();
  });
}

rl.on("SIGINT", () => {
  rl.close();
});

rl.once("close", () => {
  if (!finished) {
    finished = true;
    console.log("\nGame ended before completion.");
  }
});

console.log("Tic-Tac-Toe");
console.log("Players take turns choosing numbered cells. X goes first.");
console.log("Press Ctrl+C to quit.");

renderBoard();
promptMove();