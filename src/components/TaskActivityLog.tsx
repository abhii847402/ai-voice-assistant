import React from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Terminal,
  Square,
  Play,
  RotateCcw,
} from 'lucide-react';
import { TaskActivityLogItem } from '../types';

interface TaskActivityLogProps {
  tasks: TaskActivityLogItem[];
  isExecuting: boolean;
  onEmergencyStop: () => void;
  onClearLog: () => void;
}

export const TaskActivityLog: React.FC<TaskActivityLogProps> = ({
  tasks,
  isExecuting,
  onEmergencyStop,
  onClearLog,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-950/80 rounded-2xl border border-cyan-500/20 backdrop-blur-md overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/15 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="font-orbitron text-xs font-bold text-slate-200 tracking-wider">
            DESKTOP ACTION ACTIVITY LOG
          </h3>
          <span className="text-[10px] font-mono-cyber px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-400">
            {tasks.length} OPS
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isExecuting && (
            <button
              onClick={onEmergencyStop}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono-cyber font-bold bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)] cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              EMERGENCY STOP
            </button>
          )}

          {tasks.length > 0 && !isExecuting && (
            <button
              onClick={onClearLog}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear Activity Log"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 max-h-[300px]">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 space-y-1">
            <Activity className="w-6 h-6 text-slate-600" />
            <p className="text-xs font-mono-cyber text-slate-400">NO DESKTOP ACTIONS EXECUTED YET</p>
            <p className="text-[11px] text-slate-500 font-rajdhani">
              Voice commands like "Open Notepad and type 'Hello'" will log here.
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            let statusIcon = <Clock className="w-4 h-4 text-slate-400" />;
            let badgeClass = 'text-slate-400 border-slate-700 bg-slate-900';

            if (task.status === 'running') {
              statusIcon = <Play className="w-4 h-4 text-cyan-400 animate-spin" />;
              badgeClass = 'text-cyan-300 border-cyan-500 bg-cyan-950/80 animate-pulse';
            } else if (task.status === 'completed') {
              statusIcon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
              badgeClass = 'text-emerald-300 border-emerald-600 bg-emerald-950/60';
            } else if (task.status === 'failed') {
              statusIcon = <AlertCircle className="w-4 h-4 text-red-400" />;
              badgeClass = 'text-red-300 border-red-600 bg-red-950/60';
            } else if (task.status === 'aborted') {
              statusIcon = <XCircle className="w-4 h-4 text-amber-400" />;
              badgeClass = 'text-amber-300 border-amber-600 bg-amber-950/60';
            }

            return (
              <div
                key={task.id}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono-cyber flex items-start justify-between gap-3 shadow-sm"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="mt-0.5 shrink-0">{statusIcon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-slate-200 font-semibold truncate font-rajdhani text-sm">
                      {task.title}
                    </div>
                    {task.result && (
                      <div className="text-[11px] text-slate-400 truncate">
                        {task.result}
                      </div>
                    )}
                    {task.error && (
                      <div className="text-[11px] text-red-400 truncate">
                        Error: {task.error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${badgeClass}`}>
                    {task.status}
                  </span>
                  <span className="text-[9px] text-slate-500">{task.timestamp}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
