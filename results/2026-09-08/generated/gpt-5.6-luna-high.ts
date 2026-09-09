import * as readline from "node:readline";

type Mark = "X" | "O";
type Cell = Mark | null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

function hasWon(mark: Mark): boolean {
  return winningLines.some(([a, b, c]) =>
    board[a] === mark && board[b] === mark && board[c] === mark,
  );
}

function isDraw(): boolean {
  return board.every((cell) => cell !== null);
}

async function main(): Promise<void> {
  let currentPlayer: Mark = "X";

  console.log("Tic-Tac-Toe");
  console.log("Choose a numbered cell from 1 to 9.");
  renderBoard();

  rl.setPrompt(`Player ${currentPlayer}, choose a cell: `);
  rl.prompt();

  for await (const input of rl) {
    const choice = input.trim();

    if (!/^[1-9]$/.test(choice)) {
      console.log("Invalid input. Enter a number from 1 to 9.");
      rl.prompt();
      continue;
    }

    const index = Number(choice) - 1;

    if (board[index] !== null) {
      console.log("That cell is already occupied. Choose another cell.");
      rl.prompt();
      continue;
    }

    board[index] = currentPlayer;
    renderBoard();

    if (hasWon(currentPlayer)) {
      console.log(`Player ${currentPlayer} wins!`);
      break;
    }

    if (isDraw()) {
      console.log("It's a draw!");
      break;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    rl.setPrompt(`Player ${currentPlayer}, choose a cell: `);
    rl.prompt();
  }
}

main()
  .catch((error: unknown) => {
    console.error("Game error:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
  });