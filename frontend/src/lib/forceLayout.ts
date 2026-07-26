import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";

export function getForceLayout(nodes: any[], edges: any[]) {
  const width = 1200;
  const height = 800;

  const simulationNodes = nodes.map((node) => ({
    ...node,

    x: node.position?.x || Math.random() * width,

    y: node.position?.y || Math.random() * height,

    // important node strength

    fx: node.data?.isPrimary ? width / 2 : undefined,

    fy: node.data?.isPrimary ? height / 2 : undefined,
  }));

  const simulationEdges = edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));

  const simulation = forceSimulation(simulationNodes)
    // links
    .force(
      "link",
      forceLink(simulationEdges)
        .id((d: any) => d.id)
        .distance((edge: any) => {
          const source = edge.source.data?.priority || 10;

          const target = edge.target.data?.priority || 10;

          // important nodes closer

          if (source > 80 || target > 80) {
            return 150;
          }

          return 250;
        })
        .strength(0.8),
    )

    // push nodes apart

    .force(
      "charge",
      forceManyBody().strength((node: any) => {
        if (node.data?.priority >= 90) {
          return -700;
        }

        return -250;
      }),
    )

    // center

    .force("center", forceCenter(width / 2, height / 2))

    // prevent overlap

    .force(
      "collision",
      forceCollide().radius((node: any) => {
        if (node.data?.priority >= 90) return 120;

        return 70;
      }),
    );

  // run simulation

  for (let i = 0; i < 300; i++) {
    simulation.tick();
  }

  simulation.stop();

  return {
    nodes: simulationNodes.map((node) => ({
      ...node,

      position: {
        x: node.x,
        y: node.y,
      },
    })),

    edges,
  };
}
