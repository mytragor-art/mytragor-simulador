import React, { useState, useEffect } from "react";
import Login from "./login";
import Decks from "./decks";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

function App() {
  const [user, setUser] = useState(null);
  const [decks, setDecks] = useState([]);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [codeMsg, setCodeMsg] = useState("");
  const [view, setView] = useState("home");
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    let unsub = null;
    let mounted = true;
    async function init() {
      try {
        const loaded = await Decks.loadDecks();
        if (!mounted) return;
        setDecks(loaded || []);
        unsub = Decks.subscribeDecks((newDecks) => {
          if (!mounted) return;
          setDecks(newDecks || []);
          setStatus("sincronizado");
        });
      } catch (e) {
        console.error("failed to init decks", e);
      }
    }
    init();
    return () => { mounted = false; if (unsub) try{ unsub(); }catch(e){} };
  }, [user]);

  async function handleSave() {
    setStatus("salvando...");
    try {
      await Decks.saveDecks(decks);
      setStatus("salvo");
    } catch (e) {
      console.error(e);
      setStatus("erro: " + (e.message || e));
    }
  }

  async function copyShareCode() {
    setCodeMsg("");
    try {
      const res = await Decks.exportDeckToShared(decks[selected]);
      const code = res.code;
      try { await navigator.clipboard.writeText(code); setCodeMsg("código copiado"); } catch(e) { setCodeMsg(code); }
    } catch (e) {
      setCodeMsg("erro: " + (e.message || e));
    }
  }

  async function importByCode() {
    setStatus("importando...");
    try {
      await Decks.importDeckFromCode(shareCode);
      const loaded = await Decks.loadDecks();
      setDecks(loaded || []);
      setStatus("importado");
      setShareCode("");
    } catch (e) {
      setStatus("erro: " + (e.message || e));
    }
  }

  function resolveStaticUrl(path){
    try{
      const u = new URL(window.location.href);
      if(u.port === '5173' && u.hostname === 'localhost'){ return `http://localhost:5500/${path}`; }
      const base = u.pathname.endsWith('/') ? u.pathname : u.pathname.substring(0, u.pathname.lastIndexOf('/') + 1);
      return base + path;
    }catch(_){ return '/' + path; }
  }
  function goVsIA(){ window.location.href = resolveStaticUrl('mytragor_simulador.html'); }
  function goDeckBuilder(){ setView("decks"); }
  function goGallery(){ window.location.href = resolveStaticUrl('gallery.html'); }
  function goMultiplayer(){ if(!user){ setShowLogin(true); } else { window.location.href = resolveStaticUrl('multiplayer.html'); } }

  function handleLogin(u) {
    setUser(u);
    setShowLogin(false);
  }

  function addDeck() {
    const id = `deck_${Date.now()}`;
    const d = { id, name: "Novo deck", cards: [] };
    setDecks((s) => [...s, d]);
    setSelected(decks.length);
  }

  function removeDeck(index) {
    if (!confirm("Remover este deck?")) return;
    setDecks((s) => s.filter((_, i) => i !== index));
    setSelected((s) => Math.max(0, s - 1));
  }

  function updateDeck(index, patch) {
    setDecks((s) => s.map((d, i) => i === index ? { ...d, ...patch } : d));
  }

  async function doLogout() {
    try {
      await signOut(auth);
    } catch (e) { console.warn(e); }
    setUser(null);
    setDecks([]);
  }

  if (view === "home") {
    return (
      <div className="wrap">
        <header className="brand-header">
          <div className="brandWrap">
            <div className="brand">Mytragor</div>
            <div className="subtitle">Trading card game</div>
          </div>
        </header>
        <div style={{ position: "absolute", right: 18, top: 18, display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ color: "#cbd5e1", fontWeight: 700 }}>{user ? user.email : ""}</div>
          <button className="auth-btn" onClick={()=> setShowLogin(true)}>{user?"Conta":"Entrar / Conta"}</button>
        </div>
        <main className="hero">
          <p className="lead">Escolha uma opção para começar</p>
          <nav className="menu" aria-label="Menu principal">
            <button className="gold-btn primary" onClick={goMultiplayer}>Multiplayer</button>
            <button className="gold-btn primary" onClick={goVsIA}>VS IA</button>
            <button className="gold-btn primary" onClick={goDeckBuilder}>Montar Deck</button>
            <button className="gold-btn primary" onClick={goGallery}>Galeria</button>
          </nav>
          <footer className="footer-medieval">do RPG de mesa para o Trading Card Game. Rola o D20.</footer>
        </main>
        <div className="mp-modal" style={{ display: showLogin? 'flex':'none' }}>
          <div className="mp-card" role="document">
            <div className="mp-header"><div className="mp-title">Conta Mytragor</div><div className="mp-actions"><button className="mp-btn ghost" onClick={()=> setShowLogin(false)}>Fechar</button></div></div>
            <div className="mp-body">
              <Login onLogin={handleLogin} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const current = decks[selected] || { id: "-", name: "(nenhum)", cards: [] };

  return (
    <div style={{ padding: 24, color: "#fff", background: "#0b1220", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Bem-vindo(a), {user.email}</h2>
          <div style={{ color: "#9ca3af", fontSize: 13 }}>ID: {user.uid}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ color: "#9ca3af", fontSize: 13 }}>{status}</div>
          <button onClick={addDeck} style={{ padding: "8px 12px" }}>+ Novo deck</button>
          <button onClick={handleSave} style={{ padding: "8px 12px" }}>Salvar decks</button>
          <button onClick={doLogout} style={{ padding: "8px 12px" }}>Sair</button>
          <button onClick={()=> setView("home")} style={{ padding: "8px 12px" }}>Voltar</button>
        </div>
      </header>

      <main style={{ display: "flex", gap: 20, marginTop: 18 }}>
        <aside style={{ width: 260, background: "#071025", padding: 12, borderRadius: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Seus decks</div>
          {decks.length === 0 && <div style={{ color: "#9ca3af" }}>Nenhum deck salvo</div>}
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {decks.map((d, i) => (
              <li key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 4px", borderRadius: 4, background: i===selected?"rgba(250,204,21,0.06)":"transparent" }}>
                <button onClick={() => setSelected(i)} style={{ background: "transparent", border: "none", color: "#fff", textAlign: "left" }}>{d.name || d.id}</button>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setSelected(i); }} style={{ padding: "4px 6px" }}>Abrir</button>
                  <button onClick={() => removeDeck(i)} style={{ padding: "4px 6px" }}>Remover</button>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section style={{ flex: 1, background: "#071025", padding: 12, borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{current.name}</h3>
            <div style={{ color: "#9ca3af" }}>ID: {current.id}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Nome do deck</label>
            <input value={current.name} onChange={(e)=> updateDeck(selected, { name: e.target.value })} style={{ width: "100%", padding: 8 }} />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Cartas (IDs separados por vírgula)</label>
            <textarea value={(current.cards||[]).join(",")} onChange={(e)=> updateDeck(selected, { cards: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} style={{ width: "100%", minHeight: 120, padding: 8 }} />
          </div>

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={copyShareCode} style={{ padding: "6px 10px" }}>Copiar código</button>
            {codeMsg && <span style={{ color: "#9ca3af", fontSize: 13 }}>{codeMsg}</span>}
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Importar por código</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={shareCode} onChange={(e)=> setShareCode(e.target.value)} placeholder="MTG:..." style={{ flex: 1, padding: 8 }} />
              <button onClick={importByCode} style={{ padding: "8px 12px" }}>Importar</button>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}

export default App;
