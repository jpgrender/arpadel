import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, collection, getDocs,
  setDoc, deleteDoc, addDoc, serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDR7Ai0A-Ha3rEhp3M4KKe4c_dKEcBQSyE",
  authDomain: "arpadel-466c5.firebaseapp.com",
  projectId: "arpadel-466c5",
  storageBucket: "arpadel-466c5.firebasestorage.app",
  messagingSenderId: "808686623568",
  appId: "1:808686623568:web:540fe1743052ff5ca2ea55",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ── Initial data (used only on first run) ────────────────────────────────────
const SEED_PLAYERS = [
  { id:1,  name:"Martín", pts:420, wins:14, matches:18 },
  { id:2,  name:"Lucas",  pts:390, wins:13, matches:17 },
  { id:3,  name:"Diego",  pts:370, wins:12, matches:18 },
  { id:4,  name:"Tomás",  pts:350, wins:11, matches:17 },
  { id:5,  name:"Nico",   pts:320, wins:10, matches:17 },
  { id:6,  name:"Santi",  pts:310, wins:10, matches:16 },
  { id:7,  name:"Facu",   pts:290, wins:9,  matches:16 },
  { id:8,  name:"Eze",    pts:275, wins:8,  matches:15 },
  { id:9,  name:"Guille", pts:260, wins:8,  matches:16 },
  { id:10, name:"Maxi",   pts:250, wins:7,  matches:15 },
  { id:11, name:"Fer",    pts:235, wins:6,  matches:14 },
  { id:12, name:"Pablo",  pts:220, wins:6,  matches:15 },
  { id:13, name:"Gonza",  pts:200, wins:5,  matches:14 },
  { id:14, name:"Lean",   pts:185, wins:4,  matches:13 },
  { id:15, name:"Rolo",   pts:170, wins:4,  matches:13 },
  { id:16, name:"Marce",  pts:155, wins:3,  matches:12 },
  { id:17, name:"Caro",   pts:240, wins:5,  matches:13 },
  { id:18, name:"Juli",   pts:195, wins:3,  matches:11 },
  { id:19, name:"Beto",   pts:300, wins:8,  matches:14 },
  { id:20, name:"Chino",  pts:265, wins:7,  matches:15 },
];

// !! IMPORTANTE: cambiá los PINs antes de compartir la app con el grupo !!
const SEED_USERS = [
  { id:1,  name:"Martín", pin:"1234", role:"admin" },
  { id:2,  name:"Lucas",  pin:"0000", role:"user"  },
  { id:3,  name:"Diego",  pin:"0000", role:"user"  },
  { id:4,  name:"Tomás",  pin:"0000", role:"user"  },
  { id:5,  name:"Nico",   pin:"0000", role:"user"  },
  { id:6,  name:"Santi",  pin:"0000", role:"user"  },
  { id:7,  name:"Facu",   pin:"0000", role:"user"  },
  { id:8,  name:"Eze",    pin:"0000", role:"user"  },
  { id:9,  name:"Guille", pin:"0000", role:"user"  },
  { id:10, name:"Maxi",   pin:"0000", role:"user"  },
  { id:11, name:"Fer",    pin:"0000", role:"user"  },
  { id:12, name:"Pablo",  pin:"0000", role:"user"  },
  { id:13, name:"Gonza",  pin:"0000", role:"user"  },
  { id:14, name:"Lean",   pin:"0000", role:"user"  },
  { id:15, name:"Rolo",   pin:"0000", role:"user"  },
  { id:16, name:"Marce",  pin:"0000", role:"user"  },
  { id:17, name:"Caro",   pin:"0000", role:"user"  },
  { id:18, name:"Juli",   pin:"0000", role:"user"  },
  { id:19, name:"Beto",   pin:"0000", role:"user"  },
  { id:20, name:"Chino",  pin:"0000", role:"user"  },
];

const SEED_PAIR_HISTORY = {
  "1-2":3,"1-3":2,"2-4":2,"3-5":1,"4-6":3,
  "5-7":2,"6-8":1,"7-9":2,"8-10":1,"9-11":1,
};

const SEED_SESSION = {
  attending: SEED_PLAYERS.map(p => p.id),
  courts: 3,
  mode: "nivelado",
  matches: [],
  waitingPair: [],
  rotations: [],
  rotationStep: 0,
};

// Populate Firestore on first run (only if collections are empty)
export async function seedIfEmpty() {
  const snap = await getDocs(collection(db, "players"));
  if (!snap.empty) return; // already seeded

  const batch = [];
  for (const p of SEED_PLAYERS)
    batch.push(setDoc(doc(db, "players", String(p.id)), p));
  for (const u of SEED_USERS)
    batch.push(setDoc(doc(db, "users", String(u.id)), u));
  batch.push(setDoc(doc(db, "config", "pairHistory"), SEED_PAIR_HISTORY));
  batch.push(setDoc(doc(db, "config", "session"), SEED_SESSION));
  await Promise.all(batch);
}

// Helpers for Firestore writes used in App.jsx
export async function savePlayer(player) {
  await setDoc(doc(db, "players", String(player.id)), player);
}
export async function removePlayer(id) {
  await deleteDoc(doc(db, "players", String(id)));
}
export async function saveUser(user) {
  await setDoc(doc(db, "users", String(user.id)), user);
}
export async function saveSession(data) {
  await setDoc(doc(db, "config", "session"), data, { merge: true });
}
export async function savePairHistory(data) {
  await setDoc(doc(db, "config", "pairHistory"), data);
}
export async function addMatchHistory(entry) {
  await addDoc(collection(db, "matchHistory"), { ...entry, timestamp: serverTimestamp() });
}
