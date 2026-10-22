import React, { useEffect, useState } from 'react';
import { X, Volume2, Sliders, Check } from 'lucide-react';
import { VoiceSettings, getSystemVoices, speakAloud } from '../utils/speech';
import { playSciFiSound } from '../utils/audioSynth';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: VoiceSettings) => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [localSettings, setLocalSettings] = useState<VoiceSettings>(settings);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      getSystemVoices().then((v) => setVoices(v));
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleTestSpeech = () => {
    playSciFiSound('mic_open');
    speakAloud(
      'नमस्ते, मैं राज हूँ। वॉइस सिंथेसाइज़र एक्टिवेट हो चुका है। All systems functional.',
      'hinglish',
      localSettings
    );
  };

  const handleSave = () => {
    playSciFiSound('affirmative');
    onUpdateSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-950 border border-cyan-500/40 p-6 shadow-[0_0_40px_rgba(6,182,212,0.25)] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Sliders className="w-5 h-5" />
            <h3 className="font-orbitron text-base font-bold text-white">
              Speech Synthesis Core
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Audio Output Enabled Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div>
              <div className="text-xs font-semibold text-white font-rajdhani text-sm">
                Voice Output Aloud
              </div>
              <div className="text-[10px] text-slate-400 font-mono-cyber">
                Speak responses using browser TTS
              </div>
            </div>
            <input
              type="checkbox"
              checked={localSettings.enabled}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, enabled: e.target.checked })
              }
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
            />
          </div>

          {/* Voice Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono-cyber text-slate-400">
              Voice Selection ({voices.length} detected)
            </label>
            <select
              value={localSettings.voiceName || ''}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, voiceName: e.target.value || undefined })
              }
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono-cyber text-cyan-200 focus:border-cyan-400 outline-none"
            >
              <option value="">Auto Detect (Bilingual Hindi + English)</option>
              {voices.map((v, i) => (
                <option key={i} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Speech Rate Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono-cyber">
              <span className="text-slate-400">Speech Rate (Speed)</span>
              <span className="text-cyan-300 font-bold">{localSettings.rate}x</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.05"
              value={localSettings.rate}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, rate: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Pitch Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono-cyber">
              <span className="text-slate-400">Voice Pitch</span>
              <span className="text-cyan-300 font-bold">{localSettings.pitch}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={localSettings.pitch}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, pitch: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={handleTestSpeech}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono-cyber bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            Test Speech
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-mono-cyber font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
