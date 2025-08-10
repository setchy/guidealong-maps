function log(msg) {
  process.stdout.write(`${String(msg)}\n`);
}

function error(msg) {
  process.stderr.write(`${String(msg)}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { log, error, sleep };
