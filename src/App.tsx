import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sliders,
  Monitor,
  ExternalLink,
  ShieldAlert,
  Cpu,
  Sparkles,
  Radio,
  Terminal,
  Activity,
  Square,
  AlertTriangle,
} from 'lucide-react';
import {
  AssistantResponse,
  AssistantState,
  BridgeHealth,
  ChatMessage,
  LanguageCode,
  ActionPayload,
  TaskActivityLogItem,
  SystemStatusData,
} from './types';
import { CyberMicReactor } from './components/CyberMicReactor';
import { SensitiveConfirmationModal } from './components/SensitiveConfirmationModal';
import { BridgeSetupDrawer } from './components/BridgeSetupDrawer';
import { ConversationHistory } from './components/ConversationHistory';
import { CommandChips } from './components/CommandChips';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { TaskActivityLog } from './components/TaskActivityLog';
import { DesktopControlPad } from './components/DesktopControlPad';
import { defaultVoiceSettings, speakAloud, stopSpeaking, VoiceSettings } from './utils/speech';
import { playSciFiSound } from './utils/audioSynth';
import { checkBridgeHealth, executeBridgeAction, fetchSystemStatus } from './utils/bridgeClient';

export default function App() {
  // Assistant states
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'init-1',
        role: 'assistant',
        content:
          'RAJ AI Core v2.0 initialized. Full desktop control architecture ready.\nमैं आपकी आवाज से Windows apps, mouse/keyboard, files, tabs और system controls को नियंत्रित कर सकता हूँ। Say a command in Hindi or English.',
        spokenText: 'RAJ AI Core initialized. Full desktop control online. Ready for your command.',
        timestamp: new Date().toLocaleTimeString(),
        language: 'hinglish',
      },
    ];
  });

  // Voice & Language states
  const [languageMode, setLanguageMode] = useState<LanguageCode>('auto');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(defaultVoiceSettings);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);

  // Speech Recognition states
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // Text input fallback
  const [inputText, setInputText] = useState('');

  // Windows Bridge & Real-time Status states
  const [bridgeHealth, setBridgeHealth] = useState<BridgeHealth>({ status: 'checking' });
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);
  const [isBridgeDrawerOpen, setIsBridgeDrawerOpen] = useState(false);

  // Task Activity Log & Multi-step Execution Queue
  const [activityLog, setActivityLog] = useState<TaskActivityLogItem[]>([]);
  const [isExecutingQueue, setIsExecutingQueue] = useState(false);
  const stopExecutionRequested = useRef<boolean>(false);

  // Sensitive action confirmation states
  const [pendingAction, setPendingAction] = useState<ActionPayload | null>(null);
  const [pendingRemainingActions, setPendingRemainingActions] = useState<ActionPayload[]>([]);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  // External website action notification (if popup was blocked)
  const [openedLinkNotification, setOpenedLinkNotification] = useState<{
    url: string;
    summary: string;
  } | null>(null);

  // Poll Windows Bridge Health and Hardware Status
  const refreshBridge = useCallback(async () => {
    const health = await checkBridgeHealth();
    setBridgeHealth(health);
    if (health.status === 'online') {
      const status = await fetchSystemStatus();
      if (status) setSystemStatus(status);
    }
  }, []);

  useEffect(() => {
    refreshBridge();
    const interval = setInterval(refreshBridge, 10000);
    return () => clearInterval(interval);
  }, [refreshBridge]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (audioStream) {
        audioStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [audioStream]);

  // Emergency Stop Handler
  const handleEmergencyStop = () => {
    stopExecutionRequested.current = true;
    setIsExecutingQueue(false);
    stopSpeaking();
    if (isListening) stopListening();
    setIsConfirmationOpen(false);
    setPendingAction(null);
    setPendingRemainingActions([]);
    playSciFiSound('warning');

    // Mark current pending tasks as aborted
    setActivityLog((prev) =>
      prev.map((item) =>
        item.status === 'running' || item.status === 'pending'
          ? { ...item, status: 'aborted', result: 'Halted by Emergency Stop' }
          : item
      )
    );

    setMessages((prev) => [
      ...prev,
      {
        id: 'halt-' + Date.now(),
        role: 'assistant',
        content: '🛑 **EMERGENCY STOP ACTIVATED**: All active desktop operations halted immediately.',
        spokenText: 'Emergency stop activated. All operations halted.',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  // Execute a single action on the Windows Companion Bridge or Browser
  const executeSingleAction = async (action: ActionPayload, confirmed = false): Promise<{ success: boolean; message: string }> => {
    // Web Navigation
    if (action.type === 'open_website' || action.type === 'web_search') {
      const url = action.url;
      if (url) {
        playSciFiSound('link_open');
        try {
          const win = window.open(url, '_blank', 'noopener,noreferrer');
          if (!win || win.closed || typeof win.closed === 'undefined') {
            setOpenedLinkNotification({ url, summary: action.summary || `Opening ${url}` });
          } else {
            setOpenedLinkNotification({ url, summary: action.summary || `Opened ${url}` });
          }
        } catch {
          setOpenedLinkNotification({ url, summary: action.summary || `Click to open ${url}` });
        }
        return { success: true, message: `Opened ${url}` };
      }
      return { success: false, message: 'Missing URL' };
    }

    // Desktop Controls via Bridge
    playSciFiSound('exec');
    if (bridgeHealth.status === 'online') {
      const res = await executeBridgeAction(action, confirmed);
      if (res.success) {
        playSciFiSound('affirmative');
        // Refresh system status if action modified state or took a screenshot
        if (action.target === 'screenshot' && res.data?.thumbnail) {
          setSystemStatus((prev) => ({
            ...prev,
            latest_screenshot: res.data.filepath,
            latest_screenshot_b64: res.data.thumbnail,
          }));
        } else {
          refreshBridge();
        }
        return { success: true, message: res.message };
      } else {
        playSciFiSound('warning');
        return { success: false, message: res.message };
      }
    } else {
      // Bridge is offline: open helper drawer
      playSciFiSound('warning');
      setIsBridgeDrawerOpen(true);
      return {
        success: false,
        message: 'Windows Bridge is offline. Start `python raj_windows_bridge.py` on your PC.',
      };
    }
  };

  // Sequential Multi-Step Queue Runner
  const runActionSequence = async (actions: ActionPayload[]) => {
    if (!actions || actions.length === 0) return;

    stopExecutionRequested.current = false;
    setIsExecutingQueue(true);
    setAssistantState('executing_tasks');

    // Create log items for all actions
    const logItems: TaskActivityLogItem[] = actions.map((act, index) => ({
      id: `task-${Date.now()}-${index}`,
      timestamp: new Date().toLocaleTimeString(),
      title: act.summary || `${act.type}: ${act.target || act.operation || 'step'}`,
      action: act,
      status: 'pending',
    }));

    setActivityLog((prev) => [...logItems, ...prev]);

    for (let i = 0; i < actions.length; i++) {
      if (stopExecutionRequested.current) break;

      const currentAct = actions[i];
      const logId = logItems[i].id;

      // Check if action requires sensitive confirmation
      if (currentAct.isSensitive) {
        // Pause queue and show confirmation modal
        setPendingAction(currentAct);
        setPendingRemainingActions(actions.slice(i + 1));
        setIsConfirmationOpen(true);
        setIsExecutingQueue(false);
        setAssistantState('idle');

        // Speak confirmation prompt aloud
        speakAloud(
          currentAct.confirmationPrompt || 'This action requires confirmation. Please authorize to proceed.',
          'english',
          voiceSettings
        );
        return; // Execution pauses until user confirms or aborts
      }

      // Mark running in log
      setActivityLog((prev) =>
        prev.map((item) => (item.id === logId ? { ...item, status: 'running' } : item))
      );

      // Brief delay between desktop actions so active windows can focus
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      if (stopExecutionRequested.current) break;

      const result = await executeSingleAction(currentAct, false);

      setActivityLog((prev) =>
        prev.map((item) =>
          item.id === logId
            ? {
                ...item,
                status: result.success ? 'completed' : 'failed',
                result: result.success ? result.message : undefined,
                error: !result.success ? result.message : undefined,
              }
            : item
        )
      );
    }

    setIsExecutingQueue(false);
    setAssistantState('idle');
  };

  // Process user request through server-side Gemini API
  const handleProcessMessage = async (text: string, inputMode: 'voice' | 'text' = 'voice') => {
    if (!text.trim()) return;

    // Check if user is responding to a sensitive confirmation prompt verbally
    if (isConfirmationOpen && pendingAction) {
      const lower = text.toLowerCase().trim();
      if (
        lower.includes('confirm') ||
        lower.includes('yes') ||
        lower.includes('haan') ||
        lower.includes('ha') ||
        lower.includes('karo') ||
        lower.includes('authorize')
      ) {
        confirmSensitiveAction();
        return;
      } else if (
        lower.includes('cancel') ||
        lower.includes('no') ||
        lower.includes('nahi') ||
        lower.includes('mat') ||
        lower.includes('abort') ||
        lower.includes('stop')
      ) {
        cancelSensitiveAction();
        return;
      }
    }

    stopSpeaking();

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
      inputMode,
    };
    setMessages((prev) => [...prev, userMsg]);

    setAssistantState('processing');
    setInputText('');

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-5).map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.content,
          })),
          languagePreference: languageMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data: AssistantResponse = await response.json();
      const actionList = data.actions && data.actions.length > 0 ? data.actions : data.action ? [data.action] : [];

      const assistantMsg: ChatMessage = {
        id: 'msg-ast-' + Date.now(),
        role: 'assistant',
        content: data.displayText || data.spokenText,
        spokenText: data.spokenText,
        timestamp: new Date().toLocaleTimeString(),
        language: data.language,
        actions: actionList,
        action: actionList[0],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Speak response aloud
      speakAloud(
        data.spokenText || data.displayText,
        data.language,
        voiceSettings,
        () => setAssistantState('speaking'),
        () => {
          if (!isExecutingQueue) setAssistantState('idle');
        }
      );

      // Execute action sequence if any
      const executableActions = actionList.filter((a) => a.type !== 'none');
      if (executableActions.length > 0) {
        runActionSequence(executableActions);
      }
    } catch (err: any) {
      console.error('Failed to communicate with RAJ AI assistant:', err);
      playSciFiSound('warning');
      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: `Connection error: Could not reach RAJ AI engine. Please verify network connectivity.`,
        spokenText: 'I encountered an error connecting to the core engine.',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setAssistantState('idle');
    }
  };

  // Confirm sensitive action
  const confirmSensitiveAction = async () => {
    if (pendingAction) {
      playSciFiSound('affirmative');
      const res = await executeSingleAction(pendingAction, true);
      setMessages((prev) => [
        ...prev,
        {
          id: 'action-confirmed-' + Date.now(),
          role: 'assistant',
          content: `✅ **Action Authorized**: ${res.message}`,
          spokenText: 'Action authorized and executed.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      speakAloud('Action authorized and executed.', 'english', voiceSettings);

      // Resume remaining queue if any
      if (pendingRemainingActions.length > 0) {
        runActionSequence(pendingRemainingActions);
      }
    }
    setPendingAction(null);
    setPendingRemainingActions([]);
    setIsConfirmationOpen(false);
  };

  // Cancel sensitive action
  const cancelSensitiveAction = () => {
    playSciFiSound('mic_close');
    setMessages((prev) => [
      ...prev,
      {
        id: 'action-aborted-' + Date.now(),
        role: 'assistant',
        content: `❌ **Action Aborted**: Workstation operation was cancelled.`,
        spokenText: 'Action cancelled.',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    speakAloud('Action cancelled.', 'english', voiceSettings);
    setPendingAction(null);
    setPendingRemainingActions([]);
    setIsConfirmationOpen(false);
  };

  // Start Voice Listening
  const startListening = async () => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert('Speech Recognition is not supported by your browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;

      if (languageMode === 'hi-IN') {
        recognition.lang = 'hi-IN';
      } else if (languageMode === 'en-US') {
        recognition.lang = 'en-US';
      } else if (languageMode === 'en-IN') {
        recognition.lang = 'en-IN';
      } else {
        recognition.lang = 'hi-IN';
      }

      recognition.onstart = () => {
        setIsListening(true);
        setAssistantState('listening');
        setInterimTranscript('');
        playSciFiSound('mic_open');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        setInterimTranscript(currentInterim || finalTranscript);

        if (finalTranscript.trim()) {
          setIsListening(false);
          setInterimTranscript('');
          handleProcessMessage(finalTranscript.trim(), 'voice');
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setAssistantState('idle');
        playSciFiSound('mic_close');
      };

      recognition.onend = () => {
        setIsListening(false);
        if (assistantState === 'listening') {
          setAssistantState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone access denied or unavailable. Please enable mic permissions.');
    }
  };

  // Stop Voice Listening
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }
    setIsListening(false);
    setAssistantState('idle');
    playSciFiSound('mic_close');
  };

  // Hotkey listener: Spacebar toggles mic, Escape halts or closes modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
      if (e.code === 'Escape') {
        if (isExecutingQueue) handleEmergencyStop();
        if (isConfirmationOpen) cancelSensitiveAction();
        if (isBridgeDrawerOpen) setIsBridgeDrawerOpen(false);
        if (isVoiceSettingsOpen) setIsVoiceSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, isExecutingQueue, isConfirmationOpen, isBridgeDrawerOpen, isVoiceSettingsOpen]);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 cyber-grid relative overflow-x-hidden">
      {/* Ambient Sci-Fi Glow Circles */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Cybernetic HUD Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/20 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.6)]">
              <Sparkles className="w-5 h-5 text-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-orbitron font-extrabold tracking-wider bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400 bg-clip-text text-transparent">
                  RAJ AI
                </h1>
                <span className="text-[10px] font-mono-cyber px-2 py-0.5 rounded bg-cyan-950 border border-cyan-600/50 text-cyan-300 font-bold">
                  v2.0 // DESKTOP CONTROL
                </span>
              </div>
              <p className="text-[10px] font-mono-cyber text-slate-400 tracking-wider">
                FULL WORKSTATION CONTROL • APPS • INPUT • FILES • BILINGUAL
              </p>
            </div>
          </div>

          {/* Status Indicators & Controls */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* EMERGENCY STOP BUTTON */}
            {isExecutingQueue && (
              <button
                onClick={handleEmergencyStop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono-cyber font-bold bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.8)] cursor-pointer"
                title="Immediately halt all desktop actions"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>STOP</span>
              </button>
            )}

            {/* Windows Bridge Status Pill */}
            <button
              onClick={() => {
                playSciFiSound('mic_open');
                setIsBridgeDrawerOpen(true);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono-cyber font-bold border transition-all cursor-pointer ${
                bridgeHealth.status === 'online'
                  ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'bg-amber-950/70 border-amber-500/80 text-amber-300 hover:bg-amber-900/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
              }`}
              title="Click to view setup and test Windows Bridge"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {bridgeHealth.status === 'online'
                  ? `BRIDGE: ONLINE (${bridgeHealth.latencyMs}ms)`
                  : 'BRIDGE: OFFLINE (SETUP)'}
              </span>
              <span className="sm:hidden">
                {bridgeHealth.status === 'online' ? 'ONLINE' : 'BRIDGE'}
              </span>
            </button>

            {/* Language Selector */}
            <div className="hidden lg:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-mono-cyber">
              <button
                onClick={() => setLanguageMode('auto')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  languageMode === 'auto'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Auto Bilingual
              </button>
              <button
                onClick={() => setLanguageMode('hi-IN')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  languageMode === 'hi-IN'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => setLanguageMode('en-IN')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  languageMode === 'en-IN'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>

            {/* Voice Mute / Unmute Toggle */}
            <button
              onClick={() => {
                const next = !voiceSettings.enabled;
                setVoiceSettings({ ...voiceSettings, enabled: next });
                if (!next) stopSpeaking();
                playSciFiSound(next ? 'affirmative' : 'mic_close');
              }}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                voiceSettings.enabled
                  ? 'bg-slate-900 border-cyan-500/40 text-cyan-300 hover:bg-slate-800'
                  : 'bg-red-950/60 border-red-500/50 text-red-400'
              }`}
              title={voiceSettings.enabled ? 'Mute Voice Audio' : 'Unmute Voice Audio'}
            >
              {voiceSettings.enabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* Voice Settings Gear */}
            <button
              onClick={() => {
                playSciFiSound('mic_open');
                setIsVoiceSettingsOpen(true);
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Speech Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Popup / Link Notification Banner */}
      {openedLinkNotification && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4 animate-fadeIn">
          <div className="p-3.5 rounded-xl bg-cyan-950/90 border border-cyan-500/60 flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <div className="flex items-center gap-3">
              <ExternalLink className="w-5 h-5 text-cyan-300 shrink-0" />
              <div>
                <div className="text-xs font-mono-cyber font-bold text-cyan-200">
                  {openedLinkNotification.summary}
                </div>
                <div className="text-[11px] text-slate-300 truncate max-w-lg">
                  Target: {openedLinkNotification.url}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={openedLinkNotification.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playSciFiSound('link_open')}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono-cyber font-bold transition-all shadow-md"
              >
                Open Website
              </a>
              <button
                onClick={() => setOpenedLinkNotification(null)}
                className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Centerpiece Glowing Mic Reactor + Command Chips + Input (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            {/* Holographic Glowing Mic Deck */}
            <div className="relative rounded-2xl bg-gradient-to-b from-slate-950/90 via-slate-900/60 to-slate-950/90 border border-cyan-500/30 p-4 md:p-6 shadow-[0_0_40px_rgba(6,182,212,0.12)]">
              {/* Subtle Scanning Tech Lines */}
              <div className="absolute top-3 left-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[10px] font-mono-cyber text-cyan-400">
                  VOICE INPUT RECEPTOR // READY
                </span>
              </div>

              {/* Centerpiece Glowing Blue Reactor */}
              <CyberMicReactor
                state={assistantState}
                isListening={isListening}
                isSpeaking={assistantState === 'speaking'}
                onStartListening={startListening}
                onStopListening={stopListening}
                onStopSpeaking={() => {
                  stopSpeaking();
                  setAssistantState('idle');
                }}
                interimTranscript={interimTranscript}
                audioStream={audioStream}
                languageMode={
                  languageMode === 'auto'
                    ? 'Bilingual (HI/EN)'
                    : languageMode === 'hi-IN'
                    ? 'हिन्दी'
                    : 'English'
                }
              />

              {/* Text Input Fallback Bar */}
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (inputText.trim()) {
                      handleProcessMessage(inputText.trim(), 'text');
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type desktop command (e.g. 'Notepad kholo aur usme Plan likho', 'Screenshot lo')..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-cyan-400 text-sm font-rajdhani text-slate-100 placeholder-slate-500 outline-none transition-colors"
                    />
                    <div className="absolute right-3 top-3 text-[10px] font-mono-cyber text-slate-500">
                      Press ↵
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!inputText.trim() || assistantState === 'processing'}
                    className="p-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-40 transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Quick Command Chips */}
            <CommandChips
              onSelectCommand={(cmd) => handleProcessMessage(cmd, 'text')}
              disabled={assistantState === 'processing' || isListening}
            />

            {/* Desktop Control Pad with Sensors, App Launcher, Input & Files */}
            <DesktopControlPad
              systemStatus={systemStatus}
              onRefreshStatus={refreshBridge}
              onExecuteAction={(act) => runActionSequence([act])}
              isExecuting={isExecutingQueue}
              onEmergencyStop={handleEmergencyStop}
            />
          </div>

          {/* Right Column: Telemetry Conversation History + Task Activity Log (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-5">
            {/* Real-time Task Activity Log */}
            <TaskActivityLog
              tasks={activityLog}
              isExecuting={isExecutingQueue}
              onEmergencyStop={handleEmergencyStop}
              onClearLog={() => setActivityLog([])}
            />

            {/* Telemetry Conversation History */}
            <ConversationHistory
              messages={messages}
              onReplaySpeech={(text, lang) => {
                playSciFiSound('mic_open');
                speakAloud(
                  text,
                  lang,
                  voiceSettings,
                  () => setAssistantState('speaking'),
                  () => setAssistantState('idle')
                );
              }}
              onClearHistory={() => {
                setMessages([
                  {
                    id: 'init-cleared',
                    role: 'assistant',
                    content: 'Telemetry log reset. RAJ AI listening for commands.',
                    timestamp: new Date().toLocaleTimeString(),
                  },
                ]);
              }}
            />
          </div>
        </div>
      </main>

      {/* Sensitive Action Authorization Modal */}
      {pendingAction && (
        <SensitiveConfirmationModal
          action={pendingAction}
          isOpen={isConfirmationOpen}
          onConfirm={confirmSensitiveAction}
          onCancel={cancelSensitiveAction}
        />
      )}

      {/* Windows Bridge Setup & Diagnostic Console Drawer */}
      <BridgeSetupDrawer
        isOpen={isBridgeDrawerOpen}
        onClose={() => setIsBridgeDrawerOpen(false)}
        bridgeHealth={bridgeHealth}
        onRefreshHealth={refreshBridge}
      />

      {/* Speech Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
        settings={voiceSettings}
        onUpdateSettings={(newSettings) => setVoiceSettings(newSettings)}
      />
    </div>
  );
}
