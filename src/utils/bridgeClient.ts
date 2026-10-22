import { BridgeHealth, BridgeSpecs, SystemStatusData, ActionPayload } from '../types';

export const BRIDGE_URL = 'http://127.0.0.1:8765';

/**
 * Checks if the local Python companion bridge is currently running on the user's Windows machine.
 */
export async function checkBridgeHealth(): Promise<BridgeHealth> {
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1800);

  try {
    const res = await fetch(`${BRIDGE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latency = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data = await res.json();
      return {
        status: 'online',
        hostname: data.hostname,
        os: data.os || 'Windows',
        version: data.version,
        uptimeSeconds: data.uptime_seconds,
        supportedCommands: data.supported_apps || data.supported_commands,
        approvedLocations: data.approved_locations,
        latencyMs: latency,
        lastChecked: new Date().toLocaleTimeString(),
      };
    } else {
      return {
        status: 'offline',
        lastChecked: new Date().toLocaleTimeString(),
      };
    }
  } catch {
    clearTimeout(timeoutId);
    return {
      status: 'offline',
      lastChecked: new Date().toLocaleTimeString(),
    };
  }
}

/**
 * Fetches real-time hardware status: battery, volume, running applications, CPU, RAM.
 */
export async function fetchSystemStatus(): Promise<SystemStatusData | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`${BRIDGE_URL}/status`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Fetches hardware specifications from the Windows companion.
 */
export async function fetchBridgeSpecs(): Promise<BridgeSpecs | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch(`${BRIDGE_URL}/specs`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Dispatches a structured desktop action to the local Windows bridge.
 */
export async function executeBridgeAction(
  action: ActionPayload,
  confirmed = false
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const payload = {
      type: action.type,
      operation: action.operation || action.target,
      target: action.target,
      params: action.params || {},
      url: action.url,
      confirmed,
    };

    const res = await fetch(`${BRIDGE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || `Executed ${action.summary || action.target}`,
        data: data.data,
      };
    } else {
      return {
        success: false,
        message: data.error || `Action rejected by Windows Bridge`,
        data: data.data,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message:
        'Cannot reach Windows Bridge at http://127.0.0.1:8765. Make sure `python raj_windows_bridge.py` is running in your terminal.',
    };
  }
}

// Backward compatible helper for single command names
export async function executeBridgeCommand(
  command: string,
  extraParams: Record<string, any> = {},
  confirmed = false
): Promise<{ success: boolean; message: string; details?: any }> {
  const action: ActionPayload = {
    type: 'windows_command',
    target: command,
    params: extraParams,
    isSensitive: command === 'lock_screen' || command === 'lock',
  };
  const res = await executeBridgeAction(action, confirmed);
  return {
    success: res.success,
    message: res.message,
    details: res.data,
  };
}
