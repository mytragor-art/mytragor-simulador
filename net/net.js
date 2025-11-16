// Clean, single Net client implementation
// - Implements ready handshake: p2 -> ready, p1 responds with state-sync (if Game.buildSnapshot exists)
// - Queueing of outgoing messages while disconnected
// - Methods: Net.start(), Net.sendAction(action), Net.publishState(state), Net.getStatus()
;(function(){
  var SERVER = localStorage.getItem('mpServer') || 'ws://localhost:8080';
  var isHttps = (function(){ try{ return location.protocol === 'https:'; }catch(e){ return false; } })();
  var isLocal = (function(){ try{ var h = location.hostname; return (h === 'localhost' || /\.local$/.test(h)); }catch(e){ return false; } })();
  var CANDIDATES = (function(){ var list=[]; try{ var s = localStorage.getItem('mpServer'); if(s) list.push(s); }catch(e){}
    if(isLocal){ list.push('ws://localhost:8080'); list.push('ws://localhost:5500/'); }
    return list; })();
  var curIdx = 0;
  var PARAMS = new URLSearchParams(location.search);
  var ROOM = (PARAMS.get('room') || 'TESTE123').trim().toUpperCase();
  var SIDE = (PARAMS.get('side') === 'p2') ? 'p2' : 'p1';

  var ws = null;
  var connected = false;
  var outSeq = 0;
  var inLastSeq = 0;
  var queue = [];

  function log(){ if(window.console) console.log.apply(console, ['[Net]'].concat(Array.prototype.slice.call(arguments))); }

  function start(){
    try{ if(typeof IS_MP !== 'undefined' && !IS_MP) { log('IS_MP disabled — skipping Net.start'); return; } }catch(e){}
    if(ws && ws.readyState === WebSocket.OPEN) return;
    ws = new WebSocket(SERVER + '?room=' + encodeURIComponent(ROOM) + '&side=' + encodeURIComponent(SIDE));

    ws.onopen = function(){ connected = true; try{ localStorage.setItem('mpServer', SERVER); }catch(e){} log('ws open', SERVER, ROOM, SIDE); flush();
      if(SIDE === 'p2'){ setTimeout(function(){ safeSend({ type:'ready', from: SIDE }); }, 120); }
    };

    ws.onclose = function(){ connected = false; log('ws close'); if(CANDIDATES.length){ curIdx = (curIdx+1) % CANDIDATES.length; SERVER = CANDIDATES[curIdx]; } setTimeout(start, 1200); };
    ws.onerror = function(e){ console.warn('[Net] ws error', e); };

    ws.onmessage = function(ev){
      var msg = null; try{ msg = JSON.parse(ev.data); }catch(e){ return; }
      if(!msg || !msg.type) return;

      if(msg.type === 'hello'){
        if(msg.lastState) applyState(msg.lastState, true);
        return;
      }

      if(msg.type === 'ready'){
        if(SIDE === 'p1'){
          try{ if(window.Game && typeof Game.buildSnapshot === 'function'){ var snap = Game.buildSnapshot(); publishState(snap); } }
          catch(e){ console.warn('[Net] publish snapshot failed', e); }
        }
        return;
      }

      if(msg.type === 'state-sync' || msg.type === 'state-apply'){
        if(msg.state) applyState(msg.state, true);
        return;
      }

      if(msg.type === 'action'){
        if(msg.from === SIDE) return; // ignore own echoes
        if(typeof msg.seq === 'number' && msg.seq <= inLastSeq) return;
        if(typeof msg.seq === 'number') inLastSeq = msg.seq;
        log('incoming action', msg.action, msg.from, msg.seq);
        if(window.Dispatcher && typeof Dispatcher.apply === 'function'){
          try{ Dispatcher.apply(msg.action, { remote:true }); }catch(e){ console.warn('[Net] Dispatcher.apply failed', e); }
        } else if(typeof window.executarAcao === 'function'){
          try{ var a = msg.action; window.executarAcao(a.tipo, a.dados); }catch(e){ console.warn('[Net] executarAcao failed', e); }
        }
        return;
      }
    };
  }

  function safeSend(obj){ var s = JSON.stringify(obj); if(connected && ws && ws.readyState === WebSocket.OPEN) ws.send(s); else queue.push(s); }
  function flush(){ while(queue.length && connected && ws && ws.readyState === WebSocket.OPEN) ws.send(queue.shift()); }

  function sendAction(action){ outSeq += 1; safeSend({ type:'action', action: action, from: SIDE, seq: outSeq }); }
  function publishState(state){ safeSend({ type:'state-sync', state: state, from: SIDE }); }

  function applyState(state, remote){
    if(window.Game && typeof Game.loadSnapshot === 'function'){
      try{ Game.loadSnapshot(state); }catch(e){ console.warn('[Net] Game.loadSnapshot failed', e); }
    } else if(window.Game && typeof Game.applySnapshot === 'function'){
      try{ Game.applySnapshot(state, { remote: !!remote }); }catch(e){ console.warn('[Net] Game.applySnapshot failed', e); }
    } else { log('state received', state); }
  }

  function getStatus(){ return { connected: connected, room: ROOM, side: SIDE, outSeq: outSeq, inLastSeq: inLastSeq, queue: queue.slice() }; }

  window.Net = { start: start, sendAction: sendAction, publishState: publishState, getStatus: getStatus };

  // auto-start shortly after load if in MP mode
  setTimeout(function(){ try{ if(typeof IS_MP !== 'undefined' && IS_MP) start(); }catch(e){} }, 120);

})();
