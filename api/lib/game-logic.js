/**
 * Game Logic for 6x6 Tic-Tac-Toe
 * 
 * Rules:
 * - 6x6 grid board
 * - 2 players take turns placing X or O
 * - Score: 5 points for each line of exactly 3 consecutive squares
 * - Game ends when board is full
 * - Winner determined by highest total score
 */

const BOARD_SIZE = 6;
const EMPTY = null;
const PLAYER_X = 'X';
const PLAYER_O = 'O';

/**
 * Create an empty game board
 * @returns {Array} 6x6 array filled with null
 */
function createEmptyBoard() {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
}

/**
 * Check if a position is valid on the board
 * @param {number} row 
 * @param {number} col 
 * @returns {boolean}
 */
function isValidPosition(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/**
 * Check if a cell is empty
 * @param {Array} board 
 * @param {number} row 
 * @param {number} col 
 * @returns {boolean}
 */
function isCellEmpty(board, row, col) {
  return isValidPosition(row, col) && board[row][col] === EMPTY;
}

/**
 * Make a move on the board
 * @param {Array} board - Current board state
 * @param {number} row - Row index (0-5)
 * @param {number} col - Column index (0-5)
 * @param {string} player - 'X' or 'O'
 * @returns {Object} Result with success status and new board
 */
function makeMove(board, row, col, player) {
  if (!isValidPosition(row, col)) {
    return { success: false, error: 'Invalid position' };
  }

  if (!isCellEmpty(board, row, col)) {
    return { success: false, error: 'Cell already occupied' };
  }

  if (player !== PLAYER_X && player !== PLAYER_O) {
    return { success: false, error: 'Invalid player' };
  }

  // Create a copy of the board
  const newBoard = board.map(r => [...r]);
  newBoard[row][col] = player;

  return { success: true, board: newBoard };
}

/**
 * Count lines of exactly 3 consecutive squares for a player
 * A line can be horizontal, vertical, or diagonal
 * 
 * IMPORTANT: Only EXACTLY 3 consecutive squares count
 * If there are 4+ consecutive, it does NOT count as a line of 3
 * 
 * @param {Array} board 
 * @param {string} player - 'X' or 'O'
 * @returns {number} Number of valid lines (each worth 5 points)
 */
function countLinesOfThree(board, player) {
  let lineCount = 0;
  const counted = new Set(); // To avoid counting the same line twice

  // Direction vectors: horizontal, vertical, diagonal down-right, diagonal down-left
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1]   // diagonal down-left
  ];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== player) continue;

      for (const [dr, dc] of directions) {
        // Check if this could be the start of a line of 3
        const lineKey = getLineKey(board, row, col, dr, dc, player);
        
        if (lineKey && !counted.has(lineKey)) {
          // Verify it's exactly 3 (not 4 or more)
          if (isExactlyThree(board, row, col, dr, dc, player)) {
            counted.add(lineKey);
            lineCount++;
          }
        }
      }
    }
  }

  return lineCount;
}

/**
 * Generate a unique key for a line to avoid duplicate counting
 * @returns {string|null} Line key if valid line of 3 exists
 */
function getLineKey(board, startRow, startCol, dr, dc, player) {
  const positions = [];
  
  for (let i = 0; i < 3; i++) {
    const r = startRow + i * dr;
    const c = startCol + i * dc;
    
    if (!isValidPosition(r, c) || board[r][c] !== player) {
      return null;
    }
    
    positions.push(`${r},${c}`);
  }

  // Sort positions to create consistent key
  positions.sort();
  return positions.join('|');
}

/**
 * Check if there's exactly 3 consecutive pieces (not 4 or more)
 * @returns {boolean}
 */
function isExactlyThree(board, startRow, startCol, dr, dc, player) {
  // Check all 3 positions exist and have player's piece
  for (let i = 0; i < 3; i++) {
    const r = startRow + i * dr;
    const c = startCol + i * dc;
    
    if (!isValidPosition(r, c) || board[r][c] !== player) {
      return false;
    }
  }

  // Check that position before the line is NOT player's piece (or doesn't exist)
  const beforeR = startRow - dr;
  const beforeC = startCol - dc;
  const hasBefore = isValidPosition(beforeR, beforeC) && board[beforeR][beforeC] === player;

  // Check that position after the line is NOT player's piece (or doesn't exist)
  const afterR = startRow + 3 * dr;
  const afterC = startCol + 3 * dc;
  const hasAfter = isValidPosition(afterR, afterC) && board[afterR][afterC] === player;

  // It's exactly 3 if there's no extension on either end
  return !hasBefore && !hasAfter;
}

/**
 * Calculate scores for both players
 * @param {Array} board 
 * @returns {Object} Scores for X and O
 */
function calculateScores(board) {
  const xLines = countLinesOfThree(board, PLAYER_X);
  const oLines = countLinesOfThree(board, PLAYER_O);

  return {
    X: xLines * 5,
    O: oLines * 5,
    xLines,
    oLines
  };
}

/**
 * Check if the board is full
 * @param {Array} board 
 * @returns {boolean}
 */
function isBoardFull(board) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === EMPTY) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Check if game is over and determine winner
 * @param {Array} board 
 * @returns {Object} Game result
 */
function getGameResult(board) {
  const isFull = isBoardFull(board);
  
  if (!isFull) {
    return { gameOver: false };
  }

  const scores = calculateScores(board);
  
  let winner = null;
  if (scores.X > scores.O) {
    winner = PLAYER_X;
  } else if (scores.O > scores.X) {
    winner = PLAYER_O;
  }

  return {
    gameOver: true,
    winner,
    scores,
    isDraw: winner === null
  };
}

/**
 * Get all possible moves (empty cells)
 * @param {Array} board 
 * @returns {Array} Array of {row, col} objects
 */
function getAvailableMoves(board) {
  const moves = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === EMPTY) {
        moves.push({ row, col });
      }
    }
  }
  return moves;
}

/**
 * Switch to the other player
 * @param {string} currentPlayer 
 * @returns {string}
 */
function switchPlayer(currentPlayer) {
  return currentPlayer === PLAYER_X ? PLAYER_O : PLAYER_X;
}

/**
 * Validate a board state
 * @param {Array} board 
 * @returns {Object} Validation result
 */
function validateBoard(board) {
  if (!Array.isArray(board) || board.length !== BOARD_SIZE) {
    return { valid: false, error: 'Invalid board structure' };
  }

  for (const row of board) {
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) {
      return { valid: false, error: 'Invalid row structure' };
    }

    for (const cell of row) {
      if (cell !== EMPTY && cell !== PLAYER_X && cell !== PLAYER_O) {
        return { valid: false, error: 'Invalid cell value' };
      }
    }
  }

  return { valid: true };
}

/**
 * Generate a unique lobby ID
 * @returns {string}
 */
function generateLobbyId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Convert board to string for storage
 * @param {Array} board 
 * @returns {string}
 */
function boardToString(board) {
  return board.map(row => row.map(cell => cell || '-').join('')).join('|');
}

/**
 * Convert string to board
 * @param {string} str 
 * @returns {Array}
 */
function stringToBoard(str) {
  return str.split('|').map(rowStr => 
    rowStr.split('').map(cell => cell === '-' ? null : cell)
  );
}

module.exports = {
  BOARD_SIZE,
  EMPTY,
  PLAYER_X,
  PLAYER_O,
  createEmptyBoard,
  isValidPosition,
  isCellEmpty,
  makeMove,
  countLinesOfThree,
  calculateScores,
  isBoardFull,
  getGameResult,
  getAvailableMoves,
  switchPlayer,
  validateBoard,
  generateLobbyId,
  boardToString,
  stringToBoard
};