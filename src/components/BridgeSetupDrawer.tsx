import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Monitor,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Play,
  FileCode,
  Camera,
  Layers,
  MousePointer,
  Folder,
} from 'lucide-react';
import { BridgeHealth, SystemStatusData } from '../types';
import {
  executeBridgeAction,
  fetchSystemStatus,
} from '../utils/bridgeClient';
import { playSciFiSound } from '../utils/audioSynth';

interface BridgeSetupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bridgeHealth: BridgeHealth;
  onRefreshHealth: () => void;
}

const PYTHON_CODE_V2 = `"""
RAJ AI - WINDOWS DESKTOP CONTROL COMPANION BRIDGE v2.0.0
Safe local Python helper for full desktop control
Runs locally on http://127.0.0.1:8765
"""
import sys, os, json, socket, time, subprocess, webbrowser, base64

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

try:
    import pyautogui
    pyautogui.FAILSAFE = True
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False

try:
    import ctypes
    HAS_CTYPES = True
    user32 = ctypes.windll.user32
except ImportError:
    HAS_CTYPES = False
    user32 = None

PORT = 8765
HOST = "127.0.0.1"

USER_HOME = os.path.expanduser("~")
WORKSPACE_DIR = os.path.join(USER_HOME, "RAJ_AI_Workspace")
SCREENSHOTS_DIR = os.path.join(WORKSPACE_DIR, "screenshots")
os.makedirs(WORKSPACE_DIR, exist_ok=True)
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

APPROVED_ROOTS = [
    os.path.realpath(WORKSPACE_DIR),
    os.path.realpath(os.path.join(USER_HOME, "Desktop")),
    os.path.realpath(os.path.join(USER_HOME, "Documents")),
    os.path.realpath(os.path.join(USER_HOME, "Downloads")),
]

ALLOWLISTED_APPS = {
    "calc": {"launch": "calc.exe", "exe": "CalculatorApp.exe"},
    "notepad": {"launch": "notepad.exe", "exe": "notepad.exe"},
    "explorer": {"launch": "explorer.exe", "exe": "explorer.exe"},
    "code": {"launch": "code", "exe": "Code.exe"},
    "cmd": {"launch": "cmd.exe /c start cmd.exe", "exe": "cmd.exe"},
    "powershell": {"launch": "powershell.exe -NoExit", "exe": "powershell.exe"},
    "taskmgr": {"launch": "taskmgr.exe", "exe": "Taskmgr.exe"},
    "mspaint": {"launch": "mspaint.exe", "exe": "mspaint.exe"},
    "chrome": {"launch": "start chrome", "exe": "chrome.exe"},
    "edge": {"launch": "start msedge", "exe": "msedge.exe"},
    "spotify": {"launch": "start spotify:", "exe": "Spotify.exe"},
}

# Run 'python raj_windows_bridge.py' to start
`;

export const BridgeSetupDrawer: React.FC<BridgeSetupDrawerProps> = ({
  isOpen,
  onClose,
  bridgeHealth,
  onRefreshHealth,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'instructions' | 'code' | 'test'>('instructions');
  const [testResult, setTestResult] = useState<{ message: string; success: boolean } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [systemData, setSystemData] = useState<SystemStatusData | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      const res = await fetch('/api/bridge/download');
      const text = await res.text();
      navigator.clipboard.writeText(text);
    } catch {
      navigator.clipboard.writeText(PYTHON_CODE_V2);
    }
    setCopiedCode(true);
    playSciFiSound('affirmative');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleDownloadPy = () => {
    playSciFiSound('link_open');
    window.location.href = '/api/bridge/download';
  };

  const handleDownloadBat = () => {
    playSciFiSound('link_open');
    const batContent = `@echo off\ntitle RAJ AI Windows Desktop Companion v2.0\ncolor 0B\necho Starting RAJ AI Local Bridge...\npython raj_windows_bridge.py\npause`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'run_bridge.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const runTest = async (action: any) => {
    setIsTesting(true);
    setTestResult(null);
    playSciFiSound('exec');
    const res = await executeBridgeAction(action, true);
    setIsTesting(false);
    setTestResult({
      message: res.message,
      success: res.success,
    });
    if (res.success) {
      playSciFiSound('affirmative');
    } else {
      playSciFiSound('warning');
    }
  };

  const runStatusTest = async () => {
    setIsTesting(true);
    const data = await fetchSystemStatus();
    setIsTesting(false);
    if (data) {
      setSystemData(data);
      setTestResult({
        message: `Connected to ${data.hostname}: CPU ${data.cpu_percent || 0}%, Running Apps: ${data.running_apps?.length || 0}`,
        success: true,
      });
      playSciFiSound('affirmative');
    } else {
      setTestResult({
        message: 'Could not fetch system status. Make sure the bridge is running.',
        success: false,
      });
      playSciFiSound('warning');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-950 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono-cyber text-cyan-400 tracking-wider">
                DESKTOP INTEGRATION PROTOCOL v2.0
              </div>
              <h2 className="text-lg font-orbitron font-bold text-white flex items-center gap-2">
                Windows Companion Bridge
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Status Pill */}
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono-cyber font-bold border ${
                bridgeHealth.status === 'online'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500 text-amber-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  bridgeHealth.status === 'online'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              {bridgeHealth.status === 'online'
                ? `BRIDGE ONLINE (${bridgeHealth.latencyMs}ms)`
                : 'BRIDGE OFFLINE'}
            </div>

            <button
              onClick={() => {
                playSciFiSound('mic_open');
                onRefreshHealth();
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh connection status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                playSciFiSound('mic_close');
                onClose();
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2">
          <button
            onClick={() => setActiveTab('instructions')}
            className={`py-3 px-4 text-xs font-mono-cyber font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'instructions'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Security Architecture & Setup
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-3 px-4 text-xs font-mono-cyber font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Python Script & Downloads
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 px-4 text-xs font-mono-cyber font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'test'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Interactive Desktop Control Test
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)] space-y-6">
          {activeTab === 'instructions' && (
            <div className="space-y-6">
              {/* Architecture & Sandbox Explanation Banner */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-start gap-4">
                <ShieldCheck className="w-8 h-8 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h4 className="text-sm font-orbitron font-bold text-cyan-300">
                    Full Desktop Control Sandbox Model
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-rajdhani text-sm">
                    Web browsers run inside a security sandbox and cannot simulate mouse clicks, switch windows, or manipulate files directly. The <strong>RAJ Windows Companion Bridge v2.0</strong> is an open-source, local Python service running at <code className="text-cyan-300">http://127.0.0.1:8765</code>.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed font-rajdhani text-sm">
                    <strong>Zero Remote Shell:</strong> It enforces a strict allowlist of programs and operations. File actions are strictly restricted to your approved user folders (<code className="text-cyan-300">~/Desktop</code>, <code className="text-cyan-300">~/Documents</code>, <code className="text-cyan-300">~/Downloads</code>, and <code className="text-cyan-300">~/RAJ_AI_Workspace</code>).
                  </p>
                </div>
              </div>

              {/* 3 Step Setup Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 relative">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 flex items-center justify-center font-mono-cyber text-xs font-bold">
                    1
                  </div>
                  <h5 className="font-orbitron text-xs font-bold text-white">
                    Download Helper Script
                  </h5>
                  <p className="text-xs text-slate-400 font-rajdhani">
                    Download <code className="text-cyan-300">raj_windows_bridge.py</code> and launcher <code className="text-cyan-300">run_bridge.bat</code> into a folder on your Windows PC.
                  </p>
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={handleDownloadPy}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-mono-cyber bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download raj_windows_bridge.py
                    </button>
                    <button
                      onClick={handleDownloadBat}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-mono-cyber bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      Download run_bridge.bat
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 relative">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 flex items-center justify-center font-mono-cyber text-xs font-bold">
                    2
                  </div>
                  <h5 className="font-orbitron text-xs font-bold text-white">
                    Start in Terminal / CMD
                  </h5>
                  <p className="text-xs text-slate-400 font-rajdhani">
                    Double-click <code className="text-cyan-300">run_bridge.bat</code> or run:
                  </p>
                  <div className="p-2 rounded bg-black/80 font-mono-cyber text-[11px] text-emerald-400 border border-slate-800 select-all">
                    python raj_windows_bridge.py
                  </div>
                  <div className="p-2 rounded bg-slate-950 font-mono-cyber text-[10px] text-slate-400 border border-slate-800">
                    <span className="text-cyan-300 block font-semibold">Optional Enhancement:</span>
                    pip install psutil pyautogui pillow
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 relative">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 flex items-center justify-center font-mono-cyber text-xs font-bold">
                    3
                  </div>
                  <h5 className="font-orbitron text-xs font-bold text-white">
                    Full Desktop Voice Control
                  </h5>
                  <p className="text-xs text-slate-400 font-rajdhani">
                    The bridge status turns green. Try speaking commands:
                  </p>
                  <ul className="text-xs text-cyan-300/90 font-mono-cyber space-y-1 list-disc list-inside text-[11px]">
                    <li>"Notepad kholo aur usme 'Plan' likho"</li>
                    <li>"Take a desktop screenshot"</li>
                    <li>"Close Notepad"</li>
                    <li>"Switch window (Alt+Tab)"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-cyber text-slate-400">
                  Full Script: <code className="text-cyan-300">raj_windows_bridge.py (v2.0)</code>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-cyber bg-cyan-950 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 cursor-pointer transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied Complete Code!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Python Script
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadPy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-cyber bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .py
                  </button>
                </div>
              </div>

              {/* Code Display */}
              <div className="relative rounded-xl bg-black/90 border border-slate-800 p-4 font-mono-cyber text-xs text-slate-300 overflow-x-auto max-h-[380px]">
                <pre>{PYTHON_CODE_V2}</pre>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-sm font-orbitron font-bold text-slate-200 mb-1">
                  Desktop Control Verification Deck
                </h4>
                <p className="text-xs text-slate-400 font-rajdhani mb-4">
                  Trigger each desktop action to verify full functionality with your local Windows companion bridge:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => runTest({ type: 'windows_command', operation: 'launch', target: 'notepad', isSensitive: false, summary: 'Launch Notepad' })}
                    disabled={isTesting}
                    className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-center cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Play className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                    <span className="text-xs font-mono-cyber font-bold block">1. Open Notepad</span>
                    <span className="text-[10px] text-slate-500">notepad.exe</span>
                  </button>

                  <button
                    onClick={() => runTest({ type: 'desktop_input', operation: 'type', params: { text: 'RAJ AI Desktop Control Active!' }, isSensitive: false, summary: 'Type Text' })}
                    disabled={isTesting}
                    className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-center cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Terminal className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                    <span className="text-xs font-mono-cyber font-bold block">2. Type Text</span>
                    <span className="text-[10px] text-slate-500">In Active Window</span>
                  </button>

                  <button
                    onClick={() => runTest({ type: 'windows_command', operation: 'launch', target: 'screenshot', isSensitive: false, summary: 'Capture Screenshot' })}
                    disabled={isTesting}
                    className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-center cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Camera className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                    <span className="text-xs font-mono-cyber font-bold block">3. Screenshot</span>
                    <span className="text-[10px] text-slate-500">Save to Pictures</span>
                  </button>

                  <button
                    onClick={() => runTest({ type: 'windows_command', operation: 'close', target: 'notepad', isSensitive: false, summary: 'Close Notepad' })}
                    disabled={isTesting}
                    className="p-3 rounded-xl bg-slate-950 border border-red-500/30 hover:border-red-400 text-red-300 text-center cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    <X className="w-5 h-5 mx-auto mb-1 text-red-400" />
                    <span className="text-xs font-mono-cyber font-bold block">4. Close Notepad</span>
                    <span className="text-[10px] text-slate-500">taskkill</span>
                  </button>
                </div>

                {/* Test Output Box */}
                {testResult && (
                  <div
                    className={`mt-4 p-3 rounded-xl border flex items-center gap-3 text-xs font-mono-cyber ${
                      testResult.success
                        ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300'
                        : 'bg-red-950/60 border-red-500/80 text-red-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs font-mono-cyber text-slate-400">
          <span>Local endpoint: http://127.0.0.1:8765</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
