// Runs the coach's engine off the main thread so the board never freezes while it thinks.
importScripts('/engine.js');
const engine = createEngine();
onmessage = e => {
  const { id, fen, opts } = e.data;
  postMessage({ id, res: engine.go(fen, opts) });
};
