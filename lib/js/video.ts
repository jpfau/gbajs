/// <reference path="gba.ts"/>
/// <reference path="video/software.ts"/>

class GameBoyAdvanceVideo {
    renderPath = new GameBoyAdvanceSoftwareRenderer();

    CYCLES_PER_PIXEL = 4;

    HORIZONTAL_PIXELS = 240;
    HBLANK_PIXELS = 68;
    static HDRAW_LENGTH = 1006;
    HBLANK_LENGTH = 226;
    HORIZONTAL_LENGTH = 1232;

    VERTICAL_PIXELS = 160;
    VBLANK_PIXELS = 68;
    VERTICAL_TOTAL_PIXELS = 228;

    TOTAL_LENGTH = 280896;

    drawCallback:() => void;
    vblankCallback:() => void;

    gba:GameBoyAdvance;

    get cpu() {
        return this.gba.cpu;
    }

    constructor(gba:GameBoyAdvance) {
        this.gba = gba;
    }

    DISPSTAT_MASK:number;
    inHblank:boolean;
    inVblank:boolean;
    vcounter:number;
    vblankIRQ:number;
    hblankIRQ:number;
    vcounterIRQ:number;
    vcountSetting:number;

    vcount:number;

    lastHblank:number;
    nextHblank:number;
    nextEvent:number;

    nextHblankIRQ:number;
    nextVblankIRQ:number;
    nextVcounterIRQ:number;

    clear():void {
        this.renderPath.clear();

        // DISPSTAT
        this.DISPSTAT_MASK = 0xFF38;
        this.inHblank = false;
        this.inVblank = false;
        this.vcounter = 0;
        this.vblankIRQ = 0;
        this.hblankIRQ = 0;
        this.vcounterIRQ = 0;
        this.vcountSetting = 0;

        // VCOUNT
        this.vcount = -1;

        this.lastHblank = 0;
        this.nextHblank = GameBoyAdvanceVideo.HDRAW_LENGTH;
        this.nextEvent = this.nextHblank;

        this.nextHblankIRQ = 0;
        this.nextVblankIRQ = 0;
        this.nextVcounterIRQ = 0;
    }

    freeze() {
        return {
            'inHblank': this.inHblank,
            'inVblank': this.inVblank,
            'vcounter': this.vcounter,
            'vblankIRQ': this.vblankIRQ,
            'hblankIRQ': this.hblankIRQ,
            'vcounterIRQ': this.vcounterIRQ,
            'vcountSetting': this.vcountSetting,
            'vcount': this.vcount,
            'lastHblank': this.lastHblank,
            'nextHblank': this.nextHblank,
            'nextEvent': this.nextEvent,
            'nextHblankIRQ': this.nextHblankIRQ,
            'nextVblankIRQ': this.nextVblankIRQ,
            'nextVcounterIRQ': this.nextVcounterIRQ,
            'renderPath': this.renderPath.freeze(encodeBase64)
        };
    }

    defrost(frost:any):void {
        this.inHblank = frost.inHblank;
        this.inVblank = frost.inVblank;
        this.vcounter = frost.vcounter;
        this.vblankIRQ = frost.vblankIRQ;
        this.hblankIRQ = frost.hblankIRQ;
        this.vcounterIRQ = frost.vcounterIRQ;
        this.vcountSetting = frost.vcountSetting;
        this.vcount = frost.vcount;
        this.lastHblank = frost.lastHblank;
        this.nextHblank = frost.nextHblank;
        this.nextEvent = frost.nextEvent;
        this.nextHblankIRQ = frost.nextHblankIRQ;
        this.nextVblankIRQ = frost.nextVblankIRQ;
        this.nextVcounterIRQ = frost.nextVcounterIRQ;
        this.renderPath.defrost(frost.renderPath, decodeBase64);
    }

    context:CanvasRenderingContext2D;

    setBacking(backing:CanvasRenderingContext2D):void {
        var pixelData = backing.createImageData(this.HORIZONTAL_PIXELS, this.VERTICAL_PIXELS);
        this.context = backing;

        // Clear backing first
        for (var offset = 0; offset < this.HORIZONTAL_PIXELS * this.VERTICAL_PIXELS * 4; offset++) {
            pixelData.data[offset + 0] = 0xFF;
            pixelData.data[offset + 1] = 0xFF;
            pixelData.data[offset + 2] = 0xFF;
            pixelData.data[offset + 3] = 0xFF;
        }

        this.renderPath.setBacking(pixelData);
    }

    updateTimers(cpu:ARMCore):void {
        var cycles = cpu.cycles;

        if (this.nextEvent <= cycles) {
            if (this.inHblank) {
                // End Hblank
                this.inHblank = false;
                this.nextEvent = this.nextHblank;

                ++this.vcount;

                switch (this.vcount) {
                    case this.VERTICAL_PIXELS:
                        this.inVblank = true;
                        this.renderPath.finishDraw(this);
                        this.nextVblankIRQ = this.nextEvent + this.TOTAL_LENGTH;
                        this.cpu.mmu.runVblankDmas();
                        if (this.vblankIRQ) {
                            this.cpu.irq.raiseIRQ(this.cpu.irq.IRQ_VBLANK);
                        }
                        this.vblankCallback();
                        break;
                    case this.VERTICAL_TOTAL_PIXELS - 1:
                        this.inVblank = false;
                        break;
                    case this.VERTICAL_TOTAL_PIXELS:
                        this.vcount = 0;
                        this.renderPath.startDraw();
                        break;
                }

                this.vcounter = <number><any>(this.vcount == this.vcountSetting);
                if (this.vcounter && this.vcounterIRQ) {
                    this.cpu.irq.raiseIRQ(this.cpu.irq.IRQ_VCOUNTER);
                    this.nextVcounterIRQ += this.TOTAL_LENGTH;
                }

                if (this.vcount < this.VERTICAL_PIXELS) {
                    this.renderPath.drawScanline(this.vcount);
                }
            } else {
                // Begin Hblank
                this.inHblank = true;
                this.lastHblank = this.nextHblank;
                this.nextEvent = this.lastHblank + this.HBLANK_LENGTH;
                this.nextHblank = this.nextEvent + GameBoyAdvanceVideo.HDRAW_LENGTH;
                this.nextHblankIRQ = this.nextHblank;

                if (this.vcount < this.VERTICAL_PIXELS) {
                    this.cpu.mmu.runHblankDmas();
                }
                if (this.hblankIRQ) {
                    this.cpu.irq.raiseIRQ(this.cpu.irq.IRQ_HBLANK);
                }
            }
        }
    }

    writeDisplayStat(value:number):void {
        this.vblankIRQ = value & 0x0008;
        this.hblankIRQ = value & 0x0010;
        this.vcounterIRQ = value & 0x0020;
        this.vcountSetting = (value & 0xFF00) >> 8;

        if (this.vcounterIRQ) {
            // FIXME: this can be too late if we're in the middle of an Hblank
            this.nextVcounterIRQ = this.nextHblank + this.HBLANK_LENGTH + (this.vcountSetting - this.vcount) * this.HORIZONTAL_LENGTH;
            if (this.nextVcounterIRQ < this.nextEvent) {
                this.nextVcounterIRQ += this.TOTAL_LENGTH;
            }
        }
    }

    readDisplayStat() {
        return (<number><any>this.inVblank) | (<number><any>this.inHblank << 1) | (this.vcounter << 2);
    }

    finishDraw(pixelData:ImageData):void {
        this.context.putImageData(pixelData, 0, 0);
        this.drawCallback();
    }

    scheduleVCaptureDma(dma:DMA, info:DMA):void {
        this.gba.logger.STUB('Unimplemented DMA: Video Capture Mode ');
    }

}