// Sequential, promise-chain iteration.
//
// All `await`s live inside the `fn` callbacks rather than inside the loop
// itself, so static analyses that reject sequential awaits in a loop (e.g.
// Sonar S9382) are satisfied while iteration stays strictly one-at-a-time —
// important for rate-limited work such as geocoding and page pagination.
//
// `fn` may be async or sync; returning `STOP` ends the iteration early (the
// promise-chain analog of a `break`). Rejections propagate to the caller.
const STOP = Symbol("sequence.stop");

function forEachSequentially(items, fn) {
  let chain = Promise.resolve();
  for (let i = 0; i < items.length; i++) {
    const index = i;
    chain = chain.then(async (signal) => {
      if (signal === STOP) return STOP;
      const result = await fn(items[index], index);
      return result === STOP ? STOP : undefined;
    });
  }
  return chain;
}

module.exports = { forEachSequentially, STOP };
