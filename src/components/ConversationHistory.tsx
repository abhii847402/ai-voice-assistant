import React, { useState } from 'react';
import {
  Volume2,
  Copy,
  Check,
  Trash2,
  Download,
  ExternalLink,
  Terminal,
  Bot,
  User,
  Mic,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { ChatMessage } from '../types';
import { playSciFiSound } from '../utils/audioSynth';

interface ConversationHistoryProps {
  messages: ChatMessage[];
  onReplaySpeech: (text: string, language?: 'hindi' | 'english' | 'hinglish') => void;
  onClearHistory: () => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  messages,
  onReplaySpeech,
  onClearHistory,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'actions' | 'qa'>('all');

  const filteredMessages = messages.filter((m) => {
    if (filter === 'actions') return m.action && m.action.type !== 'none';
    if (filter === 'qa') return !m.action || m.action.type === 'none';
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playSciFiSound('affirmative', 0.2);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    playSciFiSound('link_open');
    const transcript = messages
      .map(
        (m) =>
          `[${m.timestamp}] ${m.role === 'user' ? 'USER' : 'RAJ AI'} (${m.language || 'en'}): ${
            m.content
          }`
      )
      .join('\n\n');

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raj_ai_transcript_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 rounded-2xl border border-cyan-500/20 backdrop-blur-md overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* History Header & Controls */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-cyan-500/15 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <h3 className="font-orbitron text-xs font-bold text-slate-200 tracking-wider">
            CONVERSATION TELEMETRY
          </h3>
          <span className="text-[10px] font-mono-cyber px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-400">
            {messages.length} ENTRIES
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="hidden sm:flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono-cyber">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                filter === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('actions')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                filter === 'actions'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Actions
            </button>
            <button
              onClick={() => setFilter('qa')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                filter === 'qa'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Q&A
            </button>
          </div>

          {messages.length > 0 && (
            <>
              <button
                onClick={handleExport}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                title="Export Transcript as TXT"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Clear entire conversation history?')) {
                    onClearHistory();
                    playSciFiSound('mic_close');
                  }
                }}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-600/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Clear History"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[460px] min-h-[300px]">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-slate-500 space-y-2 text-center p-6">
            <Bot className="w-10 h-10 text-cyan-500/30 animate-pulse" />
            <p className="text-xs font-mono-cyber text-slate-400">
              NO TELEMETRY LOGGED YET
            </p>
            <p className="text-xs text-slate-500 font-rajdhani max-w-xs">
              Press "Start Listening" or pick a sample command below to activate RAJ AI.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              } space-y-1`}
            >
              {/* Role Header */}
              <div className="flex items-center gap-2 text-[10px] font-mono-cyber text-slate-500 px-1">
                {msg.role === 'user' ? (
                  <>
                    <span>{msg.timestamp}</span>
                    <span className="text-cyan-400 font-bold flex items-center gap-1">
                      USER {msg.inputMode === 'voice' && <Mic className="w-3 h-3 text-cyan-300" />}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-cyan-300 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" /> RAJ AI
                    </span>
                    {msg.language && (
                      <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {msg.language}
                      </span>
                    )}
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`relative max-w-[90%] md:max-w-[85%] rounded-2xl p-3.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-500/30 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 shadow-md'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed font-rajdhani text-base">
                  {msg.content}
                </div>

                {/* Spoken text indicator if different */}
                {msg.spokenText && msg.spokenText !== msg.content && msg.role === 'assistant' && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 text-xs text-cyan-400/80 font-mono-cyber flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                    <span>Spoken: "{msg.spokenText}"</span>
                  </div>
                )}

                {/* Action Card Pill if present */}
                {msg.action && msg.action.type !== 'none' && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs font-mono-cyber">
                    <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-slate-300 truncate">
                        {msg.action.summary || msg.action.target}
                      </span>
                    </div>

                    {msg.action.url && (
                      <a
                        href={msg.action.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 underline shrink-0"
                      >
                        Open Link <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* Footer Message Actions */}
                {msg.role === 'assistant' && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/50 flex items-center justify-end gap-2 text-slate-500">
                    <button
                      onClick={() =>
                        onReplaySpeech(msg.spokenText || msg.content, msg.language)
                      }
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Speak response again"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
