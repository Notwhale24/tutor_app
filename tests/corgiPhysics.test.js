import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayground, constrainBall, releaseVelocity, throwBall, stepPlayground } from '../src/corgiPhysics.js';

test('a throw follows recent pointer direction, is capped, and ignores stale motion', () => {
  const v = releaseVelocity([{ x: 200, y: 300, t: 100 }, { x: 150, y: 320, t: 150 }], 150);
  assert.equal(v.vx, -1000); assert.equal(v.vy, 400);
  const fast = releaseVelocity([{ x: 0, y: 0, t: 0 }, { x: 500, y: 500, t: 20 }], 20);
  assert.ok(Math.hypot(fast.vx, fast.vy) <= 1300.001);
  assert.deepEqual(releaseVelocity([{ x: 0, y: 0, t: 0 }, { x: 100, y: 0, t: 20 }, { x: 100, y: 0, t: 300 }], 300), { vx: 0, vy: 0 });
});
test('rolling continues after release, slows down, and is consistent at 30 and 120 FPS', () => {
  const simulate = fps => {
    const m = createPlayground(2000, 1400);
    Object.assign(m.ball, { x: 500, y: 400, vx: 600, vy: 200 });
    for (let i = 0; i < fps; i++) stepPlayground(m, 1 / fps);
    return m.ball;
  };
  const a = simulate(30), b = simulate(120);
  assert.ok(a.x > 500); assert.ok(a.y > 400); assert.ok(a.vx > 0 && a.vx < 600);
  assert.ok(Math.abs(a.x - b.x) < 0.01); assert.ok(Math.abs(a.y - b.y) < 0.01);
});
test('all four edges bounce with lower speed and keep the ball inside the viewport', () => {
  for (const [x, y, vx, vy] of [[19, 200, -500, 0], [381, 200, 500, 0], [200, 77, 0, -500], [200, 773, 0, 500]]) {
    const m = createPlayground(400, 800);
    Object.assign(m.ball, { x, y, vx, vy }); stepPlayground(m, 1 / 30);
    assert.ok(vx ? m.ball.vx * vx < 0 : m.ball.vy * vy < 0);
    assert.ok(Math.hypot(m.ball.vx, m.ball.vy) < 500);
    assert.deepEqual(constrainBall(m, m.ball.x, m.ball.y), { x: m.ball.x, y: m.ball.y });
  }
});
test('corgi catches a rolling ball, carries it home, and returns to rest', () => {
  for (const width of [390, 1440]) {
    const m = createPlayground(width, 844);
    Object.assign(m.ball, { x: width / 2, y: 200 });
    throwBall(m, { vx: -500, vy: 200 });
    let carried = false;
    for (let i = 0; i < 2400; i++) { stepPlayground(m, 1 / 120); carried ||= m.dog.mode === 'return'; }
    assert.ok(carried); assert.equal(m.dog.mode, 'rest');
    assert.equal(m.dog.x, m.home.x); assert.equal(m.dog.y, m.home.y);
    assert.equal(m.ball.vx, 0); assert.equal(m.ball.vy, 0);
  }
});
test('dragging parks the corgi and prevents autonomous ball movement', () => {
  const m = createPlayground(390, 844);
  m.dragging = true; m.ball.vx = 500;
  const before = { ...m.ball }; stepPlayground(m, 1 / 30);
  assert.deepEqual(m.ball, before); assert.equal(m.dog.mode, 'rest');
});
