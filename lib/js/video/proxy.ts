module GameBoyAdvance.Proxy {
export class Memory {

    blocks:MemoryView[];
    blockSize:number;
    mask:number;
    size:number;

    constructor(private owner:Render, size:number, blockSize:number) {
        this.blocks = [];
        this.blockSize = blockSize;
        this.mask = (1 << blockSize) - 1;
        this.size = size;
        if (blockSize) {
            for (var i = 0; i < (size >> blockSize); ++i) {
                this.blocks.push(new DefaultMemoryView(new ArrayBuffer(1 << blockSize)));
            }
        } else {
            this.blockSize = 31;
            this.mask = -1;
            this.blocks[0] = new DefaultMemoryView(new ArrayBuffer(size));
        }
    }

    combine() {
        if (this.blocks.length > 1) {
            var combined = new Uint8Array(this.size);
            for (var i = 0; i < this.blocks.length; ++i) {
                combined.set(new Uint8Array(this.blocks[i].buffer), i << this.blockSize);
            }
            return combined.buffer;
        } else {
            return this.blocks[0].buffer;
        }
    }

    replaceData(buffer:any) {
        for (var i = 0; i < this.blocks.length; ++i) {
            this.blocks[i] = new DefaultMemoryView(buffer.slice(i << this.blockSize, (i << this.blockSize) + this.blocks[i].buffer.byteLength));
        }
    }

    load8(offset:number) {
        return this.blocks[offset >> this.blockSize].load8(offset & this.mask);
    }

    load16(offset:number) {
        return this.blocks[offset >> this.blockSize].load16(offset & this.mask);
    }

    loadU8(offset:number) {
        return this.blocks[offset >> this.blockSize].loadU8(offset & this.mask);
    }

    loadU16(offset:number) {
        return this.blocks[offset >> this.blockSize].loadU16(offset & this.mask);
    }

    load32(offset:number) {
        return this.blocks[offset >> this.blockSize].load32(offset & this.mask);
    }

    store8(offset:number, value:number) {
        if (offset >= this.size) {
            return;
        }
        this.owner.memoryDirtied(this, offset >> this.blockSize);
        this.blocks[offset >> this.blockSize].store8(offset & this.mask, value);
        this.blocks[offset >> this.blockSize].store8((offset & this.mask) ^ 1, value);
    }

    store16(offset:number, value:number) {
        if (offset >= this.size) {
            return;
        }
        this.owner.memoryDirtied(this, offset >> this.blockSize);
        return this.blocks[offset >> this.blockSize].store16(offset & this.mask, value);
    }

    store32(offset:number, value:number) {
        if (offset >= this.size) {
            return;
        }
        this.owner.memoryDirtied(this, offset >> this.blockSize);
        return this.blocks[offset >> this.blockSize].store32(offset & this.mask, value);
    }

    invalidatePage(address:number) {
    }

}

export class Render {

    worker:Worker;
    currentFrame:number;
    delay:number;
    skipFrame:boolean;
    dirty:any;
    backing:any;
    caller:{finishDraw:{(pixelData:ImageData):void}};
    palette:Memory;
    oam:Memory;
    vram:Memory;
    scanlineQueue:any[];

    constructor() {
        this.worker = new Worker('js/video/worker.js');

        this.currentFrame = 0;
        this.delay = 0;
        this.skipFrame = false;

        this.dirty = null;
        var self = this;
        var handlers:any = {
            finish: function (data:any) {
                self.backing = data.backing;
                self.caller.finishDraw(self.backing);
                --self.delay;
            }
        };
        this.worker.onmessage = function (message:any) {
            handlers[message.data['type']](message.data);
        }
    }

    memoryDirtied(mem:Memory, block:any):void {
        this.dirty = this.dirty || {};
        this.dirty.memory = this.dirty.memory || {};
        if (mem === this.palette) {
            this.dirty.memory.palette = mem.blocks[0].buffer;
        }
        if (mem === this.oam) {
            this.dirty.memory.oam = mem.blocks[0].buffer;
        }
        if (mem === this.vram) {
            this.dirty.memory.vram = this.dirty.memory.vram || [];
            this.dirty.memory.vram[block] = mem.blocks[block].buffer;
        }
    }

    clear():void {
        var mmu = MMU;
        this.palette = new Memory(this, mmu.SIZE_PALETTE_RAM, 0);
        this.vram = new Memory(this, mmu.SIZE_VRAM, 13);
        this.oam = new Memory(this, mmu.SIZE_OAM, 0);

        this.dirty = null;
        this.scanlineQueue = [];

        this.worker.postMessage({ type: 'clear', SIZE_VRAM: mmu.SIZE_VRAM, SIZE_OAM: mmu.SIZE_OAM });
    }

    freeze():any {
        return {
            'palette': Serializer.prefix(this.palette.combine()),
            'vram': Serializer.prefix(this.vram.combine()),
            'oam': Serializer.prefix(this.oam.combine())
        };
    }

    defrost(frost:any) {
        this.palette.replaceData(frost.palette);
        this.memoryDirtied(this.palette, 0);
        this.vram.replaceData(frost.vram);
        for (var i = 0; i < this.vram.blocks.length; ++i) {
            this.memoryDirtied(this.vram, i);
        }
        this.oam.replaceData(frost.oam);
        this.memoryDirtied(this.oam, 0);
    }

    writeDisplayControl(value:any) {
        this.dirty = this.dirty || {};
        this.dirty.DISPCNT = value;
    }

    writeBackgroundControl(bg:any, value:any) {
        this.dirty = this.dirty || {};
        this.dirty.BGCNT = this.dirty.BGCNT || [];
        this.dirty.BGCNT[bg] = value;
    }

    writeBackgroundHOffset(bg:any, value:any) {
        this.dirty = this.dirty || {};
        this.dirty.BGHOFS = this.dirty.BGHOFS || [];
        this.dirty.BGHOFS[bg] = value;
    }

    writeBackgroundVOffset(bg:any, value:any) {
        this.dirty = this.dirty || {};
        this.dirty.BGVOFS = this.dirty.BGVOFS || [];
        this.dirty.BGVOFS[bg] = value;
    }

    writeBackgroundRefX(bg:any, value:any) {
        this.dirty = this.dirty || {};
        this.dirty.BGX = this.dirty.BGX || [];
        this.dirty.BGX[bg] = value;
    }

    writeBackgroundRefY(bg:any, value:any) {
        this.dirty = this.dirty || {};
        this.dirty.BGY = this.dirty.BGY || [];
        this.dirty.BGY[bg] = value;
    }

    writeBackgroundParamA(bg:any, value:any) {
        this.dirty = this.dirty || {};
        this.dirty.BGPA = this.dirty.BGPA || [];
        this.dirty.BGPA[bg] = value;
    }

    writeBackgroundParamB(bg:any, value:any) {
        this.dirty = this.dirty || {};
        this.dirty.BGPB = this.dirty.BGPB || [];
        this.dirty.BGPB[bg] = value;
    }

    writeBackgroundParamC(bg:any, value:any) {
        this.dirty = this.dirty || {};
        this.dirty.BGPC = this.dirty.BGPC || [];
        this.dirty.BGPC[bg] = value;
    }

    writeBackgroundParamD(bg:any, value:any) {
        this.dirty = this.dirty || {};
        this.dirty.BGPD = this.dirty.BGPD || [];
        this.dirty.BGPD[bg] = value;
    }

    writeWin0H(value:any) {
        this.dirty = this.dirty || {};
        this.dirty.WIN0H = value;
    }

    writeWin1H(value:any) {
        this.dirty = this.dirty || {};
        this.dirty.WIN1H = value;
    }

    writeWin0V(value:any) {
        this.dirty = this.dirty || {};
        this.dirty.WIN0V = value;
    }

    writeWin1V(value:any) {
        this.dirty = this.dirty || {};
        this.dirty.WIN1V = value;
    }

    writeWinIn(value:any) {
        this.dirty = this.dirty || {};
        this.dirty.WININ = value;
    }

    writeWinOut(value:any) {
        this.dirty = this.dirty || {};
        this.dirty.WINOUT = value;
    }

    writeBlendControl(value:any) {
        this.dirty = this.dirty || {};
        this.dirty.BLDCNT = value;
    }

    writeBlendAlpha(value:any) {
        this.dirty = this.dirty || {};
        this.dirty.BLDALPHA = value;
    }

    writeBlendY(value:any) {
        this.dirty = this.dirty || {};
        this.dirty.BLDY = value;
    }

    writeMosaic(value:any) {
        this.dirty = this.dirty || {};
        this.dirty.MOSAIC = value;
    }

    clearSubsets(mmu:MMU, regions:number) {
        this.dirty = this.dirty || {};
        if (regions & 0x04) {
            this.palette = new Memory(this, MMU.SIZE_PALETTE_RAM, 0);
            mmu.mmap(MMU.REGION_PALETTE_RAM, <any>this.palette);
            this.memoryDirtied(this.palette, 0);
        }
        if (regions & 0x08) {
            this.vram = new Memory(this, MMU.SIZE_VRAM, 13);
            mmu.mmap(MMU.REGION_VRAM, <any>this.vram);
            for (var i = 0; i < this.vram.blocks.length; ++i) {
                this.memoryDirtied(this.vram, i);
            }
        }
        if (regions & 0x10) {
            this.oam = new Memory(this, MMU.SIZE_OAM, 0);
            mmu.mmap(MMU.REGION_OAM, <any>this.oam);
            this.memoryDirtied(this.oam, 0);
        }
    }

    setBacking(backing:any) {
        this.backing = backing;
        this.worker.postMessage({ type: 'start', backing: this.backing });
    }

    drawScanline(y:number) {
        if (!this.skipFrame) {
            if (this.dirty) {
                if (this.dirty.memory) {
                    if (this.dirty.memory.palette) {
                        this.dirty.memory.palette = this.dirty.memory.palette.slice(0);
                    }
                    if (this.dirty.memory.oam) {
                        this.dirty.memory.oam = this.dirty.memory.oam.slice(0);
                    }
                    if (this.dirty.memory.vram) {
                        for (var i = 0; i < 12; ++i) {
                            if (this.dirty.memory.vram[i]) {
                                this.dirty.memory.vram[i] = this.dirty.memory.vram[i].slice(0);
                            }
                        }
                    }
                }
                this.scanlineQueue.push({ y: y, dirty: this.dirty });
                this.dirty = null;
            }
        }
    }

    startDraw() {
        ++this.currentFrame;
        if (this.delay <= 0) {
            this.skipFrame = false;
        }
        if (!this.skipFrame) {
            ++this.delay;
        }
    }

    finishDraw(caller:any) {
        this.caller = caller;
        if (!this.skipFrame) {
            this.worker.postMessage({ type: 'finish', scanlines: this.scanlineQueue, frame: this.currentFrame });
            this.scanlineQueue = [];
            if (this.delay > 2) {
                this.skipFrame = true;
            }
        }
    }
}
}