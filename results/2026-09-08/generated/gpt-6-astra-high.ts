import * as readline from "node:readline";

type Player = "X" | "O";

const board: Array<Player | null> = Array(9).fill(null);
let currentPlayer: Player = "X";
let gameOver = false;

const winningLines: ReadonlyArray<readonly [number, number, number]> = [
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
  const cells = board.map((cell, index) => cell ?? String(index + 1));

  console.log();
  for (let row = 0; row < 3; row++) {
    console.log(` ${cells.slice(row * 3, row * 3 + 3).join(" | ")} `);
    if (row < 2) console.log("---+---+---");
  }
  console.log();
}

function promptMove(): void {
  rl.setPrompt(`Player ${currentPlayer}, choose a cell (1-9): `);
  rl.prompt();
}

function hasWon(player: Player): boolean {
  return winningLines.some((line) =>
    line.every((index) => board[index] === player),
  );
}

function finish(message: string): void {
  gameOver = true;
  console.log(message);
  rl.close();
}

rl.on("line", (input: string) => {
  if (gameOver) return;

  const choice = input.trim();

  if (!/^[1-9]$/.test(choice)) {
    console.log("Invalid input. Enter a single number from 1 to 9.");
    promptMove();
    return;
  }

  const index = Number(choice) - 1;

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

rl.on("SIGINT", () => {
  finish("\nGame interrupted.");
});

rl.on("close", () => {
  if (!gameOver) {
    console.log("\nInput closed. Game ended.");
  }
  gameOver = true;
});

console.log("Tic-Tac-Toe — two players");
console.log("Choose a numbered empty cell. X goes first.");
renderBoard();
promptMove();