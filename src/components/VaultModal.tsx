import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Shield,
  KeyRound,
  X,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { hashPassphrase, verifyPassphrase } from '../services/crypto';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConfigured: boolean;
  isUnlocked: boolean;
  storedHash?: string;
  storedSalt?: string;
  onConfigureVault: (passphrase: string, hash: string, salt: string) => void;
  onUnlockVault: (passphrase: string) => void;
  onLockVault: () => void;
}

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  onClose,
  isConfigured,
  isUnlocked,
  storedHash,
  storedSalt,
  onConfigureVault,
  onUnlockVault,
  onLockVault,
}) => {
  const [passphrase, setPassphrase] = useState<string>('');
  const [confirmPassphrase, setConfirmPassphrase] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passphrase) {
      setError('Por favor digite sua senha mestra.');
      return;
    }

    if (storedHash && storedSalt) {
      const valid = await verifyPassphrase(passphrase, storedSalt, storedHash);
      if (!valid) {
        setError('Senha mestra incorreta.');
        return;
      }
    }

    onUnlockVault(passphrase);
    setSuccess('Cofre desbloqueado com sucesso!');
    setTimeout(() => {
      setSuccess('');
      onClose();
    }, 500);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (passphrase.length < 6) {
      setError('A senha mestra deve conter pelo menos 6 caracteres.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('As senhas não coincidem.');
      return;
    }

    const { hash, salt } = await hashPassphrase(passphrase);
    onConfigureVault(passphrase, hash, salt);
    setSuccess('Cofre E2EE configurado com sucesso!');
    setTimeout(() => {
      setSuccess('');
      onClose();
    }, 500);
  };

  const handleLock = () => {
    onLockVault();
    setPassphrase('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Top Glow bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isUnlocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
              {isUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Cofre Criptográfico (E2EE)
              </h2>
              <p className="text-xs text-zinc-400">
                Criptografia militar AES-GCM 256 bits com PBKDF2
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* If already unlocked */}
          {isUnlocked ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-emerald-200">Cofre Ativo e Desbloqueado</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Suas notas confidenciais estão legíveis em memória neste dispositivo e são criptografadas antes do envio.
                </p>
              </div>

              <button
                onClick={handleLock}
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl border border-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                Bloquear Cofre Agora
              </button>
            </div>
          ) : isConfigured ? (
            /* Configured but locked -> Unlock form */
            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Digite sua Senha Mestra
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Sua senha ou frase secreta"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                Desbloquear Notas Criptografadas
              </button>
            </form>
          ) : (
            /* First time configuration */
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
                Crie uma <strong>Senha Mestra</strong>. Ela é utilizada para gerar chaves de criptografia diretamente no navegador. <strong>Não é enviada a nenhum servidor</strong>.
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Criar Senha Mestra (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Ex: MinhaFraseUltraSegura2026"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Confirmar Senha Mestra
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Repita a senha mestra"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Ativar Criptografia de Ponta a Ponta
              </button>
            </form>
          )}

          {/* Privacy footer */}
          <div className="pt-2 text-[11px] text-zinc-500 text-center">
            🔐 Arquitetura Zero-Knowledge: apenas você possui a chave para decodificar suas notas.
          </div>
        </div>
      </div>
    </div>
  );
};
