import React, { useState } from 'react';
import {
  Battery,
  BatteryCharging,
  Volume2,
  VolumeX,
  Volume1,
  Camera,
  Folder,
  FileText,
  Search,
  Plus,
  Play,
  Square,
  Monitor,
  Terminal,
  MousePointer,
  Keyboard,
  Globe,
  RefreshCw,
  ExternalLink,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { SystemStatusData, ActionPayload } from '../types';
import { playSciFiSound } from '../utils/audioSynth';

interface DesktopControlPadProps {
  systemStatus: SystemStatusData | null;
  onRefreshStatus: () => void;
  onExecuteAction: (action: ActionPayload) => void;
  isExecuting: boolean;
  onEmergencyStop: () => void;
}

export const DesktopControlPad: React.FC<DesktopControlPadProps> = ({
  systemStatus,
  onRefreshStatus,
  onExecuteAction,
  isExecuting,
  onEmergencyStop,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'apps' | 'input' | 'files'>('status');
  const [customText, setCustomText] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [fileLocation, setFileLocation] = useState('Desktop');

  const handleQuickAction = (action: ActionPayload) => {
    playSciFiSound('exec');
    onExecuteAction(action);
  };

  return (
    <div className="flex flex-col bg-slate-950/80 rounded-2xl border border-cyan-500/20 backdrop-blur-md overflow-hidden shadow-lg">
      {/* Header with Navigation & Emergency Stop */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/15 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-cyan-400" />
          <h3 className="font-orbitron text-xs font-bold text-slate-200 tracking-wider">
            DESKTOP CONTROL DECK
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub Tab buttons */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono-cyber">
            <button
              onClick={() => setActiveTab('status')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                activeTab === 'status' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Status
            </button>
            <button
              onClick={() => setActiveTab('apps')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                activeTab === 'apps' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Apps
            </button>
            <button
              onClick={() => setActiveTab('input')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                activeTab === 'input' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Input & Tabs
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                activeTab === 'files' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Files
            </button>
          </div>

          <button
            onClick={() => {
              playSciFiSound('mic_open');
              onRefreshStatus();
            }}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Refresh System Status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-4">
        {/* TAB 1: Real-time System Status */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            {/* Sensor Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-cyber">
              {/* Battery Card */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] flex items-center gap-1.5">
                  {systemStatus?.is_charging ? (
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Battery className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  BATTERY
                </span>
                <span className="text-base font-bold text-cyan-200 mt-1">
                  {systemStatus?.battery_percent !== undefined && systemStatus?.battery_percent !== null
                    ? `${systemStatus.battery_percent}%`
                    : 'AC Powered'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {systemStatus?.is_charging ? 'Charging (Plugged)' : 'Battery Mode'}
                </span>
              </div>

              {/* Volume Card */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  VOLUME
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <button
                    onClick={() => handleQuickAction({ type: 'windows_command', target: 'volume_down', isSensitive: false, summary: 'Vol -' })}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer text-[10px]"
                    title="Volume Down"
                  >
                    -
                  </button>
                  <button
                    onClick={() => handleQuickAction({ type: 'windows_command', target: 'volume_mute', isSensitive: false, summary: 'Mute' })}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer text-[10px]"
                    title="Mute/Unmute"
                  >
                    Mute
                  </button>
                  <button
                    onClick={() => handleQuickAction({ type: 'windows_command', target: 'volume_up', isSensitive: false, summary: 'Vol +' })}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer text-[10px]"
                    title="Volume Up"
                  >
                    +
                  </button>
                </div>
                <span className="text-[10px] text-slate-500">Master Audio</span>
              </div>

              {/* CPU / RAM */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  CPU / MEMORY
                </span>
                <span className="text-base font-bold text-cyan-200 mt-1">
                  {systemStatus?.cpu_percent ? `${systemStatus.cpu_percent}%` : 'Normal'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {systemStatus?.ram_percent ? `RAM: ${systemStatus.ram_percent}%` : 'Load Healthy'}
                </span>
              </div>

              {/* Screenshot Trigger */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  SCREENSHOT
                </span>
                <button
                  onClick={() => handleQuickAction({ type: 'windows_command', target: 'screenshot', isSensitive: false, summary: 'Capture Screen' })}
                  className="mt-1 py-1 px-2.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Capture Now
                </button>
                <span className="text-[10px] text-slate-500">Saves to Pictures</span>
              </div>
            </div>

            {/* Running Applications List */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono-cyber text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  ACTIVE WINDOWS APPLICATIONS
                </span>
                <span className="text-[10px] text-slate-500">Allowlisted Monitoring</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {systemStatus?.running_apps && systemStatus.running_apps.length > 0 ? (
                  systemStatus.running_apps.map((app, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-950 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono-cyber flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {app}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 font-mono-cyber">
                    No monitored applications currently detected.
                  </span>
                )}
              </div>
            </div>

            {/* Screenshot Thumbnail Preview if available */}
            {systemStatus?.latest_screenshot_b64 && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-mono-cyber text-slate-400 block">
                  LATEST DESKTOP CAPTURE:
                </span>
                <img
                  src={systemStatus.latest_screenshot_b64}
                  alt="Desktop Capture"
                  className="w-full max-h-40 object-cover rounded-lg border border-slate-700"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Allowlisted App Launcher & Closer */}
        {activeTab === 'apps' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 font-rajdhani">
              Launch or safely terminate allowlisted Windows applications with a single tap or voice command:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { name: 'Notepad', key: 'notepad' },
                { name: 'Calculator', key: 'calc' },
                { name: 'File Explorer', key: 'explorer' },
                { name: 'VS Code', key: 'code' },
                { name: 'Google Chrome', key: 'chrome' },
                { name: 'Task Manager', key: 'taskmgr' },
              ].map((app) => (
                <div
                  key={app.key}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono-cyber"
                >
                  <span className="text-slate-200 font-semibold">{app.name}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuickAction({ type: 'windows_command', operation: 'launch', target: app.key, isSensitive: false, summary: `Launch ${app.name}` })}
                      className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 cursor-pointer"
                      title="Launch App"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleQuickAction({ type: 'windows_command', operation: 'close', target: app.key, isSensitive: false, summary: `Close ${app.name}` })}
                      className="px-2 py-0.5 rounded bg-red-950 border border-red-500/50 text-red-300 hover:bg-red-900 cursor-pointer"
                      title="Close App"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Mouse, Keyboard & Browser Tabs */}
        {activeTab === 'input' && (
          <div className="space-y-4">
            {/* Quick Type into Active Window */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-mono-cyber text-slate-300 block">
                Type Text into Focused Window:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="e.g. 'RAJ AI typing automated text...'"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-rajdhani text-white outline-none focus:border-cyan-400"
                />
                <button
                  onClick={() => {
                    if (customText) {
                      handleQuickAction({
                        type: 'desktop_input',
                        operation: 'type',
                        params: { text: customText },
                        isSensitive: false,
                        summary: `Type: "${customText}"`,
                      });
                      setCustomText('');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-mono-cyber font-bold cursor-pointer"
                >
                  Type
                </button>
              </div>
            </div>

            {/* Quick Keyboard Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-cyber">
              <button
                onClick={() => handleQuickAction({ type: 'desktop_input', operation: 'press', params: { key: 'enter' }, isSensitive: false, summary: 'Press Enter' })}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-center cursor-pointer"
              >
                ↵ Enter Key
              </button>
              <button
                onClick={() => handleQuickAction({ type: 'desktop_input', operation: 'press', params: { key: 'esc' }, isSensitive: false, summary: 'Press Esc' })}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-center cursor-pointer"
              >
                Esc Key
              </button>
              <button
                onClick={() => handleQuickAction({ type: 'window_tab', operation: 'switch_window', isSensitive: false, summary: 'Alt+Tab Switch' })}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-center cursor-pointer"
              >
                Alt+Tab Window
              </button>
              <button
                onClick={() => handleQuickAction({ type: 'window_tab', operation: 'show_desktop', isSensitive: false, summary: 'Win+D Desktop' })}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-center cursor-pointer"
              >
                Win+D Desktop
              </button>
            </div>

            {/* Browser Tabs Deck */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-mono-cyber text-slate-400 block">
                Browser Tab Controls (Chrome / Edge):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-cyber">
                <button
                  onClick={() => handleQuickAction({ type: 'window_tab', operation: 'new_tab', isSensitive: false, summary: 'New Tab (Ctrl+T)' })}
                  className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-300 cursor-pointer"
                >
                  + New Tab
                </button>
                <button
                  onClick={() => handleQuickAction({ type: 'window_tab', operation: 'close_tab', isSensitive: false, summary: 'Close Tab (Ctrl+W)' })}
                  className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-red-300 cursor-pointer"
                >
                  ✕ Close Tab
                </button>
                <button
                  onClick={() => handleQuickAction({ type: 'window_tab', operation: 'next_tab', isSensitive: false, summary: 'Next Tab (Ctrl+Tab)' })}
                  className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-300 cursor-pointer"
                >
                  Next Tab →
                </button>
                <button
                  onClick={() => handleQuickAction({ type: 'window_tab', operation: 'reload', isSensitive: false, summary: 'Reload (Ctrl+R)' })}
                  className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-300 cursor-pointer"
                >
                  ⟳ Reload Tab
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Safe File Operations */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs font-mono-cyber">
              <span className="text-slate-300 block">Approved Sandbox Directories:</span>
              <div className="flex gap-2">
                {['Desktop', 'Documents', 'Downloads', 'RAJ_AI_Workspace'].map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setFileLocation(loc)}
                    className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                      fileLocation === loc ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>

              {/* Create File / Folder */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. project_plan.txt"
                  className="flex-1 px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 outline-none focus:border-cyan-400"
                />
                <button
                  onClick={() => {
                    if (newFileName) {
                      handleQuickAction({
                        type: 'file_op',
                        operation: 'create',
                        params: {
                          filename: newFileName,
                          content: `Created by RAJ AI Assistant on ${new Date().toLocaleString()}`,
                          path: fileLocation,
                          is_folder: false,
                        },
                        isSensitive: false,
                        summary: `Create file '${newFileName}' in ${fileLocation}`,
                      });
                      setNewFileName('');
                    }
                  }}
                  className="px-3 py-1.5 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 hover:bg-cyan-900 cursor-pointer"
                >
                  Create File
                </button>
                <button
                  onClick={() => handleQuickAction({
                    type: 'file_op',
                    operation: 'list',
                    params: { path: fileLocation },
                    isSensitive: false,
                    summary: `List files in ${fileLocation}`,
                  })}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  List Files
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
