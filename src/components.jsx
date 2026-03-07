import { useState } from "react";

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
export function Avatar({ name, pts, size = 36 }) {
  const color = getLevelColor(getLevel(pts));
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
  return (
    <span style={{
      background: isAdmin ? "#0066ff33" : "#ffffff10",
      border: `1px solid ${isAdmin ? "#0066ff" : "#ffffff20"}`,
      color: isAdmin ? "#6ab4ff" : "#666",
      borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1,
    }}>
      {isAdmin ? "⚡ ADMIN" : "👁 VIEWER"}
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
export function UsersMgmtModal({ users, onClose, onSave }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});

  function startEdit(u) { setEditingId(u.id); setForm({ name: u.name, pin: u.pin, role: u.role }); }
  function save() { const u = users.find(x => x.id === editingId); onSave({ ...u, ...form }); setEditingId(null); }

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
        <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>Cambiá roles y PINs.</div>

        {users.map(u => (
          <div key={u.id} style={{ background: "#ffffff07", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: "1px solid #ffffff0d" }}>
            {editingId === u.id ? (
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre"
                    style={{ ...inputStyle, flex: 2, padding: "8px 10px", fontSize: 13 }} />
                  <input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} placeholder="PIN" maxLength={6}
                    style={{ ...inputStyle, flex: 1, padding: "8px 10px", fontSize: 13 }} />
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {["admin", "user"].map(r => (
                    <div key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                      style={{ flex: 1, padding: "8px", borderRadius: 8, border: form.role === r ? "2px solid #0066ff" : "2px solid #ffffff15", background: form.role === r ? "#0066ff22" : "transparent", textAlign: "center", cursor: "pointer", fontSize: 12, color: form.role === r ? "#6ab4ff" : "#555", fontWeight: 700 }}>
                      {r === "admin" ? "⚡ Admin" : "👁 Viewer"}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={save} style={{ flex: 1, background: "#00d4aa", border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Guardar</button>
                  <button onClick={() => setEditingId(null)} style={{ flex: 1, background: "transparent", border: "1px solid #ffffff15", borderRadius: 8, padding: "10px", color: "#666", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={u.name} pts={200} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: "#444" }}>PIN: {"•".repeat(u.pin?.length ?? 4)}</div>
                </div>
                <RoleBadge role={u.role} />
                <button onClick={() => startEdit(u)}
                  style={{ background: "transparent", border: "1px solid #ffffff15", borderRadius: 8, padding: "6px 10px", color: "#666", fontSize: 11, cursor: "pointer" }}>✏️</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── QuickMatchModal ──────────────────────────────────────────────────────────
export function QuickMatchModal({ players, onSave, onClose }) {
  const [team1Ids, setTeam1Ids] = useState([]);
  const [team2Ids, setTeam2Ids] = useState([]);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [step, setStep] = useState(1);

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
        <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>Registrá un partido sin generar sorteo</div>

        {step === 1 && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {[{ label: "EQUIPO 1", color: "#00d4aa", ids: team1Ids, team: team1 }, { label: "EQUIPO 2", color: "#6ab4ff", ids: team2Ids, team: team2 }].map(({ label, color, team }) => (
                <div key={label} style={{ flex: 1, background: `${color}15`, border: `1px solid ${color}33`, borderRadius: 10, padding: "10px", minHeight: 60 }}>
                  <div style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 6 }}>{label}</div>
                  {team.map(p => <div key={p.id} style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{p.name}</div>)}
                  {team.length < 2 && <div style={{ fontSize: 11, color: "#333" }}>Seleccioná {2 - team.length} más</div>}
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
                <span style={{ color: "#444" }}>vs</span>
                <span>{team2.map(p => p.name).join(" & ")}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
              <input type="number" min="0" value={score1} onChange={e => setScore1(e.target.value)} placeholder="0"
                style={{ flex: 1, background: "#00d4aa22", border: "1px solid #00d4aa44", borderRadius: 8, padding: "16px", color: "#fff", fontSize: 28, fontWeight: 800, textAlign: "center", outline: "none" }} />
              <span style={{ color: "#333", fontWeight: 800, fontSize: 22 }}>—</span>
              <input type="number" min="0" value={score2} onChange={e => setScore2(e.target.value)} placeholder="0"
                style={{ flex: 1, background: "#0066ff22", border: "1px solid #0066ff44", borderRadius: 8, padding: "16px", color: "#fff", fontSize: 28, fontWeight: 800, textAlign: "center", outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: "transparent", border: "1px solid #ffffff15", borderRadius: 12, padding: "14px", color: "#666", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>← Atrás</button>
              <button onClick={() => onSave({ team1, team2, score1, score2 })} disabled={!canSave}
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

// ── LoginScreen ──────────────────────────────────────────────────────────────
export function LoginScreen({ users, onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);

  function handleLogin() {
    if (!selected) { setError("Seleccioná tu nombre"); return; }
    const user = users.find(u => u.id === selected);
    if (!user) { setError("Usuario no encontrado"); return; }
    if (user.pin !== pin) { setError("PIN incorrecto"); setPin(""); return; }
    onLogin(user);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <img src="/logo.jpg" alt="ARPadel" style={{ height: 44, objectFit: "contain", marginBottom: 32 }} />
      <div style={{ width: "100%", maxWidth: 380, background: "#181828", borderRadius: 20, padding: "28px 24px", border: "1px solid #ffffff10" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Bienvenido</div>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 24 }}>Seleccioná tu nombre e ingresá tu PIN</div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#888", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>¿QUIÉN SOS?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[...users].sort((a, b) => a.name.localeCompare(b.name)).map(u => (
              <div key={u.id} onClick={() => { setSelected(u.id); setPin(""); setError(""); }}
                style={{ padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600, background: selected === u.id ? "#00d4aa" : "#ffffff0d", color: selected === u.id ? "#fff" : "#888", border: selected === u.id ? "2px solid #00d4aa" : "2px solid transparent" }}>
                {u.name}
              </div>
            ))}
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
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#666", cursor: "pointer", fontSize: 16 }}>
                {showPin ? "🙈" : "👁"}
              </button>
            </div>
            {error && <div style={{ fontSize: 12, color: "#ff6b6b", marginTop: 6 }}>{error}</div>}
          </div>
        )}

        <button onClick={handleLogin} disabled={!selected}
          style={{ width: "100%", background: selected ? "linear-gradient(135deg,#00d4aa,#0066ff)" : "#333", border: "none", borderRadius: 12, padding: "14px", color: selected ? "#fff" : "#666", fontWeight: 800, fontSize: 15, cursor: selected ? "pointer" : "not-allowed" }}>
          Entrar
        </button>
        <div style={{ fontSize: 11, color: "#333", textAlign: "center", marginTop: 16 }}>¿No tenés PIN? Pedíselo al admin del grupo.</div>
      </div>
      <div style={{ marginTop: 28, textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#2a2a3a", fontWeight: 600 }}>Desarrollado por Juan Pablo Gómez</div>
        <a href="mailto:argentinapadel@gmail.com" style={{ fontSize: 10, color: "#2a2a3a", textDecoration: "none" }}>
          argentinapadel@gmail.com
        </a>
        <div style={{ fontSize: 10, color: "#1e1e2e", marginTop: 2 }}>© 2025 ARPadel · Todos los derechos reservados</div>
      </div>
    </div>
  );
}
