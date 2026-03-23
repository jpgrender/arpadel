import { useState, useMemo, useEffect, useCallback } from “react”;
import { collection, doc, onSnapshot, query, orderBy, limit } from “firebase/firestore”;
import {
db, seedIfEmpty,
savePlayer, removePlayer, saveUser, removeUser,
saveSession, savePairHistory, addMatchHistory,
saveTournament, removeTournament, addTournamentMatch,
clearMatchHistory, clearPairHistory, clearSession, clearPlayerStats, clearTournaments,
} from “./firebase”;
import {
LoginScreen, PlayerModal, UsersMgmtModal, QuickMatchModal, UserPinModal,
LeaderMatchModal,
PlayerProfileModal, TournamentModal, FreeMatchModal, DataMgmtModal,
getLevel, pairKey,
} from “./components”;
import { getScreens, ProfileScreen } from “./screens”;
import { saveProfile, uploadProfilePhoto } from “./firebase”;

// ── Match generation ─────────────────────────────────────────────────────────
function generateMatches(players, courts, mode, matchType, pairHistory) {
// Use surveyPts as skill reference if set, otherwise fall back to pts
const skill = p => p.surveyPts > 0 ? p.surveyPts : p.pts;
const available = […players].sort((a, b) => skill(b) - skill(a));

// Respect the rented courts — cap at what we actually have
const maxMatches = Math.min(courts, Math.floor(available.length / 4));
const playing = available.slice(0, maxMatches * 4);
const sittingOut = available.slice(maxMatches * 4);

// Waiting pair only for short matches (long matches can’t rotate — not enough time)
const waitingPair = matchType === “short” && playing.length % 4 === 2 ? playing.slice(-2) : [];
const pool = waitingPair.length === 2 ? playing.slice(0, -2) : playing;

function bestPairing(group) {
const [a, b, c, d] = group;
return [
{ t1: [a, b], t2: [c, d] },
{ t1: [a, c], t2: [b, d] },
{ t1: [a, d], t2: [b, c] },
].sort((x, y) => {
const penX = (pairHistory[pairKey(x.t1[0].id, x.t1[1].id)] ?? 0) + (pairHistory[pairKey(x.t2[0].id, x.t2[1].id)] ?? 0);
const penY = (pairHistory[pairKey(y.t1[0].id, y.t1[1].id)] ?? 0) + (pairHistory[pairKey(y.t2[0].id, y.t2[1].id)] ?? 0);
const balX = Math.abs((skill(x.t1[0]) + skill(x.t1[1])) - (skill(x.t2[0]) + skill(x.t2[1])));
const balY = Math.abs((skill(y.t1[0]) + skill(y.t1[1])) - (skill(y.t2[0]) + skill(y.t2[1])));
return (penX + balX / 20) - (penY + balY / 20);
})[0];
}

const matches = [];
if (mode === “nivelado”) {
// Serpentine distribution: spread players across courts so each court
// gets a mix of skill levels instead of grouping best vs worst.
// e.g. 8 players sorted [1,2,3,4,5,6,7,8] and 2 courts:
//   court0 → [1,4,5,8]  court1 → [2,3,6,7]
const numCourts = Math.floor(pool.length / 4);
const sorted = […pool]; // already sorted by pts desc
const courtGroups = Array.from({ length: numCourts }, () => []);

```
// Serpentine: go left→right then right→left each row of numCourts
sorted.forEach((p, i) => {
  const row = Math.floor(i / numCourts);
  const col = i % numCourts;
  const courtIdx = row % 2 === 0 ? col : numCourts - 1 - col;
  if (courtGroups[courtIdx]) courtGroups[courtIdx].push(p);
});

courtGroups.forEach((group, i) => {
  if (group.length < 4) return;
  const { t1, t2 } = bestPairing(group);
  matches.push({ id: i, team1: t1, team2: t2, score1: "", score2: "", s0a: "", s0b: "", s1a: "", s1b: "", s2a: "", s2b: "", done: false });
});
```

} else {
const sorted = […pool];
let ci = 0;
for (let i = 0; i + 3 < sorted.length; i += 4) {
const group = sorted.slice(i, i + 4);
const { t1, t2 } = bestPairing(group);
matches.push({ id: ci, team1: t1, team2: t2, score1: “”, score2: “”, s0a: “”, s0b: “”, s1a: “”, s1b: “”, s2a: “”, s2b: “”, done: false, category: getLevel(group[1].pts) });
ci++;
}
}

const rots = waitingPair.length === 2
? matches.map((_, i) => ({ id: i, courtId: i, challenger: waitingPair, vsTeam: null, score1: “”, score2: “”, wins1: 0, wins2: 0, done: false }))
: [];

return { matches, waitingPair, sittingOut, rotations: rots };
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
{ id: “inicio”,    icon: “⚡”, label: “Inicio”    },
{ id: “jugadores”, icon: “👥”, label: “Jugadores” },
{ id: “partido”,   icon: “🎾”, label: “Partido”   },
{ id: “gestion”,   icon: “🛠️”, label: “Gestión”   },
{ id: “ranking”,   icon: “🏆”, label: “Ranking”   },
{ id: “perfil”,    icon: “👤”, label: “Perfil”    },
];

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
// ── Firebase state ─────────────────────────────────────────────────────────
const [players,      setPlayers]      = useState([]);
const [users,        setUsers]        = useState([]);
const [pairHistory,  setPairHistory]  = useState({});
const [session,      setSession]      = useState(null);
const [matchHistory, setMatchHistory] = useState([]);
const [profiles,     setProfiles]     = useState([]);
const [tournaments,  setTournaments]  = useState([]);
const [loading,      setLoading]      = useState(true);

// ── UI state ───────────────────────────────────────────────────────────────
const [currentUser,    setCurrentUser]    = useState(null);
const [tab,            setTab]            = useState(“inicio”);
const [notification,   setNotification]   = useState(null);
const [editingPlayer,  setEditingPlayer]  = useState(null);
const [playersSubTab,  setPlayersSubTab]  = useState(“lista”);
const [pairSearch,     setPairSearch]     = useState(””);
const [showUsersMgmt,  setShowUsersMgmt]  = useState(false);
const [showQuickMatch, setShowQuickMatch] = useState(false);
const [showSorteo,     setShowSorteo]     = useState(false);
const [confirmCancel,  setConfirmCancel]  = useState(null); // matchId to cancel
const [showUserPin,    setShowUserPin]    = useState(false);
const [viewingPlayer,  setViewingPlayer]  = useState(null);
const [showTournament, setShowTournament] = useState(false);
const [showFreeMatch,  setShowFreeMatch]  = useState(false);
const [showDataMgmt,   setShowDataMgmt]   = useState(false);
const [showCloseJornada,  setShowCloseJornada]  = useState(false);
const [showLeaderMatch,   setShowLeaderMatch]   = useState(false);

// ── Derived session values ─────────────────────────────────────────────────
const attending    = useMemo(() => new Set(session?.attending ?? []), [session]);
const matches      = session?.matches      ?? [];
const waitingPair  = session?.waitingPair  ?? [];
const rotations    = session?.rotations    ?? [];
const rotationStep = session?.rotationStep ?? 0;
const sittingOut   = session?.sittingOut   ?? [];

// Local state for instant UI response
const [courts,    setCourtsLocal]    = useState(3);
const [mode,      setModeLocal]      = useState(“nivelado”);
const [matchType, setMatchTypeLocal] = useState(“short”);
const [sessionInited, setSessionInited] = useState(false);

// ── Session restore ──────────────────────────────────────────────────────
useEffect(() => {
try {
const saved = localStorage.getItem(“arpadel_session”);
if (saved) {
const u = JSON.parse(saved);
if (u?.id && u?.pin) setCurrentUser(u);
}
} catch {}
}, []);

// Only sync from Firestore on first load, not on every snapshot
useEffect(() => {
if (session && !sessionInited) {
if (session.courts    != null) setCourtsLocal(session.courts);
if (session.mode      != null) setModeLocal(session.mode);
if (session.matchType != null) setMatchTypeLocal(session.matchType);
setSessionInited(true);
}
}, [session, sessionInited]);

// ── Derived computed values (ALL hooks before any return) ──────────────────
const ranking = useMemo(() =>
[…players].sort((a, b) => b.pts - a.pts).map((p, i) => ({ …p, rank: i + 1 })),
[players]
);
const attendingPlayers = useMemo(() =>
players.filter(p => attending.has(p.id)).sort((a, b) => b.pts - a.pts),
[players, attending]
);
const suggestedCourts = Math.floor(attendingPlayers.length / 4);
const remainder       = attendingPlayers.length % 4;

const enrichedPairs = useMemo(() =>
Object.entries(pairHistory)
.map(([key, times]) => {
const [idA, idB] = key.split(”-”).map(Number);
const pA = players.find(p => p.id === idA);
const pB = players.find(p => p.id === idB);
if (!pA || !pB) return null;
return { key, pA, pB, times };
})
.filter(Boolean)
.sort((a, b) => b.times - a.times),
[pairHistory, players]
);

const playerOfDay = useMemo(() => {
if (!matchHistory.length) return [];
const today = new Date().toLocaleDateString(“es-AR”);
const scores = {};
matchHistory.filter(m => m.date === today).forEach(m => {
[…m.team1.split(” & “), …m.team2.split(” & “)].forEach(n => { if (!scores[n]) scores[n] = 0; });
const [g1, g2] = (m.score ?? “”).split(”-”).map(Number);
if (!isNaN(g1) && !isNaN(g2)) {
m.team1.split(” & “).forEach(n => scores[n] += g1);
m.team2.split(” & “).forEach(n => scores[n] += g2);
}
});
if (!Object.keys(scores).length) return [];
const max = Math.max(…Object.values(scores));
return Object.entries(scores).filter(([, v]) => v === max).map(([n]) => n);
}, [matchHistory]);

// ── Firebase subscriptions ─────────────────────────────────────────────────
useEffect(() => {
let n = 0;
const needed = 6;
const check = () => { n++; if (n >= needed) setLoading(false); };
const onErr = label => err => { console.error(label, err); check(); };

```
const unsubP  = onSnapshot(collection(db, "players"),             s => { setPlayers(s.docs.map(d => d.data())); check(); }, onErr("players"));
const unsubU  = onSnapshot(collection(db, "users"),               s => { setUsers(s.docs.map(d => d.data())); check(); }, onErr("users"));
const unsubS  = onSnapshot(doc(db, "config", "session"),          s => { if (s.exists()) setSession(s.data()); check(); }, onErr("session"));
const unsubPH = onSnapshot(doc(db, "config", "pairHistory"),      s => { if (s.exists()) setPairHistory(s.data()); check(); }, onErr("pairHistory"));
const unsubPR = onSnapshot(collection(db, "profiles"),               s => { setProfiles(s.docs.map(d => d.data())); check(); }, onErr("profiles"));
const unsubT  = onSnapshot(collection(db, "tournaments"),             s => { setTournaments(s.docs.map(d => d.data())); check(); }, onErr("tournaments"));
const unsubH  = onSnapshot(
  query(collection(db, "matchHistory"), orderBy("timestamp", "desc"), limit(50)),
  s => setMatchHistory(s.docs.map(d => ({ ...d.data(), date: d.data().date ?? "" }))),
  err => console.error("matchHistory", err)
);
const timeout = setTimeout(() => { if (n < needed) setLoading(false); }, 8000);
seedIfEmpty().catch(console.error);
return () => { unsubP(); unsubU(); unsubS(); unsubPH(); unsubPR(); unsubT(); unsubH(); clearTimeout(timeout); };
```

}, []);

const writeSession = useCallback(updates => {
// Optimistic local updates for instant UI response
if (updates.courts    != null) setCourtsLocal(updates.courts);
if (updates.mode      != null) setModeLocal(updates.mode);
if (updates.matchType != null) setMatchTypeLocal(updates.matchType);
saveSession(updates).catch(console.error);
}, []);
const isAdmin      = currentUser?.role === “admin”;
const isSuperuser  = currentUser?.role === “super” || isAdmin;
const isLeader     = currentUser?.role === “lider”;

// ── Guards AFTER all hooks ─────────────────────────────────────────────────
if (loading) return (
<div style={{ minHeight: “100vh”, background: “#0d0d1a”, display: “flex”, flexDirection: “column”, alignItems: “center”, justifyContent: “center”, gap: 16 }}>
<img src=”/logo.jpg” alt=“ARPadel” style={{ height: 160, objectFit: “contain” }} />
<div style={{ color: “#333”, fontSize: 13 }}>Conectando…</div>
</div>
);
if (!currentUser) return <LoginScreen players={players} users={users} onLogin={u => setCurrentUser(u)} />;

// ── Helpers ────────────────────────────────────────────────────────────────
function notify(msg, color = “#00d4aa”) {
setNotification({ msg, color });
setTimeout(() => setNotification(null), 2800);
}

// ── Handlers ───────────────────────────────────────────────────────────────
function toggleOwnAttend() {
const id = currentUser.id;
const next = new Set(attending);
next.has(id) ? next.delete(id) : next.add(id);
writeSession({ attending: […next] });
}

function toggleAttend(id) {
if (!isSuperuser) return;
const next = new Set(attending);
next.has(id) ? next.delete(id) : next.add(id);
const arr = […next];
writeSession({ attending: arr, courts: Math.max(1, Math.floor(arr.length / 4)) });
}

function setAllAttend(all) {
if (!isSuperuser) return;
const arr = all ? players.map(p => p.id) : [];
writeSession({ attending: arr, courts: Math.max(1, Math.floor(arr.length / 4)) });
}

function handleSavePlayer(updated) {
if (!isAdmin) return;
if (!updated.id) {
// Nuevo jugador → crear player Y su usuario con PIN 0000
const newId = players.length ? Math.max(…players.map(p => p.id)) + 1 : 1;
const p = { …updated, id: newId };
savePlayer(p).catch(console.error);
saveUser({ id: newId, name: p.name, pin: “0000”, role: “user” }).catch(console.error);
notify(`${p.name} agregado 👋`);
} else {
savePlayer(updated).catch(console.error);
// Si cambió el nombre, actualizar también en users
const existingUser = users.find(u => u.id === updated.id);
if (existingUser && existingUser.name !== updated.name) {
saveUser({ …existingUser, name: updated.name }).catch(console.error);
}
notify(`${updated.name} actualizado ✓`);
}
setEditingPlayer(null);
}

function handleDeletePlayer(id) {
if (!isAdmin) return;
const p = players.find(x => x.id === id);
removePlayer(id).catch(console.error);
removeUser(id).catch(console.error);   // eliminar también de users
const next = new Set(attending); next.delete(id);
writeSession({ attending: […next] });
setEditingPlayer(null);
notify(`${p?.name} eliminado`, “#ff6b6b”);
}

function handleGenerate() {
if (!isSuperuser) return;

```
// Players already in an active (not done) match can't be in a new sorteo
const busyIds = new Set(
  matches.filter(m => !m.done)
         .flatMap(m => [...m.team1, ...m.team2].map(p => p.id))
);
const freePlayers = attendingPlayers.filter(p => !busyIds.has(p.id));

if (freePlayers.length < 4) {
  notify(busyIds.size > 0
    ? `Solo ${freePlayers.length} jugador${freePlayers.length !== 1 ? "es" : ""} sin partido activo — necesitás al menos 4`
    : "Necesitás al menos 4 jugadores", "#ff6b6b");
  return;
}

// Long matches: strict — no sitting out, no rotation
if (matchType === "long") {
  const fits = courts * 4;
  if (freePlayers.length > fits) {
    notify(`${freePlayers.length} jugadores libres no entran en ${courts} canchas (máx ${fits} para partido largo)`, "#ff6b6b");
    return;
  }
  if (freePlayers.length % 4 !== 0) {
    notify(`${freePlayers.length} jugadores libres no forman grupos exactos de 4 para partido largo`, "#ff6b6b");
    return;
  }
}

const { matches: m, waitingPair: wp, sittingOut: so, rotations: rots } = generateMatches(freePlayers, courts, mode, matchType, pairHistory);
if (!m.length) { notify("No hay suficientes jugadores libres", "#ff6b6b"); return; }
// Give new matches unique IDs to avoid collision with existing ones
const maxId = matches.reduce((max, x) => Math.max(max, x.id ?? 0), 0);
const newMatches = m.map((x, i) => ({ ...x, id: maxId + i + 1 }));
writeSession({ matches: [...matches, ...newMatches], waitingPair: wp, sittingOut: so ?? [], rotations: rots, rotationStep: 0 });
setShowSorteo(false);
setTab("partido");
notify(`¡${m.length} partido${m.length > 1 ? "s" : ""} generado${m.length > 1 ? "s" : ""}!`);
```

}

function handleScoreChange(matchId, team, val) {
if (!isSuperuser) return;
writeSession({ matches: matches.map(m => m.id === matchId ? { …m, [`score${team}`]: val } : m) });
}

function handleSetChange(matchId, si, team, value) {
if (!isSuperuser) return;
const key = `s${si}${team === 0 ? "a" : "b"}`;
writeSession({ matches: matches.map(m => m.id === matchId ? { …m, [key]: value } : m) });
}

function handleConfirmMatch(matchId) {
if (!isSuperuser) return;
const match = matches.find(m => m.id === matchId);
if (!match) return;
let s1, s2, winners, losers;
const mType = match.matchType || matchType;

```
if (mType === "long") {
  let t1s = 0, t2s = 0; s1 = 0; s2 = 0;
  for (let si = 0; si < 3; si++) {
    const a = parseInt(match[`s${si}a`]), b = parseInt(match[`s${si}b`]);
    if (isNaN(a) || isNaN(b)) continue;
    if (a > b) t1s++; if (b > a) t2s++; s1 += a; s2 += b;
  }
  if (t1s === t2s) { notify("Falta completar el tercer set", "#ff6b6b"); return; }
  winners = t1s > t2s ? match.team1 : match.team2;
  losers  = t1s > t2s ? match.team2 : match.team1;
} else {
  s1 = parseInt(match.score1); s2 = parseInt(match.score2);
  if (isNaN(s1) || isNaN(s2)) { notify("Ingresá los games", "#ff6b6b"); return; }
  if (s1 === s2) { notify("No puede terminar empatado", "#ff6b6b"); return; }
  winners = s1 > s2 ? match.team1 : match.team2;
  losers  = s1 > s2 ? match.team2 : match.team1;
}

// Pair history
const newPH = { ...pairHistory };
const k1 = pairKey(match.team1[0].id, match.team1[1].id);
const k2 = pairKey(match.team2[0].id, match.team2[1].id);
newPH[k1] = (newPH[k1] ?? 0) + 1;
newPH[k2] = (newPH[k2] ?? 0) + 1;
savePairHistory(newPH).catch(console.error);

// Points: all games × 5, winners get +10 bonus
for (const p of [...match.team1, ...match.team2]) {
  const isWin = winners.some(x => x.id === p.id);
  const games = isWin ? Math.max(s1, s2) : Math.min(s1, s2);
  const bonus = isWin ? 10 : 0;
  savePlayer({ ...p, pts: p.pts + games * 5 + bonus, wins: isWin ? p.wins + 1 : p.wins, matches: p.matches + 1 }).catch(console.error);
}

const newMatches = matches.map(m => m.id === matchId ? { ...m, done: true, winners, losers } : m);

// ── Consolation points for absent players ───────────────────────────────
// When ALL matches are done, give absent players the minimum pts earned today
const allDone = newMatches.every(m => m.done);
if (allDone) {
  // Calculate points each participating player earned today
  const earnedToday = {};
  for (const m of newMatches) {
    let ms1, ms2;
    if ((m.matchType || matchType) === "long") {
      let t1s = 0, t2s = 0; ms1 = 0; ms2 = 0;
      for (let si = 0; si < 3; si++) {
        const a = parseInt(m[`s${si}a`]), b = parseInt(m[`s${si}b`]);
        if (isNaN(a) || isNaN(b)) continue;
        if (a > b) t1s++; if (b > a) t2s++; ms1 += a; ms2 += b;
      }
      const mWinners = t1s > t2s ? m.team1 : m.team2;
      for (const p of [...m.team1, ...m.team2]) {
        const isWin = mWinners.some(x => x.id === p.id);
        const pts = (isWin ? Math.max(ms1, ms2) : Math.min(ms1, ms2)) * 5 + (isWin ? 10 : 0);
        earnedToday[p.id] = (earnedToday[p.id] ?? 0) + pts;
      }
    } else {
      ms1 = parseInt(m.score1); ms2 = parseInt(m.score2);
      if (isNaN(ms1) || isNaN(ms2)) continue;
      const mWinners = ms1 > ms2 ? m.team1 : m.team2;
      for (const p of [...m.team1, ...m.team2]) {
        const isWin = mWinners.some(x => x.id === p.id);
        const pts = (isWin ? Math.max(ms1, ms2) : Math.min(ms1, ms2)) * 5 + (isWin ? 10 : 0);
        earnedToday[p.id] = (earnedToday[p.id] ?? 0) + pts;
      }
    }
  }
  const minEarned = Math.min(...Object.values(earnedToday));
  if (minEarned > 0) {
    const absentPlayers = players.filter(p => !attending.has(p.id));
    for (const p of absentPlayers) {
      savePlayer({ ...p, pts: p.pts + minEarned }).catch(console.error);
    }
    if (absentPlayers.length > 0) {
      notify(`+${minEarned} pts para ${absentPlayers.length} ausente${absentPlayers.length > 1 ? "s" : ""} 🤝`);
    }
  }
}

// Rotations: if there's a waiting pair and no active rotation yet, start one now
let newRotations = [...rotations];
if (waitingPair.length === 2) {
  const activeRot = newRotations.find(r => !r.done);
  if (!activeRot) {
    // First finished match — start rotation
    const rotId = newRotations.length;
    newRotations.push({
      id: rotId, courtId: matchId,
      challenger: waitingPair, vsTeam: winners,
      score1: "", score2: "", done: false,
    });
  }
}

writeSession({ matches: newMatches, rotations: newRotations });
const histEntry = {
  date: new Date().toLocaleDateString("es-AR"),
  team1: match.team1.map(x => x.name).join(" & "),
  team2: match.team2.map(x => x.name).join(" & "),
  score: `${s1} - ${s2}`,
  winner: winners.map(x => x.name).join(" & "),
  type: mType,
};
addMatchHistory(histEntry).catch(console.error);
if (match.tournamentId) addTournamentMatch(match.tournamentId, histEntry).catch(console.error);
notify("¡Resultado guardado! 🎾");
```

}

function handleCancelMatch(matchId) {
// Remove match silently — no stats, no history, no pair history
writeSession({ matches: matches.filter(m => m.id !== matchId) });
setConfirmCancel(null);
notify(“Partido cancelado”);
}

function handleQuickMatchSave({ team1, team2, matchType }) {
if (!isSuperuser) return;
const newMatch = {
id: Date.now(),
team1, team2,
score1: “”, score2: “”,
s0a: “”, s0b: “”, s1a: “”, s1b: “”, s2a: “”, s2b: “”,
matchType: matchType || “short”,
done: false,
free: true,
tournamentId: null,
};
writeSession({ matches: […matches, newMatch] });
notify(“Partido agregado al listado ✓”);
}

async function handleClear(type, playerList) {
try {
if (type === “matchHistory”) await clearMatchHistory();
if (type === “pairHistory”)  await clearPairHistory();
if (type === “session”)      await clearSession();
if (type === “playerStats”)  await clearPlayerStats(playerList);
if (type === “tournaments”)  await clearTournaments();
notify(“Datos borrados ✓”);
} catch(err) {
console.error(err);
notify(“Error al borrar”, “#ff6b6b”);
}
}

function handleFreeMatchSave({ team1, team2, matchType, tournamentId }) {
if (!isSuperuser) return;
// Add as ACTIVE match (no score yet) — result is entered from the main list
const newMatch = {
id: Date.now(),
team1, team2,
score1: “”, score2: “”,
s0a: “”, s0b: “”, s1a: “”, s1b: “”, s2a: “”, s2b: “”,
matchType: matchType || “short”,
done: false,
free: true,
tournamentId: tournamentId || null,
};
writeSession({ matches: […matches, newMatch] });
notify(“Partido agregado al listado ⚡”);
// Modal stays open to add more matches
}

function handleRotationScore(rotId, team, val) {
if (!isSuperuser) return;
writeSession({ rotations: rotations.map(r => r.id === rotId ? { …r, [`score${team}`]: val } : r) });
}

function handleConfirmRotation(rotId) {
if (!isSuperuser) return;
const rot = rotations.find(r => r.id === rotId);
if (!rot) return;
const s1 = parseInt(rot.score1), s2 = parseInt(rot.score2);
if (isNaN(s1) || isNaN(s2)) { notify(“Ingresá el resultado”, “#ff6b6b”); return; }
if (s1 === s2) { notify(“No puede terminar empatado”, “#ff6b6b”); return; }

```
const challWins = s1 > s2;
const rotWinners = challWins ? rot.challenger : rot.vsTeam;

// Points: all games × 5, winners get +10 bonus
for (const p of [...rot.challenger, ...(rot.vsTeam ?? [])]) {
  const isChall = rot.challenger.some(x => x.id === p.id);
  const isWin = challWins ? isChall : !isChall;
  const games = isWin ? Math.max(s1, s2) : Math.min(s1, s2);
  const bonus = isWin ? 10 : 0;
  savePlayer({ ...p, pts: p.pts + games * 5 + bonus, wins: isWin ? p.wins + 1 : p.wins, matches: p.matches + 1 }).catch(console.error);
}

addMatchHistory({
  date: new Date().toLocaleDateString("es-AR"),
  team1: rot.challenger.map(x => x.name).join(" & "),
  team2: (rot.vsTeam ?? []).map(x => x.name).join(" & "),
  score: `${s1} - ${s2}`,
  winner: rotWinners.map(x => x.name).join(" & "),
}).catch(console.error);

const updatedRotations = rotations.map(r =>
  r.id === rotId ? { ...r, done: true, wins1: s1, wins2: s2 } : r
);

// Queue next rotation: winner challenges next finished match not yet used
const usedCourtIds = updatedRotations.map(r => r.courtId);
const nextMatch = matches.find(m => m.done && !usedCourtIds.includes(m.id));
if (nextMatch) {
  const nextOpponent = nextMatch.winners
    ?? (parseInt(nextMatch.score1 ?? 0) > parseInt(nextMatch.score2 ?? 0) ? nextMatch.team1 : nextMatch.team2);
  updatedRotations.push({
    id: updatedRotations.length, courtId: nextMatch.id,
    challenger: rotWinners, vsTeam: nextOpponent,
    score1: "", score2: "", done: false,
  });
}

writeSession({ rotations: updatedRotations, rotationStep: rotationStep + 1 });
notify(`Rotación ${rotId + 1} guardada ✓`);
```

}

// ── Build screens ──────────────────────────────────────────────────────────
async function handleCloseJornada() {
if (!isAdmin) return;
// Save historial for all done matches (already done by handleConfirmMatch)
// Discard open matches silently after user confirmed each one
// Reset session completely
await clearSession();
// Reset attendance
const newAtt = {};
saveSession({ attending: newAtt }).catch(console.error);
setShowCloseJornada(false);
notify(“Jornada cerrada. ¡Hasta la próxima! 🎾”);
}

const screens = getScreens({
players, users, matchHistory, pairHistory, profiles,
session, attending, courts, mode, matchType,
matches, waitingPair, rotations, rotationStep, sittingOut,
ranking, attendingPlayers, enrichedPairs, playerOfDay,
suggestedCourts, remainder,
isAdmin, isSuperuser, isLeader,
tournaments, setShowTournament, setShowFreeMatch, setShowDataMgmt,
tab, setTab, playersSubTab, setPlayersSubTab, pairSearch, setPairSearch,
toggleAttend, setAllAttend, setEditingPlayer, setViewingPlayer,
setShowUsersMgmt, setShowQuickMatch,
showSorteo, setShowSorteo,
confirmCancel, setConfirmCancel, handleCancelMatch,
busyPlayerIds: matches.filter(m => !m.done).flatMap(m => […m.team1, …m.team2].map(p => p.id)),
currentUser, toggleOwnAttend,
showCloseJornada, setShowCloseJornada, handleCloseJornada,
setShowLeaderMatch,
handleGenerate, handleScoreChange, handleSetChange,
handleConfirmMatch, handleConfirmRotation, handleRotationScore,
writeSession,
});

// ── Render ─────────────────────────────────────────────────────────────────
return (
<div style={{ fontFamily: “‘Segoe UI’,sans-serif”, background: “#0d0d1a”, minHeight: “100vh”, maxWidth: 420, margin: “0 auto”, display: “flex”, flexDirection: “column”, color: “#fff” }}>

```
  {/* Header */}
  <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid #ffffff10", background: "#0d0d1aee", position: "sticky", top: 0, zIndex: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <img src="/logo.jpg" alt="ARPadel" onClick={() => setTab("inicio")} style={{ height: 26, objectFit: "contain", cursor: "pointer" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {attendingPlayers.length > 0 && (
          <div style={{ background: "#00d4aa22", border: "1px solid #00d4aa44", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#00d4aa", fontWeight: 700 }}>
            ✅ {attendingPlayers.length}
          </div>
        )}
        <div
          onClick={() => isAdmin ? setShowUsersMgmt(true) : setShowUserPin(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#ffffff0d", border: "1px solid #ffffff15", borderRadius: 20, padding: "4px 10px", cursor: isAdmin ? "pointer" : "default" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: isAdmin ? "#0066ff" : "#ffffff20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff" }}>
            {currentUser.name[0]}
          </div>
          <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>{currentUser.name}</span>
          {isAdmin && <span style={{ fontSize: 9, color: "#6ab4ff" }}>⚡</span>}
          {!isAdmin && isSuperuser && <span style={{ fontSize: 9, color: "#f59e0b" }}>🔧</span>}
        </div>
        <button onClick={() => { try { localStorage.removeItem("arpadel_session"); } catch {} setCurrentUser(null); }}
          style={{ background: "transparent", border: "1px solid #ffffff15", borderRadius: 8, padding: "5px 10px", color: "#555", fontSize: 11, cursor: "pointer" }}>
          Salir
        </button>
      </div>
    </div>
  </div>

  {/* Toast */}
  {notification && (
    <div style={{ position: "fixed", top: 62, left: "50%", transform: "translateX(-50%)", background: notification.color, color: "#fff", borderRadius: 20, padding: "10px 20px", fontSize: 13, fontWeight: 700, zIndex: 300, boxShadow: "0 8px 30px #0008", whiteSpace: "nowrap", maxWidth: "90vw" }}>
      {notification.msg}
    </div>
  )}

  {/* Screen content */}
  <div style={{ flex: 1, overflowY: "auto", paddingTop: 16 }}>
    {tab === "perfil" ? (
      <ProfileScreen
        currentUser={currentUser}
        players={players}
        attending={attending}
        profile={profiles.find(p => p.id === currentUser.id)}
        onToggleAttend={toggleOwnAttend}
        onSaveProfile={p => saveProfile(p).catch(console.error)}
        onUploadPhoto={uploadProfilePhoto}
      />
    ) : screens[tab]}
  </div>

  {/* Bottom nav */}
  <div style={{ display: "flex", background: "#13131f", borderTop: "1px solid #ffffff15", position: "sticky", bottom: 0, padding: "6px 6px 4px" }}>
    {TABS.map(t => {
      const active = tab === t.id;
      return (
        <button key={t.id} onClick={() => setTab(t.id)}
          style={{ flex: 1, border: "none", cursor: "pointer", padding: "6px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: active ? "#00d4aa18" : "transparent",
            borderRadius: 10,
            outline: active ? "1.5px solid #00d4aa55" : "none",
          }}>
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: active ? "#00d4aa" : "#fff" }}>{t.label}</span>
        </button>
      );
    })}
  </div>

  {/* Modals */}
  {editingPlayer !== null && isAdmin && (
    <PlayerModal
      player={editingPlayer}
      profile={profiles.find(p => p.id === editingPlayer.id)}
      user={users.find(u => u.id === editingPlayer.id)}
      onSave={handleSavePlayer}
      onSaveProfile={p => saveProfile(p).catch(console.error)}
      onSaveUser={u => saveUser(u).catch(console.error)}
      onDelete={handleDeletePlayer}
      onClose={() => setEditingPlayer(null)}
    />
  )}
  {showUsersMgmt && isAdmin && (
    <UsersMgmtModal players={players} users={users} onClose={() => setShowUsersMgmt(false)} onSave={u => { saveUser(u).catch(console.error); notify("Usuario actualizado ✓"); }} />
  )}
  {showLeaderMatch && isLeader && (
    <LeaderMatchModal
      currentUser={currentUser}
      matches={matches}
      onSave={({ team1, team2, matchType: mt }) => {
        const newMatch = {
          id: Date.now(), team1, team2,
          score1: "", score2: "", s0a: "", s0b: "", s1a: "", s1b: "", s2a: "", s2b: "",
          matchType: mt || "short", done: false, free: true, tournamentId: null,
        };
        writeSession({ matches: [...matches, newMatch] });
        notify("Partido agregado ⚡");
        setShowLeaderMatch(false);
      }}
      onClose={() => setShowLeaderMatch(false)}
    />
  )}
  {showQuickMatch && isAdmin && (
    <QuickMatchModal players={players} onSave={handleQuickMatchSave} onClose={() => setShowQuickMatch(false)} />
  )}
  {showUserPin && !isAdmin && (
    <UserPinModal user={currentUser} onClose={() => setShowUserPin(false)} onSave={u => { saveUser(u).catch(console.error); setCurrentUser(u); notify("PIN actualizado ✓"); }} />
  )}
  {showDataMgmt && isAdmin && (
    <DataMgmtModal players={players} onClose={() => setShowDataMgmt(false)} onClear={handleClear} />
  )}
  {showTournament && isSuperuser && (
    <TournamentModal tournaments={tournaments} onClose={() => setShowTournament(false)}
      onSave={t => saveTournament(t).catch(console.error)}
      onDelete={id => removeTournament(id).catch(console.error)} />
  )}
  {showFreeMatch && isSuperuser && (
    <FreeMatchModal players={players} tournaments={tournaments}
      busyPlayerIds={matches.filter(m => !m.done).flatMap(m => [...m.team1, ...m.team2].map(p => p.id))}
      onSave={handleFreeMatchSave} onClose={() => setShowFreeMatch(false)} />
  )}
  {viewingPlayer && (
    <PlayerProfileModal
      player={viewingPlayer}
      profile={profiles.find(p => p.id === viewingPlayer.id)}
      isAdmin={isAdmin}
      onClose={() => setViewingPlayer(null)}
      onEdit={() => { setViewingPlayer(null); setEditingPlayer(viewingPlayer); }}
    />
  )}
</div>
```

);
}