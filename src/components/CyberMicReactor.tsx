import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Cpu, Sparkles, Radio } from 'lucide-react';
import { AssistantState } from '../types';

interface CyberMicReactorProps {
  state: AssistantState;
  isListening: boolean;
  isSpeaking: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopSpeaking: () => void;
  interimTranscript: string;
  audioStream: MediaStream | null;
  languageMode: string;
}

export const CyberMicReactor: React.FC<CyberMicReactorProps> = ({
  state,
  isListening,
  isSpeaking,
  onStartListening,
  onStopListening,
  onStopSpeaking,
  interimTranscript,
  audioStream,
  languageMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Audio waveform visualizer when microphone is streaming
  useEffect(() => {
    if (!isListening || !audioStream || !canvasRef.current) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      // Clear canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(audioStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const draw = () => {
        animFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 100;
        const bars = 24;

        // Circular waveform HUD visualizer
        for (let i = 0; i < bars; i++) {
          const value = dataArray[i % bufferLength] || 10;
          const barHeight = Math.max(4, (value / 255) * 45);
          const rad = (i * 2 * Math.PI) / bars;

          const x1 = centerX + Math.cos(rad) * radius;
          const y1 = centerY + Math.sin(rad) * radius;
          const x2 = centerX + Math.cos(rad) * (radius + barHeight);
          const y2 = centerY + Math.sin(rad) * (radius + barHeight);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineWidth = 3;
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.4 + (value / 255) * 0.6})`;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      };

      draw();

      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        audioCtx.close().catch(() => {});
      };
    } catch (e) {
      console.debug('Visualizer audio context init bypassed', e);
    }
  }, [isListening, audioStream]);

  // Determine state labels and glow colors
  let statusBadge = {
    text: 'STANDBY // READY',
    subText: 'Ready for Hindi or English commands',
    ringColor: 'border-cyan-500/30',
    coreGlow: 'glow-cyan',
    badgeClass: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/80',
  };

  if (isListening) {
    statusBadge = {
      text: 'LISTENING... // सुन रहा हूँ',
      subText: 'Speak clearly into your microphone',
      ringColor: 'border-cyan-400',
      coreGlow: 'glow-cyan-lg',
      badgeClass: 'text-cyan-200 bg-cyan-900/80 border-cyan-400 animate-pulse',
    };
  } else if (state === 'processing') {
    statusBadge = {
      text: 'PROCESSING // GEMINI CORE',
      subText: 'Synthesizing voice & routing action...',
      ringColor: 'border-blue-400',
      coreGlow: 'glow-blue',
      badgeClass: 'text-blue-300 bg-blue-950/80 border-blue-500 animate-pulse',
    };
  } else if (isSpeaking) {
    statusBadge = {
      text: 'SPEAKING // RAJ VOICE OUTPUT',
      subText: 'Transmitting synthesized audio',
      ringColor: 'border-sky-400',
      coreGlow: 'glow-cyan',
      badgeClass: 'text-sky-300 bg-sky-950/80 border-sky-400',
    };
  }

  return (
    <div className="relative flex flex-col items-center justify-center p-6 md:p-10 select-none">
      {/* Sci-Fi Decorative Coordinates & Corner Brackets */}
      <div className="absolute top-2 left-4 text-[10px] font-mono-cyber text-cyan-600/60 tracking-wider">
        SYS.NODE: RAJ-CORE // AZ: 284° // POL: DUAL-HI-EN
      </div>
      <div className="absolute top-2 right-4 text-[10px] font-mono-cyber text-cyan-600/60 tracking-wider flex items-center gap-1.5">
        <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
        CH-01: ONLINE
      </div>

      {/* Centerpiece Reactor Container */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center my-4">
        {/* Canvas for dynamic audio waveform */}
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="absolute inset-0 z-0 pointer-events-none"
        />

        {/* Outer Rotating Cyber Ring 1 */}
        <div
          className={`absolute w-full h-full rounded-full border border-dashed ${
            isListening ? 'border-cyan-400/80 animate-spin-slow' : 'border-cyan-500/20'
          } transition-all duration-700`}
        />

        {/* Outer Rotating Cyber Ring 2 (Counter) */}
        <div
          className={`absolute w-[92%] h-[92%] rounded-full border border-cyan-400/30 ${
            state === 'processing'
              ? 'border-t-cyan-400 border-r-transparent border-b-blue-500 border-l-transparent animate-spin-reverse'
              : 'border-cyan-500/15'
          } transition-all duration-700`}
        />

        {/* Tech Tick Marks */}
        <div className="absolute inset-4 rounded-full pointer-events-none flex items-center justify-center">
          <div className="w-full h-[1px] bg-cyan-500/15 absolute" />
          <div className="h-full w-[1px] bg-cyan-500/15 absolute" />
          <div className="w-[85%] h-[85%] border border-cyan-500/10 rounded-full" />
        </div>

        {/* Pulsating Glowing Aura for Listening */}
        {isListening && (
          <div className="absolute w-52 h-52 rounded-full bg-cyan-500/20 animate-pulse-ring blur-xl" />
        )}

        {/* Speaking Ripple Aura */}
        {isSpeaking && (
          <div className="absolute w-56 h-56 rounded-full bg-sky-500/20 animate-ping opacity-30" />
        )}

        {/* Core Glowing Blue Button Ring */}
        <div
          className={`relative z-10 w-36 h-36 md:w-40 md:h-40 rounded-full flex items-center justify-center transition-all duration-500 ${
            statusBadge.coreGlow
          } ${
            isListening
              ? 'bg-gradient-to-b from-cyan-600 via-cyan-800 to-slate-950 scale-105'
              : state === 'processing'
              ? 'bg-gradient-to-b from-blue-700 via-indigo-900 to-slate-950'
              : 'bg-gradient-to-b from-slate-900 via-slate-950 to-black hover:border-cyan-400'
          } border-2 ${
            isListening ? 'border-cyan-300' : 'border-cyan-500/50'
          } cursor-pointer group`}
          onClick={isListening ? onStopListening : onStartListening}
          title={isListening ? 'Click to Stop Listening' : 'Click to Start Listening'}
        >
          {/* Inner Glowing Hex / Cyber Arc */}
          <div className="absolute inset-2 rounded-full border border-cyan-400/30 group-hover:border-cyan-400/80 transition-colors" />

          {/* Microphone Icon Center */}
          <div className="flex flex-col items-center justify-center">
            {isListening ? (
              <Mic className="w-12 h-12 md:w-14 md:h-14 text-white drop-shadow-[0_0_15px_rgba(6,182,212,1)] animate-bounce" />
            ) : state === 'processing' ? (
              <Cpu className="w-12 h-12 md:w-14 md:h-14 text-blue-300 animate-spin" />
            ) : isSpeaking ? (
              <Volume2 className="w-12 h-12 md:w-14 md:h-14 text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] animate-pulse" />
            ) : (
              <Mic className="w-12 h-12 md:w-14 md:h-14 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] group-hover:scale-110 transition-transform" />
            )}

            <span className="text-[10px] font-mono-cyber font-bold tracking-widest mt-1 text-cyan-200">
              {isListening ? 'ACTIVE' : 'RAJ CORE'}
            </span>
          </div>
        </div>
      </div>

      {/* Status HUD Pill */}
      <div className="flex flex-col items-center mt-2 space-y-1">
        <div
          className={`px-4 py-1.5 rounded-full text-xs font-mono-cyber font-semibold tracking-wider border shadow-md flex items-center gap-2 ${statusBadge.badgeClass}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isListening ? 'bg-cyan-400 animate-ping' : 'bg-cyan-400'
            }`}
          />
          {statusBadge.text}
        </div>
        <p className="text-xs text-slate-400 font-rajdhani font-medium tracking-wide">
          {statusBadge.subText}
        </p>
      </div>

      {/* Live Interim Transcript Bubble */}
      {interimTranscript && (
        <div className="mt-4 px-4 py-2.5 max-w-md bg-slate-900/90 border border-cyan-500/40 rounded-xl shadow-lg backdrop-blur-md animate-fadeIn">
          <div className="flex items-center gap-2 text-[11px] font-mono-cyber text-cyan-400 mb-1">
            <Radio className="w-3 h-3 animate-pulse" />
            LIVE VOICE STREAM:
          </div>
          <p className="text-sm font-medium text-slate-100 italic">
            "{interimTranscript}"
          </p>
        </div>
      )}

      {/* Main Start / Stop Action Buttons */}
      <div className="flex items-center gap-3 mt-6">
        {!isListening ? (
          <button
            onClick={onStartListening}
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-mono-cyber font-bold text-sm tracking-wide bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.8)] active:scale-95 transition-all cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            START LISTENING
          </button>
        ) : (
          <button
            onClick={onStopListening}
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-mono-cyber font-bold text-sm tracking-wide bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-all cursor-pointer"
          >
            <MicOff className="w-4 h-4" />
            STOP LISTENING
          </button>
        )}

        {isSpeaking && (
          <button
            onClick={onStopSpeaking}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono-cyber text-xs text-amber-300 bg-amber-950/70 border border-amber-600/70 hover:bg-amber-900/80 cursor-pointer transition-colors"
            title="Stop Speaking Aloud"
          >
            <Volume2 className="w-4 h-4 animate-pulse" />
            MUTE SPEECH
          </button>
        )}
      </div>

      {/* Keyboard Shortcut & Language mode hint */}
      <div className="flex items-center gap-4 mt-3 text-[11px] font-mono-cyber text-slate-400">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 text-[10px]">
            Spacebar
          </kbd>{' '}
          Toggle Mic
        </span>
        <span className="text-slate-600">•</span>
        <span className="text-cyan-400/80">
          Mode: <strong className="text-cyan-300 font-semibold">{languageMode}</strong>
        </span>
      </div>
    </div>
  );
};
