import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createStaticServer } from '../app/server.js';

async function withServer(fn) {
  const server = createStaticServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  try { await fn(base); } finally { server.close(); }
}

test('server serves lab pages and API endpoint', async () => {
  await withServer(async base => {
    const index = await fetch(base + '/');
    assert.equal(index.status, 200);
    assert.match(await index.text(), /Pay once, or pay every question/);
    const guide = await fetch(base + '/guide.html');
    assert.equal(guide.status, 200);
    assert.match(await guide.text(), /One lab, three architectures/);
    const health = await fetch(base + '/health');
    assert.equal(await health.text(), 'ok');
    const version = await fetch(base + '/version');
    assert.equal((await version.json()).name, 'agentic-rag-and-graphrag-solve-different-demo');
    const api = await fetch(base + '/api/lab?strategy=graph&agentBudget=3&graphCoverage=60');
    assert.equal(api.status, 200);
    assert.deepEqual(await api.json(), { model: 'deterministic-support-kb' });

    const lab = await fetch(base + '/lab.mjs');
    assert.equal(lab.status, 200);
    assert.match(await lab.text(), /export const STRATEGIES/);

    const shell = await fetch(base + '/pb-shell.css');
    assert.equal(shell.status, 200);

    const back = await fetch(base + '/pb-back.css');
    assert.equal(back.status, 200);
  });
});

test('unknown paths and traversal return 404', async () => {
  await withServer(async base => {
    assert.equal((await fetch(base + '/nope')).status, 404);
    assert.equal((await fetch(base + '/../package.json')).status, 404);
  });
});
