import * as readline from "node:readline";

type Player = "X" | "O";
type Cell = Player | null;

const board: Cell[] = Array<Cell>(9).fill(null);
let currentPlayer: Player = "X";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function renderBoard(): void {
  const cells = board.map((cell, index) => cell ?? String(index + 1));

  console.log(`
 ${cells[0]} | ${cells[1]} | ${cells[2]}
---+---+---
 ${cells[3]} | ${cells[4]} | ${cells[5]}
---+---+---
 ${cells[6]} | ${cells[7]} | ${cells[8]}
`);
}

function hasWon(player: Player): boolean {
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

  return winningLines.some(([a, b, c]) =>
    board[a] === player &&
    board[b] === player &&
    board[c] === player
  );
}

function promptMove(): void {
  rl.question(`Player ${currentPlayer}, choose a cell (1-9): `, (input) => {
    const trimmedInput = input.trim();

    if (!/^[1-9]$/.test(trimmedInput)) {
      console.log("Invalid input. Enter a number from 1 to 9.");
      promptMove();
      return;
    }

    const index = Number(trimmedInput) - 1;

    if (board[index] !== null) {
      console.log("That cell is already occupied. Choose another.");
      promptMove();
      return;
    }

    board[index] = currentPlayer;
    renderBoard();

    if (hasWon(currentPlayer)) {
      console.log(`Player ${currentPlayer} wins!`);
      rl.close();
      return;
    }

    if (board.every((cell) => cell !== null)) {
      console.log("It's a draw!");
      rl.close();
      return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    promptMove();
  });
}

rl.on("SIGINT", () => {
  console.log("\nGame ended.");
  rl.close();
});

rl.on("close", () => {
  process.exitCode = 0;
});

console.log("Tic-Tac-Toe");
renderBoard();
promptMove();