import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { LoginModal } from './components/LoginModal';
import { 
  LogIn, 
  LogOut, 
  PlusCircle, 
  Trash2, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Paperclip, 
  Calendar, 
  ListFilter,
  Loader2,
  FileCheck,
  Pencil
} from 'lucide-react';

interface Transaction {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  categoria: 'doacao' | 'bazar' | 'rifa' | 'despesa' | 'outros';
  responsavel: string | null;
  comprovante_url: string | null;
  conta_prestada: boolean;
  data_transacao: string;
  criado_em: string;
}

const RESPONSAIVEIS = [
  'Paulinho',
  'Jean',
  'Nayele',
  'Tio Bruno',
  'Ana do Matheus',
  'Ana Felix',
  'Cecilia',
  'Julia',
  'Dudu',
  'Leticia',
  'Renata',
  'Pedro',
  'Sthefany',
  'Vagner',
  'Marcela'
];

export default function App() {
  // Estados de Autenticação
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('sao_pedro_isAdmin') === 'true';
  });
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Estados dos Lançamentos
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controle de Aba
  const [abaAtiva, setAbaAtiva] = useState<'retiradas' | 'prestadas'>('retiradas');

  // Seleção múltipla para ações em lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Estado para Edição
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Estados do Formulário (Admin)
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [categoria, setCategoria] = useState<'doacao' | 'bazar' | 'rifa' | 'despesa' | 'outros'>('doacao');
  const [responsavel, setResponsavel] = useState(RESPONSAIVEIS[0]);
  const [dataTransacao, setDataTransacao] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [comprovante, setComprovante] = useState<File | null>(null);
  
  // Estados de Carregamento Auxiliares
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('todos');

  // Ao mudar o tipo de transação no formulário, ajusta a categoria padrão
  useEffect(() => {
    if (tipo === 'entrada') {
      setCategoria('doacao');
    } else {
      setCategoria('despesa');
    }
  }, [tipo]);

  // Limpa a seleção ao mudar de aba
  useEffect(() => {
    setSelectedIds(new Set());
  }, [abaAtiva]);

  // Buscar transações no Supabase
  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('transacoes')
        .select('*')
        .order('data_transacao', { ascending: false })
        .order('criado_em', { ascending: false });

      if (fetchErr) throw fetchErr;
      setTransactions(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar transações:', err);
      setError('Não foi possível carregar os lançamentos. Verifique se a tabela "transacoes" foi criada no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Login & Logout
  const handleLoginSuccess = () => {
    setIsAdmin(true);
    localStorage.setItem('sao_pedro_isAdmin', 'true');
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('sao_pedro_isAdmin');
    setEditingTransaction(null); // Limpa modo edição ao deslogar
  };

  // Iniciar modo de edição
  const handleStartEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setDescricao(t.descricao);
    setValor(t.valor.toString().replace('.', ','));
    setTipo(t.tipo);
    setCategoria(t.categoria);
    setResponsavel(t.responsavel || RESPONSAIVEIS[0]);
    setDataTransacao(t.data_transacao);
    setComprovante(null); // Reseta novo comprovante
    
    // Rola a tela até o formulário no celular
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancelar modo de edição
  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setDescricao('');
    setValor('');
    setTipo('entrada');
    setCategoria('doacao');
    setResponsavel(RESPONSAIVEIS[0]);
    const today = new Date();
    setDataTransacao(today.toISOString().split('T')[0]);
    setComprovante(null);
  };

  // Upload do Comprovante para o Supabase Storage
  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      setUploadProgress('Enviando comprovante...');
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `comprovantes/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, file);

      if (uploadErr) {
        throw uploadErr;
      }

      // Obter URL pública do arquivo enviado
      const { data } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err: any) {
      console.error('Erro no upload do comprovante:', err);
      alert('Aviso: Falha ao subir comprovante. Certifique-se de que criou o Bucket público "comprovantes" no Supabase Storage. O registro continuará sem comprovante.');
      return null;
    } finally {
      setUploadProgress(null);
    }
  };

  // Submeter Formulário (Inserção ou Edição)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !valor) return;

    setSaving(true);
    try {
      let comprovanteUrl: string | null = editingTransaction ? editingTransaction.comprovante_url : null;
      
      // Se selecionou um novo comprovante, faz o upload
      if (comprovante) {
        comprovanteUrl = await uploadFile(comprovante);
      }

      const parsedValue = parseFloat(valor.replace(',', '.'));
      if (isNaN(parsedValue) || parsedValue <= 0) {
        alert('Por favor, insira um valor válido maior que zero.');
        setSaving(false);
        return;
      }

      if (editingTransaction) {
        // Modo Edição (UPDATE)
        const { error: updateErr } = await supabase
          .from('transacoes')
          .update({
            descricao: descricao.trim(),
            valor: parsedValue,
            tipo,
            categoria,
            responsavel,
            data_transacao: dataTransacao,
            comprovante_url: comprovanteUrl
          })
          .eq('id', editingTransaction.id);

        if (updateErr) throw updateErr;
        setEditingTransaction(null);
      } else {
        // Modo Inserção (INSERT)
        const { error: insertErr } = await supabase
          .from('transacoes')
          .insert([
            {
              descricao: descricao.trim(),
              valor: parsedValue,
              tipo,
              categoria,
              responsavel,
              data_transacao: dataTransacao,
              comprovante_url: comprovanteUrl,
              conta_prestada: false
            }
          ]);

        if (insertErr) throw insertErr;
      }

      // Resetar formulário
      setDescricao('');
      setValor('');
      setComprovante(null);
      setResponsavel(RESPONSAIVEIS[0]);
      const today = new Date();
      setDataTransacao(today.toISOString().split('T')[0]);
      
      // Atualizar lista
      await fetchTransactions();
    } catch (err: any) {
      console.error('Erro ao salvar transação:', err);
      alert('Erro ao salvar transação. Verifique se o banco de dados está pronto e acessível.');
    } finally {
      setSaving(false);
    }
  };

  // Excluir Lançamento
  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este lançamento?')) return;

    try {
      const { error: deleteErr } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      // Atualizar localmente
      setTransactions(prev => prev.filter(t => t.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      
      // Se estava editando o item excluído, sai do modo de edição
      if (editingTransaction?.id === id) {
        handleCancelEdit();
      }
    } catch (err: any) {
      console.error('Erro ao deletar transação:', err);
      alert('Erro ao deletar lançamento do banco de dados.');
    }
  };

  // Seleção de itens
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (filteredList: Transaction[]) => {
    const allSelected = filteredList.length > 0 && filteredList.every(t => selectedIds.has(t.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        filteredList.forEach(t => next.delete(t.id));
      } else {
        filteredList.forEach(t => next.add(t.id));
      }
      return next;
    });
  };

  // Ação em Lote: Prestar Contas
  const handlePrestarContas = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Deseja prestar contas dos ${selectedIds.size} lançamentos selecionados?`)) return;

    setLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from('transacoes')
        .update({ conta_prestada: true })
        .in('id', Array.from(selectedIds));

      if (updateErr) throw updateErr;

      setSelectedIds(new Set());
      await fetchTransactions();
    } catch (err: any) {
      console.error('Erro ao prestar contas:', err);
      alert('Erro ao realizar a prestação de contas no banco de dados. Certifique-se de que rodou o SQL de UPDATE de RLS no painel.');
    } finally {
      setLoading(false);
    }
  };

  // Ação em Lote: Gerar PDF/Planilha
  const handleGerarPDF = () => {
    if (selectedIds.size === 0) return;
    const selectedTransactions = transactions.filter(t => selectedIds.has(t.id));
    
    // Calcula totais do relatório
    const totalEntradasSel = selectedTransactions
      .filter(t => t.tipo === 'entrada')
      .reduce((sum, t) => sum + t.valor, 0);

    const totalSaidasSel = selectedTransactions
      .filter(t => t.tipo === 'saida')
      .reduce((sum, t) => sum + t.valor, 0);

    const saldoSel = totalEntradasSel - totalSaidasSel;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Relatório Financeiro São Pedro</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; background: #fff; }
              .header { text-align: center; border-bottom: 2px solid #2e5a27; padding-bottom: 15px; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 24px; color: #2e5a27; }
              .header p { margin: 5px 0 0 0; font-size: 14px; color: #666; }
              
              .summary-box { display: flex; justify-content: space-between; margin-bottom: 25px; gap: 15px; }
              .summary-card { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 6px; background-color: #fcfcfc; text-align: center; }
              .summary-label { font-size: 11px; text-transform: uppercase; color: #666; font-weight: bold; margin-bottom: 5px; }
              .summary-value { font-size: 16px; font-weight: bold; }
              
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
              th { background-color: #2e5a27; color: #fff; font-weight: bold; text-transform: uppercase; font-size: 11px; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .text-right { text-align: right; }
              .total-row { font-weight: bold; background-color: #f0f0f0 !important; }
              
              .badge { font-weight: bold; text-transform: uppercase; font-size: 9px; padding: 2px 6px; border-radius: 4px; display: inline-block; }
              .badge-entrada { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
              .badge-saida { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Relatório de Movimentação - São Pedro</h1>
              <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            </div>

            <div class="summary-box">
              <div class="summary-card">
                <div class="summary-label">Total Entradas</div>
                <div class="summary-value" style="color: #2e7d32;">${formatMoney(totalEntradasSel)}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Total Saídas</div>
                <div class="summary-value" style="color: #c62828;">${formatMoney(totalSaidasSel)}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Saldo Relatório</div>
                <div class="summary-value" style="color: ${saldoSel >= 0 ? '#1b5e20' : '#b71c1c'};">${formatMoney(saldoSel)}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Quem Enviou</th>
                  <th>Categoria</th>
                  <th>Tipo</th>
                  <th>Comprovante</th>
                  <th class="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${selectedTransactions.map(t => {
                  const dateParts = t.data_transacao.split('-');
                  const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                  const formattedDate = dateObj.toLocaleDateString('pt-BR');
                  return `
                    <tr>
                      <td>${formattedDate}</td>
                      <td style="font-weight: 500;">${t.descricao}</td>
                      <td>${t.responsavel || 'Não informado'}</td>
                      <td>${translateCategory(t.categoria)}</td>
                      <td>
                        <span class="badge ${t.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida'}">
                          ${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td>
                        ${t.comprovante_url ? `<a href="${t.comprovante_url}" target="_blank" style="color: #2e5a27; font-weight: bold; text-decoration: underline;">Ver Comprovante</a>` : '-'}
                      </td>
                      <td class="text-right" style="font-weight: 600; color: ${t.tipo === 'entrada' ? '#2e7d32' : '#c62828'};">
                        ${t.tipo === 'entrada' ? '+' : '-'} ${formatMoney(t.valor)}
                      </td>
                    </tr>
                  `;
                }).join('')}
                <tr class="total-row">
                  <td colspan="6" class="text-right">Saldo Final do Grupo Selecionado:</td>
                  <td class="text-right" style="color: ${saldoSel >= 0 ? '#1b5e20' : '#b71c1c'};">${formatMoney(saldoSel)}</td>
                </tr>
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Cálculos Financeiros
  const totalEntradas = transactions
    .filter(t => t.tipo === 'entrada')
    .reduce((sum, t) => sum + t.valor, 0);

  const totalSaidas = transactions
    .filter(t => t.tipo === 'saida')
    .reduce((sum, t) => sum + t.valor, 0);

  const saldoAtual = totalEntradas - totalSaidas;

  const totalContasPrestadas = transactions
    .filter(t => t.conta_prestada)
    .reduce((sum, t) => sum + t.valor, 0);

  // Filtragem local
  const transactionsFiltradas = transactions.filter(t => {
    // Separa de acordo com a aba selecionada
    const atendeAba = abaAtiva === 'retiradas' ? !t.conta_prestada : t.conta_prestada;
    
    const atendeTipo = filtroTipo === 'todos' || t.tipo === filtroTipo;
    const atendeCategoria = filtroCategoria === 'todas' || t.categoria === filtroCategoria;
    const atendeResponsavel = filtroResponsavel === 'todos' || t.responsavel === filtroResponsavel;
    
    return atendeAba && atendeTipo && atendeCategoria && atendeResponsavel;
  });

  // Formatação de Dinheiro em BRL
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  // Tradutor de categorias
  const translateCategory = (cat: string) => {
    switch (cat) {
      case 'doacao': return 'Doação';
      case 'bazar': return 'Bazar';
      case 'rifa': return 'Rifas';
      case 'despesa': return 'Despesa';
      default: return 'Outros';
    }
  };

  return (
    <div className="container">
      {/* Cabeçalho */}
      <header className="site-header">
        <div className="header-brand">
          <img src="/logo.png" alt="Logo São Pedro" className="header-logo" />
          <div>
            <h1 className="header-title">São Pedro</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Tesouraria &amp; Fluxo de Caixa
            </p>
          </div>
        </div>

        {isAdmin ? (
          <button onClick={handleLogout} className="btn btn-secondary">
            <LogOut size={16} />
            <span>Sair do Admin</span>
          </button>
        ) : (
          <button onClick={() => setIsLoginOpen(true)} className="btn btn-outline-gold">
            <LogIn size={16} />
            <span>Logar</span>
          </button>
        )}
      </header>

      {/* Cartões de Estatísticas */}
      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="glass-card stat-card entrada">
          <div className="stat-label">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Total Entradas</span>
              <TrendingUp size={18} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.6rem' }}>
            {formatMoney(totalEntradas)}
          </div>
        </div>

        <div className="glass-card stat-card saida">
          <div className="stat-label">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Total Saídas</span>
              <TrendingDown size={18} style={{ color: 'var(--color-danger)' }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-danger)', fontSize: '1.6rem' }}>
            {formatMoney(totalSaidas)}
          </div>
        </div>

        <div className="glass-card stat-card saldo">
          <div className="stat-label">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Saldo Atual</span>
              <DollarSign size={18} style={{ color: 'var(--accent-gold)' }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: saldoAtual >= 0 ? 'var(--text-primary)' : 'var(--color-danger)', fontSize: '1.6rem' }}>
            {formatMoney(saldoAtual)}
          </div>
        </div>

        <div className="glass-card stat-card prestadas">
          <div className="stat-label">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Contas Prestadas</span>
              <FileCheck size={18} style={{ color: 'var(--accent-gold)' }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-gold)', fontSize: '1.6rem' }}>
            {formatMoney(totalContasPrestadas)}
          </div>
        </div>
      </section>

      {/* Seção Principal - Grid de Formulário + Histórico */}
      <main className={`main-layout ${isAdmin ? 'admin-mode' : ''}`}>
        
        {/* Painel Administrativo (Formulário) */}
        {isAdmin && (
          <section className="glass-card" style={{ border: '1px solid rgba(197, 160, 89, 0.3)' }}>
            <h2 style={{ 
              fontFamily: 'var(--font-serif)', 
              fontSize: '1.25rem', 
              color: 'var(--accent-gold)', 
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {editingTransaction ? <Pencil size={20} /> : <PlusCircle size={20} />}
              {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Doações de Alimentos" 
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Valor (R$)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="0,00" 
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={dataTransacao}
                    onChange={(e) => setDataTransacao(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select 
                    className="form-select" 
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as 'entrada' | 'saida')}
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select 
                    className="form-select" 
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                  >
                    {tipo === 'entrada' ? (
                      <>
                        <option value="doacao">Doação</option>
                        <option value="bazar">Bazar</option>
                        <option value="rifa">Rifas</option>
                        <option value="outros">Outros (ETC)</option>
                      </>
                    ) : (
                      <>
                        <option value="despesa">Despesa</option>
                        <option value="outros">Outros (ETC)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quem Enviou (Responsável)</label>
                <select 
                  className="form-select" 
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                >
                  {RESPONSAIVEIS.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label">
                  {editingTransaction ? 'Substituir Comprovante (opcional)' : 'Comprovante (Imagem ou PDF)'}
                </label>
                <div className="file-upload-wrapper">
                  <input 
                    type="file" 
                    className="file-upload-input" 
                    accept="image/*,application/pdf"
                    onChange={(e) => setComprovante(e.target.files?.[0] || null)}
                  />
                  <div className="file-upload-button">
                    {comprovante ? <FileCheck size={18} /> : <Paperclip size={18} />}
                    <span>{comprovante ? comprovante.name : 'Selecionar Comprovante'}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-gold" 
                  style={{ flexGrow: 1, padding: '0.75rem' }}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingTransaction ? 'Salvar Alterações' : 'Registrar Lançamento'}</span>
                  )}
                </button>
                
                {editingTransaction && (
                  <button 
                    type="button" 
                    onClick={handleCancelEdit} 
                    className="btn btn-secondary"
                    style={{ padding: '0.75rem' }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
              
              {uploadProgress && (
                <p style={{ color: 'var(--accent-gold)', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem' }}>
                  {uploadProgress}
                </p>
              )}
            </form>
          </section>
        )}

        {/* Histórico de Lançamentos */}
        <section className="glass-card" style={{ flexGrow: 1 }}>
          {/* Abas */}
          <div className="tabs-container">
            <button 
              className={`tab-btn ${abaAtiva === 'retiradas' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('retiradas')}
            >
              Retiradas / Lançamentos
            </button>
            <button 
              className={`tab-btn ${abaAtiva === 'prestadas' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('prestadas')}
            >
              Contas Prestadas
            </button>
          </div>

          {/* Barra de Filtros */}
          <div className="filters-header">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
              {abaAtiva === 'retiradas' ? 'Lançamentos Ativos / Retiradas' : 'Contas Prestadas'}
            </h3>

            <div className="filters-controls">
              <ListFilter size={16} style={{ color: 'var(--text-muted)' }} />
              
              <select 
                className="form-select" 
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem', width: 'auto' }}
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="todos">Todos Tipos</option>
                <option value="entrada">Entradas</option>
                <option value="saida">Saídas</option>
              </select>

              <select 
                className="form-select" 
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem', width: 'auto' }}
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="todas">Todas Categorias</option>
                <option value="doacao">Doação</option>
                <option value="bazar">Bazar</option>
                <option value="rifa">Rifas</option>
                <option value="despesa">Despesa</option>
                <option value="outros">Outros (ETC)</option>
              </select>

              <select 
                className="form-select" 
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem', width: 'auto' }}
                value={filtroResponsavel}
                onChange={(e) => setFiltroResponsavel(e.target.value)}
              >
                <option value="todos">Todos Responsáveis</option>
                {RESPONSAIVEIS.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Barra de Ações em Lote */}
          {selectedIds.size > 0 && (
            <div className="actions-bar">
              <span className="actions-bar-info">
                {selectedIds.size} lançamento{selectedIds.size > 1 ? 's' : ''} selecionado{selectedIds.size > 1 ? 's' : ''}
              </span>
              <div className="actions-bar-buttons">
                <button onClick={handleGerarPDF} className="btn btn-outline-gold" style={{ padding: '0.5rem 1rem' }}>
                  <FileText size={16} />
                  <span>Gerar PDF (Planilha)</span>
                </button>
                {isAdmin && abaAtiva === 'retiradas' && (
                  <button onClick={handlePrestarContas} className="btn btn-gold" style={{ padding: '0.5rem 1rem' }}>
                    <FileCheck size={16} />
                    <span>Prestar Contas</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 0' }}>
              <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-gold)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Carregando lançamentos do Supabase...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', background: 'rgba(230, 57, 70, 0.05)', border: '1px solid rgba(230, 57, 70, 0.15)', borderRadius: '8px', color: 'var(--text-primary)' }}>
              <p style={{ fontWeight: 600, color: 'var(--color-danger)', marginBottom: '0.5rem' }}>Erro de Conexão</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{error}</p>
            </div>
          ) : transactionsFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              <Calendar size={48} style={{ strokeWidth: 1, marginBottom: '1rem' }} />
              <p>Nenhum lançamento registrado neste período.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th className="checkbox-cell">
                      <input 
                        type="checkbox" 
                        className="custom-checkbox" 
                        checked={transactionsFiltradas.length > 0 && transactionsFiltradas.every(t => selectedIds.has(t.id))}
                        onChange={() => handleSelectAll(transactionsFiltradas)}
                      />
                    </th>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Quem Enviou</th>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th style={{ textAlign: 'center' }}>Comp.</th>
                    {isAdmin && <th style={{ textAlign: 'center' }}>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {transactionsFiltradas.map((t) => {
                    // Formatar data localmente
                    const dateParts = t.data_transacao.split('-');
                    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                    const formattedDate = dateObj.toLocaleDateString('pt-BR');

                    return (
                      <tr key={t.id}>
                        <td className="checkbox-cell">
                          <input 
                            type="checkbox" 
                            className="custom-checkbox" 
                            checked={selectedIds.has(t.id)}
                            onChange={() => handleToggleSelect(t.id)}
                          />
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formattedDate}</td>
                        <td style={{ fontWeight: 500 }}>{t.descricao}</td>
                        <td>{t.responsavel || 'Não informado'}</td>
                        <td>
                          <span className="badge badge-cat">
                            {translateCategory(t.categoria)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${t.tipo}`}>
                            {t.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td style={{ 
                          textAlign: 'right', 
                          fontWeight: 600,
                          color: t.tipo === 'entrada' ? 'var(--color-success)' : 'var(--color-danger)'
                        }}>
                          {t.tipo === 'entrada' ? '+' : '-'} {formatMoney(t.valor)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {t.comprovante_url ? (
                            <a 
                              href={t.comprovante_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-outline-gold"
                              style={{ padding: '0.35rem', borderRadius: '6px' }}
                              title="Visualizar Comprovante"
                            >
                              <FileText size={16} />
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button 
                              onClick={() => handleStartEdit(t)} 
                              className="btn btn-outline-gold"
                              style={{ padding: '0.35rem', borderRadius: '6px', marginRight: '0.5rem' }}
                              title="Editar Lançamento"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(t.id)} 
                              className="btn btn-danger-outline"
                              style={{ padding: '0.35rem', borderRadius: '6px' }}
                              title="Excluir Lançamento"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Modal de Login */}
      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
