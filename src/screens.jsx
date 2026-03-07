import { useState } from "react";
import { Avatar, LevelBadge, SectionLabel, ReadOnlyBanner, getLevelColor, getLevelLabel } from "./components";

// ── HistorialSection ─────────────────────────────────────────────────────────
function HistorialSection({ matchHistory }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? matchHistory : matchHistory.slice(0, 3);
  const label = expanded ? "Ver menos ▲" : "Ver historial completo (" + matchHistory.length + ") ▼";
  return (
    <>
      <SectionLabel>ÚLTIMOS RESULTADOS</SectionLabel>
      {visible.map((h, i) => (
        <div key={i} style={{ background: "#ffffff08", borderRadius: 10, padding: "12px 14px", marginBottom: 8, border: "1px solid #ffffff10" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#ccc", flex: 1 }}>{h.team1}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#00d4aa", padding: "0 8px" }}>{h.score}</div>
            <div style={{ fontSize: 12, color: "#ccc", flex: 1, textAlign: "right" }}>{h.team2}</div>
          </div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>Ganó: <span style={{ color: "#00d4aa" }}>{h.winner}</span> · {h.date}</div>
        </div>
      ))}
      {matchHistory.length > 3 && (
        <button onClick={() => setExpanded(v => !v)}
          style={{ width: "100%", background: "transparent", border: "1px solid #ffffff15", borderRadius: 10, padding: "10px", color: "#6ab4ff", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
          {label}
        </button>
      )}
    </>
  );
}



export function getScreens({
  // data
  players, users, matchHistory, pairHistory,
  session, attending, courts, mode, matchType,
  matches, waitingPair, rotations, rotationStep, sittingOut,
  ranking, attendingPlayers, enrichedPairs, playerOfDay,
  suggestedCourts, remainder,
  // auth
  isAdmin,
  // ui state
  tab, setTab, playersSubTab, setPlayersSubTab, pairSearch, setPairSearch,
  // handlers
  toggleAttend, setAllAttend, setEditingPlayer,
  setShowUsersMgmt, setShowQuickMatch,
  handleGenerate, handleScoreChange, handleSetChange,
  handleConfirmMatch, handleConfirmRotation, handleRotationScore,
  writeSession,
}) {

  // ── INICIO ────────────────────────────────────────────────────────────────
  const inicio = (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={{ background: "linear-gradient(135deg,#00d4aa22,#0066ff22)", border: "1px solid #00d4aa33", borderRadius: 16, padding: "20px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, fontSize: 80, opacity: 0.06 }}>🎾</div>
        <div style={{ fontSize: 11, color: "#00d4aa", fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>TU GRUPO</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1 }}>ARPadel</div>
        <div style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>{players.length} jugadores · {matchHistory.length} partidos jugados</div>
        {playerOfDay.length > 0 && (
          <div style={{ marginTop: 12, background: "#ffd70022", border: "1px solid #ffd70055", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#ffd700", fontWeight: 700, letterSpacing: 2 }}>🏆 JUGADOR DEL DÍA</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 4 }}>{playerOfDay.join(" · ")}</div>
          </div>
        )}
      </div>

      {[
        { label: "Jugadores en el grupo", value: players.length, icon: "👥", action: () => setTab("jugadores") },
        { label: "Van hoy", value: attendingPlayers.length, icon: "✅", action: () => setTab("jugadores") },
        { label: "Partidos jugados", value: matchHistory.length, icon: "🏸", action: null },
      ].map(s => (
        <div key={s.label} onClick={s.action ?? undefined}
          style={{ display: "flex", alignItems: "center", gap: 14, background: "#ffffff08", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid #ffffff10", cursor: s.action ? "pointer" : "default" }}>
          <span style={{ fontSize: 22 }}>{s.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: 1 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{s.value}</div>
          </div>
          {s.action && <span style={{ color: "#333", fontSize: 18 }}>›</span>}
        </div>
      ))}

      {matchHistory.length > 0 && (
        <HistorialSection matchHistory={matchHistory} />
      )}

      <button onClick={() => setTab("partido")}
        style={{ width: "100%", marginTop: 8, background: "linear-gradient(135deg,#00d4aa,#0066ff)", border: "none", borderRadius: 14, padding: "16px", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
        {isAdmin ? "🎾 Armar partido →" : "📋 Consultar partidos →"}
      </button>
    </div>
  );

  // ── JUGADORES ─────────────────────────────────────────────────────────────
  const jugadores = (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ id: "lista", label: "👥 Jugadores" }, { id: "parejas", label: "🤝 Historial" }].map(t => (
          <button key={t.id} onClick={() => setPlayersSubTab(t.id)}
            style={{ flex: 1, padding: "10px", background: playersSubTab === t.id ? "#ffffff15" : "transparent", border: playersSubTab === t.id ? "1px solid #ffffff30" : "1px solid #ffffff10", borderRadius: 10, color: playersSubTab === t.id ? "#fff" : "#555", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {playersSubTab === "lista" ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionLabel style={{ marginBottom: 0 }}>{players.length} JUGADORES</SectionLabel>
            {isAdmin && (
              <button onClick={() => setEditingPlayer({})}
                style={{ background: "#00d4aa", border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                + Agregar
              </button>
            )}
          </div>
          <ReadOnlyBanner isAdmin={isAdmin} />
          {ranking.map(p => {
            const isGoing = attending.has(p.id);
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, background: isGoing ? "#ffffff0d" : "#ffffff05", borderRadius: 12, padding: "11px 14px", marginBottom: 7, border: isGoing ? "1px solid #ffffff15" : "1px solid #ffffff08" }}>
                {isAdmin && (
                  <div onClick={() => toggleAttend(p.id)}
                    style={{ width: 24, height: 24, borderRadius: 6, cursor: "pointer", flexShrink: 0, background: isGoing ? "#00d4aa" : "#ffffff10", border: isGoing ? "none" : "2px solid #ffffff20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isGoing && <span style={{ fontSize: 13, color: "#fff", fontWeight: 900 }}>✓</span>}
                  </div>
                )}
                {!isAdmin && isGoing && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4aa", flexShrink: 0 }} />}
                <div onClick={() => isAdmin && setEditingPlayer(p)}
                  style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: isAdmin ? "pointer" : "default" }}>
                  <Avatar name={p.name} pts={p.pts} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isGoing ? "#fff" : "#666" }}>{p.name}</span>
                      <LevelBadge pts={p.pts} />
                    </div>
                    <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{p.wins}V · {p.matches - p.wins}D · {p.pts}pts</div>
                  </div>
                  {isAdmin && <span style={{ color: "#2a2a3a", fontSize: 14 }}>✏️</span>}
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 16, background: "#00d4aa0d", border: "1px solid #00d4aa22", borderRadius: 12, padding: "14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#00d4aa", marginBottom: 4 }}>✅ Van hoy: {attendingPlayers.length} jugadores</div>
            <div style={{ fontSize: 11, color: "#555" }}>
              → {Math.floor(attendingPlayers.length / 4)} canchas posibles
              {remainder === 2 ? " · 1 pareja rotativa" : ""}
              {remainder === 1 ? " · 1 jugador sin cancha" : ""}
              {remainder === 3 ? " · 3 jugadores sin cancha" : ""}
            </div>
          </div>
        </>
      ) : (
        <>
          <SectionLabel>HISTORIAL DE PAREJAS</SectionLabel>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 14, lineHeight: 1.6 }}>Cuántas veces jugó cada pareja junta.</div>
          <input value={pairSearch} onChange={e => setPairSearch(e.target.value)} placeholder="🔍  Buscar por nombre..."
            style={{ ...{ width: "100%", background: "#ffffff10", border: "1px solid #ffffff20", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }, marginBottom: 16 }} />
          {enrichedPairs.length === 0 && (
            <div style={{ textAlign: "center", color: "#333", padding: "50px 0", fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🤝</div>Todavía no hay historial.
            </div>
          )}
          {enrichedPairs
            .filter(({ pA, pB }) => !pairSearch || pA.name.toLowerCase().includes(pairSearch.toLowerCase()) || pB.name.toLowerCase().includes(pairSearch.toLowerCase()))
            .map(({ key, pA, pB, times }) => {
              const heat = times >= 4 ? "#ff6b35" : times >= 2 ? "#f7c59f" : "#9bc53d";
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, background: "#ffffff07", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: "1px solid #ffffff0d" }}>
                  <Avatar name={pA.name} pts={pA.pts} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{pA.name} <span style={{ color: "#333" }}>&</span> {pB.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
                      {Array.from({ length: Math.min(times, 7) }).map((_, i) => (
                        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: heat, opacity: 0.3 + (i / Math.min(times, 7)) * 0.7 }} />
                      ))}
                      {times > 7 && <span style={{ fontSize: 10, color: "#555" }}>+{times - 7}</span>}
                    </div>
                  </div>
                  <Avatar name={pB.name} pts={pB.pts} size={34} />
                  <div style={{ textAlign: "right", minWidth: 38 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: heat, lineHeight: 1 }}>{times}</div>
                    <div style={{ fontSize: 9, color: "#444" }}>veces</div>
                  </div>
                </div>
              );
            })}
        </>
      )}
    </div>
  );

  // ── PARTIDO ───────────────────────────────────────────────────────────────
  const partido = (
    <div style={{ padding: "0 16px 16px" }}>
      {matches.length === 0 ? (
        <>
          <SectionLabel>{isAdmin ? "CONFIGURAR PARTIDO" : "PARTIDOS DE HOY"}</SectionLabel>
          <ReadOnlyBanner isAdmin={isAdmin} />

          {/* Asistencia */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>¿QUIÉN VA HOY? ({attendingPlayers.length})</div>
              {isAdmin && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setAllAttend(true)} style={{ fontSize: 11, color: "#00d4aa", background: "transparent", border: "none", cursor: "pointer", fontWeight: 700 }}>Todos</button>
                  <button onClick={() => setAllAttend(false)} style={{ fontSize: 11, color: "#666", background: "transparent", border: "none", cursor: "pointer", fontWeight: 700 }}>Ninguno</button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...players].sort((a, b) => b.pts - a.pts).map(p => {
                const isGoing = attending.has(p.id);
                return (
                  <div key={p.id} onClick={() => toggleAttend(p.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, background: isGoing ? "#ffffff0d" : "transparent", borderRadius: 10, padding: "9px 12px", border: isGoing ? "1px solid #ffffff15" : "1px solid #ffffff08", cursor: isAdmin ? "pointer" : "default" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, background: isGoing ? "#00d4aa" : "#ffffff10", border: isGoing ? "none" : "2px solid #ffffff20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isGoing && <span style={{ fontSize: 12, color: "#fff", fontWeight: 900 }}>✓</span>}
                    </div>
                    <Avatar name={p.name} pts={p.pts} size={26} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: isGoing ? "#fff" : "#555", flex: 1 }}>{p.name}</span>
                    <LevelBadge pts={p.pts} />
                  </div>
                );
              })}
            </div>
            {attendingPlayers.length >= 4 && (
              <div style={{ marginTop: 12, background: "#0066ff15", border: "1px solid #0066ff30", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, color: "#6ab4ff", fontWeight: 700 }}>
                  {attendingPlayers.length} jugadores → {suggestedCourts} cancha{suggestedCourts !== 1 ? "s" : ""}
                  {remainder === 2 ? " + 1 pareja rotativa 🔄" : ""}
                </div>
              </div>
            )}
          </div>

          {isAdmin && (
            <>
              {/* Canchas */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>CANCHAS ALQUILADAS HOY</div>
                  {suggestedCourts > 0 && courts !== suggestedCourts && (
                    <button onClick={() => writeSession({ courts: suggestedCourts })}
                      style={{ fontSize: 11, color: "#6ab4ff", background: "transparent", border: "none", cursor: "pointer", fontWeight: 700 }}>
                      Sugeridas: {suggestedCourts}
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => courts > 1 && writeSession({ courts: courts - 1 })}
                    style={{ width: 44, height: 44, borderRadius: 10, background: courts > 1 ? "#ffffff15" : "#ffffff05", border: "1px solid #ffffff15", color: courts > 1 ? "#fff" : "#333", fontSize: 22, fontWeight: 900, cursor: courts > 1 ? "pointer" : "default", flexShrink: 0 }}>
                    −
                  </button>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{courts}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                      cancha{courts !== 1 ? "s" : ""} · {courts * 4} jugadores
                    </div>
                  </div>
                  <button onClick={() => writeSession({ courts: courts + 1 })}
                    style={{ width: 44, height: 44, borderRadius: 10, background: "#ffffff15", border: "1px solid #ffffff15", color: "#fff", fontSize: 22, fontWeight: 900, cursor: "pointer", flexShrink: 0 }}>
                    +
                  </button>
                </div>
                {attendingPlayers.length > 0 && (
                  <div style={{ marginTop: 10, background: courts * 4 > attendingPlayers.length ? "#ff6b3515" : "#0066ff15", border: `1px solid ${courts * 4 > attendingPlayers.length ? "#ff6b3533" : "#0066ff30"}`, borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, color: courts * 4 > attendingPlayers.length ? "#ff9966" : "#6ab4ff", fontWeight: 700 }}>
                      {attendingPlayers.length} jugadores → {Math.min(courts, Math.floor(attendingPlayers.length / 4))} partido{Math.min(courts, Math.floor(attendingPlayers.length / 4)) !== 1 ? "s" : ""}
                      {attendingPlayers.length - Math.min(courts, Math.floor(attendingPlayers.length / 4)) * 4 > 0
                        ? ` · ${attendingPlayers.length - Math.min(courts, Math.floor(attendingPlayers.length / 4)) * 4} sin partido`
                        : " · todos juegan 🎾"}
                    </div>
                  </div>
                )}
              </div>

              {/* Modo */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#aaa", marginBottom: 10, fontWeight: 600 }}>MODO DE ARMADO</div>
                {[
                  { id: "nivelado", label: "⚖️ Nivelado", desc: "Mezcla categorías — balancea promedios y evita repetir parejas" },
                  { id: "categoria", label: "🎯 Por nivel", desc: "Jugadores del mismo nivel en la misma cancha" },
                ].map(m => (
                  <button key={m.id} onClick={() => writeSession({ mode: m.id })}
                    style={{ width: "100%", textAlign: "left", padding: "14px", background: mode === m.id ? "#0066ff22" : "#ffffff08", border: mode === m.id ? "2px solid #0066ff" : "2px solid #ffffff10", borderRadius: 12, cursor: "pointer", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: mode === m.id ? "#6ab4ff" : "#ccc" }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: "#444", marginTop: 3 }}>{m.desc}</div>
                  </button>
                ))}
              </div>

              {/* Tipo */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: "#aaa", marginBottom: 10, fontWeight: 600 }}>TIPO DE PARTIDO</div>
                {[
                  { id: "short", label: "⚡ Partido corto", desc: "Primero a 5 games (máx 5-4)" },
                  { id: "long", label: "🏆 Partido largo", desc: "Mejor de 3 sets con tiebreak" },
                ].map(t => (
                  <button key={t.id} onClick={() => writeSession({ matchType: t.id })}
                    style={{ width: "100%", textAlign: "left", padding: "14px", background: matchType === t.id ? "#0066ff22" : "#ffffff08", border: matchType === t.id ? "2px solid #0066ff" : "2px solid #ffffff10", borderRadius: 12, cursor: "pointer", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: matchType === t.id ? "#6ab4ff" : "#ccc" }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: "#444", marginTop: 3 }}>{t.desc}</div>
                  </button>
                ))}
              </div>

              <button onClick={handleGenerate} disabled={attendingPlayers.length < 4}
                style={{ width: "100%", background: attendingPlayers.length < 4 ? "#333" : "linear-gradient(135deg,#00d4aa,#0066ff)", border: "none", borderRadius: 14, padding: "18px", color: attendingPlayers.length < 4 ? "#666" : "#fff", fontWeight: 900, fontSize: 16, cursor: attendingPlayers.length < 4 ? "not-allowed" : "pointer", boxShadow: attendingPlayers.length >= 4 ? "0 8px 30px #00d4aa44" : "none" }}>
                {attendingPlayers.length < 4 ? "Necesitás al menos 4 jugadores" : "⚡ ARMAR PARTIDOS"}
              </button>
              {matchType === "long" && attendingPlayers.length > courts * 4 && (
                <div style={{ marginTop: 10, background: "#ff6b3518", border: "1px solid #ff6b3555", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, color: "#ff9966", fontWeight: 700, marginBottom: 4 }}>⚠️ Jugadores exceden la capacidad</div>
                  <div style={{ fontSize: 11, color: "#aa6644", lineHeight: 1.6 }}>
                    {attendingPlayers.length} jugadores anotados, {courts} canchas × 4 = {courts * 4} lugares disponibles.<br />
                    En partido largo no hay tiempo para rotaciones. Agregá {Math.ceil((attendingPlayers.length - courts * 4) / 4)} cancha{Math.ceil((attendingPlayers.length - courts * 4) / 4) > 1 ? "s" : ""} más, o cambiá a partido corto.
                  </div>
                </div>
              )}
              {matchType === "long" && attendingPlayers.length % 4 !== 0 && attendingPlayers.length <= courts * 4 && attendingPlayers.length >= 4 && (
                <div style={{ marginTop: 10, background: "#ff6b3518", border: "1px solid #ff6b3555", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, color: "#ff9966", fontWeight: 700, marginBottom: 4 }}>⚠️ Cantidad impar de parejas</div>
                  <div style={{ fontSize: 11, color: "#aa6644", lineHeight: 1.6 }}>
                    {attendingPlayers.length} jugadores no forman grupos exactos de 4 para partido largo.<br />
                    Cambiá a partido corto para usar rotativa, o ajustá la cantidad de jugadores.
                  </div>
                </div>
              )}

              <button onClick={() => setShowQuickMatch(true)}
                style={{ width: "100%", marginTop: 10, background: "#ffffff10", border: "1px solid #ffffff20", borderRadius: 12, padding: "14px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                ➕ Registrar partido rápido
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SectionLabel style={{ marginBottom: 0 }}>{matches.filter(m => m.done).length}/{matches.length} COMPLETADOS</SectionLabel>
            {isAdmin && (
              <button onClick={() => writeSession({ matches: [], waitingPair: [], rotations: [], rotationStep: 0 })}
                style={{ background: "transparent", border: "1px solid #ffffff15", borderRadius: 8, padding: "6px 12px", color: "#666", fontSize: 12, cursor: "pointer" }}>
                ↩ Reconfigurar
              </button>
            )}
          </div>

          {matches.map(match => (
            <div key={match.id} style={{ background: match.done ? "#00d4aa0a" : "#ffffff08", border: match.done ? "1px solid #00d4aa2a" : "1px solid #ffffff10", borderRadius: 16, padding: "16px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: match.category ? getLevelColor(match.category) : "#555", fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>
                CANCHA {match.id + 1}{match.category ? ` · NIVEL ${getLevelLabel(match.category)}` : ""}
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  {match.team1.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Avatar name={p.name} pts={p.pts} size={32} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: "#444" }}>{p.pts}pts</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: "#00d4aa", marginTop: 4, fontWeight: 600 }}>Prom. {Math.round(match.team1.reduce((s, p) => s + p.pts, 0) / 2)}</div>
                </div>
                <div style={{ padding: "0 4px", alignSelf: "center" }}>
                  <div style={{ fontSize: 11, color: "#2a2a2a", fontWeight: 800 }}>VS</div>
                </div>
                <div style={{ flex: 1 }}>
                  {match.team2.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, justifyContent: "flex-end" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: "#444" }}>{p.pts}pts</div>
                      </div>
                      <Avatar name={p.name} pts={p.pts} size={32} />
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: "#00d4aa", marginTop: 4, fontWeight: 600, textAlign: "right" }}>Prom. {Math.round(match.team2.reduce((s, p) => s + p.pts, 0) / 2)}</div>
                </div>
              </div>

              {match.done ? (
                <div style={{ textAlign: "center", padding: "10px", fontSize: 22, fontWeight: 800, color: "#00d4aa", letterSpacing: 5 }}>
                  {match.score1} — {match.score2} ✓
                </div>
              ) : !isAdmin ? (
                <div style={{ textAlign: "center", fontSize: 12, color: "#444", padding: "8px 0" }}>⏳ Esperando resultado del admin…</div>
              ) : matchType === "long" ? (
                <div style={{ padding: "0 4px" }}>
                  <div style={{ display: "flex", marginBottom: 8, paddingLeft: 52 }}>
                    <div style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#00d4aa", fontWeight: 700 }}>{match.team1.map(p => p.name.split(" ")[0]).join("/")}</div>
                    <div style={{ width: 16 }} />
                    <div style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#6ab4ff", fontWeight: 700 }}>{match.team2.map(p => p.name.split(" ")[0]).join("/")}</div>
                  </div>
                  {[0, 1, 2].map(si => (
                    <div key={si} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 46, fontSize: 10, color: "#555", fontWeight: 700, textAlign: "center", background: "#ffffff08", borderRadius: 6, padding: "8px 2px", flexShrink: 0 }}>Set {si + 1}</div>
                      <input type="number" min="0" max="7" value={match[`s${si}a`] ?? ""} onChange={e => handleSetChange(match.id, si, 0, e.target.value)} placeholder="—"
                        style={{ flex: 1, background: "#00d4aa18", border: "1px solid #00d4aa33", borderRadius: 8, padding: "10px 4px", color: "#fff", fontSize: 20, fontWeight: 900, textAlign: "center", outline: "none", minWidth: 0 }} />
                      <div style={{ fontSize: 14, color: "#333", fontWeight: 900, flexShrink: 0 }}>:</div>
                      <input type="number" min="0" max="7" value={match[`s${si}b`] ?? ""} onChange={e => handleSetChange(match.id, si, 1, e.target.value)} placeholder="—"
                        style={{ flex: 1, background: "#0066ff18", border: "1px solid #0066ff33", borderRadius: 8, padding: "10px 4px", color: "#fff", fontSize: 20, fontWeight: 900, textAlign: "center", outline: "none", minWidth: 0 }} />
                    </div>
                  ))}
                  <button onClick={() => handleConfirmMatch(match.id)}
                    style={{ width: "100%", background: "linear-gradient(135deg,#00d4aa,#0066ff)", border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 4 }}>
                    ✓ Confirmar resultado
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
                  <input type="number" min="0" value={match.score1} onChange={e => handleScoreChange(match.id, "1", e.target.value)} placeholder="0"
                    style={{ flex: 1, background: "#00d4aa18", border: "1px solid #00d4aa33", borderRadius: 8, padding: "12px 4px", color: "#fff", fontSize: 24, fontWeight: 900, textAlign: "center", outline: "none", minWidth: 0 }} />
                  <span style={{ color: "#333", fontWeight: 900, fontSize: 20, flexShrink: 0 }}>—</span>
                  <input type="number" min="0" value={match.score2} onChange={e => handleScoreChange(match.id, "2", e.target.value)} placeholder="0"
                    style={{ flex: 1, background: "#0066ff18", border: "1px solid #0066ff33", borderRadius: 8, padding: "12px 4px", color: "#fff", fontSize: 24, fontWeight: 900, textAlign: "center", outline: "none", minWidth: 0 }} />
                  <button onClick={() => handleConfirmMatch(match.id)}
                    style={{ flexShrink: 0, background: "linear-gradient(135deg,#00d4aa,#0066ff)", border: "none", borderRadius: 8, padding: "12px 14px", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                    ✓ OK
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Jugadores sin partido */}
          {sittingOut && sittingOut.length > 0 && (
            <div style={{ background: "#ffffff07", border: "1px solid #ffffff12", borderRadius: 14, padding: "14px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#888", fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>😴 SIN PARTIDO ESTA RONDA</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sittingOut.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#ffffff0d", borderRadius: 8, padding: "6px 10px" }}>
                    <Avatar name={p.name} pts={p.pts} size={24} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#888" }}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pareja rotativa */}
          {waitingPair.length === 2 && (
            <div style={{ marginBottom: 14 }}>
              {/* Info card - only show while no rotation is active */}
              {rotations.length === 0 && (
                <div style={{ background: "#7c3aed22", border: "1px solid #7c3aed55", borderRadius: 14, padding: "16px", marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>🔄 PAREJA ROTATIVA</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    {waitingPair.map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar name={p.name} pts={p.pts} size={32} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: "#666" }}>{p.pts}pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7, background: "#ffffff06", borderRadius: 8, padding: "10px 12px" }}>
                    ⏳ Esperando que termine la primera cancha para desafiar al ganador…
                  </div>
                </div>
              )}

              {rotations.map((rot) => (
                <div key={rot.id} style={{ background: rot.done ? "#7c3aed0d" : "#7c3aed22", border: rot.done ? "1px solid #7c3aed22" : "1px solid #7c3aed55", borderRadius: 14, padding: "16px", marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
                    🔄 ROTATIVA {rot.id + 1} · vs ganador cancha {rot.courtId + 1}
                  </div>

                  {/* Teams */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, marginBottom: 6 }}>ROTATIVA</div>
                      {rot.challenger.map(p => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <Avatar name={p.name} pts={p.pts} size={26} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#ddd" }}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: "#333", fontWeight: 900 }}>VS</div>
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#00d4aa", fontWeight: 700, marginBottom: 6 }}>GANADOR</div>
                      {(rot.vsTeam ?? []).map(p => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, justifyContent: "flex-end" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#ddd" }}>{p.name}</span>
                          <Avatar name={p.name} pts={p.pts} size={26} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {rot.done ? (
                    <div style={{ textAlign: "center", padding: "10px", background: "#7c3aed15", borderRadius: 8 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: "#a78bfa", letterSpacing: 6 }}>{rot.wins1} — {rot.wins2}</span>
                      <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 4 }}>
                        Ganó: {rot.wins1 > rot.wins2 ? rot.challenger.map(p => p.name).join(" & ") : (rot.vsTeam ?? []).map(p => p.name).join(" & ")}
                      </div>
                    </div>
                  ) : isAdmin ? (
                    <div>
                      <div style={{ display: "flex", marginBottom: 6 }}>
                        <div style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#a78bfa", fontWeight: 700 }}>
                          {rot.challenger.map(p => p.name.split(" ")[0]).join("/")}
                        </div>
                        <div style={{ width: 30 }} />
                        <div style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#00d4aa", fontWeight: 700 }}>
                          {(rot.vsTeam ?? []).map(p => p.name.split(" ")[0]).join("/")}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
                        <input type="number" min="0" value={rot.score1} onChange={e => handleRotationScore(rot.id, "1", e.target.value)} placeholder="0"
                          style={{ flex: 1, background: "#7c3aed22", border: "1px solid #7c3aed55", borderRadius: 8, padding: "12px 4px", color: "#fff", fontSize: 24, fontWeight: 900, textAlign: "center", outline: "none", minWidth: 0 }} />
                        <span style={{ color: "#333", fontWeight: 900, fontSize: 20, flexShrink: 0 }}>—</span>
                        <input type="number" min="0" value={rot.score2} onChange={e => handleRotationScore(rot.id, "2", e.target.value)} placeholder="0"
                          style={{ flex: 1, background: "#7c3aed22", border: "1px solid #7c3aed55", borderRadius: 8, padding: "12px 4px", color: "#fff", fontSize: 24, fontWeight: 900, textAlign: "center", outline: "none", minWidth: 0 }} />
                        <button onClick={() => handleConfirmRotation(rot.id)}
                          style={{ flexShrink: 0, background: "#7c3aed", border: "none", borderRadius: 8, padding: "12px 14px", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>✓ OK</button>
                      </div>
                      <div style={{ fontSize: 10, color: "#555", textAlign: "center", marginTop: 6 }}>games ganados</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", fontSize: 12, color: "#444", padding: "8px 0" }}>⏳ Esperando resultado…</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {matches.every(m => m.done) && isAdmin && (
            <button onClick={() => { writeSession({ matches: [], waitingPair: [], rotations: [], rotationStep: 0 }); setTab("ranking"); }}
              style={{ width: "100%", background: "linear-gradient(135deg,#00d4aa,#0066ff)", border: "none", borderRadius: 14, padding: "16px", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 8 }}>
              🏆 Ver ranking actualizado →
            </button>
          )}
        </>
      )}
    </div>
  );

  // ── RANKING ───────────────────────────────────────────────────────────────
  const rankingScreen = (
    <div style={{ padding: "0 16px 16px" }}>
      <SectionLabel>RANKING TEMPORADA</SectionLabel>
      {ranking.length >= 3 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "flex-end" }}>
          {[1, 0, 2].map(idx => {
            const p = ranking[idx];
            const heights = [80, 100, 70];
            const medals = ["🥈", "🥇", "🥉"];
            const h = heights[idx === 0 ? 1 : idx === 1 ? 0 : 2];
            const medal = medals[idx === 0 ? 1 : idx === 1 ? 0 : 2];
            const bgColor = idx === 1 ? "linear-gradient(180deg,#00d4aa,#00a382)" : idx === 0 ? "linear-gradient(180deg,#aaa,#777)" : "linear-gradient(180deg,#cd7f32,#a05210)";
            return (
              <div key={p.id} style={{ flex: 1, textAlign: "center" }}>
                <Avatar name={p.name} pts={p.pts} size={idx === 1 ? 48 : 38} />
                <div style={{ fontSize: 12, color: "#fff", fontWeight: 700, marginTop: 6 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#00d4aa", fontWeight: 800 }}>{p.pts}pts</div>
                <div style={{ marginTop: 8, height: h, background: bgColor, borderRadius: "8px 8px 0 0", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 10, fontSize: 20 }}>
                  {medal}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {ranking.map((p, i) => (
        <div key={p.id} onClick={() => isAdmin && setEditingPlayer(p)}
          style={{ display: "flex", alignItems: "center", gap: 12, background: i === 0 ? "#00d4aa0e" : "#ffffff06", border: i === 0 ? "1px solid #00d4aa2a" : "1px solid #ffffff08", borderRadius: 12, padding: "10px 14px", marginBottom: 6, cursor: isAdmin ? "pointer" : "default" }}>
          <div style={{ width: 24, textAlign: "center", fontSize: i < 3 ? 16 : 12, fontWeight: 700, color: i < 3 ? ["#ffd700", "#c0c0c0", "#cd7f32"][i] : "#333" }}>
            {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${p.rank}`}
          </div>
          <Avatar name={p.name} pts={p.pts} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{p.name}</div>
            <div style={{ fontSize: 10, color: "#444" }}>{p.wins}V · {p.matches - p.wins}D · {p.matches ? Math.round(p.wins / p.matches * 100) : 0}%</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#00d4aa" }}>{p.pts}</div>
            <LevelBadge pts={p.pts} />
          </div>
        </div>
      ))}
    </div>
  );

  return { inicio, jugadores, partido, ranking: rankingScreen };
}
