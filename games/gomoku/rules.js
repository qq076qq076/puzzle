(function () {
  "use strict";

  const BOARD_SIZE = 15;
  const WIN_LENGTH = 5;
  const EMPTY = 0;
  const BLACK = 1;
  const WHITE = 2;
  const DIRECTIONS = [
    { row: 1, column: 0 },
    { row: 0, column: 1 },
    { row: 1, column: 1 },
    { row: 1, column: -1 }
  ];

  function isInsideBoard(row, column) {
    return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE;
  }

  function cloneBoard(board) {
    return board.map(function (row) { return row.slice(); });
  }

  function getLinePositions(board, row, column, player, direction) {
    const backward = { row: -direction.row, column: -direction.column };
    const positions = [];
    let nextRow = row;
    let nextColumn = column;

    while (isInsideBoard(nextRow, nextColumn) && board[nextRow][nextColumn] === player) {
      positions.unshift({ row: nextRow, column: nextColumn });
      nextRow += backward.row;
      nextColumn += backward.column;
    }

    nextRow = row + direction.row;
    nextColumn = column + direction.column;
    while (isInsideBoard(nextRow, nextColumn) && board[nextRow][nextColumn] === player) {
      positions.push({ row: nextRow, column: nextColumn });
      nextRow += direction.row;
      nextColumn += direction.column;
    }

    return positions;
  }

  function containsPosition(line, row, column) {
    return line.some(function (position) {
      return position.row === row && position.column === column;
    });
  }

  function getWinningLine(board, row, column, player) {
    for (const direction of DIRECTIONS) {
      const line = getLinePositions(board, row, column, player, direction);
      if ((player === BLACK && line.length === WIN_LENGTH) || (player === WHITE && line.length >= WIN_LENGTH)) {
        return line;
      }
    }
    return null;
  }

  function getExactFiveExtensions(board, originRow, originColumn, player, direction) {
    const extensions = [];

    for (let distance = -WIN_LENGTH; distance <= WIN_LENGTH; distance += 1) {
      const row = originRow + direction.row * distance;
      const column = originColumn + direction.column * distance;
      if (!isInsideBoard(row, column) || board[row][column] !== EMPTY) continue;

      board[row][column] = player;
      const line = getLinePositions(board, row, column, player, direction);
      if (line.length === WIN_LENGTH && containsPosition(line, originRow, originColumn)) {
        extensions.push({ row: row, column: column });
      }
      board[row][column] = EMPTY;
    }

    return extensions;
  }

  function hasOverline(board, row, column) {
    return DIRECTIONS.some(function (direction) {
      return getLinePositions(board, row, column, BLACK, direction).length > WIN_LENGTH;
    });
  }

  function countFourDirections(board, row, column) {
    return DIRECTIONS.reduce(function (count, direction) {
      return count + (getExactFiveExtensions(board, row, column, BLACK, direction).length > 0 ? 1 : 0);
    }, 0);
  }

  function createsStraightFour(board, originRow, originColumn, row, column, direction) {
    if (!isInsideBoard(row, column) || board[row][column] !== EMPTY) return false;

    board[row][column] = BLACK;
    const line = getLinePositions(board, row, column, BLACK, direction);
    const winningExtensions = line.length < WIN_LENGTH
      ? getExactFiveExtensions(board, originRow, originColumn, BLACK, direction)
      : [];
    board[row][column] = EMPTY;
    return winningExtensions.length >= 2;
  }

  function countOpenThreeDirections(board, row, column) {
    return DIRECTIONS.reduce(function (count, direction) {
      let straightFourCount = 0;
      for (let distance = -WIN_LENGTH; distance <= WIN_LENGTH; distance += 1) {
        const extensionRow = row + direction.row * distance;
        const extensionColumn = column + direction.column * distance;
        if (createsStraightFour(board, row, column, extensionRow, extensionColumn, direction)) {
          straightFourCount += 1;
        }
      }
      return count + (straightFourCount >= 2 ? 1 : 0);
    }, 0);
  }

  function getForbiddenType(analysis) {
    if (analysis.overline) return "長連";
    if (analysis.doubleFour) return "雙四";
    if (analysis.doubleThree) return "雙三";
    return "";
  }

  function analyzeMove(board, row, column, player) {
    if (!isInsideBoard(row, column) || board[row][column] !== EMPTY) {
      return { legal: false, occupied: true, forbidden: false, wins: false, winningLine: null };
    }

    const nextBoard = cloneBoard(board);
    nextBoard[row][column] = player;
    const winningLine = getWinningLine(nextBoard, row, column, player);
    const wins = Boolean(winningLine);

    if (player !== BLACK) {
      return { legal: true, forbidden: false, wins: wins, winningLine: winningLine };
    }

    const overline = hasOverline(nextBoard, row, column);
    const doubleFour = countFourDirections(nextBoard, row, column) >= 2;
    const doubleThree = countOpenThreeDirections(nextBoard, row, column) >= 2;
    const forbidden = !wins && (overline || doubleFour || doubleThree);
    const analysis = {
      legal: !forbidden,
      forbidden: forbidden,
      forbiddenType: "",
      overline: overline,
      doubleFour: doubleFour,
      doubleThree: doubleThree,
      wins: wins,
      winningLine: winningLine
    };
    analysis.forbiddenType = getForbiddenType(analysis);
    return analysis;
  }

  window.GomokuRules = {
    analyzeMove: analyzeMove,
    getWinningLine: getWinningLine,
    isLegalMove: function (board, row, column, player) {
      return analyzeMove(board, row, column, player).legal;
    }
  };
}());
