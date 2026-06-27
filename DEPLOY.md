# 🎂 Guia de Deploy — Caixa da Confeitaria
## Supabase (banco + auth) + Vercel (hospedagem) + GitHub (atualizações)

---

## PASSO 1 — Criar o banco no Supabase (~10 min)

1. Acesse https://supabase.com e crie uma conta gratuita
2. Clique em **New Project**, escolha um nome (ex: caixa-confeitaria)
3. Anote a senha do banco (guarde bem)
4. Aguarde o projeto ser criado (~2 min)

### Criar as tabelas (SQL Editor)

No menu lateral, clique em **SQL Editor** e execute este código:

```sql
-- Tabela de produtos
CREATE TABLE produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  custo NUMERIC(10,2) NOT NULL,
  margem NUMERIC(6,2) NOT NULL DEFAULT 100,
  categoria TEXT NOT NULL DEFAULT 'Doces',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de vendas
CREATE TABLE vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  qtd INTEGER NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  data DATE NOT NULL,
  hora TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de despesas
CREATE TABLE despesas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data DATE NOT NULL,
  hora TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Segurança: cada usuário só vê seus próprios dados (RLS)
ALTER TABLE produtos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produtos_usuario"  ON produtos  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "vendas_usuario"    ON vendas    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "despesas_usuario"  ON despesas  FOR ALL USING (auth.uid() = user_id);
```

### Pegar as chaves de API

Vá em **Settings → API** e copie:
- **Project URL** → ex: https://abcdef.supabase.co
- **anon public key** → string longa começando com "eyJ..."

---

## PASSO 2 — Subir o código no GitHub (~5 min)

1. Acesse https://github.com e crie uma conta (se não tiver)
2. Clique em **New repository** → nome: `caixa-confeitaria` → Public → Create
3. No seu computador, abra o terminal na pasta do projeto e execute:

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/caixa-confeitaria.git
git push -u origin main
```

> 💡 **Dica:** Se não tem Git instalado, baixe em https://git-scm.com

---

## PASSO 3 — Deploy no Vercel (~5 min)

1. Acesse https://vercel.com e crie conta com seu GitHub
2. Clique em **Add New → Project**
3. Selecione o repositório `caixa-confeitaria`
4. Na seção **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` → sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` → sua chave anon
5. Clique em **Deploy**

Após ~1 min, seu app estará em: `https://caixa-confeitaria.vercel.app`

---

## PASSO 4 — Configurar e-mail de confirmação no Supabase

1. Vá em **Authentication → Email Templates**
2. Troque os textos para português se quiser
3. Em **Authentication → URL Configuration**, adicione:
   - Site URL: `https://caixa-confeitaria.vercel.app`

---

## COMO FAZER ATUALIZAÇÕES FUTURAS

Toda vez que você quiser atualizar o app:

```bash
# Edite os arquivos...
git add .
git commit -m "descrição da mudança"
git push
```

O Vercel detecta automaticamente o push e faz o deploy em ~1 minuto.
**Os usuários já recebem a versão nova sem fazer nada.**

---

## ESTRUTURA DE ARQUIVOS

```
caixa-confeitaria/
├── src/
│   ├── App.jsx        ← todo o código do app
│   └── main.jsx       ← entrada do React
├── index.html         ← página base
├── package.json       ← dependências
├── vite.config.js     ← configuração do bundler
└── .env.example       ← modelo das variáveis de ambiente
```

---

## CUSTOS

| Serviço  | Plano gratuito inclui                        |
|----------|----------------------------------------------|
| Supabase | 500 MB banco, 50.000 usuários/mês, auth grátis |
| Vercel   | Hospedagem ilimitada, deploy automático       |
| GitHub   | Repositórios privados ilimitados              |

**Custo total para começar: R$ 0,00**

Quando escalar para mais clientes pagantes, considere:
- Supabase Pro: US$ 25/mês (~R$ 130)
- Vercel Pro: US$ 20/mês (~R$ 105) — só se tiver muito tráfego

---

## PRÓXIMOS PASSOS SUGERIDOS

- [ ] Adicionar domínio personalizado (ex: caixaconfeitaria.com.br)
- [ ] Relatório mensal com exportação PDF/Excel
- [ ] Múltiplos usuários por confeitaria (equipe)
- [ ] Planos pagos com Stripe (monetização)
- [ ] Notificações WhatsApp de fechamento de caixa

---

Dúvidas? Cada passo tem suporte pela documentação oficial:
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs
- Vite: https://vitejs.dev/guide
