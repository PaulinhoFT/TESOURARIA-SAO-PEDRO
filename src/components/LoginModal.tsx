import React, { useState, useEffect } from 'react';
import { X, User, Lock, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Fechar modal ao pressionar 'Escape'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.trim() === 'admin' && password === 'admin') {
      onLoginSuccess();
      setUsername('');
      setPassword('');
      onClose();
    } else {
      setError('Credenciais inválidas. Tente admin / admin.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="modal-close" 
          onClick={onClose} 
          aria-label="Fechar login"
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--accent-gold)', letterSpacing: '0.05em' }}>
            Acesso Restrito
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Painel Administrativo São Pedro
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'rgba(230, 57, 70, 0.15)', 
              color: 'var(--color-danger)', 
              padding: '0.75rem', 
              borderRadius: '8px', 
              fontSize: '0.85rem', 
              marginBottom: '1rem',
              border: '1px solid rgba(230, 57, 70, 0.25)'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="username">Usuário</label>
            <div style={{ position: 'relative' }}>
              <User 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                id="username"
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder=""
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="password">Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                id="password"
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-gold" 
            style={{ width: '100%', padding: '0.75rem' }}
          >
            Entrar no Painel
          </button>
        </form>
      </div>
    </div>
  );
};
