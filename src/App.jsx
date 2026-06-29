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

// ─── SALDO MODAL ─────────────────────────────────────────────────────────────
function SaldoModal({userId,anoAtual,mesAtual,saldoAtual,onSalvar,onFechar}){
  const [valor,setValor]=useState(String(saldoAtual||"0"));
  const [loading,setLoading]=useState(false);
  const meses=["","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  async function salvar(){
    setLoading(true);
    const payload={user_id:userId,ano:anoAtual,mes:mesAtual,saldo_inicial:parseFloat(valor)||0};
    const {data}=await supabase.from("saldo_mensal").upsert(payload,{onConflict:"user_id,ano,mes"}).select().single();
    setLoading(false);
    if(data) onSalvar(data);
  }

  return <div style={{position:"fixed",inset:0,background:"rgba(61,31,31,.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <Card style={{width:"100%",maxWidth:360,padding:28}}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:36,marginBottom:8}}>💰</div>
        <h2 style={{fontFamily:"Georgia,serif",fontSize:18,color:T.choco,margin:"0 0 6px"}}>Saldo inicial de {meses[mesAtual]}</h2>
        <p style={{fontFamily:"system-ui",fontSize:13,color:T.chocoM,margin:0,lineHeight:1.5}}>
          Informe quanto você tem em caixa agora para começar o mês com o saldo correto.
        </p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Input label="Saldo atual em caixa (R$)" type="number" value={valor} onChange={setValor} placeholder="0,00"/>
        <div style={{background:T.amareloL,borderRadius:10,padding:"10px 14px",fontFamily:"system-ui",fontSize:12,color:T.amarelo,lineHeight:1.5}}>
          💡 Se nunca usou o sistema antes, informe o dinheiro que tem disponível agora.
        </div>
        <Btn loading={loading} onClick={salvar} disabled={!valor}>✓ Confirmar saldo inicial</Btn>
        <button onClick={onFechar} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"system-ui",fontSize:12,color:T.chocoL,textDecoration:"underline"}}>
          Pular por enquanto
        </button>
      </div>
    </Card>
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
    {id:"relatorio",icon:"📊",label:"Relatório"},
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
function Dashboard({user,vendas,despesas,produtos,ajustes,saldoInicial,saldoAtual,totalVendasMes,totalDespMes,totalAjustesMes,setTela,onLogout,onAbrirSaldo}){
  const nome=user?.user_metadata?.nome_confeitaria||"Confeitaria";
  const vendasHoje=vendas.filter(v=>v.data===hoje()).reduce((s,v)=>s+v.total,0);

  const maisVendido=useMemo(()=>{
    const cnt={};
    vendas.forEach(v=>{cnt[v.produto_id]=(cnt[v.produto_id]||0)+v.qtd;});
    const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
    if(!top) return null;
    const p=produtos.find(x=>x.id===top[0]);
    return p?`${p.nome} (${top[1]}x)`:null;
  },[vendas,produtos]);

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

    {/* Saldo do mês */}
    <Card style={{background:T.choco,padding:"16px 18px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div style={{fontFamily:"system-ui",fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:700,letterSpacing:.5}}>SALDO DO MÊS</div>
        <button onClick={onAbrirSaldo} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontFamily:"system-ui",fontSize:11,color:"rgba(255,255,255,.7)",fontWeight:600}}>⚙ Ajustar</button>
      </div>
      <div style={{fontFamily:"Georgia,serif",fontSize:28,color:saldoAtual>=0?"#7fe8b0":"#f99",fontWeight:700,marginBottom:12}}>{brl(saldoAtual)}</div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontFamily:"system-ui",fontSize:12,color:"rgba(255,255,255,.5)"}}>Saldo inicial</span>
          <span style={{fontFamily:"system-ui",fontSize:12,color:"rgba(255,255,255,.7)",fontWeight:600}}>{brl(saldoInicial)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontFamily:"system-ui",fontSize:12,color:"rgba(255,255,255,.5)"}}>+ Vendas</span>
          <span style={{fontFamily:"system-ui",fontSize:12,color:"#7fe8b0",fontWeight:600}}>{brl(totalVendasMes)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontFamily:"system-ui",fontSize:12,color:"rgba(255,255,255,.5)"}}>- Despesas</span>
          <span style={{fontFamily:"system-ui",fontSize:12,color:"#f99",fontWeight:600}}>{brl(totalDespMes)}</span>
        </div>
        {totalAjustesMes!==0&&<div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontFamily:"system-ui",fontSize:12,color:"rgba(255,255,255,.5)"}}>+/- Ajustes</span>
          <span style={{fontFamily:"system-ui",fontSize:12,color:totalAjustesMes>=0?"#7fe8b0":"#f99",fontWeight:600}}>{brl(totalAjustesMes)}</span>
        </div>}
      </div>
    </Card>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Card style={{padding:"14px 14px"}}>
        <div style={{fontSize:20,marginBottom:6}}>🛍️</div>
        <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:700,color:T.rosa}}>{brl(vendasHoje)}</div>
        <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,marginTop:2}}>Vendas hoje</div>
      </Card>
      <Card style={{padding:"14px 14px"}}>
        <div style={{fontSize:20,marginBottom:6}}>📈</div>
        <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:700,color:T.chocoM}}>{brl(totalVendasMes)}</div>
        <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,marginTop:2}}>Vendas no mês</div>
      </Card>
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
function Caixa({userId,vendas,despesas,produtos,ajustes,onNovaVenda,onNovaDespesa,onNovoAjuste}){
  const [aba,setAba]=useState("venda");
  const [descAjuste,setDescAjuste]=useState("");
  const [valorAjuste,setValorAjuste]=useState("");
  const [tipoAjuste,setTipoAjuste]=useState("entrada");
  const [loadingAjuste,setLoadingAjuste]=useState(false);
  const [descricao,setDescricao]=useState("");
  const [valor,setValor]=useState("");
  const [formaPgtoD,setFormaPgtoD]=useState("pix");
  const [fotoCupom,setFotoCupom]=useState(null);
  const [loading,setLoading]=useState(false);
  const [modalFoto,setModalFoto]=useState(null);

  // ── CARRINHO ──
  const [carrinho,setCarrinho]=useState([]);
  const [produtoId,setProdutoId]=useState("");
  const [qtd,setQtd]=useState("1");
  const [adicionais,setAdicionais]=useState([]);
  const [formaPgto,setFormaPgto]=useState("pix");
  const [obsVenda,setObsVenda]=useState("");

  const prodSel=produtos.find(p=>p.id===produtoId);
  const precoItemSel=prodSel?precoFinal(prodSel):0;
  const totalAdicionais=adicionais.reduce((s,a)=>s+parseFloat(a.preco||0)*parseFloat(a.qtd||1),0);
  const subtotalItem=prodSel?(precoItemSel*parseInt(qtd||1))+totalAdicionais:0;
  const totalCarrinho=carrinho.reduce((s,i)=>s+i.subtotal,0);
  const totalVendasHoje=vendas.filter(v=>v.data===hoje()).reduce((s,v)=>s+v.total,0);
  const totalDespHoje=despesas.filter(d=>d.data===hoje()).reduce((s,d)=>s+d.valor,0);

  function adicionarAoCarrinho(){
    if(!prodSel) return;
    const item={
      id:Date.now(),produto_id:produtoId,nome:prodSel.nome,
      preco_unitario:precoItemSel,qtd:parseInt(qtd||1),
      adicionais:[...adicionais],subtotal:subtotalItem
    };
    setCarrinho(prev=>[...prev,item]);
    setProdutoId("");setQtd("1");setAdicionais([]);
  }

  function removerDoCarrinho(id){setCarrinho(prev=>prev.filter(i=>i.id!==id));}

  function novoAdicional(){setAdicionais(prev=>[...prev,{id:Date.now(),nome:"",preco:"",qtd:"1",unidade:"un"}]);}
  function atualizaAdicional(id,campo,val){setAdicionais(prev=>prev.map(a=>a.id===id?{...a,[campo]:val}:a));}
  function removeAdicional(id){setAdicionais(prev=>prev.filter(a=>a.id!==id));}

  async function confirmarPedido(){
    if(carrinho.length===0) return;
    setLoading(true);
    const total=totalCarrinho;
    const {data:pedido,error}=await supabase.from("pedidos").insert({
      user_id:userId,total:parseFloat(total.toFixed(2)),
      forma_pgto:formaPgto,data:hoje(),hora:horaAgora(),observacao:obsVenda
    }).select().single();
    if(!error&&pedido){
      for(const item of carrinho){
        const {data:pi}=await supabase.from("pedido_itens").insert({
          pedido_id:pedido.id,produto_id:item.produto_id,nome_produto:item.nome,
          preco_unitario:item.preco_unitario,qtd:item.qtd,subtotal:item.subtotal
        }).select().single();
        if(pi&&item.adicionais.length>0){
          await supabase.from("pedido_item_adicionais").insert(
            item.adicionais.map(a=>({item_id:pi.id,nome:a.nome,quantidade:parseFloat(a.qtd||1),unidade:a.unidade,preco:parseFloat(a.preco||0)}))
          );
        }
      }
      // também registra na tabela vendas para compatibilidade com dashboard
      const vendaData={user_id:userId,produto_id:carrinho[0].produto_id,qtd:carrinho.reduce((s,i)=>s+i.qtd,0),
        total:parseFloat(total.toFixed(2)),data:hoje(),hora:horaAgora(),forma_pgto:formaPgto,pedido_id:pedido.id};
      const {data:v}=await supabase.from("vendas").insert(vendaData).select().single();
      if(v) onNovaVenda({...v,_pedido:pedido,_itens:carrinho});
      setCarrinho([]);setFormaPgto("pix");setObsVenda("");
    }
    setLoading(false);
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
    <SubAba abas={[{id:"venda",emoji:"🛍️",label:"Venda"},{id:"despesa",emoji:"📤",label:"Despesa"},{id:"ajuste",emoji:"⚖️",label:"Ajuste"},{id:"historico",emoji:"📋",label:"Hoje"}]} ativa={aba} onChange={setAba}/>

    {aba==="venda"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card>
        <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,fontWeight:700,marginBottom:12,letterSpacing:.5}}>➕ ADICIONAR ITEM</div>
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          <Select label="Produto" value={produtoId} onChange={v=>{setProdutoId(v);setAdicionais([]);}}
            options={[{value:"",label:"Selecione..."},...produtos.map(p=>({value:p.id,label:`${p.nome} · ${brl(precoFinal(p))}`}))]}/>
          <Input label="Quantidade" type="number" value={qtd} onChange={setQtd} placeholder="1"/>
          {prodSel&&<div>
            <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,fontWeight:700,marginBottom:8}}>ADICIONAIS (opcional)</div>
            {adicionais.map(a=><div key={a.id} style={{marginBottom:10,padding:"10px 12px",background:T.amareloL,borderRadius:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontFamily:"system-ui",fontSize:12,color:T.amarelo,fontWeight:700}}>Adicional</span>
                <button onClick={()=>removeAdicional(a.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.vermelho,fontSize:16}}>✕</button>
              </div>
              <Input label="Nome" value={a.nome} onChange={v=>atualizaAdicional(a.id,"nome",v)} placeholder="Ex: Cobertura de brigadeiro"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8}}>
                <Input label="Qtd" type="number" value={a.qtd} onChange={v=>atualizaAdicional(a.id,"qtd",v)} placeholder="1"/>
                <Select label="Un." value={a.unidade} onChange={v=>atualizaAdicional(a.id,"unidade",v)} options={["un","g","kg","ml","L"].map(u=>({value:u,label:u}))}/>
                <Input label="Preço R$" type="number" value={a.preco} onChange={v=>atualizaAdicional(a.id,"preco",v)} placeholder="0,00"/>
              </div>
            </div>)}
            <Btn variant="ghost" onClick={novoAdicional} style={{width:"100%",fontSize:11,padding:"7px 0"}}>+ Adicionar cobertura/extra</Btn>
          </div>}
          {prodSel&&<div style={{background:T.rosaL,borderRadius:10,padding:"10px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:"system-ui",fontSize:12,color:T.chocoM}}>{qtd}x {prodSel.nome}</span>
              <span style={{fontFamily:"Georgia,serif",fontSize:14,color:T.rosa,fontWeight:700}}>{brl(subtotalItem)}</span>
            </div>
          </div>}
          <Btn variant="secondary" onClick={adicionarAoCarrinho} disabled={!produtoId}>🛒 Adicionar ao carrinho</Btn>
        </div>
      </Card>
      {carrinho.length>0&&<Card>
        <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,fontWeight:700,marginBottom:12,letterSpacing:.5}}>🛒 CARRINHO ({carrinho.length} {carrinho.length===1?"item":"itens"})</div>
        {carrinho.map(item=><div key={item.id} style={{padding:"10px 0",borderBottom:`1px solid ${T.borda}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:"system-ui",fontSize:13,color:T.choco,fontWeight:600}}>{item.qtd}x {item.nome}</div>
              {item.adicionais.map((a,i)=><div key={i} style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,marginTop:2}}>
                + {a.qtd}{a.unidade} {a.nome} — {brl(parseFloat(a.preco||0)*parseFloat(a.qtd||1))}
              </div>)}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontFamily:"Georgia,serif",fontSize:14,color:T.verde,fontWeight:700}}>{brl(item.subtotal)}</span>
              <button onClick={()=>removerDoCarrinho(item.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.vermelho,fontSize:16}}>✕</button>
            </div>
          </div>
        </div>)}
        <div style={{marginTop:12,paddingTop:10,borderTop:`2px solid ${T.borda}`,display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <span style={{fontFamily:"system-ui",fontSize:14,color:T.choco,fontWeight:700}}>Total do pedido</span>
          <span style={{fontFamily:"Georgia,serif",fontSize:20,color:T.rosa,fontWeight:700}}>{brl(totalCarrinho)}</span>
        </div>
        <Input label="Observação (opcional)" value={obsVenda} onChange={setObsVenda} placeholder="Ex: sem açúcar, entrega às 18h..."/>
        <div style={{marginTop:12}}>
          <div style={{fontFamily:"system-ui",fontSize:12,color:T.chocoM,fontWeight:600,marginBottom:8}}>Forma de recebimento</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {FORMAS_PGTO.map(f=><button key={f.id} onClick={()=>setFormaPgto(f.id)}
              style={{padding:"9px 8px",border:`2px solid ${formaPgto===f.id?T.rosa:T.borda}`,borderRadius:10,cursor:"pointer",
                background:formaPgto===f.id?T.rosaL:T.branco,fontFamily:"system-ui",fontSize:12,fontWeight:700,color:formaPgto===f.id?T.rosa:T.chocoM}}>
              {f.emoji} {f.label}
            </button>)}
          </div>
        </div>
        <Btn loading={loading} onClick={confirmarPedido} style={{marginTop:12,width:"100%"}}>✓ Confirmar Pedido — {brl(totalCarrinho)}</Btn>
      </Card>}
    </div>}

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

    {aba==="ajuste"&&<Card>
      <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,fontWeight:700,marginBottom:14,letterSpacing:.5}}>⚖️ AJUSTE DE CAIXA</div>
      <div style={{background:T.amareloL,borderRadius:10,padding:"10px 14px",marginBottom:14,fontFamily:"system-ui",fontSize:12,color:T.amarelo,lineHeight:1.5}}>
        Use para corrigir diferenças: troco, entrada não registrada, correção de erro, etc.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div>
          <div style={{fontFamily:"system-ui",fontSize:12,color:T.chocoM,fontWeight:600,marginBottom:8}}>Tipo de ajuste</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button onClick={()=>setTipoAjuste("entrada")}
              style={{padding:"9px 8px",border:`2px solid ${tipoAjuste==="entrada"?T.verde:T.borda}`,borderRadius:10,cursor:"pointer",
                background:tipoAjuste==="entrada"?T.verdeL:T.branco,fontFamily:"system-ui",fontSize:12,fontWeight:700,color:tipoAjuste==="entrada"?T.verde:T.chocoM}}>
              ➕ Entrada
            </button>
            <button onClick={()=>setTipoAjuste("saida")}
              style={{padding:"9px 8px",border:`2px solid ${tipoAjuste==="saida"?T.vermelho:T.borda}`,borderRadius:10,cursor:"pointer",
                background:tipoAjuste==="saida"?T.vermelhoL:T.branco,fontFamily:"system-ui",fontSize:12,fontWeight:700,color:tipoAjuste==="saida"?T.vermelho:T.chocoM}}>
              ➖ Saída
            </button>
          </div>
        </div>
        <Input label="Descrição" value={descAjuste} onChange={setDescAjuste} placeholder="Ex: Correção de troco, entrada não registrada..."/>
        <Input label="Valor (R$)" type="number" value={valorAjuste} onChange={setValorAjuste} placeholder="0,00"/>
        <Btn loading={loadingAjuste} variant={tipoAjuste==="entrada"?"verde":"danger"}
          onClick={async()=>{
            if(!descAjuste.trim()||!valorAjuste) return;
            setLoadingAjuste(true);
            const v=tipoAjuste==="entrada"?parseFloat(valorAjuste):-parseFloat(valorAjuste);
            const {data}=await supabase.from("ajustes_caixa").insert({user_id:userId,valor:v,descricao:descAjuste,data:hoje(),hora:horaAgora()}).select().single();
            setLoadingAjuste(false);
            if(data){onNovoAjuste(data);setDescAjuste("");setValorAjuste("");setTipoAjuste("entrada");}
          }}
          disabled={!descAjuste||!valorAjuste}>
          {tipoAjuste==="entrada"?"➕ Registrar entrada":"➖ Registrar saída"}
        </Btn>
      </div>
    </Card>}

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


// ─── FICHAS TÉCNICAS ──────────────────────────────────────────────────────────
function FichasTecnicas({userId,fichas,insumos,config,onSalvar,onExcluir}){
  const [tela,setTela]=useState("lista"); // lista | form | detalhe
  const [fichaAtual,setFichaAtual]=useState(null);
  const [nome,setNome]=useState("");
  const [rendUnid,setRendUnid]=useState("1");
  const [rendPeso,setRendPeso]=useState("");
  const [unidPeso,setUnidPeso]=useState("g");
  const [tempo,setTempo]=useState("");
  const [custEmb,setCustEmb]=useState("");
  const [custRot,setCustRot]=useState("");
  const [custOut,setCustOut]=useState("");
  const [obs,setObs]=useState("");
  const [ingredientes,setIngredientes]=useState([]);
  const [subReceitas,setSubReceitas]=useState([]);
  const [loading,setLoading]=useState(false);

  const valorMin=config?(config.salario_mensal/config.horas_mes/60):0;
  const custosFixosMes=config?.custos_fixos_mes||0;
  const valorMinFixo=config&&config.horas_mes?(custosFixosMes/config.horas_mes/60):0;

  function novaSubReceita(){
    setSubReceitas(prev=>[...prev,{id:Date.now(),sub_ficha_id:"",quantidade:"1",unidade:"un"}]);
  }
  function atualizaSub(id,campo,val){
    setSubReceitas(prev=>prev.map(s=>s.id===id?{...s,[campo]:val}:s));
  }
  function removeSub(id){setSubReceitas(prev=>prev.filter(s=>s.id!==id));}

  function custoSubReceita(sub){
    if(!sub.sub_ficha_id) return 0;
    const f=fichas.find(x=>x.id===sub.sub_ficha_id);
    if(!f) return 0;
    const dre=calcDRE(f);
    return dre.custoPorUnidade*parseFloat(sub.quantidade||1);
  }

  function novoIngrediente(){
    setIngredientes(prev=>[...prev,{id:Date.now(),insumo_id:"",nome_manual:"",quantidade:"",unidade:"g"}]);
  }
  function atualizaIngr(id,campo,val){
    setIngredientes(prev=>prev.map(i=>i.id===id?{...i,[campo]:val}:i));
  }
  function removeIngr(id){setIngredientes(prev=>prev.filter(i=>i.id!==id));}

  function custoIngrediente(ingr){
    if(ingr.insumo_id){
      const ins=insumos.find(x=>x.id===ingr.insumo_id);
      if(!ins) return 0;
      const cpu=ins.preco_embalagem/ins.qtd_embalagem;
      return cpu*parseFloat(ingr.quantidade||0);
    }
    return 0;
  }

  const totalIngredientes=ingredientes.reduce((s,i)=>s+custoIngrediente(i),0);
  const totalSubReceitas=subReceitas.reduce((s,sr)=>s+custoSubReceita(sr),0);
  const custoMaoObra=valorMin*parseFloat(tempo||0);
  const custosFixosRateados=valorMinFixo*parseFloat(tempo||0);
  const custoEmbalagem=parseFloat(custEmb||0);
  const custoRotulo=parseFloat(custRot||0);
  const custoOutros=parseFloat(custOut||0);
  const custoTotal=totalIngredientes+totalSubReceitas+custoMaoObra+custosFixosRateados+custoEmbalagem+custoRotulo+custoOutros;
  const unidades=parseInt(rendUnid||1);
  const custoPorUnidade=unidades>0?custoTotal/unidades:0;

  function calcDRE(ficha,depth=0){
    if(depth>3) return {totIngr:0,totSub:0,mo:0,fixos:0,emb:0,total:0,custoPorUnidade:0};
    const vm=config?(config.salario_mensal/config.horas_mes/60):0;
    const vmf=config&&config.horas_mes?((config.custos_fixos_mes||0)/config.horas_mes/60):0;
    const ingrs=ficha.ficha_ingredientes||[];
    const totIngr=ingrs.reduce((s,i)=>{
      const ins=insumos.find(x=>x.id===i.insumo_id);
      if(!ins) return s;
      return s+(ins.preco_embalagem/ins.qtd_embalagem)*i.quantidade;
    },0);
    const subs=ficha.ficha_subreceitas||[];
    const totSub=subs.reduce((s,sr)=>{
      const sf=fichas.find(x=>x.id===sr.sub_ficha_id);
      if(!sf) return s;
      const dreSub=calcDRE(sf,depth+1);
      return s+dreSub.custoPorUnidade*parseFloat(sr.quantidade||1);
    },0);
    const mo=vm*(ficha.tempo_preparo_min||0);
    const fixos=vmf*(ficha.tempo_preparo_min||0);
    const emb=(ficha.custo_embalagem||0)+(ficha.custo_rotulo||0)+(ficha.custo_outros||0);
    const total=totIngr+totSub+mo+fixos+emb;
    const u=ficha.rendimento_unidades||1;
    return {totIngr,totSub,mo,fixos,emb,total,custoPorUnidade:total/u};
  }

  async function salvar(){
    if(!nome.trim()) return;
    setLoading(true);
    const payload={user_id:userId,nome,rendimento_unidades:parseInt(rendUnid)||1,
      rendimento_peso:parseFloat(rendPeso)||0,unidade_peso:unidPeso,
      tempo_preparo_min:parseInt(tempo)||0,custo_embalagem:parseFloat(custEmb)||0,
      custo_rotulo:parseFloat(custRot)||0,custo_outros:parseFloat(custOut)||0,observacoes:obs};
    let fichaId=fichaAtual?.id;
    if(fichaId){
      await supabase.from("fichas_tecnicas").update(payload).eq("id",fichaId);
      await supabase.from("ficha_ingredientes").delete().eq("ficha_id",fichaId);
    } else {
      const {data}=await supabase.from("fichas_tecnicas").insert(payload).select().single();
      fichaId=data?.id;
    }
    if(fichaId){
      await supabase.from("ficha_subreceitas").delete().eq("ficha_id",fichaId);
      const rowsIngr=ingredientes.filter(i=>i.insumo_id&&i.quantidade).map(i=>({
        ficha_id:fichaId,insumo_id:i.insumo_id,quantidade:parseFloat(i.quantidade),unidade:i.unidade
      }));
      if(rowsIngr.length>0) await supabase.from("ficha_ingredientes").insert(rowsIngr);
      const rowsSub=subReceitas.filter(s=>s.sub_ficha_id&&s.quantidade).map(s=>({
        ficha_id:fichaId,sub_ficha_id:s.sub_ficha_id,quantidade:parseFloat(s.quantidade),unidade:s.unidade
      }));
      if(rowsSub.length>0) await supabase.from("ficha_subreceitas").insert(rowsSub);
    }
    const {data:updated}=await supabase.from("fichas_tecnicas")
      .select("*,ficha_ingredientes(*),ficha_subreceitas(*)").eq("id",fichaId).single();
    setLoading(false);
    if(updated){onSalvar(updated,!!fichaAtual);limpar();}
  }

  function limpar(){
    setNome("");setRendUnid("1");setRendPeso("");setUnidPeso("g");
    setTempo("");setCustEmb("");setCustRot("");setCustOut("");setObs("");
    setIngredientes([]);setSubReceitas([]);setFichaAtual(null);setTela("lista");
  }

  function editarFicha(f){
    setFichaAtual(f);setNome(f.nome);setRendUnid(String(f.rendimento_unidades||1));
    setRendPeso(String(f.rendimento_peso||""));setUnidPeso(f.unidade_peso||"g");
    setTempo(String(f.tempo_preparo_min||""));setCustEmb(String(f.custo_embalagem||""));
    setCustRot(String(f.custo_rotulo||""));setCustOut(String(f.custo_outros||""));
    setObs(f.observacoes||"");
    setIngredientes((f.ficha_ingredientes||[]).map(i=>({...i,id:i.id})));
    setSubReceitas((f.ficha_subreceitas||[]).map(s=>({...s,id:s.id})));
    setTela("form");
  }

  async function excluir(id){
    await supabase.from("fichas_tecnicas").delete().eq("id",id);
    onExcluir(id);
  }

  // ── LISTA ──
  if(tela==="lista") return <div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Btn onClick={()=>setTela("form")} style={{width:"100%"}}>➕ Nova Ficha Técnica</Btn>
    {fichas.length===0&&<p style={{fontFamily:"system-ui",fontSize:13,color:T.chocoM,padding:"8px 0"}}>Nenhuma ficha cadastrada ainda.</p>}
    {fichas.map(f=>{
      const dre=calcDRE(f);
      return <Card key={f.id} style={{padding:"14px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:"system-ui",fontSize:14,color:T.choco,fontWeight:700}}>{f.nome}</div>
            <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,marginTop:3}}>
              Rende {f.rendimento_unidades}un {f.rendimento_peso>0?`· ${f.rendimento_peso}${f.unidade_peso}`:""}
            </div>
            <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM}}>
              ⏱ {f.tempo_preparo_min}min · {(f.ficha_ingredientes||[]).length} ingredientes
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"Georgia,serif",fontSize:16,color:T.amarelo,fontWeight:700}}>{brl(dre.custoPorUnidade)}</div>
            <div style={{fontFamily:"system-ui",fontSize:10,color:T.chocoL}}>custo/unidade</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <Btn variant="ghost" style={{flex:1,padding:"6px 0",fontSize:11}} onClick={()=>{setFichaAtual(f);setTela("detalhe");}}>📊 DRE</Btn>
          <Btn variant="ghost" style={{flex:1,padding:"6px 0",fontSize:11}} onClick={()=>editarFicha(f)}>✏️ Editar</Btn>
          <Btn variant="danger" style={{flex:1,padding:"6px 0",fontSize:11}} onClick={()=>excluir(f.id)}>🗑️</Btn>
        </div>
      </Card>;
    })}
  </div>;

  // ── DRE DETALHE ──
  if(tela==="detalhe"&&fichaAtual){
    const dre=calcDRE(fichaAtual);
    const itens=[
      {label:"🧂 Ingredientes",valor:dre.totIngr,cor:T.azul},
      {label:"🔗 Sub-receitas",valor:dre.totSub||0,cor:T.verde},
      {label:"📦 Embalagem + Rótulo",valor:dre.emb,cor:T.roxo},
      {label:"👩‍🍳 Mão de obra",valor:dre.mo,cor:T.amarelo},
      {label:"🏭 Custos fixos rateados",valor:dre.fixos||0,cor:T.dourado||"#C9943A"},
    ].filter(it=>it.valor>0);
    return <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <button onClick={()=>setTela("lista")} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"system-ui",fontSize:13,color:T.chocoM,textAlign:"left",padding:0}}>← Voltar</button>
      <Card style={{background:T.choco}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:18,color:T.rosaL,fontWeight:700,marginBottom:4}}>{fichaAtual.nome}</div>
        <div style={{fontFamily:"system-ui",fontSize:11,color:"rgba(255,255,255,.5)"}}>Rende {fichaAtual.rendimento_unidades} unidades · {fichaAtual.tempo_preparo_min}min</div>
        <div style={{marginTop:14,display:"flex",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"system-ui",fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:700}}>CUSTO TOTAL</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:24,color:"#fff",fontWeight:700}}>{brl(dre.total)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"system-ui",fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:700}}>CUSTO/UNIDADE</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:24,color:T.rosaL,fontWeight:700}}>{brl(dre.custoPorUnidade)}</div>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoL,fontWeight:700,marginBottom:12,letterSpacing:.5}}>BREAKDOWN DE CUSTOS</div>
        {itens.map(it=>{
          const p=dre.total>0?(it.valor/dre.total*100):0;
          return <div key={it.label} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontFamily:"system-ui",fontSize:13,color:T.choco}}>{it.label}</span>
              <span style={{fontFamily:"Georgia,serif",fontSize:13,color:it.cor,fontWeight:700}}>{brl(it.valor)} <span style={{fontSize:11,color:T.chocoL}}>({p.toFixed(1)}%)</span></span>
            </div>
            <div style={{height:6,background:T.borda,borderRadius:99}}>
              <div style={{width:`${p}%`,height:"100%",background:it.cor,borderRadius:99,transition:"width .3s"}}/>
            </div>
          </div>;
        })}
      </Card>

      <Card>
        <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoL,fontWeight:700,marginBottom:12,letterSpacing:.5}}>INGREDIENTES</div>
        {(fichaAtual.ficha_ingredientes||[]).map(i=>{
          const ins=insumos.find(x=>x.id===i.insumo_id);
          const custo=ins?(ins.preco_embalagem/ins.qtd_embalagem)*i.quantidade:0;
          return <div key={i.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.borda}`}}>
            <span style={{fontFamily:"system-ui",fontSize:13,color:T.choco}}>{ins?.nome||"Insumo"} — {i.quantidade}{i.unidade}</span>
            <span style={{fontFamily:"Georgia,serif",fontSize:13,color:T.azul,fontWeight:700}}>{brl(custo)}</span>
          </div>;
        })}
      </Card>

      {(fichaAtual.ficha_subreceitas||[]).length>0&&<Card>
        <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoL,fontWeight:700,marginBottom:12,letterSpacing:.5}}>🔗 SUB-RECEITAS</div>
        {(fichaAtual.ficha_subreceitas||[]).map(sr=>{
          const sf=fichas.find(x=>x.id===sr.sub_ficha_id);
          const dreSub=sf?calcDRE(sf):{custoPorUnidade:0};
          const custo=dreSub.custoPorUnidade*parseFloat(sr.quantidade||1);
          return <div key={sr.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.borda}`}}>
            <span style={{fontFamily:"system-ui",fontSize:13,color:T.choco}}>{sf?.nome||"Receita"} — {sr.quantidade}{sr.unidade}</span>
            <span style={{fontFamily:"Georgia,serif",fontSize:13,color:T.verde,fontWeight:700}}>{brl(custo)}</span>
          </div>;
        })}
      </Card>}

      <Card style={{background:T.amareloL,border:`1.5px solid #f0d080`}}>
        <div style={{fontFamily:"system-ui",fontSize:11,color:T.amarelo,fontWeight:700,marginBottom:8}}>💡 SUGESTÃO DE PREÇO</div>
        {[30,40,50].map(m=><div key={m} style={{display:"flex",justifyContent:"space-between",padding:"5px 0"}}>
          <span style={{fontFamily:"system-ui",fontSize:13,color:T.choco}}>Margem {m}%</span>
          <span style={{fontFamily:"Georgia,serif",fontSize:14,color:T.choco,fontWeight:700}}>{brl(dre.custoPorUnidade/(1-m/100))}</span>
        </div>)}
      </Card>
    </div>;
  }

  // ── FORMULÁRIO ──
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <button onClick={limpar} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"system-ui",fontSize:13,color:T.chocoM,textAlign:"left",padding:0}}>← Voltar</button>
    <Card>
      <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,fontWeight:700,marginBottom:12,letterSpacing:.5}}>
        {fichaAtual?"✏️ EDITANDO FICHA":"📋 NOVA FICHA TÉCNICA"}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Input label="Nome da receita" value={nome} onChange={setNome} placeholder="Ex: Brigadeiro Tradicional"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Input label="Rende (unidades)" type="number" value={rendUnid} onChange={setRendUnid} placeholder="20"/>
          <Input label="Peso total" type="number" value={rendPeso} onChange={setRendPeso} placeholder="500"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Select label="Unidade peso" value={unidPeso} onChange={setUnidPeso} options={["g","kg","ml","L"].map(u=>({value:u,label:u}))}/>
          <Input label="⏱ Tempo preparo (min)" type="number" value={tempo} onChange={setTempo} placeholder="60"/>
        </div>
      </div>
    </Card>

    <Card>
      <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,fontWeight:700,marginBottom:12,letterSpacing:.5}}>🧂 INGREDIENTES</div>
      {ingredientes.map(ingr=>{
        const ins=insumos.find(x=>x.id===ingr.insumo_id);
        const custo=custoIngrediente(ingr);
        return <div key={ingr.id} style={{marginBottom:12,padding:"10px 12px",background:T.cremedark,borderRadius:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontFamily:"system-ui",fontSize:12,color:T.chocoM,fontWeight:600}}>Ingrediente</span>
            <button onClick={()=>removeIngr(ingr.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.vermelho,fontSize:16}}>✕</button>
          </div>
          <Select label="" value={ingr.insumo_id} onChange={v=>atualizaIngr(ingr.id,"insumo_id",v)}
            options={[{value:"",label:"Selecione o insumo..."},...insumos.map(i=>({value:i.id,label:`${i.nome} (${i.unidade})`}))]}/>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8,marginTop:8}}>
            <Input label="Quantidade" type="number" value={ingr.quantidade} onChange={v=>atualizaIngr(ingr.id,"quantidade",v)} placeholder="0"/>
            <Select label="Un." value={ingr.unidade} onChange={v=>atualizaIngr(ingr.id,"unidade",v)} options={UNIDADES.map(u=>({value:u,label:u}))}/>
          </div>
          {custo>0&&<div style={{fontFamily:"system-ui",fontSize:11,color:T.azul,fontWeight:600,marginTop:6}}>Custo: {brl(custo)}</div>}
        </div>;
      })}
      <Btn variant="ghost" onClick={novoIngrediente} style={{width:"100%",fontSize:12}}>+ Adicionar ingrediente</Btn>
    </Card>

    <Card>
      <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,fontWeight:700,marginBottom:12,letterSpacing:.5}}>🔗 SUB-RECEITAS</div>
      <p style={{fontFamily:"system-ui",fontSize:12,color:T.chocoL,margin:"0 0 12px",lineHeight:1.5}}>
        Use outra ficha técnica como ingrediente. Ex: Mousse de Ninho dentro do Copo Duplo.
      </p>
      {subReceitas.map(sr=>{
        const sf=fichas.find(x=>x.id===sr.sub_ficha_id);
        const dreS=sf?calcDRE(sf):{custoPorUnidade:0};
        const custoS=dreS.custoPorUnidade*parseFloat(sr.quantidade||1);
        return <div key={sr.id} style={{marginBottom:12,padding:"10px 12px",background:T.verdeL,borderRadius:10,border:`1px solid #b5d9c5`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontFamily:"system-ui",fontSize:12,color:T.verde,fontWeight:700}}>🔗 Sub-receita</span>
            <button onClick={()=>removeSub(sr.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.vermelho,fontSize:16}}>✕</button>
          </div>
          <Select label="" value={sr.sub_ficha_id} onChange={v=>atualizaSub(sr.id,"sub_ficha_id",v)}
            options={[{value:"",label:"Selecione a receita..."},...fichas.filter(f=>f.id!==fichaAtual?.id).map(f=>({value:f.id,label:f.nome}))]}/>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8,marginTop:8}}>
            <Input label="Quantidade" type="number" value={sr.quantidade} onChange={v=>atualizaSub(sr.id,"quantidade",v)} placeholder="1"/>
            <Select label="Un." value={sr.unidade} onChange={v=>atualizaSub(sr.id,"unidade",v)} options={["un","g","kg","ml","L"].map(u=>({value:u,label:u}))}/>
          </div>
          {custoS>0&&<div style={{fontFamily:"system-ui",fontSize:11,color:T.verde,fontWeight:600,marginTop:6}}>Custo: {brl(custoS)}</div>}
        </div>;
      })}
      <Btn variant="verde" onClick={novaSubReceita} style={{width:"100%",fontSize:12}}>🔗 Adicionar sub-receita</Btn>
    </Card>

    <Card>
      <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoM,fontWeight:700,marginBottom:12,letterSpacing:.5}}>📦 CUSTOS ADICIONAIS</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Input label="Embalagem (R$)" type="number" value={custEmb} onChange={setCustEmb} placeholder="0,00"/>
        <Input label="Rótulo / Adesivo (R$)" type="number" value={custRot} onChange={setCustRot} placeholder="0,00"/>
        <Input label="Outros custos (R$)" type="number" value={custOut} onChange={setCustOut} placeholder="0,00"/>
        <Input label="Observações" value={obs} onChange={setObs} placeholder="Notas sobre a receita..."/>
      </div>
    </Card>

    {custoTotal>0&&<Card style={{background:T.choco}}>
      <div style={{fontFamily:"system-ui",fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:700,marginBottom:10}}>PRÉVIA DO CUSTO</div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontFamily:"system-ui",fontSize:13,color:"rgba(255,255,255,.7)"}}>🧂 Ingredientes</span>
        <span style={{fontFamily:"Georgia,serif",fontSize:13,color:"#7fe8b0"}}>{brl(totalIngredientes)}</span>
      </div>
      {totalSubReceitas>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontFamily:"system-ui",fontSize:13,color:"rgba(255,255,255,.7)"}}>🔗 Sub-receitas</span>
        <span style={{fontFamily:"Georgia,serif",fontSize:13,color:"#7fe8b0"}}>{brl(totalSubReceitas)}</span>
      </div>}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontFamily:"system-ui",fontSize:13,color:"rgba(255,255,255,.7)"}}>👩‍🍳 Mão de obra ({tempo||0}min)</span>
        <span style={{fontFamily:"Georgia,serif",fontSize:13,color:"#7fe8b0"}}>{brl(custoMaoObra)}</span>
      </div>
      {custosFixosRateados>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontFamily:"system-ui",fontSize:13,color:"rgba(255,255,255,.7)"}}>🏭 Custos fixos ({tempo||0}min)</span>
        <span style={{fontFamily:"Georgia,serif",fontSize:13,color:"#f0c97a"}}>{brl(custosFixosRateados)}</span>
      </div>}
      {!config&&<div style={{background:"rgba(255,200,0,.1)",borderRadius:8,padding:"6px 10px",marginBottom:6}}>
        <span style={{fontFamily:"system-ui",fontSize:11,color:"#f0c97a"}}>⚠️ Configure salário e custos fixos em ⚙️ Config para rateio automático.</span>
      </div>}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontFamily:"system-ui",fontSize:13,color:"rgba(255,255,255,.7)"}}>📦 Embalagem + outros</span>
        <span style={{fontFamily:"Georgia,serif",fontSize:13,color:"#7fe8b0"}}>{brl(custoEmbalagem+custoRotulo+custoOutros)}</span>
      </div>
      <div style={{borderTop:"1px solid rgba(255,255,255,.15)",paddingTop:10,display:"flex",justifyContent:"space-between"}}>
        <span style={{fontFamily:"system-ui",fontSize:13,color:"#fff",fontWeight:700}}>Custo/unidade</span>
        <span style={{fontFamily:"Georgia,serif",fontSize:18,color:T.rosaL,fontWeight:700}}>{brl(custoPorUnidade)}</span>
      </div>
    </Card>}

    <div style={{display:"flex",gap:8}}>
      <Btn loading={loading} style={{flex:1}} onClick={salvar} disabled={!nome}>{fichaAtual?"✓ Salvar":"📋 Criar Ficha"}</Btn>
      <Btn variant="ghost" onClick={limpar}>Cancelar</Btn>
    </div>
  </div>;
}

// ─── PRECIFICAÇÃO (container com subabas) ─────────────────────────────────────
function Precificacao({userId,produtos,insumos,fichas,config,onSalvarProduto,onExcluirProduto,onSalvarInsumo,onExcluirInsumo,onSalvarFicha,onExcluirFicha}){
  const [sub,setSub]=useState("produtos");
  return <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>
    <h2 style={{fontFamily:"Georgia,serif",fontSize:20,color:T.choco,margin:0}}>🎂 Precificação</h2>
    <SubAba
      abas={[{id:"produtos",emoji:"🎂",label:"Produtos"},{id:"insumos",emoji:"🧂",label:"Insumos"},{id:"fichas",emoji:"📋",label:"Fichas"}]}
      ativa={sub} onChange={setSub}/>
    {sub==="produtos"&&<Produtos userId={userId} produtos={produtos} onSalvar={onSalvarProduto} onExcluir={onExcluirProduto}/>}
    {sub==="insumos"&&<Insumos userId={userId} insumos={insumos} onSalvar={onSalvarInsumo} onExcluir={onExcluirInsumo}/>}
    {sub==="fichas"&&<FichasTecnicas userId={userId} fichas={fichas} insumos={insumos} config={config} onSalvar={onSalvarFicha} onExcluir={onExcluirFicha}/>}
  </div>;
}


// ─── RELATÓRIO MENSAL ─────────────────────────────────────────────────────────
function RelatorioMensal({vendas,despesas,ajustes,saldoMensalData,onFechar}){
  const now=new Date();
  const [ano,setAno]=useState(now.getFullYear());
  const [mes,setMes]=useState(now.getMonth()+1);

  const MESES=["","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  function navMes(dir){
    let m=mes+dir, a=ano;
    if(m>12){m=1;a++;}
    if(m<1){m=12;a--;}
    setMes(m);setAno(a);
  }

  const vendasMes=vendas.filter(v=>{const[a,m]=v.data.split("-");return parseInt(a)===ano&&parseInt(m)===mes;});
  const despesasMes=despesas.filter(d=>{const[a,m]=d.data.split("-");return parseInt(a)===ano&&parseInt(m)===mes;});
  const ajustesMes=ajustes.filter(a=>{const[aa,m]=a.data.split("-");return parseInt(aa)===ano&&parseInt(m)===mes;});

  const totalReceita=vendasMes.reduce((s,v)=>s+v.total,0);
  const totalDespesas=despesasMes.reduce((s,d)=>s+d.valor,0);
  const totalAjustes=ajustesMes.reduce((s,a)=>s+a.valor,0);
  const smData=saldoMensalData?.find(s=>s.ano===ano&&s.mes===mes);
  const saldoInicial=smData?.saldo_inicial||0;
  const saldoFinal=saldoInicial+totalReceita-totalDespesas+totalAjustes;

  // Agrupar despesas por descrição para ver onde está gastando mais
  const grupoDespesas={};
  despesasMes.forEach(d=>{
    const key=d.descricao;
    grupoDespesas[key]=(grupoDespesas[key]||0)+d.valor;
  });
  const topDespesas=Object.entries(grupoDespesas).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Vendas por forma de pagamento
  const porForma={};
  vendasMes.forEach(v=>{porForma[v.forma_pgto]=(porForma[v.forma_pgto]||0)+v.total;});

  const lucroLiquido=totalReceita-totalDespesas;
  const margemLiquida=totalReceita>0?(lucroLiquido/totalReceita*100):0;

  return <div style={{background:T.creme,minHeight:"100vh"}}>
    {/* Header */}
    <div style={{background:T.choco,padding:"16px 20px",position:"sticky",top:0,zIndex:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <h2 style={{fontFamily:"Georgia,serif",fontSize:18,color:T.rosaL,margin:0}}>📊 Relatório Mensal</h2>
        <button onClick={onFechar} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:9,padding:"7px 12px",cursor:"pointer",fontFamily:"system-ui",fontSize:13,color:"rgba(255,255,255,.8)",fontWeight:600}}>← Voltar</button>
      </div>
      {/* Navegação de meses */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(255,255,255,.1)",borderRadius:12,padding:"10px 14px"}}>
        <button onClick={()=>navMes(-1)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.7)",fontSize:20,padding:"0 8px"}}>‹</button>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:16,color:"#fff",fontWeight:700}}>{MESES[mes]}</div>
          <div style={{fontFamily:"system-ui",fontSize:12,color:"rgba(255,255,255,.5)"}}>{ano}</div>
        </div>
        <button onClick={()=>navMes(1)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.7)",fontSize:20,padding:"0 8px"}}>›</button>
      </div>
    </div>

    <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>
      {/* Saldo geral */}
      <Card style={{background:T.choco}}>
        <div style={{fontFamily:"system-ui",fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:700,letterSpacing:.5,marginBottom:12}}>RESULTADO DO MÊS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <div style={{fontFamily:"system-ui",fontSize:10,color:"rgba(255,255,255,.5)"}}>Saldo inicial</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:16,color:"rgba(255,255,255,.8)",fontWeight:700}}>{brl(saldoInicial)}</div>
          </div>
          <div>
            <div style={{fontFamily:"system-ui",fontSize:10,color:"rgba(255,255,255,.5)"}}>Saldo final</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:16,color:saldoFinal>=0?"#7fe8b0":"#f99",fontWeight:700}}>{brl(saldoFinal)}</div>
          </div>
          <div>
            <div style={{fontFamily:"system-ui",fontSize:10,color:"rgba(255,255,255,.5)"}}>Total recebido</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:16,color:"#7fe8b0",fontWeight:700}}>{brl(totalReceita)}</div>
          </div>
          <div>
            <div style={{fontFamily:"system-ui",fontSize:10,color:"rgba(255,255,255,.5)"}}>Total despesas</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:16,color:"#f99",fontWeight:700}}>{brl(totalDespesas)}</div>
          </div>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,.15)",paddingTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"system-ui",fontSize:13,color:"rgba(255,255,255,.7)",fontWeight:700}}>Lucro líquido</span>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"Georgia,serif",fontSize:22,color:lucroLiquido>=0?"#7fe8b0":"#f99",fontWeight:700}}>{brl(lucroLiquido)}</div>
            <div style={{fontFamily:"system-ui",fontSize:11,color:"rgba(255,255,255,.4)"}}>{margemLiquida.toFixed(1)}% da receita</div>
          </div>
        </div>
      </Card>

      {/* Vendas por forma de pagamento */}
      {Object.keys(porForma).length>0&&<Card>
        <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoL,fontWeight:700,marginBottom:12,letterSpacing:.5}}>💳 RECEBIMENTOS POR FORMA</div>
        {FORMAS_PGTO.map(f=>{
          const val=porForma[f.id]||0;
          if(!val) return null;
          const pct2=totalReceita>0?(val/totalReceita*100):0;
          return <div key={f.id} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontFamily:"system-ui",fontSize:13,color:T.choco}}>{f.emoji} {f.label}</span>
              <span style={{fontFamily:"Georgia,serif",fontSize:13,color:T.verde,fontWeight:700}}>{brl(val)} <span style={{fontSize:11,color:T.chocoL}}>({pct2.toFixed(1)}%)</span></span>
            </div>
            <div style={{height:5,background:T.borda,borderRadius:99}}>
              <div style={{width:`${pct2}%`,height:"100%",background:T.verde,borderRadius:99}}/>
            </div>
          </div>;
        })}
      </Card>}

      {/* Top despesas */}
      {topDespesas.length>0&&<Card>
        <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoL,fontWeight:700,marginBottom:12,letterSpacing:.5}}>📤 PRINCIPAIS DESPESAS</div>
        {topDespesas.map(([desc,val],idx)=>{
          const pct2=totalDespesas>0?(val/totalDespesas*100):0;
          return <div key={idx} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontFamily:"system-ui",fontSize:13,color:T.choco,flex:1,marginRight:8}} numberOfLines={1}>{desc}</span>
              <span style={{fontFamily:"Georgia,serif",fontSize:13,color:T.vermelho,fontWeight:700}}>{brl(val)} <span style={{fontSize:11,color:T.chocoL}}>({pct2.toFixed(1)}%)</span></span>
            </div>
            <div style={{height:5,background:T.borda,borderRadius:99}}>
              <div style={{width:`${pct2}%`,height:"100%",background:T.vermelho,borderRadius:99}}/>
            </div>
          </div>;
        })}
      </Card>}

      {/* Resumo de vendas */}
      <Card>
        <div style={{fontFamily:"system-ui",fontSize:11,color:T.chocoL,fontWeight:700,marginBottom:12,letterSpacing:.5}}>🛍️ RESUMO DE VENDAS</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontFamily:"system-ui",fontSize:13,color:T.chocoM}}>Total de vendas</span>
            <span style={{fontFamily:"Georgia,serif",fontSize:14,color:T.choco,fontWeight:700}}>{vendasMes.length} pedidos</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontFamily:"system-ui",fontSize:13,color:T.chocoM}}>Ticket médio</span>
            <span style={{fontFamily:"Georgia,serif",fontSize:14,color:T.choco,fontWeight:700}}>{vendasMes.length>0?brl(totalReceita/vendasMes.length):brl(0)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontFamily:"system-ui",fontSize:13,color:T.chocoM}}>Maior venda</span>
            <span style={{fontFamily:"Georgia,serif",fontSize:14,color:T.choco,fontWeight:700}}>{vendasMes.length>0?brl(Math.max(...vendasMes.map(v=>v.total))):brl(0)}</span>
          </div>
          {totalAjustes!==0&&<div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontFamily:"system-ui",fontSize:13,color:T.chocoM}}>Ajustes de caixa</span>
            <span style={{fontFamily:"Georgia,serif",fontSize:14,color:totalAjustes>=0?T.verde:T.vermelho,fontWeight:700}}>{brl(totalAjustes)}</span>
          </div>}
        </div>
      </Card>

      {vendasMes.length===0&&despesasMes.length===0&&<div style={{textAlign:"center",padding:"40px 0"}}>
        <div style={{fontSize:40,marginBottom:12}}>📭</div>
        <div style={{fontFamily:"system-ui",fontSize:14,color:T.chocoM}}>Nenhum registro em {MESES[mes]} {ano}</div>
      </div>}
    </div>
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
        {["Taxas de plataformas (iFood, 99food...)","Taxas de cartão (débito/crédito)","Relatório mensal PDF"].map(item=>
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
  const [fichas,setFichas]=useState([]);
  const [pedidos,setPedidos]=useState([]);
  const [saldoMensal,setSaldoMensal]=useState(null);
  const [saldoMensalData,setSaldoMensalData]=useState([]);
  const [ajustes,setAjustes]=useState([]);
  const [showSaldoModal,setShowSaldoModal]=useState(false);

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
      const [p,v,d,i,c,ft]=await Promise.all([
        supabase.from("produtos").select("*").eq("user_id",user.id).order("created_at"),
        supabase.from("vendas").select("*").eq("user_id",user.id).order("data").order("hora"),
        supabase.from("despesas").select("*").eq("user_id",user.id).order("data").order("hora"),
        supabase.from("insumos").select("*").eq("user_id",user.id).order("nome"),
        supabase.from("config_confeitaria").select("*").eq("user_id",user.id).single(),
        supabase.from("fichas_tecnicas").select("*,ficha_ingredientes(*),ficha_subreceitas(*)").eq("user_id",user.id).order("created_at"),
      ]);
      const now=new Date();
      const anoAtual=now.getFullYear();
      const mesAtual=now.getMonth()+1;
      const diaAtual=now.getDate();
      const {data:sm}=await supabase.from("saldo_mensal").select("*").eq("user_id",user.id).eq("ano",anoAtual).eq("mes",mesAtual).single();
      const {data:smAll}=await supabase.from("saldo_mensal").select("*").eq("user_id",user.id);
      const {data:aj}=await supabase.from("ajustes_caixa").select("*").eq("user_id",user.id).order("data").order("hora");
      setProdutos(p.data||[]);
      setVendas(v.data||[]);
      setDespesas(d.data||[]);
      setInsumos(i.data||[]);
      setConfig(c.data||null);
      setFichas(ft.data||[]);
      setSaldoMensal(sm||null);
      setSaldoMensalData(smAll||[]);
      setAjustes(aj||[]);
      // Mostrar modal se dia 1 ou sem saldo cadastrado este mês
      if(!sm||(diaAtual===1&&sm.mes!==mesAtual)){
        setTimeout(()=>setShowSaldoModal(true),800);
      }
    }
    load();
  },[user]);

  async function handleLogout(){
    await supabase.auth.signOut();
    setUser(null);setProdutos([]);setVendas([]);setDespesas([]);setInsumos([]);setConfig(null);setFichas([]);setSaldoMensal(null);setSaldoMensalData([]);setAjustes([]);
  }

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.choco}}>
    <div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>🎂</div>
    <div style={{fontFamily:"system-ui",fontSize:14,color:"rgba(255,255,255,.5)"}}>Carregando...</div></div>
  </div>;

  if(!user) return <TelaAuth onAuth={setUser}/>;

  const now2=new Date();
  const anoAtual2=now2.getFullYear();
  const mesAtual2=now2.getMonth()+1;
  const vendasMes=vendas.filter(v=>{const[a,m]=v.data.split("-");return parseInt(a)===anoAtual2&&parseInt(m)===mesAtual2;});
  const despesasMes=despesas.filter(d=>{const[a,m]=d.data.split("-");return parseInt(a)===anoAtual2&&parseInt(m)===mesAtual2;});
  const ajustesMes=ajustes.filter(a=>{const[aa,m]=a.data.split("-");return parseInt(aa)===anoAtual2&&parseInt(m)===mesAtual2;});
  const totalVendasMes=vendasMes.reduce((s,v)=>s+v.total,0);
  const totalDespMes=despesasMes.reduce((s,d)=>s+d.valor,0);
  const totalAjustesMes=ajustesMes.reduce((s,a)=>s+a.valor,0);
  const saldoInicialMes=saldoMensal?.saldo_inicial||0;
  const saldoAtual=saldoInicialMes+totalVendasMes-totalDespMes+totalAjustesMes;

  return <div style={{maxWidth:430,margin:"0 auto",background:T.creme,minHeight:"100vh"}}>
    {showSaldoModal&&<SaldoModal userId={user.id} anoAtual={anoAtual2} mesAtual={mesAtual2}
      saldoAtual={saldoAtual} onSalvar={sm=>{setSaldoMensal(sm);setShowSaldoModal(false);}}
      onFechar={()=>setShowSaldoModal(false)}/>}
    <Nav tela={tela} setTela={setTela}/>
    <div style={{paddingBottom:40}}>
      {tela==="dashboard"&&<Dashboard user={user} vendas={vendas} despesas={despesas} produtos={produtos} ajustes={ajustes} saldoInicial={saldoInicialMes} saldoAtual={saldoAtual} totalVendasMes={totalVendasMes} totalDespMes={totalDespMes} totalAjustesMes={totalAjustesMes} setTela={setTela} onLogout={handleLogout} onAbrirSaldo={()=>setShowSaldoModal(true)}/>}
      {tela==="caixa"&&<Caixa userId={user.id} vendas={vendas} despesas={despesas} produtos={produtos} ajustes={ajustes}
        onNovaVenda={v=>setVendas(p=>[...p,v])} onNovaDespesa={d=>setDespesas(p=>[...p,d])}
        onNovoAjuste={a=>setAjustes(p=>[...p,a])}/>}
      {tela==="precificacao"&&<Precificacao userId={user.id} produtos={produtos} insumos={insumos} fichas={fichas} config={config}
        onSalvarProduto={(p,e)=>setProdutos(prev=>e?prev.map(x=>x.id===p.id?p:x):[...prev,p])}
        onExcluirProduto={id=>setProdutos(p=>p.filter(x=>x.id!==id))}
        onSalvarInsumo={(i,e)=>setInsumos(prev=>e?prev.map(x=>x.id===i.id?i:x):[...prev,i])}
        onExcluirInsumo={id=>setInsumos(p=>p.filter(x=>x.id!==id))}
        onSalvarFicha={(f,e)=>setFichas(prev=>e?prev.map(x=>x.id===f.id?f:x):[...prev,f])}
        onExcluirFicha={id=>setFichas(p=>p.filter(x=>x.id!==id))}/>}
      {tela==="config"&&<Config userId={user.id} config={config} onSalvar={c=>setConfig(c)}/>}
      {tela==="relatorio"&&<RelatorioMensal vendas={vendas} despesas={despesas} ajustes={ajustes} saldoMensalData={saldoMensalData} onFechar={()=>setTela("dashboard")}/>}
    </div>
  </div>;
}
