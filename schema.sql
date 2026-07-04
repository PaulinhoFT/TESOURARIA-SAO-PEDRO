-- ====================================================================
-- Script SQL para o Banco de Dados do Tesoureiro São Pedro (Atualizado)
-- Cole este script no SQL Editor do Supabase e execute.
-- ====================================================================

-- 1. Criar a tabela de transações
CREATE TABLE IF NOT EXISTS public.transacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    descricao TEXT NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    categoria TEXT NOT NULL CHECK (categoria IN ('doacao', 'bazar', 'rifa', 'despesa', 'outros')),
    responsavel TEXT, -- Nome do responsável (Quem enviou)
    comprovante_url TEXT,
    data_transacao DATE NOT NULL DEFAULT CURRENT_DATE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas de acesso para permitir operações via cliente frontend (Chave Anon)
-- Como o controle de admin é feito na interface, permitimos leitura, inserção e exclusão pública.

DROP POLICY IF EXISTS "Permitir leitura pública" ON public.transacoes;
CREATE POLICY "Permitir leitura pública" ON public.transacoes
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública" ON public.transacoes;
CREATE POLICY "Permitir inserção pública" ON public.transacoes
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusão pública" ON public.transacoes;
CREATE POLICY "Permitir exclusão pública" ON public.transacoes
    FOR DELETE TO anon, authenticated USING (true);


-- ====================================================================
-- INSTRUÇÕES PARA O STORAGE (COMPROVANTES):
-- ====================================================================
-- Para armazenar as imagens/PDFs de comprovantes, faça o seguinte no painel do Supabase:
-- 1. Vá em "Storage" no menu lateral esquerdo.
-- 2. Clique em "New bucket" (Novo Bucket).
-- 3. Dê o nome de: comprovantes
-- 4. Marque a opção "Public bucket" (Balde Público) para que possamos ler os links diretamente.
-- 5. Clique em "Save".
-- 6. Nas configurações do Bucket "comprovantes", vá em "Policies" (Políticas de Acesso):
--    - Adicione uma política para permitir INSERT (Upload) para perfis Anon/Authenticated.
--    - Adicione uma política para permitir SELECT (Visualização) para todos.
--    - Adicione uma política para permitir DELETE (Exclusão) para todos se desejar limpar arquivos ao excluir transações.
-- ====================================================================
