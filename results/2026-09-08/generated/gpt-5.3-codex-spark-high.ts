import * as readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

type Player = 'X' | 'O';
type Cell = string;

const WINNING_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function createBoard(): Cell[] {
  return Array.from({ length: 9 }, (_, i) => String(i + 1));
}

function renderBoard(board: readonly Cell[]): void {
  console.log();
  console.log(` ${board[0]} | ${board[1]} | ${board[2]}`);
  console.log('-----------');
  console.log(` ${board[3]} | ${board[4]} | ${board[5]}`);
  console.log('-----------');
  console.log(` ${board[6]} | ${board[7]} | ${board[8]}`);
  console.log();
}

function isOccupied(board: readonly Cell[], index: number): boolean {
  return board[index] === 'X' || board[index] === 'O';
}

function getWinner(board: readonly Cell[]): Player | undefined {
  for (const [a, b, c] of WINNING_LINES) {
    const value = board[a];
    if ((value === 'X' || value === 'O') && value === board[b] && value === board[c]) {
      return value;
    }
  }
  return undefined;
}

function isDraw(board: readonly Cell[]): boolean {
  return board.every((cell) => cell === 'X' || cell === 'O');
}

async function getMove(player: Player, board: Cell[]): Promise<number> {
  while (true) {
    const input = (await question(`Player ${player}, choose a cell (1-9): `)).trim();
    const move = Number(input);
    const isInt = Number.isInteger(move);

    if (!isInt || move < 1 || move > 9) {
      console.log('Invalid move. Enter a number between 1 and 9.');
      continue;
    }

    const index = move - 1;

    if (isOccupied(board, index)) {
      console.log(`Cell ${move} is already occupied. Choose another.`);
      continue;
    }

    return index;
  }
}

async function main(): Promise<void> {
  const board = createBoard();
  const players: Player[] = ['X', 'O'];
  let turn = 0;

  console.log('Tic-Tac-Toe (Terminal)');
  renderBoard(board);

  while (true) {
    const player = players[turn % 2];
    const moveIndex = await getMove(player, board);
    board[moveIndex] = player;

    renderBoard(board);

    const winner = getWinner(board);
    if (winner) {
      console.log(`Player ${winner} wins!`);
      break;
    }

    if (isDraw(board)) {
      console.log("It's a draw.");
      break;
    }

    turn += 1;
  }

  rl.close();
}

rl.on('SIGINT', () => {
  console.log('\nGame interrupted.');
  rl.close();
});

main().catch((error: unknown) => {
  console.error('Unexpected error:', error);
  rl.close();
});