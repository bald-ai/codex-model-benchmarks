import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

type Player = 'X' | 'O';

const WIN_COMBINATIONS: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

const board: string[] = Array.from({ length: 9 }, (_, i) => String(i + 1));
let currentPlayer: Player = 'X';

const ask = (question: string): Promise<string> =>
  new Promise((resolve) => rl.question(question, resolve));

function renderBoard(): void {
  const row = (start: number) => ` ${board[start]} | ${board[start + 1]} | ${board[start + 2]} `;
  const line = '\n-----------\n';
  console.log(`\n${row(0)}${line}${row(3)}${line}${row(6)}\n`);
}

function isCellFree(index: number): boolean {
  return board[index] !== 'X' && board[index] !== 'O';
}

function hasWon(player: Player): boolean {
  return WIN_COMBINATIONS.some(([a, b, c]) => board[a] === player && board[b] === player && board[c] === player);
}

function isDraw(): boolean {
  return board.every((cell) => cell === 'X' || cell === 'O');
}

function parseMove(input: string): number | null {
  const trimmed = input.trim();
  if (!/^[1-9]$/.test(trimmed)) return null;
  const position = Number(trimmed) - 1;
  if (!Number.isInteger(position) || position < 0 || position > 8) return null;
  return position;
}

async function getValidMove(): Promise<number> {
  while (true) {
    const raw = await ask(`Player ${currentPlayer}, choose a cell (1-9): `);
    const move = parseMove(raw);

    if (move === null) {
      console.log('Invalid input. Enter a number from 1 to 9.');
      continue;
    }
    if (!isCellFree(move)) {
      console.log('That cell is already taken. Pick a different one.');
      continue;
    }

    return move;
  }
}

async function playGame(): Promise<void> {
  console.log('\nTwo-player Tic-Tac-Toe');
  console.log('Use numbers 1-9 to choose cells.');
  renderBoard();

  while (true) {
    const move = await getValidMove();
    board[move] = currentPlayer;
    renderBoard();

    if (hasWon(currentPlayer)) {
      console.log(`Player ${currentPlayer} wins!`);
      return;
    }

    if (isDraw()) {
      console.log('Draw!');
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  }
}

rl.on('SIGINT', () => {
  console.log('\nGame interrupted. Goodbye.');
  rl.close();
});

rl.on('close', () => {
  process.exit(0);
});

playGame()
  .catch((err) => {
    console.error('Unexpected error:', err);
    rl.close();
  });