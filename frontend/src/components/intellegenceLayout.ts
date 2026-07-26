export function intelligenceLayout(nodes: any[], edges: any[]) {
  const result = nodes.map((node) => ({
    ...node,
    position: {
      x: 0,
      y: 0,
    },
  }));

  const root =
    result.find((n) => n.data?.isPrimary) ||
    result.find((n) => n.data?.priority >= 100);

  if (!root) {
    return {
      nodes: result,
      edges,
    };
  }

  const center = {
    x: 600,
    y: 400,
  };

  const placed = new Set<string>();

  // -------------------------
  // ROOT
  // -------------------------

  const rootNode = result.find((n) => n.id === root.id);

  if (rootNode) {
    rootNode.position = center;

    placed.add(root.id);
  }

  // -------------------------
  // BFS LEVEL FINDER
  // -------------------------

  function getNeighbours(id: string) {
    return edges
      .filter((e) => e.source === id || e.target === id)
      .map((e) => (e.source === id ? e.target : e.source))
      .filter((id) => !placed.has(id));
  }

  let currentLevel = [root.id];

  let radius = 280;

  // -------------------------
  // CREATE RINGS
  // -------------------------

  for (let level = 1; level <= 4; level++) {
    let nextLevel: string[] = [];

    currentLevel.forEach((parent) => {
      nextLevel.push(...getNeighbours(parent));
    });

    nextLevel = [...new Set(nextLevel)];

    if (!nextLevel.length) break;

    const angleStep = (Math.PI * 2) / nextLevel.length;

    nextLevel.forEach((id, index) => {
      const node = result.find((n) => n.id === id);

      if (!node) return;

      node.position = {
        x: center.x + Math.cos(index * angleStep) * radius,

        y: center.y + Math.sin(index * angleStep) * radius,
      };

      placed.add(id);
    });

    currentLevel = nextLevel;

    radius += 250;
  }

  // -------------------------
  // LEFTOVER NODES
  // -------------------------

  let x = 50;
  let y = 50;

  result
    .filter((n) => !placed.has(n.id))
    .forEach((node) => {
      node.position = {
        x,
        y,
      };

      x += 220;

      if (x > 1200) {
        x = 50;
        y += 200;
      }
    });

  return {
    nodes: result,
    edges,
  };
}
