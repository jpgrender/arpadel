import { useState, useRef, useEffect } from "react";
import React from "react";

// ── Constants ────────────────────────────────────────────────────────────────
export const LEVEL_COLORS = {
  5: { bg: "#ff6b35", label: "Nv5",  range: [380, 9999] },
  4: { bg: "#f7c59f", label: "Nv4",  range: [280, 379]  },
  3: { bg: "#5bc0eb", label: "Nv3",  range: [200, 279]  },
  2: { bg: "#9bc53d", label: "Nv2",  range: [120, 199]  },
  1: { bg: "#aaaaaa", label: "Nv1",  range: [0,   119]  },
};

export function getLevel(pts) {
  for (const [lvl, { range }] of Object.entries(LEVEL_COLORS).reverse())
    if (pts >= range[0] && pts <= range[1]) return Number(lvl);
  return 1;
}
export function getLevelColor(lvl) { return LEVEL_COLORS[lvl]?.bg ?? "#aaa"; }
export function getLevelLabel(lvl) { return LEVEL_COLORS[lvl]?.label ?? lvl; }
export function pairKey(a, b) { return [a, b].sort((x, y) => x - y).join("-"); }

// ── Shared input style ───────────────────────────────────────────────────────
export const inputStyle = {
  width: "100%", background: "#ffffff10", border: "1px solid #ffffff20",
  borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 15,
  outline: "none", boxSizing: "border-box",
};

// ── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, pts, size = 36, photoURL }) {
  const color = getLevelColor(getLevel(pts));
  if (photoURL) {
    return (
      <img src={photoURL} alt={name}
        style={{
          width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
          boxShadow: `0 0 0 2px #1a1a2e, 0 0 0 3px ${color}55`,
        }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.38, color: "#fff", flexShrink: 0,
      boxShadow: `0 0 0 2px #1a1a2e, 0 0 0 3px ${color}55`,
    }}>
      {name[0]}
    </div>
  );
}

// ── LevelBadge ───────────────────────────────────────────────────────────────
export function LevelBadge({ pts }) {
  const lvl = getLevel(pts);
  return (
    <span style={{
      background: getLevelColor(lvl), color: "#fff",
      borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 800, letterSpacing: 1,
    }}>
      {getLevelLabel(lvl)}
    </span>
  );
}

// ── SectionLabel ─────────────────────────────────────────────────────────────
export function SectionLabel({ children, style = {} }) {
  return (
    <div style={{
      fontSize: 11, color: "#888", fontWeight: 700,
      letterSpacing: 2, marginBottom: 14, ...style,
    }}>
      {children}
    </div>
  );
}

// ── RoleBadge ────────────────────────────────────────────────────────────────
export function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  const isSuper = role === "super";
  return (
    <span style={{
      background: isAdmin ? "#0066ff33" : isSuper ? "#f59e0b22" : "#ffffff10",
      border: `1px solid ${isAdmin ? "#0066ff" : isSuper ? "#f59e0b" : "#ffffff20"}`,
      color: isAdmin ? "#6ab4ff" : isSuper ? "#f59e0b" : "#666",
      borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1,
    }}>
      {isAdmin ? "⚡ ADMIN" : isSuper ? "🔧 SUPER" : "👁 VIEWER"}
    </span>
  );
}

// ── ReadOnlyBanner ───────────────────────────────────────────────────────────
export function ReadOnlyBanner({ isAdmin }) {
  if (isAdmin) return null;
  return (
    <div style={{
      background: "#0066ff15", border: "1px solid #0066ff33",
      borderRadius: 10, padding: "10px 14px", marginBottom: 16,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ fontSize: 16 }}>👁</span>
      <span style={{ fontSize: 12, color: "#6ab4ff" }}>
        Modo visualización — solo los admins pueden hacer cambios
      </span>
    </div>
  );
}

// ── PlayerModal ──────────────────────────────────────────────────────────────
export function PlayerModal({ player, onSave, onDelete, onClose }) {
  const isNew = !player.id;
  const [form, setForm] = useState({
    name:    player.name    ?? "",
    pts:     player.pts     ?? 150,
    wins:    player.wins    ?? 0,
    matches: player.matches ?? 0,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#181828", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 420, border: "1px solid #ffffff15" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: "#ffffff20", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 20 }}>
          {isNew ? "➕ Agregar jugador" : `✏️ Editar — ${player.name}`}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#888", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>NOMBRE</div>
          <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nombre" autoFocus style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 700, letterSpacing: 1 }}>PUNTOS</div>
            <LevelBadge pts={Number(form.pts)} />
          </div>
          <input type="number" value={form.pts} onChange={e => set("pts", e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
            {[5, 4, 3, 2, 1].map(lvl => {
              const { bg, label, range } = LEVEL_COLORS[lvl];
              const active = getLevel(Number(form.pts)) === lvl;
              return (
                <div key={lvl} onClick={() => set("pts", range[0] + 20)}
                  style={{ display: "flex", alignItems: "center", gap: 4, background: "#ffffff0d", borderRadius: 6, padding: "4px 8px", cursor: "pointer", border: active ? `1px solid ${bg}` : "1px solid transparent" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: bg }} />
                  <span style={{ fontSize: 10, color: active ? "#fff" : "#555" }}>{label} ≥{range[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>VICTORIAS</div>
            <input type="number" value={form.wins} onChange={e => set("wins", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PARTIDOS</div>
            <input type="number" value={form.matches} onChange={e => set("matches", e.target.value)} style={inputStyle} />
          </div>
        </div>

        <button
          onClick={() => { if (!form.name.trim()) return; onSave({ ...player, ...form, pts: Number(form.pts), wins: Number(form.wins), matches: Number(form.matches) }); }}
          style={{ width: "100%", background: "linear-gradient(135deg,#00d4aa,#0066ff)", border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 10 }}
        >
          {isNew ? "Agregar al grupo" : "Guardar cambios"}
        </button>
        {!isNew && (
          <button onClick={() => onDelete(player.id)}
            style={{ width: "100%", background: "#ff4d4d15", border: "1px solid #ff4d4d44", borderRadius: 12, padding: "12px", color: "#ff6b6b", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            🗑 Eliminar jugador
          </button>
        )}
      </div>
    </div>
  );
}

// ── UsersMgmtModal ───────────────────────────────────────────────────────────
// Muestra la lista de PLAYERS y cruza con USERS para PIN y rol.
// Si un jugador no tiene entrada en users, se trata como role "user" y PIN "0000".
export function UsersMgmtModal({ players, users, onClose, onSave }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});

  function startEdit(p) {
    const u = users.find(x => x.id === p.id);
    setEditingId(p.id);
    setForm({ name: p.name, pin: u?.pin ?? "0000", role: u?.role ?? "user" });
  }
  function save() {
    const p = players.find(x => x.id === editingId);
    const requiredLen = (form.role === "admin" || form.role === "super") ? 6 : 4;
    if (form.pin.length !== requiredLen || !/^\d+$/.test(form.pin)) {
      alert(`El PIN debe tener exactamente ${requiredLen} dígitos numéricos (${form.role === "admin" ? "admin" : "usuario"})`);
      return;
    }
    onSave({ id: editingId, name: p.name, pin: form.pin, role: form.role });
    setEditingId(null);
  }

  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#181828", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 420, border: "1px solid #ffffff15", maxHeight: "80vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: "#ffffff20", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 4 }}>⚙️ Gestión de usuarios</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>Cambiá roles y PINs.</div>

        {sorted.map(p => {
          const u = users.find(x => x.id === p.id);
          const role = u?.role ?? "user";
          const pin = u?.pin ?? "0000";
          return (
            <div key={p.id} style={{ background: "#ffffff07", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: "1px solid #ffffff0d" }}>
              {editingId === p.id ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", marginBottom: 8 }}>{p.name}</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} placeholder={(form.role === "admin" || form.role === "super") ? "6 dígitos" : "4 dígitos"} maxLength={6}
                      style={{ ...inputStyle, flex: 1, padding: "8px 10px", fontSize: 13 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {[["admin","⚡ Admin","#0066ff","#6ab4ff"],["super","🔧 Super","#f59e0b","#f59e0b"],["user","👁 Viewer","#555555","#888"]].map(([r, label, borderCol, textCol]) => (
                      <div key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                        style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: form.role === r ? `2px solid ${borderCol}` : "2px solid #ffffff15", background: form.role === r ? `${borderCol}22` : "transparent", textAlign: "center", cursor: "pointer", fontSize: 11, color: form.role === r ? textCol : "#555", fontWeight: 700 }}>
                        {label}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={save} style={{ flex: 1, background: "#00d4aa", border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Guardar</button>
                    <button onClick={() => setEditingId(null)} style={{ flex: 1, background: "transparent", border: "1px solid #ffffff15", borderRadius: 8, padding: "10px", color: "#aaa", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={p.name} pts={200} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#999" }}>PIN: {"•".repeat(pin.length)}</div>
                  </div>
                  <RoleBadge role={role} />
                  <button onClick={() => startEdit(p)}
                    style={{ background: "transparent", border: "1px solid #ffffff15", borderRadius: 8, padding: "6px 10px", color: "#666", fontSize: 11, cursor: "pointer" }}>✏️</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── QuickMatchModal ──────────────────────────────────────────────────────────
export function QuickMatchModal({ players, onSave, onClose }) {
  const [team1Ids,  setTeam1Ids]  = useState([]);
  const [team2Ids,  setTeam2Ids]  = useState([]);
  const [score1,    setScore1]    = useState("");
  const [score2,    setScore2]    = useState("");
  const [matchType, setMatchType] = useState("");
  const [step,      setStep]      = useState(0);

  const sorted = [...players].sort((a, b) => b.pts - a.pts);
  const team1 = players.filter(p => team1Ids.includes(p.id));
  const team2 = players.filter(p => team2Ids.includes(p.id));

  function togglePlayer(id) {
    if (team1Ids.includes(id)) { setTeam1Ids(t => t.filter(x => x !== id)); return; }
    if (team2Ids.includes(id)) { setTeam2Ids(t => t.filter(x => x !== id)); return; }
    if (team1Ids.length < 2) { setTeam1Ids(t => [...t, id]); return; }
    if (team2Ids.length < 2) { setTeam2Ids(t => [...t, id]); return; }
  }

  const canNext = team1.length === 2 && team2.length === 2;
  const canSave = canNext && score1 !== "" && score2 !== "";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }} onClick={onClose}>
      <div style={{ background: "#181828", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 420, border: "1px solid #ffffff15", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#ffffff20", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 4 }}>⚡ Partido rápido</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>Registrá un partido sin generar sorteo</div>

        {step === 0 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {[
                ["short", "⚡ Partido corto", "Game a 7, gana quien llega primero.", "#00d4aa"],
                ["long",  "🎾 Partido largo", "Mejor de 3 sets con tie-break.",       "#6ab4ff"],
              ].map(([val, label, desc, color]) => (
                <div key={val} onClick={() => { setMatchType(val); setStep(1); }}
                  style={{ background: `${color}11`, border: `2px solid ${color}33`, borderRadius: 14, padding: "18px 16px", cursor: "pointer" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color }}>{label}</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{desc}</div>
                </div>
              ))}
            </div>
            <button onClick={onClose} style={{ width: "100%", background: "transparent", border: "1px solid #ffffff15", borderRadius: 12, padding: "12px", color: "#aaa", fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
          </>
        )}

        {step === 1 && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {[{ label: "EQUIPO 1", color: "#00d4aa", ids: team1Ids, team: team1 }, { label: "EQUIPO 2", color: "#6ab4ff", ids: team2Ids, team: team2 }].map(({ label, color, team }) => (
                <div key={label} style={{ flex: 1, background: `${color}15`, border: `1px solid ${color}33`, borderRadius: 10, padding: "10px", minHeight: 60 }}>
                  <div style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 6 }}>{label}</div>
                  {team.map(p => <div key={p.id} style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{p.name}</div>)}
                  {team.length < 2 && <div style={{ fontSize: 11, color: "#aaa" }}>Seleccioná {2 - team.length} más</div>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {sorted.map(p => {
                const inT1 = team1Ids.includes(p.id), inT2 = team2Ids.includes(p.id);
                return (
                  <div key={p.id} onClick={() => togglePlayer(p.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, cursor: "pointer", background: inT1 ? "#00d4aa22" : inT2 ? "#0066ff22" : "#ffffff08", border: inT1 ? "1px solid #00d4aa44" : inT2 ? "1px solid #0066ff44" : "1px solid #ffffff10" }}>
                    <Avatar name={p.name} pts={p.pts} size={28} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: (inT1 || inT2) ? "#fff" : "#666", flex: 1 }}>{p.name}</span>
                    <LevelBadge pts={p.pts} />
                    {inT1 && <span style={{ fontSize: 10, color: "#00d4aa", fontWeight: 700 }}>E1</span>}
                    {inT2 && <span style={{ fontSize: 10, color: "#6ab4ff", fontWeight: 700 }}>E2</span>}
                  </div>
                );
              })}
            </div>
            <button onClick={() => setStep(2)} disabled={!canNext}
              style={{ width: "100%", background: canNext ? "#00d4aa" : "#333", border: "none", borderRadius: 12, padding: "14px", color: canNext ? "#fff" : "#666", fontWeight: 800, fontSize: 14, cursor: canNext ? "pointer" : "not-allowed" }}>
              Siguiente →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ marginBottom: 16, background: "#ffffff08", borderRadius: 12, padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#fff", fontWeight: 700 }}>
                <span>{team1.map(p => p.name).join(" & ")}</span>
                <span style={{ color: "#999" }}>vs</span>
                <span>{team2.map(p => p.name).join(" & ")}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
              <input type="number" min="0" value={score1} onChange={e => setScore1(e.target.value)} placeholder="0"
                style={{ flex: 1, background: "#00d4aa22", border: "1px solid #00d4aa44", borderRadius: 8, padding: "16px", color: "#fff", fontSize: 28, fontWeight: 800, textAlign: "center", outline: "none" }} />
              <span style={{ color: "#666", fontWeight: 800, fontSize: 22 }}>—</span>
              <input type="number" min="0" value={score2} onChange={e => setScore2(e.target.value)} placeholder="0"
                style={{ flex: 1, background: "#0066ff22", border: "1px solid #0066ff44", borderRadius: 8, padding: "16px", color: "#fff", fontSize: 28, fontWeight: 800, textAlign: "center", outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: "transparent", border: "1px solid #ffffff15", borderRadius: 12, padding: "14px", color: "#aaa", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>← Atrás</button>
              <button onClick={() => onSave({ team1, team2, score1, score2, matchType })} disabled={!canSave}
                style={{ flex: 2, background: canSave ? "#00d4aa" : "#333", border: "none", borderRadius: 12, padding: "14px", color: canSave ? "#fff" : "#666", fontWeight: 800, fontSize: 14, cursor: canSave ? "pointer" : "not-allowed" }}>
                Guardar ✓
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


// ── UserPinModal ─────────────────────────────────────────────────────────────
export function UserPinModal({ user, onClose, onSave }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin,     setNewPin]     = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error,      setError]      = useState("");
  const [showCurr,   setShowCurr]   = useState(false);
  const [showNew,    setShowNew]    = useState(false);

  const isPrivileged = user.role === "admin" || user.role === "super";
  const requiredLen = isPrivileged ? 6 : 4;

  function handleSave() {
    if (currentPin !== user.pin)                { setError("PIN actual incorrecto"); return; }
    if (newPin.length !== requiredLen)          { setError(`El PIN debe tener exactamente ${requiredLen} dígitos`); return; }
    if (!/^\d+$/.test(newPin))                  { setError("El PIN solo puede contener números"); return; }
    if (newPin !== confirmPin)                  { setError("Los PINs nuevos no coinciden"); return; }
    onSave({ ...user, pin: newPin });
    onClose();
  }

  const inputStyle = { width: "100%", background: "#0d0d1a", border: "1px solid #ffffff20", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 15, outline: "none", letterSpacing: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#13131f", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>🔐 Cambiar mi PIN</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 24 }}>Cambiá tu PIN · {isPrivileged ? "6 dígitos" : "4 dígitos"}</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6, fontWeight: 600 }}>PIN ACTUAL</div>
          <div style={{ position: "relative" }}>
            <input type={showCurr ? "text" : "password"} inputMode="numeric" maxLength={6}
              value={currentPin} onChange={e => { setCurrentPin(e.target.value); setError(""); }}
              placeholder="••••" style={inputStyle} />
            <button onClick={() => setShowCurr(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14 }}>
              {showCurr ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6, fontWeight: 600 }}>PIN NUEVO</div>
          <div style={{ position: "relative" }}>
            <input type={showNew ? "text" : "password"} inputMode="numeric" maxLength={6}
              value={newPin} onChange={e => { setNewPin(e.target.value); setError(""); }}
              placeholder="••••" style={inputStyle} />
            <button onClick={() => setShowNew(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14 }}>
              {showNew ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6, fontWeight: 600 }}>CONFIRMAR PIN NUEVO</div>
          <input type="password" inputMode="numeric" maxLength={6}
            value={confirmPin} onChange={e => { setConfirmPin(e.target.value); setError(""); }}
            placeholder="••••" style={inputStyle} />
        </div>

        {error && <div style={{ color: "#ff6b6b", fontSize: 12, marginBottom: 14, textAlign: "center" }}>{error}</div>}

        <button onClick={handleSave}
          style={{ width: "100%", background: "linear-gradient(135deg,#00d4aa,#0066ff)", border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          Guardar PIN
        </button>
      </div>
    </div>
  );
}


// ── PlayerProfileModal ────────────────────────────────────────────────────────
export function PlayerProfileModal({ player, profile, isAdmin, onClose, onEdit }) {
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const age = profile?.birthdate
    ? Math.floor((Date.now() - new Date(profile.birthdate)) / 31557600000)
    : null;

  const sideLabel = profile?.side === "drive" ? "Drive" : profile?.side === "reves" ? "Revés" : null;
  const handLabel = profile?.hand === "diestro" ? "Diestro 🤜" : profile?.hand === "zurdo" ? "Zurdo 🤛" : null;
  const winPct = player.matches ? Math.round(player.wins / player.matches * 100) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "#13131f", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 420, border: "1px solid #ffffff15", maxHeight: "88vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div style={{ width: 40, height: 4, background: "#ffffff20", borderRadius: 2, margin: "0 auto 20px" }} />

        {/* Foto y nombre */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt={player.name} onClick={() => setShowFullPhoto(true)}
              style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "3px solid #00d4aa", marginBottom: 10, cursor: "zoom-in" }} />
          ) : (
            <div style={{ width: 88, height: 88, borderRadius: "50%", background: "linear-gradient(135deg,#00d4aa,#0066ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900, color: "#fff", marginBottom: 10 }}>
              {player.name[0]}
            </div>
          )}
          {showFullPhoto && profile?.photoURL && (
            <div onClick={() => setShowFullPhoto(false)}
              style={{ position: "fixed", inset: 0, background: "#000000ee", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
              <img src={profile.photoURL} alt={player.name}
                style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 16, objectFit: "contain" }} />
            </div>
          )}
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{player.name}</div>
          {profile?.fullName && profile.fullName !== player.name && (
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{profile.fullName}</div>
          )}
          {age && <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{age} años</div>}

          {/* Badges */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <LevelBadge pts={player.pts} />
            {sideLabel && (
              <span style={{ background: "#00d4aa22", border: "1px solid #00d4aa44", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "#00d4aa", fontWeight: 700 }}>{sideLabel}</span>
            )}
            {handLabel && (
              <span style={{ background: "#6ab4ff22", border: "1px solid #6ab4ff44", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "#6ab4ff", fontWeight: 700 }}>{handLabel}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            { label: "Puntos",    value: player.pts,              color: "#00d4aa" },
            { label: "Victorias", value: player.wins,             color: "#6ab4ff" },
            { label: "Derrotas",  value: player.matches - player.wins, color: "#ff6b6b" },
            { label: "% Victorias", value: `${winPct}%`,          color: "#a78bfa" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: "#ffffff08", borderRadius: 12, padding: "10px 6px", textAlign: "center", border: "1px solid #ffffff10" }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Botones */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, background: "transparent", border: "1px solid #ffffff15", borderRadius: 12, padding: "12px", color: "#aaa", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Cerrar
          </button>
          {isAdmin && (
            <button onClick={onEdit}
              style={{ flex: 2, background: "linear-gradient(135deg,#0066ff,#00d4aa)", border: "none", borderRadius: 12, padding: "12px", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              ✏️ Editar stats
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── LoginScreen ──────────────────────────────────────────────────────────────
export function LoginScreen({ players, users, onLogin }) {
  const lastId = (() => { try { return parseInt(localStorage.getItem("arpadel_last_user")) || null; } catch { return null; } })();
  const [selected, setSelected] = useState(lastId);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [keepSession, setKeepSession] = useState(false);

  function handleLogin() {
    if (!selected) { setError("Seleccioná tu nombre"); return; }
    const player = players.find(p => p.id === selected);
    if (!player) { setError("Jugador no encontrado"); return; }
    const userRecord = users.find(u => u.id === selected);
    const expectedPin = userRecord?.pin ?? "0000";
    const role = userRecord?.role ?? "user";
    if (expectedPin !== pin) { setError("PIN incorrecto"); setPin(""); return; }
    try { localStorage.setItem("arpadel_last_user", String(selected)); } catch {}
    if (keepSession) { try { localStorage.setItem("arpadel_session", JSON.stringify({ id: player.id, name: player.name, pin: expectedPin, role })); } catch {} }
    onLogin({ id: player.id, name: player.name, pin: expectedPin, role });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <img src="/logo.jpg" alt="ARPadel" style={{ width: "70%", maxWidth: 280, objectFit: "contain", marginBottom: 32 }} />
      <div style={{ width: "100%", maxWidth: 380, background: "#181828", borderRadius: 20, padding: "28px 24px", border: "1px solid #ffffff10" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Bienvenido</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 24 }}>Seleccioná tu nombre e ingresá tu PIN</div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#888", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>¿QUIÉN SOS?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <select value={selected ?? ""} onChange={e => { setSelected(Number(e.target.value)); setPin(""); setError(""); }}
              style={{ width: "100%", background: "#0d0d1a", border: "1px solid #ffffff20", borderRadius: 10, padding: "12px 14px", color: selected ? "#fff" : "#555", fontSize: 14, outline: "none", cursor: "pointer" }}>
              <option value="" disabled>Seleccioná tu nombre...</option>
              {[...players].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {selected && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>PIN</div>
            <div style={{ position: "relative" }}>
              <input type={showPin ? "text" : "password"} inputMode="numeric" maxLength={6} value={pin}
                onChange={e => { setPin(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="••••" autoFocus
                style={{ ...inputStyle, letterSpacing: 6, fontSize: 20, paddingRight: 44 }} />
              <button onClick={() => setShowPin(s => !s)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: 16 }}>
                {showPin ? "🙈" : "👁"}
              </button>
            </div>
            {error && <div style={{ fontSize: 12, color: "#ff6b6b", marginTop: 6 }}>{error}</div>}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer" }} onClick={() => setKeepSession(v => !v)}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: keepSession ? "#00d4aa" : "#ffffff10", border: keepSession ? "none" : "2px solid #ffffff20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {keepSession && <span style={{ fontSize: 12, color: "#fff", fontWeight: 900 }}>✓</span>}
          </div>
          <span style={{ fontSize: 13, color: "#aaa" }}>Mantener sesión iniciada</span>
        </div>
        <button onClick={handleLogin} disabled={!selected}
          style={{ width: "100%", background: selected ? "linear-gradient(135deg,#00d4aa,#0066ff)" : "#333", border: "none", borderRadius: 12, padding: "14px", color: selected ? "#fff" : "#666", fontWeight: 800, fontSize: 15, cursor: selected ? "pointer" : "not-allowed" }}>
          Entrar
        </button>
        <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 16 }}>¿No tenés PIN? Pedíselo al admin del grupo.</div>
      </div>
      <div style={{ marginTop: 28, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Desarrollado por Juan Pablo Gómez</div>
        <a href="mailto:argentinapadel@gmail.com" style={{ fontSize: 11, color: "#888", textDecoration: "none" }}>
          argentinapadel@gmail.com
        </a>
        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>© 2026 ARPadel · Todos los derechos reservados</div>
      </div>
    </div>
  );
}

// ── TournamentModal ───────────────────────────────────────────────────────────
export function TournamentModal({ tournaments, onClose, onSave, onDelete }) {
  const [view,      setView]      = useState("list"); // list | new | detail
  const [selected,  setSelected]  = useState(null);
  const [form,      setForm]      = useState({ name: "", startDate: "", endDate: "" });

  const inputSt = { width: "100%", background: "#0d0d1a", border: "1px solid #ffffff20", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const labelSt = { fontSize: 11, color: "#aaa", fontWeight: 700, letterSpacing: 1, marginBottom: 6, display: "block" };

  function handleSave() {
    if (!form.name.trim()) return;
    onSave({ ...form, id: String(Date.now()), status: "active" });
    setView("list");
    setForm({ name: "", startDate: "", endDate: "" });
  }

  const active   = tournaments.filter(t => t.status === "active");
  const finished = tournaments.filter(t => t.status === "finished");

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#13131f", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxWidth: 420, border: "1px solid #ffffff15", maxHeight: "88vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#ffffff20", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>🏆 Torneos</div>
          <button onClick={() => setView("new")} style={{ background: "#00d4aa", border: "none", borderRadius: 10, padding: "7px 14px", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>+ Nuevo</button>
        </div>

        {view === "new" && (
          <div style={{ background: "#ffffff08", borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 14 }}>Nuevo torneo</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}>NOMBRE</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Torneo Verano 2026" style={inputSt} />
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelSt}>INICIO</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ ...inputSt, colorScheme: "dark" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelSt}>FIN</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={{ ...inputSt, colorScheme: "dark" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setView("list")} style={{ flex: 1, background: "transparent", border: "1px solid #ffffff15", borderRadius: 10, padding: 10, color: "#aaa", fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSave} style={{ flex: 2, background: "linear-gradient(135deg,#00d4aa,#0066ff)", border: "none", borderRadius: 10, padding: 10, color: "#fff", fontWeight: 800, cursor: "pointer" }}>Crear torneo</button>
            </div>
          </div>
        )}

        {active.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: "#00d4aa", fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>ACTIVOS</div>
            {active.map(t => (
              <div key={t.id} style={{ background: "#00d4aa0d", border: "1px solid #00d4aa22", borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{t.name}</div>
                    {t.startDate && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{t.startDate}{t.endDate ? ` → ${t.endDate}` : ""}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => onSave({ ...t, status: "finished" })} style={{ background: "#ffffff10", border: "none", borderRadius: 8, padding: "5px 10px", color: "#aaa", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Finalizar</button>
                    <button onClick={() => onDelete(t.id)} style={{ background: "#ff6b6b22", border: "none", borderRadius: 8, padding: "5px 8px", color: "#ff6b6b", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {finished.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 800, letterSpacing: 1, marginBottom: 8, marginTop: 12 }}>FINALIZADOS</div>
            {finished.map(t => (
              <div key={t.id} style={{ background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 12, padding: "12px 14px", marginBottom: 8, opacity: 0.7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#aaa" }}>{t.name}</div>
                    {t.startDate && <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{t.startDate}{t.endDate ? ` → ${t.endDate}` : ""}</div>}
                  </div>
                  <button onClick={() => onDelete(t.id)} style={{ background: "transparent", border: "none", color: "#444", fontSize: 12, cursor: "pointer" }}>✕</button>
                </div>
              </div>
            ))}
          </>
        )}

        {tournaments.length === 0 && view !== "new" && (
          <div style={{ textAlign: "center", color: "#444", fontSize: 13, padding: "30px 0" }}>No hay torneos todavía</div>
        )}

        <button onClick={onClose} style={{ width: "100%", marginTop: 8, background: "transparent", border: "1px solid #ffffff15", borderRadius: 12, padding: 12, color: "#aaa", fontWeight: 700, cursor: "pointer" }}>Cerrar</button>
      </div>
    </div>
  );
}

// ── FreeMatchModal ────────────────────────────────────────────────────────────
export function FreeMatchModal({ players, tournaments, busyPlayerIds = [], onSave, onClose }) {
  const [team1,     setTeam1]     = useState([]);
  const [team2,     setTeam2]     = useState([]);
  const [score1,    setScore1]    = useState("");
  const [score2,    setScore2]    = useState("");
  const [tournId,   setTournId]   = useState("");
  const [matchType, setMatchType] = useState("short");
  const [error,     setError]     = useState("");

  const selected = [...team1, ...team2].map(p => p.id);
  const available = players.filter(p => !selected.includes(p.id));
  const activeTournaments = tournaments.filter(t => t.status === "active");

  function addToTeam(p, team) {
    if (team === 1 && team1.length < 2) setTeam1(t => [...t, p]);
    if (team === 2 && team2.length < 2) setTeam2(t => [...t, p]);
  }
  function removeFromTeam(p, team) {
    if (team === 1) setTeam1(t => t.filter(x => x.id !== p.id));
    else setTeam2(t => t.filter(x => x.id !== p.id));
  }

  function handleSave() {
    if (team1.length !== 2 || team2.length !== 2) { setError("Cada equipo necesita 2 jugadores"); return; }
    if (score1 === "" || score2 === "") { setError("Ingresá el resultado"); return; }
    if (parseInt(score1) === parseInt(score2)) { setError("No puede terminar empatado"); return; }
    setError("");
    onSave({ team1, team2, score1, score2, matchType, tournamentId: tournId || null });
  }

  const teamBox = (team, teamNum) => (
    <div style={{ flex: 1, background: "#ffffff08", borderRadius: 12, padding: 12, border: "1px solid #ffffff10", minHeight: 80 }}>
      <div style={{ fontSize: 11, color: teamNum === 1 ? "#00d4aa" : "#6ab4ff", fontWeight: 800, marginBottom: 8 }}>EQUIPO {teamNum}</div>
      {team.map(p => (
        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>{p.name}</span>
          <button onClick={() => removeFromTeam(p, teamNum)} style={{ background: "transparent", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
      ))}
      {team.length < 2 && <div style={{ fontSize: 11, color: "#444", fontStyle: "italic" }}>Tocá un jugador ↓</div>}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#13131f", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxWidth: 420, border: "1px solid #ffffff15", maxHeight: "92vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#ffffff20", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 20 }}>⚡ Cargar partido</div>

        {/* Teams */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {teamBox(team1, 1)}
          {teamBox(team2, 2)}
        </div>

        {/* Available players */}
        <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 8 }}>JUGADORES DISPONIBLES</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {available.sort((a,b) => a.name.localeCompare(b.name)).map(p => {
            const isBusy = busyPlayerIds.includes(p.id);
            return (
            <div key={p.id} style={{ display: "flex", gap: 4, opacity: isBusy ? 0.35 : 1 }}>
              <div onClick={() => !isBusy && addToTeam(p, 1)} style={{ background: isBusy ? "#ffffff08" : "#00d4aa22", border: isBusy ? "1px solid #ffffff10" : "1px solid #00d4aa44", borderRadius: 8, padding: "5px 10px", fontSize: 12, color: isBusy ? "#555" : "#00d4aa", cursor: isBusy || team1.length >= 2 ? "not-allowed" : "pointer", fontWeight: 700 }}>
                {p.name}{isBusy ? " 🔒" : " →1"}
              </div>
              {!isBusy && <div onClick={() => addToTeam(p, 2)} style={{ background: "#6ab4ff22", border: "1px solid #6ab4ff44", borderRadius: 8, padding: "5px 10px", fontSize: 12, color: "#6ab4ff", cursor: team2.length >= 2 ? "not-allowed" : "pointer", fontWeight: 700 }}>
                →2
              </div>}
            </div>
          );
          })}
        </div>

        {/* Tipo de partido */}
        <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 8 }}>TIPO DE PARTIDO</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["short", "⚡ Corto", "#00d4aa"], ["long", "🎾 Largo", "#6ab4ff"]].map(([val, label, color]) => (
            <div key={val} onClick={() => setMatchType(val)}
              style={{ flex: 1, padding: "10px", borderRadius: 10, textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: matchType === val ? `${color}22` : "#ffffff08",
                border: matchType === val ? `2px solid ${color}` : "2px solid transparent",
                color: matchType === val ? color : "#555" }}>
              {label}
            </div>
          ))}
        </div>
        {/* Score */}
        <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 8 }}>{matchType === "short" ? "RESULTADO (games)" : "RESULTADO (sets)"}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <input type="number" min="0" max="99" value={score1} onChange={e => setScore1(e.target.value)}
            placeholder="Eq.1" style={{ flex: 1, background: "#0d0d1a", border: "1px solid #00d4aa44", borderRadius: 10, padding: "12px", color: "#fff", fontSize: 18, fontWeight: 900, textAlign: "center", outline: "none" }} />
          <span style={{ color: "#444", fontWeight: 900, fontSize: 18 }}>—</span>
          <input type="number" min="0" max="99" value={score2} onChange={e => setScore2(e.target.value)}
            placeholder="Eq.2" style={{ flex: 1, background: "#0d0d1a", border: "1px solid #6ab4ff44", borderRadius: 10, padding: "12px", color: "#fff", fontSize: 18, fontWeight: 900, textAlign: "center", outline: "none" }} />
        </div>

        {/* Torneo opcional */}
        {activeTournaments.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 8 }}>TORNEO (opcional)</div>
            <select value={tournId} onChange={e => setTournId(e.target.value)}
              style={{ width: "100%", background: "#0d0d1a", border: "1px solid #ffffff20", borderRadius: 10, padding: "11px 14px", color: tournId ? "#fff" : "#555", fontSize: 14, outline: "none" }}>
              <option value="">Sin torneo</option>
              {activeTournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {error && <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "transparent", border: "1px solid #ffffff15", borderRadius: 12, padding: 12, color: "#aaa", fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSave} style={{ flex: 2, background: "linear-gradient(135deg,#00d4aa,#0066ff)", border: "none", borderRadius: 12, padding: 12, color: "#fff", fontWeight: 800, cursor: "pointer" }}>Guardar partido</button>
        </div>
      </div>
    </div>
  );
}

// ── DataMgmtModal ─────────────────────────────────────────────────────────────
export function DataMgmtModal({ players, onClose, onClear }) {
  const [confirming, setConfirming] = useState(null);
  const [loading,    setLoading]    = useState(null);
  const [done,       setDone]       = useState([]);

  const actions = [
    { id: "matchHistory", label: "Historial de partidos",       icon: "📋", color: "#ff6b6b",  desc: "Borra todos los partidos jugados del historial." },
    { id: "pairHistory",  label: "Historial de parejas",        icon: "🤝", color: "#f59e0b",  desc: "Resetea el contador de veces que jugaron juntos." },
    { id: "session",      label: "Sesión actual",               icon: "🎾", color: "#6ab4ff",  desc: "Limpia la sesión, canchas, partidos en curso." },
    { id: "playerStats",  label: "Estadísticas de jugadores",   icon: "📊", color: "#a78bfa",  desc: `Resetea pts, victorias y partidos de ${players.length} jugadores a 0.` },
    { id: "tournaments",  label: "Torneos",                     icon: "🏆", color: "#00d4aa",  desc: "Elimina todos los torneos creados." },
  ];

  async function handleConfirm() {
    setLoading(confirming);
    setConfirming(null);
    try {
      await onClear(confirming, players);
      setDone(d => [...d, confirming]);
    } catch (e) { console.error(e); }
    setLoading(null);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "#13131f", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxWidth: 420, border: "1px solid #ffffff15", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#ffffff20", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 4 }}>🗄️ Gestión de datos</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>Cada acción tiene doble confirmación. No se pueden deshacer.</div>

        {actions.map(a => {
          const isDone    = done.includes(a.id);
          const isLoading = loading === a.id;
          const isConfirm = confirming === a.id;

          return (
            <div key={a.id} style={{ background: "#ffffff06", border: `1px solid ${isDone ? a.color + "44" : "#ffffff10"}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: isDone ? a.color : "#fff" }}>
                    {a.icon} {a.label} {isDone ? "✓" : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>{a.desc}</div>
                </div>
                {!isDone && !isConfirm && (
                  <button onClick={() => setConfirming(a.id)}
                    style={{ background: `${a.color}22`, border: `1px solid ${a.color}44`, borderRadius: 10, padding: "7px 14px", color: a.color, fontWeight: 800, fontSize: 12, cursor: "pointer", flexShrink: 0, marginLeft: 10 }}>
                    {isLoading ? "..." : "Borrar"}
                  </button>
                )}
                {isDone && <span style={{ color: a.color, fontSize: 18, marginLeft: 10 }}>✓</span>}
              </div>

              {isConfirm && (
                <div style={{ marginTop: 12, background: `${a.color}11`, borderRadius: 10, padding: "12px", border: `1px solid ${a.color}33` }}>
                  <div style={{ fontSize: 12, color: "#fff", fontWeight: 700, marginBottom: 10 }}>
                    ⚠️ ¿Confirmar? Esta acción no se puede deshacer.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setConfirming(null)}
                      style={{ flex: 1, background: "transparent", border: "1px solid #ffffff20", borderRadius: 8, padding: "8px", color: "#aaa", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      Cancelar
                    </button>
                    <button onClick={handleConfirm}
                      style={{ flex: 2, background: a.color, border: "none", borderRadius: 8, padding: "8px", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                      Sí, borrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button onClick={onClose}
          style={{ width: "100%", marginTop: 8, background: "transparent", border: "1px solid #ffffff15", borderRadius: 12, padding: 12, color: "#aaa", fontWeight: 700, cursor: "pointer" }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
