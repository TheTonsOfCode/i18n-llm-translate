// Simple color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
} as const;

export interface Logger {
    log(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    success(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    verbose(message: string, ...args: any[]): void;
    
    // Engine-specific logging with prefixes
    engineLog(engineName: string, message: string, ...args: any[]): void;
    engineDebug(engineName: string, message: string, ...args: any[]): void;
    engineVerbose(engineName: string, message: string, ...args: any[]): void;
    
    // Configuration methods
    setDebug?(debug: boolean): void;
    setVerbose?(verbose: boolean): void;
}

export interface LoggerOptions {
    debug?: boolean;
    verbose?: boolean;
    prefix?: string;
    enableColors?: boolean;
}

export class DefaultLogger implements Logger {
    private options: Required<LoggerOptions>;

    constructor(options: LoggerOptions = {}) {
        this.options = {
            debug: options.debug ?? false,
            verbose: options.verbose ?? false,
            prefix: options.prefix ?? '🌐 i18n-translate',
            enableColors: options.enableColors ?? true
        };
    }

    private formatMessage(level: string, message: string, color?: string): string {
        const timestamp = new Date().toLocaleTimeString('pl-PL', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        const prefix = this.options.enableColors 
            ? `${colors.cyan}${colors.bright}${this.options.prefix}${colors.reset}`
            : this.options.prefix;
            
        const levelFormatted = this.options.enableColors && color
            ? `${color}${colors.bright}[${level}]${colors.reset}`
            : `[${level}]`;
            
        const timeFormatted = this.options.enableColors
            ? `${colors.gray}[${timestamp}]${colors.reset}`
            : `[${timestamp}]`;
            
        return `${prefix} ${timeFormatted} ${levelFormatted} ${message}`;
    }

    private formatEngineMessage(engineName: string, level: string, message: string, color?: string): string {
        const timestamp = new Date().toLocaleTimeString('pl-PL', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        const prefix = this.options.enableColors 
            ? `${colors.cyan}${colors.bright}${this.options.prefix}${colors.reset}`
            : this.options.prefix;
            
        const engineFormatted = this.options.enableColors
            ? `${colors.magenta}${colors.bright}[${engineName}]${colors.reset}`
            : `[${engineName}]`;
            
        const levelFormatted = this.options.enableColors && color
            ? `${color}${colors.bright}[${level}]${colors.reset}`
            : `[${level}]`;
            
        const timeFormatted = this.options.enableColors
            ? `${colors.gray}[${timestamp}]${colors.reset}`
            : `[${timestamp}]`;
            
        return `${prefix} ${timeFormatted} ${engineFormatted} ${levelFormatted} ${message}`;
    }

    log(message: string, ...args: any[]): void {
        console.log(this.formatMessage('INFO', message, colors.blue), ...args);
    }

    info(message: string, ...args: any[]): void {
        console.log(this.formatMessage('INFO', message, colors.blue), ...args);
    }

    warn(message: string, ...args: any[]): void {
        console.log(this.formatMessage('WARN', message, colors.yellow), ...args);
    }

    error(message: string, ...args: any[]): void {
        console.log(this.formatMessage('ERROR', message, colors.red), ...args);
    }

    success(message: string, ...args: any[]): void {
        console.log(this.formatMessage('SUCCESS', message, colors.green), ...args);
    }

    debug(message: string, ...args: any[]): void {
        if (this.options.debug) {
            console.log(this.formatMessage('DEBUG', message, colors.gray), ...args);
        }
    }

    verbose(message: string, ...args: any[]): void {
        if (this.options.verbose) {
            console.log(this.formatMessage('VERBOSE', message, colors.cyan), ...args);
        }
    }

    engineLog(engineName: string, message: string, ...args: any[]): void {
        console.log(this.formatEngineMessage(engineName, 'INFO', message, colors.blue), ...args);
    }

    engineDebug(engineName: string, message: string, ...args: any[]): void {
        if (this.options.debug) {
            console.log(this.formatEngineMessage(engineName, 'DEBUG', message, colors.gray), ...args);
        }
    }

    engineVerbose(engineName: string, message: string, ...args: any[]): void {
        if (this.options.verbose) {
            console.log(this.formatEngineMessage(engineName, 'VERBOSE', message, colors.cyan), ...args);
        }
    }

    // Methods to update options
    setDebug(debug: boolean): void {
        this.options.debug = debug;
    }

    setVerbose(verbose: boolean): void {
        this.options.verbose = verbose;
    }
}

// Default logger instance that can be overridden
export const defaultLogger = new DefaultLogger({
    debug: false,
    verbose: false,
    prefix: '🌐 Translate',
    enableColors: true
});