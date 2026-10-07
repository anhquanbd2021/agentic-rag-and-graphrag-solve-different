export const STRATEGIES = ['agentic', 'graph', 'hybrid'];
export const QUERIES = [
  { id: 'tax-lookup', label: 'What is the current VAT rate?', type: 'lookup', requiredEdges: ['tax-rate'], requiredSteps: 1, answer: 'The current VAT rate is 23%.' },
  { id: 'payment-hop', label: 'Why did the EU checkout retry fail?', type: 'multi-hop', requiredEdges: ['eu-gateway', 'retry-queue', 'payment-decision'], requiredSteps: 3, answer: 'The EU gateway retried the same idempotency key after a timeout.' },
  { id: 'refund-exception', label: 'Can a refund exceed the invoice amount?', type: 'ambiguous', requiredEdges: ['refund-policy', 'invoice-override'], requiredSteps: 2, answer: 'Only with a documented finance override.' },
];
export const GRAPH_EDGES = [
  'tax-rate',
  'eu-gateway',
  'retry-queue',
  'support-playbook',
  'ledger-schema',
  'refund-policy',
  'invoice-override',
  'payment-decision',
];
export function graphCoverageEdges(coverage) {
  const ratio = Math.max(0, Math.min(100, Number(coverage))) / 100;
  return GRAPH_EDGES.slice(0, Math.max(1, Math.floor(GRAPH_EDGES.length * ratio)));
}
export function traceFor(query, options = {}) {
  const strategy = options.strategy || 'agentic';
  if (!STRATEGIES.includes(strategy)) {
    throw new Error('unknown strategy: ' + strategy);
  }
  const budget = Math.max(1, Number(options.agentBudget ?? 1));
  const coverage = Math.max(0, Math.min(100, Number(options.graphCoverage ?? 100)));
  const available = graphCoverageEdges(coverage);
  const steps = [];
  let modelCalls = 0;
  let graphCalls = 0;
  let quality = 'fail';
  let failure = null;
  if (strategy === 'agentic') {
    steps.push({ step: 1, label: 'Plan retrieval', detail: 'choose up to ' + budget + ' search rounds', calls: 1 });
    modelCalls += 1;
    for (let round = 1; round <= Math.min(budget, query.requiredSteps); round += 1) {
      steps.push({ step: round + 1, label: 'Search round ' + round, detail: 'retrieve evidence for step ' + round + ' of ' + query.requiredSteps, calls: 1 });
      modelCalls += 1;
    }
    if (budget >= query.requiredSteps) {
      quality = 'pass';
      steps.push({ step: steps.length + 1, label: 'Reflect and answer', detail: query.answer, calls: 1 });
      modelCalls += 1;
    } else {
      failure = 'agent budget ' + budget + ' missed ' + (query.requiredSteps - budget) + ' required evidence step(s)';
      steps.push({ step: steps.length + 1, label: 'Answer from partial evidence', detail: failure, calls: 1 });
      modelCalls += 1;
    }
  }
  if (strategy === 'graph') {
    steps.push({ step: 1, label: 'Traverse graph', detail: 'coverage ' + coverage + '%', calls: 1 });
    graphCalls += 1;
    const missing = query.requiredEdges.filter(edge => !available.includes(edge));
    if (missing.length === 0) {
      quality = 'pass';
      steps.push({ step: 2, label: 'Resolve path', detail: query.answer, calls: 1 });
      graphCalls += 1;
    } else {
      failure = 'missing graph edge(s): ' + missing.join(', ');
      steps.push({ step: 2, label: 'Return nearest path', detail: failure, calls: 1 });
      graphCalls += 1;
    }
  }
  if (strategy === 'hybrid') {
    steps.push({ step: 1, label: 'Agent reads graph path', detail: 'coverage ' + coverage + '%', calls: 1 });
    graphCalls += 1;
    const missing = query.requiredEdges.filter(edge => !available.includes(edge));
    if (missing.length === 0) {
      quality = 'pass';
      steps.push({ step: 2, label: 'Agent verifies evidence', detail: query.answer, calls: 1 });
      modelCalls += 1;
    } else {
      steps.push({ step: 2, label: 'Agent searches fallback', detail: 'fill ' + missing.length + ' missing edge(s)', calls: 1 });
      modelCalls += 1;
      quality = budget >= query.requiredSteps ? 'pass' : 'fail';
      failure = quality === 'fail' ? 'hybrid budget ' + budget + ' still missed evidence' : query.answer;
      steps.push({ step: 3, label: 'Answer with hybrid path', detail: failure, calls: 1 });
      modelCalls += 1;
    }
  }
  return { queryId: query.id, strategy, budget, coverage, quality, failure, steps, modelCalls, graphCalls, totalCalls: modelCalls + graphCalls };
}
export function simulateQuery(query, options) {
  return traceFor(query, options);
}
export function simulateAll(options = {}) {
  return QUERIES.map(query => traceFor(query, options));
}
export function costForQueries(strategy, queryCount, options = {}) {
  const model = { agentic: { build: 0, perQuery: 4 }, graph: { build: 28, perQuery: 2 }, hybrid: { build: 28, perQuery: 3 } }[strategy];
  const budget = Math.max(1, Number(options.agentBudget ?? 1));
  const perQuery = strategy === 'agentic' ? 2 + budget : model.perQuery;
  return { build: model.build, perQuery, total: model.build + perQuery * Math.max(0, Number(queryCount) || 0) };
}
export function evaluateWorkload(options = {}) {
  const traces = simulateAll(options);
  return {
    traces,
    passed: traces.filter(trace => trace.quality === 'pass').length,
    failed: traces.filter(trace => trace.quality !== 'pass').length,
    calls: traces.reduce((sum, trace) => sum + trace.totalCalls, 0),
  };
}
