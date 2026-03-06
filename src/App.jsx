import { useState, useMemo, useEffect, useCallback } from "react";
import {
  db, seedIfEmpty,
  savePlayer, removePlayer, saveUser,
  saveSession, savePairHistory, addMatchHistory,
} from "./firebase";
import {
  collection, doc, onSnapshot,
  query, orderBy, limit,
} from "firebase/firestore";

const LOGO = "/logo.jpg";

const LEVEL_COLORS = {
  5: { bg:"#ff6b35", label:"5", range:[380,999] },
  4: { bg:"#f7c59f", label:"4", range:[280,379] },
  3: { bg:"#5bc0eb", label:"3", range:[200,279] },
  2: { bg:"#9bc53d", label:"2", range:[120,199] },
  1: { bg:"#aaaaaa", label:"1", range:[0,119] },
};
function getLevel(pts) {
  for (const [lvl,{range}] of Object.entries(LEVEL_COLORS).reverse())
    if (pts>=range[0]&&pts<=range[1]) return Number(lvl);
  return 1;
}
function getLevelColor(lvl) { return LEVEL_COLORS[lvl]?.bg??"#aaa"; }
function getLevelLabel(lvl) { return LEVEL_COLORS[lvl]?.label??lvl; }
function pairKey(a,b) { return [a,b].sort((x,y)=>x-y).join("-"); }

function generateMatches(players, courts, mode, pairHistory) {
  const available = [...players].sort((a,b)=>b.pts-a.pts);
  const totalForCourts = courts*4;
  const waitingPair = available.length>totalForCourts
    ? available.slice(totalForCourts, totalForCourts+2)
    : available.length%4===2 ? available.slice(-2) : [];

  function bestPairing(group) {
    const [a,b,c,d] = group;
    return [
      {t1:[a,b],t2:[c,d]},{t1:[a,c],t2:[b,d]},{t1:[a,d],t2:[b,c]},
    ].sort((x,y)=>{
      const penX=(pairHistory[pairKey(x.t1[0].id,x.t1[1].id)]??0)+(pairHistory[pairKey(x.t2[0].id,x.t2[1].id)]??0);
      const penY=(pairHistory[pairKey(y.t1[0].id,y.t1[1].id)]??0)+(pairHistory[pairKey(y.t2[0].id,y.t2[1].id)]??0);
      const balX=Math.abs((x.t1[0].pts+x.t1[1].pts)-(x.t2[0].pts+x.t2[1].pts));
      const balY=Math.abs((y.t1[0].pts+y.t1[1].pts)-(y.t2[0].pts+y.t2[1].pts));
      return (penX+balX/20)-(penY+balY/20);
    })[0];
  }

  const pool = available.length%4===2 ? available.slice(0,-2) : available.slice(0,totalForCourts);
  const matches = [];

  if (mode==="nivelado") {
    const sorted=[...pool];
    for (let i=0;i<courts&&sorted.length>=4;i++) {
      const group=sorted.splice(0,4);
      const {t1,t2}=bestPairing(group);
      matches.push({id:i,team1:t1,team2:t2,score1:"",score2:"",sets:[["",""],["",""],["",""]],done:false});
    }
  } else {
    const sorted=[...pool];
    let ci=0;
    for (let i=0;i+3<sorted.length&&ci<courts;i+=4) {
      const group=sorted.slice(i,i+4);
      const {t1,t2}=bestPairing(group);
      matches.push({id:ci,team1:t1,team2:t2,score1:"",score2:"",sets:[["",""],["",""],["",""]],done:false,category:getLevel(group[1].pts)});
      ci++;
    }
  }
  return {matches,waitingPair};
}

const inputStyle = {
  width:"100%",background:"#ffffff10",border:"1px solid #ffffff20",
  borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:15,
  outline:"none",boxSizing:"border-box",
};

// ── All components outside App to respect Rules of Hooks ─────────────────────
function Avatar({name,pts,size=36}) {
  const color=getLevelColor(getLevel(pts));
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:size*0.38,color:"#fff",boxShadow:`0 0 0 2px #1a1a2e,0 0 0 3px ${color}55`,flexShrink:0}}>
      {name[0]}
    </div>
  );
}
function LevelBadge({pts}) {
  const lvl=getLevel(pts);
  return <span style={{background:getLevelColor(lvl),color:"#fff",borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:800,letterSpacing:1}}>{getLevelLabel(lvl)}</span>;
}
function SectionLabel({children,style={}}) {
  return <div style={{fontSize:11,color:"#888",fontWeight:700,letterSpacing:2,marginBottom:14,...style}}>{children}</div>;
}
function RoleBadge({role}) {
  return <span style={{background:role==="admin"?"#0066ff33":"#ffffff10",border:`1px solid ${role==="admin"?"#0066ff":"#ffffff20"}`,color:role==="admin"?"#6ab4ff":"#666",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,letterSpacing:1}}>{role==="admin"?"⚡ ADMIN":"👁 VIEWER"}</span>;
}
function ReadOnlyBanner({isAdmin}) {
  if (isAdmin) return null;
  return (
    <div style={{background:"#0066ff15",border:"1px solid #0066ff33",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:16}}>👁</span>
      <span style={{fontSize:12,color:"#6ab4ff"}}>Modo visualización — solo los admins pueden hacer cambios</span>
    </div>
  );
}
function LoginScreen({users,onLogin}) {
  const [selected,setSelected]=useState(null);
  const [pin,setPin]=useState("");
  const [error,setError]=useState("");
  const [showPin,setShowPin]=useState(false);
  function handleLogin() {
    if (!selected){setError("Seleccioná tu nombre");return;}
    const user=users.find(u=>u.id===selected);
    if (!user){setError("Usuario no encontrado");return;}
    if (user.pin!==pin){setError("PIN incorrecto");setPin("");return;}
    onLogin(user);
  }
  return (
    <div style={{minHeight:"100vh",background:"#0d0d1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 24px"}}>
      <img src={LOGO} alt="ARPadel" style={{height:44,objectFit:"contain",marginBottom:32}} />
      <div style={{width:"100%",maxWidth:380,background:"#181828",borderRadius:20,padding:"28px 24px",border:"1px solid #ffffff10"}}>
        <div style={{fontSize:16,fontWeight:800,color:"#fff",marginBottom:4}}>Bienvenido</div>
        <div style={{fontSize:12,color:"#555",marginBottom:24}}>Seleccioná tu nombre e ingresá tu PIN</div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:"#888",fontWeight:700,letterSpacing:1,marginBottom:8}}>¿QUIÉN SOS?</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {[...users].sort((a,b)=>a.name.localeCompare(b.name)).map(u=>(
              <div key={u.id} onClick={()=>{setSelected(u.id);setPin("");setError("");}}
                style={{padding:"7px 14px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:600,background:selected===u.id?"#00d4aa":"#ffffff0d",color:selected===u.id?"#fff":"#888",border:selected===u.id?"2px solid #00d4aa":"2px solid transparent"}}>
                {u.name}
              </div>
            ))}
          </div>
        </div>
        {selected&&(
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,color:"#888",fontWeight:700,letterSpacing:1,marginBottom:8}}>PIN</div>
            <div style={{position:"relative"}}>
              <input type={showPin?"text":"password"} inputMode="numeric" maxLength={6} value={pin}
                onChange={e=>{setPin(e.target.value);setError("");}}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                placeholder="••••" autoFocus
                style={{...inputStyle,letterSpacing:6,fontSize:20,paddingRight:44}} />
              <button onClick={()=>setShowPin(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:"#666",cursor:"pointer",fontSize:16}}>
                {showPin?"🙈":"👁"}
              </button>
            </div>
            {error&&<div style={{fontSize:12,color:"#ff6b6b",marginTop:6}}>{error}</div>}
          </div>
        )}
        <button onClick={handleLogin} disabled={!selected}
          style={{width:"100%",background:selected?"linear-gradient(135deg,#00d4aa,#0066ff)":"#333",border:"none",borderRadius:12,padding:"14px",color:selected?"#fff":"#666",fontWeight:800,fontSize:15,cursor:selected?"pointer":"not-allowed"}}>
          Entrar
        </button>
        <div style={{fontSize:11,color:"#333",textAlign:"center",marginTop:16}}>¿No tenés PIN? Pedíselo al admin del grupo.</div>
      </div>
    </div>
  );
}
function PlayerModal({player,onSave,onDelete,onClose}) {
  const isNew=!player.id;
  const [form,setForm]=useState({name:player.name??"",pts:player.pts??150,wins:player.wins??0,matches:player.matches??0});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={onClose}>
      <div style={{background:"#181828",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:420,border:"1px solid #ffffff15"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:"#ffffff20",borderRadius:2,margin:"0 auto 20px"}} />
        <div style={{fontSize:16,fontWeight:900,color:"#fff",marginBottom:20}}>{isNew?"➕ Agregar jugador":`✏️ Editar — ${player.name}`}</div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:"#888",fontWeight:700,letterSpacing:1,marginBottom:6}}>NOMBRE</div>
          <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Nombre" autoFocus style={inputStyle} />
        </div>
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:11,color:"#888",fontWeight:700,letterSpacing:1}}>PUNTOS</div>
            <LevelBadge pts={Number(form.pts)} />
          </div>
          <input type="number" value={form.pts} onChange={e=>set("pts",e.target.value)} style={inputStyle} />
          <div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
            {[5,4,3,2,1].map(lvl=>{
              const {bg,label,range}=LEVEL_COLORS[lvl];
              const active=getLevel(Number(form.pts))===lvl;
              return (
                <div key={lvl} onClick={()=>set("pts",range[0]+20)}
                  style={{display:"flex",alignItems:"center",gap:4,background:"#ffffff0d",borderRadius:6,padding:"4px 8px",cursor:"pointer",border:active?`1px solid ${bg}`:"1px solid transparent"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:bg}} />
                  <span style={{fontSize:10,color:active?"#fff":"#555"}}>{label} ≥{range[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:24}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:"#888",fontWeight:700,letterSpacing:1,marginBottom:6}}>VICTORIAS</div>
            <input type="number" value={form.wins} onChange={e=>set("wins",e.target.value)} style={inputStyle} />
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:"#888",fontWeight:700,letterSpacing:1,marginBottom:6}}>PARTIDOS</div>
            <input type="number" value={form.matches} onChange={e=>set("matches",e.target.value)} style={inputStyle} />
          </div>
        </div>
        <button onClick={()=>{if(!form.name.trim())return;onSave({...player,...form,pts:Number(form.pts),wins:Number(form.wins),matches:Number(form.matches)});}}
          style={{width:"100%",background:"linear-gradient(135deg,#00d4aa,#0066ff)",border:"none",borderRadius:12,padding:"14px",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",marginBottom:10}}>
          {isNew?"Agregar al grupo":"Guardar cambios"}
        </button>
        {!isNew&&<button onClick={()=>onDelete(player.id)} style={{width:"100%",background:"#ff4d4d15",border:"1px solid #ff4d4d44",borderRadius:12,padding:"12px",color:"#ff6b6b",fontWeight:700,fontSize:14,cursor:"pointer"}}>🗑 Eliminar jugador</button>}
      </div>
    </div>
  );
}
function UsersMgmtModal({users,onClose,onSave}) {
  const [editingUser,setEditingUser]=useState(null);
  const [form,setForm]=useState({});
  function startEdit(u){setEditingUser(u.id);setForm({name:u.name,pin:u.pin,role:u.role});}
  function saveU(){const u=users.find(x=>x.id===editingUser);onSave({...u,...form});setEditingUser(null);}
  return (
    <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={onClose}>
      <div style={{background:"#181828",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:420,border:"1px solid #ffffff15",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:"#ffffff20",borderRadius:2,margin:"0 auto 20px"}} />
        <div style={{fontSize:16,fontWeight:900,color:"#fff",marginBottom:4}}>⚙️ Gestión de usuarios</div>
        <div style={{fontSize:12,color:"#555",marginBottom:20}}>Cambiá roles y PINs.</div>
        {users.map(u=>(
          <div key={u.id} style={{background:"#ffffff07",borderRadius:12,padding:"12px 14px",marginBottom:8,border:"1px solid #ffffff0d"}}>
            {editingUser===u.id?(
              <div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nombre" style={{...inputStyle,flex:2,padding:"8px 10px",fontSize:13}} />
                  <input value={form.pin} onChange={e=>setForm(f=>({...f,pin:e.target.value}))} placeholder="PIN" maxLength={6} style={{...inputStyle,flex:1,padding:"8px 10px",fontSize:13}} />
                </div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  {["admin","user"].map(r=>(
                    <div key={r} onClick={()=>setForm(f=>({...f,role:r}))}
                      style={{flex:1,padding:"8px",borderRadius:8,border:form.role===r?"2px solid #0066ff":"2px solid #ffffff15",background:form.role===r?"#0066ff22":"transparent",textAlign:"center",cursor:"pointer",fontSize:12,color:form.role===r?"#6ab4ff":"#555",fontWeight:700}}>
                      {r==="admin"?"⚡ Admin":"👁 Viewer"}
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={saveU} style={{flex:1,background:"#00d4aa",border:"none",borderRadius:8,padding:"10px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Guardar</button>
                  <button onClick={()=>setEditingUser(null)} style={{flex:1,background:"transparent",border:"1px solid #ffffff15",borderRadius:8,padding:"10px",color:"#666",fontSize:13,cursor:"pointer"}}>Cancelar</button>
                </div>
              </div>
            ):(
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Avatar name={u.name} pts={200} size={32} />
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{u.name}</div>
                  <div style={{fontSize:10,color:"#444"}}>PIN: {"•".repeat(u.pin.length)}</div>
                </div>
                <RoleBadge role={u.role} />
                <button onClick={()=>startEdit(u)} style={{background:"transparent",border:"1px solid #ffffff15",borderRadius:8,padding:"6px 10px",color:"#666",fontSize:11,cursor:"pointer"}}>✏️</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function QuickMatchModal({players,onSave,onClose}) {
  const [team1Ids,setTeam1Ids]=useState([]);
  const [team2Ids,setTeam2Ids]=useState([]);
  const [score1,setScore1]=useState("");
  const [score2,setScore2]=useState("");
  const [step,setStep]=useState(1);
  const sorted=[...players].sort((a,b)=>b.pts-a.pts);
  const team1=players.filter(p=>team1Ids.includes(p.id));
  const team2=players.filter(p=>team2Ids.includes(p.id));
  function togglePlayer(id){
    if(team1Ids.includes(id)){setTeam1Ids(t=>t.filter(x=>x!==id));return;}
    if(team2Ids.includes(id)){setTeam2Ids(t=>t.filter(x=>x!==id));return;}
    if(team1Ids.length<2){setTeam1Ids(t=>[...t,id]);return;}
    if(team2Ids.length<2){setTeam2Ids(t=>[...t,id]);return;}
  }
  return (
    <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:"#181828",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:420,border:"1px solid #ffffff15",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:"#ffffff20",borderRadius:2,margin:"0 auto 16px"}} />
        <div style={{fontSize:16,fontWeight:900,color:"#fff",marginBottom:4}}>⚡ Partido rápido</div>
        <div style={{fontSize:12,color:"#555",marginBottom:16}}>Registrá un partido sin generar sorteo</div>
        {step===1&&(
          <>
            <div style={{display:"flex",gap:12,marginBottom:16}}>
              <div style={{flex:1,background:"#00d4aa15",border:"1px solid #00d4aa33",borderRadius:10,padding:"10px",minHeight:60}}>
                <div style={{fontSize:10,color:"#00d4aa",fontWeight:700,marginBottom:6}}>EQUIPO 1</div>
                {team1.map(p=><div key={p.id} style={{fontSize:12,color:"#fff",fontWeight:600}}>{p.name}</div>)}
                {team1.length<2&&<div style={{fontSize:11,color:"#333"}}>Seleccioná {2-team1.length} más</div>}
              </div>
              <div style={{flex:1,background:"#0066ff15",border:"1px solid #0066ff33",borderRadius:10,padding:"10px",minHeight:60}}>
                <div style={{fontSize:10,color:"#6ab4ff",fontWeight:700,marginBottom:6}}>EQUIPO 2</div>
                {team2.map(p=><div key={p.id} style={{fontSize:12,color:"#fff",fontWeight:600}}>{p.name}</div>)}
                {team2.length<2&&<div style={{fontSize:11,color:"#333"}}>Seleccioná {2-team2.length} más</div>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
              {sorted.map(p=>{
                const inT1=team1Ids.includes(p.id);
                const inT2=team2Ids.includes(p.id);
                return (
                  <div key={p.id} onClick={()=>togglePlayer(p.id)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,cursor:"pointer",background:inT1?"#00d4aa22":inT2?"#0066ff22":"#ffffff08",border:inT1?"1px solid #00d4aa44":inT2?"1px solid #0066ff44":"1px solid #ffffff10"}}>
                    <Avatar name={p.name} pts={p.pts} size={28} />
                    <span style={{fontSize:13,fontWeight:600,color:(inT1||inT2)?"#fff":"#666",flex:1}}>{p.name}</span>
                    <LevelBadge pts={p.pts} />
                    {inT1&&<span style={{fontSize:10,color:"#00d4aa",fontWeight:700}}>E1</span>}
                    {inT2&&<span style={{fontSize:10,color:"#6ab4ff",fontWeight:700}}>E2</span>}
                  </div>
                );
              })}
            </div>
            <button onClick={()=>setStep(2)} disabled={team1.length!==2||team2.length!==2}
              style={{width:"100%",background:team1.length===2&&team2.length===2?"#00d4aa":"#333",border:"none",borderRadius:12,padding:"14px",color:team1.length===2&&team2.length===2?"#fff":"#666",fontWeight:800,fontSize:14,cursor:team1.length===2&&team2.length===2?"pointer":"not-allowed"}}>
              Siguiente →
            </button>
          </>
        )}
        {step===2&&(
          <>
            <div style={{marginBottom:16,background:"#ffffff08",borderRadius:12,padding:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#fff",fontWeight:700}}>
                <span>{team1.map(p=>p.name).join(" & ")}</span>
                <span style={{color:"#444"}}>vs</span>
                <span>{team2.map(p=>p.name).join(" & ")}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:20}}>
              <input type="number" min="0" max="9" value={score1} onChange={e=>setScore1(e.target.value)} placeholder="0"
                style={{flex:1,background:"#00d4aa22",border:"1px solid #00d4aa44",borderRadius:8,padding:"16px",color:"#fff",fontSize:28,fontWeight:800,textAlign:"center",outline:"none"}} />
              <span style={{color:"#333",fontWeight:800,fontSize:22}}>—</span>
              <input type="number" min="0" max="9" value={score2} onChange={e=>setScore2(e.target.value)} placeholder="0"
                style={{flex:1,background:"#0066ff22",border:"1px solid #0066ff44",borderRadius:8,padding:"16px",color:"#fff",fontSize:28,fontWeight:800,textAlign:"center",outline:"none"}} />
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setStep(1)} style={{flex:1,background:"transparent",border:"1px solid #ffffff15",borderRadius:12,padding:"14px",color:"#666",fontWeight:700,fontSize:14,cursor:"pointer"}}>← Atrás</button>
              <button onClick={()=>onSave({team1,team2,score1,score2})} disabled={!score1||!score2}
                style={{flex:2,background:score1&&score2?"#00d4aa":"#333",border:"none",borderRadius:12,padding:"14px",color:score1&&score2?"#fff":"#666",fontWeight:800,fontSize:14,cursor:score1&&score2?"pointer":"not-allowed"}}>
                Guardar ✓
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const TABS=[
  {id:"inicio",   icon:"⚡",label:"Inicio"},
  {id:"jugadores",icon:"👥",label:"Jugadores"},
  {id:"partido",  icon:"🎾",label:"Partido"},
  {id:"ranking",  icon:"🏆",label:"Ranking"},
];

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [players,      setPlayers]      = useState([]);
  const [users,        setUsers]        = useState([]);
  const [pairHistory,  setPairHistory]  = useState({});
  const [session,      setSession]      = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [currentUser,  setCurrentUser]  = useState(null);
  const [tab,          setTab]          = useState("inicio");
  const [notification, setNotification] = useState(null);
  const [editingPlayer,setEditingPlayer]= useState(null);
  const [playersSubTab,setPlayersSubTab]= useState("lista");
  const [pairSearch,   setPairSearch]   = useState("");
  const [showUsersMgmt,setShowUsersMgmt]= useState(false);
  const [showQuickMatch,setShowQuickMatch]=useState(false);

  const attending    = useMemo(()=>new Set(session?.attending??[]),[session]);
  const courts       = session?.courts??3;
  const mode         = session?.mode??"nivelado";
  const matchType    = session?.matchType??"short";
  const matches      = session?.matches??[];
  const waitingPair  = session?.waitingPair??[];
  const rotations    = session?.rotations??[];
  const rotationStep = session?.rotationStep??0;

  // ALL hooks before any conditional return
  const ranking = useMemo(()=>
    [...players].sort((a,b)=>b.pts-a.pts).map((p,i)=>({...p,rank:i+1})),
    [players]
  );
  const attendingPlayers = useMemo(()=>
    players.filter(p=>attending.has(p.id)).sort((a,b)=>b.pts-a.pts),
    [players,attending]
  );
  const suggestedCourts = Math.floor(attendingPlayers.length/4);
  const remainder       = attendingPlayers.length%4;
  const enrichedPairs   = useMemo(()=>
    Object.entries(pairHistory)
      .map(([key,times])=>{
        const [idA,idB]=key.split("-").map(Number);
        const pA=players.find(p=>p.id===idA), pB=players.find(p=>p.id===idB);
        if(!pA||!pB) return null;
        return {key,pA,pB,times};
      })
      .filter(Boolean)
      .sort((a,b)=>b.times-a.times),
    [pairHistory,players]
  );
  const playerOfDay = useMemo(()=>{
    if(!matchHistory.length) return [];
    const today=new Date().toLocaleDateString("es-AR");
    const scores={};
    matchHistory.filter(m=>m.date===today).forEach(m=>{
      [...m.team1.split(" & "),...m.team2.split(" & ")].forEach(n=>{if(!scores[n])scores[n]=0;});
      const [g1,g2]=(m.score??"").split("-").map(Number);
      if(!isNaN(g1)&&!isNaN(g2)){m.team1.split(" & ").forEach(n=>scores[n]+=g1);m.team2.split(" & ").forEach(n=>scores[n]+=g2);}
    });
    if(!Object.keys(scores).length) return [];
    const max=Math.max(...Object.values(scores));
    return Object.entries(scores).filter(([,v])=>v===max).map(([n])=>n);
  },[matchHistory]);

  useEffect(()=>{
    let n=0;
    const needed=4;
    const check=()=>{n++;if(n>=needed)setLoading(false);};
    const onErr=(l)=>(e)=>{console.error(l,e);check();};
    const unsubP=onSnapshot(collection(db,"players"),s=>{setPlayers(s.docs.map(d=>d.data()));check();},onErr("players"));
    const unsubU=onSnapshot(collection(db,"users"),s=>{setUsers(s.docs.map(d=>d.data()));check();},onErr("users"));
    const unsubS=onSnapshot(doc(db,"config","session"),s=>{if(s.exists())setSession(s.data());check();},onErr("session"));
    const unsubPH=onSnapshot(doc(db,"config","pairHistory"),s=>{if(s.exists())setPairHistory(s.data());check();},onErr("pairHistory"));
    const unsubH=onSnapshot(query(collection(db,"matchHistory"),orderBy("timestamp","desc"),limit(50)),
      s=>setMatchHistory(s.docs.map(d=>({...d.data(),date:d.data().date??""}))),e=>console.error("mh",e));
    const t=setTimeout(()=>{if(n<needed)setLoading(false);},8000);
    seedIfEmpty().catch(console.error);
    return ()=>{unsubP();unsubU();unsubS();unsubPH();unsubH();clearTimeout(t);};
  },[]);

  const writeSession=useCallback((updates)=>{saveSession(updates).catch(console.error);},[]);
  const isAdmin=currentUser?.role==="admin";

  // Guards AFTER all hooks
  if(loading) return (
    <div style={{minHeight:"100vh",background:"#0d0d1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <img src={LOGO} alt="ARPadel" style={{height:40,objectFit:"contain"}} />
      <div style={{color:"#333",fontSize:13}}>Conectando…</div>
    </div>
  );
  if(!currentUser) return <LoginScreen users={users} onLogin={u=>setCurrentUser(u)} />;

  function notify(msg,color="#00d4aa"){setNotification({msg,color});setTimeout(()=>setNotification(null),2800);}
  function toggleAttend(id){
    if(!isAdmin)return;
    const next=new Set(attending);next.has(id)?next.delete(id):next.add(id);
    const arr=[...next];writeSession({attending:arr,courts:Math.max(1,Math.floor(arr.length/4))});
  }
  function setAllAttend(all){
    if(!isAdmin)return;
    const arr=all?players.map(p=>p.id):[];
    writeSession({attending:arr,courts:Math.max(1,Math.floor(arr.length/4))});
  }
  function handleSavePlayer(updated){
    if(!isAdmin)return;
    if(!updated.id){const newId=players.length?Math.max(...players.map(p=>p.id))+1:1;const p={...updated,id:newId};savePlayer(p).catch(console.error);notify(`${p.name} agregado 👋`);}
    else{savePlayer(updated).catch(console.error);notify(`${updated.name} actualizado ✓`);}
    setEditingPlayer(null);
  }
  function handleDeletePlayer(id){
    if(!isAdmin)return;
    const p=players.find(x=>x.id===id);removePlayer(id).catch(console.error);
    const next=new Set(attending);next.delete(id);writeSession({attending:[...next]});
    setEditingPlayer(null);notify(`${p?.name} eliminado`,"#ff6b6b");
  }
  function handleGenerate(){
    if(!isAdmin)return;
    if(attendingPlayers.length<4){notify("Necesitás al menos 4 jugadores","#ff6b6b");return;}
    const {matches:m,waitingPair:wp}=generateMatches(attendingPlayers,courts,mode,pairHistory);
    if(!m.length){notify("No hay suficientes jugadores","#ff6b6b");return;}
    const rots=wp.length===2?m.map((_,i)=>({id:i,courtId:i,challenger:wp,vsTeam:null,score1:"",score2:"",wins1:0,wins2:0,done:false})):[];
    writeSession({matches:m,waitingPair:wp,rotations:rots,rotationStep:0});
    setTab("partido");notify(`¡${m.length} partido${m.length>1?"s":""} generado${m.length>1?"s":""}!`);
  }
  function handleScoreChange(matchId,team,val){
    if(!isAdmin)return;
    writeSession({matches:matches.map(m=>m.id===matchId?{...m,[`score${team}`]:val}:m)});
  }
  function handleSetChange(matchId,si,team,value){
    if(!isAdmin)return;
    writeSession({matches:matches.map(m=>{
      if(m.id!==matchId)return m;
      const sets=[...(m.sets??[[null,null],[null,null],[null,null]])];
      const s=[...sets[si]];s[team]=value;sets[si]=s;return {...m,sets};
    })});
  }
  function handleConfirmMatch(matchId){
    if(!isAdmin)return;
    const match=matches.find(m=>m.id===matchId);if(!match)return;
    let s1,s2,winners;
    if(matchType==="long"){
      let t1s=0,t2s=0;s1=0;s2=0;
      for(const set of (match.sets??[])){const a=parseInt(set?.[0]),b=parseInt(set?.[1]);if(isNaN(a)||isNaN(b))continue;if(a>b)t1s++;if(b>a)t2s++;s1+=a;s2+=b;}
      if(t1s===t2s){notify("Falta completar el tercer set","#ff6b6b");return;}
      winners=t1s>t2s?match.team1:match.team2;
    } else {
      s1=parseInt(match.score1);s2=parseInt(match.score2);
      if(isNaN(s1)||isNaN(s2)){notify("Ingresá los games","#ff6b6b");return;}
      if(s1===s2){notify("No puede terminar empatado","#ff6b6b");return;}
      winners=s1>s2?match.team1:match.team2;
    }
    const newPH={...pairHistory};
    const k1=pairKey(match.team1[0].id,match.team1[1].id);const k2=pairKey(match.team2[0].id,match.team2[1].id);
    newPH[k1]=(newPH[k1]??0)+1;newPH[k2]=(newPH[k2]??0)+1;savePairHistory(newPH).catch(console.error);
    for(const p of [...match.team1,...match.team2]){const isWin=winners.some(x=>x.id===p.id);savePlayer({...p,pts:p.pts+(isWin?Math.max(s1,s2)*5:Math.min(s1,s2)*2),wins:isWin?p.wins+1:p.wins,matches:p.matches+1}).catch(console.error);}
    const newMatches=matches.map(m=>m.id===matchId?{...m,done:true}:m);
    writeSession({matches:newMatches,rotations:rotations.map(r=>r.courtId===matchId&&winners?{...r,vsTeam:winners}:r)});
    addMatchHistory({date:new Date().toLocaleDateString("es-AR"),team1:match.team1.map(x=>x.name).join(" & "),team2:match.team2.map(x=>x.name).join(" & "),score:`${s1} - ${s2}`,winner:winners.map(x=>x.name).join(" & ")}).catch(console.error);
    notify("¡Resultado guardado! 🎾");
  }
  function handleQuickMatchSave({team1,team2,score1,score2}){
    if(!isAdmin)return;
    const s1=parseInt(score1),s2=parseInt(score2);
    if(isNaN(s1)||isNaN(s2)){notify("Resultado inválido","#ff6b6b");return;}
    const winners=s1>s2?team1:team2;
    for(const p of [...team1,...team2]){const isWin=winners.some(x=>x.id===p.id);savePlayer({...p,pts:p.pts+(isWin?Math.max(s1,s2)*4:Math.min(s1,s2)*2),wins:isWin?p.wins+1:p.wins,matches:p.matches+1}).catch(console.error);}
    addMatchHistory({date:new Date().toLocaleDateString("es-AR"),team1:team1.map(x=>x.name).join(" & "),team2:team2.map(x=>x.name).join(" & "),score:`${s1} - ${s2}`,winner:winners.map(x=>x.name).join(" & ")}).catch(console.error);
    notify("Partido rápido guardado ⚡");setShowQuickMatch(false);
  }
  function handleRotationScore(rotId,team,val){if(!isAdmin)return;writeSession({rotations:rotations.map(r=>r.id===rotId?{...r,[`score${team}`]:val}:r)});}
  function handleConfirmRotation(rotId){
    if(!isAdmin)return;
    const rot=rotations.find(r=>r.id===rotId);if(!rot)return;
    const s1=parseInt(rot.score1),s2=parseInt(rot.score2);if(isNaN(s1)||isNaN(s2)){notify("Ingresá el resultado","#ff6b6b");return;}
    for(const p of [...rot.challenger,...(rot.vsTeam??[])]){const isChall=rot.challenger.some(x=>x.id===p.id);const isWin=s1>s2?isChall:!isChall;savePlayer({...p,pts:p.pts+(isWin?Math.max(s1,s2)*4:Math.min(s1,s2)*2),wins:isWin?p.wins+1:p.wins,matches:p.matches+1}).catch(console.error);}
    writeSession({rotations:rotations.map(r=>r.id===rotId?{...r,done:true,wins1:s1,wins2:s2}:r),rotationStep:rotationStep+1});
    notify(`Rotación ${rotId+1} guardada ✓`);
  }

  const screens = {
    inicio:(
      <div style={{padding:"0 16px 16px"}}>
        <div style={{background:"linear-gradient(135deg,#00d4aa22,#0066ff22)",border:"1px solid #00d4aa33",borderRadius:16,padding:"20px",marginBottom:20,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-20,right:-20,fontSize:80,opacity:0.06}}>🎾</div>
          <div style={{fontSize:11,color:"#00d4aa",fontWeight:700,letterSpacing:2,marginBottom:4}}>TU GRUPO</div>
          <div style={{fontSize:28,fontWeight:900,color:"#fff",lineHeight:1}}>ARPadel</div>
          <div style={{fontSize:13,color:"#aaa",marginTop:6}}>{players.length} jugadores · {matchHistory.length} partidos jugados</div>
          {playerOfDay.length>0&&(
            <div style={{marginTop:12,background:"#ffd70022",border:"1px solid #ffd70055",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:"#ffd700",fontWeight:700,letterSpacing:2}}>🏆 JUGADOR DEL DÍA</div>
              <div style={{fontSize:14,fontWeight:700,color:"#fff",marginTop:4}}>{playerOfDay.join(" · ")}</div>
            </div>
          )}
        </div>
        {[{label:"Jugadores en el grupo",value:players.length,icon:"👥",action:()=>setTab("jugadores")},{label:"Van hoy",value:attendingPlayers.length,icon:"✅",action:()=>setTab("partido")},{label:"Partidos jugados",value:matchHistory.length,icon:"🏸",action:null}].map(s=>(
          <div key={s.label} onClick={s.action??undefined} style={{display:"flex",alignItems:"center",gap:14,background:"#ffffff08",borderRadius:12,padding:"14px 16px",marginBottom:10,border:"1px solid #ffffff10",cursor:s.action?"pointer":"default"}}>
            <span style={{fontSize:22}}>{s.icon}</span>
            <div style={{flex:1}}><div style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:1}}>{s.label.toUpperCase()}</div><div style={{fontSize:20,fontWeight:800,color:"#fff"}}>{s.value}</div></div>
            {s.action&&<span style={{color:"#333",fontSize:18}}>›</span>}
          </div>
        ))}
        {matchHistory.length>0&&(<>
          <SectionLabel>ÚLTIMOS RESULTADOS</SectionLabel>
          {matchHistory.slice(0,3).map((h,i)=>(
            <div key={i} style={{background:"#ffffff08",borderRadius:10,padding:"12px 14px",marginBottom:8,border:"1px solid #ffffff10"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:12,color:"#ccc",flex:1}}>{h.team1}</div>
                <div style={{fontSize:14,fontWeight:800,color:"#00d4aa",padding:"0 8px"}}>{h.score}</div>
                <div style={{fontSize:12,color:"#ccc",flex:1,textAlign:"right"}}>{h.team2}</div>
              </div>
              <div style={{fontSize:10,color:"#555",marginTop:4}}>Ganó: <span style={{color:"#00d4aa"}}>{h.winner}</span> · {h.date}</div>
            </div>
          ))}
        </>)}
        <button onClick={()=>setTab("partido")} style={{width:"100%",marginTop:8,background:"linear-gradient(135deg,#00d4aa,#0066ff)",border:"none",borderRadius:14,padding:"16px",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"}}>
          {isAdmin?"🎾 Armar partido →":"📋 Consultar partidos →"}
        </button>
      </div>
    ),

    jugadores:(
      <div style={{padding:"0 16px 16px"}}>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {[{id:"lista",label:"👥 Jugadores"},{id:"parejas",label:"🤝 Historial parejas"}].map(t=>(
            <button key={t.id} onClick={()=>setPlayersSubTab(t.id)} style={{flex:1,padding:"10px",background:playersSubTab===t.id?"#ffffff15":"transparent",border:playersSubTab===t.id?"1px solid #ffffff30":"1px solid #ffffff10",borderRadius:10,color:playersSubTab===t.id?"#fff":"#555",fontWeight:700,fontSize:12,cursor:"pointer"}}>{t.label}</button>
          ))}
        </div>
        {playersSubTab==="lista"?(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <SectionLabel style={{marginBottom:0}}>{players.length} JUGADORES</SectionLabel>
              {isAdmin&&<button onClick={()=>setEditingPlayer({})} style={{background:"#00d4aa",border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>+ Agregar</button>}
            </div>
            <ReadOnlyBanner isAdmin={isAdmin} />
            {ranking.map(p=>{
              const isGoing=attending.has(p.id);
              return (
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,background:isGoing?"#ffffff0d":"#ffffff05",borderRadius:12,padding:"11px 14px",marginBottom:7,border:isGoing?"1px solid #ffffff15":"1px solid #ffffff08"}}>
                  {isAdmin&&<div onClick={()=>toggleAttend(p.id)} style={{width:24,height:24,borderRadius:6,cursor:"pointer",flexShrink:0,background:isGoing?"#00d4aa":"#ffffff10",border:isGoing?"none":"2px solid #ffffff20",display:"flex",alignItems:"center",justifyContent:"center"}}>{isGoing&&<span style={{fontSize:13,color:"#fff",fontWeight:900}}>✓</span>}</div>}
                  {!isAdmin&&isGoing&&<div style={{width:8,height:8,borderRadius:"50%",background:"#00d4aa",flexShrink:0}} />}
                  <div onClick={()=>isAdmin&&setEditingPlayer(p)} style={{display:"flex",alignItems:"center",gap:12,flex:1,cursor:isAdmin?"pointer":"default"}}>
                    <Avatar name={p.name} pts={p.pts} size={38} />
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:700,color:isGoing?"#fff":"#666"}}>{p.name}</span><LevelBadge pts={p.pts} /></div>
                      <div style={{fontSize:11,color:"#444",marginTop:2}}>{p.wins}V · {p.matches-p.wins}D · {p.pts}pts</div>
                    </div>
                    {isAdmin&&<span style={{color:"#2a2a3a",fontSize:14}}>✏️</span>}
                  </div>
                </div>
              );
            })}
            <div style={{marginTop:16,background:"#00d4aa0d",border:"1px solid #00d4aa22",borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#00d4aa",marginBottom:4}}>✅ Van hoy: {attendingPlayers.length} jugadores</div>
              <div style={{fontSize:11,color:"#555"}}>→ {Math.floor(attendingPlayers.length/4)} canchas posibles{remainder===2?" · 1 pareja rotativa":""}{remainder===1?" · 1 jugador sin cancha":""}{remainder===3?" · 3 jugadores sin cancha":""}</div>
            </div>
          </>
        ):(
          <>
            <SectionLabel>HISTORIAL DE PAREJAS</SectionLabel>
            <div style={{fontSize:12,color:"#555",marginBottom:14,lineHeight:1.6}}>Cuántas veces jugó cada pareja junta.</div>
            <input value={pairSearch} onChange={e=>setPairSearch(e.target.value)} placeholder="🔍  Buscar..." style={{...inputStyle,marginBottom:16,fontSize:13}} />
            {enrichedPairs.length===0&&<div style={{textAlign:"center",color:"#333",padding:"50px 0",fontSize:13}}><div style={{fontSize:32,marginBottom:12}}>🤝</div>Todavía no hay historial.</div>}
            {enrichedPairs.filter(({pA,pB})=>!pairSearch||pA.name.toLowerCase().includes(pairSearch.toLowerCase())||pB.name.toLowerCase().includes(pairSearch.toLowerCase())).map(({key,pA,pB,times})=>{
              const heat=times>=4?"#ff6b35":times>=2?"#f7c59f":"#9bc53d";
              return (
                <div key={key} style={{display:"flex",alignItems:"center",gap:10,background:"#ffffff07",borderRadius:12,padding:"12px 14px",marginBottom:8,border:"1px solid #ffffff0d"}}>
                  <Avatar name={pA.name} pts={pA.pts} size={34} />
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{pA.name} <span style={{color:"#333"}}>&</span> {pB.name}</div>
                    <div style={{display:"flex",alignItems:"center",gap:4,marginTop:5}}>{Array.from({length:Math.min(times,7)}).map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:heat,opacity:0.3+(i/Math.min(times,7))*0.7}} />)}{times>7&&<span style={{fontSize:10,color:"#555"}}>+{times-7}</span>}</div>
                  </div>
                  <Avatar name={pB.name} pts={pB.pts} size={34} />
                  <div style={{textAlign:"right",minWidth:38}}><div style={{fontSize:20,fontWeight:900,color:heat,lineHeight:1}}>{times}</div><div style={{fontSize:9,color:"#444"}}>veces</div></div>
                </div>
              );
            })}
          </>
        )}
      </div>
    ),

    partido:(
      <div style={{padding:"0 16px 16px"}}>
        {matches.length===0?(
          <>
            <SectionLabel>{isAdmin?"CONFIGURAR PARTIDO":"PARTIDOS DE HOY"}</SectionLabel>
            <ReadOnlyBanner isAdmin={isAdmin} />
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:12,color:"#aaa",fontWeight:600}}>¿QUIÉN VA HOY? ({attendingPlayers.length})</div>
                {isAdmin&&<div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setAllAttend(true)} style={{fontSize:11,color:"#00d4aa",background:"transparent",border:"none",cursor:"pointer",fontWeight:700}}>Todos</button>
                  <button onClick={()=>setAllAttend(false)} style={{fontSize:11,color:"#666",background:"transparent",border:"none",cursor:"pointer",fontWeight:700}}>Ninguno</button>
                </div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[...players].sort((a,b)=>b.pts-a.pts).map(p=>{
                  const isGoing=attending.has(p.id);
                  return (
                    <div key={p.id} onClick={()=>toggleAttend(p.id)} style={{display:"flex",alignItems:"center",gap:10,background:isGoing?"#ffffff0d":"transparent",borderRadius:10,padding:"9px 12px",border:isGoing?"1px solid #ffffff15":"1px solid #ffffff08",cursor:isAdmin?"pointer":"default"}}>
                      <div style={{width:22,height:22,borderRadius:5,flexShrink:0,background:isGoing?"#00d4aa":"#ffffff10",border:isGoing?"none":"2px solid #ffffff20",display:"flex",alignItems:"center",justifyContent:"center"}}>{isGoing&&<span style={{fontSize:12,color:"#fff",fontWeight:900}}>✓</span>}</div>
                      <Avatar name={p.name} pts={p.pts} size={26} />
                      <span style={{fontSize:13,fontWeight:600,color:isGoing?"#fff":"#555",flex:1}}>{p.name}</span>
                      <LevelBadge pts={p.pts} />
                    </div>
                  );
                })}
              </div>
              {attendingPlayers.length>=4&&(
                <div style={{marginTop:12,background:"#0066ff15",border:"1px solid #0066ff30",borderRadius:10,padding:"10px 14px"}}>
                  <div style={{fontSize:12,color:"#6ab4ff",fontWeight:700}}>{attendingPlayers.length} jugadores → {suggestedCourts} cancha{suggestedCourts!==1?"s":""}{remainder===2?" + 1 pareja rotativa 🔄":""}</div>
                </div>
              )}
            </div>
            {isAdmin&&(
              <>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:12,color:"#aaa",marginBottom:10,fontWeight:600}}>CANCHAS DISPONIBLES</div>
                  <div style={{display:"flex",gap:8}}>
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} onClick={()=>saveSession({courts:n}).catch(console.error)}
                        style={{flex:1,padding:"12px 0",background:courts===n?"#00d4aa":"#ffffff10",border:courts===n?"2px solid #00d4aa":"2px solid transparent",borderRadius:10,color:courts===n?"#fff":"#666",fontWeight:800,fontSize:16,cursor:"pointer",position:"relative"}}>
                        {n}
                        {n===suggestedCourts&&<div style={{position:"absolute",bottom:3,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"#0066ff"}} />}
                      </button>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:"#444",marginTop:6}}>El punto azul indica lo sugerido</div>
                </div>
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:12,color:"#aaa",marginBottom:10,fontWeight:600}}>MODO DE ARMADO</div>
                  {[{id:"nivelado",label:"⚖️ Nivelado",desc:"Mezcla categorías — balancea promedios"},{id:"categoria",label:"🎯 Por nivel",desc:"Jugadores del mismo nivel en la misma cancha"}].map(m=>(
                    <button key={m.id} onClick={()=>saveSession({mode:m.id}).catch(console.error)} style={{width:"100%",textAlign:"left",padding:"14px",background:mode===m.id?"#0066ff22":"#ffffff08",border:mode===m.id?"2px solid #0066ff":"2px solid #ffffff10",borderRadius:12,cursor:"pointer",marginBottom:8}}>
                      <div style={{fontSize:13,fontWeight:700,color:mode===m.id?"#6ab4ff":"#ccc"}}>{m.label}</div>
                      <div style={{fontSize:11,color:"#444",marginTop:3}}>{m.desc}</div>
                    </button>
                  ))}
                </div>
                <div style={{marginBottom:24}}>
                  <div style={{fontSize:12,color:"#aaa",marginBottom:10,fontWeight:600}}>TIPO DE PARTIDO</div>
                  {[{id:"short",label:"⚡ Partido corto",desc:"Primero a 5 games"},{id:"long",label:"🏆 Partido largo",desc:"Mejor de 3 sets"}].map(t=>(
                    <button key={t.id} onClick={()=>saveSession({matchType:t.id}).catch(console.error)} style={{width:"100%",textAlign:"left",padding:"14px",background:matchType===t.id?"#0066ff22":"#ffffff08",border:matchType===t.id?"2px solid #0066ff":"2px solid #ffffff10",borderRadius:12,cursor:"pointer",marginBottom:8}}>
                      <div style={{fontSize:13,fontWeight:700,color:matchType===t.id?"#6ab4ff":"#ccc"}}>{t.label}</div>
                      <div style={{fontSize:11,color:"#444",marginTop:3}}>{t.desc}</div>
                    </button>
                  ))}
                </div>
                <button onClick={handleGenerate} disabled={attendingPlayers.length<4}
                  style={{width:"100%",background:attendingPlayers.length<4?"#333":"linear-gradient(135deg,#00d4aa,#0066ff)",border:"none",borderRadius:14,padding:"18px",color:attendingPlayers.length<4?"#666":"#fff",fontWeight:900,fontSize:16,cursor:attendingPlayers.length<4?"not-allowed":"pointer",boxShadow:attendingPlayers.length>=4?"0 8px 30px #00d4aa44":"none"}}>
                  {attendingPlayers.length<4?"Necesitás al menos 4 jugadores":"⚡ ARMAR PARTIDOS"}
                </button>
                <button onClick={()=>setShowQuickMatch(true)} style={{width:"100%",marginTop:10,background:"#ffffff10",border:"1px solid #ffffff20",borderRadius:12,padding:"14px",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                  ➕ Registrar partido rápido
                </button>
              </>
            )}
          </>
        ):(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <SectionLabel style={{marginBottom:0}}>{matches.filter(m=>m.done).length}/{matches.length} COMPLETADOS</SectionLabel>
              {isAdmin&&<button onClick={()=>writeSession({matches:[],waitingPair:[],rotations:[],rotationStep:0})} style={{background:"transparent",border:"1px solid #ffffff15",borderRadius:8,padding:"6px 12px",color:"#666",fontSize:12,cursor:"pointer"}}>↩ Reconfigurar</button>}
            </div>
            {matches.map(match=>(
              <div key={match.id} style={{background:match.done?"#00d4aa0a":"#ffffff08",border:match.done?"1px solid #00d4aa2a":"1px solid #ffffff10",borderRadius:16,padding:"16px",marginBottom:14}}>
                <div style={{fontSize:10,color:match.category?getLevelColor(match.category):"#555",fontWeight:700,letterSpacing:2,marginBottom:10}}>CANCHA {match.id+1}{match.category?` · NIVEL ${getLevelLabel(match.category)}`:""}</div>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  <div style={{flex:1}}>
                    {match.team1.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><Avatar name={p.name} pts={p.pts} size={32} /><div><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{p.name}</div><div style={{fontSize:10,color:"#444"}}>{p.pts}pts</div></div></div>)}
                    <div style={{fontSize:10,color:"#00d4aa",marginTop:4,fontWeight:600}}>Prom. {Math.round(match.team1.reduce((s,p)=>s+p.pts,0)/2)}</div>
                  </div>
                  <div style={{padding:"0 4px",alignSelf:"center"}}><div style={{fontSize:11,color:"#2a2a2a",fontWeight:800}}>VS</div></div>
                  <div style={{flex:1}}>
                    {match.team2.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,justifyContent:"flex-end"}}><div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{p.name}</div><div style={{fontSize:10,color:"#444"}}>{p.pts}pts</div></div><Avatar name={p.name} pts={p.pts} size={32} /></div>)}
                    <div style={{fontSize:10,color:"#00d4aa",marginTop:4,fontWeight:600,textAlign:"right"}}>Prom. {Math.round(match.team2.reduce((s,p)=>s+p.pts,0)/2)}</div>
                  </div>
                </div>
                {!match.done?(isAdmin?(
                  matchType==="long"?(
                    <div>
                      {[0,1,2].map(si=>(
                        <div key={si} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                          <span style={{fontSize:11,color:"#555",width:40}}>Set {si+1}</span>
                          <input type="number" min="0" value={match.sets?.[si]?.[0]??""} onChange={e=>handleSetChange(match.id,si,0,e.target.value)} placeholder="0" style={{flex:1,background:"#ffffff12",border:"1px solid #ffffff20",borderRadius:6,padding:"8px",color:"#fff",fontSize:16,fontWeight:800,textAlign:"center",outline:"none"}} />
                          <span style={{color:"#2a2a2a",fontWeight:800}}>—</span>
                          <input type="number" min="0" value={match.sets?.[si]?.[1]??""} onChange={e=>handleSetChange(match.id,si,1,e.target.value)} placeholder="0" style={{flex:1,background:"#ffffff12",border:"1px solid #ffffff20",borderRadius:6,padding:"8px",color:"#fff",fontSize:16,fontWeight:800,textAlign:"center",outline:"none"}} />
                        </div>
                      ))}
                      <button onClick={()=>handleConfirmMatch(match.id)} style={{width:"100%",background:"#00d4aa",border:"none",borderRadius:8,padding:"10px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",marginTop:4}}>✓ Confirmar</button>
                    </div>
                  ):(
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="number" min="0" max="9" value={match.score1} onChange={e=>handleScoreChange(match.id,"1",e.target.value)} placeholder="0" style={{flex:1,background:"#ffffff12",border:"1px solid #ffffff20",borderRadius:8,padding:"10px",color:"#fff",fontSize:20,fontWeight:800,textAlign:"center",outline:"none"}} />
                      <span style={{color:"#2a2a2a",fontWeight:800,fontSize:18}}>—</span>
                      <input type="number" min="0" max="9" value={match.score2} onChange={e=>handleScoreChange(match.id,"2",e.target.value)} placeholder="0" style={{flex:1,background:"#ffffff12",border:"1px solid #ffffff20",borderRadius:8,padding:"10px",color:"#fff",fontSize:20,fontWeight:800,textAlign:"center",outline:"none"}} />
                      <button onClick={()=>handleConfirmMatch(match.id)} style={{background:"#00d4aa",border:"none",borderRadius:8,padding:"10px 16px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>✓ OK</button>
                    </div>
                  )
                ):<div style={{textAlign:"center",fontSize:12,color:"#444",padding:"8px 0"}}>⏳ Esperando resultado del admin…</div>
                ):<div style={{textAlign:"center",padding:"10px",fontSize:22,fontWeight:800,color:"#00d4aa",letterSpacing:5}}>{match.score1} — {match.score2} ✓</div>}
              </div>
            ))}
            {waitingPair.length===2&&(
              <div style={{marginBottom:14}}>
                <div style={{background:"#7c3aed22",border:"1px solid #7c3aed55",borderRadius:14,padding:"16px",marginBottom:10}}>
                  <div style={{fontSize:10,color:"#a78bfa",fontWeight:700,letterSpacing:2,marginBottom:10}}>🔄 PAREJA ROTATIVA</div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>{waitingPair.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:8}}><Avatar name={p.name} pts={p.pts} size={32} /><div><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{p.name}</div><div style={{fontSize:10,color:"#666"}}>{p.pts}pts</div></div></div>)}</div>
                  <div style={{fontSize:11,color:"#666",lineHeight:1.6}}>Desafían al ganador de cada cancha.<br/>Partidos cortos a <span style={{color:"#a78bfa",fontWeight:700}}>3 games ganados</span>.</div>
                </div>
                {rotations.map((rot,idx)=>{
                  if(idx>rotationStep)return null;
                  const courtMatch=matches[rot.courtId];
                  const opponent=rot.vsTeam??(courtMatch?.done?(parseInt(courtMatch?.score1??0)>parseInt(courtMatch?.score2??0)?courtMatch?.team1:courtMatch?.team2):null);
                  const canPlay=!!opponent&&!rot.done;
                  return (
                    <div key={rot.id} style={{background:rot.done?"#7c3aed12":"#ffffff07",border:rot.done?"1px solid #7c3aed33":"1px solid #ffffff10",borderRadius:14,padding:"14px",marginBottom:10}}>
                      <div style={{fontSize:10,color:"#a78bfa",fontWeight:700,letterSpacing:2,marginBottom:10}}>ROTACIÓN {rot.id+1} · CANCHA {rot.courtId+1}</div>
                      <div style={{display:"flex",gap:8,marginBottom:12}}>
                        <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#a78bfa",marginBottom:4}}>Rotativa</div>{waitingPair.map(p=><div key={p.id} style={{fontSize:13,color:"#ddd",fontWeight:600}}>{p.name}</div>)}</div>
                        <div style={{fontSize:11,color:"#333",fontWeight:800,alignSelf:"center"}}>VS</div>
                        <div style={{flex:1,textAlign:"right"}}><div style={{fontSize:12,fontWeight:700,color:"#00d4aa",marginBottom:4}}>Ganador cancha</div><div style={{fontSize:13,color:"#ddd",fontWeight:600}}>{opponent?.map(x=>x.name).join(" & ")??"Esperando..."}</div></div>
                      </div>
                      {rot.done?<div style={{textAlign:"center",fontSize:18,fontWeight:800,color:"#a78bfa",letterSpacing:4}}>{rot.wins1} — {rot.wins2} ✓</div>
                      :canPlay&&isAdmin?(
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <input type="number" min="0" max="3" value={rot.score1} onChange={e=>handleRotationScore(rot.id,"1",e.target.value)} placeholder="0" style={{flex:1,background:"#7c3aed22",border:"1px solid #7c3aed44",borderRadius:8,padding:"10px",color:"#fff",fontSize:20,fontWeight:800,textAlign:"center",outline:"none"}} />
                          <span style={{color:"#333",fontWeight:800,fontSize:18}}>—</span>
                          <input type="number" min="0" max="3" value={rot.score2} onChange={e=>handleRotationScore(rot.id,"2",e.target.value)} placeholder="0" style={{flex:1,background:"#7c3aed22",border:"1px solid #7c3aed44",borderRadius:8,padding:"10px",color:"#fff",fontSize:20,fontWeight:800,textAlign:"center",outline:"none"}} />
                          <button onClick={()=>handleConfirmRotation(rot.id)} style={{background:"#7c3aed",border:"none",borderRadius:8,padding:"10px 16px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>✓ OK</button>
                        </div>
                      ):<div style={{textAlign:"center",fontSize:12,color:"#444",padding:"8px 0"}}>⏳ Esperando cancha {rot.courtId+1}…</div>}
                    </div>
                  );
                })}
              </div>
            )}
            {matches.every(m=>m.done)&&isAdmin&&(
              <button onClick={()=>{writeSession({matches:[],waitingPair:[],rotations:[],rotationStep:0});setTab("ranking");}} style={{width:"100%",background:"linear-gradient(135deg,#00d4aa,#0066ff)",border:"none",borderRadius:14,padding:"16px",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",marginTop:8}}>
                🏆 Ver ranking actualizado →
              </button>
            )}
          </>
        )}
      </div>
    ),

    ranking:(
      <div style={{padding:"0 16px 16px"}}>
        <SectionLabel>RANKING TEMPORADA</SectionLabel>
        {ranking.length>=3&&(
          <div style={{display:"flex",gap:10,marginBottom:20,alignItems:"flex-end"}}>
            {[1,0,2].map(idx=>{
              const p=ranking[idx];const h=[80,100,70][idx===0?1:idx===1?0:2];const medals=["🥈","🥇","🥉"];
              return (
                <div key={p.id} style={{flex:1,textAlign:"center"}}>
                  <Avatar name={p.name} pts={p.pts} size={idx===1?48:38} />
                  <div style={{fontSize:12,color:"#fff",fontWeight:700,marginTop:6}}>{p.name}</div>
                  <div style={{fontSize:11,color:"#00d4aa",fontWeight:800}}>{p.pts}pts</div>
                  <div style={{marginTop:8,height:h,background:idx===1?"linear-gradient(180deg,#00d4aa,#00a382)":idx===0?"linear-gradient(180deg,#aaa,#777)":"linear-gradient(180deg,#cd7f32,#a05210)",borderRadius:"8px 8px 0 0",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:10,fontSize:20}}>{medals[idx===0?1:idx===1?0:2]}</div>
                </div>
              );
            })}
          </div>
        )}
        {ranking.map((p,i)=>(
          <div key={p.id} onClick={()=>isAdmin&&setEditingPlayer(p)} style={{display:"flex",alignItems:"center",gap:12,background:i===0?"#00d4aa0e":"#ffffff06",border:i===0?"1px solid #00d4aa2a":"1px solid #ffffff08",borderRadius:12,padding:"10px 14px",marginBottom:6,cursor:isAdmin?"pointer":"default"}}>
            <div style={{width:24,textAlign:"center",fontSize:i<3?16:12,fontWeight:700,color:i<3?["#ffd700","#c0c0c0","#cd7f32"][i]:"#333"}}>{i<3?["🥇","🥈","🥉"][i]:`#${p.rank}`}</div>
            <Avatar name={p.name} pts={p.pts} size={36} />
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{p.name}</div><div style={{fontSize:10,color:"#444"}}>{p.wins}V · {p.matches-p.wins}D · {p.matches?Math.round(p.wins/p.matches*100):0}%</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:16,fontWeight:900,color:"#00d4aa"}}>{p.pts}</div><LevelBadge pts={p.pts} /></div>
          </div>
        ))}
      </div>
    ),
  };

  return (
    <div style={{fontFamily:"'Segoe UI',sans-serif",background:"#0d0d1a",minHeight:"100vh",maxWidth:420,margin:"0 auto",display:"flex",flexDirection:"column",color:"#fff"}}>
      <div style={{padding:"12px 16px 10px",borderBottom:"1px solid #ffffff10",background:"#0d0d1aee",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <img src={LOGO} alt="ARPadel" style={{height:26,objectFit:"contain"}} />
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {attendingPlayers.length>0&&<div style={{background:"#00d4aa22",border:"1px solid #00d4aa44",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#00d4aa",fontWeight:700}}>✅ {attendingPlayers.length}</div>}
            <div style={{display:"flex",alignItems:"center",gap:6,background:"#ffffff0d",border:"1px solid #ffffff15",borderRadius:20,padding:"4px 10px",cursor:isAdmin?"pointer":"default"}} onClick={()=>isAdmin&&setShowUsersMgmt(true)}>
              <div style={{width:18,height:18,borderRadius:"50%",background:isAdmin?"#0066ff":"#ffffff20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff"}}>{currentUser.name[0]}</div>
              <span style={{fontSize:11,color:"#aaa",fontWeight:600}}>{currentUser.name}</span>
              {isAdmin&&<span style={{fontSize:9,color:"#6ab4ff"}}>⚡</span>}
            </div>
            <button onClick={()=>setCurrentUser(null)} style={{background:"transparent",border:"1px solid #ffffff15",borderRadius:8,padding:"5px 10px",color:"#555",fontSize:11,cursor:"pointer"}}>Salir</button>
          </div>
        </div>
      </div>

      {notification&&<div style={{position:"fixed",top:62,left:"50%",transform:"translateX(-50%)",background:notification.color,color:"#fff",borderRadius:20,padding:"10px 20px",fontSize:13,fontWeight:700,zIndex:300,boxShadow:"0 8px 30px #0008",whiteSpace:"nowrap",maxWidth:"90vw"}}>{notification.msg}</div>}

      <div style={{flex:1,overflowY:"auto",paddingTop:16}}>{screens[tab]}</div>

      <div style={{display:"flex",background:"#13131f",borderTop:"1px solid #ffffff10",position:"sticky",bottom:0,padding:"8px 0 4px"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"transparent",border:"none",cursor:"pointer",padding:"6px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:700,color:tab===t.id?"#00d4aa":"#333"}}>{t.label}</span>
            {tab===t.id&&<div style={{width:4,height:4,borderRadius:"50%",background:"#00d4aa"}} />}
          </button>
        ))}
      </div>

      {editingPlayer!==null&&isAdmin&&<PlayerModal player={editingPlayer} onSave={handleSavePlayer} onDelete={handleDeletePlayer} onClose={()=>setEditingPlayer(null)} />}
      {showUsersMgmt&&isAdmin&&<UsersMgmtModal users={users} onClose={()=>setShowUsersMgmt(false)} onSave={(u)=>{saveUser(u).catch(console.error);notify("Usuario actualizado ✓");}} />}
      {showQuickMatch&&isAdmin&&<QuickMatchModal players={players} onSave={handleQuickMatchSave} onClose={()=>setShowQuickMatch(false)} />}

      <style>{`* { box-sizing:border-box; } ::-webkit-scrollbar { width:0; } input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; } input::placeholder { color:#444; }`}</style>
    </div>
  );
}
