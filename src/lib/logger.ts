/**
 * Centralized Logging System for Fiyat Yöneticisi
 * 
 * Provides structured, styled console logging with:
 * - Log levels (DEBUG, INFO, WARN, ERROR, SUCCESS)
 * - Module/context tagging
 * - Timestamps
 * - Data inspection utilities
 * - Performance timing
 * - Request/Response logging for API routes
 */

// ─── Log Levels ───────────────────────────────────────────────
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4,
}

// Current minimum log level (can be adjusted for production)
const CURRENT_LOG_LEVEL = LogLevel.DEBUG;

// ─── Styled Console Colors (Browser) ─────────────────────────
const STYLES = {
  // Module badges
  badge: (bg: string) => `background:${bg};color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;font-size:11px`,
  
  // Level badges
  debug:   'background:#6366f1;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;font-size:10px',
  info:    'background:#3b82f6;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;font-size:10px',
  success: 'background:#22c55e;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;font-size:10px',
  warn:    'background:#f59e0b;color:#000;padding:2px 6px;border-radius:3px;font-weight:bold;font-size:10px',
  error:   'background:#ef4444;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;font-size:10px',
  
  // Decorative
  timestamp: 'color:#94a3b8;font-size:10px',
  dim:       'color:#94a3b8;font-style:italic',
  bold:      'font-weight:bold',
  reset:     '',
} as const;

// Module color palette
const MODULE_COLORS: Record<string, string> = {
  'API:Data':     '#8b5cf6', // Purple
  'API:Ledger':   '#06b6d4', // Cyan
  'API:Shops':    '#f97316', // Orange
  'API:Auth':     '#ec4899', // Pink
  'Auth':         '#ec4899', // Pink
  'Page:Home':    '#10b981', // Emerald
  'Page:Ledger':  '#06b6d4', // Cyan
  'Hook:Storage': '#8b5cf6', // Purple
  'Utils':        '#6366f1', // Indigo
};

// ─── Helpers ──────────────────────────────────────────────────
function getTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString('tr-TR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3 
  });
}

function isServer(): boolean {
  return typeof window === 'undefined';
}

/** Formats data object into a single-line string with parentheses */
function formatDataInline(data: any): string {
  if (data === undefined || data === null) return '';
  
  try {
    if (typeof data === 'object') {
      const entries = Object.entries(data)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(', ');
      return entries ? ` (${entries})` : '';
    }
    return ` (${data})`;
  } catch (e) {
    return ' ([Data error])';
  }
}

// Server-side ANSI color codes
const ANSI = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',
  bgRed:   '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow:'\x1b[43m',
  bgBlue:  '\x1b[44m',
  bgMagenta:'\x1b[45m',
  bgCyan:  '\x1b[46m',
} as const;

const LEVEL_ANSI: Record<string, string> = {
  DEBUG:   `${ANSI.bgMagenta}${ANSI.white}${ANSI.bold}`,
  INFO:    `${ANSI.bgBlue}${ANSI.white}${ANSI.bold}`,
  SUCCESS: `${ANSI.bgGreen}${ANSI.white}${ANSI.bold}`,
  WARN:    `${ANSI.bgYellow}${ANSI.bold}`,
  ERROR:   `${ANSI.bgRed}${ANSI.white}${ANSI.bold}`,
};

const MODULE_ANSI: Record<string, string> = {
  'API:Data':     ANSI.magenta,
  'API:Ledger':   ANSI.cyan,
  'API:Shops':    ANSI.yellow,
  'API:Auth':     ANSI.magenta,
  'Auth':         ANSI.magenta,
  'Page:Home':    ANSI.green,
  'Page:Ledger':  ANSI.cyan,
  'Hook:Storage': ANSI.magenta,
  'Utils':        ANSI.blue,
};

// ─── Core Logger ──────────────────────────────────────────────
function logMessage(
  level: LogLevel,
  module: string,
  message: string,
  data?: any
): void {
  if (level < CURRENT_LOG_LEVEL) return;

  const levelName = LogLevel[level] as keyof typeof LogLevel;
  const timestamp = getTimestamp();
  const dataStr = formatDataInline(data);

  if (isServer()) {
    // ─── Server-side (Node.js with ANSI) ────────
    const levelColor = LEVEL_ANSI[levelName] || '';
    const moduleColor = MODULE_ANSI[module] || ANSI.white;
    const timeStr = `${ANSI.gray}${timestamp}${ANSI.reset}`;
    const levelStr = `${levelColor} ${levelName} ${ANSI.reset}`;
    const moduleStr = `${moduleColor}${ANSI.bold}[${module}]${ANSI.reset}`;
    
    const consoleFn = level === LogLevel.ERROR ? console.error
                    : level === LogLevel.WARN ? console.warn
                    : console.log;

    const detailsStr = dataStr ? `${ANSI.gray}${dataStr}${ANSI.reset}` : '';
    consoleFn(`${timeStr} ${levelStr} ${moduleStr} ${message}${detailsStr}`);

  } else {
    // ─── Client-side (Browser with CSS) ─────────
    const levelStyle = STYLES[levelName.toLowerCase() as keyof typeof STYLES] || STYLES.info;
    const moduleColor = MODULE_COLORS[module] || '#6b7280';
    const moduleStyle = STYLES.badge(moduleColor);

    const consoleFn = level === LogLevel.ERROR ? console.error
                    : level === LogLevel.WARN ? console.warn
                    : level === LogLevel.DEBUG ? console.debug
                    : console.log;

    consoleFn(
      `%c${timestamp}%c %c${levelName}%c %c${module}%c ${message}%c${dataStr}`,
      STYLES.timestamp, '',
      levelStyle, '',
      moduleStyle, '',
      '', // color for message
      STYLES.dim // color for inline data
    );
  }
}

// ─── Public Logger API ────────────────────────────────────────
export function createLogger(module: string) {
  return {
    debug: (message: string, data?: any) => logMessage(LogLevel.DEBUG, module, message, data),
    info:  (message: string, data?: any) => logMessage(LogLevel.INFO, module, message, data),
    success: (message: string, data?: any) => logMessage(LogLevel.SUCCESS, module, message, data),
    warn:  (message: string, data?: any) => logMessage(LogLevel.WARN, module, message, data),
    error: (message: string, data?: any) => logMessage(LogLevel.ERROR, module, message, data),

    /** Log a group of related data */
    group: (label: string, fn: () => void) => {
      if (isServer()) {
        console.log(`\n${ANSI.bold}${ANSI.cyan}┌── ${label} ──${ANSI.reset}`);
        fn();
        console.log(`${ANSI.cyan}└${'─'.repeat(label.length + 6)}${ANSI.reset}\n`);
      } else {
        console.groupCollapsed(`%c${module}%c ${label}`, STYLES.badge(MODULE_COLORS[module] || '#6b7280'), '');
        fn();
        console.groupEnd();
      }
    },

    /** Log a data table */
    table: (data: any[], columns?: string[]) => {
      if (data.length === 0) return;
      if (columns) {
        console.table(data, columns);
      } else {
        console.table(data);
      }
    },

    /** Measure execution time */
    time: (label: string) => {
      const key = `${module}:${label}`;
      console.time(key);
      return {
        end: () => console.timeEnd(key),
      };
    },

    /** Log a divider line */
    divider: (char = '─', length = 50) => {
      if (isServer()) {
        console.log(`${ANSI.gray}${char.repeat(length)}${ANSI.reset}`);
      } else {
        console.log(`%c${char.repeat(length)}`, STYLES.dim);
      }
    },
  };
}

// ─── API Request Logger Middleware ────────────────────────────
export function logApiRequest(
  module: string,
  method: string,
  details?: Record<string, any>
): void {
  const log = createLogger(module);
  const emoji = method === 'GET' ? '📥' : method === 'POST' ? '📤' : method === 'PATCH' ? '🔧' : method === 'DELETE' ? '🗑️' : '📨';
  log.info(`${emoji} ${method} isteği alındı`, details);
}

export function logApiResponse(
  module: string,
  method: string,
  status: number,
  details?: Record<string, any>
): void {
  const log = createLogger(module);
  if (status >= 200 && status < 300) {
    log.success(`✅ ${method} → ${status} başarılı`, details);
  } else if (status >= 400 && status < 500) {
    log.warn(`⚠️ ${method} → ${status} istemci hatası`, details);
  } else {
    log.error(`❌ ${method} → ${status} sunucu hatası`, details);
  }
}

export function logApiError(
  module: string,
  method: string,
  error: any
): void {
  const log = createLogger(module);
  log.error(`❌ ${method} işlemi başarısız`, {
    message: error?.message || String(error),
    stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
  });
}

// ─── Data Inspection Utilities ────────────────────────────────
export function summarizeData(data: any): Record<string, any> {
  if (!data || typeof data !== 'object') return { type: typeof data, value: data };

  const summary: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      summary[key] = `Array(${value.length})`;
    } else if (typeof value === 'object' && value !== null) {
      summary[key] = `Object{${Object.keys(value).length} keys}`;
    } else {
      summary[key] = value;
    }
  }
  return summary;
}

// ─── Pre-built Module Loggers ─────────────────────────────────
export const apiDataLogger     = createLogger('API:Data');
export const apiLedgerLogger   = createLogger('API:Ledger');
export const apiShopsLogger    = createLogger('API:Shops');
export const apiAuthLogger     = createLogger('API:Auth');
export const pageHomeLogger    = createLogger('Page:Home');
export const pageLedgerLogger  = createLogger('Page:Ledger');
export const authLogger        = createLogger('Auth');
