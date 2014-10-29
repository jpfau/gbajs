enum LoggerLevel {

    ERROR = 1,
    WARN = 2,
    STUB = 4,
    INFO = 8,
    DEBUG = 16

}

class Logger {

    constructor(level = ~0) {
        this.logLevel = level;
    }

    logLevel:number;

    log(level:number, error:any):void {
    }

    logStackTrace(stack:any[]) {
        var overflow = stack.length - 32;
        this.ERROR('Stack trace follows:');
        if (overflow > 0) {
            this.log(-1, '> (Too many frames)');
        }
        for (var i = Math.max(overflow, 0); i < stack.length; ++i) {
            this.log(-1, '> ' + stack[i]);
        }
    }

    ERROR(error:any) {
        if (this.logLevel & LoggerLevel.ERROR) {
            this.log(LoggerLevel.ERROR, error);
        }
    }

    WARN(warn:any) {
        if (this.logLevel & LoggerLevel.WARN) {
            this.log(LoggerLevel.WARN, warn);
        }
    }

    STUB(func:any) {
        if (this.logLevel & LoggerLevel.STUB) {
            this.log(LoggerLevel.STUB, func);
        }
    }

    INFO(info:any) {
        if (this.logLevel & LoggerLevel.INFO) {
            this.log(LoggerLevel.INFO, info);
        }
    }

    DEBUG(info:any) {
        if (this.logLevel & LoggerLevel.DEBUG) {
            this.log(LoggerLevel.DEBUG, info);
        }
    }

    static ASSERT_UNREACHED(err:any) {
        throw new Error("Should be unreached: " + err);
    }

    static ASSERT(test:boolean, err:any) {
        if (!test) {
            throw new Error("Assertion failed: " + err);
        }
    }
}