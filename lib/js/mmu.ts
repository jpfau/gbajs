/// <reference path="util.ts"/>
/// <reference path="savedata.ts"/>
/// <reference path="gpio.ts"/>

interface Page {
    thumb:any[]
    arm:any[]
    invalid:boolean
}

interface MemoryView {

    buffer;
    icache;
    ICACHE_PAGE_BITS;
    PAGE_MASK;
    view:DataView;
    mask;
    mask8;
    mask16;
    mask32;

    load8(offset);

    load16(offset) ;

    loadU8(offset) ;

    loadU16(offset) ;

    load32(offset);

    store8(offset:number, value);

    store16(offset:number, value);

    store32(offset:number, value);

    invalidatePage(address);

    replaceData(memory, offset:number);
}

class DefaultMemoryView implements MemoryView {

    buffer;
    icache;
    ICACHE_PAGE_BITS;
    PAGE_MASK;
    view:DataView;
    mask;
    mask8;
    mask16;
    mask32;

    constructor(memory, offset = 0) {
        this.buffer = memory;
        this.view = new DataView(this.buffer, offset);
        this.mask = memory.byteLength - 1;
        this.resetMask();
    }

    resetMask() {
        this.mask8 = this.mask & 0xFFFFFFFF;
        this.mask16 = this.mask & 0xFFFFFFFE;
        this.mask32 = this.mask & 0xFFFFFFFC;
    }

    load8(offset) {
        return this.view.getInt8(offset & this.mask8);
    }

    load16(offset) {
        // Unaligned 16-bit loads are unpredictable...let's just pretend they work
        return this.view.getInt16(offset & this.mask, true);
    }

    loadU8(offset) {
        return this.view.getUint8(offset & this.mask8);
    }

    loadU16(offset) {
        // Unaligned 16-bit loads are unpredictable...let's just pretend they work
        return this.view.getUint16(offset & this.mask, true);
    }

    load32(offset) {
        // Unaligned 32-bit loads are "rotated" so they make some semblance of sense
        var rotate = (offset & 3) << 3;
        var mem = this.view.getInt32(offset & this.mask32, true);
        return (mem >>> rotate) | (mem << (32 - rotate));
    }

    store8(offset:number, value) {
        this.view.setInt8(offset & this.mask8, value);
    }

    store16(offset:number, value) {
        this.view.setInt16(offset & this.mask16, value, true);
    }

    store32(offset:number, value) {
        this.view.setInt32(offset & this.mask32, value, true);
    }

    invalidatePage(address) {
    }

    replaceData(memory, offset = 0) {
        this.buffer = memory;
        this.view = new DataView(this.buffer, offset);
        if (this.icache) {
            this.icache = new Array(this.icache.length);
        }
    }
}

class MemoryBlock extends DefaultMemoryView {

    constructor(size, cacheBits) {
        super(new ArrayBuffer(size));
        this.ICACHE_PAGE_BITS = cacheBits;
        this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
        this.icache = new Array(size >> (this.ICACHE_PAGE_BITS + 1));
    }

    invalidatePage(address) {
        var page = this.icache[(address & this.mask) >> this.ICACHE_PAGE_BITS];
        if (page) {
            page.invalid = true;
        }
    }
}

class ROMView extends DefaultMemoryView {

    mmu;
    gpio;

    constructor(rom, offset = 0) {
        super(rom, offset);
        this.ICACHE_PAGE_BITS = 10;
        this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
        this.icache = new Array(rom.byteLength >> (this.ICACHE_PAGE_BITS + 1));

        this.mask = 0x01FFFFFF;
        this.resetMask();
    }

    store8(offset:number, value) {
    }

    store16(offset:number, value) {
        if (offset < 0xCA && offset >= 0xC4) {
            if (!this.gpio) {
                this.gpio = this.mmu.allocGPIO(this);
            }
            this.gpio.store16(offset, value);
        }
    }

    store32(offset:number, value) {
        if (offset < 0xCA && offset >= 0xC4) {
            if (!this.gpio) {
                this.gpio = this.mmu.allocGPIO(this);
            }
            this.gpio.store32(offset, value);
        }
    }
}

class BIOSView extends DefaultMemoryView {

    PAGE_MASK;
    real:boolean;

    constructor(rom, offset = 0) {
        super(rom, offset);
        this.ICACHE_PAGE_BITS = 16;
        this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
        this.icache = new Array(1);
    }

    load8(offset) {
        if (offset >= this.buffer.byteLength) {
            return -1;
        }
        return this.view.getInt8(offset);
    }

    load16(offset) {
        if (offset >= this.buffer.byteLength) {
            return -1;
        }
        return this.view.getInt16(offset, true);
    }

    loadU8(offset) {
        if (offset >= this.buffer.byteLength) {
            return -1;
        }
        return this.view.getUint8(offset);
    }

    loadU16(offset) {
        if (offset >= this.buffer.byteLength) {
            return -1;
        }
        return this.view.getUint16(offset, true);
    }

    load32(offset) {
        if (offset >= this.buffer.byteLength) {
            return -1;
        }
        return this.view.getInt32(offset, true);
    }

    store8(offset:number, value) {
    }

    store16(offset:number, value) {
    }

    store32(offset:number, value) {
    }
}

class BadMemory {

    cpu;
    mmu;

    constructor(mmu, cpu) {
        this.cpu = cpu;
        this.mmu = mmu
    }

    load8(offset) {
        return this.mmu.load8(this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth + (offset & 0x3));
    }

    load16(offset) {
        return this.mmu.load16(this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth + (offset & 0x2));
    }

    loadU8(offset) {
        return this.mmu.loadU8(this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth + (offset & 0x3));
    }

    loadU16(offset) {
        return this.mmu.loadU16(this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth + (offset & 0x2));
    }

    load32(offset) {
        if (this.cpu.execMode == Mode.ARM) {
            return this.mmu.load32(this.cpu.gprs[this.cpu.gprs.PC] - this.cpu.instructionWidth);
        } else {
            var halfword = this.mmu.loadU16(this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth);
            return halfword | (halfword << 16);
        }
    }

    store8(offset:number, value) {
    }

    store16(offset:number, value) {
    }

    store32(offset:number, value) {
    }

    invalidatePage(address) {
    }
}


class GameBoyAdvanceMMU {

    REGION_BIOS = 0x0;
    REGION_WORKING_RAM = 0x2;
    REGION_WORKING_IRAM = 0x3;
    REGION_IO = 0x4;
    REGION_PALETTE_RAM = 0x5;
    REGION_VRAM = 0x6;
    REGION_OAM = 0x7;
    REGION_CART0 = 0x8;
    REGION_CART1 = 0xA;
    REGION_CART2 = 0xC;
    REGION_CART_SRAM = 0xE;

    BASE_BIOS = 0x00000000;
    BASE_WORKING_RAM = 0x02000000;
    BASE_WORKING_IRAM = 0x03000000;
    BASE_IO = 0x04000000;
    BASE_PALETTE_RAM = 0x05000000;
    BASE_VRAM = 0x06000000;
    BASE_OAM = 0x07000000;
    BASE_CART0 = 0x08000000;
    BASE_CART1 = 0x0A000000;
    BASE_CART2 = 0x0C000000;
    BASE_CART_SRAM = 0x0E000000;

    BASE_MASK = 0x0F000000;
    BASE_OFFSET = 24;
    OFFSET_MASK = 0x00FFFFFF;

    SIZE_BIOS = 0x00004000;
    SIZE_WORKING_RAM = 0x00040000;
    SIZE_WORKING_IRAM = 0x00008000;
    SIZE_IO = 0x00000400;
    SIZE_PALETTE_RAM = 0x00000400;
    SIZE_VRAM = 0x00018000;
    SIZE_OAM = 0x00000400;
    SIZE_CART0 = 0x02000000;
    SIZE_CART1 = 0x02000000;
    SIZE_CART2 = 0x02000000;
    SIZE_CART_SRAM = 0x00008000;
    SIZE_CART_FLASH512 = 0x00010000;
    SIZE_CART_FLASH1M = 0x00020000;
    SIZE_CART_EEPROM = 0x00002000;

    DMA_TIMING_NOW = 0;
    DMA_TIMING_VBLANK = 1;
    DMA_TIMING_HBLANK = 2;
    DMA_TIMING_CUSTOM = 3;

    DMA_INCREMENT = 0;
    DMA_DECREMENT = 1;
    DMA_FIXED = 2;
    DMA_INCREMENT_RELOAD = 3;

    DMA_OFFSET = [ 1, -1, 0, 1 ];

    WAITSTATES;
    WAITSTATES_32;
    WAITSTATES_SEQ;
    WAITSTATES_SEQ_32;
    NULLWAIT;

    ROM_WS = [ 4, 3, 2, 8 ];
    ROM_WS_SEQ = [
        [ 2, 1 ],
        [ 4, 1 ],
        [ 8, 1 ]
    ];

    ICACHE_PAGE_BITS = 8;
    PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;

    bios:BIOSView = null;

    gba:GameBoyAdvance;

    get cpu() {
        return this.gba.cpu;
    }

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
    cart;
    save;

    mmap(region, object) {
        this.memory[region] = object;
    }

    badMemory;
    DMA_REGISTER;

    clear() {
        this.badMemory = new BadMemory(this, this.cpu);
        this.memory = [
            this.bios,
            this.badMemory, // Unused
            new MemoryBlock(this.SIZE_WORKING_RAM, 9),
            new MemoryBlock(this.SIZE_WORKING_IRAM, 7),
            null, // This is owned by GameBoyAdvanceIO
            null, // This is owned by GameBoyAdvancePalette
            null, // This is owned by GameBoyAdvanceVRAM
            null, // This is owned by GameBoyAdvanceOAM
            this.badMemory,
            this.badMemory,
            this.badMemory,
            this.badMemory,
            this.badMemory,
            this.badMemory,
            this.badMemory,
            this.badMemory // Unused
        ];
        for (var i = 16; i < 256; ++i) {
            this.memory[i] = this.badMemory;
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
                this.gba.io.DMA0CNT_HI >> 1,
                this.gba.io.DMA1CNT_HI >> 1,
                this.gba.io.DMA2CNT_HI >> 1,
                this.gba.io.DMA3CNT_HI >> 1
        ];
    }

    freeze() {
        return {
            'ram': Serializer.prefix(this.memory[this.REGION_WORKING_RAM].buffer),
            'iram': Serializer.prefix(this.memory[this.REGION_WORKING_IRAM].buffer)
        };
    }

    defrost(frost) {
        this.memory[this.REGION_WORKING_RAM].replaceData(frost.ram, 0);
        this.memory[this.REGION_WORKING_IRAM].replaceData(frost.iram, 0);
    }

    loadBios(bios, real:boolean) {
        this.bios = new BIOSView(bios);
        this.bios.real = real;
    }

    loadRom(rom, process:boolean) {
        var cart = {
            title: null,
            code: null,
            maker: null,
            memory: rom,
            saveType: null
        };

        var lo = new ROMView(rom);
        if (lo.view.getUint8(0xB2) != 0x96) {
            // Not a valid ROM
            return null;
        }
        lo.mmu = this; // Needed for GPIO
        this.memory[this.REGION_CART0] = lo;
        this.memory[this.REGION_CART1] = lo;
        this.memory[this.REGION_CART2] = lo;

        if (rom.byteLength > 0x01000000) {
            var hi = new ROMView(rom, 0x01000000);
            this.memory[this.REGION_CART0 + 1] = hi;
            this.memory[this.REGION_CART1 + 1] = hi;
            this.memory[this.REGION_CART2 + 1] = hi;
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
            var next;
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
                        this.save = this.memory[this.REGION_CART_SRAM] = new FlashSavedata(this.SIZE_CART_FLASH512);
                        break;
                    case 'FLASH1M_V':
                        this.save = this.memory[this.REGION_CART_SRAM] = new FlashSavedata(this.SIZE_CART_FLASH1M);
                        break;
                    case 'SRAM_V':
                        this.save = this.memory[this.REGION_CART_SRAM] = new SRAMSavedata(this.SIZE_CART_SRAM);
                        break;
                    case 'EEPROM_V':
                        this.save = this.memory[this.REGION_CART2 + 1] = new EEPROMSavedata(this.SIZE_CART_EEPROM, this);
                        break;
                }
            }
            if (!this.save) {
                // Assume we have SRAM
                this.save = this.memory[this.REGION_CART_SRAM] = new SRAMSavedata(this.SIZE_CART_SRAM);
            }
        }

        this.cart = cart;
        return cart;
    }

    loadSavedata(save) {
        this.save.replaceData(save);
    }

    load8(offset) {
        return this.memory[offset >>> this.BASE_OFFSET].load8(offset & 0x00FFFFFF);
    }

    load16(offset) {
        return this.memory[offset >>> this.BASE_OFFSET].load16(offset & 0x00FFFFFF);
    }

    load32(offset) {
        return this.memory[offset >>> this.BASE_OFFSET].load32(offset & 0x00FFFFFF);
    }

    loadU8(offset) {
        return this.memory[offset >>> this.BASE_OFFSET].loadU8(offset & 0x00FFFFFF);
    }

    loadU16(offset) {
        return this.memory[offset >>> this.BASE_OFFSET].loadU16(offset & 0x00FFFFFF);
    }

    store8(offset:number, value) {
        var maskedOffset = offset & 0x00FFFFFF;
        var memory = this.memory[offset >>> this.BASE_OFFSET];
        memory.store8(maskedOffset, value);
        memory.invalidatePage(maskedOffset);
    }

    store16(offset:number, value) {
        var maskedOffset = offset & 0x00FFFFFE;
        var memory = this.memory[offset >>> this.BASE_OFFSET];
        memory.store16(maskedOffset, value);
        memory.invalidatePage(maskedOffset);
    }

    store32(offset:number, value) {
        var maskedOffset = offset & 0x00FFFFFC;
        var memory = this.memory[offset >>> this.BASE_OFFSET];
        memory.store32(maskedOffset, value);
        memory.invalidatePage(maskedOffset);
        memory.invalidatePage(maskedOffset + 2);
    }

    waitstatesPrefetch;
    waitstatesPrefetch32;
    waitstates;
    waitstates32;
    waitstatesSeq;
    waitstatesSeq32;

    waitPrefetch(memory) {
        this.cpu.cycles += 1 + this.waitstatesPrefetch[memory >>> this.BASE_OFFSET];
    }

    waitPrefetch32(memory) {
        this.cpu.cycles += 1 + this.waitstatesPrefetch32[memory >>> this.BASE_OFFSET];
    }

    wait(memory) {
        this.cpu.cycles += 1 + this.waitstates[memory >>> this.BASE_OFFSET];
    }

    wait32(memory) {
        this.cpu.cycles += 1 + this.waitstates32[memory >>> this.BASE_OFFSET];
    }

    waitSeq(memory) {
        this.cpu.cycles += 1 + this.waitstatesSeq[memory >>> this.BASE_OFFSET];
    }

    waitSeq32(memory) {
        this.cpu.cycles += 1 + this.waitstatesSeq32[memory >>> this.BASE_OFFSET];
    }

    waitMul(rs:number) {
        if (((rs & 0xFFFFFF00) == 0xFFFFFF00) || !(rs & 0xFFFFFF00)) {
            this.cpu.cycles += 1;
        } else if (((rs & 0xFFFF0000) == 0xFFFF0000) || !(rs & 0xFFFF0000)) {
            this.cpu.cycles += 2;
        } else if (((rs & 0xFF000000) == 0xFF000000) || !(rs & 0xFF000000)) {
            this.cpu.cycles += 3;
        } else {
            this.cpu.cycles += 4;
        }
    }

    waitMulti32(memory, seq) {
        this.cpu.cycles += 1 + this.waitstates32[memory >>> this.BASE_OFFSET];
        this.cpu.cycles += (1 + this.waitstatesSeq32[memory >>> this.BASE_OFFSET]) * (seq - 1);
    }

    addressToPage(region, address) {
        return address >> this.memory[region].ICACHE_PAGE_BITS;
    }

    accessPage(region, pageId):Page {
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

    scheduleDma(number, info) {
        switch (info.timing) {
            case this.DMA_TIMING_NOW:
                this.serviceDma(number, info);
                break;
            case this.DMA_TIMING_HBLANK:
                // Handled implicitly
                break;
            case this.DMA_TIMING_VBLANK:
                // Handled implicitly
                break;
            case this.DMA_TIMING_CUSTOM:
                switch (number) {
                    case 0:
                        this.gba.logger.WARN('Discarding invalid DMA0 scheduling');
                        break;
                    case 1:
                    case 2:
                        this.cpu.irq.audio.scheduleFIFODma(number, info);
                        break;
                    case 3:
                        this.cpu.irq.video.scheduleVCaptureDma(this.dma, info);
                        break;
                }
        }
    }

    runHblankDmas() {
        for (var i = 0; i < this.cpu.irq.dma.length; ++i) {
            this.dma = this.cpu.irq.dma[i];
            if (this.dma.enable && this.dma.timing == this.DMA_TIMING_HBLANK) {
                this.serviceDma(i, this.dma);
            }
        }
    }

    runVblankDmas() {
        for (var i = 0; i < this.cpu.irq.dma.length; ++i) {
            this.dma = this.cpu.irq.dma[i];
            if (this.dma.enable && this.dma.timing == this.DMA_TIMING_VBLANK) {
                this.serviceDma(i, this.dma);
            }
        }
    }

    serviceDma(number, info) {
        if (!info.enable) {
            // There was a DMA scheduled that got canceled
            return;
        }

        var width = info.width;
        var sourceOffset = this.DMA_OFFSET[info.srcControl] * width;
        var destOffset = this.DMA_OFFSET[info.dstControl] * width;
        var wordsRemaining = info.nextCount;
        var source = info.nextSource & this.OFFSET_MASK;
        var dest = info.nextDest & this.OFFSET_MASK;
        var sourceRegion = info.nextSource >>> this.BASE_OFFSET;
        var destRegion = info.nextDest >>> this.BASE_OFFSET;
        var sourceBlock = this.memory[sourceRegion];
        var destBlock = this.memory[destRegion];
        var sourceView = null;
        var destView = null;
        var sourceMask = 0xFFFFFFFF;
        var destMask = 0xFFFFFFFF;
        var word;

        if (destBlock.ICACHE_PAGE_BITS) {
            var endPage = (dest + wordsRemaining * width) >> destBlock.ICACHE_PAGE_BITS;
            for (var i = dest >> destBlock.ICACHE_PAGE_BITS; i <= endPage; ++i) {
                destBlock.invalidatePage(i << destBlock.ICACHE_PAGE_BITS);
            }
        }

        if (destRegion == this.REGION_WORKING_RAM || destRegion == this.REGION_WORKING_IRAM) {
            destView = destBlock.view;
            destMask = destBlock.mask;
        }

        if (sourceRegion == this.REGION_WORKING_RAM || sourceRegion == this.REGION_WORKING_IRAM || sourceRegion == this.REGION_CART0 || sourceRegion == this.REGION_CART1) {
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
            info.nextIRQ = this.cpu.cycles + 2;
            info.nextIRQ += (width == 4 ? this.waitstates32[sourceRegion] + this.waitstates32[destRegion]
                : this.waitstates[sourceRegion] + this.waitstates[destRegion]);
            info.nextIRQ += (info.count - 1) * (width == 4 ? this.waitstatesSeq32[sourceRegion] + this.waitstatesSeq32[destRegion]
                : this.waitstatesSeq[sourceRegion] + this.waitstatesSeq[destRegion]);
        }

        info.nextSource = source | (sourceRegion << this.BASE_OFFSET);
        info.nextDest = dest | (destRegion << this.BASE_OFFSET);
        info.nextCount = wordsRemaining;

        if (!info.repeat) {
            info.enable = false;

            // Clear the enable bit in memory
            var io = <GameBoyAdvanceIO><any>this.memory[this.REGION_IO];
            io.registers[this.DMA_REGISTER[number]] &= 0x7FE0;
        } else {
            info.nextCount = info.count;
            if (info.dstControl == this.DMA_INCREMENT_RELOAD) {
                info.nextDest = info.dest;
            }
            this.scheduleDma(number, info);
        }
    }

    adjustTimings(word) {
        var sram = word & 0x0003;
        var ws0 = (word & 0x000C) >> 2;
        var ws0seq = (word & 0x0010) >> 4;
        var ws1 = (word & 0x0060) >> 5;
        var ws1seq = (word & 0x0080) >> 7;
        var ws2 = (word & 0x0300) >> 8;
        var ws2seq = (word & 0x0400) >> 10;
        var prefetch = word & 0x4000;

        this.waitstates[this.REGION_CART_SRAM] = this.ROM_WS[sram];
        this.waitstatesSeq[this.REGION_CART_SRAM] = this.ROM_WS[sram];
        this.waitstates32[this.REGION_CART_SRAM] = this.ROM_WS[sram];
        this.waitstatesSeq32[this.REGION_CART_SRAM] = this.ROM_WS[sram];

        this.waitstates[this.REGION_CART0] = this.waitstates[this.REGION_CART0 + 1] = this.ROM_WS[ws0];
        this.waitstates[this.REGION_CART1] = this.waitstates[this.REGION_CART1 + 1] = this.ROM_WS[ws1];
        this.waitstates[this.REGION_CART2] = this.waitstates[this.REGION_CART2 + 1] = this.ROM_WS[ws2];

        this.waitstatesSeq[this.REGION_CART0] = this.waitstatesSeq[this.REGION_CART0 + 1] = this.ROM_WS_SEQ[0][ws0seq];
        this.waitstatesSeq[this.REGION_CART1] = this.waitstatesSeq[this.REGION_CART1 + 1] = this.ROM_WS_SEQ[1][ws1seq];
        this.waitstatesSeq[this.REGION_CART2] = this.waitstatesSeq[this.REGION_CART2 + 1] = this.ROM_WS_SEQ[2][ws2seq];

        this.waitstates32[this.REGION_CART0] = this.waitstates32[this.REGION_CART0 + 1] = this.waitstates[this.REGION_CART0] + 1 + this.waitstatesSeq[this.REGION_CART0];
        this.waitstates32[this.REGION_CART1] = this.waitstates32[this.REGION_CART1 + 1] = this.waitstates[this.REGION_CART1] + 1 + this.waitstatesSeq[this.REGION_CART1];
        this.waitstates32[this.REGION_CART2] = this.waitstates32[this.REGION_CART2 + 1] = this.waitstates[this.REGION_CART2] + 1 + this.waitstatesSeq[this.REGION_CART2];

        this.waitstatesSeq32[this.REGION_CART0] = this.waitstatesSeq32[this.REGION_CART0 + 1] = 2 * this.waitstatesSeq[this.REGION_CART0] + 1;
        this.waitstatesSeq32[this.REGION_CART1] = this.waitstatesSeq32[this.REGION_CART1 + 1] = 2 * this.waitstatesSeq[this.REGION_CART1] + 1;
        this.waitstatesSeq32[this.REGION_CART2] = this.waitstatesSeq32[this.REGION_CART2 + 1] = 2 * this.waitstatesSeq[this.REGION_CART2] + 1;

        if (prefetch) {
            this.waitstatesPrefetch[this.REGION_CART0] = this.waitstatesPrefetch[this.REGION_CART0 + 1] = 0;
            this.waitstatesPrefetch[this.REGION_CART1] = this.waitstatesPrefetch[this.REGION_CART1 + 1] = 0;
            this.waitstatesPrefetch[this.REGION_CART2] = this.waitstatesPrefetch[this.REGION_CART2 + 1] = 0;

            this.waitstatesPrefetch32[this.REGION_CART0] = this.waitstatesPrefetch32[this.REGION_CART0 + 1] = 0;
            this.waitstatesPrefetch32[this.REGION_CART1] = this.waitstatesPrefetch32[this.REGION_CART1 + 1] = 0;
            this.waitstatesPrefetch32[this.REGION_CART2] = this.waitstatesPrefetch32[this.REGION_CART2 + 1] = 0;
        } else {
            this.waitstatesPrefetch[this.REGION_CART0] = this.waitstatesPrefetch[this.REGION_CART0 + 1] = this.waitstatesSeq[this.REGION_CART0];
            this.waitstatesPrefetch[this.REGION_CART1] = this.waitstatesPrefetch[this.REGION_CART1 + 1] = this.waitstatesSeq[this.REGION_CART1];
            this.waitstatesPrefetch[this.REGION_CART2] = this.waitstatesPrefetch[this.REGION_CART2 + 1] = this.waitstatesSeq[this.REGION_CART2];

            this.waitstatesPrefetch32[this.REGION_CART0] = this.waitstatesPrefetch32[this.REGION_CART0 + 1] = this.waitstatesSeq32[this.REGION_CART0];
            this.waitstatesPrefetch32[this.REGION_CART1] = this.waitstatesPrefetch32[this.REGION_CART1 + 1] = this.waitstatesSeq32[this.REGION_CART1];
            this.waitstatesPrefetch32[this.REGION_CART2] = this.waitstatesPrefetch32[this.REGION_CART2 + 1] = this.waitstatesSeq32[this.REGION_CART2];
        }
    }

    saveNeedsFlush() {
        return this.save.writePending;
    }

    flushSave() {
        this.save.writePending = false;
    }

    allocGPIO(rom) {
        return new GameBoyAdvanceGPIO(this.gba, rom);
    }
}