# Bounded functionality smoke test

Mac, Node v26.8.1, existing subscription-backed Codex CLI 0.153.4 login.
One existing Tic-Tac-Toe prompt per tier, GPT-5.6 Sol / high, sequential,
no intentional delay. No API credentials created or changed.

| Requested tier | Protocol ID / thread acknowledgement | TTFT | Delivered TPS | Total | Errors / reroutes |
| --- | --- | ---: | ---: | ---: | ---: |
| Normal | default / default | 13.232s | 42.087 | 30.205s | 0 / 0 |
| Fast | priority / priority | 6.701s | 70.002 | 16.928s | 0 / 0 |

The installed CLI's generated `TurnStartParams` explicitly documents `default`
for standard speed. Its live `model/list` response advertised
`{"id":"priority","name":"Fast","description":"1.5x speed, increased usage"}`
for `gpt-5.6-sol`. The runner sent that exact ID in `thread/start.serviceTier`
and `turn/start.serviceTierForTurn`; thread creation acknowledged `priority`
and the turn completed. An initial preflight requiring the literal ID `fast`
was rejected locally before any generation. The implementation now resolves
the advertised Fast ID (including legacy `priority`). No tier fallback was used.

Neither real run exposed an effective backend tier in response metadata.
`effectiveServiceTier: null` means **unverified**, even though the requested
configuration was accepted. One sample per tier does not establish a speedup;
reasoning tokens and context length also differed.

Exact benchmark commands from the repository root:

```bash
node benchmark.mjs --models gpt-5.6-sol --efforts high --service-tier normal --delay-ms 0 --timeout-ms 90000 --output runs/smoke-normal
node benchmark.mjs --models gpt-5.6-sol --efforts high --service-tier fast --delay-ms 0 --timeout-ms 90000 --output runs/smoke-fast-priority
npm test
node scripts/check-smoke.mjs results/2026-10-02-smoke/normal/generated/gpt-5.6-sol-high-normal.ts results/2026-10-02-smoke/fast/generated/gpt-5.6-sol-high-fast.ts
```

12 automated tests cover parsing, propagation on every turn, both Fast protocol
IDs, thread acknowledgement mismatch, unsupported tiers, RPC errors, failed turns, effective-tier mismatch,
process exit, timeout, and unknown metrics. Both reviewed generated programs ran
with Node's native TypeScript stripping and passed invalid input, occupied-cell,
X-win and draw checks. The harness closes piped stdin after the result; with the
pipe held open, the Normal program remained alive until the 5s harness timeout.
Thus clean exit is verified with EOF, not with indefinitely open piped stdin.
No separate TypeScript type-check was performed (no compiler installed).

Only generated code and summarized measurements are committed. Raw app-server
notifications and credentials are not saved by the runner. The first run inherited
verbose app-server stderr; the updated runner discards diagnostic stderr to keep
private host context out of output. Protocol failures remain visible in summaries.
The committed summaries are the original measurements taken during implementation;
later changes add catalog evidence and stricter acknowledgement checks without
spending another pair of model calls.
