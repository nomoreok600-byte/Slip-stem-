// Pseudo-3D perspective projection for the endless racer.
// Objects live in (laneNorm, z) space where z is distance ahead of the camera.
// z = 0 is right at the player; larger z is farther toward the horizon.

export const ROAD = {
  horizonRatio: 0.28, // horizon line at 28% down the play area
  farZ: 300, // spawn distance
  hitZ: 10, // collision depth window around the player plane
  playerZ: 8, // player sits just in front of the camera
  roadHalfBottom: 0.5, // half road width (fraction of screen W) at the bottom
  depthDivisor: 42, // perspective strength (bigger = flatter)
};

export type Projected = { x: number; y: number; p: number; scale: number };

// Project a point to screen space. laneNorm in ~[-1.4, 1.4] (road spans [-1,1]).
export function project(z: number, laneNorm: number, W: number, H: number): Projected {
  const horizonY = H * ROAD.horizonRatio;
  const zz = Math.max(0, z);
  const p = 1 / (1 + zz / ROAD.depthDivisor); // 1 near -> ~0 far
  const y = horizonY + (H - horizonY) * p;
  const halfRoad = W * ROAD.roadHalfBottom * p;
  const x = W / 2 + laneNorm * halfRoad;
  return { x, y, p, scale: p };
}

// Convert a lane index to a normalized road offset in [-1, 1].
export function laneToNorm(lane: number, lanes: number): number {
  if (lanes <= 1) return 0;
  return ((lane / (lanes - 1)) * 2 - 1) * 0.82;
}
