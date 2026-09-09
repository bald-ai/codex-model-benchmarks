import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error("Usage: node scripts/render-chart.mjs <summary.json> <output.svg>");
  process.exit(1);
}

const summary = JSON.parse(await readFile(resolve(inputArg), "utf8"));
const labels = {
  "gpt-5.3-codex-spark": "Codex Spark",
  "gpt-5.6-terra": "Terra",
  "gpt-5.6-luna": "Luna",
  "gpt-5.6-sol": "Sol",
  "gpt-6-astra": "Astra",
};
const modelOrder = [
  "gpt-5.3-codex-spark",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-5.6-sol",
  "gpt-6-astra",
];
const colors = { high: "#F15BB5", xhigh: "#F4A261" };
const rows = modelOrder.flatMap((model) =>
  ["high", "xhigh"].map((effort) =>
    summary.results.find(
      (result) => result.model === model && result.effort === effort,
    ),
  ),
);

if (rows.some((row) => !row)) {
  throw new Error("The summary does not contain every model/effort row.");
}

const width = 1600;
const height = 900;
const plotLeft = 385;
const plotRight = 1480;
const plotWidth = plotRight - plotLeft;
const plotTop = 235;
const maxSeconds = 45;
const rowHeight = 42;
const groupGap = 20;
const barHeight = 25;
const x = (milliseconds) =>
  plotLeft + (milliseconds / 1000 / maxSeconds) * plotWidth;
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

let body = "";
for (let seconds = 0; seconds <= 40; seconds += 10) {
  const position = x(seconds * 1000);
  body += `<line x1="${position}" y1="205" x2="${position}" y2="795" stroke="#2B2F3A" stroke-width="1"/>`;
  body += `<text x="${position}" y="825" text-anchor="middle" class="axis">${seconds}s</text>`;
}

let currentY = plotTop;
for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  const previous = rows[index - 1];
  if (previous && previous.model !== row.model) currentY += groupGap;

  const barEnd = x(row.totalMs);
  const ttftX = x(row.ttftMs);
  const barWidth = Math.max(2, barEnd - plotLeft);
  const fill = row.effort === "high" ? colors.high : "url(#xhighPattern)";
  const stroke = colors[row.effort];

  if (!previous || previous.model !== row.model) {
    body += `<text x="55" y="${currentY + 18}" class="model">${escape(labels[row.model] ?? row.model)}</text>`;
  }
  body += `<text x="292" y="${currentY + 18}" class="effort">${row.effort}</text>`;
  body += `<rect x="${plotLeft}" y="${currentY}" width="${barWidth}" height="${barHeight}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
  body += `<line x1="${ttftX}" y1="${currentY - 5}" x2="${ttftX}" y2="${currentY + barHeight + 5}" stroke="#F7F8FC" stroke-width="3"/>`;
  body += `<circle cx="${ttftX}" cy="${currentY + barHeight / 2}" r="5" fill="#0B0D12" stroke="#F7F8FC" stroke-width="3"/>`;
  body += `<text x="${barEnd + 12}" y="${currentY + 18}" class="value">${(row.totalMs / 1000).toFixed(1)}s</text>`;
  currentY += rowHeight;
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="xhighPattern" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="10" height="10" fill="#3A261E"/>
      <rect width="4" height="10" fill="${colors.xhigh}"/>
    </pattern>
    <style>
      text { font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .title { fill: #F7F8FC; font-size: 48px; font-weight: 760; letter-spacing: -1px; }
      .subtitle { fill: #AEB4C2; font-size: 22px; font-weight: 450; }
      .model { fill: #F7F8FC; font-size: 24px; font-weight: 680; }
      .effort { fill: #AEB4C2; font-size: 20px; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .value { fill: #F7F8FC; font-size: 20px; font-weight: 700; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .axis { fill: #818898; font-size: 18px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .callout { fill: #0B0D12; font-size: 20px; font-weight: 760; }
      .footer { fill: #818898; font-size: 16px; }
    </style>
  </defs>
  <rect width="1600" height="900" fill="#0B0D12"/>
  <text x="55" y="76" class="title">Codex model latency on the same coding task</text>
  <text x="55" y="116" class="subtitle">One run per setting · default tier · Sep 8, 2026 · bar = total time · white marker = TTFT</text>
  <rect x="1040" y="142" width="440" height="48" rx="6" fill="#F7F8FC"/>
  <text x="1260" y="174" text-anchor="middle" class="callout">Spark finished before Astra emitted code</text>
  <g>${body}</g>
  <g transform="translate(55, 855)">
    <rect x="0" y="-17" width="22" height="16" rx="3" fill="${colors.high}"/>
    <text x="32" y="-3" class="footer">high</text>
    <rect x="100" y="-17" width="22" height="16" rx="3" fill="url(#xhighPattern)" stroke="${colors.xhigh}"/>
    <text x="132" y="-3" class="footer">xhigh</text>
    <circle cx="245" cy="-9" r="5" fill="#0B0D12" stroke="#F7F8FC" stroke-width="3"/>
    <text x="260" y="-3" class="footer">first code token</text>
    <text x="1425" y="-3" text-anchor="end" class="footer">TypeScript terminal Tic-Tac-Toe · Codex CLI 0.153.4 · n=1</text>
  </g>
</svg>
`;

await writeFile(resolve(outputArg), svg);
console.log(`Wrote ${resolve(outputArg)}`);
