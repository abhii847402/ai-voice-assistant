import React from 'react';
import {
  Youtube,
  Search,
  Calculator,
  FileText,
  Lock,
  Globe,
  Sparkles,
  Camera,
  Battery,
  Layers,
  MousePointer,
  FolderPlus,
  XCircle,
} from 'lucide-react';
import { playSciFiSound } from '../utils/audioSynth';

interface CommandChipsProps {
  onSelectCommand: (commandText: string) => void;
  disabled?: boolean;
}

const PRESET_COMMANDS = [
  {
    label: 'Notepad Kholo & Likho',
    sub: 'Multi-Step Desktop Task',
    text: "Notepad kholo aur usme 'RAJ AI Full Desktop Control Online' type karo aur screenshot lo",
    icon: FileText,
    type: 'multistep',
  },
  {
    label: 'Take Desktop Screenshot',
    sub: 'Screen Capture',
    text: 'Take a desktop screenshot',
    icon: Camera,
    type: 'windows',
  },
  {
    label: 'Check Battery & PC Status',
    sub: 'Hardware Sensors',
    text: 'Check battery status, volume, and running applications',
    icon: Battery,
    type: 'windows',
  },
  {
    label: 'Create Folder on Desktop',
    sub: 'Safe Sandbox File Op',
    text: 'Desktop par ek naya folder banao',
    icon: FolderPlus,
    type: 'windows',
  },
  {
    label: 'Close Notepad (App Control)',
    sub: 'Terminate Application',
    text: 'Close Notepad',
    icon: XCircle,
    type: 'windows',
  },
  {
    label: 'Switch Window (Alt+Tab)',
    sub: 'Window Navigation',
    text: 'Switch active window',
    icon: Layers,
    type: 'windows',
  },
  {
    label: 'YouTube Kholo',
    sub: 'Browser Launcher',
    text: 'YouTube kholo',
    icon: Youtube,
    type: 'web',
  },
  {
    label: 'Lock My Computer',
    sub: 'Sensitive Security Action',
    text: 'Lock my Windows computer',
    icon: Lock,
    type: 'sensitive',
  },
];

export const CommandChips: React.FC<CommandChipsProps> = ({
  onSelectCommand,
  disabled,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-mono-cyber text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          VOICE & DESKTOP CONTROL COMMAND CHIPS (HINDI & ENGLISH)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {PRESET_COMMANDS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              disabled={disabled}
              onClick={() => {
                playSciFiSound('mic_open');
                onSelectCommand(item.text);
              }}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
                item.type === 'sensitive'
                  ? 'bg-amber-950/20 border-amber-600/40 hover:border-amber-500 hover:bg-amber-950/40 text-amber-200'
                  : item.type === 'multistep'
                  ? 'bg-cyan-950/40 border-cyan-400/60 hover:border-cyan-300 hover:bg-cyan-900/40 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : item.type === 'windows'
                  ? 'bg-slate-900/80 border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/40 text-cyan-200'
                  : 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-slate-200'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  item.type === 'sensitive'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate font-rajdhani text-sm">
                  {item.label}
                </div>
                <div className="text-[10px] text-slate-400 font-mono-cyber truncate">
                  {item.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
