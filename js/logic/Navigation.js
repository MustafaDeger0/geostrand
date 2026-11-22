/**
 * Grid paths use the same inflated physics obstacles as clue reachability.
 * Four-way movement cannot cut diagonal corners. No Phaser dependency.
 */
(function (root) {
  'use strict';
  function findPath(map, start, goal, maxGoalDistance = 48) {
    if (!map || !Number.isFinite(goal.x) || !Number.isFinite(goal.y)) return [];
    const { C, cols, rows, blocked } = map;
    const size = cols * rows;
    const center = (i) => ({ x: (i % cols + 0.5) * C, y: (Math.floor(i / cols) + 0.5) * C });
    let first = -1, startDistance = Infinity;
    // A player may stand on a cell boundary or close to an obstacle.
    for (let y = Math.max(0, Math.floor(start.y / C) - 3); y <= Math.min(rows - 1, Math.floor(start.y / C) + 3); y++) {
      for (let x = Math.max(0, Math.floor(start.x / C) - 3); x <= Math.min(cols - 1, Math.floor(start.x / C) + 3); x++) {
        const i = y * cols + x, p = center(i);
        const d = Math.hypot(p.x - start.x, p.y - start.y);
        if (!blocked[i] && d < startDistance) { first = i; startDistance = d; }
      }
    }
    if (first < 0) return [];
    const parent = new Int32Array(size).fill(-1), queue = new Int32Array(size);
    let head = 0, tail = 1, best = first, bestDistance = Infinity;
    queue[0] = first; parent[first] = first;
    while (head < tail) {
      const i = queue[head++], p = center(i), d = Math.hypot(p.x - goal.x, p.y - goal.y);
      if (d < bestDistance) { best = i; bestDistance = d; }
      if (d <= C * 0.5) break;
      const x = i % cols, y = Math.floor(i / cols);
      if (x > 0) visit(i - 1, i);
      if (x < cols - 1) visit(i + 1, i);
      if (y > 0) visit(i - cols, i);
      if (y < rows - 1) visit(i + cols, i);
    }
    if (bestDistance > maxGoalDistance) return [];
    const indices = [best];
    while (indices[indices.length - 1] !== first) indices.push(parent[indices[indices.length - 1]]);
    indices.reverse();
    // Retain every turn, removing only exactly collinear grid cells.
    const path = [];
    for (let k = 0; k < indices.length; k++) {
      if (k > 0 && k < indices.length - 1 &&
        indices[k] - indices[k - 1] === indices[k + 1] - indices[k]) continue;
      path.push(center(indices[k]));
    }
    return path;
    function visit(n, from) {
      if (!blocked[n] && parent[n] < 0) { parent[n] = from; queue[tail++] = n; }
    }
  }
  root.Navigation = { findPath };
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.GS = window.GS || {}));
