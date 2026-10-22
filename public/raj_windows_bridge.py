"""
=============================================================================
RAJ AI - WINDOWS DESKTOP CONTROL COMPANION BRIDGE v2.0.0
=============================================================================
Safe, local Python helper service providing practical desktop control for the
RAJ AI Web Assistant.

SECURITY ARCHITECTURE & RESTRICTIONS:
- Strictly bound to localhost: http://127.0.0.1:8765
- Never exposes API keys or accepts arbitrary remote shell execution.
- Strict allowlist of safe Windows applications (launch & close).
- File operations strictly restricted to user-approved locations:
    1. ~/RAJ_AI_Workspace (auto-created sandbox workspace)
    2. ~/Desktop
    3. ~/Documents
    4. ~/Downloads
  Canonical realpath validation blocks all traversal (..) and system directories.
- Sensitive actions (file deletion, file overwriting, locking workstation)
  strictly require explicit confirmation ('confirmed': true).

DEPENDENCIES:
- Python 3.7+ on Windows.
- Runs with 100% standard library (ctypes + subprocess + built-ins)!
- Optional pip packages for advanced automation (auto-detected if installed):
    pip install psutil pyautogui pillow
=============================================================================
"""

import sys
import os
import json
import socket
import time
import subprocess
import webbrowser
import base64
import glob
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

# Detect optional external libraries gracefully
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

try:
    import pyautogui
    # Configure pyautogui safety
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.05
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False

try:
    from PIL import Image, ImageGrab
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# Windows ctypes
try:
    import ctypes
    from ctypes import wintypes
    HAS_CTYPES = True
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
except ImportError:
    HAS_CTYPES = False
    user32 = None
    kernel32 = None

PORT = 8765
HOST = "127.0.0.1"
START_TIME = time.time()

# Setup approved sandbox directories
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

# Allowlisted applications definitions (launch command & executable name for close)
ALLOWLISTED_APPS = {
    "calc": {"title": "Windows Calculator", "launch": "calc.exe", "exe": "CalculatorApp.exe", "alt_exe": "calc.exe"},
    "calculator": {"title": "Windows Calculator", "launch": "calc.exe", "exe": "CalculatorApp.exe", "alt_exe": "calc.exe"},
    "notepad": {"title": "Notepad", "launch": "notepad.exe", "exe": "notepad.exe"},
    "explorer": {"title": "File Explorer", "launch": "explorer.exe", "exe": "explorer.exe"},
    "code": {"title": "Visual Studio Code", "launch": "code", "exe": "Code.exe"},
    "cmd": {"title": "Command Prompt", "launch": "cmd.exe /c start cmd.exe", "exe": "cmd.exe"},
    "powershell": {"title": "PowerShell", "launch": "powershell.exe -NoExit", "exe": "powershell.exe"},
    "taskmgr": {"title": "Task Manager", "launch": "taskmgr.exe", "exe": "Taskmgr.exe"},
    "mspaint": {"title": "Microsoft Paint", "launch": "mspaint.exe", "exe": "mspaint.exe"},
    "chrome": {"title": "Google Chrome", "launch": "start chrome", "exe": "chrome.exe"},
    "edge": {"title": "Microsoft Edge", "launch": "start msedge", "exe": "msedge.exe"},
    "spotify": {"title": "Spotify", "launch": "start spotify:", "exe": "Spotify.exe"},
    "word": {"title": "Microsoft Word", "launch": "start winword", "exe": "WINWORD.EXE"},
    "excel": {"title": "Microsoft Excel", "launch": "start excel", "exe": "EXCEL.EXE"},
}

# Virtual Key Codes for ctypes keyboard automation
VK_CODES = {
    "enter": 0x0D,
    "esc": 0x1B,
    "escape": 0x1B,
    "tab": 0x09,
    "backspace": 0x08,
    "space": 0x20,
    "up": 0x26,
    "down": 0x28,
    "left": 0x25,
    "right": 0x27,
    "ctrl": 0x11,
    "control": 0x11,
    "alt": 0x12,
    "shift": 0x10,
    "win": 0x5B,
    "windows": 0x5B,
    "vol_up": 0xAF,
    "vol_down": 0xAE,
    "vol_mute": 0xAD,
    "c": 0x43,
    "v": 0x56,
    "s": 0x53,
    "z": 0x5A,
    "w": 0x57,
    "t": 0x54,
    "r": 0x52,
    "d": 0x44,
}

# ---------------------------------------------------------------------------
# Security: Path Validator
# ---------------------------------------------------------------------------
def validate_safe_path(target_path: str) -> str:
    """
    Validates that a requested path stays inside user-approved root directories.
    Blocks directory traversal (..) and access to Windows system folders.
    """
    if not target_path or not isinstance(target_path, str):
        raise ValueError("Invalid path parameter")

    # If relative, resolve relative to default RAJ_AI_Workspace
    if not os.path.isabs(target_path):
        target_path = os.path.join(WORKSPACE_DIR, target_path)

    canonical = os.path.realpath(target_path)

    # Check if target is inside any approved root
    is_safe = any(
        canonical == approved or canonical.startswith(approved + os.sep)
        for approved in APPROVED_ROOTS
    )

    if not is_safe:
        raise PermissionError(
            f"Path access denied: '{target_path}' is outside approved folders ({APPROVED_ROOTS})"
        )

    # Explicit protection against Windows system folders
    forbidden_prefixes = ["C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)"]
    for forbidden in forbidden_prefixes:
        if canonical.lower().startswith(forbidden.lower()):
            raise PermissionError(f"Access forbidden: System path {forbidden}")

    return canonical

# ---------------------------------------------------------------------------
# Mouse & Keyboard Handlers
# ---------------------------------------------------------------------------
def trigger_keybd_event(vk, down=True):
    if HAS_CTYPES and user32:
        flags = 0 if down else 2  # 0: down, 2: KEYEVENTF_KEYUP
        user32.keybd_event(vk, 0, flags, 0)

def trigger_key_combo(combo_keys):
    """Presses a combination like ['ctrl', 'c'] and releases in reverse order."""
    if HAS_PYAUTOGUI:
        pyautogui.hotkey(*combo_keys)
        return

    # Fallback using ctypes
    vks = [VK_CODES.get(k.lower()) for k in combo_keys if VK_CODES.get(k.lower())]
    for vk in vks:
        trigger_keybd_event(vk, True)
    time.sleep(0.05)
    for vk in reversed(vks):
        trigger_keybd_event(vk, False)

def type_text_safely(text: str):
    """Types a text string into the active focused window."""
    if not text:
        return
    if HAS_PYAUTOGUI:
        pyautogui.write(text, interval=0.01)
        return

    # Standard library fallback using Windows clipboard paste (handles Unicode/Hindi characters!)
    try:
        import win32clipboard # type: ignore
        win32clipboard.OpenClipboard()
        win32clipboard.EmptyClipboard()
        win32clipboard.SetClipboardText(text, win32clipboard.CF_UNICODETEXT)
        win32clipboard.CloseClipboard()
        trigger_key_combo(["ctrl", "v"])
    except Exception:
        # Fallback character by character for basic ASCII
        for ch in text:
            if ch == '\n':
                trigger_keybd_event(VK_CODES["enter"], True)
                trigger_keybd_event(VK_CODES["enter"], False)
            elif ch == ' ':
                trigger_keybd_event(VK_CODES["space"], True)
                trigger_keybd_event(VK_CODES["space"], False)
            elif ch.isalpha():
                vk = VK_CODES.get(ch.lower(), 0)
                if vk:
                    if ch.isupper():
                        trigger_keybd_event(VK_CODES["shift"], True)
                    trigger_keybd_event(vk, True)
                    trigger_keybd_event(vk, False)
                    if ch.isupper():
                        trigger_keybd_event(VK_CODES["shift"], False)

# ---------------------------------------------------------------------------
# System Status Helper
# ---------------------------------------------------------------------------
def get_system_status_dict():
    status = {
        "hostname": socket.gethostname(),
        "os": sys.platform,
        "python_version": sys.version.split(" ")[0],
        "uptime_seconds": int(time.time() - START_TIME),
        "approved_locations": APPROVED_ROOTS,
        "running_apps": [],
        "battery_percent": None,
        "is_charging": None,
        "cpu_percent": 0.0,
        "ram_percent": 0.0,
    }

    # Battery status
    if HAS_PSUTIL:
        try:
            battery = psutil.sensors_battery()
            if battery:
                status["battery_percent"] = round(battery.percent, 1)
                status["is_charging"] = battery.power_plugged
            status["cpu_percent"] = psutil.cpu_percent(interval=None)
            status["ram_percent"] = psutil.virtual_memory().percent
        except Exception as e:
            print(f"[STATUS ERROR - psutil]: {e}")
    elif HAS_CTYPES and kernel32:
        class SYSTEM_POWER_STATUS(ctypes.Structure):
            _fields_ = [
                ("ACLineStatus", wintypes.BYTE),
                ("BatteryFlag", wintypes.BYTE),
                ("BatteryLifePercent", wintypes.BYTE),
                ("Reserved1", wintypes.BYTE),
                ("BatteryLifeTime", wintypes.DWORD),
                ("BatteryFullLifeTime", wintypes.DWORD),
            ]
        sps = SYSTEM_POWER_STATUS()
        if kernel32.GetSystemPowerStatus(ctypes.byref(sps)):
            if sps.BatteryLifePercent != 255:
                status["battery_percent"] = sps.BatteryLifePercent
            status["is_charging"] = sps.ACLineStatus == 1

    # Running allowlisted applications
    try:
        output = subprocess.check_output("tasklist /FO CSV /NH", shell=True).decode(errors="ignore")
        running_exes = set()
        for line in output.splitlines():
            parts = line.split('","')
            if parts and len(parts) > 0:
                clean_name = parts[0].replace('"', '').strip()
                running_exes.add(clean_name.lower())

        found_apps = []
        for key, info in ALLOWLISTED_APPS.items():
            exe1 = info.get("exe", "").lower()
            exe2 = info.get("alt_exe", "").lower()
            if (exe1 and exe1 in running_exes) or (exe2 and exe2 in running_exes):
                if info["title"] not in found_apps:
                    found_apps.append(info["title"])
        status["running_apps"] = found_apps
    except Exception as e:
        status["running_apps"] = ["Task list unavailable"]

    return status

# ---------------------------------------------------------------------------
# Screenshot Helper
# ---------------------------------------------------------------------------
def take_desktop_screenshot():
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    filepath = os.path.join(SCREENSHOTS_DIR, f"raj_screenshot_{timestamp}.png")

    if HAS_PYAUTOGUI:
        shot = pyautogui.screenshot()
        shot.save(filepath)
    elif HAS_PIL:
        shot = ImageGrab.grab()
        shot.save(filepath)
    else:
        # Standard library PowerShell .NET fallback
        ps_cmd = f"""
        Add-Type -AssemblyName System.Windows.Forms;
        Add-Type -AssemblyName System.Drawing;
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
        $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height;
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap);
        $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size);
        $bitmap.Save('{filepath}', [System.Drawing.Imaging.ImageFormat]::Png);
        $graphics.Dispose();
        $bitmap.Dispose();
        """
        subprocess.run(["powershell.exe", "-Command", ps_cmd], check=True, shell=True)

    # Generate base64 thumbnail for instant preview in web assistant
    thumb_b64 = ""
    try:
        if os.path.exists(filepath):
            with open(filepath, "rb") as f:
                thumb_b64 = "data:image/png;base64," + base64.b64encode(f.read()).decode("utf-8")
    except Exception as e:
        print(f"[SCREENSHOT B64 ERROR]: {e}")

    return filepath, thumb_b64

# ---------------------------------------------------------------------------
# HTTP Request Handler
# ---------------------------------------------------------------------------
class RajBridgeHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-RAJ-Token")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed_path = self.path.split("?")[0]

        if parsed_path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            response_data = {
                "status": "online",
                "service": "RAJ AI Windows Desktop Bridge",
                "version": "2.0.0",
                "hostname": socket.gethostname(),
                "os": sys.platform,
                "uptime_seconds": int(time.time() - START_TIME),
                "supported_apps": list(ALLOWLISTED_APPS.keys()),
                "approved_locations": APPROVED_ROOTS,
                "features": {
                    "app_control": True,
                    "mouse_keyboard": True,
                    "window_tabs": True,
                    "file_ops": True,
                    "screenshots": True,
                    "system_status": True,
                }
            }
            self.wfile.write(json.dumps(response_data).encode("utf-8"))
            return

        elif parsed_path == "/status" or parsed_path == "/specs":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            data = get_system_status_dict()
            self.wfile.write(json.dumps(data).encode("utf-8"))
            return

        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(b'{"error": "Endpoint not found"}')

    def do_POST(self):
        parsed_path = self.path.split("?")[0]

        if parsed_path == "/execute":
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length)

            try:
                payload = json.loads(post_body.decode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Invalid JSON payload: {str(e)}"}).encode("utf-8"))
                return

            action_type = payload.get("type", "windows_command").lower().strip()
            operation = payload.get("operation", "").lower().strip()
            target = str(payload.get("target", "")).lower().strip()
            params = payload.get("params", {}) or {}
            confirmed = bool(payload.get("confirmed", False))

            print(f"[RAJ BRIDGE] >>> Request: type='{action_type}', op='{operation}', target='{target}'")

            # ---------------------------------------------------------------
            # 1. APPLICATION CONTROL (Launch & Close Allowlisted Apps)
            # ---------------------------------------------------------------
            if action_type == "windows_command" or action_type == "app_control":
                # Check for legacy direct command targets (e.g. "calc", "notepad", "lock_screen")
                cmd_key = target or operation

                # Close application
                if operation == "close" or "close" in cmd_key:
                    clean_target = cmd_key.replace("close_", "").replace("close", "").strip()
                    if clean_target in ALLOWLISTED_APPS:
                        info = ALLOWLISTED_APPS[clean_target]
                        exe = info.get("exe")
                        alt_exe = info.get("alt_exe")
                        subprocess.run(f"taskkill /IM {exe} /F", shell=True)
                        if alt_exe:
                            subprocess.run(f"taskkill /IM {alt_exe} /F", shell=True)
                        return self._json_success(f"Closed {info['title']}", {"target": clean_target})
                    else:
                        return self._json_error(f"Cannot close '{clean_target}': not in allowlist", 403)

                # Launch application
                if cmd_key in ALLOWLISTED_APPS:
                    info = ALLOWLISTED_APPS[cmd_key]
                    subprocess.Popen(info["launch"], shell=True)
                    return self._json_success(f"Launched {info['title']}", {"target": cmd_key})

                # Lock Workstation (SENSITIVE: Requires confirmed=True)
                if cmd_key == "lock_screen" or cmd_key == "lock":
                    if not confirmed:
                        return self._json_error("Locking workstation requires confirmation ('confirmed': true)", 403)
                    if HAS_CTYPES and user32:
                        user32.LockWorkStation()
                    else:
                        os.system("rundll32.exe user32.dll,LockWorkStation")
                    return self._json_success("Windows Workstation locked successfully.")

                # Master Volume controls
                if cmd_key == "volume_up":
                    trigger_keybd_event(VK_CODES["vol_up"], True)
                    trigger_keybd_event(VK_CODES["vol_up"], False)
                    return self._json_success("Volume increased.")
                if cmd_key == "volume_down":
                    trigger_keybd_event(VK_CODES["vol_down"], True)
                    trigger_keybd_event(VK_CODES["vol_down"], False)
                    return self._json_success("Volume decreased.")
                if cmd_key == "volume_mute":
                    trigger_keybd_event(VK_CODES["vol_mute"], True)
                    trigger_keybd_event(VK_CODES["vol_mute"], False)
                    return self._json_success("Volume mute toggled.")

                # Screenshot
                if cmd_key == "screenshot":
                    filepath, thumb_b64 = take_desktop_screenshot()
                    return self._json_success(f"Screenshot captured: {os.path.basename(filepath)}", {
                        "filepath": filepath,
                        "thumbnail": thumb_b64,
                    })

                # System Specs / Status
                if cmd_key == "system_specs" or cmd_key == "status":
                    status = get_system_status_dict()
                    return self._json_success("System status retrieved.", status)

            # ---------------------------------------------------------------
            # 2. DESKTOP INPUT (Mouse & Keyboard Control)
            # ---------------------------------------------------------------
            elif action_type == "desktop_input":
                sub_op = operation or target

                # Mouse Movement
                if sub_op == "move" or sub_op == "mouse_move":
                    x = int(params.get("x", 0))
                    y = int(params.get("y", 0))
                    if HAS_PYAUTOGUI:
                        pyautogui.moveTo(x, y)
                    elif HAS_CTYPES and user32:
                        user32.SetCursorPos(x, y)
                    return self._json_success(f"Moved mouse cursor to ({x}, {y})")

                # Mouse Click
                elif sub_op == "click" or sub_op == "mouse_click":
                    button = params.get("button", "left").lower()
                    clicks = int(params.get("clicks", 1))
                    if HAS_PYAUTOGUI:
                        pyautogui.click(button=button, clicks=clicks)
                    elif HAS_CTYPES and user32:
                        if button == "left":
                            for _ in range(clicks):
                                user32.mouse_event(0x0002, 0, 0, 0, 0) # MOUSEEVENTF_LEFTDOWN
                                user32.mouse_event(0x0004, 0, 0, 0, 0) # MOUSEEVENTF_LEFTUP
                        elif button == "right":
                            user32.mouse_event(0x0008, 0, 0, 0, 0)     # MOUSEEVENTF_RIGHTDOWN
                            user32.mouse_event(0x0010, 0, 0, 0, 0)     # MOUSEEVENTF_RIGHTUP
                    return self._json_success(f"Executed mouse click ({button}, {clicks}x)")

                # Mouse Scroll
                elif sub_op == "scroll" or sub_op == "mouse_scroll":
                    amount = int(params.get("amount", 200))
                    if HAS_PYAUTOGUI:
                        pyautogui.scroll(amount)
                    elif HAS_CTYPES and user32:
                        user32.mouse_event(0x0800, 0, 0, amount, 0) # MOUSEEVENTF_WHEEL
                    return self._json_success(f"Scrolled mouse wheel ({amount})")

                # Keyboard Typing
                elif sub_op == "type" or sub_op == "type_text":
                    text_to_type = params.get("text", "")
                    if not text_to_type:
                        return self._json_error("Missing text parameter to type")
                    type_text_safely(text_to_type)
                    return self._json_success(f"Typed text: '{text_to_type[:30]}...'")

                # Key Press (Single key like enter, tab, esc)
                elif sub_op == "press" or sub_op == "key_press":
                    key_name = params.get("key", "").lower()
                    if key_name in VK_CODES:
                        vk = VK_CODES[key_name]
                        trigger_keybd_event(vk, True)
                        trigger_keybd_event(vk, False)
                        return self._json_success(f"Pressed key: {key_name}")
                    elif HAS_PYAUTOGUI:
                        pyautogui.press(key_name)
                        return self._json_success(f"Pressed key: {key_name}")
                    else:
                        return self._json_error(f"Unrecognized key: {key_name}")

                # Keyboard Shortcut (e.g. ctrl+c, ctrl+v, alt+tab, win+d)
                elif sub_op == "shortcut" or sub_op == "key_shortcut":
                    shortcut_str = params.get("shortcut", target)
                    combo = [k.strip().lower() for k in shortcut_str.split("+")]
                    trigger_key_combo(combo)
                    return self._json_success(f"Executed shortcut: {shortcut_str}")

            # ---------------------------------------------------------------
            # 3. WINDOW & BROWSER TAB CONTROLS
            # ---------------------------------------------------------------
            elif action_type == "window_tab":
                sub_op = operation or target

                if sub_op == "switch_window":
                    trigger_key_combo(["alt", "tab"])
                    return self._json_success("Switched active window (Alt+Tab)")
                elif sub_op == "show_desktop":
                    trigger_key_combo(["win", "d"])
                    return self._json_success("Toggled Desktop (Win+D)")
                elif sub_op == "new_tab":
                    trigger_key_combo(["ctrl", "t"])
                    return self._json_success("Opened new browser tab (Ctrl+T)")
                elif sub_op == "close_tab":
                    trigger_key_combo(["ctrl", "w"])
                    return self._json_success("Closed current browser tab (Ctrl+W)")
                elif sub_op == "next_tab":
                    trigger_key_combo(["ctrl", "tab"])
                    return self._json_success("Switched to next tab (Ctrl+Tab)")
                elif sub_op == "prev_tab":
                    trigger_key_combo(["ctrl", "shift", "tab"])
                    return self._json_success("Switched to previous tab (Ctrl+Shift+Tab)")
                elif sub_op == "reload":
                    trigger_key_combo(["ctrl", "r"])
                    return self._json_success("Reloaded tab (Ctrl+R)")

            # ---------------------------------------------------------------
            # 4. FILE OPERATIONS IN APPROVED SANDBOX
            # ---------------------------------------------------------------
            elif action_type == "file_op":
                sub_op = operation or target

                # List files in approved directory
                if sub_op == "list" or sub_op == "file_list":
                    req_path = params.get("path", WORKSPACE_DIR)
                    safe_path = validate_safe_path(req_path)
                    if not os.path.isdir(safe_path):
                        return self._json_error(f"Directory not found: {req_path}")

                    items = []
                    for entry in os.scandir(safe_path):
                        items.append({
                            "name": entry.name,
                            "is_dir": entry.is_dir(),
                            "size_bytes": entry.stat().st_size if entry.is_file() else 0,
                            "modified": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(entry.stat().st_mtime)),
                        })
                    return self._json_success(f"Listed {len(items)} items in {os.path.basename(safe_path)}", {
                        "path": safe_path,
                        "items": items[:100],
                    })

                # Search files
                elif sub_op == "search" or sub_op == "file_search":
                    query = params.get("query", "*")
                    req_path = params.get("path", WORKSPACE_DIR)
                    safe_path = validate_safe_path(req_path)

                    matches = []
                    for root, dirs, files in os.walk(safe_path):
                        for f in files:
                            if query.lower() in f.lower() or query == "*":
                                full = os.path.join(root, f)
                                matches.append({
                                    "name": f,
                                    "path": full,
                                    "size_bytes": os.path.getsize(full),
                                })
                        if len(matches) >= 50:
                            break
                    return self._json_success(f"Found {len(matches)} matching files", {"matches": matches})

                # Create file or folder
                elif sub_op == "create" or sub_op == "file_create":
                    req_path = params.get("path", WORKSPACE_DIR)
                    filename = params.get("filename", "note.txt")
                    content = params.get("content", "")
                    is_folder = bool(params.get("is_folder", False))

                    target_file = validate_safe_path(os.path.join(req_path, filename))

                    if is_folder:
                        os.makedirs(target_file, exist_ok=True)
                        return self._json_success(f"Created folder: {filename}", {"path": target_file})

                    # If file exists and overwrite not confirmed, require confirmation
                    if os.path.exists(target_file) and not confirmed:
                        return self._json_error(
                            f"File '{filename}' already exists. Overwrite requires confirmation ('confirmed': true).",
                            409
                        )

                    with open(target_file, "w", encoding="utf-8") as f:
                        f.write(content)
                    return self._json_success(f"Created file: {filename}", {"path": target_file, "size": len(content)})

                # Rename file or folder
                elif sub_op == "rename" or sub_op == "file_rename":
                    old_path = validate_safe_path(params.get("old_path", ""))
                    new_name = params.get("new_name", "")
                    if not old_path or not new_name:
                        return self._json_error("Missing old_path or new_name")

                    new_path = validate_safe_path(os.path.join(os.path.dirname(old_path), new_name))
                    os.rename(old_path, new_path)
                    return self._json_success(f"Renamed to: {new_name}", {"path": new_path})

                # Delete file (SENSITIVE: Requires confirmed=True)
                elif sub_op == "delete" or sub_op == "file_delete":
                    del_path = validate_safe_path(params.get("path", ""))
                    if not confirmed:
                        return self._json_error(
                            f"Deleting '{os.path.basename(del_path)}' requires confirmation ('confirmed': true)",
                            403
                        )
                    if os.path.isfile(del_path):
                        os.remove(del_path)
                        return self._json_success(f"Deleted file: {os.path.basename(del_path)}")
                    else:
                        return self._json_error("Can only delete files, not directories", 400)

            # ---------------------------------------------------------------
            # 5. OPEN SAFE WEB URL
            # ---------------------------------------------------------------
            elif action_type == "open_website" or action_type == "open_url":
                url = payload.get("url", "")
                if url.startswith("http://") or url.startswith("https://"):
                    webbrowser.open(url)
                    return self._json_success(f"Opened website: {url}")
                return self._json_error("Invalid or non-HTTP URL")

            # Unknown or unallowed command
            return self._json_error(f"Unrecognized action '{action_type}' / '{operation}'. Request rejected.", 403)

        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(b'{"error": "Endpoint not found"}')

    def _json_success(self, message: str, data: dict = None):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()
        res = {"success": True, "message": message}
        if data:
            res["data"] = data
        self.wfile.write(json.dumps(res).encode("utf-8"))

    def _json_error(self, error_msg: str, status_code: int = 400):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({"success": False, "error": error_msg}).encode("utf-8"))

    def log_message(self, format, *args):
        print(f"[RAJ BRIDGE {time.strftime('%H:%M:%S')}] {format % args}")

def run_server():
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, RajBridgeHandler)
    print("=" * 70)
    print("  RAJ AI - WINDOWS DESKTOP CONTROL COMPANION BRIDGE ONLINE (v2.0.0)")
    print(f"  Listening on: http://{HOST}:{PORT} [RESTRICTED TO LOCALHOST]")
    print(f"  System Hostname: {socket.gethostname()} ({sys.platform})")
    print(f"  Approved Sandbox Workspace: {WORKSPACE_DIR}")
    print("  Capabilities: Apps, Mouse/Keyboard, Tabs, Files, Screenshots, Status")
    print("  Ready to receive commands from RAJ AI Web Assistant!")
    print("  Press Ctrl+C to stop.")
    print("=" * 70)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[RAJ BRIDGE] Stopping companion bridge gracefully...")
        httpd.server_close()
        print("[RAJ BRIDGE] Bridge stopped.")

if __name__ == "__main__":
    run_server()
