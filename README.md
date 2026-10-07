# Agentic Rag And Graphrag Solve Different Lab

Interactive companion lab for the article *Agentic RAG and GraphRAG solve different problems*. A deterministic support knowledge base proves that agentic RAG pays at query time, GraphRAG pays up front, and a hybrid can combine a graph index with an agent control loop.

## What it proves

The EU checkout question is multi-hop: the evidence path needs `eu-gateway`, `retry-queue`, and `payment-decision`. With a one-round agent budget it fails because the agent cannot gather all three steps. With 60% graph coverage it also fails because the graph is missing `payment-decision`. Increase either control and the same trace becomes supported, with call counts visible for every step.

## Run it

```text
npm start   # http://localhost:3000
npm test    # domain model + server end-to-end tests
npm run check
```

## Layout

- `public/lab.mjs` — single source of truth for queries, graph coverage, traces, workload reports, and the cost model
- `public/app.js` — plain-JS DOM wiring for the Lab page
- `app/server.js` — static server with `/health`, `/version`, `/api/lab`, and security headers
- `test/lab.test.mjs` — deterministic pass/fail behavior, including the failure mode
- `test/server.test.mjs` — ephemeral-port fetch tests for pages, health, version, and API

The lab is an educational model: calls are unit-cost steps, not production bills.

Repo: https://github.com/anhquanbd2021/agentic-rag-and-graphrag-solve-different
