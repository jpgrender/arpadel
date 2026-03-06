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

// ── Logo (base64) ─────────────────────────────────────────────────────────────
const LOGO = "/logo.jpg";

// ── Level config ──────────────────────────────────────────────────────────────
const LEVEL_COLORS = {
  5: { bg:"#ff6b35", label:"PRO", range:[380,999] },
  4: { bg:"#f7c59f", label:"4",   range:[280,379] },
  3: { bg:"#5bc0eb", label:"3",   range:[200,279] },
  2: { bg:"#9bc53d", label:"2",   range:[120,199] },
  1: { bg:"#aaaaaa", label:"1",   range:[0,119]   },
};
function getLevel(pts) {
  for (const [lvl,{range}] of Object.entries(LEVEL_COLORS).reverse())
    if (pts>=range[0]&&pts<=range[1]) return Number(lvl);
  return 1;
}
function getLevelColor(lvl) { return LEVEL_COLORS[lvl]?.bg??"#aaa"; }
function getLevelLabel(lvl) { return LEVEL_COLORS[lvl]?.label??lvl; }
function pairKey(a,b) { return [a,b].sort((x,y)=>x-y).join("-"); }

// ── Match generation ──────────────────────────────────────────────────────────
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
      matches.push({id:i,team1:t1,team2:t2,score1:"",score2:"",done:false});
    }
  } else {
    const sorted=[...pool];
    let ci=0;
    for (let i=0;i+3<sorted.length&&ci<courts;i+=4) {
      const group=sorted.slice(i,i+4);
      const {t1,t2}=bestPairing(group);
      matches.push({id:ci,team1:t1,team2:t2,score1:"",score2:"",done:false,category:getLevel(group[1].pts)});
      ci++;
    }
  }
  return {matches,waitingPair};
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle = {
  width:"100%",background:"#ffffff10",border:"1px solid #ffffff20",
  borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:15,
  outline:"none",boxSizing:"border-box",
};

// ── UI components ─────────────────────────────────────────────────────────────
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

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen({users,onLogin}) {
  const [selected,setSelected]=useState(null);
  const [pin,setPin]=useState("");
  const [error,setError]=useState("");
  const [showPin,setShowPin]=useState(false);

  function handleLogin() {
    if (!selected){setError("Seleccioná tu nombre");return;}
    const user=users.find(u=>u.id===selected);
    if (user.pin!==pin){setError("PIN incorrecto");setPin("");return;}
    onLogin(user);
  }

  return (
    <div style={{minHeight:"100vh",background:"#0d0d1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 24px",fontFamily:"'Segoe UI',sans-serif"}}>
      <img src={LOGO} alt="ARPadel" style={{height:44,objectFit:"contain",marginBottom:32}} />
      <div style={{width:"100%",maxWidth:380,background:"#181828",borderRadius:20,padding:"28px 24px",border:"1px solid #ffffff10"}}>
        <div style={{fontSize:16,fontWeight:800,color:"#fff",marginBottom:4}}>Bienvenido</div>
        <div style={{fontSize:12,color:"#555",marginBottom:24}}>Seleccioná tu nombre e ingresá tu PIN</div>

        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:"#888",fontWeight:700,letterSpacing:1,marginBottom:8}}>¿QUIÉN SOS?</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {[...users].sort((a,b)=>a.name.localeCompare(b.name)).map(u=>(
              <div key={u.id} onClick={()=>{setSelected(u.id);setPin("");setError("");}} style={{padding:"7px 14px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:600,background:selected===u.id?"#00d4aa":"#ffffff0d",color:selected===u.id?"#fff":"#888",border:selected===u.id?"2px solid #00d4aa":"2px solid transparent"}}>
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

        <button onClick={handleLogin} disabled={!selected} style={{width:"100%",background:selected?"linear-gradient(135deg,#00d4aa,#0066ff)":"#333",border:"none",borderRadius:12,padding:"14px",color:selected?"#fff":"#666",fontWeight:800,fontSize:15,cursor:selected?"pointer":"not-allowed"}}>
          Entrar
        </button>
        <div style={{fontSize:11,color:"#333",textAlign:"center",marginTop:16}}>¿No tenés PIN? Pedíselo al admin del grupo.</div>
      </div>
    </div>
  );
}

// ── Player modal ──────────────────────────────────────────────────────────────
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
                <div key={lvl} onClick={()=>set("pts",range[0]+20)} style={{display:"flex",alignItems:"center",gap:4,background:"#ffffff0d",borderRadius:6,padding:"4px 8px",cursor:"pointer",border:active?`1px solid ${bg}`:"1px solid transparent"}}>
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
        <button onClick={()=>{if(!form.name.trim())return;onSave({...player,...form,pts:Number(form.pts),wins:Number(form.wins),matches:Number(form.matches)});}} style={{width:"100%",background:"linear-gradient(135deg,#00d4aa,#0066ff)",border:"none",borderRadius:12,padding:"14px",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",marginBottom:10}}>
          {isNew?"Agregar al grupo":"Guardar cambios"}
        </button>
        {!isNew&&<button onClick={()=>onDelete(player.id)} style={{width:"100%",background:"#ff4d4d15",border:"1px solid #ff4d4d44",borderRadius:12,padding:"12px",color:"#ff6b6b",fontWeight:700,fontSize:14,cursor:"pointer"}}>🗑 Eliminar jugador</button>}
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS=[
  {id:"inicio",   icon:"⚡",label:"Inicio"},
  {id:"jugadores",icon:"👥",label:"Jugadores"},
  {id:"partido",  icon:"🎾",label:"Partido"},
  {id:"ranking",  icon:"🏆",label:"Ranking"},
];


// ── Read-only banner ─────────────────────────────────────────────────────────
function ReadOnlyBanner({isAdmin}) {
  if (isAdmin) return null;
  return (
    <div style={{background:"#0066ff15",border:"1px solid #0066ff33",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:16}}>👁</span>
      <span style={{fontSize:12,color:"#6ab4ff"}}>Modo visualización — solo los admins pueden hacer cambios</span>
    </div>
  );
}

// ── Users management modal (standalone to avoid React hooks error) ────────────
function UsersMgmtModal({users, onClose, onSave, notify}) {
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({});

  function startEdit(u) { setEditingUser(u.id); setForm({name:u.name, pin:u.pin, role:u.role}); }
  function saveU() {
    const u = users.find(x => x.id === editingUser);
    onSave({...u, ...form});
    setEditingUser(null);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={onClose}>
      <div style={{background:"#181828",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:420,border:"1px solid #ffffff15",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:"#ffffff20",borderRadius:2,margin:"0 auto 20px"}} />
        <div style={{fontSize:16,fontWeight:900,color:"#fff",marginBottom:4}}>⚙️ Gestión de usuarios</div>
        <div style={{fontSize:12,color:"#555",marginBottom:20}}>Cambiá roles y PINs. Solo los admins pueden hacer esto.</div>
        {users.map(u=>(
          <div key={u.id} style={{background:"#ffffff07",borderRadius:12,padding:"12px 14px",marginBottom:8,border:"1px solid #ffffff0d"}}>
            {editingUser===u.id?(
              <div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nombre" style={{width:"100%",background:"#ffffff10",border:"1px solid #ffffff20",borderRadius:10,padding:"8px 10px",color:"#fff",fontSize:13,outline:"none",flex:2}} />
                  <input value={form.pin} onChange={e=>setForm(f=>({...f,pin:e.target.value}))} placeholder="PIN" maxLength={6} style={{width:"100%",background:"#ffffff10",border:"1px solid #ffffff20",borderRadius:10,padding:"8px 10px",color:"#fff",fontSize:13,outline:"none",flex:1}} />
                </div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  {["admin","user"].map(r=>(
                    <div key={r} onClick={()=>setForm(f=>({...f,role:r}))} style={{flex:1,padding:"8px",borderRadius:8,border:form.role===r?"2px solid #0066ff":"2px solid #ffffff15",background:form.role===r?"#0066ff22":"transparent",textAlign:"center",cursor:"pointer",fontSize:12,color:form.role===r?"#6ab4ff":"#555",fontWeight:700}}>
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

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  // ── Firebase state ──────────────────────────────────────────────────────────
  const [players,    setPlayers]    = useState([]);
  const [users,      setUsers]      = useState([]);
  const [pairHistory,setPairHistory]= useState({});
  const [session,    setSession]    = useState(null);
  const [matchHistory,setMatchHistory]=useState([]);
  const [loading,    setLoading]    = useState(true);

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [currentUser,setCurrentUser]=useState(null);
  const [tab,        setTab]        = useState("inicio");
  const [notification,setNotification]=useState(null);
  const [editingPlayer,setEditingPlayer]=useState(null);
  const [playersSubTab,setPlayersSubTab]=useState("lista");
  const [pairSearch, setPairSearch] = useState("");
  const [showUsersMgmt,setShowUsersMgmt]=useState(false);

  // ── Derived session values ──────────────────────────────────────────────────
  const attending    = useMemo(()=>new Set(session?.attending??[]),[session]);
  const courts       = session?.courts??3;
  const mode         = session?.mode??"nivelado";
  const matches      = session?.matches??[];
  const waitingPair  = session?.waitingPair??[];
  const rotations    = session?.rotations??[];
  const rotationStep = session?.rotationStep??0;
  const matchType = session?.matchType ?? "corto"; // "corto" | "largo"	
  const isAdmin = currentUser?.role==="admin";

  // ── Firestore subscriptions ─────────────────────────────────────────────────
  useEffect(()=>{
    let n=0;
    const needed=4;
    const check=()=>{ n++; if(n>=needed) setLoading(false); };
    const onErr=(label)=>(err)=>{ console.error(label,err); check(); };

    const unsubP = onSnapshot(collection(db,"players"),
      snap=>{ setPlayers(snap.docs.map(d=>d.data())); check(); },
      onErr("players"));
    const unsubU = onSnapshot(collection(db,"users"),
      snap=>{ setUsers(snap.docs.map(d=>d.data())); check(); },
      onErr("users"));
    const unsubS = onSnapshot(doc(db,"config","session"),
      snap=>{ if(snap.exists()) setSession(snap.data()); check(); },
      onErr("session"));
    const unsubPH = onSnapshot(doc(db,"config","pairHistory"),
      snap=>{ if(snap.exists()) setPairHistory(snap.data()); check(); },
      onErr("pairHistory"));
    const unsubH = onSnapshot(
      query(collection(db,"matchHistory"),orderBy("timestamp","desc"),limit(50)),
      snap=>setMatchHistory(snap.docs.map(d=>{ const d2=d.data(); return {...d2,date:d2.date??""}; })),
      (err)=>console.error("matchHistory",err)
    );

    // Auto-timeout: if Firebase doesn't respond in 8s, unblock the UI
    const timeout = setTimeout(()=>{ if(n<needed) setLoading(false); }, 8000);

    // Seed Firestore on first run
    seedIfEmpty().catch(console.error);

    return ()=>{ unsubP(); unsubU(); unsubS(); unsubPH(); unsubH(); clearTimeout(timeout); };
  },[]);

  // ── Session write helper ────────────────────────────────────────────────────
  const writeSession = useCallback((updates)=>{
    saveSession(updates).catch(console.error);
  },[]);

  // ── Derived data ────────────────────────────────────────────────────────────
const ranking = useMemo(() =>
  [...players].sort((a,b)=>b.pts-a.pts).map((p,i)=>({...p,rank:i+1})),
  [players]
);

const attendingPlayers = useMemo(() =>
  players.filter(p=>attending.has(p.id)).sort((a,b)=>b.pts-a.pts),
  [players,attending]
);

const suggestedCourts = Math.floor(attendingPlayers.length/4);
const remainder = attendingPlayers.length % 4;

const enrichedPairs = useMemo(() =>
  Object.entries(pairHistory)
    .map(([key,times])=>{
      const [idA,idB]=key.split("-").map(Number);
      const pA=players.find(p=>p.id===idA);
      const pB=players.find(p=>p.id===idB);
      if(!pA||!pB) return null;
      return {key,pA,pB,times};
    })
    .filter(Boolean)
    .sort((a,b)=>b.times-a.times),
  [pairHistory,players]
);


// ── Guards ──────────────────────────────────────────────────────────────────
if (loading) return (
  <div style={{minHeight:"100vh",background:"#0d0d1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
    <img src={LOGO} alt="ARPadel" style={{height:40,objectFit:"contain"}} />
    <div style={{color:"#333",fontSize:13}}>Conectando…</div>
  </div>
);

if (!currentUser)
  return <LoginScreen users={users} onLogin={u=>setCurrentUser(u)} />;

  // ── Notification ────────────────────────────────────────────────────────────
  function notify(msg,color="#00d4aa"){
    setNotification({msg,color});
    setTimeout(()=>setNotification(null),2800);
  }

  // ── Attendance ──────────────────────────────────────────────────────────────
  function toggleAttend(id){
    if(!isAdmin) return;
    const next=new Set(attending);
    next.has(id)?next.delete(id):next.add(id);
    const arr=[...next];
    const s=Math.floor(arr.length/4);
    writeSession({attending:arr, courts:s>=1?s:courts});
  }
  function setAllAttend(all){
    if(!isAdmin) return;
    const arr=all?players.map(p=>p.id):[];
    const s=Math.floor(arr.length/4);
    writeSession({attending:arr, courts:s>=1?s:1});
  }

  // ── Courts & mode ───────────────────────────────────────────────────────────
  function setCourts(n){ writeSession({courts:n}); }
  function setMode(m)  { writeSession({mode:m}); }

  // ── Player CRUD ─────────────────────────────────────────────────────────────
  function handleSavePlayer(updated){
    if(!isAdmin) return;
    if(!updated.id){
      const newId=players.length?Math.max(...players.map(p=>p.id))+1:1;
      const p={...updated,id:newId};
      savePlayer(p).catch(console.error);
      notify(`${p.name} agregado 👋`);
    } else {
      savePlayer(updated).catch(console.error);
      notify(`${updated.name} actualizado ✓`);
    }
    setEditingPlayer(null);
  }
  function handleDeletePlayer(id){
    if(!isAdmin) return;
    const p=players.find(x=>x.id===id);
    removePlayer(id).catch(console.error);
    // Remove from attending too
    const next=new Set(attending); next.delete(id);
    writeSession({attending:[...next]});
    setEditingPlayer(null);
    notify(`${p?.name} eliminado`,"#ff6b6b");
  }

  // ── Generate matches ────────────────────────────────────────────────────────
  function handleGenerate(){
    if(!isAdmin) return;
    if(attendingPlayers.length<4){notify("Necesitás al menos 4 jugadores","#ff6b6b");return;}
    const {matches:m,waitingPair:wp}=generateMatches(attendingPlayers,courts,mode,pairHistory);
    if(m.length===0){notify("No hay suficientes jugadores","#ff6b6b");return;}
    const rots=wp.length===2?m.map((_,i)=>({id:i,courtId:i,challenger:wp,vsTeam:null,score1:"",score2:"",wins1:0,wins2:0,done:false})):[];
    writeSession({matches:m,waitingPair:wp,rotations:rots,rotationStep:0});
    setTab("partido");
    notify(`¡${m.length} partido${m.length>1?"s":""} generado${m.length>1?"s":""}!`);
  }

  // ── Score changes ───────────────────────────────────────────────────────────
  function handleScoreChange(matchId,team,val){
    if(!isAdmin) return;
    const updated=matches.map(m=>m.id===matchId?{...m,[`score${team}`]:val}:m);
    writeSession({matches:updated});
  }

  // ── Confirm match ───────────────────────────────────────────────────────────
  function handleConfirmMatch(matchId){
    if(!isAdmin) return;
    const match=matches.find(m=>m.id===matchId);
    if(!match) return;
    const s1=parseInt(match.score1),s2=parseInt(match.score2);
    if(isNaN(s1)||isNaN(s2)){notify("Ingresá los games de cada pareja","#ff6b6b");return;}

    const newPH={...pairHistory};
    const k1=pairKey(match.team1[0].id,match.team1[1].id);
    const k2=pairKey(match.team2[0].id,match.team2[1].id);
    newPH[k1]=(newPH[k1]??0)+1; newPH[k2]=(newPH[k2]??0)+1;
    savePairHistory(newPH).catch(console.error);

    const winners=s1>s2?match.team1:s2>s1?match.team2:null;
    const all=[...match.team1,...match.team2];
    for (const p of all){
      const isWin=winners?.some(x=>x.id===p.id);
      const gained=isWin?Math.max(s1,s2)*5:s1===s2?s1*2:Math.min(s1,s2)*2;
      savePlayer({...p,pts:p.pts+gained,wins:isWin?p.wins+1:p.wins,matches:p.matches+1}).catch(console.error);
    }

    const newMatches=matches.map(m=>m.id===matchId?{...m,done:true}:m);
    let newRots=rotations;
    if(rotations.length>0&&winners)
      newRots=rotations.map(r=>r.courtId===matchId?{...r,vsTeam:winners}:r);
    writeSession({matches:newMatches,rotations:newRots});

    addMatchHistory({
      date:new Date().toLocaleDateString("es-AR"),
      team1:match.team1.map(x=>x.name).join(" & "),
      team2:match.team2.map(x=>x.name).join(" & "),
      score:`${s1} - ${s2}`,
      winner:s1!==s2?(s1>s2?match.team1:match.team2).map(x=>x.name).join(" & "):"Empate",
    }).catch(console.error);

    notify("¡Resultado guardado! 🎾");
  }

  // ── Rotation scores ─────────────────────────────────────────────────────────
  function handleRotationScore(rotId,team,val){
    if(!isAdmin) return;
    const updated=rotations.map(r=>r.id===rotId?{...r,[`score${team}`]:val}:r);
    writeSession({rotations:updated});
  }
  function handleConfirmRotation(rotId){
    if(!isAdmin) return;
    const rot=rotations.find(r=>r.id===rotId);
    if(!rot) return;
    const s1=parseInt(rot.score1),s2=parseInt(rot.score2);
    if(isNaN(s1)||isNaN(s2)){notify("Ingresá el resultado","#ff6b6b");return;}
    const all=[...rot.challenger,...(rot.vsTeam??[])];
    for (const p of all){
      const isChall=rot.challenger.some(x=>x.id===p.id);
      const isWin=s1>s2?isChall:!isChall;
      savePlayer({...p,pts:p.pts+(isWin?Math.max(s1,s2)*4:Math.min(s1,s2)*2),wins:isWin?p.wins+1:p.wins,matches:p.matches+1}).catch(console.error);
    }
    const updated=rotations.map(r=>r.id===rotId?{...r,done:true,wins1:s1,wins2:s2}:r);
    writeSession({rotations:updated,rotationStep:rotationStep+1});
    notify(`Rotación ${rotId+1} guardada ✓`);
  }

  // UsersMgmtModal is defined outside App to avoid React hooks error #310

  // ReadOnlyBanner defined outside App

  // ══════════════════════════════════════════════════════════════════════════════
  // ── SCREENS ──────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  const screens = {

    // ── INICIO ─────────────────────────────────────────────────────────────────
    inicio: (
      <div style={{padding:"0 16px 16px"}}>
        <div style={{background:"linear-gradient(135deg,#00d4aa22,#0066ff22)",border:"1px solid #00d4aa33",borderRadius:16,padding:"20px",marginBottom:20,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-20,right:-20,fontSize:80,opacity:0.06}}>🎾</div>
          <div style={{fontSize:11,color:"#00d4aa",fontWeight:700,letterSpacing:2,marginBottom:4}}>TU GRUPO</div>
          <div style={{fontSize:28,fontWeight:900,color:"#fff",lineHeight:1}}>ARPadel</div>
          <div style={{fontSize:13,color:"#aaa",marginTop:6}}>{players.length} jugadores · {matchHistory.length} partidos jugados</div>
        </div>

        {[
          {label:"Jugadores en el grupo",value:players.length,icon:"👥",action:()=>setTab("jugadores")},
          {label:"Van hoy",value:attendingPlayers.length,icon:"✅",action:()=>setTab("partido")},
          {label:"Partidos jugados",value:matchHistory.length,icon:"🏸",action:null},
        ].map(s=>(
          <div key={s.label} onClick={s.action??undefined} style={{display:"flex",alignItems:"center",gap:14,background:"#ffffff08",borderRadius:12,padding:"14px 16px",marginBottom:10,border:"1px solid #ffffff10",cursor:s.action?"pointer":"default"}}>
            <span style={{fontSize:22}}>{s.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:"#888",fontWeight:600,letterSpacing:1}}>{s.label.toUpperCase()}</div>
              <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>{s.value}</div>
            </div>
            {s.action&&<span style={{color:"#333",fontSize:18}}>›</span>}
          </div>
        ))}

        {matchHistory.length>0&&(
          <>
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
          </>
        )}

        <button onClick={()=>setTab("partido")} style={{width:"100%",marginTop:8,background:"linear-gradient(135deg,#00d4aa,#0066ff)",border:"none",borderRadius:14,padding:"16px",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"}}>
          🎾 Armar partido →
        </button>
      </div>
    ),

    // ── JUGADORES ──────────────────────────────────────────────────────────────
    jugadores: (
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
                  {isAdmin&&(
                    <div onClick={()=>toggleAttend(p.id)} style={{width:24,height:24,borderRadius:6,cursor:"pointer",flexShrink:0,background:isGoing?"#00d4aa":"#ffffff10",border:isGoing?"none":"2px solid #ffffff20",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {isGoing&&<span style={{fontSize:13,color:"#fff",fontWeight:900}}>✓</span>}
                    </div>
                  )}
                  {!isAdmin&&isGoing&&<div style={{width:8,height:8,borderRadius:"50%",background:"#00d4aa",flexShrink:0}} />}
                  <div onClick={()=>isAdmin&&setEditingPlayer(p)} style={{display:"flex",alignItems:"center",gap:12,flex:1,cursor:isAdmin?"pointer":"default"}}>
                    <Avatar name={p.name} pts={p.pts} size={38} />
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:13,fontWeight:700,color:isGoing?"#fff":"#666"}}>{p.name}</span>
                        <LevelBadge pts={p.pts} />
                      </div>
                      <div style={{fontSize:11,color:"#444",marginTop:2}}>{p.wins}V · {p.matches-p.wins}D · {p.pts}pts</div>
                    </div>
                    {isAdmin&&<span style={{color:"#2a2a3a",fontSize:14}}>✏️</span>}
                  </div>
                </div>
              );
            })}
            <div style={{marginTop:16,background:"#00d4aa0d",border:"1px solid #00d4aa22",borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#00d4aa",marginBottom:4}}>✅ Van hoy: {attendingPlayers.length} jugadores</div>
              <div style={{fontSize:11,color:"#555"}}>
                → {Math.floor(attendingPlayers.length/4)} canchas posibles
                {remainder===2?" · 1 pareja rotativa":""}
                {remainder===1?" · 1 jugador sin cancha":""}
                {remainder===3?" · 3 jugadores sin cancha":""}
              </div>
            </div>
          </>
        ):(
          <>
            <SectionLabel>HISTORIAL DE PAREJAS</SectionLabel>
            <div style={{fontSize:12,color:"#555",marginBottom:14,lineHeight:1.6}}>Cuántas veces jugó cada pareja junta. El algoritmo usa esto para evitar repeticiones.</div>
            <input value={pairSearch} onChange={e=>setPairSearch(e.target.value)} placeholder="🔍  Buscar por nombre..." style={{...inputStyle,marginBottom:16,fontSize:13}} />
            {enrichedPairs.length===0&&<div style={{textAlign:"center",color:"#333",padding:"50px 0",fontSize:13}}><div style={{fontSize:32,marginBottom:12}}>🤝</div>Todavía no hay historial de parejas.</div>}
            {enrichedPairs
              .filter(({pA,pB})=>!pairSearch||pA.name.toLowerCase().includes(pairSearch.toLowerCase())||pB.name.toLowerCase().includes(pairSearch.toLowerCase()))
              .map(({key,pA,pB,times})=>{
                const heat=times>=4?"#ff6b35":times>=2?"#f7c59f":"#9bc53d";
                return (
                  <div key={key} style={{display:"flex",alignItems:"center",gap:10,background:"#ffffff07",borderRadius:12,padding:"12px 14px",marginBottom:8,border:"1px solid #ffffff0d"}}>
                    <Avatar name={pA.name} pts={pA.pts} size={34} />
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{pA.name} <span style={{color:"#333"}}>&</span> {pB.name}</div>
                      <div style={{display:"flex",alignItems:"center",gap:4,marginTop:5}}>
                        {Array.from({length:Math.min(times,7)}).map((_,i)=>(
                          <div key={i} style={{width:7,height:7,borderRadius:"50%",background:heat,opacity:0.3+(i/Math.min(times,7))*0.7}} />
                        ))}
                        {times>7&&<span style={{fontSize:10,color:"#555"}}>+{times-7}</span>}
                      </div>
                    </div>
                    <Avatar name={pB.name} pts={pB.pts} size={34} />
                    <div style={{textAlign:"right",minWidth:38}}>
                      <div style={{fontSize:20,fontWeight:900,color:heat,lineHeight:1}}>{times}</div>
                      <div style={{fontSize:9,color:"#444"}}>veces</div>
                    </div>
                  </div>
                );
              })}
          </>
        )}
      </div>
    ),

    // ── PARTIDO ────────────────────────────────────────────────────────────────
    partido: (
      <div style={{padding:"0 16px 16px"}}>
        {matches.length===0?(
          <>
            <SectionLabel>CONFIGURAR PARTIDO</SectionLabel>
            <ReadOnlyBanner isAdmin={isAdmin} />

            {/* Asistencia */}
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:12,color:"#aaa",fontWeight:600}}>¿QUIÉN VA HOY? ({attendingPlayers.length})</div>
                {isAdmin&&(
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setAllAttend(true)} style={{fontSize:11,color:"#00d4aa",background:"transparent",border:"none",cursor:"pointer",fontWeight:700}}>Todos</button>
                    <button onClick={()=>setAllAttend(false)} style={{fontSize:11,color:"#666",background:"transparent",border:"none",cursor:"pointer",fontWeight:700}}>Ninguno</button>
                  </div>
                )}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[...players].sort((a,b)=>b.pts-a.pts).map(p=>{
                  const isGoing=attending.has(p.id);
                  return (
                    <div key={p.id} onClick={()=>toggleAttend(p.id)} style={{display:"flex",alignItems:"center",gap:10,background:isGoing?"#ffffff0d":"transparent",borderRadius:10,padding:"9px 12px",border:isGoing?"1px solid #ffffff15":"1px solid #ffffff08",cursor:isAdmin?"pointer":"default"}}>
                      <div style={{width:22,height:22,borderRadius:5,flexShrink:0,background:isGoing?"#00d4aa":"#ffffff10",border:isGoing?"none":"2px solid #ffffff20",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {isGoing&&<span style={{fontSize:12,color:"#fff",fontWeight:900}}>✓</span>}
                      </div>
                      <Avatar name={p.name} pts={p.pts} size={26} />
                      <span style={{fontSize:13,fontWeight:600,color:isGoing?"#fff":"#555",flex:1}}>{p.name}</span>
                      <LevelBadge pts={p.pts} />
                    </div>
                  );
                })}
              </div>
              {attendingPlayers.length>=4&&(
                <div style={{marginTop:12,background:"#0066ff15",border:"1px solid #0066ff30",borderRadius:10,padding:"10px 14px"}}>
                  <div style={{fontSize:12,color:"#6ab4ff",fontWeight:700}}>
                    {attendingPlayers.length} jugadores → {suggestedCourts} cancha{suggestedCourts!==1?"s":""}
                    {remainder===2?" + 1 pareja rotativa 🔄":""}
                  </div>
                </div>
              )}
            </div>

            {/* Canchas */}
            {isAdmin&&(
              <>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:12,color:"#aaa",marginBottom:10,fontWeight:600}}>CANCHAS DISPONIBLES</div>
                  <div style={{display:"flex",gap:8}}>
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} onClick={()=>setCourts(n)} style={{flex:1,padding:"12px 0",background:courts===n?"#00d4aa":"#ffffff10",border:courts===n?"2px solid #00d4aa":"2px solid transparent",borderRadius:10,color:courts===n?"#fff":"#666",fontWeight:800,fontSize:16,cursor:"pointer",position:"relative",outline:n===suggestedCourts&&courts!==n?"2px solid #0066ff55":"none"}}>
                        {n}
                        {n===suggestedCourts&&<div style={{position:"absolute",bottom:3,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"#0066ff"}} />}
                      </button>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:"#444",marginTop:6}}>El punto azul indica lo sugerido según los jugadores de hoy</div>
                </div>

                {/* Modo */}
                <div style={{marginBottom:24}}>
                  <div style={{fontSize:12,color:"#aaa",marginBottom:10,fontWeight:600}}>MODO DE ARMADO</div>
                  {[
                    {id:"nivelado", label:"⚖️ Nivelado",  desc:"Mezcla categorías — balancea promedios y evita repetir parejas"},
                    {id:"categoria",label:"🎯 Por nivel", desc:"Jugadores del mismo nivel en la misma cancha"},
                  ].map(m=>(
                    <button key={m.id} onClick={()=>setMode(m.id)} style={{width:"100%",textAlign:"left",padding:"14px",background:mode===m.id?"#0066ff22":"#ffffff08",border:mode===m.id?"2px solid #0066ff":"2px solid #ffffff10",borderRadius:12,cursor:"pointer",marginBottom:8}}>
                      <div style={{fontSize:13,fontWeight:700,color:mode===m.id?"#6ab4ff":"#ccc"}}>{m.label}</div>
                      <div style={{fontSize:11,color:"#444",marginTop:3}}>{m.desc}</div>
                    </button>
                  ))}
                </div>

                <button onClick={handleGenerate} disabled={attendingPlayers.length<4} style={{width:"100%",background:attendingPlayers.length<4?"#333":"linear-gradient(135deg,#00d4aa,#0066ff)",border:"none",borderRadius:14,padding:"18px",color:attendingPlayers.length<4?"#666":"#fff",fontWeight:900,fontSize:16,cursor:attendingPlayers.length<4?"not-allowed":"pointer",boxShadow:attendingPlayers.length>=4?"0 8px 30px #00d4aa44":"none"}}>
                  {attendingPlayers.length<4?"Necesitás al menos 4 jugadores":"⚡ ARMAR PARTIDOS"}
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
                <div style={{fontSize:10,color:match.category?getLevelColor(match.category):"#555",fontWeight:700,letterSpacing:2,marginBottom:10}}>
                  CANCHA {match.id+1}{match.category?` · NIVEL ${getLevelLabel(match.category)}`:""}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <div style={{flex:1}}>
                    {match.team1.map(p=>(
                      <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <Avatar name={p.name} pts={p.pts} size={32} />
                        <div><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{p.name}</div><div style={{fontSize:10,color:"#444"}}>{p.pts}pts</div></div>
                      </div>
                    ))}
                    <div style={{fontSize:10,color:"#00d4aa",marginTop:4,fontWeight:600}}>Prom. {Math.round(match.team1.reduce((s,p)=>s+p.pts,0)/2)}</div>
                  </div>
                  <div style={{padding:"0 4px"}}><div style={{fontSize:11,color:"#2a2a2a",fontWeight:800}}>VS</div></div>
                  <div style={{flex:1}}>
                    {match.team2.map(p=>(
                      <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,justifyContent:"flex-end"}}>
                        <div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{p.name}</div><div style={{fontSize:10,color:"#444"}}>{p.pts}pts</div></div>
                        <Avatar name={p.name} pts={p.pts} size={32} />
                      </div>
                    ))}
                    <div style={{fontSize:10,color:"#00d4aa",marginTop:4,fontWeight:600,textAlign:"right"}}>Prom. {Math.round(match.team2.reduce((s,p)=>s+p.pts,0)/2)}</div>
                  </div>
                </div>

                {!match.done&&(()=>{
                  const k1=pairKey(match.team1[0].id,match.team1[1].id);
                  const k2=pairKey(match.team2[0].id,match.team2[1].id);
                  const rep=Math.max(pairHistory[k1]??0,pairHistory[k2]??0);
                  return rep>=2?<div style={{fontSize:11,color:"#f7c59f",background:"#f7c59f12",borderRadius:8,padding:"7px 10px",marginBottom:10,border:"1px solid #f7c59f22"}}>⚠️ Alguna pareja ya jugó junta {rep} veces</div>:null;
                })()}

                {!match.done?isAdmin?(
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="number" min="0" max="9" value={match.score1} onChange={e=>handleScoreChange(match.id,"1",e.target.value)} placeholder="0" style={{flex:1,background:"#ffffff12",border:"1px solid #ffffff20",borderRadius:8,padding:"10px",color:"#fff",fontSize:20,fontWeight:800,textAlign:"center",outline:"none"}} />
                    <span style={{color:"#2a2a2a",fontWeight:800,fontSize:18}}>—</span>
                    <input type="number" min="0" max="9" value={match.score2} onChange={e=>handleScoreChange(match.id,"2",e.target.value)} placeholder="0" style={{flex:1,background:"#ffffff12",border:"1px solid #ffffff20",borderRadius:8,padding:"10px",color:"#fff",fontSize:20,fontWeight:800,textAlign:"center",outline:"none"}} />
                    <button onClick={()=>handleConfirmMatch(match.id)} style={{background:"#00d4aa",border:"none",borderRadius:8,padding:"10px 16px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>✓ OK</button>
                  </div>
                ):<div style={{textAlign:"center",fontSize:12,color:"#444",padding:"8px 0"}}>⏳ Esperando resultado del admin…</div>:(
                  <div style={{textAlign:"center",padding:"10px",fontSize:22,fontWeight:800,color:"#00d4aa",letterSpacing:5}}>{match.score1} — {match.score2} ✓</div>
                )}
              </div>
            ))}

            {/* Pareja rotativa */}
            {waitingPair.length===2&&(
              <div style={{marginTop:4,marginBottom:14}}>
                <div style={{background:"#7c3aed22",border:"1px solid #7c3aed55",borderRadius:14,padding:"16px",marginBottom:10}}>
                  <div style={{fontSize:10,color:"#a78bfa",fontWeight:700,letterSpacing:2,marginBottom:10}}>🔄 PAREJA ROTATIVA</div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    {waitingPair.map(p=>(
                      <div key={p.id} style={{display:"flex",alignItems:"center",gap:8}}>
                        <Avatar name={p.name} pts={p.pts} size={32} />
                        <div><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{p.name}</div><div style={{fontSize:10,color:"#666"}}>{p.pts}pts</div></div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:"#666",lineHeight:1.6}}>Desafían al ganador de cada cancha.<br/>Partidos cortos a <span style={{color:"#a78bfa",fontWeight:700}}>3 games ganados</span>.</div>
                </div>

                {rotations.map((rot,idx)=>{
                  if(idx>rotationStep) return null;
                  const courtMatch=matches[rot.courtId];
                  const opponent=rot.vsTeam??(courtMatch?.done?(parseInt(courtMatch?.score1??0)>parseInt(courtMatch?.score2??0)?courtMatch?.team1:courtMatch?.team2):null);
                  const canPlay=!!opponent&&!rot.done;
                  return (
                    <div key={rot.id} style={{background:rot.done?"#7c3aed12":"#ffffff07",border:rot.done?"1px solid #7c3aed33":"1px solid #ffffff10",borderRadius:14,padding:"14px",marginBottom:10}}>
                      <div style={{fontSize:10,color:"#a78bfa",fontWeight:700,letterSpacing:2,marginBottom:10}}>ROTACIÓN {rot.id+1} · CANCHA {rot.courtId+1}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:700,color:"#a78bfa",marginBottom:4}}>Rotativa</div>
                          {waitingPair.map(p=><div key={p.id} style={{fontSize:13,color:"#ddd",fontWeight:600}}>{p.name}</div>)}
                        </div>
                        <div style={{fontSize:11,color:"#333",fontWeight:800}}>VS</div>
                        <div style={{flex:1,textAlign:"right"}}>
                          <div style={{fontSize:12,fontWeight:700,color:"#00d4aa",marginBottom:4}}>Ganador cancha</div>
                          <div style={{fontSize:13,color:"#ddd",fontWeight:600}}>{opponent?.map(x=>x.name).join(" & ")??"Esperando..."}</div>
                        </div>
                      </div>
                      {rot.done?(
                        <div style={{textAlign:"center",fontSize:18,fontWeight:800,color:"#a78bfa",letterSpacing:4}}>{rot.wins1} — {rot.wins2} ✓</div>
                      ):canPlay&&isAdmin?(
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <input type="number" min="0" max="3" value={rot.score1} onChange={e=>handleRotationScore(rot.id,"1",e.target.value)} placeholder="0" style={{flex:1,background:"#7c3aed22",border:"1px solid #7c3aed44",borderRadius:8,padding:"10px",color:"#fff",fontSize:20,fontWeight:800,textAlign:"center",outline:"none"}} />
                          <span style={{color:"#333",fontWeight:800,fontSize:18}}>—</span>
                          <input type="number" min="0" max="3" value={rot.score2} onChange={e=>handleRotationScore(rot.id,"2",e.target.value)} placeholder="0" style={{flex:1,background:"#7c3aed22",border:"1px solid #7c3aed44",borderRadius:8,padding:"10px",color:"#fff",fontSize:20,fontWeight:800,textAlign:"center",outline:"none"}} />
                          <button onClick={()=>handleConfirmRotation(rot.id)} style={{background:"#7c3aed",border:"none",borderRadius:8,padding:"10px 16px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>✓ OK</button>
                        </div>
                      ):(
                        <div style={{textAlign:"center",fontSize:12,color:"#444",padding:"8px 0"}}>⏳ Esperando cancha {rot.courtId+1}…</div>
                      )}
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

    // ── RANKING ────────────────────────────────────────────────────────────────
    ranking: (
      <div style={{padding:"0 16px 16px"}}>
        <SectionLabel>RANKING TEMPORADA</SectionLabel>
        {ranking.length>=3&&(
          <div style={{display:"flex",gap:10,marginBottom:20,alignItems:"flex-end"}}>
            {[1,0,2].map(idx=>{
              const p=ranking[idx];
              const h=[80,100,70][idx===0?1:idx===1?0:2];
              const medals=["🥈","🥇","🥉"];
              return (
                <div key={p.id} style={{flex:1,textAlign:"center"}}>
                  <Avatar name={p.name} pts={p.pts} size={idx===1?48:38} />
                  <div style={{fontSize:12,color:"#fff",fontWeight:700,marginTop:6}}>{p.name}</div>
                  <div style={{fontSize:11,color:"#00d4aa",fontWeight:800}}>{p.pts}pts</div>
                  <div style={{marginTop:8,height:h,background:idx===1?"linear-gradient(180deg,#00d4aa,#00a382)":idx===0?"linear-gradient(180deg,#aaa,#777)":"linear-gradient(180deg,#cd7f32,#a05210)",borderRadius:"8px 8px 0 0",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:10,fontSize:20}}>
                    {medals[idx===0?1:idx===1?0:2]}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {ranking.map((p,i)=>(
          <div key={p.id} onClick={()=>isAdmin&&setEditingPlayer(p)} style={{display:"flex",alignItems:"center",gap:12,background:i===0?"#00d4aa0e":"#ffffff06",border:i===0?"1px solid #00d4aa2a":"1px solid #ffffff08",borderRadius:12,padding:"10px 14px",marginBottom:6,cursor:isAdmin?"pointer":"default"}}>
            <div style={{width:24,textAlign:"center",fontSize:i<3?16:12,fontWeight:700,color:i<3?["#ffd700","#c0c0c0","#cd7f32"][i]:"#333"}}>{i<3?["🥇","🥈","🥉"][i]:`#${p.rank}`}</div>
            <Avatar name={p.name} pts={p.pts} size={36} />
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{p.name}</div>
              <div style={{fontSize:10,color:"#444"}}>{p.wins}V · {p.matches-p.wins}D · {p.matches?Math.round(p.wins/p.matches*100):0}%</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:16,fontWeight:900,color:"#00d4aa"}}>{p.pts}</div>
              <LevelBadge pts={p.pts} />
            </div>
          </div>
        ))}
      </div>
    ),
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"'Segoe UI',sans-serif",background:"#0d0d1a",minHeight:"100vh",maxWidth:420,margin:"0 auto",display:"flex",flexDirection:"column",color:"#fff"}}>

      {/* Header */}
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

      {/* Toast */}
      {notification&&(
        <div style={{position:"fixed",top:62,left:"50%",transform:"translateX(-50%)",background:notification.color,color:"#fff",borderRadius:20,padding:"10px 20px",fontSize:13,fontWeight:700,zIndex:300,boxShadow:"0 8px 30px #0008",whiteSpace:"nowrap",maxWidth:"90vw"}}>
          {notification.msg}
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",paddingTop:16}}>{screens[tab]}</div>

      {/* Bottom nav */}
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
      {showUsersMgmt&&isAdmin&&<UsersMgmtModal users={users} onClose={()=>setShowUsersMgmt(false)} onSave={(updated)=>{ saveUser(updated).catch(console.error); notify("Usuario actualizado ✓"); }} notify={notify} />}

      <style>{`* { box-sizing:border-box; } ::-webkit-scrollbar { width:0; } input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; } input::placeholder { color:#444; }`}</style>
    </div>
  );
}
