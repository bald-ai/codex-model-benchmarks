import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error(
    "Usage: node scripts/render-cards.mjs <summary.json> <output-directory>",
  );
  process.exit(1);
}

const summary = JSON.parse(await readFile(resolve(inputArg), "utf8"));
const outputDir = resolve(outputArg);
await mkdir(outputDir, { recursive: true });

const labels = {
  "gpt-5.3-codex-spark": "Codex Spark",
  "gpt-5.6-terra": "Terra",
  "gpt-5.6-luna": "Luna",
  "gpt-5.6-sol": "Sol",
  "gpt-6-astra": "Astra",
};
const colors = { high: "#F15BB5", xhigh: "#F4A261" };
const width = 1600;
const height = 900;
const plotLeft = 360;
const plotRight = 1480;
const plotWidth = plotRight - plotLeft;

const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const resultFor = (model, effort) => {
  const result = summary.results.find(
    (row) => row.model === model && row.effort === effort,
  );
  if (!result) throw new Error(`Missing result for ${model}/${effort}`);
  return result;
};

function frame({ eyebrow, headline, headline2, subtitle, body, footerNote = "" }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="xhighPattern" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="10" height="10" fill="#3A261E"/>
      <rect width="4" height="10" fill="${colors.xhigh}"/>
    </pattern>
    <style>
      text { font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .eyebrow { fill: #AEB4C2; font-size: 19px; font-weight: 760; letter-spacing: 3px; }
      .headline { fill: #F7F8FC; font-size: 62px; font-weight: 790; letter-spacing: -1.8px; }
      .subtitle { fill: #AEB4C2; font-size: 21px; font-weight: 480; }
      .model { fill: #F7F8FC; font-size: 22px; font-weight: 680; }
      .effort { fill: #AEB4C2; font-size: 17px; font-weight: 650; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .value { fill: #F7F8FC; font-size: 18px; font-weight: 730; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .axis { fill: #818898; font-size: 17px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .footer { fill: #818898; font-size: 15px; }
      .note { fill: #AEB4C2; font-size: 16px; }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="#0B0D12"/>
  <text x="55" y="54" class="eyebrow">${escape(eyebrow)}</text>
  <text x="55" y="128" class="headline">${escape(headline)}</text>
  <text x="55" y="197" class="headline">${escape(headline2)}</text>
  <text x="55" y="240" class="subtitle">${escape(subtitle)}</text>
  ${body}
  <line x1="55" y1="840" x2="1545" y2="840" stroke="#2B2F3A" stroke-width="1"/>
  <text x="55" y="872" class="footer">TypeScript terminal Tic-Tac-Toe · Codex CLI 0.153.4 · Sep 8, 2026 · n=1 per condition</text>
  <text x="1545" y="872" text-anchor="end" class="note">${escape(footerNote)}</text>
</svg>
`;
}

function legend() {
  return `<g transform="translate(1240, 268)">
    <rect x="0" y="-15" width="20" height="15" rx="3" fill="${colors.high}"/>
    <text x="30" y="-2" class="footer">high</text>
    <rect x="100" y="-15" width="20" height="15" rx="3" fill="url(#xhighPattern)" stroke="${colors.xhigh}"/>
    <text x="130" y="-2" class="footer">xhigh</text>
  </g>`;
}

function barBody({ modelOrder, value, max, ticks, format }) {
  const x = (number) => plotLeft + (number / max) * plotWidth;
  let body = legend();
  for (const tick of ticks) {
    const position = x(tick);
    body += `<line x1="${position}" y1="300" x2="${position}" y2="788" stroke="#2B2F3A" stroke-width="1"/>`;
    body += `<text x="${position}" y="814" text-anchor="middle" class="axis">${escape(format(tick))}</text>`;
  }

  modelOrder.forEach((model, modelIndex) => {
    const groupY = 310 + modelIndex * 94;
    body += `<text x="55" y="${groupY + 38}" class="model">${escape(labels[model] ?? model)}</text>`;
    ["high", "xhigh"].forEach((effort, effortIndex) => {
      const row = resultFor(model, effort);
      const rowY = groupY + effortIndex * 34;
      const amount = value(row);
      const barEnd = x(amount);
      const fill = effort === "high" ? colors.high : "url(#xhighPattern)";
      body += `<text x="286" y="${rowY + 19}" class="effort">${effort}</text>`;
      body += `<rect x="${plotLeft}" y="${rowY}" width="${Math.max(2, barEnd - plotLeft)}" height="24" rx="4" fill="${fill}" stroke="${colors[effort]}" stroke-width="2"/>`;
      body += `<text x="${Math.min(barEnd + 12, 1525)}" y="${rowY + 19}" class="value">${escape(format(amount))}</text>`;
    });
  });
  return body;
}

function logDotBody({ modelOrder, value, min, max, ticks, format }) {
  const low = Math.log10(min);
  const span = Math.log10(max) - low;
  const x = (number) => plotLeft + ((Math.log10(number) - low) / span) * plotWidth;
  let body = `<g transform="translate(1240, 268)">
    <circle cx="10" cy="-8" r="8" fill="${colors.high}"/>
    <text x="30" y="-2" class="footer">high</text>
    <rect x="101" y="-16" width="16" height="16" fill="#0B0D12" stroke="${colors.xhigh}" stroke-width="3"/>
    <text x="130" y="-2" class="footer">xhigh</text>
  </g>`;
  for (const tick of ticks) {
    const position = x(tick);
    body += `<line x1="${position}" y1="300" x2="${position}" y2="788" stroke="#2B2F3A" stroke-width="1"/>`;
    body += `<text x="${position}" y="814" text-anchor="middle" class="axis">${escape(format(tick))}</text>`;
  }

  modelOrder.forEach((model, modelIndex) => {
    const groupY = 310 + modelIndex * 94;
    body += `<text x="55" y="${groupY + 38}" class="model">${escape(labels[model] ?? model)}</text>`;
    ["high", "xhigh"].forEach((effort, effortIndex) => {
      const row = resultFor(model, effort);
      const rowY = groupY + effortIndex * 34 + 12;
      const amount = value(row);
      const dotX = x(amount);
      body += `<text x="286" y="${rowY + 6}" class="effort">${effort}</text>`;
      body += `<line x1="${plotLeft}" y1="${rowY}" x2="${dotX}" y2="${rowY}" stroke="#3A3F4C" stroke-width="2"/>`;
      if (effort === "high") {
        body += `<circle cx="${dotX}" cy="${rowY}" r="9" fill="${colors.high}"/>`;
      } else {
        body += `<rect x="${dotX - 8}" y="${rowY - 8}" width="16" height="16" fill="#0B0D12" stroke="${colors.xhigh}" stroke-width="3"/>`;
      }
      body += `<text x="${Math.min(dotX + 14, 1518)}" y="${rowY + 6}" class="value">${escape(format(amount))}</text>`;
    });
  });
  return body;
}

const totalOrder = [
  "gpt-5.3-codex-spark",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-5.6-sol",
  "gpt-6-astra",
];
const ttftOrder = [
  "gpt-5.3-codex-spark",
  "gpt-5.6-terra",
  "gpt-5.6-sol",
  "gpt-5.6-luna",
  "gpt-6-astra",
];
const tpsOrder = [
  "gpt-5.3-codex-spark",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-6-astra",
  "gpt-5.6-sol",
];

const cards = [
  {
    name: "total-time",
    svg: frame({
      eyebrow: "TOTAL COMPLETION TIME",
      headline: "Spark finished the task before",
      headline2: "Astra started writing.",
      subtitle: "One run per setting · same TypeScript task · lower is better",
      body: barBody({
        modelOrder: totalOrder,
        value: (row) => row.totalMs / 1000,
        max: 45,
        ticks: [0, 10, 20, 30, 40],
        format: (value) => `${value.toFixed(value % 1 ? 1 : 0)}s`,
      }),
    }),
  },
  {
    name: "ttft",
    svg: frame({
      eyebrow: "TIME TO FIRST TOKEN",
      headline: "Sol starts fastest on high.",
      headline2: "Spark starts fastest on xhigh.",
      subtitle: "Time from turn/start to first generated code delta · lower is better",
      body: barBody({
        modelOrder: ttftOrder,
        value: (row) => row.ttftMs / 1000,
        max: 30,
        ticks: [0, 5, 10, 15, 20, 25, 30],
        format: (value) => `${value.toFixed(value % 1 ? 1 : 0)}s`,
      }),
    }),
  },
  {
    name: "delivered-tps",
    svg: frame({
      eyebrow: "DELIVERED TOKENS PER SECOND",
      headline: "Spark’s 16–33× delivery lead",
      headline2: "reflects chunky streaming.",
      subtitle: "Client-observed visible-token delivery · logarithmic scale · higher is better",
      body: logDotBody({
        modelOrder: tpsOrder,
        value: (row) => row.streamTps,
        min: 20,
        max: 2000,
        ticks: [20, 50, 100, 500, 2000],
        format: (value) => `${Math.round(value).toLocaleString("en-US")} TPS`,
      }),
      footerNote: "Spark emitted only 16–17 large deltas; this is not decoder throughput",
    }),
  },
];

for (const card of cards) {
  const path = resolve(outputDir, `${card.name}.svg`);
  await writeFile(path, card.svg);
  console.log(`Wrote ${path}`);
}
