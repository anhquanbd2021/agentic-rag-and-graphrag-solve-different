import test from 'node:test';
import assert from 'node:assert/strict';
import { QUERIES, graphCoverageEdges, traceFor, evaluateWorkload, costForQueries } from '../public/lab.mjs';

test('lookup succeeds on an agent budget of one', () => {
  const trace = traceFor(QUERIES[0], { strategy: 'agentic', agentBudget: 1 });
  assert.equal(trace.quality, 'pass');
  assert.equal(trace.totalCalls, 3);
});

test('multi-hop query reproduces agent budget failure', () => {
  const trace = traceFor(QUERIES[1], { strategy: 'agentic', agentBudget: 1 });
  assert.equal(trace.quality, 'fail');
  assert.match(trace.failure, /missed 2 required/);
  assert.equal(trace.modelCalls, 3);
});

test('graph-only succeeds when required edges are indexed', () => {
  const trace = traceFor(QUERIES[1], { strategy: 'graph', graphCoverage: 100 });
  assert.equal(trace.quality, 'pass');
  assert.equal(trace.graphCalls, 2);
});

test('graph-only reproduces incomplete-index failure', () => {
  const trace = traceFor(QUERIES[1], { strategy: 'graph', graphCoverage: 60 });
  assert.equal(trace.quality, 'fail');
  assert.match(trace.failure, /payment-decision/);
});

test('hybrid fills graph gaps with an agent fallback', () => {
  const trace = traceFor(QUERIES[1], { strategy: 'hybrid', graphCoverage: 60, agentBudget: 3 });
  assert.equal(trace.quality, 'pass');
  assert.match(trace.steps[1].label, /fallback/);
});

test('unknown strategy fails clearly', () => {
  assert.throws(() => traceFor(QUERIES[0], { strategy: 'nope' }), /unknown strategy/);
});

test('coverage is clamped and deterministic', () => {
  assert.deepEqual(graphCoverageEdges(0), ['tax-rate']);
  assert.deepEqual(graphCoverageEdges(100).length, 8);
  assert.deepEqual(traceFor(QUERIES[1], { strategy: 'graph', graphCoverage: 60 }), traceFor(QUERIES[1], { strategy: 'graph', graphCoverage: 60 }));
});

test('workload report counts failures and calls', () => {
  const report = evaluateWorkload({ strategy: 'graph', graphCoverage: 60 });
  assert.equal(report.traces.length, QUERIES.length);
  assert.equal(report.failed, 2);
  assert.ok(report.calls >= report.failed);
});

test('cost model separates build and query-time work', () => {
  assert.deepEqual(costForQueries('agentic', 30, { agentBudget: 2 }), { build: 0, perQuery: 4, total: 120 });
  assert.deepEqual(costForQueries('graph', 30), { build: 28, perQuery: 2, total: 88 });
});
