module GameBoyAdvance {
    export class Main {

        static SYS_ID = 'com.endrift.gbajs';

        rom:Cart;

        cpu:ARMCore;
        mmu:MMU;
        irq:InterruptHandler;
        io:IO;
        audio:Audio;
        video:Video;
        keypad:Keypad;
        sio:SIO;

        logger = new Logger(Logger.Level.ERROR | Logger.Level.WARN);

        doStep:() => void;
        /**
         * This is rough, but the 2/3ms difference gives us a good overhead
         */
        throttle = 16;

        constructor() {
            this.cpu = new ARMCore(this);
            this.mmu = new MMU(this);
            this.irq = new InterruptHandler(this);
            this.io = new IO(this);
            this.audio = new Audio(this);
            this.video = new Video(this);
            this.keypad = new Keypad(this);
            this.sio = new SIO(this);

            this.keypad.registerHandlers();
            this.doStep = this.waitFrame;
            this.paused = false;

            this.seenFrame = false;
            this.seenSave = false;

            this.queue = null;
            this.reportFPS = null;

            (<any>window).queueFrame = (f:any) => {
                this.queue = window.setTimeout(f, this.throttle);
            };

            (<any>window).URL = (<any>window).URL || (<any>window).webkitURL;

            this.video.vblankCallback = () => {
                this.seenFrame = true;
            };
        }

        indirectCanvas:HTMLCanvasElement;
        targetCanvas:HTMLCanvasElement;
        context:CanvasRenderingContext2D;

        setCanvas(canvas:HTMLCanvasElement):void {
            this.targetCanvas = canvas;
            this.indirectCanvas = canvas;
            if (canvas.offsetWidth != 240 || canvas.offsetHeight != 160) {
                this.indirectCanvas = document.createElement("canvas");
                this.indirectCanvas.setAttribute("height", "160");
                this.indirectCanvas.setAttribute("width", "240");
                this.video.drawCallback = () => {
                    this.context.drawImage(this.indirectCanvas, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
                }
            }
            this.setCanvasDirect(this.indirectCanvas);
        }

        setCanvasDirect(canvas:any):void {
            this.context = canvas.getContext('2d');
            this.video.setBacking(this.context);
        }

        setBios(bios:any, real = false):void {
            this.mmu.loadBios(bios, real);
        }

        setRom(rom:any):boolean {
            this.reset();

            try {
                this.rom = this.mmu.loadRom(rom, true);
            } catch (error) {
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

            this.mmu.mmap(MMU.REGION_IO, <MemoryView><any>this.io);
            this.mmu.mmap(MMU.REGION_PALETTE_RAM, <MemoryView><any>this.video.renderPath.palette);
            this.mmu.mmap(MMU.REGION_VRAM, <MemoryView><any>this.video.renderPath.vram);
            this.mmu.mmap(MMU.REGION_OAM, <MemoryView><any>this.video.renderPath.oam);

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

        interval:boolean;
        reportFPS:(fps:number) => void;

        runStable():void {
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

        setSavedata(data:any):void {
            this.mmu.loadSavedata(data);
        }

        loadSavedataFromFile(saveFile:Blob):void {
            var reader = new FileReader();
            reader.onload = (e:any) => {
                this.setSavedata(e.target.result);
            };
            reader.readAsArrayBuffer(saveFile);
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
                storage[Main.SYS_ID + '.' + this.mmu.cart.code] = encodeBase64(sram.view);
            } catch (e) {
                this.logger.WARN('Could not store savedata! ' + e);
            }
        }

        retrieveSavedata():boolean {
            try {
                var storage = window.localStorage;
                var data:string = storage[Main.SYS_ID + '.' + this.mmu.cart.code];
                if (data) {
                    this.setSavedata(decodeBase64(data));
                    return true;
                }
            } catch (e) {
                this.logger.WARN('Could not retrieve savedata! ' + e);
            }
            return false;
        }

        freeze():any {
            return {
                cpu: this.cpu.freeze(),
                mmu: this.mmu.freeze(),
                audio: this.audio.freeze(),
                video: this.video.freeze(),
                irq: this.irq.freeze(),
                io: this.io.freeze()
            }
        }

        defrost(frost:{cpu:any;mmu:any;audio:any;video:any;irq:any;io:any}):void {
            this.cpu.defrost(frost.cpu);
            this.mmu.defrost(frost.mmu);
            this.audio.defrost(frost.audio);
            this.video.defrost(frost.video);
            this.irq.defrost(frost.irq);
            this.io.defrost(frost.io);
        }

    }
}