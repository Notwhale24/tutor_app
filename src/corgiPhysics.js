export const BALL_RADIUS = 14;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export function createPlayground(width, height) {
  const home = { x: Math.max(64, width - 145), y: Math.max(96, height - 60) };
  return { width, height, home, dog: { ...home, facing: 1, mode: 'rest' }, ball: { x: Math.min(width - 24, home.x + 64), y: Math.min(height - 26, home.y + 20), vx: 0, vy: 0, angle: 0 }, dragging: false, pointerId: null, samples: [], catchAfter: 0 };
}
export function constrainBall(model, x, y) {
  return { x: clamp(x, BALL_RADIUS + 4, Math.max(BALL_RADIUS + 4, model.width - BALL_RADIUS - 4)), y: clamp(y, 76, Math.max(76, model.height - 26)) };
}
// Stale movement must not produce a throw after holding the ball still.
export function releaseVelocity(samples, now) {
  const recent = samples.filter(s => now - s.t <= 100);
  if (recent.length < 2) return { vx: 0, vy: 0 };
  const first = recent[0], last = recent[recent.length - 1], seconds = (last.t - first.t) / 1000;
  if (seconds < 0.008) return { vx: 0, vy: 0 };
  const vx = (last.x - first.x) / seconds, vy = (last.y - first.y) / seconds;
  const scale = Math.min(1, 1300 / (Math.hypot(vx, vy) || 1));
  return { vx: vx * scale, vy: vy * scale };
}
export function throwBall(model, velocity) {
  Object.assign(model.ball, velocity);
  model.dragging = false; model.pointerId = null; model.dog.mode = 'chase'; model.catchAfter = 0.35;
}
export function stepPlayground(model, seconds) {
  const { ball, dog } = model, dt = Math.max(0, Math.min(seconds, 1 / 30));
  if (!model.dragging && dog.mode !== 'return') {
    // Exact exponential friction keeps the roll consistent across frame rates.
    const decay = Math.exp(-2.1 * dt);
    ball.x += ball.vx * (1 - decay) / 2.1; ball.y += ball.vy * (1 - decay) / 2.1;
    ball.angle += ball.vx * dt / BALL_RADIUS; ball.vx *= decay; ball.vy *= decay;
    const position = constrainBall(model, ball.x, ball.y);
    if (position.x !== ball.x) ball.vx *= -0.65;
    if (position.y !== ball.y) ball.vy *= -0.65;
    Object.assign(ball, position);
    if (Math.hypot(ball.vx, ball.vy) < 8) ball.vx = ball.vy = 0;
  }
  if (model.dragging || dog.mode === 'rest') return;
  model.catchAfter = Math.max(0, model.catchAfter - dt);
  const target = dog.mode === 'return' ? model.home : ball;
  const dx = target.x - dog.x, dy = target.y - dog.y, distance = Math.hypot(dx, dy);
  const travel = Math.min(distance, (model.width < 600 ? 220 : 290) * dt);
  if (distance > 1) { dog.x += dx / distance * travel; dog.y += dy / distance * travel; if (Math.abs(dx) > 1) dog.facing = dx > 0 ? 1 : -1; }
  if (dog.mode === 'chase' && distance < 30 && model.catchAfter === 0) { dog.mode = 'return'; ball.vx = ball.vy = 0; }
  else if (dog.mode === 'return' && distance < 3) {
    Object.assign(dog, model.home, { mode: 'rest', facing: 1 });
    Object.assign(ball, constrainBall(model, dog.x + 64, dog.y + 20), { vx: 0, vy: 0 });
  }
}
