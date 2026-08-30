import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
} from "d3-force";

const WIDTH = 1600;
const HEIGHT = 1000;

// These should roughly match your actual React Flow cards.
const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 100;

function getNodeWidth(node: any) {
  return node.width ?? node.measured?.width ?? DEFAULT_NODE_WIDTH;
}

function getNodeHeight(node: any) {
  return node.height ?? node.measured?.height ?? DEFAULT_NODE_HEIGHT;
}

export function getForceLayout(nodes: any[], edges: any[]) {
  /*
   * ---------------------------------------------------------
   * 1. Prepare nodes
   * ---------------------------------------------------------
   */

  const simulationNodes = nodes.map((node, index) => {
    const width = getNodeWidth(node);
    const height = getNodeHeight(node);

    return {
      ...node,

      // Don't use `||` because 0 is a valid position.
      x:
        typeof node.position?.x === "number"
          ? node.position.x
          : 200 + Math.random() * (WIDTH - 400),

      y:
        typeof node.position?.y === "number"
          ? node.position.y
          : 150 + Math.random() * (HEIGHT - 300),

      nodeWidth: width,
      nodeHeight: height,

      /*
       * Important nodes can be pinned to the center.
       */
      fx: node.data?.isPrimary ? WIDTH / 2 : undefined,

      fy: node.data?.isPrimary ? HEIGHT / 2 : undefined,
    };
  });

  /*
   * ---------------------------------------------------------
   * 2. Build node lookup
   * ---------------------------------------------------------
   */

  const nodeIds = new Set(simulationNodes.map((node) => node.id));

  /*
   * ---------------------------------------------------------
   * 3. Remove broken edges
   * ---------------------------------------------------------
   */

  const validEdges = edges.filter((edge) => {
    const sourceExists = nodeIds.has(edge.source);

    const targetExists = nodeIds.has(edge.target);

    if (!sourceExists || !targetExists) {
      console.warn("[getForceLayout] Ignoring invalid edge", {
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        sourceExists,
        targetExists,
      });

      return false;
    }

    return true;
  });

  /*
   * ---------------------------------------------------------
   * 4. D3 links
   * ---------------------------------------------------------
   */

  const simulationEdges = validEdges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));

  /*
   * ---------------------------------------------------------
   * 5. Create simulation
   * ---------------------------------------------------------
   */

  const simulation = forceSimulation(simulationNodes)
    /*
     * -----------------------------------------------------
     * LINKS
     * -----------------------------------------------------
     */

    .force(
      "link",
      forceLink(simulationEdges)
        .id((node: any) => node.id)
        .distance((link: any) => {
          const sourcePriority = link.source?.data?.priority ?? 0;

          const targetPriority = link.target?.data?.priority ?? 0;

          /*
           * Important relationships stay closer.
           */
          if (sourcePriority >= 90 || targetPriority >= 90) {
            return 260;
          }

          return 340;
        })
        .strength(0.35),
    )

    /*
     * -----------------------------------------------------
     * PUSH NODES APART
     * -----------------------------------------------------
     */

    .force(
      "charge",
      forceManyBody().strength((node: any) => {
        const priority = node.data?.priority ?? 0;

        if (priority >= 90) {
          return -1200;
        }

        return -800;
      }),
    )

    /*
     * -----------------------------------------------------
     * CENTER
     * -----------------------------------------------------
     */

    .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))

    /*
     * -----------------------------------------------------
     * COLLISION
     * -----------------------------------------------------
     *
     * Your previous radius of 70 was too small.
     *
     * A 220px card with a 100px height needs substantially
     * more separation.
     */

    .force(
      "collision",
      forceCollide()
        .radius((node: any) => {
          const width = node.nodeWidth ?? DEFAULT_NODE_WIDTH;

          const height = node.nodeHeight ?? DEFAULT_NODE_HEIGHT;

          /*
           * Use half of the diagonal.
           *
           * This is intentionally conservative because
           * React Flow nodes are rectangles while
           * forceCollide works with circles.
           */

          const radius = Math.sqrt(
            Math.pow(width / 2, 2) + Math.pow(height / 2, 2),
          );

          /*
           * Add generous padding.
           */
          return radius + 35;
        })
        .strength(1.2),
    )

    /*
     * -----------------------------------------------------
     * EXTRA X/Y SEPARATION
     * -----------------------------------------------------
     */

    .force("x", forceX(WIDTH / 2).strength(0.015))

    .force("y", forceY(HEIGHT / 2).strength(0.015));

  /*
   * ---------------------------------------------------------
   * 6. Run simulation
   * ---------------------------------------------------------
   */

  simulation.alpha(1);
  simulation.alphaDecay(0.015);
  simulation.velocityDecay(0.4);

  /*
   * More iterations gives the collision force enough time
   * to separate nodes.
   */
  for (let i = 0; i < 1000; i++) {
    simulation.tick();
  }

  simulation.stop();

  /*
   * ---------------------------------------------------------
   * 7. Clamp positions
   * ---------------------------------------------------------
   *
   * Prevent cards from ending up outside the visible graph.
   */

  const layoutedNodes = simulationNodes.map((node: any) => {
    const width = node.nodeWidth ?? DEFAULT_NODE_WIDTH;

    const height = node.nodeHeight ?? DEFAULT_NODE_HEIGHT;

    const halfWidth = width / 2;

    const halfHeight = height / 2;

    const x = Math.max(
      halfWidth + 20,
      Math.min(WIDTH - halfWidth - 20, node.x ?? WIDTH / 2),
    );

    const y = Math.max(
      halfHeight + 20,
      Math.min(HEIGHT - halfHeight - 20, node.y ?? HEIGHT / 2),
    );

    return {
      ...node,

      position: {
        x,
        y,
      },

      /*
       * Don't send D3's internal properties to React Flow.
       */
      fx: undefined,
      fy: undefined,
      x: undefined,
      y: undefined,
      nodeWidth: undefined,
      nodeHeight: undefined,
    };
  });

  /*
   * ---------------------------------------------------------
   * 8. Return
   * ---------------------------------------------------------
   */

  return {
    nodes: layoutedNodes,
    edges: validEdges,
  };
}
