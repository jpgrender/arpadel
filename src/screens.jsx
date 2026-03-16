import { useState, useRef, useEffect } from "react";
import React from "react";
import { Avatar, LevelBadge, SectionLabel, ReadOnlyBanner, getLevelColor, getLevelLabel, PlayerProfileModal } from "./components";

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
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Ganó: <span style={{ color: "#00d4aa" }}>{h.winner}</span> · {h.date}</div>
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
  players, users, matchHistory, pairHistory, profiles,
  session, attending, courts, mode, matchType,
  matches, waitingPair, rotations, rotationStep, sittingOut,
  ranking, attendingPlayers, enrichedPairs, playerOfDay,
  suggestedCourts, remainder,
  // auth
  isAdmin, isSuperuser,
  tournaments, setShowTournament, setShowFreeMatch, setShowDataMgmt,
  // ui state
  tab, setTab, playersSubTab, setPlayersSubTab, pairSearch, setPairSearch,
  // handlers
  toggleAttend, setAllAttend, setEditingPlayer, setViewingPlayer,
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
            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, letterSpacing: 1 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{s.value}</div>
          </div>
          {s.action && <span style={{ color: "#666", fontSize: 18 }}>›</span>}
        </div>
      ))}

      {matchHistory.length > 0 && (
        <HistorialSection matchHistory={matchHistory} />
      )}

      <button onClick={() => setTab("partido")}
        style={{ width: "100%", marginTop: 8, background: "linear-gradient(135deg,#00d4aa,#0066ff)", border: "none", borderRadius: 14, padding: "16px", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
        {isSuperuser ? "🎾 Armar partido →" : "📋 Consultar partidos →"}
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
          <ReadOnlyBanner isAdmin={isSuperuser} />
          {[...players].sort((a, b) => a.name.localeCompare(b.name)).map(p => {
            const isGoing = attending.has(p.id);
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, background: isGoing ? "#ffffff0d" : "#ffffff05", borderRadius: 12, padding: "11px 14px", marginBottom: 7, border: isGoing ? "1px solid #ffffff15" : "1px solid #ffffff08" }}>
                {isSuperuser && (
                  <div onClick={() => toggleAttend(p.id)}
                    style={{ width: 24, height: 24, borderRadius: 6, cursor: "pointer", flexShrink: 0, background: isGoing ? "#00d4aa" : "#ffffff10", border: isGoing ? "none" : "2px solid #ffffff20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isGoing && <span style={{ fontSize: 13, color: "#fff", fontWeight: 900 }}>✓</span>}
                  </div>
                )}
                {!isSuperuser && isGoing && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4aa", flexShrink: 0 }} />}
                <div onClick={() => setViewingPlayer(p)}
                  style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: "pointer", minWidth: 0 }}>
                  <Avatar name={p.name} pts={p.pts} size={38} photoURL={profiles.find(x=>x.id===p.id)?.photoURL} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isGoing ? "#fff" : "#aaa" }}>{p.name}</span>
                      <LevelBadge pts={p.pts} />
                    </div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{p.wins}V · {p.matches - p.wins}D · {p.pts}pts</div>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={e => { e.stopPropagation(); setEditingPlayer(p); }}
                    style={{ background: "#ffffff0d", border: "1px solid #ffffff15", borderRadius: 8, padding: "7px 11px", color: "#aaa", fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
                    ✏️
                  </button>
                )}
              </div>
            );
          })}
          <div style={{ marginTop: 16, background: "#00d4aa0d", border: "1px solid #00d4aa22", borderRadius: 12, padding: "14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#00d4aa", marginBottom: 4 }}>✅ Van hoy: {attendingPlayers.length} jugadores</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>
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
                  <Avatar name={pA.name} pts={pA.pts} size={34} photoURL={profiles.find(x=>x.id===pA.id)?.photoURL} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{pA.name} <span style={{ color: "#888" }}>&</span> {pB.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
                      {Array.from({ length: Math.min(times, 7) }).map((_, i) => (
                        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: heat, opacity: 0.3 + (i / Math.min(times, 7)) * 0.7 }} />
                      ))}
                      {times > 7 && <span style={{ fontSize: 11, color: "#aaa" }}>+{times - 7}</span>}
                    </div>
                  </div>
                  <Avatar name={pB.name} pts={pB.pts} size={34} photoURL={profiles.find(x=>x.id===pB.id)?.photoURL} />
                  <div style={{ textAlign: "right", minWidth: 38 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: heat, lineHeight: 1 }}>{times}</div>
                    <div style={{ fontSize: 11, color: "#999" }}>veces</div>
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
          <SectionLabel>{isSuperuser ? "CONFIGURAR PARTIDO" : "PARTIDOS DE HOY"}</SectionLabel>
          <ReadOnlyBanner isAdmin={isSuperuser} />

          {/* Asistencia */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>¿QUIÉN VA HOY? ({attendingPlayers.length})</div>
              {isSuperuser && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setAllAttend(true)} style={{ fontSize: 11, color: "#00d4aa", background: "transparent", border: "none", cursor: "pointer", fontWeight: 700 }}>Todos</button>
                  <button onClick={() => setAllAttend(false)} style={{ fontSize: 11, color: "#666", background: "transparent", border: "none", cursor: "pointer", fontWeight: 700 }}>Ninguno</button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...players].sort((a, b) => a.name.localeCompare(b.name)).map(p => {
                const isGoing = attending.has(p.id);
                return (
                  <div key={p.id} onClick={() => toggleAttend(p.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, background: isGoing ? "#ffffff0d" : "transparent", borderRadius: 10, padding: "9px 12px", border: isGoing ? "1px solid #ffffff15" : "1px solid #ffffff08", cursor: isSuperuser ? "pointer" : "default" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, background: isGoing ? "#00d4aa" : "#ffffff10", border: isGoing ? "none" : "2px solid #ffffff20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isGoing && <span style={{ fontSize: 12, color: "#fff", fontWeight: 900 }}>✓</span>}
                    </div>
                    <Avatar name={p.name} pts={p.pts} size={26} photoURL={profiles.find(x=>x.id===p.id)?.photoURL} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: isGoing ? "#fff" : "#aaa", flex: 1 }}>{p.name}</span>
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

          {isSuperuser && (
            <>
              {/* Torneo y partido libre */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button onClick={() => setShowFreeMatch(true)}
                  style={{ flex: 1, background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 12, padding: "11px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  ⚡ Partido libre
                </button>
                <button onClick={() => setShowTournament(true)}
                  style={{ flex: 1, background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 12, padding: "11px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  🏆 Torneos
                </button>
              </div>
              {isAdmin && (
                <div style={{ marginBottom: 16 }}>
                  <button onClick={() => setShowDataMgmt(true)}
                    style={{ width: "100%", background: "#ff6b6b11", border: "1px solid #ff6b6b33", borderRadius: 12, padding: "11px", color: "#ff6b6b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    🗄️ Gestión de datos
                  </button>
                </div>
              )}
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
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
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
                ➕ Registrar partido
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionLabel style={{ marginBottom: 0 }}>{matches.filter(m => m.done).length}/{matches.length} COMPLETADOS</SectionLabel>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isSuperuser && (
                <button onClick={() => setShowQuickMatch(true)}
                  style={{ background: "#ffffff0d", border: "1px solid #ffffff15", borderRadius: 8, padding: "6px 12px", color: "#aaa", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  ➕ Partido
                </button>
              )}
              {isAdmin && (
                <button onClick={() => writeSession({ matches: [], waitingPair: [], rotations: [], rotationStep: 0 })}
                  style={{ background: "transparent", border: "1px solid #ffffff15", borderRadius: 8, padding: "6px 12px", color: "#666", fontSize: 12, cursor: "pointer" }}>
                  ↩ Reconfigurar
                </button>
              )}
            </div>
          </div>

          {isSuperuser && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setShowFreeMatch(true)}
                style={{ flex: 1, background: "#00d4aa15", border: "1px solid #00d4aa33", borderRadius: 12, padding: "11px", color: "#00d4aa", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                ⚡ Partido libre
              </button>
              <button onClick={() => setShowTournament(true)}
                style={{ flex: 1, background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 12, padding: "11px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                🏆 Torneos
              </button>
              {isAdmin && (
                <button onClick={() => setShowDataMgmt(true)}
                  style={{ flex: 1, background: "#ff6b6b11", border: "1px solid #ff6b6b33", borderRadius: 12, padding: "11px", color: "#ff6b6b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  🗄️ Datos
                </button>
              )}
            </div>
          )}

          {matches.map(match => (
            <div key={match.id} style={{ background: match.done ? "#00d4aa0a" : "#ffffff08", border: match.done ? "1px solid #00d4aa2a" : "1px solid #ffffff10", borderRadius: 16, padding: "16px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: match.free ? "#f59e0b" : match.category ? getLevelColor(match.category) : "#555", fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>
                {match.free ? `⚡ PARTIDO LIBRE · ${match.matchType === "long" ? "LARGO 🎾" : "CORTO"}` : `CANCHA ${match.id + 1}${match.category ? ` · NIVEL ${getLevelLabel(match.category)}` : ""}`}
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  {match.team1.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Avatar name={p.name} pts={p.pts} size={32} photoURL={profiles.find(x=>x.id===p.id)?.photoURL} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "#999" }}>{p.pts}pts</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: "#00d4aa", marginTop: 4, fontWeight: 600 }}>Prom. {Math.round(match.team1.reduce((s, p) => s + p.pts, 0) / 2)}</div>
                </div>
                <div style={{ padding: "0 4px", alignSelf: "center" }}>
                  <div style={{ fontSize: 11, color: "#666", fontWeight: 800 }}>VS</div>
                </div>
                <div style={{ flex: 1 }}>
                  {match.team2.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, justifyContent: "flex-end" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "#999" }}>{p.pts}pts</div>
                      </div>
                      <Avatar name={p.name} pts={p.pts} size={32} photoURL={profiles.find(x=>x.id===p.id)?.photoURL} />
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: "#00d4aa", marginTop: 4, fontWeight: 600, textAlign: "right" }}>Prom. {Math.round(match.team2.reduce((s, p) => s + p.pts, 0) / 2)}</div>
                </div>
              </div>

              {match.done ? (
                <div style={{ textAlign: "center", padding: "10px", fontSize: 22, fontWeight: 800, color: "#00d4aa", letterSpacing: 5 }}>
                  {match.score1} — {match.score2} ✓
                </div>
              ) : !isSuperuser ? (
                <div style={{ textAlign: "center", fontSize: 12, color: "#444", padding: "8px 0" }}>⏳ Esperando resultado…</div>
              ) : (match.matchType || matchType) === "long" ? (
                <div style={{ padding: "0 4px" }}>
                  <div style={{ display: "flex", marginBottom: 8, paddingLeft: 52 }}>
                    <div style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#00d4aa", fontWeight: 700 }}>{match.team1.map(p => p.name.split(" ")[0]).join("/")}</div>
                    <div style={{ width: 16 }} />
                    <div style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#6ab4ff", fontWeight: 700 }}>{match.team2.map(p => p.name.split(" ")[0]).join("/")}</div>
                  </div>
                  {[0, 1, 2].map(si => (
                    <div key={si} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 46, fontSize: 11, color: "#aaa", fontWeight: 700, textAlign: "center", background: "#ffffff08", borderRadius: 6, padding: "8px 2px", flexShrink: 0 }}>Set {si + 1}</div>
                      <input type="number" min="0" max="7" value={match[`s${si}a`] ?? ""} onChange={e => handleSetChange(match.id, si, 0, e.target.value)} placeholder="—"
                        style={{ flex: 1, background: "#00d4aa18", border: "1px solid #00d4aa33", borderRadius: 8, padding: "10px 4px", color: "#fff", fontSize: 20, fontWeight: 900, textAlign: "center", outline: "none", minWidth: 0 }} />
                      <div style={{ fontSize: 14, color: "#666", fontWeight: 900, flexShrink: 0 }}>:</div>
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
                  <span style={{ color: "#666", fontWeight: 900, fontSize: 20, flexShrink: 0 }}>—</span>
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
                    <Avatar name={p.name} pts={p.pts} size={24} photoURL={profiles.find(x=>x.id===p.id)?.photoURL} />
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
                        <Avatar name={p.name} pts={p.pts} size={32} photoURL={profiles.find(x=>x.id===p.id)?.photoURL} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{p.pts}pts</div>
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
                          <Avatar name={p.name} pts={p.pts} size={26} photoURL={profiles.find(x=>x.id===p.id)?.photoURL} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#ddd" }}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>VS</div>
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#00d4aa", fontWeight: 700, marginBottom: 6 }}>GANADOR</div>
                      {(rot.vsTeam ?? []).map(p => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, justifyContent: "flex-end" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#ddd" }}>{p.name}</span>
                          <Avatar name={p.name} pts={p.pts} size={26} photoURL={profiles.find(x=>x.id===p.id)?.photoURL} />
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
                        <span style={{ color: "#666", fontWeight: 900, fontSize: 20, flexShrink: 0 }}>—</span>
                        <input type="number" min="0" value={rot.score2} onChange={e => handleRotationScore(rot.id, "2", e.target.value)} placeholder="0"
                          style={{ flex: 1, background: "#7c3aed22", border: "1px solid #7c3aed55", borderRadius: 8, padding: "12px 4px", color: "#fff", fontSize: 24, fontWeight: 900, textAlign: "center", outline: "none", minWidth: 0 }} />
                        <button onClick={() => handleConfirmRotation(rot.id)}
                          style={{ flexShrink: 0, background: "#7c3aed", border: "none", borderRadius: 8, padding: "12px 14px", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>✓ OK</button>
                      </div>
                      <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 6 }}>games ganados</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", fontSize: 12, color: "#444", padding: "8px 0" }}>⏳ Esperando resultado…</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {matches.every(m => m.done) && isSuperuser && (
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
                <Avatar name={p.name} pts={p.pts} size={idx === 1 ? 48 : 38} photoURL={profiles.find(x=>x.id===p.id)?.photoURL} />
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
        <div key={p.id} onClick={() => setViewingPlayer(p)}
          style={{ display: "flex", alignItems: "center", gap: 12, background: i === 0 ? "#00d4aa0e" : "#ffffff06", border: i === 0 ? "1px solid #00d4aa2a" : "1px solid #ffffff08", borderRadius: 12, padding: "10px 14px", marginBottom: 6, cursor: "pointer" }}>
          <div style={{ width: 24, textAlign: "center", fontSize: i < 3 ? 16 : 12, fontWeight: 700, color: i < 3 ? ["#ffd700", "#c0c0c0", "#cd7f32"][i] : "#333" }}>
            {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${p.rank}`}
          </div>
          <Avatar name={p.name} pts={p.pts} size={36} photoURL={profiles.find(x=>x.id===p.id)?.photoURL} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{p.name}</div>
            <div style={{ fontSize: 11, color: "#999" }}>{p.wins}V · {p.matches - p.wins}D · {p.matches ? Math.round(p.wins / p.matches * 100) : 0}%</div>
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

// ── PERFIL SCREEN ─────────────────────────────────────────────────────────────
// ── CropModal ────────────────────────────────────────────────────────────────
function CropModal({ imageSrc, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef    = useRef(new Image());
  const stateRef  = useRef({ dragging: false, lastX: 0, lastY: 0, ox: 0, oy: 0, scale: 1 });
  const SIZE = 280;

  useEffect(() => {
    const img = imgRef.current;
    img.onload = () => {
      const s = Math.max(SIZE / img.width, SIZE / img.height);
      stateRef.current.scale = s;
      stateRef.current.ox = (SIZE - img.width * s) / 2;
      stateRef.current.oy = (SIZE - img.height * s) / 2;
      draw();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ox, oy, scale } = stateRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE/2, SIZE/2, SIZE/2, 0, Math.PI*2);
    ctx.clip();
    ctx.drawImage(img, ox, oy, img.width * scale, img.height * scale);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.rect(0, 0, SIZE, SIZE);
    ctx.arc(SIZE/2, SIZE/2, SIZE/2, 0, Math.PI*2, true);
    ctx.fill();
    ctx.restore();
    // Update zoom display
    const pct = Math.round((scale / stateRef.current.initScale || 1) * 100);
    const el = document.getElementById('crop-zoom-pct');
    if (el) el.textContent = pct + '%';
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    }
    function onStart(e) {
      e.preventDefault();
      const p = pos(e);
      stateRef.current.dragging = true;
      stateRef.current.lastX = p.x;
      stateRef.current.lastY = p.y;
    }
    function onMove(e) {
      if (!stateRef.current.dragging) return;
      e.preventDefault();
      const p = pos(e);
      stateRef.current.ox += p.x - stateRef.current.lastX;
      stateRef.current.oy += p.y - stateRef.current.lastY;
      stateRef.current.lastX = p.x;
      stateRef.current.lastY = p.y;
      draw();
    }
    function onEnd(e) { stateRef.current.dragging = false; }

    canvas.addEventListener('mousedown',   onStart, { passive: false });
    canvas.addEventListener('mousemove',   onMove,  { passive: false });
    canvas.addEventListener('mouseup',     onEnd);
    canvas.addEventListener('mouseleave',  onEnd);
    canvas.addEventListener('touchstart',  onStart, { passive: false });
    canvas.addEventListener('touchmove',   onMove,  { passive: false });
    canvas.addEventListener('touchend',    onEnd);
    canvas.addEventListener('touchcancel', onEnd);
    return () => {
      canvas.removeEventListener('mousedown',   onStart);
      canvas.removeEventListener('mousemove',   onMove);
      canvas.removeEventListener('mouseup',     onEnd);
      canvas.removeEventListener('mouseleave',  onEnd);
      canvas.removeEventListener('touchstart',  onStart);
      canvas.removeEventListener('touchmove',   onMove);
      canvas.removeEventListener('touchend',    onEnd);
      canvas.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  function zoom(pctDelta) {
    const s = stateRef.current;
    const init = s.initScale || 1;
    const minS = init * 0.5;   // 50%
    const maxS = init * 2.0;   // 200%
    const step = init * (pctDelta / 100);
    const newScale = Math.min(maxS, Math.max(minS, s.scale + step));
    const cx = SIZE / 2, cy = SIZE / 2;
    s.ox = cx - (cx - s.ox) * (newScale / s.scale);
    s.oy = cy - (cy - s.oy) * (newScale / s.scale);
    s.scale = newScale;
    draw();
  }

  function resetZoom() {
    const s = stateRef.current;
    const init = s.initScale || 1;
    s.scale = init;
    s.ox = (SIZE - imgRef.current.width * init) / 2;
    s.oy = (SIZE - imgRef.current.height * init) / 2;
    draw();
  }

  // Store initScale once image loads
  useEffect(() => {
    const img = imgRef.current;
    const orig = img.onload;
    img.onload = () => {
      const s = Math.max(SIZE / img.width, SIZE / img.height);
      stateRef.current.initScale = s;
      if (orig) orig();
    };
  }, []);

  function handleCrop() {
    const { ox, oy, scale } = stateRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 300; canvas.height = 300;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    const f = 300 / SIZE;
    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 150, 150, 0, Math.PI*2);
    ctx.clip();
    ctx.drawImage(img, ox * f, oy * f, img.width * scale * f, img.height * scale * f);
    ctx.restore();
    onCrop(canvas.toDataURL('image/jpeg', 0.85));
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000ee', zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#13131f', borderRadius: 20, padding: 20, width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 4, textAlign: 'center' }}>Encuadrá tu foto</div>
        <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginBottom: 16 }}>Arrastrá la imagen para mover</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <canvas ref={canvasRef} width={SIZE} height={SIZE}
            style={{ borderRadius: '50%', cursor: 'grab', touchAction: 'none', userSelect: 'none', display: 'block' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onPointerDown={e => { e.preventDefault(); zoom(-2.5); }}
            style={{ width: 48, height: 48, borderRadius: 10, background: '#ffffff10', border: '1px solid #ffffff20', color: '#fff', fontSize: 24, fontWeight: 900, cursor: 'pointer', touchAction: 'none' }}>−</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div id="crop-zoom-pct" style={{ fontSize: 14, color: '#00d4aa', fontWeight: 700 }}>100%</div>
            <div style={{ fontSize: 10, color: '#555' }}>zoom</div>
          </div>
          <button onPointerDown={e => { e.preventDefault(); zoom(+2.5); }}
            style={{ width: 48, height: 48, borderRadius: 10, background: '#ffffff10', border: '1px solid #ffffff20', color: '#fff', fontSize: 24, fontWeight: 900, cursor: 'pointer', touchAction: 'none' }}>+</button>
          <button onPointerDown={e => { e.preventDefault(); resetZoom(); }}
            style={{ width: 48, height: 48, borderRadius: 10, background: '#6ab4ff15', border: '1px solid #6ab4ff33', color: '#6ab4ff', fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'none' }}>↺</button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, background: 'transparent', border: '1px solid #ffffff20', borderRadius: 12, padding: 12, color: '#aaa', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleCrop} style={{ flex: 2, background: 'linear-gradient(135deg,#00d4aa,#0066ff)', border: 'none', borderRadius: 12, padding: 12, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>✓ Usar esta foto</button>
        </div>
      </div>
    </div>
  );
}


export function ProfileScreen({ currentUser, players, attending, profile, onToggleAttend, onSaveProfile, onUploadPhoto }) {
  const player = players.find(p => p.id === currentUser.id);
  const isGoing = attending.has(currentUser.id);

  const [fullName,  setFullName]  = useState(profile?.fullName  ?? "");
  const [side,      setSide]      = useState(profile?.side      ?? "");
  const [hand,      setHand]      = useState(profile?.hand      ?? "");
  const [birthdate, setBirthdate] = useState(profile?.birthdate ?? "");
  const [photoURL,  setPhotoURL]  = useState(profile?.photoURL  ?? "");
  const [urlInput,  setUrlInput]  = useState("");
  const [showURL,   setShowURL]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [cropSrc,   setCropSrc]   = useState(null);

  if (!player) return null;

  const age = birthdate ? Math.floor((Date.now() - new Date(birthdate)) / 31557600000) : null;

  function handleSave() {
    onSaveProfile({ id: currentUser.id, fullName, side, hand, birthdate, photoURL });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const MAX_MB = 8;
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`La foto es demasiado grande. El máximo es ${MAX_MB}MB.`);
      e.target.value = "";
      return;
    }
    // Load into crop modal
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleCropDone(croppedBase64) {
    setCropSrc(null);
    setUploading(true);
    try {
      await onUploadPhoto(currentUser.id, croppedBase64);
      setPhotoURL(croppedBase64);
    } catch(err) { console.error(err); alert("Error al guardar la foto."); }
    setUploading(false);
  }

  function handleURLSave() {
    if (!urlInput.trim()) return;
    setPhotoURL(urlInput.trim());
    onSaveProfile({ id: currentUser.id, fullName, side, hand, birthdate, photoURL: urlInput.trim() });
    setUrlInput("");
    setShowURL(false);
  }

  const inputSt = { width: "100%", background: "#0d0d1a", border: "1px solid #ffffff20", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none" };
  const labelSt = { fontSize: 11, color: "#aaa", fontWeight: 700, letterSpacing: 1, marginBottom: 6 };
  const optionSt = (active, color) => ({
    flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer",
    fontSize: 13, fontWeight: 700,
    background: active ? `${color}22` : "#ffffff08",
    border: active ? `2px solid ${color}` : "2px solid transparent",
    color: active ? color : "#555",
  });

  return (
    <div style={{ padding: "0 16px 32px" }}>

      {/* Foto + nombre */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, marginBottom: 24 }}>
        <div style={{ position: "relative", marginBottom: 12 }}>
          {photoURL ? (
            <img src={photoURL} alt={player.name}
              style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: "3px solid #00d4aa" }} />
          ) : (
            <div style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(135deg,#00d4aa,#0066ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "#fff", border: "3px solid #00d4aa22" }}>
              {player.name[0]}
            </div>
          )}
          <label style={{ position: "absolute", bottom: 0, right: 0, background: "#0066ff", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14 }}>
            {uploading ? "⏳" : "📷"}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
          </label>
        {cropSrc && <CropModal imageSrc={cropSrc} onCrop={handleCropDone} onCancel={() => setCropSrc(null)} />}
        </div>

        <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{player.name}</div>
        {fullName ? <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{fullName}</div> : null}
        {age ? <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{age} años</div> : null}

        {/* URL alternativa */}
        <button onClick={() => setShowURL(v => !v)}
          style={{ marginTop: 8, background: "transparent", border: "1px solid #ffffff15", borderRadius: 8, padding: "5px 12px", color: "#666", fontSize: 11, cursor: "pointer" }}>
          {showURL ? "Cancelar" : "📎 Pegar URL de foto"}
        </button>
        {showURL && (
          <div style={{ display: "flex", gap: 8, marginTop: 8, width: "100%" }}>
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="https://..." style={{ ...inputSt, flex: 1, padding: "8px 12px", fontSize: 12 }} />
            <button onClick={handleURLSave}
              style={{ background: "#00d4aa", border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>OK</button>
          </div>
        )}
      </div>

      {/* Asistencia */}
      <div style={{ marginBottom: 20 }}>
        <div style={labelSt}>ASISTENCIA HOY</div>
        <button onClick={onToggleAttend}
          style={{ width: "100%", background: isGoing ? "#00d4aa22" : "#ffffff08", border: isGoing ? "2px solid #00d4aa" : "2px solid #ffffff15", borderRadius: 14, padding: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: isGoing ? "#00d4aa" : "#ffffff15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900 }}>
            {isGoing ? "✓" : ""}
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: isGoing ? "#00d4aa" : "#555" }}>
            {isGoing ? "Confirmado para hoy ✅" : "No confirmé asistencia"}
          </span>
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { label: "Puntos", value: player.pts, color: "#00d4aa" },
          { label: "Victorias", value: player.wins, color: "#6ab4ff" },
          { label: "Derrotas", value: player.matches - player.wins, color: "#ff6b6b" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: "#ffffff08", borderRadius: 12, padding: "12px 8px", textAlign: "center", border: "1px solid #ffffff10" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Nombre completo */}
      <div style={{ marginBottom: 16 }}>
        <div style={labelSt}>NOMBRE COMPLETO</div>
        <input value={fullName} onChange={e => setFullName(e.target.value)}
          placeholder="Ej: Diego Rodríguez" style={inputSt} />
      </div>

      {/* Fecha de nacimiento */}
      <div style={{ marginBottom: 16 }}>
        <div style={labelSt}>FECHA DE NACIMIENTO</div>
        <input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)}
          style={{ ...inputSt, colorScheme: "dark" }} />
      </div>

      {/* Drive o Revés */}
      <div style={{ marginBottom: 16 }}>
        <div style={labelSt}>LADO DE JUEGO</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["drive", "Drive", "#00d4aa"], ["reves", "Revés", "#6ab4ff"]].map(([val, label, color]) => (
            <div key={val} onClick={() => setSide(val)} style={optionSt(side === val, color)}>{label}</div>
          ))}
        </div>
      </div>

      {/* Mano hábil */}
      <div style={{ marginBottom: 24 }}>
        <div style={labelSt}>MANO HÁBIL</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["diestro", "Diestro 🤜", "#00d4aa"], ["zurdo", "Zurdo 🤛", "#a78bfa"]].map(([val, label, color]) => (
            <div key={val} onClick={() => setHand(val)} style={optionSt(hand === val, color)}>{label}</div>
          ))}
        </div>
      </div>

      {/* Guardar */}
      <button onClick={handleSave}
        style={{ width: "100%", background: saved ? "#00d4aa" : "linear-gradient(135deg,#00d4aa,#0066ff)", border: "none", borderRadius: 14, padding: "16px", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", transition: "background 0.3s" }}>
        {saved ? "✓ Guardado" : "Guardar perfil"}
      </button>
    </div>
  );
}
