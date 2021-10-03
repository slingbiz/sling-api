// Find Exsiting Path in 2D Board
//
// Given a 2D board and a word, find if the word exists in the grid.
//   The word can be constructed from letters of sequentially adjacent cell, where "adjacent" cells are those horizontally or vertically neighboring.
//   The same letter cell may not be used more than once.
//   Example:
//
// board =
//   [
//     ['A','B','C','E'],
//     ['S','F','C','S'],
//     ['A','D','E','E']
//   ]
//
// Given word = "ABCCED", return true.
//   Given word = "SEE", return true.
//   Given word = "ABCB", return false.

const getNearByChar = (inpArray, x, y) => {
  const ret = [];

  if (inpArray?.[x - 1]?.[y] && !visited?.[x - 1]?.[y]) {
    ret.push({ nearChar: inpArray[x - 1][y], nearCharX: x - 1, nearCharY: y });
  }
  if (inpArray?.[x + 1]?.[y] && !visited?.[x + 1]?.[y]) {
    ret.push({ nearChar: inpArray[x + 1][y], nearCharX: x + 1, nearCharY: y });
  }
  if (inpArray?.[x]?.[y - 1] && !visited?.[x]?.[y - 1]) {
    ret.push({ nearChar: inpArray[x][y - 1], nearCharX: x, nearCharY: y - 1 });
  }
  if (inpArray?.[x]?.[y + 1] && !visited?.[x]?.[y + 1]) {
    ret.push({ nearChar: inpArray[x][y + 1], nearCharX: x, nearCharY: y + 1 });
  }
  return ret;
};

const checkPathExist = (inpArray, word) => {
  const initVal = inpArray[0][0];

  visited[0][0] = true;
  let i = 0;
  let x = 0;
  let y = 0;
  let isMatch = true;
  if (initVal !== word[i]) {
    return false;
  }
  while (i >= word.length || !isMatch) {
    i++;
    const nextChar = word[i];

    let tmpMatch = false;
    for (const nearCharObj of getNearByChar(inpArray, x, y)) {
      const { nearChar, nearCharX, nearCharY } = nearCharObj;

      if (nextChar === nearChar) {
        visited[nearCharX][nearCharY] = true;
        tmpMatch = true;
        x = nearCharX;
        y = nearCharY;
        break;
      }
    }
    if (!tmpMatch) {
      isMatch = false;
    }
  }
  return isMatch;
};

const board = [
  ['A', 'B', 'C', 'E'],
  ['S', 'F', 'C', 'S'],
  ['A', 'D', 'E', 'E'],
];

// 1, 1 -> 0,1:  1,0, 2,1: 22
// 0,0
//
// 2,0 x

let visited = Array(board.length)
  .fill()
  .map((entry) => Array(board[0].length));

const res = checkPathExist(board, 'ABCCEC');
console.log(res, '[output]', visited);
