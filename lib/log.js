const pc = require("picocolors");

function log(msg) {
  process.stdout.write(`${String(msg)}\n`);
}

function warn(msg) {
  log(`${pc.yellow("⚠")}  ${pc.yellow("WARNING")}: ${msg}`);
}

function error(msg) {
  process.stderr.write(`${pc.red(String(msg))}\n`);
}

// Bold phase header with a per-phase accent color.
const PHASE_COLORS = {
  inventory: pc.cyan,
  details: pc.magenta,
  geocode: pc.yellow,
};

function phase(name, title) {
  const color = PHASE_COLORS[name] || pc.bold;
  log(`${color(pc.bold(title))}`);
  log(pc.dim("─".repeat(Math.max(24, String(title).length + 2))));
}

// Progress line: cyan "prefix" counter, normal message text.
function progress(prefix, message) {
  log(`${pc.cyan(prefix)} ${message}`);
}

function success(msg) {
  log(pc.green(msg));
}

// Render a boxed summary block from an array of [label, value] pairs.
// A row may be a plain string (rendered as-is, e.g. a blank separator) or a
// [label, value] pair.
function summary(title, rows) {
  const lines = [
    pc.bold(pc.cyan(title)),
    "",
    ...rows.map((row) => {
      if (typeof row === "string") return row;
      const [label, value] = row;
      return `${label ? `  ${label}:` : ""} ${value}`.trimEnd();
    }),
  ];
  const width = Math.max(...lines.map((l) => stripAnsi(l).length));
  const border = pc.dim("─".repeat(width + 2));
  const out = [];
  out.push(pc.dim("┌") + border + pc.dim("┐"));
  for (const line of lines) {
    const pad = " ".repeat(width - stripAnsi(line).length);
    out.push(`${pc.dim("│")} ${line}${pad} ${pc.dim("│")}`);
  }
  out.push(pc.dim("└") + border + pc.dim("┘"));
  log(`\n${out.join("\n")}\n`);
}

const ESC = String.fromCharCode(27);
function stripAnsi(s) {
  return String(s).replace(new RegExp(`${ESC}\\[[0-9;]*m`, "g"), "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { log, warn, error, phase, progress, success, summary, sleep };
