import { useState, useReducer, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── CONFIGURAÇÃO SUPABASE ────────────────────────────────────────────────────
// Substitua pelos valores do seu projeto em https://supabase.com/dashboard
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── TEMA ─────────────────────────────────────────────────────────────────────
const t = {
  rosaAntigo:  "#C4788A",
  rosaClaro:   "#F2D0D9",
  creme:       "#FBF5EF",
  cremeMedio:  "#F0E6D9",
  chocolate:   "#3D1F1F",
  chocolateM:  "#6B3737",
  dourado:     "#C9943A",
  cinzaClaro:  "#E8DDD5",
  branco:      "#FFFFFF",
  vermelho:    "#C0392B",
  verde:       "#2E7D52",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const brl = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const precoFinal = (p) => p.custo * (1 + p.margem / 100);
const hoje = () => new Date().toISOString().split("T")[0];
const horaAgora = () => new Date().toTimeString().slice(0, 5);

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background: t.branco, borderRadius: 16, padding: "20px 22px", boxShadow: "0 2px 12px rgba(61,31,31,.08)", ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", style, disabled, loading }) {
  const bases = {
    primary:   { background: t.rosaAntigo, color: "#fff", border: "none" },
    secondary: { background: t.cremeMedio, color: t.chocolate, border: "none" },
    danger:    { background: "#fbeded", color: t.vermelho, border: `1px solid #f5c6c6` },
    ghost:     { background: "transparent", color: t.chocolateM, border: `1.5px solid ${t.cinzaClaro}` },
    dark:      { background: t.chocolate, color: "#fff", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{ ...bases[variant], borderRadius: 10, padding: "10px 18px", cursor: (disabled || loading) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, fontFamily: "system-ui", opacity: (disabled || loading) ? .55 : 1, transition: "filter .15s", ...style }}>
      {loading ? "⏳ Aguarde..." : children}
    </button>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, style, required }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: t.chocolateM, fontWeight: 600, fontFamily: "system-ui" }}>
      {label}{required && <span style={{ color: t.rosaAntigo }}>*</span>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        style={{ border: `1.5px solid ${t.cinzaClaro}`, borderRadius: 9, padding: "10px 12px", fontSize: 14, color: t.chocolate, background: t.creme, outline: "none", fontFamily: "system-ui", ...style }} />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: t.chocolateM, fontWeight: 600, fontFamily: "system-ui" }}>
      {label}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ border: `1.5px solid ${t.cinzaClaro}`, borderRadius: 9, padding: "10px 12px", fontSize: 14, color: t.chocolate, background: t.creme, outline: "none", fontFamily: "system-ui" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Toast({ msg, tipo }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: tipo === "erro" ? t.vermelho : t.verde, color: "#fff", borderRadius: 12, padding: "12px 20px", fontFamily: "system-ui", fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,.2)", maxWidth: 320, textAlign: "center" }}>
      {msg}
    </div>
  );
}

// ─── TELA DE AUTH ─────────────────────────────────────────────────────────────
function TelaAuth({ onAuth }) {
  const [modo, setModo] = useState("login"); // login | cadastro | reset
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleLogin() {
    setLoading(true); setMsg(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) return setMsg({ texto: "E-mail ou senha incorretos.", tipo: "erro" });
    onAuth(data.user);
  }

  async function handleCadastro() {
    if (!nome.trim()) return setMsg({ texto: "Informe o nome da confeitaria.", tipo: "erro" });
    setLoading(true); setMsg(null);
    const { data, error } = await supabase.auth.signUp({
      email, password: senha,
      options: { data: { nome_confeitaria: nome } }
    });
    setLoading(false);
    if (error) return setMsg({ texto: error.message.includes("already") ? "E-mail já cadastrado." : "Erro no cadastro. Tente novamente.", tipo: "erro" });
    setMsg({ texto: "✅ Cadastro realizado! Verifique seu e-mail para confirmar.", tipo: "ok" });
    setModo("login");
  }

  async function handleReset() {
    if (!email) return setMsg({ texto: "Informe seu e-mail.", tipo: "erro" });
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setLoading(false);
    setMsg({ texto: "✅ Link de redefinição enviado para seu e-mail.", tipo: "ok" });
    setModo("login");
  }

  return (
    <div style={{ minHeight: "100vh", background: t.chocolate, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 52 }}>🎂</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, color: t.rosaClaro, margin: "8px 0 4px", letterSpacing: -0.5 }}>Caixa da Confeitaria</h1>
        <p style={{ fontFamily: "system-ui", fontSize: 13, color: "rgba(255,255,255,.45)", margin: 0 }}>Controle financeiro feito para doceiros</p>
      </div>

      <Card style={{ width: "100%", maxWidth: 360, padding: 28 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["login", "cadastro"].map(m => (
            <button key={m} onClick={() => { setModo(m); setMsg(null); }}
              style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "system-ui", fontSize: 13, fontWeight: 700, background: modo === m ? t.rosaAntigo : t.cremeMedio, color: modo === m ? "#fff" : t.chocolateM }}>
              {m === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {modo === "cadastro" && (
            <Input label="Nome da confeitaria" value={nome} onChange={setNome} placeholder="Ex: Doces da Maria" required />
          )}
          <Input label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" required />
          {modo !== "reset" && (
            <Input label="Senha" type="password" value={senha} onChange={setSenha} placeholder="Mínimo 6 caracteres" required />
          )}

          {msg && (
            <div style={{ background: msg.tipo === "erro" ? "#fbeded" : "#e8f5ee", borderRadius: 9, padding: "10px 12px", fontSize: 13, color: msg.tipo === "erro" ? t.vermelho : t.verde, fontFamily: "system-ui", fontWeight: 600 }}>
              {msg.texto}
            </div>
          )}

          <Btn loading={loading} onClick={modo === "login" ? handleLogin : modo === "cadastro" ? handleCadastro : handleReset} style={{ marginTop: 4 }}>
            {modo === "login" ? "Entrar" : modo === "cadastro" ? "Criar conta grátis" : "Enviar link de redefinição"}
          </Btn>

          {modo === "login" && (
            <button onClick={() => { setModo("reset"); setMsg(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui", fontSize: 12, color: t.chocolateM, textDecoration: "underline", padding: 0 }}>
              Esqueci minha senha
            </button>
          )}
          {modo === "reset" && (
            <button onClick={() => setModo("login")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui", fontSize: 12, color: t.chocolateM, textDecoration: "underline", padding: 0 }}>
              ← Voltar ao login
            </button>
          )}
        </div>
      </Card>

      <p style={{ marginTop: 20, fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,.3)", textAlign: "center" }}>
        Seus dados ficam seguros e isolados por conta.
      </p>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ tela, setTela }) {
  const abas = [
    { id: "dashboard",    icon: "🏠", label: "Início" },
    { id: "caixa",        icon: "💰", label: "Caixa" },
    { id: "precificacao", icon: "🎂", label: "Produtos" },
    { id: "historico",    icon: "📋", label: "Histórico" },
  ];
  return (
    <nav style={{ display: "flex", justifyContent: "space-around", background: t.chocolate, padding: "10px 0 8px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,.25)" }}>
      {abas.map(a => (
        <button key={a.id} onClick={() => setTela(a.id)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 8px" }}>
          <span style={{ fontSize: 20 }}>{a.icon}</span>
          <span style={{ fontSize: 10, color: tela === a.id ? t.rosaClaro : "rgba(255,255,255,.5)", fontWeight: tela === a.id ? 700 : 400, fontFamily: "system-ui" }}>{a.label}</span>
          {tela === a.id && <span style={{ width: 20, height: 2, background: t.rosaAntigo, borderRadius: 2 }} />}
        </button>
      ))}
    </nav>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, vendas, despesas, produtos, saldoInicial, setTela, onLogout }) {
  const nomeConf = user?.user_metadata?.nome_confeitaria || "Confeitaria";
  const totalVendas   = vendas.reduce((s, v) => s + v.total, 0);
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);
  const saldo         = saldoInicial + totalVendas - totalDespesas;
  const vendasHoje    = vendas.filter(v => v.data === hoje()).reduce((s, v) => s + v.total, 0);

  const maisVendido = useMemo(() => {
    const cnt = {};
    vendas.forEach(v => { cnt[v.produto_id] = (cnt[v.produto_id] || 0) + v.qtd; });
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    const p = produtos.find(x => x.id === top[0]);
    return p ? `${p.nome} (${top[1]}x)` : null;
  }, [vendas, produtos]);

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: t.chocolate, margin: "0 0 2px" }}>{nomeConf}</h1>
          <p style={{ fontFamily: "system-ui", fontSize: 11, color: t.chocolateM, margin: 0 }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button onClick={onLogout} style={{ background: t.cremeMedio, border: "none", borderRadius: 9, padding: "7px 12px", cursor: "pointer", fontSize: 12, color: t.chocolateM, fontFamily: "system-ui", fontWeight: 600 }}>
          Sair
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { label: "Saldo atual",    valor: brl(saldo),         cor: saldo >= 0 ? t.verde : t.vermelho, icone: "💳" },
          { label: "Vendas hoje",    valor: brl(vendasHoje),    cor: t.rosaAntigo, icone: "🛍️" },
          { label: "Total vendido",  valor: brl(totalVendas),   cor: t.chocolateM, icone: "📈" },
          { label: "Total despesas", valor: brl(totalDespesas), cor: t.vermelho,   icone: "📤" },
        ].map(k => (
          <Card key={k.label} style={{ padding: "16px 14px" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icone}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: k.cor }}>{k.valor}</div>
            <div style={{ fontFamily: "system-ui", fontSize: 11, color: t.chocolateM, marginTop: 2 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      {maisVendido && (
        <Card style={{ background: t.rosaClaro }}>
          <div style={{ fontFamily: "system-ui", fontSize: 10, color: t.chocolateM, fontWeight: 700, marginBottom: 4 }}>⭐ PRODUTO DESTAQUE</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: t.chocolate }}>{maisVendido}</div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Btn variant="primary" onClick={() => setTela("caixa")}>💰 Registrar Venda</Btn>
        <Btn variant="ghost"   onClick={() => setTela("precificacao")}>🎂 Produtos</Btn>
      </div>

      <div>
        <div style={{ fontFamily: "system-ui", fontSize: 11, color: t.chocolateM, fontWeight: 700, letterSpacing: .5, marginBottom: 10 }}>ÚLTIMAS VENDAS</div>
        {[...vendas].reverse().slice(0, 4).map(v => {
          const prod = produtos.find(p => p.id === v.produto_id);
          return (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.cinzaClaro}` }}>
              <div>
                <div style={{ fontFamily: "system-ui", fontSize: 13, color: t.chocolate, fontWeight: 600 }}>{prod?.nome || "Produto removido"}</div>
                <div style={{ fontFamily: "system-ui", fontSize: 11, color: t.chocolateM }}>{v.qtd}x · {v.data} {v.hora}</div>
              </div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 14, color: t.verde, fontWeight: 700 }}>{brl(v.total)}</div>
            </div>
          );
        })}
        {vendas.length === 0 && <div style={{ fontFamily: "system-ui", fontSize: 13, color: t.chocolateM, padding: "16px 0" }}>Nenhuma venda registrada ainda.</div>}
      </div>
    </div>
  );
}

// ─── CAIXA ────────────────────────────────────────────────────────────────────
function Caixa({ userId, vendas, despesas, produtos, onNovaVenda, onNovaDespesa }) {
  const [aba, setAba] = useState("venda");
  const [produtoId, setProdutoId] = useState("");
  const [qtd, setQtd] = useState("1");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(false);

  const prodSel  = produtos.find(p => p.id === produtoId);
  const totalV   = prodSel ? precoFinal(prodSel) * parseInt(qtd || 1) : 0;

  const totalVendasHoje   = vendas.filter(v => v.data === hoje()).reduce((s, v) => s + v.total, 0);
  const totalDespesasHoje = despesas.filter(d => d.data === hoje()).reduce((s, d) => s + d.valor, 0);

  async function registrarVenda() {
    if (!produtoId || !qtd) return;
    setLoading(true);
    const venda = { user_id: userId, produto_id: produtoId, qtd: parseInt(qtd), total: parseFloat(totalV.toFixed(2)), data: hoje(), hora: horaAgora() };
    const { data, error } = await supabase.from("vendas").insert(venda).select().single();
    setLoading(false);
    if (!error) { onNovaVenda(data); setProdutoId(""); setQtd("1"); }
  }

  async function registrarDespesa() {
    if (!descricao.trim() || !valor) return;
    setLoading(true);
    const desp = { user_id: userId, descricao, valor: parseFloat(valor), data: hoje(), hora: horaAgora() };
    const { data, error } = await supabase.from("despesas").insert(desp).select().single();
    setLoading(false);
    if (!error) { onNovaDespesa(data); setDescricao(""); setValor(""); }
  }

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: t.chocolate, margin: 0 }}>💰 Controle de Caixa</h2>

      <div style={{ display: "flex", gap: 8 }}>
        {[["venda","🛍️ Nova Venda"], ["despesa","📤 Despesa"]].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "system-ui", fontSize: 13, fontWeight: 700, background: aba === id ? t.rosaAntigo : t.cremeMedio, color: aba === id ? "#fff" : t.chocolateM }}>
            {label}
          </button>
        ))}
      </div>

      {aba === "venda" ? (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Select label="Produto" value={produtoId} onChange={setProdutoId}
              options={[{ value: "", label: "Selecione o produto..." }, ...produtos.map(p => ({ value: p.id, label: `${p.nome} · ${brl(precoFinal(p))}` }))]} />
            <Input label="Quantidade" type="number" value={qtd} onChange={setQtd} placeholder="1" />
            {prodSel && (
              <div style={{ background: t.rosaClaro, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontFamily: "system-ui", fontSize: 10, color: t.chocolateM, fontWeight: 700 }}>TOTAL A RECEBER</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 24, color: t.rosaAntigo, fontWeight: 700 }}>{brl(totalV)}</div>
                <div style={{ fontFamily: "system-ui", fontSize: 11, color: t.chocolateM, marginTop: 2 }}>{qtd}x {brl(precoFinal(prodSel))} por unidade</div>
              </div>
            )}
            <Btn loading={loading} onClick={registrarVenda} disabled={!produtoId}>✓ Confirmar Venda</Btn>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Descrição" value={descricao} onChange={setDescricao} placeholder="Ex: Farinha, embalagens..." />
            <Input label="Valor (R$)" type="number" value={valor} onChange={setValor} placeholder="0,00" />
            <Btn variant="danger" loading={loading} onClick={registrarDespesa} disabled={!descricao || !valor}>📤 Registrar Despesa</Btn>
          </div>
        </Card>
      )}

      <Card style={{ background: t.cremeMedio }}>
        <div style={{ fontFamily: "system-ui", fontSize: 11, color: t.chocolateM, fontWeight: 700, marginBottom: 12, letterSpacing: .5 }}>RESUMO DE HOJE</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "system-ui", fontSize: 13, color: t.chocolateM }}>Vendas</span>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 14, color: t.verde, fontWeight: 700 }}>+{brl(totalVendasHoje)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontFamily: "system-ui", fontSize: 13, color: t.chocolateM }}>Despesas</span>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 14, color: t.vermelho, fontWeight: 700 }}>-{brl(totalDespesasHoje)}</span>
        </div>
        <div style={{ borderTop: `1.5px solid ${t.cinzaClaro}`, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "system-ui", fontSize: 13, color: t.chocolate, fontWeight: 700 }}>Líquido do dia</span>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 16, color: totalVendasHoje - totalDespesasHoje >= 0 ? t.verde : t.vermelho, fontWeight: 700 }}>
            {brl(totalVendasHoje - totalDespesasHoje)}
          </span>
        </div>
      </Card>
    </div>
  );
}

// ─── PRECIFICAÇÃO ─────────────────────────────────────────────────────────────
function Precificacao({ userId, produtos, onSalvar, onExcluir }) {
  const [nome, setNome] = useState("");
  const [custo, setCusto] = useState("");
  const [margem, setMargem] = useState("100");
  const [categoria, setCategoria] = useState("Doces");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const categorias = ["Doces", "Bolos", "Tortas", "Salgados", "Bebidas", "Outro"];

  async function salvar() {
    if (!nome.trim() || !custo) return;
    setLoading(true);
    const payload = { user_id: userId, nome, custo: parseFloat(custo), margem: parseFloat(margem), categoria };
    let result;
    if (editId) {
      const { data } = await supabase.from("produtos").update(payload).eq("id", editId).select().single();
      result = { data, edit: true };
    } else {
      const { data } = await supabase.from("produtos").insert(payload).select().single();
      result = { data, edit: false };
    }
    setLoading(false);
    if (result.data) { onSalvar(result.data, result.edit); limpar(); }
  }

  async function excluir(id) {
    await supabase.from("produtos").delete().eq("id", id);
    onExcluir(id);
  }

  function editar(p) {
    setEditId(p.id); setNome(p.nome); setCusto(String(p.custo)); setMargem(String(p.margem)); setCategoria(p.categoria);
  }

  function limpar() {
    setEditId(null); setNome(""); setCusto(""); setMargem("100"); setCategoria("Doces");
  }

  const preview = custo && margem ? parseFloat(custo) * (1 + parseFloat(margem) / 100) : null;

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: t.chocolate, margin: 0 }}>🎂 Produtos & Preços</h2>

      <Card style={{ border: editId ? `2px solid ${t.rosaAntigo}` : "none" }}>
        <div style={{ fontFamily: "system-ui", fontSize: 11, color: t.chocolateM, fontWeight: 700, marginBottom: 14, letterSpacing: .5 }}>
          {editId ? "✏️ EDITANDO PRODUTO" : "➕ NOVO PRODUTO"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Nome do produto" value={nome} onChange={setNome} placeholder="Ex: Bolo de Chocolate" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Custo (R$)" type="number" value={custo} onChange={setCusto} placeholder="0,00" />
            <Input label="Margem (%)" type="number" value={margem} onChange={setMargem} placeholder="100" />
          </div>
          <Select label="Categoria" value={categoria} onChange={setCategoria} options={categorias.map(c => ({ value: c, label: c }))} />

          {preview !== null && (
            <div style={{ background: t.rosaClaro, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "system-ui", fontSize: 10, color: t.chocolateM, fontWeight: 700 }}>PREÇO DE VENDA</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: t.rosaAntigo, fontWeight: 700 }}>{brl(preview)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "system-ui", fontSize: 10, color: t.chocolateM, fontWeight: 700 }}>LUCRO</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 16, color: t.verde, fontWeight: 700 }}>{brl(parseFloat(custo) * parseFloat(margem) / 100)}</div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <Btn loading={loading} style={{ flex: 1 }} onClick={salvar} disabled={!nome || !custo}>
              {editId ? "✓ Salvar alterações" : "➕ Adicionar produto"}
            </Btn>
            {editId && <Btn variant="ghost" onClick={limpar}>Cancelar</Btn>}
          </div>
        </div>
      </Card>

      <div>
        <div style={{ fontFamily: "system-ui", fontSize: 11, color: t.chocolateM, fontWeight: 700, letterSpacing: .5, marginBottom: 12 }}>
          CARDÁPIO ({produtos.length} produtos)
        </div>
        {produtos.length === 0 && <div style={{ fontFamily: "system-ui", fontSize: 13, color: t.chocolateM, padding: "16px 0" }}>Nenhum produto cadastrado ainda.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {produtos.map(p => (
            <Card key={p.id} style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "system-ui", fontSize: 14, color: t.chocolate, fontWeight: 700 }}>{p.nome}</div>
                  <div style={{ fontFamily: "system-ui", fontSize: 11, color: t.chocolateM, marginTop: 2 }}>
                    Custo: {brl(p.custo)} · Margem: {p.margem}%
                  </div>
                  <span style={{ display: "inline-block", marginTop: 6, background: t.rosaClaro, color: t.chocolateM, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontFamily: "system-ui", fontWeight: 700 }}>{p.categoria}</span>
                </div>
                <div style={{ textAlign: "right", marginLeft: 12 }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 18, color: t.rosaAntigo, fontWeight: 700 }}>{brl(precoFinal(p))}</div>
                  <div style={{ fontFamily: "system-ui", fontSize: 10, color: t.verde, fontWeight: 600, marginTop: 2 }}>+{brl(p.custo * p.margem / 100)} lucro</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Btn variant="ghost"  style={{ flex: 1, padding: "7px 0", fontSize: 12 }} onClick={() => editar(p)}>✏️ Editar</Btn>
                <Btn variant="danger" style={{ flex: 1, padding: "7px 0", fontSize: 12 }} onClick={() => excluir(p.id)}>🗑️ Excluir</Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HISTÓRICO ────────────────────────────────────────────────────────────────
function Historico({ vendas, despesas, produtos, saldoInicial }) {
  const [filtro, setFiltro] = useState("tudo");

  const totalVendas   = vendas.reduce((s, v) => s + v.total, 0);
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);
  const saldo         = saldoInicial + totalVendas - totalDespesas;

  const todos = [
    ...vendas.map(v => {
      const prod = produtos.find(p => p.id === v.produto_id);
      return { tipo: "venda", id: `v-${v.id}`, label: prod?.nome || "Produto removido", detalhe: `${v.qtd}x`, valor: v.total, data: v.data, hora: v.hora };
    }),
    ...despesas.map(d => ({ tipo: "despesa", id: `d-${d.id}`, label: d.descricao, detalhe: "Despesa", valor: -d.valor, data: d.data, hora: d.hora })),
  ].sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));

  const lista = todos.filter(t => filtro === "tudo" ? true : filtro === "vendas" ? t.tipo === "venda" : t.tipo === "despesa");

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: t.chocolate, margin: 0 }}>📋 Histórico</h2>

      <Card style={{ background: t.chocolate }}>
        <div style={{ fontFamily: "system-ui", fontSize: 10, color: "rgba(255,255,255,.5)", fontWeight: 700, letterSpacing: .5 }}>SALDO GERAL</div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 28, color: saldo >= 0 ? "#7fe8b0" : "#f99", fontWeight: 700, margin: "4px 0" }}>{brl(saldo)}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <div><span style={{ fontFamily: "system-ui", fontSize: 10, color: "rgba(255,255,255,.5)" }}>Entradas: </span><span style={{ fontFamily: "system-ui", fontSize: 12, color: "#7fe8b0", fontWeight: 700 }}>{brl(totalVendas)}</span></div>
          <div><span style={{ fontFamily: "system-ui", fontSize: 10, color: "rgba(255,255,255,.5)" }}>Saídas: </span><span style={{ fontFamily: "system-ui", fontSize: 12, color: "#f99", fontWeight: 700 }}>{brl(totalDespesas)}</span></div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 8 }}>
        {[["tudo","Tudo"], ["vendas","Vendas"], ["despesas","Despesas"]].map(([id, label]) => (
          <button key={id} onClick={() => setFiltro(id)}
            style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "system-ui", fontSize: 12, fontWeight: 700, background: filtro === id ? t.chocolate : t.cremeMedio, color: filtro === id ? "#fff" : t.chocolateM }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lista.length === 0 && <div style={{ textAlign: "center", fontFamily: "system-ui", fontSize: 14, color: t.chocolateM, padding: "30px 0" }}>Nenhum registro encontrado.</div>}
        {lista.map(item => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: t.branco, borderRadius: 12, padding: "12px 16px", boxShadow: "0 1px 6px rgba(61,31,31,.06)", borderLeft: `4px solid ${item.tipo === "venda" ? t.verde : t.vermelho}` }}>
            <div>
              <div style={{ fontFamily: "system-ui", fontSize: 13, color: t.chocolate, fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontFamily: "system-ui", fontSize: 11, color: t.chocolateM, marginTop: 1 }}>{item.detalhe} · {item.data} {item.hora}</div>
            </div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: item.valor >= 0 ? t.verde : t.vermelho, fontWeight: 700 }}>
              {item.valor >= 0 ? "+" : ""}{brl(Math.abs(item.valor))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tela, setTela]         = useState("dashboard");
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas]     = useState([]);
  const [despesas, setDespesas] = useState([]);
  const SALDO_INICIAL           = 0;

  // Verificar sessão ao carregar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Carregar dados quando logar
  useEffect(() => {
    if (!user) return;
    async function carregarDados() {
      const [{ data: p }, { data: v }, { data: d }] = await Promise.all([
        supabase.from("produtos").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("vendas").select("*").eq("user_id", user.id).order("data").order("hora"),
        supabase.from("despesas").select("*").eq("user_id", user.id).order("data").order("hora"),
      ]);
      setProdutos(p || []);
      setVendas(v || []);
      setDespesas(d || []);
    }
    carregarDados();
  }, [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null); setProdutos([]); setVendas([]); setDespesas([]);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.chocolate }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎂</div>
          <div style={{ fontFamily: "system-ui", fontSize: 14, color: "rgba(255,255,255,.5)" }}>Carregando...</div>
        </div>
      </div>
    );
  }

  if (!user) return <TelaAuth onAuth={setUser} />;

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", background: t.creme, minHeight: "100vh" }}>
      <Nav tela={tela} setTela={setTela} />
      <div style={{ paddingBottom: 32 }}>
        {tela === "dashboard" && (
          <Dashboard user={user} vendas={vendas} despesas={despesas} produtos={produtos} saldoInicial={SALDO_INICIAL} setTela={setTela} onLogout={handleLogout} />
        )}
        {tela === "caixa" && (
          <Caixa userId={user.id} vendas={vendas} despesas={despesas} produtos={produtos}
            onNovaVenda={v => setVendas(prev => [...prev, v])}
            onNovaDespesa={d => setDespesas(prev => [...prev, d])} />
        )}
        {tela === "precificacao" && (
          <Precificacao userId={user.id} produtos={produtos}
            onSalvar={(p, edit) => setProdutos(prev => edit ? prev.map(x => x.id === p.id ? p : x) : [...prev, p])}
            onExcluir={id => setProdutos(prev => prev.filter(p => p.id !== id))} />
        )}
        {tela === "historico" && (
          <Historico vendas={vendas} despesas={despesas} produtos={produtos} saldoInicial={SALDO_INICIAL} />
        )}
      </div>
    </div>
  );
}
