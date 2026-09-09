import * as readline from "node:readline";

type Player = "X" | "O";
type Cell = Player | number;

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

function renderBoard(board: Cell[]): void {
  console.log(`
 ${board[0]} | ${board[1]} | ${board[2]}
---+---+---
 ${board[3]} | ${board[4]} | ${board[5]}
---+---+---
 ${board[6]} | ${board[7]} | ${board[8]}
`);
}

function getWinner(board: Cell[]): Player | null {
  for (const [a, b, c] of winningLines) {
    if (
      typeof board[a] === "string" &&
      board[a] === board[b] &&
      board[a] === board[c]
    ) {
      return board[a] as Player;
    }
  }

  return null;
}

function isDraw(board: Cell[]): boolean {
  return board.every((cell) => typeof cell === "string");
}

function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const onClose = (): void => {
      if (!settled) {
        settled = true;
        reject(new Error("Input closed"));
      }
    };

    rl.once("close", onClose);

    rl.question(prompt, (answer) => {
      if (settled) {
        return;
      }

      settled = true;
      rl.removeListener("close", onClose);
      resolve(answer.trim());
    });
  });
}

async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const board: Cell[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  let currentPlayer: Player = "X";

  console.log("Tic-Tac-Toe");
  renderBoard(board);

  try {
    while (true) {
      const input = await ask(
        rl,
        `Player ${currentPlayer}, choose a cell (1-9): `,
      );

      if (!/^[1-9]$/.test(input)) {
        console.log("Invalid input. Enter a number from 1 to 9.");
        continue;
      }

      const index = Number(input) - 1;

      if (typeof board[index] === "string") {
        console.log("That cell is already occupied. Choose another cell.");
        continue;
      }

      board[index] = currentPlayer;
      renderBoard(board);

      const winner = getWinner(board);

      if (winner) {
        console.log(`Player ${winner} wins!`);
        break;
      }

      if (isDraw(board)) {
        console.log("It's a draw!");
        break;
      }

      currentPlayer = currentPlayer === "X" ? "O" : "X";
    }
  } catch {
    console.log("\nGame ended.");
  } finally {
    rl.close();
  }
}

void main();