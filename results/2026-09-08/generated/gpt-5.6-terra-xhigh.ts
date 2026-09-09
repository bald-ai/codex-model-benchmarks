import * as readline from "node:readline";

type Player = "X" | "O";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const board: Array<Player | null> = Array(9).fill(null);

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
  const cell = (index: number): string => board[index] ?? String(index + 1);

  console.log(`
 ${cell(0)} | ${cell(1)} | ${cell(2)}
---+---+---
 ${cell(3)} | ${cell(4)} | ${cell(5)}
---+---+---
 ${cell(6)} | ${cell(7)} | ${cell(8)}
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

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main(): Promise<void> {
  let currentPlayer: Player = "X";

  console.log("Two-Player Tic-Tac-Toe");
  console.log("Choose a numbered cell from 1 to 9.");
  renderBoard();

  while (true) {
    const input = (await ask(`Player ${currentPlayer}, choose a cell: `)).trim();

    if (!/^[1-9]$/.test(input)) {
      console.log("Invalid input. Enter a number from 1 to 9.");
      continue;
    }

    const index = Number(input) - 1;

    if (board[index] !== null) {
      console.log("That cell is already occupied. Choose another one.");
      continue;
    }

    board[index] = currentPlayer;
    renderBoard();

    const winner = getWinner();
    if (winner) {
      console.log(`Player ${winner} wins!`);
      break;
    }

    if (isDraw()) {
      console.log("It's a draw!");
      break;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
  }

  rl.close();
}

main().catch((error: unknown) => {
  console.error("Game error:", error);
  rl.close();
  process.exitCode = 1;
});