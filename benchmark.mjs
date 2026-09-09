import { execFileSync, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import readline from "node:readline";
import { performance } from "node:perf_hooks";

const DEFAULT_MODELS = [
  "gpt-5.6-luna",
  "gpt-6-astra",
  "gpt-5.3-codex-spark",
  "gpt-5.6-sol",
  "gpt-5.6-terra",
];
const DEFAULT_EFFORTS = ["high", "xhigh"];
const DEFAULT_PROMPT = [
  "Generate a complete, runnable TypeScript program for a two-player Tic-Tac-Toe game played in a terminal.",
  "It must use Node.js's built-in readline module, render a numbered 3x3 board, alternate X and O, validate input, reject occupied cells, detect wins and draws, announce the result, and close cleanly.",
  "Produce the solution in one response. Return only TypeScript source code, with no Markdown fences, preamble, explanation, or follow-up.",
].join(" ");
const BASE_INSTRUCTIONS = [
  "You are participating in a controlled code-generation latency benchmark.",
  "Answer the user's request directly and completely in a single final message.",
  "Never call tools, inspect files, browse, run commands, modify files, ask questions, or send intermediate commentary.",
  "Return only the requested source code with no Markdown fences, preamble, explanation, or follow-up.",
].join(" ");

async function parseArgs(argv) {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const options = {
    models: DEFAULT_MODELS,
    efforts: DEFAULT_EFFORTS,
    output: `runs/${timestamp}`,
    prompt: DEFAULT_PROMPT,
    delayMs: 500,
    timeoutMs: 300_000,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    const value = argv[index + 1];
    if (name === "--models") options.models = value.split(",");
    else if (name === "--efforts") options.efforts = value.split(",");
    else if (name === "--output") options.output = value;
    else if (name === "--prompt") options.prompt = value;
    else if (name === "--prompt-file") {
      options.prompt = await readFile(resolve(value), "utf8");
    } else if (name === "--delay-ms") options.delayMs = Number(value);
    else if (name === "--timeout-ms") options.timeoutMs = Number(value);
    else if (name === "--help") {
      console.log(`Usage: node benchmark.mjs [options]\n\nOptions:\n  --models a,b       Model slugs\n  --efforts a,b      Reasoning efforts\n  --output PATH      Output directory\n  --prompt TEXT      Inline prompt\n  --prompt-file PATH Read prompt from a file\n  --delay-ms N       Delay between turns\n  --timeout-ms N     Per-turn timeout`);
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete option: ${name}`);
    }
    index += 1;
  }
  return options;
}

const options = await parseArgs(process.argv.slice(2));
const outputDir = resolve(options.output);
await mkdir(resolve(outputDir, "generated"), { recursive: true });
const codexCliVersion = execFileSync("codex", ["--version"], {
  encoding: "utf8",
}).trim();

const runs = options.efforts.flatMap((_, round) =>
  options.models.map((model, modelIndex) => ({
    model,
    effort: options.efforts[(round + modelIndex) % options.efforts.length],
  })),
);
const wantedModels = new Set(options.models);
const child = spawn("codex", ["app-server", "--stdio"], {
  stdio: ["pipe", "pipe", "inherit"],
});
const rl = readline.createInterface({ input: child.stdout });
let nextId = 1;
const pending = new Map();
let activeRun = null;

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function request(method, params) {
  const id = nextId++;
  return new Promise((resolveRequest, rejectRequest) => {
    pending.set(id, { resolveRequest, rejectRequest });
    send({ id, method, params });
  });
}

function matchesActive(params) {
  if (!activeRun || params?.threadId !== activeRun.threadId) return false;
  return !activeRun.turnId || !params?.turnId || params.turnId === activeRun.turnId;
}

function handleNotification(message, now) {
  const { method, params } = message;
  if (!matchesActive(params)) return;
  if (method === "item/agentMessage/delta") {
    if (activeRun.firstTextMs === null) activeRun.firstTextMs = now;
    activeRun.lastTextMs = now;
    activeRun.text += params.delta;
    activeRun.deltaCount += 1;
  } else if (method === "rawResponse/completed") {
    if (params.usage) activeRun.usage = params.usage;
  } else if (method === "thread/tokenUsage/updated") {
    activeRun.fallbackUsage = params.tokenUsage?.last ?? null;
  } else if (method === "model/rerouted") {
    activeRun.reroutes.push(params);
  } else if (method === "error") {
    activeRun.errors.push(params);
  } else if (method === "turn/completed") {
    activeRun.completedMs = now;
    activeRun.turnStatus = params.turn.status;
    activeRun.resolveDone();
  }
}

const readerTask = (async () => {
  for await (const line of rl) {
    const now = performance.now();
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      continue;
    }
    if (Object.hasOwn(message, "id")) {
      const waiter = pending.get(message.id);
      if (!waiter) continue;
      pending.delete(message.id);
      if (message.error) waiter.rejectRequest(new Error(JSON.stringify(message.error)));
      else waiter.resolveRequest(message.result);
    } else if (message.method) {
      handleNotification(message, now);
    }
  }
})();

async function withTimeout(promise, milliseconds, label) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout);
  }
}

function safeName(value) {
  return value.replaceAll(/[^a-zA-Z0-9.-]+/g, "-");
}

const results = [];

try {
  await request("initialize", {
    clientInfo: {
      name: "codex-model-benchmarks",
      title: "Codex Model Benchmarks",
      version: "1.0.0",
    },
    capabilities: { experimentalApi: true, requestAttestation: false },
  });
  send({ method: "initialized" });

  const catalog = await request("model/list", { includeHidden: true, limit: 100 });
  const selectedCatalog = catalog.data.filter((entry) => wantedModels.has(entry.model));
  const found = new Set(selectedCatalog.map((entry) => entry.model));
  const missing = options.models.filter((model) => !found.has(model));
  if (missing.length) throw new Error(`Models unavailable: ${missing.join(", ")}`);

  for (const { model, effort } of runs) {
    const entry = selectedCatalog.find((candidate) => candidate.model === model);
    if (!entry.supportedReasoningEfforts.some((item) => item.reasoningEffort === effort)) {
      throw new Error(`${model} does not support ${effort}`);
    }
  }

  for (let index = 0; index < runs.length; index += 1) {
    const requested = runs[index];
    const threadResponse = await request("thread/start", {
      model: requested.model,
      allowProviderModelFallback: false,
      serviceTier: null,
      cwd: outputDir,
      runtimeWorkspaceRoots: [outputDir],
      approvalPolicy: "never",
      sandbox: "read-only",
      baseInstructions: BASE_INSTRUCTIONS,
      developerInstructions: "",
      personality: "none",
      ephemeral: true,
      historyMode: "paginated",
      sessionStartSource: "clear",
      threadSource: "latency-benchmark",
      environments: [],
      dynamicTools: [],
      selectedCapabilityRoots: [],
      experimentalRawEvents: true,
    });
    if (threadResponse.model !== requested.model) {
      throw new Error(`Requested ${requested.model}; got ${threadResponse.model}`);
    }

    let resolveDone;
    const done = new Promise((resolveDonePromise) => {
      resolveDone = resolveDonePromise;
    });
    activeRun = {
      ...requested,
      threadId: threadResponse.thread.id,
      turnId: null,
      requestStartMs: performance.now(),
      firstTextMs: null,
      lastTextMs: null,
      completedMs: null,
      text: "",
      deltaCount: 0,
      usage: null,
      fallbackUsage: null,
      reroutes: [],
      errors: [],
      turnStatus: null,
      resolveDone,
    };

    const turnResponse = await request("turn/start", {
      threadId: activeRun.threadId,
      input: [{ type: "text", text: options.prompt, text_elements: [] }],
      cwd: outputDir,
      runtimeWorkspaceRoots: [outputDir],
      approvalPolicy: "never",
      sandboxPolicy: { type: "readOnly", networkAccess: false },
      model: requested.model,
      serviceTierForTurn: "default",
      effort: requested.effort,
      summary: "none",
      personality: "none",
      environments: [],
    });
    activeRun.turnId = turnResponse.turn.id;
    await withTimeout(done, options.timeoutMs, `${requested.model}/${requested.effort}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));

    const usage = activeRun.usage ?? activeRun.fallbackUsage;
    const outputTokens = usage?.outputTokens ?? null;
    const reasoningTokens = usage?.reasoningOutputTokens ?? null;
    const visibleTokens =
      outputTokens === null || reasoningTokens === null
        ? null
        : Math.max(0, outputTokens - reasoningTokens);
    const ttftMs = activeRun.firstTextMs - activeRun.requestStartMs;
    const streamMs = activeRun.lastTextMs - activeRun.firstTextMs;
    const totalMs = activeRun.completedMs - activeRun.requestStartMs;
    const result = {
      model: requested.model,
      effort: requested.effort,
      executionOrder: index + 1,
      ttftMs,
      streamTps: visibleTokens / (streamMs / 1000),
      effectiveTps: visibleTokens / (totalMs / 1000),
      totalMs,
      inputTokens: usage?.inputTokens ?? null,
      cachedInputTokens: usage?.cachedInputTokens ?? null,
      outputTokens,
      reasoningTokens,
      visibleTokens,
      deltaCount: activeRun.deltaCount,
      turnStatus: activeRun.turnStatus,
      rerouteCount: activeRun.reroutes.length,
      errorCount: activeRun.errors.length,
    };
    results.push(result);
    await writeFile(
      resolve(outputDir, "generated", `${safeName(requested.model)}-${requested.effort}.ts`),
      activeRun.text,
    );
    console.log(
      `${index + 1}/${runs.length} ${requested.model}/${requested.effort}: TTFT ${(ttftMs / 1000).toFixed(1)}s, total ${(totalMs / 1000).toFixed(1)}s`,
    );
    activeRun = null;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, options.delayMs));
  }

  await writeFile(
    resolve(outputDir, "summary.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        measuredAt: new Date().toISOString(),
        codexCliVersion,
        transport: "Codex app-server over stdio",
        serviceTier: "default",
        sampleCountPerCondition: 1,
        prompt: options.prompt,
        runOrder: runs,
        results,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Results: ${resolve(outputDir, "summary.json")}`);
} finally {
  child.stdin.end();
  await Promise.race([readerTask, new Promise((resolveDone) => setTimeout(resolveDone, 2_000))]);
  if (!child.killed) child.kill("SIGTERM");
}
