import { auth, db } from '../firebase';
import { collection, doc, getDocs, addDoc, setDoc, deleteDoc } from 'firebase/firestore';

function getCurrentUserOrThrow() {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  return user;
}

export async function loadAllDecksRemote() {
  const user = getCurrentUserOrThrow();
  const decksCol = collection(db, `users/${user.uid}/decks`);
  const snap = await getDocs(decksCol);
  const decks = [];
  snap.forEach(d => decks.push({ id: d.id, ...d.data() }));
  return decks;
}

export async function createDeckRemote(deckData) {
  const user = getCurrentUserOrThrow();
  const decksCol = collection(db, `users/${user.uid}/decks`);
  const now = Date.now();
  const payload = Object.assign({}, deckData || {}, { createdAt: now, updatedAt: now });
  const ref = await addDoc(decksCol, payload);
  return { id: ref.id, ...payload };
}

export async function updateDeckRemote(deckId, patch) {
  if (!deckId) throw new Error('deckId é obrigatório');
  const user = getCurrentUserOrThrow();
  const d = doc(db, `users/${user.uid}/decks`, deckId);
  const now = Date.now();
  const payload = Object.assign({}, patch || {}, { updatedAt: now });
  await setDoc(d, payload, { merge: true });
  return { id: deckId, ...payload };
}

export async function deleteDeckRemote(deckId) {
  if (!deckId) throw new Error('deckId é obrigatório');
  const user = getCurrentUserOrThrow();
  const d = doc(db, `users/${user.uid}/decks`, deckId);
  await deleteDoc(d);
  return { id: deckId };
}
