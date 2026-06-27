import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── TEMA ─────────────────────────────────────────────────────────────────────
const T = {
  choco:"#3D1F1F", chocoM:"#6B3737", chocoL:"#9C6060",
  rosa:"#C4788A", rosaL:"#F2D0D9",
  creme:"#FBF5EF", cremedark:"#F0E6D9",
  borda:"#E8DDD5", branco:"#FFFFFF",
  verde:"#2E7D52", verdeL:"#E8F5EE",
  vermelho:"#C0392B", vermelhoL:"#FBEDED",
  azul:"#1A56A0", azulL:"#E8F0FB",
  amarelo:"#C9943A", amareloL:"#FEF3E2",
  roxo:"#6B3FA0", roxoL:"#F0EBF8",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const brl = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const pct = v => `${(v||0).toFixed(1)}%`;
const hoje = () => new Date().toLocaleDateString("pt-BR", {timeZone:"America/Sao_Paulo"}).split("/").reverse().join("-");
const horaAgora = () => new Date().toLocaleTimeString("pt-BR", {timeZone:"America/Sao_Paulo", hour:"2-digit", minute:"2-digit"});
// MARGEM REAL: preço = custo ÷ (1 - margem/100)
const precoFinal = p => p.custo / (1 - Math.min(p.margem,99) / 100);

const FORMAS_PGTO = [
  { id:"pix",      label:"Pix",           emoji:"💠" },
  { id:"dinheiro", label:"Dinheiro",       emoji:"💵" },
  { id:"debito",   label:"Cartão Débito",  emoji:"💳" },
  { id:"credito",  label:"Cartão Crédito", emoji:"💳" },
];

const UNIDADES = ["g","kg","ml","L","un"];

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────
function Card({children,style}){
  return <div style={{background:T.branco,borderRadius:16,padding:"18px 20px",boxShadow:"0 2px 12px rgba(61,31,31,.08)",...style}}>{children}</div>;
}
function Btn({children,onClick,variant="primary",style,disabled,loading}){
  const base={primary:{background:T.rosa,color:"#fff",border:"none"},
    secondary:{background:T.cremedark,color:T.choco,border:"none"},
    danger:{background:T.vermelhoL,color:T.vermelho,border:`1px solid #f5c6c6`},
    ghost:{background:"transparent",color:T.chocoM,border:`1.5px solid ${T.borda}`},
    dark:{background:T.choco,color:"#fff",border:"none"},
    verde:{background:T.verdeL,color:T.verde,border:`1.5px solid #b5d9c5`},
  };
  return <button onClick={onClick} disabled={disabled||loading}
    style={{...base[variant],borderRadius:10,padding:"10px 16px",cursor:(disabled||loading)?"not-allowed":"pointer",
      fontSize:13,fontWeight:600,fontFamily:"system-ui",opacity:(disabled||loading)?.55:1,...style}}>
    {loading?"⏳ Aguarde...":children}
  </button>;
}
function Input({label,value,onChange,type="text",placeholder,style,suffix}){
  return <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:12,color:T.chocoM,fontWeight:600,fontFamily:"system-ui"}}>
    {label}
    <div style={{position:"relative"}}>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{border:`1.5px solid ${T.borda}`,borderRadius:9,padding:`9px ${suffix?"36px":"12px"} 9px 12px`,
          fontSize:14,color:T.choco,background:T.creme,outline:"none",fontFamily:"system-ui",width:"100%",boxSizing:"border-box",...style}}/>
      {suffix&&<span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:T.chocoL,fontWeight:700}}>{suffix}</span>}
    </div>
  </label>;
}
function Select({label,value,onChange,options}){
  return <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:12,color:T.chocoM,fontWeight:600,fontFamily:"system-ui"}}>
    {label}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{border:`1.5px solid ${T.borda}`,borderRadius:9,padding:"9px 12px",fontSize:14,color:T.choco,background:T.creme,outline:"none",fontFamily:"system-ui"}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>;
}
function SubAba({abas,ativa,onChange}){
  return <div style={{display:"flex",gap:6,background:T.cremedark,borderRadius:12,padding:4}}>
    {abas.map(a=><button key={a.id} onClick={()=>onChange(a.id)}
      style={{flex:1,padding:"8px 0",border:"none",borderRadius:9,cursor:"pointer",
        fontFamily:"system-ui",fontSize:12,fontWeight:700,
        background:ativa===a.id?T.branco:"transparent",
        color:ativa===a.id?T.choco:T.chocoL,
        boxShadow:ativa===a.id?"0 1px 4px rgba(0,0,0,.1)":"none"}}>
      {a.emoji} {a.label}
    </button>)}
  </div>;
}
function Badge({label,cor,corFundo}){
  return <span style={{background:corFundo||T.rosaL,color:cor||T.chocoM,borderRadius:6,padding:"2px 8px",fontSize:10,fontFamily:"system-ui",fontWeight:700}}>{label}</span>;
}
function Secao({titulo,children}){
  return <div>
    <div style={{fontFamily:"system-ui",fontSize:10,color:T.chocoL,fontWeight:700,letterSpacing:.8,marginBottom:10,paddingBottom:6,borderBottom:`1px solid ${T.borda}`}}>{titulo}</div>
    {children}
  </div>;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function TelaAuth({onAuth}){
  const [modo,setModo]=useState("login");
  const [nome,setNome]=useState("");
  const [email,setEmail]=useState("");
  const [senha,setSenha]=useState("");
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState(null);

  async function handleLogin(){
    setLoading(true);setMsg(null);
    const {data,error}=await supabase.auth.signInWithPassword({email,password:senha});
    setLoading(false);
    if(error) return setMsg({t:"e",m:"E-mail ou senha incorretos."});
    onAuth(data.user);
  }
  async function handleCadastro(){
    if(!nome.trim()) return setMsg({t:"e",m:"Informe o nome da confeitaria."});
    setLoading(true);setMsg(null);
    const {data,error}=await supabase.auth.signUp({email,password:senha,options:{data:{nome_confeitaria:nome}}});
    setLoading(false);
    if(error) return setMsg({t:"e",m:error.message.includes("already")?"E-mail já cadastrado.":"Erro no cadastro."});
    setMsg({t:"ok",m:"✅ Cadastro realizado! Verifique seu e-mail."});
    setModo("login");
  }

  return <div style={{minHeight:"100vh",background:T.choco,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{textAlign:"center",marginBottom:28}}>
      <div style={{fontSize:48}}>🎂</div>
      <h1 style={{fontFamily:"Georgia,serif",fontSize:24,color:T.rosaL,margin:"6px 0 2px"}}>Caixa da Confeitaria</h1>
      <p style={{fontFamily:"system-ui",fontSize:12,color:"rgba(255,255,255,.4)",margin:0}}>Gestão financeira para doceiros</p>
    </div>
    <Card style={{width:"100%",maxWidth:360,padding:26}}>
      <div style={{display:"flex",gap:8,marginBottom:22}}>
        {["login","cadastro"].map(m=><button key={m} onClick={()=>{setModo(m);setMsg(null);}}
          style={{flex:1,padding:"9px 0",border:"none",borderRadius:9,cursor:"pointer",fontFamily:"system-ui",fontSize:13,fontWeight:700,
            background:modo===m?T.rosa:T.cremedark,color:modo===m?"#fff":T.chocoM}}>
          {m==="login"?"Entrar":"Criar conta"}
        </button>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:13}}>
        {modo==="cadastro"&&<Input label="Nome da confeitaria" value={nome} onChange={setNome} placeholder="Ex: Delicias di Doce"/>}
        <Input label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com"/>
        <Input label="Senha" type="password" value={senha} onChange={setSenha} placeholder="Mínimo 6 caracteres"/>
        {msg&&<div style={{background:msg.t==="e"?T.vermelhoL:T.verdeL,borderRadius:9,padding:"9px 12px",fontSize:13,color:msg.t==="e"?T.vermelho:T.verde,fontFamily:"system-ui",fontWeight:600}}>{msg.m}</div>}
        <Btn loading={loading} onClick={modo==="login"?handleLogin:handleCadastro} style={{marginTop:4}}>
          {modo==="login"?"Entrar":"Criar conta grátis"}
        </Btn>
      </div>
    </Card>
  </div>;
}

// ─── NAV PRINCIPAL ─────────────────────────────────────────────────────────────
function Nav({tela,setTela}){
  const abas=[
    {id:"dashboard",icon:"🏠",label:"Início"},
    {id:"caixa",icon:"💰",label:"Caixa"},
    {id:"precificacao",icon:"🎂",label:"Preços"},
    {id:"config",icon:"⚙️",label:"Config"},
  ];
  return <nav style={{display:"flex",justifyContent:"space-around",background:T.choco,padding:"10px 0 8px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,.25)"}}>
    {abas.map(a=><button key={a.id} onClick={()=>setTela(a.id)}
      style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 8px"}}>
      <span style={{fontSize:20}}>{a.icon}</span>
      <span style={{fontSize:10,color:tela===a.id?T.rosaL:"rgba(255,255,255,.5)",fontWeight:tela===a.id?700:400,fontFamily:"system-ui"}}>{a.label}</span>
      {tela===a.id&&<span style={{width:20,height:2,background:T.rosa,borderRadius:2}}/>}
    </button>)}
  </nav>;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({user,vendas,despesas,produtos,setTela,onLogout}){
  const nome=user?.user_metadata?.nome_confeitaria||"Confeitaria";
  const totalV=vendas.reduce((s,v)=>s+v.total,0);
  const totalD=despesas.reduce((s,d)=>s+d.valor,0);
  const saldo=totalV-totalD;
  const vendasHoje=vendas.filter(v=>v.data===hoje()).reduce((s,v)=>s+v.total,0);

  const maisVendido=useMemo(()=>{
    const cnt={};
    vendas.forEach(v=>{cnt[v.produto_id]=(cnt[v.produto_id]||0)+v.qtd;});
    const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
    if(!top) return null;
    const p=produtos.find(x=>x.id===top[0]);
    return p?`${p.nome} (${top[1]}x)`:null;
  },[vendas,produtos]);

  const kpis=[
    {label:"Saldo atual",valor:brl(saldo),cor:saldo>=0?T.verde:T.vermelho,icone:"💳"},
    {label:"Vendas hoje",valor:brl(vendasHoje),cor:T.rosa,icone:"🛍️"},
    {label:"Total vendido",valor:brl(totalV),cor:T.chocoM,icone:"📈"},
    {label:"Total despesas",valor:brl(totalD),cor:T.vermelho,icone:"📤"},
  ];

  return <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:20}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <h1 style={{fontFamily:"Georgia,serif",fontSize:20,color:T.choco,margin:"0 0 2px"}}>{nome}</h1>
        <p style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,margin:0}}>
          {new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}
        </p>
      </div>
      <button onClick={onLogout} style={{background:T.cremedark,border:"none",borderRadius:9,padding:"7px 12px",cursor:"pointer",fontSize:12,color:T.chocoM,fontFamily:"system-ui",fontWeight:600}}>Sair</button>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {kpis.map(k=><Card key={k.label} style={{padding:"14px 14px"}}>
        <div style={{fontSize:20,marginBottom:6}}>{k.icone}</div>
        <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:700,color:k.cor}}>{k.valor}</div>
        <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,marginTop:2}}>{k.label}</div>
      </Card>)}
    </div>

    {maisVendido&&<Card style={{background:T.rosaL,padding:"12px 16px"}}>
      <div style={{fontFamily:"system-ui",fontSize:10,color:T.chocoM,fontWeight:700,marginBottom:3}}>⭐ PRODUTO DESTAQUE</div>
      <div style={{fontFamily:"Georgia,serif",fontSize:14,color:T.choco}}>{maisVendido}</div>
    </Card>}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <Btn variant="primary" onClick={()=>setTela("caixa")}>💰 Nova Venda</Btn>
      <Btn variant="ghost" onClick={()=>setTela("precificacao")}>🎂 Precificação</Btn>
    </div>

    <Secao titulo="ÚLTIMAS VENDAS">
      {vendas.length===0&&<p style={{fontFamily:"system-ui",fontSize:13,color:T.chocoM}}>Nenhuma venda ainda.</p>}
      {[...vendas].reverse().slice(0,5).map(v=>{
        const p=produtos.find(x=>x.id===v.produto_id);
        const fp=FORMAS_PGTO.find(f=>f.id===v.forma_pgto);
        return <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.borda}`}}>
          <div>
            <div style={{fontFamily:"system-ui",fontSize:13,color:T.choco,fontWeight:600}}>{p?.nome||"Produto removido"}</div>
            <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM}}>{v.qtd}x · {fp?.emoji||""} {fp?.label||""} · {v.data}</div>
          </div>
          <div style={{fontFamily:"Georgia,serif",fontSize:14,color:T.verde,fontWeight:700}}>{brl(v.total)}</div>
        </div>;
      })}
    </Secao>
  </div>;
}

// ─── CAIXA ────────────────────────────────────────────────────────────────────
function Caixa({userId,vendas,despesas,produtos,onNovaVenda,onNovaDespesa}){
  const [aba,setAba]=useState("venda");
  const [produtoId,setProdutoId]=useState("");
  const [qtd,setQtd]=useState("1");
  const [formaPgto,setFormaPgto]=useState("pix");
  const [descricao,setDescricao]=useState("");
  const [valor,setValor]=useState("");
  const [formaPgtoD,setFormaPgtoD]=useState("pix");
  const [fotoCupom,setFotoCupom]=useState(null);
  const [loading,setLoading]=useState(false);
  const [modalFoto,setModalFoto]=useState(null);

  const prodSel=produtos.find(p=>p.id===produtoId);
  const totalV=prodSel?precoFinal(prodSel)*parseInt(qtd||1):0;
  const totalVendasHoje=vendas.filter(v=>v.data===hoje()).reduce((s,v)=>s+v.total,0);
  const totalDespHoje=despesas.filter(d=>d.data===hoje()).reduce((s,d)=>s+d.valor,0);

  async function registrarVenda(){
    if(!produtoId||!qtd) return;
    setLoading(true);
    const {data,error}=await supabase.from("vendas").insert({
      user_id:userId,produto_id:produtoId,qtd:parseInt(qtd),
      total:parseFloat(totalV.toFixed(2)),data:hoje(),hora:horaAgora(),forma_pgto:formaPgto
    }).select().single();
    setLoading(false);
    if(!error){onNovaVenda(data);setProdutoId("");setQtd("1");setFormaPgto("pix");}
  }

  async function registrarDespesa(){
    if(!descricao.trim()||!valor) return;
    setLoading(true);
    let cupom_url=null;
    if(fotoCupom){
      const ext=fotoCupom.name.split(".").pop();
      const path=`${userId}/${Date.now()}.${ext}`;
      const {error:upErr}=await supabase.storage.from("cupons").upload(path,fotoCupom);
      if(!upErr) cupom_url=path;
    }
    const {data,error}=await supabase.from("despesas").insert({
      user_id:userId,descricao,valor:parseFloat(valor),data:hoje(),hora:horaAgora(),forma_pgto:formaPgtoD,cupom_url
    }).select().single();
    setLoading(false);
    if(!error){onNovaDespesa(data);setDescricao("");setValor("");setFormaPgtoD("pix");setFotoCupom(null);}
  }

  async function verFoto(path){
    const {data}=await supabase.storage.from("cupons").createSignedUrl(path,60);
    if(data?.signedUrl) setModalFoto(data.signedUrl);
  }

  return <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:18}}>
    <h2 style={{fontFamily:"Georgia,serif",fontSize:20,color:T.choco,margin:0}}>💰 Caixa</h2>
    <SubAba abas={[{id:"venda",emoji:"🛍️",label:"Venda"},{id:"despesa",emoji:"📤",label:"Despesa"},{id:"historico",emoji:"📋",label:"Hoje"}]} ativa={aba} onChange={setAba}/>

    {aba==="venda"&&<Card>
      <div style={{display:"flex",flexDirection:"column",gap:13}}>
        <Select label="Produto" value={produtoId} onChange={setProdutoId}
          options={[{value:"",label:"Selecione..."},{...produtos.map(p=>({value:p.id,label:`${p.nome} · ${brl(precoFinal(p))}`}))},...produtos.map(p=>({value:p.id,label:`${p.nome} · ${brl(precoFinal(p))}`}))].filter((o,i,a)=>a.findIndex(x=>x.value===o.value)===i)}/>
        <Input label="Quantidade" type="number" value={qtd} onChange={setQtd} placeholder="1"/>

        <div>
          <div style={{fontFamily:"system-ui",fontSize:12,color:T.chocoM,fontWeight:600,marginBottom:8}}>Forma de recebimento</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {FORMAS_PGTO.map(f=><button key={f.id} onClick={()=>setFormaPgto(f.id)}
              style={{padding:"9px 8px",border:`2px solid ${formaPgto===f.id?T.rosa:T.borda}`,borderRadius:10,cursor:"pointer",
                background:formaPgto===f.id?T.rosaL:T.branco,fontFamily:"system-ui",fontSize:12,fontWeight:700,color:formaPgto===f.id?T.rosa:T.chocoM}}>
              {f.emoji} {f.label}
            </button>)}
          </div>
        </div>

        {prodSel&&<div style={{background:T.rosaL,borderRadius:10,padding:"12px 14px"}}>
          <div style={{fontFamily:"system-ui",fontSize:10,color:T.chocoM,fontWeight:700}}>TOTAL A RECEBER</div>
          <div style={{fontFamily:"Georgia,serif",fontSize:24,color:T.rosa,fontWeight:700}}>{brl(totalV)}</div>
          <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,marginTop:2}}>{qtd}x {brl(precoFinal(prodSel))} · margem real {prodSel.margem}%</div>
        </div>}
        <Btn loading={loading} onClick={registrarVenda} disabled={!produtoId}>✓ Confirmar Venda</Btn>
      </div>
    </Card>}

    {aba==="despesa"&&<Card>
      <div style={{display:"flex",flexDirection:"column",gap:13}}>
        <Input label="Descrição" value={descricao} onChange={setDescricao} placeholder="Ex: Farinha, embalagens..."/>
        <Input label="Valor (R$)" type="number" value={valor} onChange={setValor} placeholder="0,00"/>
        <div>
          <div style={{fontFamily:"system-ui",fontSize:12,color:T.chocoM,fontWeight:600,marginBottom:8}}>Forma de pagamento</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {FORMAS_PGTO.map(f=><button key={f.id} onClick={()=>setFormaPgtoD(f.id)}
              style={{padding:"9px 8px",border:`2px solid ${formaPgtoD===f.id?T.vermelho:T.borda}`,borderRadius:10,cursor:"pointer",
                background:formaPgtoD===f.id?T.vermelhoL:T.branco,fontFamily:"system-ui",fontSize:12,fontWeight:700,color:formaPgtoD===f.id?T.vermelho:T.chocoM}}>
              {f.emoji} {f.label}
            </button>)}
          </div>
        </div>
        <div>
          <div style={{fontFamily:"system-ui",fontSize:12,color:T.chocoM,fontWeight:600,marginBottom:8}}>Cupom fiscal (opcional)</div>
          <label style={{display:"flex",alignItems:"center",gap:10,background:fotoCupom?T.verdeL:T.cremedark,border:`1.5px dashed ${fotoCupom?T.verde:T.borda}`,borderRadius:10,padding:"10px 14px",cursor:"pointer"}}>
            <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>setFotoCupom(e.target.files[0]||null)}/>
            <span style={{fontSize:20}}>{fotoCupom?"✅":"📷"}</span>
            <span style={{fontFamily:"system-ui",fontSize:13,fontWeight:600,color:fotoCupom?T.verde:T.chocoM}}>
              {fotoCupom?`${fotoCupom.name.slice(0,25)}...`:"Tirar foto ou escolher da galeria"}
            </span>
            {fotoCupom&&<button onClick={e=>{e.preventDefault();setFotoCupom(null);}} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:16,color:T.chocoL}}>✕</button>}
          </label>
        </div>
        <Btn variant="danger" loading={loading} onClick={registrarDespesa} disabled={!descricao||!valor}>📤 Registrar Despesa</Btn>
      </div>
    </Card>}

    {modalFoto&&<div onClick={()=>setModalFoto(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{position:"relative",maxWidth:400,width:"100%"}}>
        <img src={modalFoto} alt="Cupom" style={{width:"100%",borderRadius:12,display:"block"}}/>
        <button onClick={()=>setModalFoto(null)} style={{position:"absolute",top:-12,right:-12,width:32,height:32,borderRadius:"50%",background:T.vermelho,border:"none",color:"#fff",fontSize:16,cursor:"pointer",fontWeight:700}}>✕</button>
        <p style={{textAlign:"center",color:"rgba(255,255,255,.6)",fontFamily:"system-ui",fontSize:12,marginTop:10}}>Toque fora para fechar</p>
      </div>
    </div>}

    {aba==="historico"&&<>
      <Card style={{background:T.choco}}>
        <div style={{fontFamily:"system-ui",fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:700,marginBottom:10}}>RESUMO DE HOJE</div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontFamily:"system-ui",fontSize:13,color:"rgba(255,255,255,.7)"}}>Vendas</span>
          <span style={{fontFamily:"Georgia,serif",fontSize:14,color:"#7fe8b0",fontWeight:700}}>+{brl(totalVendasHoje)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <span style={{fontFamily:"system-ui",fontSize:13,color:"rgba(255,255,255,.7)"}}>Despesas</span>
          <span style={{fontFamily:"Georgia,serif",fontSize:14,color:"#f99",fontWeight:700}}>-{brl(totalDespHoje)}</span>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,.1)",paddingTop:10,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontFamily:"system-ui",fontSize:13,color:"rgba(255,255,255,.9)",fontWeight:700}}>Líquido</span>
          <span style={{fontFamily:"Georgia,serif",fontSize:18,color:totalVendasHoje-totalDespHoje>=0?"#7fe8b0":"#f99",fontWeight:700}}>{brl(totalVendasHoje-totalDespHoje)}</span>
        </div>
      </Card>

      {/* por forma de pagamento */}
      <Card>
        <div style={{fontFamily:"system-ui",fontSize:10,color:T.chocoL,fontWeight:700,marginBottom:10}}>RECEBIMENTOS HOJE POR FORMA</div>
        {FORMAS_PGTO.map(f=>{
          const tot=vendas.filter(v=>v.data===hoje()&&v.forma_pgto===f.id).reduce((s,v)=>s+v.total,0);
          if(!tot) return null;
          return <div key={f.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.borda}`}}>
            <span style={{fontFamily:"system-ui",fontSize:13,color:T.choco}}>{f.emoji} {f.label}</span>
            <span style={{fontFamily:"Georgia,serif",fontSize:13,color:T.verde,fontWeight:700}}>{brl(tot)}</span>
          </div>;
        })}
      </Card>

      <Card>
        <div style={{fontFamily:"system-ui",fontSize:10,color:T.chocoL,fontWeight:700,marginBottom:10}}>DESPESAS DE HOJE</div>
        {despesas.filter(d=>d.data===hoje()).length===0&&<p style={{fontFamily:"system-ui",fontSize:13,color:T.chocoM}}>Nenhuma despesa hoje.</p>}
        {despesas.filter(d=>d.data===hoje()).map(d=>{
          const fp=FORMAS_PGTO.find(f=>f.id===d.forma_pgto);
          return <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.borda}`}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:"system-ui",fontSize:13,color:T.choco,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                {d.descricao}
                {d.cupom_url&&<button onClick={()=>verFoto(d.cupom_url)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,padding:0}} title="Ver cupom">🧾</button>}
              </div>
              <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM}}>{fp?.emoji} {fp?.label} · {d.hora}</div>
            </div>
            <span style={{fontFamily:"Georgia,serif",fontSize:13,color:T.vermelho,fontWeight:700}}>-{brl(d.valor)}</span>
          </div>;
        })}
      </Card>
    </>}
  </div>;
}

// ─── INSUMOS ──────────────────────────────────────────────────────────────────
function Insumos({userId,insumos,onSalvar,onExcluir}){
  const [nome,setNome]=useState("");
  const [unidade,setUnidade]=useState("g");
  const [qtdEmb,setQtdEmb]=useState("");
  const [precoEmb,setPrecoEmb]=useState("");
  const [editId,setEditId]=useState(null);
  const [loading,setLoading]=useState(false);

  const custoPorUnidade = (qtdEmb&&precoEmb) ? parseFloat(precoEmb)/parseFloat(qtdEmb) : null;

  async function salvar(){
    if(!nome.trim()||!qtdEmb||!precoEmb) return;
    setLoading(true);
    const payload={user_id:userId,nome,unidade,qtd_embalagem:parseFloat(qtdEmb),preco_embalagem:parseFloat(precoEmb)};
    let result;
    if(editId){
      const {data}=await supabase.from("insumos").update(payload).eq("id",editId).select().single();
      result={data,edit:true};
    } else {
      const {data}=await supabase.from("insumos").insert(payload).select().single();
      result={data,edit:false};
    }
    setLoading(false);
    if(result.data){onSalvar(result.data,result.edit);limpar();}
  }

  async function excluir(id){
    await supabase.from("insumos").delete().eq("id",id);
    onExcluir(id);
  }

  function editar(i){
    setEditId(i.id);setNome(i.nome);setUnidade(i.unidade);
    setQtdEmb(String(i.qtd_embalagem));setPrecoEmb(String(i.preco_embalagem));
  }

  function limpar(){setEditId(null);setNome("");setUnidade("g");setQtdEmb("");setPrecoEmb("");}

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <Card style={{border:editId?`2px solid ${T.rosa}`:"none"}}>
      <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,fontWeight:700,marginBottom:12,letterSpacing:.5}}>
        {editId?"✏️ EDITANDO INSUMO":"➕ NOVO INSUMO"}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:11}}>
        <Input label="Nome do insumo" value={nome} onChange={setNome} placeholder="Ex: Chocolate em pó"/>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
          <Input label="Qtd da embalagem" type="number" value={qtdEmb} onChange={setQtdEmb} placeholder="400"/>
          <Select label="Unidade" value={unidade} onChange={setUnidade} options={UNIDADES.map(u=>({value:u,label:u}))}/>
        </div>
        <Input label="Preço da embalagem (R$)" type="number" value={precoEmb} onChange={setPrecoEmb} placeholder="18,00"/>

        {custoPorUnidade!==null&&<div style={{background:T.amareloL,borderRadius:10,padding:"10px 14px"}}>
          <div style={{fontFamily:"system-ui",fontSize:10,color:T.amarelo,fontWeight:700}}>CUSTO POR {unidade.toUpperCase()}</div>
          <div style={{fontFamily:"Georgia,serif",fontSize:18,color:T.amarelo,fontWeight:700}}>
            R$ {custoPorUnidade.toFixed(4)}
          </div>
          <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,marginTop:1}}>
            {brl(parseFloat(precoEmb))} ÷ {qtdEmb}{unidade}
          </div>
        </div>}

        <div style={{display:"flex",gap:8}}>
          <Btn loading={loading} style={{flex:1}} onClick={salvar} disabled={!nome||!qtdEmb||!precoEmb}>
            {editId?"✓ Salvar":"➕ Adicionar"}
          </Btn>
          {editId&&<Btn variant="ghost" onClick={limpar}>Cancelar</Btn>}
        </div>
      </div>
    </Card>

    <Secao titulo={`INSUMOS CADASTRADOS (${insumos.length})`}>
      {insumos.length===0&&<p style={{fontFamily:"system-ui",fontSize:13,color:T.chocoM,padding:"8px 0"}}>Nenhum insumo cadastrado ainda.</p>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {insumos.map(i=>{
          const cpu=i.preco_embalagem/i.qtd_embalagem;
          return <Card key={i.id} style={{padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontFamily:"system-ui",fontSize:13,color:T.choco,fontWeight:700}}>{i.nome}</div>
                <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,marginTop:2}}>
                  Embalagem: {i.qtd_embalagem}{i.unidade} por {brl(i.preco_embalagem)}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"Georgia,serif",fontSize:14,color:T.amarelo,fontWeight:700}}>R$ {cpu.toFixed(4)}</div>
                <div style={{fontFamily:"system-ui",fontSize:10,color:T.chocoL}}>por {i.unidade}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn variant="ghost" style={{flex:1,padding:"6px 0",fontSize:11}} onClick={()=>editar(i)}>✏️ Editar</Btn>
              <Btn variant="danger" style={{flex:1,padding:"6px 0",fontSize:11}} onClick={()=>excluir(i.id)}>🗑️ Excluir</Btn>
            </div>
          </Card>;
        })}
      </div>
    </Secao>
  </div>;
}

// ─── PRODUTOS (precificação simples) ──────────────────────────────────────────
function Produtos({userId,produtos,onSalvar,onExcluir}){
  const [nome,setNome]=useState("");
  const [custo,setCusto]=useState("");
  const [margem,setMargem]=useState("30");
  const [categoria,setCategoria]=useState("Doces");
  const [editId,setEditId]=useState(null);
  const [loading,setLoading]=useState(false);

  const categorias=["Doces","Bolos","Tortas","Salgados","Bebidas","Outro"];
  const preview=custo&&margem?parseFloat(custo)/(1-Math.min(parseFloat(margem),99)/100):null;
  const lucro=preview&&custo?preview-parseFloat(custo):null;

  async function salvar(){
    if(!nome.trim()||!custo) return;
    setLoading(true);
    const payload={user_id:userId,nome,custo:parseFloat(custo),margem:parseFloat(margem),categoria};
    let result;
    if(editId){
      const {data}=await supabase.from("produtos").update(payload).eq("id",editId).select().single();
      result={data,edit:true};
    } else {
      const {data}=await supabase.from("produtos").insert(payload).select().single();
      result={data,edit:false};
    }
    setLoading(false);
    if(result.data){onSalvar(result.data,result.edit);limpar();}
  }

  async function excluir(id){
    await supabase.from("produtos").delete().eq("id",id);
    onExcluir(id);
  }

  function editar(p){setEditId(p.id);setNome(p.nome);setCusto(String(p.custo));setMargem(String(p.margem));setCategoria(p.categoria);}
  function limpar(){setEditId(null);setNome("");setCusto("");setMargem("30");setCategoria("Doces");}

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <Card style={{border:editId?`2px solid ${T.rosa}`:"none"}}>
      <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,fontWeight:700,marginBottom:12,letterSpacing:.5}}>
        {editId?"✏️ EDITANDO PRODUTO":"➕ NOVO PRODUTO"}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:11}}>
        <Input label="Nome do produto" value={nome} onChange={setNome} placeholder="Ex: Bolo de Chocolate"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Input label="Custo total (R$)" type="number" value={custo} onChange={setCusto} placeholder="0,00"/>
          <Input label="Margem real (%)" type="number" value={margem} onChange={setMargem} placeholder="30" suffix="%"/>
        </div>
        <Select label="Categoria" value={categoria} onChange={setCategoria} options={categorias.map(c=>({value:c,label:c}))}/>

        {preview!==null&&<div style={{background:T.rosaL,borderRadius:10,padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontFamily:"system-ui",fontSize:10,color:T.chocoM,fontWeight:700}}>PREÇO DE VENDA</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:22,color:T.rosa,fontWeight:700}}>{brl(preview)}</div>
              <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,marginTop:2}}>custo ÷ (1 - {margem}%)</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"system-ui",fontSize:10,color:T.chocoM,fontWeight:700}}>LUCRO REAL</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:16,color:T.verde,fontWeight:700}}>{brl(lucro)}</div>
              <div style={{fontFamily:"system-ui",fontSize:11,color:T.verde}}>{margem}% do preço</div>
            </div>
          </div>
        </div>}

        <div style={{display:"flex",gap:8}}>
          <Btn loading={loading} style={{flex:1}} onClick={salvar} disabled={!nome||!custo}>{editId?"✓ Salvar":"➕ Adicionar"}</Btn>
          {editId&&<Btn variant="ghost" onClick={limpar}>Cancelar</Btn>}
        </div>
      </div>
    </Card>

    <Secao titulo={`CARDÁPIO (${produtos.length} produtos)`}>
      {produtos.length===0&&<p style={{fontFamily:"system-ui",fontSize:13,color:T.chocoM}}>Nenhum produto cadastrado.</p>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {produtos.map(p=>{
          const pv=precoFinal(p);
          const lv=pv-p.custo;
          return <Card key={p.id} style={{padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:"system-ui",fontSize:13,color:T.choco,fontWeight:700}}>{p.nome}</div>
                <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,marginTop:2}}>Custo: {brl(p.custo)} · Margem: {p.margem}%</div>
                <Badge label={p.categoria}/>
              </div>
              <div style={{textAlign:"right",marginLeft:10}}>
                <div style={{fontFamily:"Georgia,serif",fontSize:17,color:T.rosa,fontWeight:700}}>{brl(pv)}</div>
                <div style={{fontFamily:"system-ui",fontSize:10,color:T.verde,fontWeight:600}}>+{brl(lv)} lucro</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn variant="ghost" style={{flex:1,padding:"6px 0",fontSize:11}} onClick={()=>editar(p)}>✏️ Editar</Btn>
              <Btn variant="danger" style={{flex:1,padding:"6px 0",fontSize:11}} onClick={()=>excluir(p.id)}>🗑️ Excluir</Btn>
            </div>
          </Card>;
        })}
      </div>
    </Secao>
  </div>;
}

// ─── PRECIFICAÇÃO (container com subabas) ─────────────────────────────────────
function Precificacao({userId,produtos,insumos,onSalvarProduto,onExcluirProduto,onSalvarInsumo,onExcluirInsumo}){
  const [sub,setSub]=useState("produtos");
  return <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>
    <h2 style={{fontFamily:"Georgia,serif",fontSize:20,color:T.choco,margin:0}}>🎂 Precificação</h2>
    <SubAba
      abas={[{id:"produtos",emoji:"🎂",label:"Produtos"},{id:"insumos",emoji:"🧂",label:"Insumos"}]}
      ativa={sub} onChange={setSub}/>
    {sub==="produtos"&&<Produtos userId={userId} produtos={produtos} onSalvar={onSalvarProduto} onExcluir={onExcluirProduto}/>}
    {sub==="insumos"&&<Insumos userId={userId} insumos={insumos} onSalvar={onSalvarInsumo} onExcluir={onExcluirInsumo}/>}
  </div>;
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────
function Config({userId,config,onSalvar}){
  const [salario,setSalario]=useState(String(config?.salario_mensal||""));
  const [horas,setHoras]=useState(String(config?.horas_mes||""));
  const [custosFixos,setCustosFixos]=useState(String(config?.custos_fixos_mes||""));
  const [loading,setLoading]=useState(false);
  const [salvo,setSalvo]=useState(false);

  const valorHora=salario&&horas?parseFloat(salario)/parseFloat(horas):null;
  const valorMin=valorHora?valorHora/60:null;

  async function salvar(){
    setLoading(true);
    const payload={user_id:userId,salario_mensal:parseFloat(salario)||0,horas_mes:parseFloat(horas)||0,custos_fixos_mes:parseFloat(custosFixos)||0};
    const {data:existing}=await supabase.from("config_confeitaria").select("id").eq("user_id",userId).single();
    let data;
    if(existing){
      const r=await supabase.from("config_confeitaria").update(payload).eq("user_id",userId).select().single();
      data=r.data;
    } else {
      const r=await supabase.from("config_confeitaria").insert(payload).select().single();
      data=r.data;
    }
    setLoading(false);
    if(data){onSalvar(data);setSalvo(true);setTimeout(()=>setSalvo(false),2500);}
  }

  return <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:20}}>
    <h2 style={{fontFamily:"Georgia,serif",fontSize:20,color:T.choco,margin:0}}>⚙️ Configurações</h2>

    <Card>
      <Secao titulo="MÃO DE OBRA">
        <div style={{display:"flex",flexDirection:"column",gap:11,marginTop:8}}>
          <Input label="Salário / pró-labore mensal (R$)" type="number" value={salario} onChange={setSalario} placeholder="1.500,00"/>
          <Input label="Horas trabalhadas no mês" type="number" value={horas} onChange={setHoras} placeholder="160"/>
          {valorHora&&<div style={{background:T.amareloL,borderRadius:10,padding:"10px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div>
                <div style={{fontFamily:"system-ui",fontSize:10,color:T.amarelo,fontWeight:700}}>CUSTO POR HORA</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:18,color:T.amarelo,fontWeight:700}}>{brl(valorHora)}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"system-ui",fontSize:10,color:T.amarelo,fontWeight:700}}>CUSTO POR MINUTO</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:18,color:T.amarelo,fontWeight:700}}>R$ {valorMin.toFixed(4)}</div>
              </div>
            </div>
          </div>}
        </div>
      </Secao>
    </Card>

    <Card>
      <Secao titulo="CUSTOS FIXOS MENSAIS">
        <div style={{marginTop:8}}>
          <Input label="Total de custos fixos/mês (R$)" type="number" value={custosFixos} onChange={setCustosFixos} placeholder="Ex: aluguel + luz + gás = 800,00"/>
          <p style={{fontFamily:"system-ui",fontSize:11,color:T.chocoL,marginTop:8,lineHeight:1.5}}>
            Inclua: aluguel, energia, gás, internet, embalagens fixas, etc. Esse valor será rateado nas fichas técnicas das receitas.
          </p>
        </div>
      </Secao>
    </Card>

    {salvo&&<div style={{background:T.verdeL,borderRadius:10,padding:"10px 14px",fontFamily:"system-ui",fontSize:13,color:T.verde,fontWeight:700,textAlign:"center"}}>
      ✅ Configurações salvas!
    </div>}
    <Btn loading={loading} onClick={salvar} disabled={!salario||!horas}>💾 Salvar configurações</Btn>

    <Card style={{background:T.cremedark}}>
      <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,fontWeight:700,marginBottom:8}}>🔜 EM BREVE</div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {["Taxas de plataformas (iFood, 99food...)","Taxas de cartão (débito/crédito)","Ficha técnica completa com DRE","Relatório mensal PDF"].map(item=>
          <div key={item} style={{fontFamily:"system-ui",fontSize:12,color:T.chocoL,display:"flex",alignItems:"center",gap:6}}>
            <span>⏳</span>{item}
          </div>
        )}
      </div>
    </Card>
  </div>;
}

// ─── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [tela,setTela]=useState("dashboard");
  const [produtos,setProdutos]=useState([]);
  const [vendas,setVendas]=useState([]);
  const [despesas,setDespesas]=useState([]);
  const [insumos,setInsumos]=useState([]);
  const [config,setConfig]=useState(null);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user??null);setLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>setUser(session?.user??null));
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!user) return;
    async function load(){
      const [p,v,d,i,c]=await Promise.all([
        supabase.from("produtos").select("*").eq("user_id",user.id).order("created_at"),
        supabase.from("vendas").select("*").eq("user_id",user.id).order("data").order("hora"),
        supabase.from("despesas").select("*").eq("user_id",user.id).order("data").order("hora"),
        supabase.from("insumos").select("*").eq("user_id",user.id).order("nome"),
        supabase.from("config_confeitaria").select("*").eq("user_id",user.id).single(),
      ]);
      setProdutos(p.data||[]);
      setVendas(v.data||[]);
      setDespesas(d.data||[]);
      setInsumos(i.data||[]);
      setConfig(c.data||null);
    }
    load();
  },[user]);

  async function handleLogout(){
    await supabase.auth.signOut();
    setUser(null);setProdutos([]);setVendas([]);setDespesas([]);setInsumos([]);setConfig(null);
  }

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.choco}}>
    <div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>🎂</div>
    <div style={{fontFamily:"system-ui",fontSize:14,color:"rgba(255,255,255,.5)"}}>Carregando...</div></div>
  </div>;

  if(!user) return <TelaAuth onAuth={setUser}/>;

  return <div style={{maxWidth:430,margin:"0 auto",background:T.creme,minHeight:"100vh"}}>
    <Nav tela={tela} setTela={setTela}/>
    <div style={{paddingBottom:40}}>
      {tela==="dashboard"&&<Dashboard user={user} vendas={vendas} despesas={despesas} produtos={produtos} setTela={setTela} onLogout={handleLogout}/>}
      {tela==="caixa"&&<Caixa userId={user.id} vendas={vendas} despesas={despesas} produtos={produtos}
        onNovaVenda={v=>setVendas(p=>[...p,v])} onNovaDespesa={d=>setDespesas(p=>[...p,d])}/>}
      {tela==="precificacao"&&<Precificacao userId={user.id} produtos={produtos} insumos={insumos}
        onSalvarProduto={(p,e)=>setProdutos(prev=>e?prev.map(x=>x.id===p.id?p:x):[...prev,p])}
        onExcluirProduto={id=>setProdutos(p=>p.filter(x=>x.id!==id))}
        onSalvarInsumo={(i,e)=>setInsumos(prev=>e?prev.map(x=>x.id===i.id?i:x):[...prev,i])}
        onExcluirInsumo={id=>setInsumos(p=>p.filter(x=>x.id!==id))}/>}
      {tela==="config"&&<Config userId={user.id} config={config} onSalvar={c=>setConfig(c)}/>}
    </div>
  </div>;
}
