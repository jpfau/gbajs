/// <reference path="core.ts"/>
/// <reference path="mmu.ts"/>
/// <reference path="irq.ts"/>
/// <reference path="io.ts"/>
/// <reference path="audio.ts"/>
/// <reference path="video.ts"/>
/// <reference path="keypad.ts"/>
/// <reference path="sio.ts"/>
/// <reference path="log.ts"/>

class GameBoyAdvance {

    SYS_ID = 'com.endrift.gbajs';

    rom:{
        title: any;
        code: any;
        maker: any;
        memory: any;
        saveType: any;
    };

    cpu = new ARMCore();
    mmu = new GameBoyAdvanceMMU();
    irq = new GameBoyAdvanceInterruptHandler();
    io = new GameBoyAdvanceIO();
    audio = new GameBoyAdvanceAudio();
    video = new GameBoyAdvanceVideo();
    keypad = new GameBoyAdvanceKeypad();
    sio = new GameBoyAdvanceSIO();

    logger = new Logger(LoggerLevel.ERROR | LoggerLevel.WARN);

    doStep:() => void;
    /**
     * This is rough, but the 2/3ms difference gives us a good overhead
     */
    throttle = 16;

    constructor() {
        // TODO: simplify this graph
        this.cpu.mmu = this.mmu;
        this.cpu.irq = this.irq;

        this.mmu.cpu = this.cpu;
        this.mmu.core = this;

        this.irq.cpu = this.cpu;
        this.irq.io = this.io;
        this.irq.audio = this.audio;
        this.irq.video = this.video;
        this.irq.gba = this;

        this.io.cpu = this.cpu;
        this.io.audio = this.audio;
        this.io.video = this.video;
        this.io.keypad = this.keypad;
        this.io.sio = this.sio;
        this.io.gba = this;

        this.audio.cpu = this.cpu;
        this.audio.core = this;

        this.video.cpu = this.cpu;
        this.video.core = this;

        this.keypad.core = this;

        this.sio.gba = this;

        this.keypad.registerHandlers();
        this.doStep = this.waitFrame;
        this.paused = false;

        this.seenFrame = false;
        this.seenSave = false;

        this.queue = null;
        this.reportFPS = null;

        (<any>window).queueFrame = (f) => {
            this.queue = window.setTimeout(f, this.throttle);
        };

        (<any>window).URL = (<any>window).URL || (<any>window).webkitURL;

        this.video.vblankCallback = () => {
            this.seenFrame = true;
        };
    }

    indirectCanvas:HTMLElement;
    targetCanvas;
    context;

    setCanvas(canvas):void {
        if (canvas.offsetWidth != 240 || canvas.offsetHeight != 160) {
            this.indirectCanvas = document.createElement("canvas");
            this.indirectCanvas.setAttribute("height", "160");
            this.indirectCanvas.setAttribute("width", "240");
            this.targetCanvas = canvas;
            this.setCanvasDirect(this.indirectCanvas);
            var targetContext = canvas.getContext('2d');
            this.video.drawCallback = () => {
                targetContext.drawImage(this.indirectCanvas, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
            }
        } else {
            this.setCanvasDirect(canvas);
        }
    }

    setCanvasDirect(canvas):void {
        this.context = canvas.getContext('2d');
        this.video.setBacking(this.context);
    }

    setBios(bios, real=false):void {
        this.mmu.loadBios(bios, real);
    }

    setRom(rom):boolean {
        this.reset();

        this.rom = this.mmu.loadRom(rom, true);
        if (!this.rom) {
            return false;
        }
        this.retrieveSavedata();
        return true;
    }

    hasRom():boolean {
        return !!this.rom;
    }

    loadRomFromFile(romFile:Blob, callback:(result:boolean) => void) {
        var reader = new FileReader();
        reader.onload = (e:any) => {
            var result = this.setRom(e.target.result);
            if (callback) {
                callback(result);
            }
        };
        reader.readAsArrayBuffer(romFile);
    }

    reset():void {
        this.audio.pause(true);

        this.mmu.clear();
        this.io.clear();
        this.audio.clear();
        this.video.clear();
        this.sio.clear();

        this.mmu.mmap(this.mmu.REGION_IO, this.io);
        this.mmu.mmap(this.mmu.REGION_PALETTE_RAM, this.video.renderPath.palette);
        this.mmu.mmap(this.mmu.REGION_VRAM, this.video.renderPath.vram);
        this.mmu.mmap(this.mmu.REGION_OAM, this.video.renderPath.oam);

        this.cpu.resetCPU(0);
    }

    step():void {
        while (this.doStep()) {
            this.cpu.step();
        }
    }

    seenFrame:boolean;

    waitFrame():boolean {
        var seen = this.seenFrame;
        this.seenFrame = false;
        return !seen;
    }

    paused:boolean;
    queue:any;

    pause():void {
        this.paused = true;
        this.audio.pause(true);
        if (this.queue) {
            clearTimeout(this.queue);
            this.queue = null;
        }
    }

    seenSave:boolean;

    advanceFrame():void {
        this.step();
        if (this.seenSave) {
            if (!this.mmu.saveNeedsFlush()) {
                this.storeSavedata();
                this.seenSave = false;
            } else {
                this.mmu.flushSave();
            }
        } else if (this.mmu.saveNeedsFlush()) {
            this.seenSave = true;
            this.mmu.flushSave();
        }
    }

    interval;
    reportFPS:(fps:number) => void;

    runStable() {
        if (this.interval) {
            return; // Already running
        }
        var timer = 0;
        var frames = 0;
        var runFunc:() => void;
        var start = Date.now();
        this.paused = false;
        this.audio.pause(false);

        if (this.reportFPS) {
            runFunc = () => {
                try {
                    timer += Date.now() - start;
                    if (this.paused) {
                        return;
                    } else {
                        (<any>window).queueFrame(runFunc);
                    }
                    start = Date.now();
                    this.advanceFrame();
                    ++frames;
                    if (frames == 60) {
                        this.reportFPS((frames * 1000) / timer);
                        frames = 0;
                        timer = 0;
                    }
                } catch (exception) {
                    this.logger.ERROR(exception);
                    if (exception.stack) {
                        this.logger.logStackTrace(exception.stack.split('\n'));
                    }
                    throw exception;
                }
            };
        } else {
            runFunc = () => {
                try {
                    if (this.paused) {
                        return;
                    } else {
                        (<any>window).queueFrame(runFunc);
                    }
                    this.advanceFrame();
                } catch (exception) {
                    this.logger.ERROR(exception);
                    if (exception.stack) {
                        this.logger.logStackTrace(exception.stack.split('\n'));
                    }
                    throw exception;
                }
            };
        }
        (<any>window).queueFrame(runFunc);
    }

    setSavedata(data):void {
        this.mmu.loadSavedata(data);
    }

    loadSavedataFromFile(saveFile:Blob):void {
        var reader = new FileReader();
        reader.onload = (e:any) => {
            this.setSavedata(e.target.result);
        };
        reader.readAsArrayBuffer(saveFile);
    }

    decodeSavedata(string:string) {
        this.setSavedata(decodeBase64(string));
    }

    downloadSavedata():void {
        var sram = this.mmu.save;
        if (!sram) {
            this.logger.WARN("No save data available");
            return;
        }
        if ((<any>window).URL) {
            var url = (<any>window).URL.createObjectURL(new Blob([sram.buffer], { type: 'application/octet-stream' }));
            window.open(url);
        } else {
            var data = encodeBase64(sram.view);
            window.open('data:application/octet-stream;base64,' + data, this.rom.code + '.sav');
        }
    }

    storeSavedata():void {
        var sram = this.mmu.save;
        try {
            var storage = window.localStorage;
            storage[this.SYS_ID + '.' + this.mmu.cart.code] = encodeBase64(sram.view);
        } catch (e) {
            this.logger.WARN('Could not store savedata! ' + e);
        }
    }

    retrieveSavedata():boolean {
        try {
            var storage = window.localStorage;
            var data = storage[this.SYS_ID + '.' + this.mmu.cart.code];
            if (data) {
                this.decodeSavedata(data);
                return true;
            }
        } catch (e) {
            this.logger.WARN('Could not retrieve savedata! ' + e);
        }
        return false;
    }

    freeze() {
        return {
            cpu: this.cpu.freeze(),
            mmu: this.mmu.freeze(),
            irq: this.irq.freeze(),
            io: this.io.freeze(),
            audio: this.audio.freeze(),
            video: this.video.freeze()
        }
    }

    defrost(frost):void {
        this.cpu.defrost(frost.cpu);
        this.mmu.defrost(frost.mmu);
        this.audio.defrost(frost.audio);
        this.video.defrost(frost.video);
        this.irq.defrost(frost.irq);
        this.io.defrost(frost.io);
    }

}