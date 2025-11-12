import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./style.css"; // se quiser

// Decks integration: wire auth state to migrate/load/subscribe decks
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Decks from "./decks";

// Expose a simple global API so existing components can call save/load if needed.
window.MytragorDecks = {
  save: Decks.saveDecks,
  load: Decks.loadDecks,
  subscribe: Decks.subscribeDecks,
  migrateLocalToServer: Decks.migrateLocalToServer,
};

let unsubscribeSnapshot = null;

onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      // attempt to migrate any anonymous local decks to user's server doc
      try { await Decks.migrateLocalToServer(); } catch (e) { console.debug('migrateLocalToServer failed', e); }
      // load current decks and set a simple global cache
      const decks = await Decks.loadDecks();
      window.__MYTRAGOR_DECKS = decks;
      // subscribe to server changes to keep cache up-to-date
      if (unsubscribeSnapshot) { try { unsubscribeSnapshot(); } catch(e){} }
      unsubscribeSnapshot = Decks.subscribeDecks((newDecks) => {
        window.__MYTRAGOR_DECKS = newDecks;
        if (typeof window.onMytragorDecksChanged === 'function') {
          try { window.onMytragorDecksChanged(newDecks); } catch(e){}
        }
      });
    } else {
      // user signed out: load local decks and clear server subscription
      if (unsubscribeSnapshot) { try { unsubscribeSnapshot(); } catch(e){}; unsubscribeSnapshot = null; }
      const decks = await Decks.loadDecks();
      window.__MYTRAGOR_DECKS = decks;
      if (typeof window.onMytragorDecksChanged === 'function') {
        try { window.onMytragorDecksChanged(decks); } catch(e){}
      }
    }
  } catch (err) {
    console.error('Decks init error', err);
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
