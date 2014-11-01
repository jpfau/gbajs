class Logger {

    constructor(public logLevel = ~0) {
    }

    log(level:number, error:any):void {
    }

    logStackTrace(stack:any[]):void {
        var overflow = stack.length - 32;
        this.ERROR('Stack trace follows:');
        if (overflow > 0) {
            this.log(-1, '> (Too many frames)');
        }
        for (var i = Math.max(overflow, 0); i < stack.length; ++i) {
            this.log(-1, '> ' + stack[i]);
        }
    }

    ERROR(error:any):void {
        if (this.logLevel & Logger.Level.ERROR) {
            this.log(Logger.Level.ERROR, error);
        }
    }

    WARN(warn:any):void {
        if (this.logLevel & Logger.Level.WARN) {
            this.log(Logger.Level.WARN, warn);
        }
    }

    STUB(func:any):void {
        if (this.logLevel & Logger.Level.STUB) {
            this.log(Logger.Level.STUB, func);
        }
    }

    INFO(info:any):void {
        if (this.logLevel & Logger.Level.INFO) {
            this.log(Logger.Level.INFO, info);
        }
    }

    DEBUG(info:any):void {
        if (this.logLevel & Logger.Level.DEBUG) {
            this.log(Logger.Level.DEBUG, info);
        }
    }

    static ASSERT_UNREACHED(err:any):void {
        throw new Error("Should be unreached: " + err);
    }

    static ASSERT(test:boolean, err:any):void {
        if (!test) {
            throw new Error("Assertion failed: " + err);
        }
    }
}

module Logger {
    export enum Level {

        ERROR = 1,
        WARN = 2,
        STUB = 4,
        INFO = 8,
        DEBUG = 16

    }
}