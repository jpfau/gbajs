class Cart {
    title:string;
    code:string;
    maker:string;
    memory:any; // Unused?
    saveType:string;

    constructor(memory:any) {
        this.memory = memory;
    }
}

interface Page {
    thumb:any[]
    arm:any[]
    invalid:boolean
}

interface MemoryIO {

    load8(offset:number):number;

    load16(offset:number):number;

    loadU8(offset:number):number;

    loadU16(offset:number):number;

    load32(offset:number):number;

    store8(offset:number, value:number):void;

    store16(offset:number, value:number):void;

    store32(offset:number, value:number):void;

}

interface MemoryView extends MemoryIO {

    buffer:any;
    icache:Page[];
    ICACHE_PAGE_BITS:number;
    PAGE_MASK:number;
    view:DataView;
    mask:number;
    mask8:number;
    mask16:number;
    mask32:number;
    writePending:boolean;

    invalidatePage(address:number):void;

    replaceData(memory:any, offset:number):void;
}

class DefaultMemoryView implements MemoryView {

    buffer:any;
    icache:Page[];
    ICACHE_PAGE_BITS:number;
    PAGE_MASK:number;
    view:DataView;
    mask:number;
    mask8:number;
    mask16:number;
    mask32:number;
    writePending = false;

    constructor(memory:any, offset = 0) {
        this.buffer = memory;
        this.view = new DataView(this.buffer, offset);
        this.mask = memory.byteLength - 1;
        this.resetMask();
    }

    resetMask():void {
        this.mask8 = this.mask & 0xFFFFFFFF;
        this.mask16 = this.mask & 0xFFFFFFFE;
        this.mask32 = this.mask & 0xFFFFFFFC;
    }

    load8(offset:number):number {
        return this.view.getInt8(offset & this.mask8);
    }

    load16(offset:number):number {
        // Unaligned 16-bit loads are unpredictable...let's just pretend they work
        return this.view.getInt16(offset & this.mask, true);
    }

    loadU8(offset:number):number {
        return this.view.getUint8(offset & this.mask8);
    }

    loadU16(offset:number):number {
        // Unaligned 16-bit loads are unpredictable...let's just pretend they work
        return this.view.getUint16(offset & this.mask, true);
    }

    load32(offset:number):number {
        // Unaligned 32-bit loads are "rotated" so they make some semblance of sense
        var rotate = (offset & 3) << 3;
        var mem = this.view.getInt32(offset & this.mask32, true);
        return (mem >>> rotate) | (mem << (32 - rotate));
    }

    store8(offset:number, value:number):void {
        this.view.setInt8(offset & this.mask8, value);
    }

    store16(offset:number, value:number):void {
        this.view.setInt16(offset & this.mask16, value, true);
    }

    store32(offset:number, value:number):void {
        this.view.setInt32(offset & this.mask32, value, true);
    }

    invalidatePage(address:number):void {
    }

    replaceData(memory:any, offset = 0):void {
        this.buffer = memory;
        this.view = new DataView(this.buffer, offset);
        if (this.icache) {
            this.icache = new Array(this.icache.length);
        }
    }
}

class MemoryBlock extends DefaultMemoryView {

    constructor(size:number, cacheBits:number) {
        super(new ArrayBuffer(size));
        this.ICACHE_PAGE_BITS = cacheBits;
        this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
        this.icache = new Array(size >> (this.ICACHE_PAGE_BITS + 1));
    }

    invalidatePage(address:number):void {
        var page = this.icache[(address & this.mask) >> this.ICACHE_PAGE_BITS];
        if (page) {
            page.invalid = true;
        }
    }
}

class ROMView extends DefaultMemoryView {

    /**
     * Needed for GPIO
     */
    mmu:GameBoyAdvanceMMU;
    private gpio:GameBoyAdvanceGPIO;

    constructor(mmu:GameBoyAdvanceMMU, rom:any, offset = 0) {
        this.mmu = mmu;
        super(rom, offset);
        this.ICACHE_PAGE_BITS = 10;
        this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
        this.icache = new Array(rom.byteLength >> (this.ICACHE_PAGE_BITS + 1));

        this.mask = 0x01FFFFFF;
        this.resetMask();
    }

    store8(offset:number, value:number):void {
    }

    store16(offset:number, value:number):void {
        if (offset < 0xCA && offset >= 0xC4) {
            if (!this.gpio) {
                this.gpio = this.mmu.allocGPIO(this);
            }
            this.gpio.store16(offset, value);
        }
    }

    /**
     * Unused?
     * @param offset
     * @param value
     */
    store32(offset:number, value:number):void {
        if (offset < 0xCA && offset >= 0xC4) {
            if (!this.gpio) {
                this.gpio = this.mmu.allocGPIO(this);
            }
            (<any>this.gpio).store32(offset, value);
        }
    }
}

class BIOSView extends DefaultMemoryView {

    real:boolean;

    constructor(rom:any, offset = 0) {
        super(rom, offset);
        this.ICACHE_PAGE_BITS = 16;
        this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
        this.icache = new Array(1);
    }

    load8(offset:number):number {
        if (offset >= this.buffer.byteLength) {
            return -1;
        }
        return this.view.getInt8(offset);
    }

    load16(offset:number):number {
        if (offset >= this.buffer.byteLength) {
            return -1;
        }
        return this.view.getInt16(offset, true);
    }

    loadU8(offset:number):number {
        if (offset >= this.buffer.byteLength) {
            return -1;
        }
        return this.view.getUint8(offset);
    }

    loadU16(offset:number):number {
        if (offset >= this.buffer.byteLength) {
            return -1;
        }
        return this.view.getUint16(offset, true);
    }

    load32(offset:number):number {
        if (offset >= this.buffer.byteLength) {
            return -1;
        }
        return this.view.getInt32(offset, true);
    }

    store8(offset:number, value:number):void {
    }

    store16(offset:number, value:number):void {
    }

    store32(offset:number, value:number):void {
    }
}

class BadMemory implements MemoryIO {

    cpu:ARMCore;
    mmu:GameBoyAdvanceMMU;

    constructor(mmu:GameBoyAdvanceMMU, cpu:ARMCore) {
        this.cpu = cpu;
        this.mmu = mmu
    }

    load8(offset:number):number {
        return this.mmu.load8(this.cpu.gprs[Register.PC] - this.cpu.instructionWidth + (offset & 0x3));
    }

    load16(offset:number):number {
        return this.mmu.load16(this.cpu.gprs[Register.PC] - this.cpu.instructionWidth + (offset & 0x2));
    }

    loadU8(offset:number):number {
        return this.mmu.loadU8(this.cpu.gprs[Register.PC] - this.cpu.instructionWidth + (offset & 0x3));
    }

    loadU16(offset:number):number {
        return this.mmu.loadU16(this.cpu.gprs[Register.PC] - this.cpu.instructionWidth + (offset & 0x2));
    }

    load32(offset:number):number {
        if (this.cpu.execMode == Mode.ARM) {
            return this.mmu.load32(this.cpu.gprs[Register.PC] - this.cpu.instructionWidth);
        } else {
            var halfword = this.mmu.loadU16(this.cpu.gprs[Register.PC] - this.cpu.instructionWidth);
            return halfword | (halfword << 16);
        }
    }

    store8(offset:number, value:number):void {
    }

    store16(offset:number, value:number):void {
    }

    store32(offset:number, value:number):void {
    }

    invalidatePage(address:number):void {
    }
}

class GameBoyAdvanceMMU implements MemoryIO {

    static REGION_BIOS = 0x0;
    static REGION_WORKING_RAM = 0x2;
    static REGION_WORKING_IRAM = 0x3;
    static REGION_IO = 0x4;
    static REGION_PALETTE_RAM = 0x5;
    static REGION_VRAM = 0x6;
    static REGION_OAM = 0x7;
    static REGION_CART0 = 0x8;
    static REGION_CART1 = 0xA;
    static REGION_CART2 = 0xC;
    static REGION_CART_SRAM = 0xE;

    static BASE_BIOS = 0x00000000;
    static BASE_WORKING_RAM = 0x02000000;
    static BASE_WORKING_IRAM = 0x03000000;
    static BASE_IO = 0x04000000;
    static BASE_PALETTE_RAM = 0x05000000;
    static BASE_VRAM = 0x06000000;
    static BASE_OAM = 0x07000000;
    static BASE_CART0 = 0x08000000;
    static BASE_CART1 = 0x0A000000;
    static BASE_CART2 = 0x0C000000;
    static BASE_CART_SRAM = 0x0E000000;

    static BASE_MASK = 0x0F000000;
    static BASE_OFFSET = 24;
    static OFFSET_MASK = 0x00FFFFFF;

    static SIZE_BIOS = 0x00004000;
    static SIZE_WORKING_RAM = 0x00040000;
    static SIZE_WORKING_IRAM = 0x00008000;
    static SIZE_IO = 0x00000400;
    static SIZE_PALETTE_RAM = 0x00000400;
    static SIZE_VRAM = 0x00018000;
    static SIZE_OAM = 0x00000400;
    static SIZE_CART0 = 0x02000000;
    static SIZE_CART1 = 0x02000000;
    static SIZE_CART2 = 0x02000000;
    static SIZE_CART_SRAM = 0x00008000;
    static SIZE_CART_FLASH512 = 0x00010000;
    static SIZE_CART_FLASH1M = 0x00020000;
    static SIZE_CART_EEPROM = 0x00002000;

    static DMA_TIMING_NOW = 0;
    static DMA_TIMING_VBLANK = 1;
    static DMA_TIMING_HBLANK = 2;
    static DMA_TIMING_CUSTOM = 3;

    static DMA_INCREMENT = 0;
    static DMA_DECREMENT = 1;
    static DMA_FIXED = 2;
    static DMA_INCREMENT_RELOAD = 3;

    static DMA_OFFSET = [ 1, -1, 0, 1 ];

    WAITSTATES:number[];
    WAITSTATES_32:number[];
    WAITSTATES_SEQ:number[];
    WAITSTATES_SEQ_32:number[];
    NULLWAIT:number[];

    ROM_WS = [ 4, 3, 2, 8 ];
    ROM_WS_SEQ = [
        [ 2, 1 ],
        [ 4, 1 ],
        [ 8, 1 ]
    ];

    ICACHE_PAGE_BITS = 8;
    PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;

    bios:BIOSView = null;

    private gba:GameBoyAdvance;

    constructor(gba:GameBoyAdvance) {
        this.gba = gba;
        this.WAITSTATES = [ 0, 0, 2, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4 ];
        this.WAITSTATES_32 = [ 0, 0, 5, 0, 0, 1, 0, 1, 7, 7, 9, 9, 13, 13, 8 ];
        this.WAITSTATES_SEQ = [ 0, 0, 2, 0, 0, 0, 0, 0, 2, 2, 4, 4, 8, 8, 4 ];
        this.WAITSTATES_SEQ_32 = [ 0, 0, 5, 0, 0, 1, 0, 1, 5, 5, 9, 9, 17, 17, 8 ];
        this.NULLWAIT = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
        for (var i = 15; i < 256; ++i) {
            this.WAITSTATES[i] = 0;
            this.WAITSTATES_32[i] = 0;
            this.WAITSTATES_SEQ[i] = 0;
            this.WAITSTATES_SEQ_32[i] = 0;
            this.NULLWAIT[i] = 0;
        }
    }

    memory:MemoryView[];
    cart:Cart;
    save:MemoryView;

    mmap(region:number, object:MemoryView):void {
        this.memory[region] = object;
    }

    badMemory:MemoryView;
    DMA_REGISTER:number[];

    clear():void {
        var badMemory = this.badMemory = <MemoryView><any>new BadMemory(this, this.gba.cpu);
        this.memory = [
            this.bios,
            badMemory, // Unused
            new MemoryBlock(GameBoyAdvanceMMU.SIZE_WORKING_RAM, 9),
            new MemoryBlock(GameBoyAdvanceMMU.SIZE_WORKING_IRAM, 7),
            null, // This is owned by GameBoyAdvanceIO
            null, // This is owned by GameBoyAdvancePalette
            null, // This is owned by GameBoyAdvanceVRAM
            null, // This is owned by GameBoyAdvanceOAM
            badMemory,
            badMemory,
            badMemory,
            badMemory,
            badMemory,
            badMemory,
            badMemory,
            badMemory // Unused
        ];
        for (var i = 16; i < 256; ++i) {
            this.memory[i] = badMemory;
        }

        this.waitstates = this.WAITSTATES.slice(0);
        this.waitstatesSeq = this.WAITSTATES_SEQ.slice(0);
        this.waitstates32 = this.WAITSTATES_32.slice(0);
        this.waitstatesSeq32 = this.WAITSTATES_SEQ_32.slice(0);
        this.waitstatesPrefetch = this.WAITSTATES_SEQ.slice(0);
        this.waitstatesPrefetch32 = this.WAITSTATES_SEQ_32.slice(0);

        this.cart = null;
        this.save = null;

        this.DMA_REGISTER = [
                GameBoyAdvanceIO.DMA0CNT_HI >> 1,
                GameBoyAdvanceIO.DMA1CNT_HI >> 1,
                GameBoyAdvanceIO.DMA2CNT_HI >> 1,
                GameBoyAdvanceIO.DMA3CNT_HI >> 1
        ];
    }

    freeze():any {
        return {
            'ram': Serializer.prefix(this.memory[GameBoyAdvanceMMU.REGION_WORKING_RAM].buffer),
            'iram': Serializer.prefix(this.memory[GameBoyAdvanceMMU.REGION_WORKING_IRAM].buffer)
        };
    }

    defrost(frost:any):void {
        this.memory[GameBoyAdvanceMMU.REGION_WORKING_RAM].replaceData(frost.ram, 0);
        this.memory[GameBoyAdvanceMMU.REGION_WORKING_IRAM].replaceData(frost.iram, 0);
    }

    loadBios(bios:any, real:boolean):void {
        this.bios = new BIOSView(bios);
        this.bios.real = real;
    }

    loadRom(rom:any, process:boolean):Cart {
        var cart = new Cart(rom);

        var lo = new ROMView(this, rom);
        if (lo.view.getUint8(0xB2) != 0x96) {
            throw "Not a valid ROM";
        }
        this.memory[GameBoyAdvanceMMU.REGION_CART0] = lo;
        this.memory[GameBoyAdvanceMMU.REGION_CART1] = lo;
        this.memory[GameBoyAdvanceMMU.REGION_CART2] = lo;

        if (rom.byteLength > 0x01000000) {
            var hi = new ROMView(rom, 0x01000000);
            this.memory[GameBoyAdvanceMMU.REGION_CART0 + 1] = hi;
            this.memory[GameBoyAdvanceMMU.REGION_CART1 + 1] = hi;
            this.memory[GameBoyAdvanceMMU.REGION_CART2 + 1] = hi;
        }

        if (process) {
            var name = '';
            for (var i = 0; i < 12; ++i) {
                var c = lo.loadU8(i + 0xA0);
                if (!c) {
                    break;
                }
                name += String.fromCharCode(c);
            }
            cart.title = name;

            var code = '';
            for (var i = 0; i < 4; ++i) {
                var c = lo.loadU8(i + 0xAC);
                if (!c) {
                    break;
                }
                code += String.fromCharCode(c);
            }
            cart.code = code;

            var maker = '';
            for (var i = 0; i < 2; ++i) {
                var c = lo.loadU8(i + 0xB0);
                if (!c) {
                    break;
                }
                maker += String.fromCharCode(c);
            }
            cart.maker = maker;

            // Find savedata type
            var state = '';
            var next:string;
            var terminal = false;
            for (var i = 0xE4; i < rom.byteLength && !terminal; ++i) {
                next = String.fromCharCode(lo.loadU8(i));
                state += next;
                switch (state) {
                    case 'F':
                    case 'FL':
                    case 'FLA':
                    case 'FLAS':
                    case 'FLASH':
                    case 'FLASH_':
                    case 'FLASH5':
                    case 'FLASH51':
                    case 'FLASH512':
                    case 'FLASH512_':
                    case 'FLASH1':
                    case 'FLASH1M':
                    case 'FLASH1M_':
                    case 'S':
                    case 'SR':
                    case 'SRA':
                    case 'SRAM':
                    case 'SRAM_':
                    case 'E':
                    case 'EE':
                    case 'EEP':
                    case 'EEPR':
                    case 'EEPRO':
                    case 'EEPROM':
                    case 'EEPROM_':
                        break;
                    case 'FLASH_V':
                    case 'FLASH512_V':
                    case 'FLASH1M_V':
                    case 'SRAM_V':
                    case 'EEPROM_V':
                        terminal = true;
                        break;
                    default:
                        state = next;
                        break;
                }
            }
            if (terminal) {
                cart.saveType = state;
                switch (state) {
                    case 'FLASH_V':
                    case 'FLASH512_V':
                        this.save = this.memory[GameBoyAdvanceMMU.REGION_CART_SRAM] = new FlashSavedata(GameBoyAdvanceMMU.SIZE_CART_FLASH512);
                        break;
                    case 'FLASH1M_V':
                        this.save = this.memory[GameBoyAdvanceMMU.REGION_CART_SRAM] = new FlashSavedata(GameBoyAdvanceMMU.SIZE_CART_FLASH1M);
                        break;
                    case 'SRAM_V':
                        this.save = this.memory[GameBoyAdvanceMMU.REGION_CART_SRAM] = new SRAMSavedata(GameBoyAdvanceMMU.SIZE_CART_SRAM);
                        break;
                    case 'EEPROM_V':
                        this.save = this.memory[GameBoyAdvanceMMU.REGION_CART2 + 1] = new EEPROMSavedata(this.gba, GameBoyAdvanceMMU.SIZE_CART_EEPROM);
                        break;
                }
            }
            if (!this.save) {
                // Assume we have SRAM
                this.save = this.memory[GameBoyAdvanceMMU.REGION_CART_SRAM] = new SRAMSavedata(GameBoyAdvanceMMU.SIZE_CART_SRAM);
            }
        }

        this.cart = cart;
        return cart;
    }

    loadSavedata(save:any):void {
        this.save.replaceData(save, 0);
    }

    load8(offset:number):number {
        return this.memory[offset >>> GameBoyAdvanceMMU.BASE_OFFSET].load8(offset & 0x00FFFFFF);
    }

    load16(offset:number):number {
        return this.memory[offset >>> GameBoyAdvanceMMU.BASE_OFFSET].load16(offset & 0x00FFFFFF);
    }

    load32(offset:number):number {
        return this.memory[offset >>> GameBoyAdvanceMMU.BASE_OFFSET].load32(offset & 0x00FFFFFF);
    }

    loadU8(offset:number):number {
        return this.memory[offset >>> GameBoyAdvanceMMU.BASE_OFFSET].loadU8(offset & 0x00FFFFFF);
    }

    loadU16(offset:number):number {
        return this.memory[offset >>> GameBoyAdvanceMMU.BASE_OFFSET].loadU16(offset & 0x00FFFFFF);
    }

    store8(offset:number, value:number):void {
        var maskedOffset = offset & 0x00FFFFFF;
        var memory = this.memory[offset >>> GameBoyAdvanceMMU.BASE_OFFSET];
        memory.store8(maskedOffset, value);
        memory.invalidatePage(maskedOffset);
    }

    store16(offset:number, value:number):void {
        var maskedOffset = offset & 0x00FFFFFE;
        var memory = this.memory[offset >>> GameBoyAdvanceMMU.BASE_OFFSET];
        memory.store16(maskedOffset, value);
        memory.invalidatePage(maskedOffset);
    }

    store32(offset:number, value:number):void {
        var maskedOffset = offset & 0x00FFFFFC;
        var memory = this.memory[offset >>> GameBoyAdvanceMMU.BASE_OFFSET];
        memory.store32(maskedOffset, value);
        memory.invalidatePage(maskedOffset);
        memory.invalidatePage(maskedOffset + 2);
    }

    waitstatesPrefetch:number[];
    waitstatesPrefetch32:number[];
    waitstates:number[];
    waitstates32:number[];
    waitstatesSeq:number[];
    waitstatesSeq32:number[];

    waitPrefetch(memory:number):void {
        this.gba.cpu.cycles += 1 + this.waitstatesPrefetch[memory >>> GameBoyAdvanceMMU.BASE_OFFSET];
    }

    waitPrefetch32(memory:number):void {
        this.gba.cpu.cycles += 1 + this.waitstatesPrefetch32[memory >>> GameBoyAdvanceMMU.BASE_OFFSET];
    }

    wait(memory:number):void {
        this.gba.cpu.cycles += 1 + this.waitstates[memory >>> GameBoyAdvanceMMU.BASE_OFFSET];
    }

    wait32(memory:number):void {
        this.gba.cpu.cycles += 1 + this.waitstates32[memory >>> GameBoyAdvanceMMU.BASE_OFFSET];
    }

    waitSeq(memory:number):void {
        this.gba.cpu.cycles += 1 + this.waitstatesSeq[memory >>> GameBoyAdvanceMMU.BASE_OFFSET];
    }

    waitSeq32(memory:number):void {
        this.gba.cpu.cycles += 1 + this.waitstatesSeq32[memory >>> GameBoyAdvanceMMU.BASE_OFFSET];
    }

    waitMul(rs:number):void {
        if (((rs & 0xFFFFFF00) == 0xFFFFFF00) || !(rs & 0xFFFFFF00)) {
            this.gba.cpu.cycles += 1;
        } else if (((rs & 0xFFFF0000) == 0xFFFF0000) || !(rs & 0xFFFF0000)) {
            this.gba.cpu.cycles += 2;
        } else if (((rs & 0xFF000000) == 0xFF000000) || !(rs & 0xFF000000)) {
            this.gba.cpu.cycles += 3;
        } else {
            this.gba.cpu.cycles += 4;
        }
    }

    waitMulti32(memory:number, seq:number):void {
        this.gba.cpu.cycles += 1 + this.waitstates32[memory >>> GameBoyAdvanceMMU.BASE_OFFSET];
        this.gba.cpu.cycles += (1 + this.waitstatesSeq32[memory >>> GameBoyAdvanceMMU.BASE_OFFSET]) * (seq - 1);
    }

    addressToPage(region:number, address:number):number {
        return address >> this.memory[region].ICACHE_PAGE_BITS;
    }

    accessPage(region:number, pageId:number):Page {
        var memory = this.memory[region];
        var page = memory.icache[pageId];
        if (!page || page.invalid) {
            page = {
                thumb: new Array<any>(1 << (memory.ICACHE_PAGE_BITS)),
                arm: new Array<any>(1 << memory.ICACHE_PAGE_BITS - 1),
                invalid: false
            };
            memory.icache[pageId] = page;
        }
        return page;
    }

    dma:DMA;

    scheduleDma(number:number, info:DMA):void {
        switch (info.timing) {
            case GameBoyAdvanceMMU.DMA_TIMING_NOW:
                this.serviceDma(number, info);
                break;
            case GameBoyAdvanceMMU.DMA_TIMING_HBLANK:
                // Handled implicitly
                break;
            case GameBoyAdvanceMMU.DMA_TIMING_VBLANK:
                // Handled implicitly
                break;
            case GameBoyAdvanceMMU.DMA_TIMING_CUSTOM:
                switch (number) {
                    case 0:
                        this.gba.logger.WARN('Discarding invalid DMA0 scheduling');
                        break;
                    case 1:
                    case 2:
                        this.gba.audio.scheduleFIFODma(number, info);
                        break;
                    case 3:
                        this.gba.video.scheduleVCaptureDma(this.dma, info);
                        break;
                }
        }
    }

    runHblankDmas():void {
        for (var i = 0; i < this.gba.irq.dma.length; ++i) {
            this.dma = this.gba.irq.dma[i];
            if (this.dma.enable && this.dma.timing == GameBoyAdvanceMMU.DMA_TIMING_HBLANK) {
                this.serviceDma(i, this.dma);
            }
        }
    }

    runVblankDmas():void {
        for (var i = 0; i < this.gba.irq.dma.length; ++i) {
            this.dma = this.gba.irq.dma[i];
            if (this.dma.enable && this.dma.timing == GameBoyAdvanceMMU.DMA_TIMING_VBLANK) {
                this.serviceDma(i, this.dma);
            }
        }
    }

    serviceDma(number:number, info:DMA):void {
        if (!info.enable) {
            // There was a DMA scheduled that got canceled
            return;
        }

        var width = info.width;
        var sourceOffset = GameBoyAdvanceMMU.DMA_OFFSET[info.srcControl] * width;
        var destOffset = GameBoyAdvanceMMU.DMA_OFFSET[info.dstControl] * width;
        var wordsRemaining = info.nextCount;
        var source = info.nextSource & GameBoyAdvanceMMU.OFFSET_MASK;
        var dest = info.nextDest & GameBoyAdvanceMMU.OFFSET_MASK;
        var sourceRegion = info.nextSource >>> GameBoyAdvanceMMU.BASE_OFFSET;
        var destRegion = info.nextDest >>> GameBoyAdvanceMMU.BASE_OFFSET;
        var sourceBlock = this.memory[sourceRegion];
        var destBlock = this.memory[destRegion];
        var sourceView:DataView = null;
        var destView:DataView = null;
        var sourceMask = 0xFFFFFFFF;
        var destMask = 0xFFFFFFFF;
        var word:number;

        if (destBlock.ICACHE_PAGE_BITS) {
            var endPage = (dest + wordsRemaining * width) >> destBlock.ICACHE_PAGE_BITS;
            for (var i = dest >> destBlock.ICACHE_PAGE_BITS; i <= endPage; ++i) {
                destBlock.invalidatePage(i << destBlock.ICACHE_PAGE_BITS);
            }
        }

        if (destRegion == GameBoyAdvanceMMU.REGION_WORKING_RAM || destRegion == GameBoyAdvanceMMU.REGION_WORKING_IRAM) {
            destView = destBlock.view;
            destMask = destBlock.mask;
        }

        if (sourceRegion == GameBoyAdvanceMMU.REGION_WORKING_RAM || sourceRegion == GameBoyAdvanceMMU.REGION_WORKING_IRAM || sourceRegion == GameBoyAdvanceMMU.REGION_CART0 || sourceRegion == GameBoyAdvanceMMU.REGION_CART1) {
            sourceView = sourceBlock.view;
            sourceMask = sourceBlock.mask;
        }

        if (sourceBlock && destBlock) {
            if (sourceView && destView) {
                if (width == 4) {
                    source &= 0xFFFFFFFC;
                    dest &= 0xFFFFFFFC;
                    while (wordsRemaining--) {
                        word = sourceView.getInt32(source & sourceMask);
                        destView.setInt32(dest & destMask, word);
                        source += sourceOffset;
                        dest += destOffset;
                    }
                } else {
                    while (wordsRemaining--) {
                        word = sourceView.getUint16(source & sourceMask);
                        destView.setUint16(dest & destMask, word);
                        source += sourceOffset;
                        dest += destOffset;
                    }
                }
            } else if (sourceView) {
                if (width == 4) {
                    source &= 0xFFFFFFFC;
                    dest &= 0xFFFFFFFC;
                    while (wordsRemaining--) {
                        word = sourceView.getInt32(source & sourceMask, true);
                        destBlock.store32(dest, word);
                        source += sourceOffset;
                        dest += destOffset;
                    }
                } else {
                    while (wordsRemaining--) {
                        word = sourceView.getUint16(source & sourceMask, true);
                        destBlock.store16(dest, word);
                        source += sourceOffset;
                        dest += destOffset;
                    }
                }
            } else {
                if (width == 4) {
                    source &= 0xFFFFFFFC;
                    dest &= 0xFFFFFFFC;
                    while (wordsRemaining--) {
                        word = sourceBlock.load32(source);
                        destBlock.store32(dest, word);
                        source += sourceOffset;
                        dest += destOffset;
                    }
                } else {
                    while (wordsRemaining--) {
                        word = sourceBlock.loadU16(source);
                        destBlock.store16(dest, word);
                        source += sourceOffset;
                        dest += destOffset;
                    }
                }
            }
        } else {
            this.gba.logger.WARN('Invalid DMA');
        }

        if (info.doIrq) {
            info.nextIRQ = this.gba.cpu.cycles + 2;
            info.nextIRQ += (width == 4 ? this.waitstates32[sourceRegion] + this.waitstates32[destRegion]
                : this.waitstates[sourceRegion] + this.waitstates[destRegion]);
            info.nextIRQ += (info.count - 1) * (width == 4 ? this.waitstatesSeq32[sourceRegion] + this.waitstatesSeq32[destRegion]
                : this.waitstatesSeq[sourceRegion] + this.waitstatesSeq[destRegion]);
        }

        info.nextSource = source | (sourceRegion << GameBoyAdvanceMMU.BASE_OFFSET);
        info.nextDest = dest | (destRegion << GameBoyAdvanceMMU.BASE_OFFSET);
        info.nextCount = wordsRemaining;

        if (!info.repeat) {
            info.enable = false;

            // Clear the enable bit in memory
            var io = <GameBoyAdvanceIO><any>this.memory[GameBoyAdvanceMMU.REGION_IO];
            io.registers[this.DMA_REGISTER[number]] &= 0x7FE0;
        } else {
            info.nextCount = info.count;
            if (info.dstControl == GameBoyAdvanceMMU.DMA_INCREMENT_RELOAD) {
                info.nextDest = info.dest;
            }
            this.scheduleDma(number, info);
        }
    }

    adjustTimings(word:number):void {
        var sram = word & 0x0003;
        var ws0 = (word & 0x000C) >> 2;
        var ws0seq = (word & 0x0010) >> 4;
        var ws1 = (word & 0x0060) >> 5;
        var ws1seq = (word & 0x0080) >> 7;
        var ws2 = (word & 0x0300) >> 8;
        var ws2seq = (word & 0x0400) >> 10;
        var prefetch = word & 0x4000;

        this.waitstates[GameBoyAdvanceMMU.REGION_CART_SRAM] = this.ROM_WS[sram];
        this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART_SRAM] = this.ROM_WS[sram];
        this.waitstates32[GameBoyAdvanceMMU.REGION_CART_SRAM] = this.ROM_WS[sram];
        this.waitstatesSeq32[GameBoyAdvanceMMU.REGION_CART_SRAM] = this.ROM_WS[sram];

        this.waitstates[GameBoyAdvanceMMU.REGION_CART0] = this.waitstates[GameBoyAdvanceMMU.REGION_CART0 + 1] = this.ROM_WS[ws0];
        this.waitstates[GameBoyAdvanceMMU.REGION_CART1] = this.waitstates[GameBoyAdvanceMMU.REGION_CART1 + 1] = this.ROM_WS[ws1];
        this.waitstates[GameBoyAdvanceMMU.REGION_CART2] = this.waitstates[GameBoyAdvanceMMU.REGION_CART2 + 1] = this.ROM_WS[ws2];

        this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART0] = this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART0 + 1] = this.ROM_WS_SEQ[0][ws0seq];
        this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART1] = this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART1 + 1] = this.ROM_WS_SEQ[1][ws1seq];
        this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART2] = this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART2 + 1] = this.ROM_WS_SEQ[2][ws2seq];

        this.waitstates32[GameBoyAdvanceMMU.REGION_CART0] = this.waitstates32[GameBoyAdvanceMMU.REGION_CART0 + 1] = this.waitstates[GameBoyAdvanceMMU.REGION_CART0] + 1 + this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART0];
        this.waitstates32[GameBoyAdvanceMMU.REGION_CART1] = this.waitstates32[GameBoyAdvanceMMU.REGION_CART1 + 1] = this.waitstates[GameBoyAdvanceMMU.REGION_CART1] + 1 + this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART1];
        this.waitstates32[GameBoyAdvanceMMU.REGION_CART2] = this.waitstates32[GameBoyAdvanceMMU.REGION_CART2 + 1] = this.waitstates[GameBoyAdvanceMMU.REGION_CART2] + 1 + this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART2];

        this.waitstatesSeq32[GameBoyAdvanceMMU.REGION_CART0] = this.waitstatesSeq32[GameBoyAdvanceMMU.REGION_CART0 + 1] = 2 * this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART0] + 1;
        this.waitstatesSeq32[GameBoyAdvanceMMU.REGION_CART1] = this.waitstatesSeq32[GameBoyAdvanceMMU.REGION_CART1 + 1] = 2 * this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART1] + 1;
        this.waitstatesSeq32[GameBoyAdvanceMMU.REGION_CART2] = this.waitstatesSeq32[GameBoyAdvanceMMU.REGION_CART2 + 1] = 2 * this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART2] + 1;

        if (prefetch) {
            this.waitstatesPrefetch[GameBoyAdvanceMMU.REGION_CART0] = this.waitstatesPrefetch[GameBoyAdvanceMMU.REGION_CART0 + 1] = 0;
            this.waitstatesPrefetch[GameBoyAdvanceMMU.REGION_CART1] = this.waitstatesPrefetch[GameBoyAdvanceMMU.REGION_CART1 + 1] = 0;
            this.waitstatesPrefetch[GameBoyAdvanceMMU.REGION_CART2] = this.waitstatesPrefetch[GameBoyAdvanceMMU.REGION_CART2 + 1] = 0;

            this.waitstatesPrefetch32[GameBoyAdvanceMMU.REGION_CART0] = this.waitstatesPrefetch32[GameBoyAdvanceMMU.REGION_CART0 + 1] = 0;
            this.waitstatesPrefetch32[GameBoyAdvanceMMU.REGION_CART1] = this.waitstatesPrefetch32[GameBoyAdvanceMMU.REGION_CART1 + 1] = 0;
            this.waitstatesPrefetch32[GameBoyAdvanceMMU.REGION_CART2] = this.waitstatesPrefetch32[GameBoyAdvanceMMU.REGION_CART2 + 1] = 0;
        } else {
            this.waitstatesPrefetch[GameBoyAdvanceMMU.REGION_CART0] = this.waitstatesPrefetch[GameBoyAdvanceMMU.REGION_CART0 + 1] = this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART0];
            this.waitstatesPrefetch[GameBoyAdvanceMMU.REGION_CART1] = this.waitstatesPrefetch[GameBoyAdvanceMMU.REGION_CART1 + 1] = this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART1];
            this.waitstatesPrefetch[GameBoyAdvanceMMU.REGION_CART2] = this.waitstatesPrefetch[GameBoyAdvanceMMU.REGION_CART2 + 1] = this.waitstatesSeq[GameBoyAdvanceMMU.REGION_CART2];

            this.waitstatesPrefetch32[GameBoyAdvanceMMU.REGION_CART0] = this.waitstatesPrefetch32[GameBoyAdvanceMMU.REGION_CART0 + 1] = this.waitstatesSeq32[GameBoyAdvanceMMU.REGION_CART0];
            this.waitstatesPrefetch32[GameBoyAdvanceMMU.REGION_CART1] = this.waitstatesPrefetch32[GameBoyAdvanceMMU.REGION_CART1 + 1] = this.waitstatesSeq32[GameBoyAdvanceMMU.REGION_CART1];
            this.waitstatesPrefetch32[GameBoyAdvanceMMU.REGION_CART2] = this.waitstatesPrefetch32[GameBoyAdvanceMMU.REGION_CART2 + 1] = this.waitstatesSeq32[GameBoyAdvanceMMU.REGION_CART2];
        }
    }

    saveNeedsFlush():boolean {
        return this.save.writePending;
    }

    flushSave():void {
        this.save.writePending = false;
    }

    allocGPIO(rom:MemoryView):GameBoyAdvanceGPIO {
        return new GameBoyAdvanceGPIO(this.gba, rom);
    }
}