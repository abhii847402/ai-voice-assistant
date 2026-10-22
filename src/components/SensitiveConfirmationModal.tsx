import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, Check, X, Lock, Terminal } from 'lucide-react';
import { ActionPayload } from '../types';
import { playSciFiSound } from '../utils/audioSynth';

interface SensitiveConfirmationModalProps {
  action: ActionPayload;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const SensitiveConfirmationModal: React.FC<SensitiveConfirmationModalProps> = ({
  action,
  onConfirm,
  onCancel,
  isOpen,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(12);

  useEffect(() => {
    if (!isOpen) return;

    // Reset countdown
    setSecondsRemaining(12);
    playSciFiSound('warning', 0.3);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-500/80 shadow-[0_0_40px_rgba(245,158,11,0.35)] p-6 overflow-hidden">
        {/* Warning Hazard Stripes Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 animate-pulse" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-mono-cyber text-amber-400 tracking-wider font-bold">
              SECURITY PROTOCOL OVERRIDE // LEVEL 2
            </div>
            <h3 className="text-xl font-orbitron font-bold text-slate-100 flex items-center gap-2">
              Confirmation Required
            </h3>
          </div>
        </div>

        {/* Action Details Card */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 mb-4">
          <div className="flex items-center justify-between text-xs font-mono-cyber text-slate-400 border-b border-slate-800 pb-2">
            <span>TARGET ACTION:</span>
            <span className="font-bold text-amber-300 uppercase">
              {action.target || action.summary || 'Sensitive Operation'}
            </span>
          </div>

          <p className="text-sm text-slate-200 font-rajdhani text-lg leading-relaxed">
            {action.confirmationPrompt ||
              'RAJ AI is requesting authorization to perform this sensitive workstation action.'}
          </p>

          <div className="flex items-center gap-2 text-xs font-mono-cyber text-cyan-400 bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-800/40">
            <Terminal className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>
              Voice confirmation active: You can say{' '}
              <strong className="text-white">"Confirm"</strong>,{' '}
              <strong className="text-white">"Yes"</strong>, or{' '}
              <strong className="text-white">"हाँ"</strong>
            </span>
          </div>
        </div>

        {/* Timer Ticker */}
        <div className="flex items-center justify-between text-xs font-mono-cyber text-slate-400 mb-6 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Auto-abort in:
          </span>
          <span className="text-sm font-bold text-amber-400">
            {secondsRemaining}s
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={() => {
              playSciFiSound('mic_close');
              onCancel();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono-cyber text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
            ABORT / CANCEL
          </button>

          <button
            onClick={() => {
              playSciFiSound('affirmative');
              onConfirm();
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-mono-cyber font-bold text-sm bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer active:scale-95 transition-all"
          >
            <Check className="w-4 h-4 text-slate-950" />
            AUTHORIZE & EXECUTE
          </button>
        </div>
      </div>
    </div>
  );
};
