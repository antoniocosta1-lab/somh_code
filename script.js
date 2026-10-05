import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://seenosqzebxqhevgbmqb.supabase.co';
const SUPABASE_ANON = 'sb_publishable_Ainzksg2Iv9UpApRCguaWQ_jkxBwzLv';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ===== ELEMENTOS =====
const telaAuth = document.getElementById('telaAuth');
const telaPainel = document.getElementById('telaPainel');
const form = document.getElementById('formAuth');
const btnToggle = document.getElementById('btnToggle');
const txtToggle = document.getElementById('txtToggle');
const subtitulo = document.getElementById('subtitulo');
const btnEnviar = document.getElementById('btnEnviar');
const msg = document.getElementById('msg');
const senhaInput = document.getElementById('senha');
const emailInput = document.getElementById('email');
const btnOlho = document.getElementById('btnOlho');
const svgOlhoAberto = document.getElementById('svgOlhoAberto');
const svgOlhoRiscado = document.getElementById('svgOlhoRiscado');
const emailUser = document.getElementById('emailUser');
const btnSair = document.getElementById('btnSair');
const btnCriarCategoria = document.getElementById('btnCriarCategoria');
const btnAddAnotacao = document.getElementById('btnAddAnotacao');
const btnCriarMes = document.getElementById('btnCriarMes');
const btnAddCompraManual = document.getElementById('btnAddCompraManual');
const selectCompraCategoria = document.getElementById('compraCategoria');
const avisoCategoria = document.getElementById('avisoCategoria');

// ===== ESTADO =====
let user = null;
let categorias = [];
let categoriasDisponiveis = [];
let anotacoes = [];
let meses = [];
let itensCompra = [];
let modoLogin = false;
let jaCarregou = false;
let jaCarregouMeses = false;
let jaCarregouCompras = false;
let categoriasAbertas = new Set();
let mesesAbertos = new Set();
let anotacaoEditandoId = null;
let produtoEditandoId = null;
let timeoutSalvarDiaMes = null;
let timeoutSalvarCompra = null;

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const NOMES_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ===== OLHO SVG =====
btnOlho.addEventListener('click', () => {
  if (senhaInput.type === 'password') {
    senhaInput.type = 'text';
    svgOlhoAberto.style.display = 'none';
    svgOlhoRiscado.style.display = 'block';
  } else {
    senhaInput.type = 'password';
    svgOlhoAberto.style.display = 'block';
    svgOlhoRiscado.style.display = 'none';
  }
});

// ===== MÁSCARA DE DATA =====
window.mascaraData = function(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 8) v = v.slice(0, 8);
  if (v.length >= 5) {
    v = v.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
  } else if (v.length >= 3) {
    v = v.replace(/(\d{2})(\d{0,2})/, '$1/$2');
  }
  input.value = v;
};

function dataParaBanco(d) {
  if (!d) return null;
  d = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const partes = d.split('/');
  if (partes.length !== 3) return null;
  let [dia, mes, ano] = partes;
  dia = dia.padStart(2, '0');
  mes = mes.padStart(2, '0');
  if (ano.length === 2) ano = '20' + ano;
  if (dia.length !== 2 || mes.length !== 2 || ano.length !== 4) return null;
  const data = new Date(`${ano}-${mes}-${dia}T00:00:00`);
  if (isNaN(data.getTime())) return null;
  return `${ano}-${mes}-${dia}`;
}

function formatarData(d) {
  if (!d) return null;
  const [ano, mes, dia] = d.split('-');
  return `${dia}/${mes}/${ano}`;
}

// ===== MENSAGENS =====
function mostrarMsg(texto, tipo) {
  msg.textContent = texto;
  msg.className = 'msg ' + tipo;
}
function traduzErro(m) {
  if (m.includes('Invalid login credentials')) return 'Email ou senha incorretos.';
  if (m.includes('User already registered')) return 'Esse email já está cadastrado. Faça login.';
  if (m.includes('Password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('Unable to validate email')) return 'Email inválido.';
  if (m.includes('Email not confirmed')) return 'Confirme seu email antes de entrar.';
  if (m.includes('relation') && m.includes('does not exist')) return 'As tabelas não existem. Rode o SQL no Supabase!';
  return m;
}

// ===== TELAS =====
async function mostrarPainel(session) {
  user = session.user;
  telaAuth.style.display = 'none';
  telaPainel.style.display = 'block';
  emailUser.textContent = user.email;
  await carregar();
  await carregarAnotacoes();
  await carregarMeses();
  await carregarCompras();
}

function mostrarAuth() {
  telaAuth.style.display = 'flex';
  telaPainel.style.display = 'none';
  user = null;
  categorias = [];
  categoriasDisponiveis = [];
  anotacoes = [];
  meses = [];
  itensCompra = [];
  jaCarregou = false;
  jaCarregouMeses = false;
  jaCarregouCompras = false;
  categoriasAbertas.clear();
  mesesAbertos.clear();
}

const { data: { session } } = await supabase.auth.getSession();
if (session) mostrarPainel(session);
else mostrarAuth();

supabase.auth.onAuthStateChange((event, session) => {
  if (session) mostrarPainel(session);
  else mostrarAuth();
});

window.trocarAba = function(nome) {
  document.querySelectorAll('.aba').forEach(a => a.classList.remove('ativa'));
  document.querySelectorAll('.conteudo-aba').forEach(c => c.classList.remove('ativa'));
  document.querySelector(`.aba[data-aba="${nome}"]`).classList.add('ativa');
  document.getElementById(`aba-${nome}`).classList.add('ativa');

  if (nome === 'compras') {
    carregarCompras();
  }
};

btnToggle.addEventListener('click', () => {
  modoLogin = !modoLogin;
  if (modoLogin) {
    subtitulo.textContent = 'Entre na sua conta';
    btnEnviar.textContent = 'Entrar';
    txtToggle.textContent = 'Não tem conta?';
    btnToggle.textContent = 'Criar conta';
  } else {
    subtitulo.textContent = 'Crie sua conta';
    btnEnviar.textContent = 'Cadastrar';
    txtToggle.textContent = 'Já tem conta?';
    btnToggle.textContent = 'Entrar';
  }
  msg.className = 'msg';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnEnviar.disabled = true;
  msg.className = 'msg';

  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  if (modoLogin) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      mostrarMsg(traduzErro(error.message), 'erro');
      btnEnviar.disabled = false;
      return;
    }
    await mostrarPainel(data.session);
  } else {
    const { data, error } = await supabase.auth.signUp({ email, password: senha });
    if (error) {
      mostrarMsg(traduzErro(error.message), 'erro');
      btnEnviar.disabled = false;
      return;
    }
    if (data.session) {
      await mostrarPainel(data.session);
    } else {
      mostrarMsg('Conta criada! Verifique o email ou faça login.', 'ok');
      setTimeout(() => {
        modoLogin = true;
        subtitulo.textContent = 'Entre na sua conta';
        btnEnviar.textContent = 'Entrar';
        txtToggle.textContent = 'Não tem conta?';
        btnToggle.textContent = 'Criar conta';
        msg.className = 'msg';
      }, 1800);
    }
  }
  btnEnviar.disabled = false;
});

btnSair.addEventListener('click', async () => {
  await supabase.auth.signOut();
  emailInput.value = '';
  senhaInput.value = '';
  mostrarMsg('Você saiu da conta.', 'info');
  mostrarAuth();
});

// ============================================
//  PRODUTOS
// ============================================
async function carregar(silencioso = false) {
  const lista = document.getElementById('listaCategorias');
  if (!silencioso && !jaCarregou) {
    lista.innerHTML = '<p class="carregando">CARREGANDO...</p>';
  }

  const { data: cats, error: e1 } = await supabase
    .from('categorias').select('*').order('created_at', { ascending: true });
  if (e1) { lista.innerHTML = '<p class="vazio">Erro: ' + e1.message + '</p>'; return; }

  const { data: prods, error: e2 } = await supabase
    .from('produtos').select('*').order('created_at', { ascending: true });
  if (e2) { lista.innerHTML = '<p class="vazio">Erro: ' + e2.message + '</p>'; return; }

  categorias = cats.map(c => ({
    ...c,
    produtos: prods.filter(p => p.categoria_id === c.id)
  }));

  jaCarregou = true;
  render();
}

window.toggleCategoria = function(catId) {
  const el = document.querySelector(`.categoria[data-cat-id="${catId}"]`);
  if (!el) return;
  if (categoriasAbertas.has(catId)) {
    categoriasAbertas.delete(catId);
    el.classList.remove('aberta');
  } else {
    categoriasAbertas.add(catId);
    el.classList.add('aberta');
  }
};

function render() {
  const lista = document.getElementById('listaCategorias');

  if (categorias.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhuma categoria criada ainda. Crie a primeira acima!</p>';
    return;
  }

  lista.innerHTML = categorias.map(cat => {
    const estaAberta = categoriasAbertas.has(cat.id);
    const qtd = cat.produtos.length;
    const textoQtd = qtd === 0 ? 'vazia' : (qtd === 1 ? '1 item' : `${qtd} itens`);

    return `
    <div class="categoria ${estaAberta ? 'aberta' : ''}" data-cat-id="${cat.id}">
      <div class="categoria-header" onclick="toggleCategoria('${cat.id}')">
        <div class="cat-titulo">
          <span class="seta">▶</span>
          <h3>${cat.nome}</h3>
          <span class="cat-contador">${textoQtd}</span>
        </div>
        <button class="secundario mini" onclick="event.stopPropagation(); removerCategoria('${cat.id}')">🗑</button>
      </div>

      <div class="categoria-corpo">
        <div class="form-produto">
          <input type="text" id="prodNome-${cat.id}" placeholder="Nome do produto">
          <input type="number" id="prodPreco-${cat.id}" class="preco" placeholder="Preço R$" step="0.01" min="0">
          <button class="acao" onclick="adicionarProduto('${cat.id}')">+ Adicionar</button>
        </div>

        ${qtd === 0
          ? '<p class="vazio">Nenhum produto nessa categoria.</p>'
          : cat.produtos.map(p => `
            <div class="produto">
              <div class="produto-info">
                <span class="nome">${p.nome}</span>
                <span class="preco">R$ ${Number(p.preco).toFixed(2)}</span>
              </div>

              <div class="estoque-controle">
                <button onclick="alterarEstoque('${p.id}', -1)">−</button>
                <input type="number" min="0" value="${p.estoque || 0}"
                  data-prod="${p.id}"
                  onchange="setEstoque('${p.id}', this.value)">
                <button onclick="alterarEstoque('${p.id}', 1)">+</button>
              </div>

              <button class="edit-prod" onclick="abrirEdicaoProduto('${p.id}')" title="Editar produto">✏️</button>
              <button class="secundario mini" onclick="removerProduto('${p.id}')">🗑</button>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
  }).join('');
}

btnCriarCategoria.addEventListener('click', async () => {
  const input = document.getElementById('novaCategoria');
  const nome = input.value.trim();
  if (!nome) return alert('Digite um nome para a categoria!');

  const { error } = await supabase.from('categorias').insert({ nome, user_id: user.id });
  if (error) return alert('Erro: ' + error.message);
  input.value = '';
  await carregar(true);
});

window.removerCategoria = async function(id) {
  categorias = categorias.filter(c => c.id !== id);
  categoriasAbertas.delete(id);
  render();
  const { error } = await supabase.from('categorias').delete().eq('id', id);
  if (error) { alert('Erro: ' + error.message); carregar(true); }
};

window.adicionarProduto = async function(catId) {
  const nomeInput = document.getElementById(`prodNome-${catId}`);
  const precoInput = document.getElementById(`prodPreco-${catId}`);
  const nome = nomeInput.value.trim();
  const preco = parseFloat(precoInput.value) || 0;

  if (!nome) return alert('Digite o nome do produto!');

  const { error } = await supabase.from('produtos').insert({
    nome, preco, estoque: 0, categoria_id: catId, user_id: user.id,
    ja_teve_estoque: false
  });
  if (error) return alert('Erro: ' + error.message);
  nomeInput.value = '';
  precoInput.value = '';
  categoriasAbertas.add(catId);
  await carregar(true);
};

window.removerProduto = async function(prodId) {
  for (const cat of categorias) {
    const idx = cat.produtos.findIndex(p => p.id === prodId);
    if (idx !== -1) { cat.produtos.splice(idx, 1); break; }
  }
  render();
  const { error } = await supabase.from('produtos').delete().eq('id', prodId);
  if (error) { alert('Erro: ' + error.message); carregar(true); }
};

// ===== EDITAR PRODUTO =====
window.abrirEdicaoProduto = function(id) {
  // Acha o produto dentro das categorias
  let prod = null;
  for (const cat of categorias) {
    const p = cat.produtos.find(x => x.id === id);
    if (p) { prod = p; break; }
  }
  if (!prod) return;

  produtoEditandoId = id;
  document.getElementById('editProdNome').value = prod.nome || '';
  document.getElementById('editProdPreco').value = prod.preco || 0;

  document.getElementById('modalEditarProduto').classList.add('aberto');
};

window.fecharModalProduto = function() {
  document.getElementById('modalEditarProduto').classList.remove('aberto');
  produtoEditandoId = null;
};

window.salvarEdicaoProduto = async function() {
  if (!produtoEditandoId) return;

  const nome = document.getElementById('editProdNome').value.trim();
  const preco = parseFloat(document.getElementById('editProdPreco').value) || 0;

  if (!nome) return alert('O nome não pode ficar vazio!');

  const { error } = await supabase.from('produtos').update({
    nome,
    preco
  }).eq('id', produtoEditandoId);

  if (error) return alert('Erro: ' + error.message);

  fecharModalProduto();
  await carregar(true);
  await carregarCompras(true);
};

// Fecha modal clicando fora
document.getElementById('modalEditarProduto').addEventListener('click', (e) => {
  if (e.target.id === 'modalEditarProduto') fecharModalProduto();
});

// ESC fecha modais
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    fecharModal();
    fecharModalProduto();
  }
});

window.alterarEstoque = async function(prodId, delta) {
  let prod = null;
  for (const cat of categorias) {
    const p = cat.produtos.find(x => x.id === prodId);
    if (p) { prod = p; break; }
  }
  if (!prod) return;

  const novo = Math.max(0, (prod.estoque || 0) + delta);
  prod.estoque = novo;

  const updates = { estoque: novo };
  if (novo > 0) updates.ja_teve_estoque = true;

  const inputEl = document.querySelector(`input[data-prod="${prodId}"]`);
  if (inputEl) {
    inputEl.value = novo;
    inputEl.classList.add('estoque-flash');
    setTimeout(() => inputEl.classList.remove('estoque-flash'), 350);
  }

  const { error } = await supabase.from('produtos').update(updates).eq('id', prodId);
  if (error) { alert('Erro: ' + error.message); carregar(true); }
};

window.setEstoque = async function(prodId, valor) {
  const novo = Math.max(0, parseInt(valor) || 0);

  for (const cat of categorias) {
    const p = cat.produtos.find(x => x.id === prodId);
    if (p) { p.estoque = novo; break; }
  }

  const updates = { estoque: novo };
  if (novo > 0) updates.ja_teve_estoque = true;

  const { error } = await supabase.from('produtos').update(updates).eq('id', prodId);
  if (error) { alert('Erro: ' + error.message); carregar(true); }
};

// ============================================
//  ANOTAÇÕES
// ============================================
async function carregarAnotacoes(silencioso = false) {
  const lista = document.getElementById('listaAnotacoes');
  if (!silencioso) lista.innerHTML = '<p class="carregando">CARREGANDO...</p>';

  const { data, error } = await supabase
    .from('anotacoes').select('*')
    .eq('concluida', false)
    .order('created_at', { ascending:false });

  if (error) { lista.innerHTML = '<p class="vazio">Erro: ' + error.message + '</p>'; return; }

  anotacoes = data || [];
  renderAnotacoes();
}

function renderAnotacoes() {
  const lista = document.getElementById('listaAnotacoes');

  if (anotacoes.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhuma anotação ainda. Adicione a primeira acima!</p>';
    return;
  }

  lista.innerHTML = anotacoes.map(a => {
    const temDatas = !!(a.data_inicio || a.data_entrega);
    const temValor = Number(a.valor) > 0;

    return `
    <div class="anotacao" data-id="${a.id}">
      <div class="anot-header">
        <div style="flex:1; min-width:180px;">
          <div class="anot-descricao">${a.descricao}</div>
          ${a.nome_cliente ? `<div class="anot-cliente">${a.nome_cliente}</div>` : ''}
        </div>
        <div class="anot-botoes">
          <button class="check" onclick="toggleConcluida('${a.id}')" title="Marcar como concluída">✓</button>
          <button class="edit" onclick="abrirEdicao('${a.id}')" title="Editar">✏️</button>
        </div>
      </div>

      ${(temDatas || temValor) ? `
      <div class="anot-acoes">
        ${a.data_inicio ? `<div class="anot-info"><span class="label">📥 Recebido</span><span class="valor">${formatarData(a.data_inicio)}</span></div>` : ''}
        ${a.data_entrega ? `<div class="anot-info"><span class="label">📤 Entrega</span><span class="valor">${formatarData(a.data_entrega)}</span></div>` : ''}
        ${temValor ? `<div class="anot-valor">R$ ${Number(a.valor).toFixed(2)}</div>` : ''}
      </div>
      ` : ''}
    </div>
  `;
  }).join('');
}

btnAddAnotacao.addEventListener('click', async () => {
  const descricao = document.getElementById('anotDescricao').value.trim();
  const cliente = document.getElementById('anotCliente').value.trim();
  const dataInicioStr = document.getElementById('anotDataInicio').value;
  const dataEntregaStr = document.getElementById('anotDataEntrega').value;
  const dataInicio = dataParaBanco(dataInicioStr);
  const dataEntrega = dataParaBanco(dataEntregaStr);
  const valor = parseFloat(document.getElementById('anotValor').value) || 0;

  if (!descricao) return alert('Digite a descrição do serviço!');

  if (dataInicioStr && !dataInicio) return alert('Data de recebido inválida! Use dd/mm/aaaa.');
  if (dataEntregaStr && !dataEntrega) return alert('Data de entrega inválida! Use dd/mm/aaaa.');

  const { error } = await supabase.from('anotacoes').insert({
    descricao,
    nome_cliente: cliente || null,
    data_inicio: dataInicio,
    data_entrega: dataEntrega,
    valor,
    concluida: false,
    user_id: user.id
  });

  if (error) return alert('Erro: ' + error.message);

  document.getElementById('anotDescricao').value = '';
  document.getElementById('anotCliente').value = '';
  document.getElementById('anotDataInicio').value = '';
  document.getElementById('anotDataEntrega').value = '';
  document.getElementById('anotValor').value = '';

  await carregarAnotacoes(true);
});

window.toggleConcluida = async function(id) {
  const card = document.querySelector(`.anotacao[data-id="${id}"]`);
  if (card) {
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateX(30px)';
    card.style.maxHeight = '0';
    card.style.marginBottom = '0';
    card.style.padding = '0';
    card.style.overflow = 'hidden';
  }

  anotacoes = anotacoes.filter(a => a.id !== id);

  const { error } = await supabase.from('anotacoes').update({ concluida: true }).eq('id', id);
  if (error) {
    alert('Erro: ' + error.message);
    await carregarAnotacoes(true);
    return;
  }

  setTimeout(() => renderAnotacoes(), 300);
};

window.abrirEdicao = function(id) {
  const a = anotacoes.find(x => x.id === id);
  if (!a) return;

  anotacaoEditandoId = id;
  document.getElementById('editDescricao').value = a.descricao || '';
  document.getElementById('editCliente').value = a.nome_cliente || '';
  document.getElementById('editDataInicio').value = a.data_inicio ? formatarData(a.data_inicio) : '';
  document.getElementById('editDataEntrega').value = a.data_entrega ? formatarData(a.data_entrega) : '';
  document.getElementById('editValor').value = a.valor || '';

  document.getElementById('modalEditar').classList.add('aberto');
};

window.fecharModal = function() {
  document.getElementById('modalEditar').classList.remove('aberto');
  anotacaoEditandoId = null;
};

window.salvarEdicao = async function() {
  if (!anotacaoEditandoId) return;

  const descricao = document.getElementById('editDescricao').value.trim();
  const cliente = document.getElementById('editCliente').value.trim();
  const dataInicioStr = document.getElementById('editDataInicio').value;
  const dataEntregaStr = document.getElementById('editDataEntrega').value;
  const dataInicio = dataParaBanco(dataInicioStr);
  const dataEntrega = dataParaBanco(dataEntregaStr);
  const valor = parseFloat(document.getElementById('editValor').value) || 0;

  if (!descricao) return alert('A descrição não pode ficar vazia!');
  if (dataInicioStr && !dataInicio) return alert('Data de recebido inválida! Use dd/mm/aaaa.');
  if (dataEntregaStr && !dataEntrega) return alert('Data de entrega inválida! Use dd/mm/aaaa.');

  const { error } = await supabase.from('anotacoes').update({
    descricao,
    nome_cliente: cliente || null,
    data_inicio: dataInicio,
    data_entrega: dataEntrega,
    valor
  }).eq('id', anotacaoEditandoId);

  if (error) return alert('Erro: ' + error.message);

  fecharModal();
  await carregarAnotacoes(true);
};

document.getElementById('modalEditar').addEventListener('click', (e) => {
  if (e.target.id === 'modalEditar') fecharModal();
});

// ============================================
//  FATURAMENTO — MESES
// ============================================
function gerarSemanasDoMes(ano, mes) {
  const semanas = [];
  const ultimoDia = new Date(ano, mes, 0).getDate();

  let semanaAtual = [];
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const data = new Date(ano, mes - 1, dia);
    const diaSemana = data.getDay();
    const diaSemanaSeg = (diaSemana + 6) % 7;

    semanaAtual.push({
      data: `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`,
      dia, mes, ano,
      diaSemana: diaSemanaSeg
    });

    if (diaSemanaSeg === 6 || dia === ultimoDia) {
      semanas.push({ dias: semanaAtual });
      semanaAtual = [];
    }
  }

  if (semanaAtual.length > 0) semanas.push({ dias: semanaAtual });
  return semanas;
}

async function carregarMeses(silencioso = false) {
  const lista = document.getElementById('listaMeses');
  if (!silencioso && !jaCarregouMeses) {
    lista.innerHTML = '<p class="carregando">CARREGANDO...</p>';
  }

  const { data, error } = await supabase
    .from('meses').select('*')
    .order('ano', { ascending: false })
    .order('mes', { ascending: false });

  if (error) { lista.innerHTML = '<p class="vazio">Erro: ' + error.message + '</p>'; return; }

  meses = data || [];
  jaCarregouMeses = true;
  renderMeses();
}

window.toggleMes = function(id) {
  const el = document.querySelector(`.mes[data-mes-id="${id}"]`);
  if (!el) return;
  if (mesesAbertos.has(id)) {
    mesesAbertos.delete(id);
    el.classList.remove('aberto');
  } else {
    mesesAbertos.add(id);
    el.classList.add('aberto');
  }
};

function renderMeses() {
  const lista = document.getElementById('listaMeses');

  if (meses.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhum mês criado ainda. Crie o primeiro acima!</p>';
    return;
  }

  lista.innerHTML = meses.map(m => {
    const aberto = mesesAbertos.has(m.id);
    const valores = m.valores || {};
    const concluidas = m.semanas_concluidas || [];
    const total = Object.values(valores).reduce((acc, v) => acc + (Number(v) || 0), 0);
    const nomeMes = NOMES_MESES[m.mes - 1];

    const semanas = gerarSemanasDoMes(m.ano, m.mes);

    return `
    <div class="mes ${aberto ? 'aberto' : ''}" data-mes-id="${m.id}">
      <div class="mes-header" onclick="toggleMes('${m.id}')">
        <div class="mes-titulo">
          <span class="seta">▶</span>
          <h3>${nomeMes} ${m.ano}</h3>
        </div>
        <span class="mes-total-badge">R$ ${total.toFixed(2)}</span>
        <button class="secundario mini" onclick="event.stopPropagation(); removerMes('${m.id}')">🗑</button>
      </div>

      <div class="mes-corpo">
        ${semanas.map((sem, idx) => {
          const totalSem = sem.dias.reduce((acc, d) => acc + (Number(valores[d.data]) || 0), 0);
          const concluida = concluidas.includes(idx);

          return `
          <div class="semana-mes ${concluida ? 'concluida' : ''}">
            <div class="semana-mes-header">
              <span class="semana-mes-titulo">Semana ${idx + 1}</span>
              <span class="semana-mes-total">R$ ${totalSem.toFixed(2)}</span>
              <button class="btn-concluir-semana ${concluida ? 'concluida' : ''}" 
                onclick="toggleConcluirSemana('${m.id}', ${idx})">
                ${concluida ? '✓ Concluída' : 'Concluir'}
              </button>
            </div>

            <div class="dias-grid">
              ${sem.dias.map(d => {
                const valor = valores[d.data] || '';
                return `
                  <div class="dia-card ${valor ? 'tem-valor' : ''}">
                    <div class="dia-nome">${DIAS_SEMANA[d.diaSemana]}</div>
                    <div class="dia-data">${String(d.dia).padStart(2,'0')}/${String(d.mes).padStart(2,'0')}</div>
                    <input type="number" class="dia-input" 
                      data-mes="${m.id}" 
                      data-data="${d.data}"
                      value="${valor}"
                      placeholder="0"
                      step="0.01" min="0"
                      ${concluida ? 'disabled' : ''}
                      oninput="salvarDiaMes('${m.id}', '${d.data}', this.value)">
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          `;
        }).join('')}

        <div class="mes-footer">
          <div class="mes-total-final">
            <span class="label">Total do mês</span>
            <span class="valor" id="total-mes-${m.id}">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

btnCriarMes.addEventListener('click', async () => {
  const valorInput = document.getElementById('fatMes').value;
  if (!valorInput) return alert('Escolha um mês!');

  const [anoStr, mesStr] = valorInput.split('-');
  const ano = parseInt(anoStr);
  const mes = parseInt(mesStr);

  const jaExiste = meses.some(m => m.ano === ano && m.mes === mes);
  if (jaExiste) return alert('Esse mês já foi criado!');

  const { error } = await supabase.from('meses').insert({
    mes, ano,
    valores: {},
    semanas_concluidas: [],
    user_id: user.id
  });

  if (error) return alert('Erro: ' + error.message);

  document.getElementById('fatMes').value = '';
  await carregarMeses(true);

  const criado = meses.find(m => m.ano === ano && m.mes === mes);
  if (criado) {
    mesesAbertos.add(criado.id);
    renderMeses();
  }
});

window.salvarDiaMes = function(mesId, data, valor) {
  const m = meses.find(x => x.id === mesId);
  if (!m) return;

  const v = parseFloat(valor) || 0;
  if (!m.valores) m.valores = {};

  if (v > 0) m.valores[data] = v;
  else delete m.valores[data];

  const total = Object.values(m.valores).reduce((acc, x) => acc + (Number(x) || 0), 0);
  const totalEl = document.getElementById(`total-mes-${mesId}`);
  if (totalEl) totalEl.textContent = total.toFixed(2);

  const badge = document.querySelector(`.mes[data-mes-id="${mesId}"] .mes-total-badge`);
  if (badge) badge.textContent = `R$ ${total.toFixed(2)}`;

  const card = document.querySelector(`input[data-mes="${mesId}"][data-data="${data}"]`)?.closest('.dia-card');
  if (card) card.classList.toggle('tem-valor', v > 0);

  const inputEl = document.querySelector(`input[data-mes="${mesId}"][data-data="${data}"]`);
  if (inputEl) {
    const semanaEl = inputEl.closest('.semana-mes');
    if (semanaEl) {
      const inputs = semanaEl.querySelectorAll('.dia-input');
      let totalSem = 0;
      inputs.forEach(inp => { totalSem += parseFloat(inp.value) || 0; });
      const totalSemEl = semanaEl.querySelector('.semana-mes-total');
      if (totalSemEl) totalSemEl.textContent = `R$ ${totalSem.toFixed(2)}`;
    }
  }

  clearTimeout(timeoutSalvarDiaMes);
  timeoutSalvarDiaMes = setTimeout(async () => {
    const { error } = await supabase.from('meses')
      .update({ valores: m.valores })
      .eq('id', mesId);
    if (error) alert('Erro ao salvar: ' + error.message);
  }, 600);
};

window.toggleConcluirSemana = async function(mesId, semanaIdx) {
  const m = meses.find(x => x.id === mesId);
  if (!m) return;

  if (!m.semanas_concluidas) m.semanas_concluidas = [];

  const idx = m.semanas_concluidas.indexOf(semanaIdx);
  if (idx !== -1) {
    m.semanas_concluidas.splice(idx, 1);
  } else {
    m.semanas_concluidas.push(semanaIdx);
  }

  renderMeses();

  const { error } = await supabase.from('meses')
    .update({ semanas_concluidas: m.semanas_concluidas })
    .eq('id', mesId);
  if (error) { alert('Erro: ' + error.message); carregarMeses(true); }
};

window.removerMes = async function(id) {
  meses = meses.filter(m => m.id !== id);
  mesesAbertos.delete(id);
  renderMeses();

  const { error } = await supabase.from('meses').delete().eq('id', id);
  if (error) { alert('Erro: ' + error.message); carregarMeses(true); }
};

// ============================================
//  ABA COMPRAS
// ============================================
async function carregarCompras(silencioso = false) {
  const lista = document.getElementById('listaCompras');
  if (!silencioso && !jaCarregouCompras) {
    lista.innerHTML = '<p class="carregando">CARREGANDO...</p>';
  }

  const { data: cats } = await supabase
    .from('categorias')
    .select('id, nome')
    .order('nome', { ascending: true });

  categoriasDisponiveis = cats || [];

  if (selectCompraCategoria) {
    if (categoriasDisponiveis.length === 0) {
      selectCompraCategoria.innerHTML = '<option value="">Sem categoria</option>';
      selectCompraCategoria.disabled = true;
      avisoCategoria.style.display = 'block';
      btnAddCompraManual.disabled = true;
    } else {
      selectCompraCategoria.innerHTML = '<option value="">Escolha a categoria...</option>' +
        categoriasDisponiveis.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
      selectCompraCategoria.disabled = false;
      avisoCategoria.style.display = 'none';
      btnAddCompraManual.disabled = false;
    }
  }

  const { data: prods, error: e1 } = await supabase
    .from('produtos')
    .select('*')
    .eq('estoque', 0)
    .eq('ja_teve_estoque', true)
    .order('nome', { ascending: true });

  if (e1) { lista.innerHTML = '<p class="vazio">Erro: ' + e1.message + '</p>'; return; }

  const catMap = {};
  categoriasDisponiveis.forEach(c => { catMap[c.id] = c.nome; });

  itensCompra = (prods || []).map(p => ({
    id: p.id,
    nome: p.nome,
    categoria: catMap[p.categoria_id] || 'Sem categoria',
    valor_compra: Number(p.valor_compra) || 0,
    qtd_comprar: Number(p.qtd_comprar) || 1,
    produto_id: p.id,
    extra: false,
    categoria_id: p.categoria_id
  }));

  jaCarregouCompras = true;
  renderCompras();
}

function renderCompras() {
  const lista = document.getElementById('listaCompras');
  const resumo = document.getElementById('comprasResumo');

  if (itensCompra.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhum produto zerado no estoque. Tudo em ordem! 🎉</p>';
    resumo.innerHTML = '';
    return;
  }

  let total = 0;
  let totalItens = 0;
  itensCompra.forEach(i => {
    total += (Number(i.valor_compra) || 0) * (Number(i.qtd_comprar) || 0);
    totalItens += Number(i.qtd_comprar) || 0;
  });

  resumo.innerHTML = `
    <div>
      <div class="label">Total da compra</div>
      <div class="total">${total.toFixed(2)}</div>
    </div>
    <div style="text-align:right;">
      <div class="label">Itens</div>
      <div class="qtd"><strong>${itensCompra.length}</strong> produtos · <strong>${totalItens}</strong> unidades</div>
    </div>
  `;

  lista.innerHTML = itensCompra.map((item, idx) => {
    const subtotal = (Number(item.valor_compra) || 0) * (Number(item.qtd_comprar) || 0);
    return `
      <div class="item-compra ${item.extra ? 'extra' : ''}">
        <div class="item-compra-info">
          <div class="nome">${item.nome}</div>
          <div class="categoria">${item.extra ? 'Novo · ' : ''}${item.categoria}</div>
          ${item.extra ? '<div class="aviso">🆕 Produto novo</div>' : '<div class="aviso">⚠ Estoque zerado</div>'}
        </div>

        <div class="item-compra-controles">
          <input type="number" class="qtd" min="1" step="1" value="${item.qtd_comprar}"
            placeholder="Qtd"
            oninput="atualizarItemCompra(${idx}, 'qtd_comprar', this.value)">
          <input type="number" class="valor" min="0" step="0.01" value="${item.valor_compra || ''}"
            placeholder="R$ cada"
            oninput="atualizarItemCompra(${idx}, 'valor_compra', this.value)">
        </div>

        <div class="item-compra-subtotal">R$ ${subtotal.toFixed(2)}</div>

        <button class="btn-comprei" onclick="compreiItem(${idx})">✓ Comprei</button>
      </div>
    `;
  }).join('');
}

btnAddCompraManual.addEventListener('click', () => {
  const nome = document.getElementById('compraNome').value.trim();
  const catId = selectCompraCategoria.value;
  const qtd = parseInt(document.getElementById('compraQtd').value) || 1;
  const valor = parseFloat(document.getElementById('compraValor').value) || 0;

  if (!nome) return alert('Digite o nome do produto!');
  if (!catId) return alert('Escolha uma categoria!');
  if (qtd <= 0) return alert('Quantidade precisa ser maior que 0!');

  const cat = categoriasDisponiveis.find(c => c.id === catId);
  if (!cat) return alert('Categoria não encontrada!');

  itensCompra.push({
    id: 'extra-' + Date.now(),
    nome: nome,
    categoria: cat.nome,
    categoria_id: catId,
    valor_compra: valor,
    qtd_comprar: qtd,
    extra: true
  });

  document.getElementById('compraNome').value = '';
  document.getElementById('compraQtd').value = '';
  document.getElementById('compraValor').value = '';
  selectCompraCategoria.value = '';

  renderCompras();
});

window.atualizarItemCompra = function(idx, campo, valor) {
  if (!itensCompra[idx]) return;
  itensCompra[idx][campo] = parseFloat(valor) || 0;

  let total = 0;
  let totalItens = 0;
  itensCompra.forEach(i => {
    total += (Number(i.valor_compra) || 0) * (Number(i.qtd_comprar) || 0);
    totalItens += Number(i.qtd_comprar) || 0;
  });

  const resumo = document.getElementById('comprasResumo');
  resumo.innerHTML = `
    <div>
      <div class="label">Total da compra</div>
      <div class="total">${total.toFixed(2)}</div>
    </div>
    <div style="text-align:right;">
      <div class="label">Itens</div>
      <div class="qtd"><strong>${itensCompra.length}</strong> produtos · <strong>${totalItens}</strong> unidades</div>
    </div>
  `;

  const el = document.querySelectorAll('.item-compra')[idx];
  if (el) {
    const subtotal = (Number(itensCompra[idx].valor_compra) || 0) * (Number(itensCompra[idx].qtd_comprar) || 0);
    const subEl = el.querySelector('.item-compra-subtotal');
    if (subEl) subEl.textContent = `R$ ${subtotal.toFixed(2)}`;
  }

  if (!itensCompra[idx].extra) {
    clearTimeout(timeoutSalvarCompra);
    timeoutSalvarCompra = setTimeout(async () => {
      const i = itensCompra[idx];
      await supabase.from('produtos').update({
        valor_compra: i.valor_compra,
        qtd_comprar: i.qtd_comprar
      }).eq('id', i.produto_id);
    }, 600);
  }
};

window.compreiItem = async function(idx) {
  const item = itensCompra[idx];
  if (!item) return;

  const qtd = Number(item.qtd_comprar) || 0;
  if (qtd <= 0) return alert('Quantidade precisa ser maior que 0!');

  if (item.extra) {
    const { error } = await supabase.from('produtos').insert({
      nome: item.nome,
      preco: 0,
      valor_compra: item.valor_compra,
      estoque: qtd,
      qtd_comprar: 0,
      ja_teve_estoque: true,
      categoria_id: item.categoria_id,
      user_id: user.id
    });
    if (error) return alert('Erro: ' + error.message);
  } else {
    const { error } = await supabase.from('produtos').update({
      estoque: qtd,
      qtd_comprar: 0,
      ja_teve_estoque: true
    }).eq('id', item.produto_id);
    if (error) return alert('Erro: ' + error.message);
  }

  itensCompra.splice(idx, 1);
  await carregarCompras(true);
  await carregar(true);
};