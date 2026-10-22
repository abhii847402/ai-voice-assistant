import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK on the server side as required
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

interface ChatRequestBody {
  message: string;
  history?: { role: 'user' | 'model'; content: string }[];
  languagePreference?: 'auto' | 'hindi' | 'english';
}

// System instruction for RAJ AI Desktop Control Assistant
const SYSTEM_INSTRUCTION = `
You are "RAJ AI" (Responsive Autonomous Jurisdiction Artificial Intelligence), an advanced futuristic cybernetic voice assistant for the user's personal Windows workstation with full practical desktop control.

CORE CAPABILITIES:
- Languages: Bilingual Hindi (हिन्दी) and English. Fluently understand Hinglish (e.g. "Notepad kholo aur usme 'Project Plan' type karo", "Chrome me YouTube open karo", "Mera computer lock kar do", "Desktop par ek folder banao").
- Multi-Step Task Execution: You decompose user requests into an array of sequential, structured actions ("actions": [...]).
- Zero Arbitrary Shell Execution: Every desktop action must match the strict allowlisted schema. Never generate raw cmd/powershell execution strings.

ALLOWED ACTION TYPES & OPERATIONS:
1. "windows_command":
   - operation: "launch" or "close"
   - target: "calc", "notepad", "explorer", "code", "cmd", "powershell", "taskmgr", "mspaint", "chrome", "edge", "spotify", "word", "excel", "lock_screen", "volume_up", "volume_down", "volume_mute", "screenshot", "system_specs"
2. "desktop_input":
   - operation: "type" (params: { text: "string to type" })
   - operation: "press" (params: { key: "enter" | "esc" | "tab" | "backspace" | "space" | "up" | "down" | "left" | "right" })
   - operation: "shortcut" (params: { shortcut: "ctrl+c" | "ctrl+v" | "ctrl+s" | "ctrl+z" | "ctrl+w" | "ctrl+t" | "alt+tab" | "win+d" | "ctrl+shift+esc" })
   - operation: "click" (params: { button: "left" | "right", clicks: 1 | 2 })
   - operation: "scroll" (params: { amount: 300 | -300 })
3. "window_tab":
   - operation: "switch_window" | "show_desktop" | "new_tab" | "close_tab" | "next_tab" | "prev_tab" | "reload"
4. "file_op":
   - operation: "list" (params: { path: "Desktop" | "Documents" | "Downloads" | "RAJ_AI_Workspace" })
   - operation: "search" (params: { query: "search string", path: "..." })
   - operation: "create" (params: { filename: "notes.txt", content: "...", is_folder: boolean, path: "..." })
   - operation: "rename" (params: { old_path: "...", new_name: "..." })
   - operation: "delete" (params: { path: "..." }) -> STRICTLY SENSITIVE!
5. "open_website" or "web_search":
   - url: "https://..."
   - query: "search query"
6. "system_status":
   - operation: "status" (retrieves battery, volume, running apps, CPU, RAM)
7. "none":
   - For general conversation, Q&A, explanations, advice, etc.

SENSITIVITY & MANDATORY CONFIRMATIONS:
The following operations MUST have "isSensitive": true and a clear "confirmationPrompt":
- Locking the workstation ("lock_screen")
- Deleting files or folders ("file_op" with operation "delete")
- Overwriting existing files
- Installing software / system changes
- Sending external messages

JSON OUTPUT FORMAT:
Output strictly valid JSON with this exact schema:
{
  "spokenText": string (clean speech text for TTS, natural Hindi or English, direct and under 2-3 sentences),
  "displayText": string (markdown formatted response with bullet points if helpful),
  "language": "hindi" | "english" | "hinglish",
  "actions": [
    {
      "type": string,
      "operation": string,
      "target": string,
      "params": object,
      "url": string,
      "query": string,
      "isSensitive": boolean,
      "confirmationPrompt": string,
      "summary": string
    }
  ]
}
`;

// Comprehensive Fallback Multi-Step Rule Parser
function fallbackRuleParser(message: string): any {
  const lower = message.toLowerCase().trim();
  const actions: any[] = [];
  const isHindi = Boolean(lower.match(/[अ-ह]/)) || lower.includes('kholo') || lower.includes('karo') || lower.includes('banao') || lower.includes('likho');

  // Check for Lock Computer (Sensitive)
  if (lower.includes('lock') || lower.includes('computer lock') || lower.includes('pc lock')) {
    return {
      spokenText: isHindi
        ? 'सिस्टम लॉक करने के लिए आपकी पुष्टि आवश्यक है। क्या आप कंप्यूटर लॉक करना चाहते हैं?'
        : 'Locking your workstation requires confirmation. Please confirm to proceed.',
      displayText: '⚠️ **Security Protocol**: Request to lock Windows Workstation (`LockWorkStation`). Confirmation required.',
      language: isHindi ? 'hindi' : 'english',
      actions: [
        {
          type: 'windows_command',
          operation: 'launch',
          target: 'lock_screen',
          isSensitive: true,
          confirmationPrompt: isHindi ? 'क्या आप सच में सिस्टम लॉक करना चाहते हैं?' : 'Are you sure you want to lock your Windows workstation?',
          summary: 'Lock Windows Workstation',
        },
      ],
    };
  }

  // Check for Delete File (Sensitive)
  if (lower.includes('delete') || lower.includes('file hatao') || lower.includes('remove file')) {
    const filenameMatch = lower.match(/(?:file|delete)\s+([a-zA-Z0-9_\-\.]+)/);
    const targetFile = filenameMatch ? filenameMatch[1] : 'selected_file.txt';
    return {
      spokenText: `Deleting ${targetFile} is a sensitive action. Confirmation required.`,
      displayText: `⚠️ **Action Warning**: Request to delete file **${targetFile}**. User confirmation required.`,
      language: isHindi ? 'hindi' : 'english',
      actions: [
        {
          type: 'file_op',
          operation: 'delete',
          params: { path: targetFile },
          isSensitive: true,
          confirmationPrompt: `Are you sure you want to permanently delete '${targetFile}'?`,
          summary: `Delete file '${targetFile}'`,
        },
      ],
    };
  }

  // Multi-step: Launch Notepad + Type Text + Save / Screenshot
  if ((lower.includes('notepad') && (lower.includes('type') || lower.includes('likho') || lower.includes('write'))) ||
      (lower.includes('notepad kholo') && lower.includes('aur'))) {
    // Extract text to type
    let textToType = 'Notes created by RAJ AI Assistant.';
    const typeMatch = message.match(/(?:type|write|likho)\s+['"]?([^'"]+)['"]?/i);
    if (typeMatch && typeMatch[1]) {
      textToType = typeMatch[1].trim();
    }

    actions.push({
      type: 'windows_command',
      operation: 'launch',
      target: 'notepad',
      isSensitive: false,
      summary: 'Launch Windows Notepad (notepad.exe)',
    });

    actions.push({
      type: 'desktop_input',
      operation: 'type',
      params: { text: textToType },
      isSensitive: false,
      summary: `Type text into Notepad: "${textToType.slice(0, 30)}..."`,
    });

    if (lower.includes('screenshot') || lower.includes('capture')) {
      actions.push({
        type: 'windows_command',
        operation: 'launch',
        target: 'screenshot',
        isSensitive: false,
        summary: 'Capture desktop screenshot',
      });
    }

    return {
      spokenText: isHindi
        ? `नोटपैड खोलकर उसमें "${textToType.slice(0, 25)}" टाइप किया जा रहा है।`
        : `Opening Notepad and typing your text.`,
      displayText: `Executing Multi-Step Task:\n1. 💻 **Launch Notepad**\n2. ⌨️ **Type text**: "${textToType}"${lower.includes('screenshot') ? '\n3. 📸 **Take Screenshot**' : ''}`,
      language: isHindi ? 'hindi' : 'english',
      actions,
    };
  }

  // Single or Multi App Launch / Close
  const appMap: Record<string, string> = {
    notepad: 'notepad',
    calc: 'calc',
    calculator: 'calc',
    chrome: 'chrome',
    edge: 'edge',
    explorer: 'explorer',
    'file explorer': 'explorer',
    code: 'code',
    'vs code': 'code',
    vscode: 'code',
    cmd: 'cmd',
    'command prompt': 'cmd',
    powershell: 'powershell',
    taskmgr: 'taskmgr',
    'task manager': 'taskmgr',
    mspaint: 'mspaint',
    paint: 'mspaint',
    spotify: 'spotify',
  };

  // Close app check
  if (lower.includes('close') || lower.includes('band karo') || lower.includes('quit')) {
    for (const [key, appTarget] of Object.entries(appMap)) {
      if (lower.includes(key)) {
        return {
          spokenText: `Closing ${key}.`,
          displayText: `Terminating **${key}** via Windows Bridge.`,
          language: isHindi ? 'hindi' : 'english',
          actions: [
            {
              type: 'windows_command',
              operation: 'close',
              target: appTarget,
              isSensitive: false,
              summary: `Close ${key}`,
            },
          ],
        };
      }
    }
  }

  // Launch apps check
  for (const [key, appTarget] of Object.entries(appMap)) {
    if (lower.includes(key) && (lower.includes('open') || lower.includes('launch') || lower.includes('kholo') || lower.includes('start'))) {
      actions.push({
        type: 'windows_command',
        operation: 'launch',
        target: appTarget,
        isSensitive: false,
        summary: `Launch ${key}`,
      });
      break;
    }
  }

  // Screenshot command
  if (lower.includes('screenshot') || lower.includes('screen capture') || lower.includes('screenshot lo')) {
    actions.push({
      type: 'windows_command',
      operation: 'launch',
      target: 'screenshot',
      isSensitive: false,
      summary: 'Capture desktop screenshot',
    });
  }

  // System Status / Battery
  if (lower.includes('battery') || lower.includes('system status') || lower.includes('pc status') || lower.includes('hardware') || lower.includes('specs') || lower.includes('running apps')) {
    actions.push({
      type: 'system_status',
      operation: 'status',
      isSensitive: false,
      summary: 'Query live battery, volume & running apps status',
    });
    return {
      spokenText: 'Checking your Windows workstation hardware and battery status.',
      displayText: 'Querying **System Status** (Battery, Volume, Running Windows Apps, CPU/RAM) via the local companion bridge.',
      language: 'english',
      actions,
    };
  }

  // Window & Browser Tab controls
  if (lower.includes('switch window') || lower.includes('alt tab') || lower.includes('window badlo')) {
    actions.push({
      type: 'window_tab',
      operation: 'switch_window',
      isSensitive: false,
      summary: 'Switch Window (Alt+Tab)',
    });
  } else if (lower.includes('show desktop') || lower.includes('minimize all') || lower.includes('desktop dikhao')) {
    actions.push({
      type: 'window_tab',
      operation: 'show_desktop',
      isSensitive: false,
      summary: 'Toggle Desktop (Win+D)',
    });
  } else if (lower.includes('new tab') || lower.includes('naya tab')) {
    actions.push({
      type: 'window_tab',
      operation: 'new_tab',
      isSensitive: false,
      summary: 'Open New Browser Tab (Ctrl+T)',
    });
  } else if (lower.includes('close tab') || lower.includes('tab band karo')) {
    actions.push({
      type: 'window_tab',
      operation: 'close_tab',
      isSensitive: false,
      summary: 'Close Browser Tab (Ctrl+W)',
    });
  } else if (lower.includes('next tab') || lower.includes('agla tab')) {
    actions.push({
      type: 'window_tab',
      operation: 'next_tab',
      isSensitive: false,
      summary: 'Next Browser Tab (Ctrl+Tab)',
    });
  }

  // YouTube / Google
  if (lower.includes('youtube')) {
    const isSearch = lower.includes('search') || lower.includes('dhundo') || lower.includes('play');
    let q = '';
    if (isSearch) {
      q = lower.replace(/open|youtube|kholo|search|dhundo|chalao|play|on/g, '').trim();
    }
    const url = q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : 'https://www.youtube.com';
    actions.push({
      type: 'open_website',
      target: 'youtube',
      url,
      query: q,
      isSensitive: false,
      summary: `Open YouTube (${url})`,
    });
    return {
      spokenText: q ? `Searching YouTube for ${q}` : 'Opening YouTube.',
      displayText: `Opening **YouTube**${q ? ` for: "${q}"` : ''}`,
      language: isHindi ? 'hindi' : 'english',
      actions,
    };
  }

  if (lower.includes('google')) {
    const isSearch = lower.includes('search') || lower.includes('dhundo') || lower.includes('karo');
    let q = '';
    if (isSearch) {
      q = lower.replace(/open|google|kholo|search|dhundo|karo|on/g, '').trim();
    }
    const url = q ? `https://www.google.com/search?q=${encodeURIComponent(q)}` : 'https://www.google.com';
    actions.push({
      type: 'open_website',
      target: 'google',
      url,
      query: q,
      isSensitive: false,
      summary: `Open Google (${url})`,
    });
    return {
      spokenText: q ? `Searching Google for ${q}` : 'Opening Google.',
      displayText: `Opening **Google**${q ? ` for: "${q}"` : ''}`,
      language: isHindi ? 'hindi' : 'english',
      actions,
    };
  }

  // File Operations (Create / List)
  if (lower.includes('create file') || lower.includes('file banao') || lower.includes('create folder') || lower.includes('folder banao')) {
    const isFolder = lower.includes('folder');
    const nameMatch = lower.match(/(?:file|folder)\s+([a-zA-Z0-9_\-\.]+)/);
    const targetName = nameMatch ? nameMatch[1] : (isFolder ? 'New_Folder' : 'new_note.txt');
    const location = lower.includes('desktop') ? 'Desktop' : (lower.includes('document') ? 'Documents' : 'RAJ_AI_Workspace');

    actions.push({
      type: 'file_op',
      operation: 'create',
      params: {
        filename: targetName,
        content: `Created by RAJ AI on ${new Date().toLocaleString()}`,
        is_folder: isFolder,
        path: location,
      },
      isSensitive: false,
      summary: `Create ${isFolder ? 'folder' : 'file'} '${targetName}' in ${location}`,
    });

    return {
      spokenText: isHindi
        ? `${location} पर ${targetName} बनाया जा रहा है।`
        : `Creating ${isFolder ? 'folder' : 'file'} ${targetName} in ${location}.`,
      displayText: `Creating **${isFolder ? 'folder' : 'file'}** \`${targetName}\` in \`${location}\`.`,
      language: isHindi ? 'hindi' : 'english',
      actions,
    };
  }

  if (lower.includes('list files') || lower.includes('files dikhao') || lower.includes('show files')) {
    const location = lower.includes('desktop') ? 'Desktop' : (lower.includes('downloads') ? 'Downloads' : 'RAJ_AI_Workspace');
    actions.push({
      type: 'file_op',
      operation: 'list',
      params: { path: location },
      isSensitive: false,
      summary: `List files in ${location}`,
    });
    return {
      spokenText: `Listing files in ${location}.`,
      displayText: `Listing files in approved directory: \`${location}\``,
      language: isHindi ? 'hindi' : 'english',
      actions,
    };
  }

  // If actions were identified, return them
  if (actions.length > 0) {
    return {
      spokenText: `Executing requested workstation operations.`,
      displayText: `Executing **${actions.length}** desktop action${actions.length > 1 ? 's' : ''}.`,
      language: isHindi ? 'hindi' : 'english',
      actions,
    };
  }

  // Hindi greeting
  if (lower.includes('namaste') || lower.includes('kaisa hai') || lower.includes('नमस्ते') || lower.includes('tum kaun ho')) {
    return {
      spokenText: 'नमस्ते! मैं राज एआई हूँ, आपका पर्सनल विंडोज़ डेस्कटॉप वॉइस असिस्टेंट। मैं आपकी क्या मदद कर सकता हूँ?',
      displayText: 'नमस्ते! मैं **RAJ AI** हूँ—आपका विंडोज़ वॉइस असिस्टेंट।\n\nअब मैं आपके पूरे डेस्कटॉप को नियंत्रित कर सकता हूँ:\n- 🚀 **Apps Launch & Close** (Notepad, Calc, Chrome, VS Code)\n- ⌨️ **Mouse & Keyboard** (Type text, press keys, shortcuts)\n- 📂 **File Operations** (Create, list, search in approved folders)\n- 📸 **Desktop Screenshot & Battery Status**\n- 🔒 **Safe Confirmation for Sensitive Actions**',
      language: 'hindi',
      actions: [{ type: 'none', isSensitive: false, summary: '' }],
    };
  }

  // Science / Q&A
  if (lower.includes('black hole') || lower.includes('ब्लैक होल')) {
    return {
      spokenText: 'ब्लैक होल अंतरिक्ष में अत्यधिक गुरुत्वाकर्षण वाला क्षेत्र है, जहां से प्रकाश भी बाहर नहीं निकल सकता।',
      displayText: '🌌 **ब्लैक होल (Black Hole)**:\nब्लैक होल अंतरिक्ष में अत्यधिक घनत्व और असीम गुरुत्वाकर्षण वाला वह क्षेत्र है, जिसका पलायन वेग प्रकाश की गति से भी अधिक होता है।',
      language: 'hindi',
      actions: [{ type: 'none', isSensitive: false, summary: '' }],
    };
  }

  // Default response
  return {
    spokenText: `RAJ AI online. Processing command: ${message}`,
    displayText: `Acknowledged: "${message}". Connect the local companion bridge to trigger desktop controls, or ask me any question.`,
    language: isHindi ? 'hindi' : 'english',
    actions: [{ type: 'none', isSensitive: false, summary: '' }],
  };
}

// API endpoint for RAJ AI assistant
app.post('/api/assistant', async (req: Request, res: Response) => {
  try {
    const { message, history = [], languagePreference = 'auto' } = req.body as ChatRequestBody;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    if (!ai) {
      console.warn('GEMINI_API_KEY not configured, using fallback rule engine');
      const fallbackResult = fallbackRuleParser(message);
      return res.json(fallbackResult);
    }

    // Build context with history
    const formattedHistory = history.slice(-6).map((item) => ({
      role: item.role === 'model' ? 'model' : 'user',
      parts: [{ text: item.content }],
    }));

    const promptContext = `
User Input: "${message}"
Language Preference: ${languagePreference}
Current Date & Time: ${new Date().toISOString()}

Analyze the user's intent. Return strictly valid JSON conforming to the system instruction schema with the "actions" array.
`;

    // 3.8s timeout race to guarantee instant UI response if network/egress is delayed
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI inference timeout')), 3800)
    );

    const geminiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        ...formattedHistory,
        {
          role: 'user',
          parts: [{ text: promptContext }],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            spokenText: {
              type: Type.STRING,
              description: 'Concise speech text for TTS output in Hindi or English without markdown.',
            },
            displayText: {
              type: Type.STRING,
              description: 'Rich markdown formatted text for the HUD log.',
            },
            language: {
              type: Type.STRING,
              description: 'Language of response: hindi, english, or hinglish.',
            },
            actions: {
              type: Type.ARRAY,
              description: 'Sequential array of structured desktop actions.',
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: 'Action type: windows_command, desktop_input, window_tab, file_op, system_status, open_website, web_search, none.',
                  },
                  operation: {
                    type: Type.STRING,
                    description: 'Operation: launch, close, type, press, shortcut, click, scroll, list, search, create, rename, delete, status.',
                  },
                  target: {
                    type: Type.STRING,
                    description: 'Target identifier: app name, website, shortcut, etc.',
                  },
                  url: {
                    type: Type.STRING,
                    description: 'Full destination URL if opening a website.',
                  },
                  query: {
                    type: Type.STRING,
                    description: 'Search query if searching.',
                  },
                  isSensitive: {
                    type: Type.BOOLEAN,
                    description: 'True if action requires user confirmation before execution.',
                  },
                  confirmationPrompt: {
                    type: Type.STRING,
                    description: 'Question to ask user for confirmation.',
                  },
                  summary: {
                    type: Type.STRING,
                    description: 'Brief human-readable summary of this step.',
                  },
                },
                required: ['type', 'isSensitive'],
              },
            },
          },
          required: ['spokenText', 'displayText', 'language', 'actions'],
        },
      },
    });

    const response = await Promise.race([geminiPromise, timeoutPromise]);
    const rawText = response.text?.trim() || '';
    let parsedData;
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = fallbackRuleParser(message);
      }
    }

    // Ensure backwards compatibility with single 'action' property
    if (parsedData && parsedData.actions && parsedData.actions.length > 0 && !parsedData.action) {
      parsedData.action = parsedData.actions[0];
    }

    return res.json(parsedData);
  } catch (error: any) {
    console.warn('[RAJ AI Server] Fallback parser triggered:', error.message);
    const fallback = fallbackRuleParser(req.body.message || 'Help');
    if (fallback.actions && fallback.actions.length > 0 && !fallback.action) {
      fallback.action = fallback.actions[0];
    }
    return res.json(fallback);
  }
});

// Provide downloadable bridge file
app.get('/api/bridge/download', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/x-python');
  res.setHeader('Content-Disposition', 'attachment; filename="raj_windows_bridge.py"');
  res.sendFile(path.join(__dirname, 'public', 'raj_windows_bridge.py'));
});

// Mount Vite in dev mode or serve static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[RAJ AI Server] Online on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[RAJ AI Server] Startup error:', err);
});
