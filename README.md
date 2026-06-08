# 🏆 Bolão Copa do Mundo 2026

App web completo para o bolão do grupo. Ranking automático, 102 jogos, 42 participantes.

---

## 🚀 Como subir no Netlify (grátis, 5 minutos)

### Passo 1 — Criar conta no Netlify
- Acesse https://netlify.com e clique em **Sign up**
- Entre com sua conta **GitHub** ou **Google** (mais fácil)

### Passo 2 — Fazer deploy
**Opção A — Arrastar e soltar (mais simples):**
1. Rode `npm run build` na pasta do projeto
2. Acesse https://app.netlify.com
3. Arraste a pasta **`build/`** direto para a tela do Netlify
4. Pronto! Você receberá um link como `https://nome-aleatorio.netlify.app`

**Opção B — Conectar com GitHub (recomendado para atualizar fácil):**
1. Crie um repositório no GitHub e faça push desta pasta
2. No Netlify: **Add new site → Import an existing project**
3. Conecte o GitHub e selecione o repositório
4. Build command: `npm run build`  |  Publish directory: `build`
5. Clique em **Deploy site**

### Passo 3 — Personalizar o domínio (opcional)
- No painel do Netlify: **Domain settings → Add custom domain**
- Ou use o link gratuito `.netlify.app` mesmo

---

## 🚀 Como subir no Vercel (alternativa)

1. Acesse https://vercel.com e faça login com GitHub
2. Clique em **New Project → Import Git Repository**
3. Selecione o repositório
4. Framework preset: **Create React App**
5. Clique em **Deploy**

---

## ⚙️ Configurações importantes

### Trocar a senha de admin
No arquivo `src/App.jsx`, linha com `const ADMIN_PWD`:
```js
const ADMIN_PWD = "copa2026admin"; // ← troque isso!
```

### Como acessar a área admin
- Clique **5 vezes rápidas** no ícone 🏆 no rodapé
- Digite a senha do organizador
- Você verá campos extras em cada jogo para inserir o resultado real

### Como funciona o armazenamento
Os palpites ficam salvos no **localStorage do navegador** de cada usuário.
Ou seja: cada pessoa salva no próprio dispositivo.

> ⚠️ Isso significa que se a pessoa trocar de celular/computador, perde os palpites.
> Para armazenamento compartilhado (todos veem os palpites de todos), seria necessário
> um backend com banco de dados. Me avise se quiser essa versão.

---

## 📱 Funcionalidades

- ✅ Seleção de participante por dropdown (42 nomes)
- ✅ 102 jogos: grupos + oitavas + quartas + semis + 3º lugar + final
- ✅ Pontuação automática (3pts exato / 2pts saldo / 1pt vencedor)
- ✅ Multiplicadores por fase (×2 oitavas, ×3 quartas, ×4 semis, ×5 final)
- ✅ Ranking ao vivo com posição, pontos, exatos e acertos
- ✅ Área admin protegida por senha para inserir resultados reais
- ✅ Barra de progresso de preenchimento
- ✅ Funciona no celular
- ✅ Salva automaticamente no dispositivo

---

## 🛠 Rodar localmente

```bash
npm install
npm start
```
Abre em http://localhost:3000
