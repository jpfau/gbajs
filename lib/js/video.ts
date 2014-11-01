module GameBoyAdvance {
export class Video {
    renderPath = new SoftwareRenderer();

    static CYCLES_PER_PIXEL = 4;

    static HORIZONTAL_PIXELS = 240;
    static HBLANK_PIXELS = 68;
    static HDRAW_LENGTH = 1006;
    static HBLANK_LENGTH = 226;
    static HORIZONTAL_LENGTH = 1232;

    static VERTICAL_PIXELS = 160;
    static VBLANK_PIXELS = 68;
    static VERTICAL_TOTAL_PIXELS = 228;

    static TOTAL_LENGTH = 280896;

    drawCallback():void {
    }

    vblankCallback():void {
    }

    constructor(private gba:Main) {
    }

    static DISPSTAT_MASK = 0xFF38;
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
        this.nextHblank = Video.HDRAW_LENGTH;
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
        var pixelData = backing.createImageData(Video.HORIZONTAL_PIXELS, Video.VERTICAL_PIXELS);
        this.context = backing;

        // Clear backing first
        for (var offset = 0; offset < Video.HORIZONTAL_PIXELS * Video.VERTICAL_PIXELS * 4; offset++) {
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
                    case Video.VERTICAL_PIXELS:
                        this.inVblank = true;
                        this.renderPath.finishDraw(this);
                        this.nextVblankIRQ = this.nextEvent + Video.TOTAL_LENGTH;
                        this.gba.mmu.runVblankDmas();
                        if (this.vblankIRQ) {
                            this.gba.irq.raiseIRQ(InterruptHandler.IRQ_VBLANK);
                        }
                        this.vblankCallback();
                        break;
                    case Video.VERTICAL_TOTAL_PIXELS - 1:
                        this.inVblank = false;
                        break;
                    case Video.VERTICAL_TOTAL_PIXELS:
                        this.vcount = 0;
                        this.renderPath.startDraw();
                        break;
                }

                this.vcounter = <number><any>(this.vcount == this.vcountSetting);
                if (this.vcounter && this.vcounterIRQ) {
                    this.gba.irq.raiseIRQ(InterruptHandler.IRQ_VCOUNTER);
                    this.nextVcounterIRQ += Video.TOTAL_LENGTH;
                }

                if (this.vcount < Video.VERTICAL_PIXELS) {
                    this.renderPath.drawScanline(this.vcount);
                }
            } else {
                // Begin Hblank
                this.inHblank = true;
                this.lastHblank = this.nextHblank;
                this.nextEvent = this.lastHblank + Video.HBLANK_LENGTH;
                this.nextHblank = this.nextEvent + Video.HDRAW_LENGTH;
                this.nextHblankIRQ = this.nextHblank;

                if (this.vcount < Video.VERTICAL_PIXELS) {
                    this.gba.mmu.runHblankDmas();
                }
                if (this.hblankIRQ) {
                    this.gba.irq.raiseIRQ(InterruptHandler.IRQ_HBLANK);
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
            this.nextVcounterIRQ = this.nextHblank + Video.HBLANK_LENGTH + (this.vcountSetting - this.vcount) * Video.HORIZONTAL_LENGTH;
            if (this.nextVcounterIRQ < this.nextEvent) {
                this.nextVcounterIRQ += Video.TOTAL_LENGTH;
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
}