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
  FileCheck
} from 'lucide-react';

interface Transaction {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  categoria: 'doacao' | 'bazar' | 'rifa' | 'despesa' | 'outros';
  responsavel: string | null;
  comprovante_url: string | null;
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

  // Submeter Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !valor) return;

    setSaving(true);
    try {
      let comprovanteUrl: string | null = null;
      if (comprovante) {
        comprovanteUrl = await uploadFile(comprovante);
      }

      const parsedValue = parseFloat(valor.replace(',', '.'));
      if (isNaN(parsedValue) || parsedValue <= 0) {
        alert('Por favor, insira um valor válido maior que zero.');
        setSaving(false);
        return;
      }

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
            comprovante_url: comprovanteUrl
          }
        ]);

      if (insertErr) throw insertErr;

      // Resetar formulário
      setDescricao('');
      setValor('');
      setComprovante(null);
      setResponsavel(RESPONSAIVEIS[0]);
      
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
    } catch (err: any) {
      console.error('Erro ao deletar transação:', err);
      alert('Erro ao deletar lançamento do banco de dados.');
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

  // Filtragem local
  const transactionsFiltradas = transactions.filter(t => {
    const atendeTipo = filtroTipo === 'todos' || t.tipo === filtroTipo;
    const atendeCategoria = filtroCategoria === 'todas' || t.categoria === filtroCategoria;
    const atendeResponsavel = filtroResponsavel === 'todos' || t.responsavel === filtroResponsavel;
    return atendeTipo && atendeCategoria && atendeResponsavel;
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
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
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
            <span>Entrar como Admin</span>
          </button>
        )}
      </header>

      {/* Cartões de Estatísticas */}
      <section className="stats-grid">
        <div className="glass-card stat-card entrada">
          <div className="stat-label">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Total de Entradas</span>
              <TrendingUp size={20} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>
            {formatMoney(totalEntradas)}
          </div>
        </div>

        <div className="glass-card stat-card saida">
          <div className="stat-label">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Total de Saídas</span>
              <TrendingDown size={20} style={{ color: 'var(--color-danger)' }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
            {formatMoney(totalSaidas)}
          </div>
        </div>

        <div className="glass-card stat-card saldo">
          <div className="stat-label">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Saldo Atual</span>
              <DollarSign size={20} style={{ color: 'var(--accent-gold)' }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: saldoAtual >= 0 ? 'var(--text-primary)' : 'var(--color-danger)' }}>
            {formatMoney(saldoAtual)}
          </div>
        </div>
      </section>

      {/* Seção Principal - Grid de Formulário + Histórico */}
      <main style={{ 
        display: 'grid', 
        gridTemplateColumns: isAdmin ? '1fr 2fr' : '1fr', 
        gap: '2rem', 
        alignItems: 'start' 
      }}>
        
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
              <PlusCircle size={20} />
              Novo Lançamento
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
                <label className="form-label">Comprovante (Imagem ou PDF)</label>
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

              <button 
                type="submit" 
                className="btn btn-gold" 
                style={{ width: '100%', padding: '0.75rem' }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Salvando lançamento...</span>
                  </>
                ) : (
                  <span>Registrar Lançamento</span>
                )}
              </button>
              
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
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem' 
          }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              Histórico de Lançamentos
            </h2>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                          <td style={{ textAlign: 'center' }}>
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
