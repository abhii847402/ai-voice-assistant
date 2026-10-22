export type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking' | 'executing_tasks';

export type LanguageCode = 'auto' | 'hi-IN' | 'en-US' | 'en-IN';

export type ActionCategory =
  | 'open_website'
  | 'web_search'
  | 'windows_command'
  | 'desktop_input'
  | 'window_tab'
  | 'file_op'
  | 'system_status'
  | 'none';

export interface ActionPayload {
  type: ActionCategory;
  operation?: string; // e.g., 'launch', 'close', 'type', 'click', 'shortcut', 'scroll', 'list', 'create', 'rename', 'delete', 'status'
  target?: string;    // e.g., 'notepad', 'calc', 'chrome', 'lock_screen', 'screenshot'
  params?: Record<string, any>; // e.g., { text: '...', key: 'enter', x: 0, y: 0, path: '...', filename: '...' }
  url?: string;
  query?: string;
  isSensitive: boolean;
  confirmationPrompt?: string;
  summary?: string;
}

export interface AssistantResponse {
  spokenText: string;
  displayText: string;
  language: 'hindi' | 'english' | 'hinglish';
  actions?: ActionPayload[]; // Multi-step action sequence
  action?: ActionPayload;   // Single action fallback
  warning?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  spokenText?: string;
  timestamp: string;
  inputMode?: 'voice' | 'text';
  language?: 'hindi' | 'english' | 'hinglish';
  actions?: ActionPayload[];
  action?: ActionPayload;
  actionExecuted?: boolean;
}

export interface BridgeHealth {
  status: 'online' | 'offline' | 'checking';
  hostname?: string;
  os?: string;
  version?: string;
  uptimeSeconds?: number;
  supportedCommands?: string[];
  approvedLocations?: string[];
  latencyMs?: number;
  lastChecked?: string;
}

export interface BridgeSpecs {
  hostname: string;
  platform: string;
  python_version: string;
  cpu_count: number;
  user: string;
  server_time: string;
}

export interface SystemStatusData {
  battery_percent?: number | null;
  is_charging?: boolean | null;
  volume_level?: number | null;
  is_muted?: boolean | null;
  running_apps?: string[];
  cpu_percent?: number;
  ram_percent?: number;
  disk_free_gb?: number;
  hostname?: string;
  approved_locations?: string[];
  latest_screenshot?: string;
  latest_screenshot_b64?: string;
}

export interface TaskActivityLogItem {
  id: string;
  timestamp: string;
  title: string;
  action: ActionPayload;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted';
  result?: string;
  error?: string;
}
