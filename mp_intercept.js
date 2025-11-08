// === MULTIPLAYER INTERCEPT (lightweight) ===
// This shim keeps older pages working by starting the canonical Net client when
// present, but avoids monkey-patching Dispatcher here to prevent duplicate
// interception when controllers (NetController) or inline wrappers already do it.
try{
  if (window.Net && typeof window.Net.start === "function") {
    try{ window.Net.start(); }catch(e){ console.warn('Net.start failed', e); }
  }
}catch(e){ console.warn('mp_intercept init failed', e); }

// Note: Dispatcher interception is intentionally omitted from this file.
// Prefer NetController (controllers/NetController.js) or the inline wrapper
// (mytragor_simulador.html) to perform action broadcasting so we don't send
// the same action multiple times when multiple wrappers are loaded.
