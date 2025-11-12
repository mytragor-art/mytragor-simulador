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

  function handleLogin(u) {
    setUser(u);
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

  if (!user) {
    return <Login onLogin={handleLogin} />;
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

        </section>
      </main>
    </div>
  );
}

export default App;
