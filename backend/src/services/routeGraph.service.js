const pool = require('../config/db');

// Loads the full edge list and runs Dijkstra from `fromId` to `toId`.
// The graph is small (dozens of nodes) so a fresh in-memory run per
// request is simpler and fast enough — no need to persist a cache.
async function shortestPath(fromId, toId) {
  const [locations] = await pool.query('SELECT id, name, lat, lng, category FROM locations');
  const [edges] = await pool.query(
    'SELECT from_location_id, to_location_id, distance_meters, walk_seconds FROM location_edges'
  );

  const nodeById = new Map(locations.map((l) => [l.id, l]));
  const adjacency = new Map();
  for (const loc of locations) adjacency.set(loc.id, []);
  for (const e of edges) {
    adjacency.get(e.from_location_id)?.push({
      to: e.to_location_id,
      distance: e.distance_meters,
      seconds: e.walk_seconds,
    });
  }

  if (!nodeById.has(fromId) || !nodeById.has(toId)) {
    return null;
  }

  const dist = new Map(locations.map((l) => [l.id, Infinity]));
  const prev = new Map();
  const visited = new Set();
  dist.set(fromId, 0);

  // Simple array-based priority queue — fine at this graph size.
  const queue = [fromId];

  while (queue.length) {
    queue.sort((a, b) => dist.get(a) - dist.get(b));
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    if (current === toId) break;

    for (const edge of adjacency.get(current) || []) {
      if (visited.has(edge.to)) continue;
      const candidate = dist.get(current) + edge.distance;
      if (candidate < dist.get(edge.to)) {
        dist.set(edge.to, candidate);
        prev.set(edge.to, current);
        queue.push(edge.to);
      }
    }
  }

  if (dist.get(toId) === Infinity) return null; // no path exists

  // Reconstruct path
  const path = [];
  let node = toId;
  while (node !== undefined) {
    path.unshift(nodeById.get(node));
    node = prev.get(node);
  }

  const totalDistance = dist.get(toId);
  const totalSeconds = Math.round(
    path.slice(1).reduce((sum, loc, i) => {
      const from = path[i];
      const edge = (adjacency.get(from.id) || []).find((e) => e.to === loc.id);
      return sum + (edge ? edge.seconds : 0);
    }, 0)
  );

  return {
    path: path.map((l) => ({ id: l.id, name: l.name, lat: l.lat, lng: l.lng, category: l.category })),
    distanceMeters: totalDistance,
    walkSeconds: totalSeconds,
  };
}

module.exports = { shortestPath };
