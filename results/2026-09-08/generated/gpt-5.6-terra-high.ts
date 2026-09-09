import * as readline from "node:readline";

type Player = "X" | "O";
type Cell = Player | null;

const board: Cell[] = Array(9).fill(null);
const winningLines = [
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

function renderBoard(): void {
  const display = board.map((cell, index) => cell ?? String(index + 1));

  console.log(`
 ${display[0]} | ${display[1]} | ${display[2]}
---+---+---
 ${display[3]} | ${display[4]} | ${display[5]}
---+---+---
 ${display[6]} | ${display[7]} | ${display[8]}
`);
}

function getWinner(): Player | null {
  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

function isDraw(): boolean {
  return board.every((cell) => cell !== null);
}

function promptMove(): void {
  rl.question(`Player ${currentPlayer}, choose a cell (1-9): `, (answer) => {
    const choice = Number(answer.trim());

    if (!Number.isInteger(choice) || choice < 1 || choice > 9) {
      console.log("Invalid input. Enter a whole number from 1 to 9.");
      promptMove();
      return;
    }

    const index = choice - 1;

    if (board[index] !== null) {
      console.log("That cell is already occupied. Choose another.");
      promptMove();
      return;
    }

    board[index] = currentPlayer;
    renderBoard();

    const winner = getWinner();
    if (winner) {
      console.log(`Player ${winner} wins!`);
      rl.close();
      return;
    }

    if (isDraw()) {
      console.log("It's a draw!");
      rl.close();
      return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    promptMove();
  });
}

console.log("Tic-Tac-Toe");
console.log("Choose cells by entering their displayed number.");
renderBoard();
promptMove();