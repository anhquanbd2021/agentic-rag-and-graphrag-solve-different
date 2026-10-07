import { QUERIES, costForQueries, evaluateWorkload, traceFor } from './lab.mjs';
const strategyInput = document.querySelector('input[name=strategy]:checked');
const budgetInput = document.querySelector('#agent-budget');
const budgetOutput = document.querySelector('#budget-output');
const coverageInput = document.querySelector('#graph-coverage');
const coverageOutput = document.querySelector('#coverage-output');
const querySelect = document.querySelector('#query');
const runButton = document.querySelector('#run');
const resetButton = document.querySelector('#reset');
const traceList = document.querySelector('#trace-list');
const resultPanel = document.querySelector('#result-panel');
const workloadList = document.querySelector('#workload-list');
const summary = document.querySelector('#summary');
const callTotal = document.querySelector('#call-total');
const buildTotal = document.querySelector('#build-total');
const perQueryTotal = document.querySelector('#per-query-total');
function options() {
  return { strategy: strategyInput ? strategyInput.value : 'agentic', agentBudget: Number(budgetInput.value), graphCoverage: Number(coverageInput.value) };
}
function renderTrace() {
  const query = QUERIES.find(item => item.id === querySelect.value) || QUERIES[0];
  const opts = options();
  if (budgetOutput) budgetOutput.textContent = opts.agentBudget;
  if (coverageOutput) coverageOutput.textContent = opts.graphCoverage + '%';
  const trace = traceFor(query, opts);
  traceList.replaceChildren();
  trace.steps.forEach(step => {
    const item = document.createElement('li');
    item.className = 'trace-step';
    const number = document.createElement('span');
    number.className = 'step-number';
    number.textContent = step.step;
    const body = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = step.label;
    const detail = document.createElement('span');
    detail.textContent = step.detail;
    body.append(title, detail);
    const calls = document.createElement('span');
    calls.className = 'call-chip';
    calls.textContent = step.calls + ' call' + (step.calls === 1 ? '' : 's');
    item.append(number, body, calls);
    traceList.append(item);
  });
  resultPanel.className = 'result-panel ' + (trace.quality === 'pass' ? 'pass' : 'fail');
  resultPanel.replaceChildren();
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = trace.strategy + ' trace';
  const heading = document.createElement('h3');
  heading.textContent = trace.quality === 'pass' ? 'Answer supported' : 'Failure reproduced';
  const message = document.createElement('p');
  message.textContent = trace.failure || query.answer;
  const stats = document.createElement('dl');
  stats.className = 'result-stats';
  [['Model calls', trace.modelCalls], ['Graph calls', trace.graphCalls], ['Total calls', trace.totalCalls]].forEach(([label, value]) => {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    wrap.append(dt, dd);
    stats.append(wrap);
  });
  resultPanel.append(eyebrow, heading, message, stats);
  renderWorkload(opts);
}
function renderWorkload(opts) {
  const report = evaluateWorkload(opts);
  workloadList.replaceChildren();
  report.traces.forEach(trace => {
    const query = QUERIES.find(item => item.id === trace.queryId);
    const item = document.createElement('li');
    item.className = 'workload-row ' + (trace.quality === 'pass' ? 'pass' : 'fail');
    const label = document.createElement('span');
    label.className = 'row-label';
    label.textContent = query.label;
    const status = document.createElement('span');
    status.className = 'status';
    status.textContent = trace.quality === 'pass' ? 'supported' : 'misses evidence';
    item.append(label, status);
    workloadList.append(item);
  });
  summary.textContent = report.passed + ' of ' + report.traces.length + ' workload questions supported';
  const cost = costForQueries(opts.strategy, 30, opts);
  callTotal.textContent = cost.total + ' calls';
  buildTotal.textContent = cost.build + ' build calls';
  perQueryTotal.textContent = cost.perQuery + ' per query';
}
document.querySelectorAll('input[name=strategy]').forEach(input => input.addEventListener('change', renderTrace));
budgetInput.addEventListener('input', renderTrace);
coverageInput.addEventListener('input', renderTrace);
querySelect.addEventListener('change', renderTrace);
runButton.addEventListener('click', renderTrace);
resetButton.addEventListener('click', () => {
  budgetInput.value = 1;
  coverageInput.value = 60;
  querySelect.value = 'payment-hop';
  const agentic = document.querySelector('input[name=strategy][value=agentic]');
  if (agentic) agentic.checked = true;
  renderTrace();
});
renderTrace();
