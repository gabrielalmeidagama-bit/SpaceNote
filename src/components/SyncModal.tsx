import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { SyncState } from '../types/note';
import {
  X,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Wifi,
  Radio,
  ExternalLink,
} from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: SyncState;
  onJoinRoom: (roomId: string) => void;
  onForceSync: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  syncState,
  onJoinRoom,
  onForceSync,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [customRoom, setCustomRoom] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sync URL that can be opened on smartphone or other browsers
  const syncUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?room=${syncState.roomId}`
    : '';

  useEffect(() => {
    if (!isOpen || !syncUrl) return;

    QRCode.toDataURL(syncUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation failed:', err));
  }, [isOpen, syncUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCustomRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoom.trim()) return;
    onJoinRoom(customRoom.trim().toUpperCase());
    setCustomRoom('');
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await onForceSync();
    setTimeout(() => setIsSyncing(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-emerald-500 to-purple-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Sincronização em Tempo Real
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-ping"></span>
                  Ao Vivo
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Sincronize instantaneamente entre PC, navegador e smartphones
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

        {/* Main Content */}
        <div className="mt-5 space-y-5">
          {/* QR Code Section for Smartphone */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-center">
            <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-300 mb-3">
              <Smartphone className="w-4 h-4" />
              Aponte a câmera do seu smartphone
            </div>

            {qrDataUrl ? (
              <div className="p-2 bg-white rounded-xl shadow-lg border border-zinc-700">
                <img
                  src={qrDataUrl}
                  alt="QR Code de Sincronização"
                  className="w-44 h-44 object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-44 h-44 flex items-center justify-center bg-zinc-800 rounded-xl text-xs text-zinc-500">
                Gerando código QR...
              </div>
            )}

            <p className="text-[11px] text-zinc-400 mt-3 max-w-[260px]">
              Abra a câmera do celular ou leitor de QR para carregar este mesmo espaço de notas em tempo real.
            </p>
          </div>

          {/* Room ID and Link */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Código da Sala Atual</span>
              <span className="font-mono text-cyan-400 font-semibold">{syncState.roomId}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 truncate">
                {syncUrl}
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors border border-zinc-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Switch Room Form */}
          <form onSubmit={handleCustomRoomSubmit} className="pt-2 border-t border-zinc-800/80">
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Entrar em outra sala ou criar nova
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: MINHAS-NOTAS-2026"
                value={customRoom}
                onChange={(e) => setCustomRoom(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 uppercase font-mono"
              />
              <button
                type="submit"
                disabled={!customRoom.trim()}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Conectar
              </button>
            </div>
          </form>

          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>{syncState.peers} dispositivo(s) conectado(s)</span>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar agora
            </button>
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300/90 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Zero-Knowledge:</strong> Com o Cofre E2EE ativado, os dados transmitidos são criptografados no seu dispositivo antes do envio. O servidor não tem acesso ao conteúdo.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
