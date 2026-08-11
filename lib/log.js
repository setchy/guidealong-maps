function log(msg) {
  process.stdout.write(`${String(msg)}\n`);
}

function warn(msg) {
  process.stdout.write(`⚠  WARNING: ${String(msg)}\n`);
}

function error(msg) {
  process.stderr.write(`${String(msg)}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { log, warn, error, sleep };
