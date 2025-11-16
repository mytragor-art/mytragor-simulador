// Decks storage helpers: save/load/subscribe to user decks.
// Uses Firebase Firestore when a user is signed in (per-user docs)
// and falls back to localStorage when offline or not authenticated.
//
// Exports:
// - saveDecks(decks) => Promise
// - loadDecks() => Promise<decks[]>
// - subscribeDecks(onChange) => () => unsubscribe
// - migrateLocalToServer() => Promise (attempt to push local decks to server)

import { auth, db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, collection, addDoc } from 'firebase/firestore';

const LOCAL_KEY = 'mytragor:decks_local';

/** Save decks for the current user or to localStorage when not signed in. */
export async function saveDecks(decks){
	// normalize to array
	const payload = Array.isArray(decks) ? decks : [decks];
	const user = auth.currentUser;
	if(isFirebaseEnabled() && user && user.uid){
		const ref = doc(db, 'userDecks', user.uid);
		await setDoc(ref, { decks: payload, updatedAt: serverTimestamp(), email: user.email || null }, { merge: true });
		// keep a local cache as well
		try{ localStorage.setItem(`${LOCAL_KEY}:${user.uid}`, JSON.stringify(payload)); }catch(e){}
		return { source: 'server' };
	} else {
		try{ localStorage.setItem(LOCAL_KEY, JSON.stringify(payload)); }catch(e){}
		return { source: 'local' };
	}
}

/** Load decks for the current user or from localStorage. */
export async function loadDecks(){
	const user = auth.currentUser;
	if(isFirebaseEnabled() && user && user.uid){
		try{
			const ref = doc(db, 'userDecks', user.uid);
			const snap = await getDoc(ref);
			if(snap.exists()){
				const data = snap.data();
				return data.decks || [];
			}
			// fallback to any cached local copy
			const cached = localStorage.getItem(`${LOCAL_KEY}:${user.uid}`) || localStorage.getItem(LOCAL_KEY);
			return cached ? JSON.parse(cached) : [];
		}catch(e){
			// if Firestore fails, fallback to localStorage
			const cached = localStorage.getItem(`${LOCAL_KEY}:${user.uid}`) || localStorage.getItem(LOCAL_KEY);
			return cached ? JSON.parse(cached) : [];
		}
	} else {
		const cached = localStorage.getItem(LOCAL_KEY);
		return cached ? JSON.parse(cached) : [];
	}
}

/** Subscribe to server-side deck changes for the current user.
 * Returns an unsubscribe function. If user isn't signed in, returns a no-op.
 */
export function subscribeDecks(onChange){
	let unsub = () => {};
	const user = auth.currentUser;
	if(isFirebaseEnabled() && user && user.uid){
		const ref = doc(db, 'userDecks', user.uid);
		unsub = onSnapshot(ref, snap => {
			if(!snap.exists()) return onChange([]);
			const data = snap.data();
			onChange(data.decks || []);
		}, err => {
			console.warn('deck subscription error', err);
		});
	} else {
		// no user: read from localStorage and call once
		const cached = localStorage.getItem(LOCAL_KEY);
		const decks = cached ? JSON.parse(cached) : [];
		setTimeout(()=> onChange(decks), 0);
	}
	return () => { try{ unsub(); }catch(e){} };
}

/** If there are decks stored in localStorage for anonymous usage, attempt to push them to the user's server doc.
 * Simplest strategy: if server has no decks, upload local copy. Otherwise do nothing and keep local backup.
 */
export async function migrateLocalToServer(){
	const user = auth.currentUser;
	if(!isFirebaseEnabled()) return { migrated: false, reason: 'disabled' };
	if(!(user && user.uid)) throw new Error('Not signed in');
	const ref = doc(db, 'userDecks', user.uid);
	const snap = await getDoc(ref);
	const local = localStorage.getItem(LOCAL_KEY);
	if(!local) return { migrated: false, reason: 'no-local' };
	const localDecks = JSON.parse(local || '[]');
	if(snap.exists()){
		// server already has decks -> keep server as source-of-truth; keep a timestamped local backup
		try{ localStorage.setItem(`${LOCAL_KEY}:backup:${Date.now()}`, JSON.stringify(localDecks)); }catch(e){}
		return { migrated: false, reason: 'server-has-data' };
	}
	// server empty -> write local decks there
	await setDoc(ref, { decks: localDecks, migratedAt: serverTimestamp(), email: user.email || null });
	try{ localStorage.removeItem(LOCAL_KEY); }catch(e){}
	return { migrated: true };
}

export async function exportDeckToShared(deck){
  const user = auth.currentUser;
  if(!isFirebaseEnabled()) throw new Error('Firebase disabled');
  if(!(user && user.uid)) throw new Error('Not signed in');
  const payload = Array.isArray(deck) ? deck[0] : deck;
  if(!payload || typeof payload !== 'object') throw new Error('Deck inválido');
  const col = collection(db, 'sharedDecks');
  const ref = await addDoc(col, { deck: payload, ownerUid: user.uid, email: user.email || null, createdAt: serverTimestamp() });
  return { code: `MTG:${ref.id}`, id: ref.id };
}

export async function importDeckFromCode(code){
  const user = auth.currentUser;
  if(!isFirebaseEnabled()) throw new Error('Firebase disabled');
  if(!(user && user.uid)) throw new Error('Not signed in');
  if(!code || typeof code !== 'string') throw new Error('Código inválido');
  const trimmed = code.trim();
  if(!trimmed.startsWith('MTG:')) throw new Error('Formato de código não reconhecido');
  const id = trimmed.slice(4);
  const ref = doc(db, 'sharedDecks', id);
  const snap = await getDoc(ref);
  if(!snap.exists()) throw new Error('Deck compartilhado não encontrado');
  const data = snap.data();
  const sharedDeck = data && (data.deck || null);
  if(!sharedDeck) throw new Error('Dados de deck inválidos');
  const current = await loadDecks();
  const next = [...current, sharedDeck];
  await saveDecks(next);
  return { imported: true, count: next.length };
}

// Optional helper: when auth state changes, you may want to auto-call migrateLocalToServer()
// Example usage in your auth listener:
// auth.onAuthStateChanged(async user => { if(user) await migrateLocalToServer(); });

export default { saveDecks, loadDecks, subscribeDecks, migrateLocalToServer, exportDeckToShared, importDeckFromCode };

function isFirebaseEnabled(){ try{ return localStorage.getItem('disableFirebase') !== '1'; }catch(e){ return true; } }

