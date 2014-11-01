module GameBoyAdvance {
export class IO implements MemoryIO {
    // Video
    static DISPCNT = 0x000;
    static GREENSWP = 0x002;
    static DISPSTAT = 0x004;
    static VCOUNT = 0x006;
    static BG0CNT = 0x008;
    static BG1CNT = 0x00A;
    static BG2CNT = 0x00C;
    static BG3CNT = 0x00E;
    static BG0HOFS = 0x010;
    static BG0VOFS = 0x012;
    static BG1HOFS = 0x014;
    static BG1VOFS = 0x016;
    static BG2HOFS = 0x018;
    static BG2VOFS = 0x01A;
    static BG3HOFS = 0x01C;
    static BG3VOFS = 0x01E;
    static BG2PA = 0x020;
    static BG2PB = 0x022;
    static BG2PC = 0x024;
    static BG2PD = 0x026;
    static BG2X_LO = 0x028;
    static BG2X_HI = 0x02A;
    static BG2Y_LO = 0x02C;
    static BG2Y_HI = 0x02E;
    static BG3PA = 0x030;
    static BG3PB = 0x032;
    static BG3PC = 0x034;
    static BG3PD = 0x036;
    static BG3X_LO = 0x038;
    static BG3X_HI = 0x03A;
    static BG3Y_LO = 0x03C;
    static BG3Y_HI = 0x03E;
    static WIN0H = 0x040;
    static WIN1H = 0x042;
    static WIN0V = 0x044;
    static WIN1V = 0x046;
    static WININ = 0x048;
    static WINOUT = 0x04A;
    static MOSAIC = 0x04C;
    static BLDCNT = 0x050;
    static BLDALPHA = 0x052;
    static BLDY = 0x054;

    // Sound
    static SOUND1CNT_LO = 0x060;
    static SOUND1CNT_HI = 0x062;
    static SOUND1CNT_X = 0x064;
    static SOUND2CNT_LO = 0x068;
    static SOUND2CNT_HI = 0x06C;
    static SOUND3CNT_LO = 0x070;
    static SOUND3CNT_HI = 0x072;
    static SOUND3CNT_X = 0x074;
    static SOUND4CNT_LO = 0x078;
    static SOUND4CNT_HI = 0x07C;
    static SOUNDCNT_LO = 0x080;
    static SOUNDCNT_HI = 0x082;
    static SOUNDCNT_X = 0x084;
    static SOUNDBIAS = 0x088;
    static WAVE_RAM0_LO = 0x090;
    static WAVE_RAM0_HI = 0x092;
    static WAVE_RAM1_LO = 0x094;
    static WAVE_RAM1_HI = 0x096;
    static WAVE_RAM2_LO = 0x098;
    static WAVE_RAM2_HI = 0x09A;
    static WAVE_RAM3_LO = 0x09C;
    static WAVE_RAM3_HI = 0x09E;
    static FIFO_A_LO = 0x0A0;
    static FIFO_A_HI = 0x0A2;
    static FIFO_B_LO = 0x0A4;
    static FIFO_B_HI = 0x0A6;

    // DMA
    static DMA0SAD_LO = 0x0B0;
    static DMA0SAD_HI = 0x0B2;
    static DMA0DAD_LO = 0x0B4;
    static DMA0DAD_HI = 0x0B6;
    static DMA0CNT_LO = 0x0B8;
    static DMA0CNT_HI = 0x0BA;
    static DMA1SAD_LO = 0x0BC;
    static DMA1SAD_HI = 0x0BE;
    static DMA1DAD_LO = 0x0C0;
    static DMA1DAD_HI = 0x0C2;
    static DMA1CNT_LO = 0x0C4;
    static DMA1CNT_HI = 0x0C6;
    static DMA2SAD_LO = 0x0C8;
    static DMA2SAD_HI = 0x0CA;
    static DMA2DAD_LO = 0x0CC;
    static DMA2DAD_HI = 0x0CE;
    static DMA2CNT_LO = 0x0D0;
    static DMA2CNT_HI = 0x0D2;
    static DMA3SAD_LO = 0x0D4;
    static DMA3SAD_HI = 0x0D6;
    static DMA3DAD_LO = 0x0D8;
    static DMA3DAD_HI = 0x0DA;
    static DMA3CNT_LO = 0x0DC;
    static DMA3CNT_HI = 0x0DE;

    // Timers
    static TM0CNT_LO = 0x100;
    static TM0CNT_HI = 0x102;
    static TM1CNT_LO = 0x104;
    static TM1CNT_HI = 0x106;
    static TM2CNT_LO = 0x108;
    static TM2CNT_HI = 0x10A;
    static TM3CNT_LO = 0x10C;
    static TM3CNT_HI = 0x10E;

    // SIO (note: some of these are repeated)
    static SIODATA32_LO = 0x120;
    static SIOMULTI0 = 0x120;
    static SIODATA32_HI = 0x122;
    static SIOMULTI1 = 0x122;
    static SIOMULTI2 = 0x124;
    static SIOMULTI3 = 0x126;
    static SIOCNT = 0x128;
    static SIOMLT_SEND = 0x12A;
    static SIODATA8 = 0x12A;
    static RCNT = 0x134;
    static JOYCNT = 0x140;
    static JOY_RECV = 0x150;
    static JOY_TRANS = 0x154;
    static JOYSTAT = 0x158;

    // Keypad
    static KEYINPUT = 0x130;
    static KEYCNT = 0x132;

    // Interrupts, etc
    static IE = 0x200;
    static IF = 0x202;
    static WAITCNT = 0x204;
    static IME = 0x208;

    static POSTFLG = 0x300;
    static HALTCNT = 0x301;

    static DEFAULT_DISPCNT = 0x0080;
    static DEFAULT_SOUNDBIAS = 0x200;
    static DEFAULT_BGPA = 1;
    static DEFAULT_BGPD = 1;
    static DEFAULT_RCNT = 0x8000;

    registers:Uint16Array;
    value:number;

    constructor(private gba:Main) {
    }

    clear():void {
        this.registers = new Uint16Array(MMU.SIZE_IO);

        this.registers[IO.DISPCNT >> 1] = IO.DEFAULT_DISPCNT;
        this.registers[IO.SOUNDBIAS >> 1] = IO.DEFAULT_SOUNDBIAS;
        this.registers[IO.BG2PA >> 1] = IO.DEFAULT_BGPA;
        this.registers[IO.BG2PD >> 1] = IO.DEFAULT_BGPD;
        this.registers[IO.BG3PA >> 1] = IO.DEFAULT_BGPA;
        this.registers[IO.BG3PD >> 1] = IO.DEFAULT_BGPD;
        this.registers[IO.RCNT >> 1] = IO.DEFAULT_RCNT;
    }

    freeze():any {
        return {
            'registers': Serializer.prefix(this.registers.buffer)
        };
    }

    defrost(frost:any):void {
        this.registers = new Uint16Array(frost.registers);
        // Video registers don't serialize themselves
        for (var i = 0; i <= IO.BLDY; i += 2) {
            this.store16(this.registers[i >> 1], 0);
        }
    }

    load8(offset:number):number {
        throw 'Unimplmeneted unaligned I/O access';
    }

    load16(offset:number):number {
        return (this.loadU16(offset) << 16) >> 16;
    }

    load32(offset:number):number {
        offset &= 0xFFFFFFFC;
        switch (offset) {
            case IO.DMA0CNT_LO:
            case IO.DMA1CNT_LO:
            case IO.DMA2CNT_LO:
            case IO.DMA3CNT_LO:
                return this.loadU16(offset | 2) << 16;
            case IO.IME:
                return this.loadU16(offset) & 0xFFFF;
            case IO.JOY_RECV:
            case IO.JOY_TRANS:
                this.gba.logger.STUB('Unimplemented JOY register read: 0x' + offset.toString(16));
                return 0;
        }

        return this.loadU16(offset) | (this.loadU16(offset | 2) << 16);
    }

    loadU8(offset:number):number {
        var odd = offset & 0x0001;
        var value = this.loadU16(offset & 0xFFFE);
        return (value >>> (odd << 3)) & 0xFF;
    }

    loadU16(offset:number):number {
        switch (offset) {
            case IO.DISPCNT:
            case IO.BG0CNT:
            case IO.BG1CNT:
            case IO.BG2CNT:
            case IO.BG3CNT:
            case IO.WININ:
            case IO.WINOUT:
            case IO.SOUND1CNT_LO:
            case IO.SOUND3CNT_LO:
            case IO.SOUNDCNT_LO:
            case IO.SOUNDCNT_HI:
            case IO.SOUNDBIAS:
            case IO.BLDCNT:
            case IO.BLDALPHA:

            case IO.TM0CNT_HI:
            case IO.TM1CNT_HI:
            case IO.TM2CNT_HI:
            case IO.TM3CNT_HI:
            case IO.DMA0CNT_HI:
            case IO.DMA1CNT_HI:
            case IO.DMA2CNT_HI:
            case IO.DMA3CNT_HI:
            case IO.RCNT:
            case IO.WAITCNT:
            case IO.IE:
            case IO.IF:
            case IO.IME:
            case IO.POSTFLG:
                // Handled transparently by the written registers
                break;

            // Video
            case IO.DISPSTAT:
                return this.registers[offset >> 1] | this.gba.video.readDisplayStat();
            case IO.VCOUNT:
                return this.gba.video.vcount;

            // Sound
            case IO.SOUND1CNT_HI:
            case IO.SOUND2CNT_LO:
                return this.registers[offset >> 1] & 0xFFC0;
            case IO.SOUND1CNT_X:
            case IO.SOUND2CNT_HI:
            case IO.SOUND3CNT_X:
                return this.registers[offset >> 1] & 0x4000;
            case IO.SOUND3CNT_HI:
                return this.registers[offset >> 1] & 0xE000;
            case IO.SOUND4CNT_LO:
                return this.registers[offset >> 1] & 0xFF00;
            case IO.SOUND4CNT_HI:
                return this.registers[offset >> 1] & 0x40FF;
            case IO.SOUNDCNT_X:
                this.gba.logger.STUB('Unimplemented sound register read: SOUNDCNT_X');
                return this.registers[offset >> 1] | 0x0000;

            // Timers
            case IO.TM0CNT_LO:
                return this.gba.irq.timerRead(0);
            case IO.TM1CNT_LO:
                return this.gba.irq.timerRead(1);
            case IO.TM2CNT_LO:
                return this.gba.irq.timerRead(2);
            case IO.TM3CNT_LO:
                return this.gba.irq.timerRead(3);

            // SIO
            case IO.SIOCNT:
                return this.gba.sio.readSIOCNT();

            case IO.KEYINPUT:
                this.gba.keypad.pollGamepads();
                return this.gba.keypad.currentDown;
            case IO.KEYCNT:
                this.gba.logger.STUB('Unimplemented I/O register read: KEYCNT');
                return 0;

            case IO.BG0HOFS:
            case IO.BG0VOFS:
            case IO.BG1HOFS:
            case IO.BG1VOFS:
            case IO.BG2HOFS:
            case IO.BG2VOFS:
            case IO.BG3HOFS:
            case IO.BG3VOFS:
            case IO.BG2PA:
            case IO.BG2PB:
            case IO.BG2PC:
            case IO.BG2PD:
            case IO.BG3PA:
            case IO.BG3PB:
            case IO.BG3PC:
            case IO.BG3PD:
            case IO.BG2X_LO:
            case IO.BG2X_HI:
            case IO.BG2Y_LO:
            case IO.BG2Y_HI:
            case IO.BG3X_LO:
            case IO.BG3X_HI:
            case IO.BG3Y_LO:
            case IO.BG3Y_HI:
            case IO.WIN0H:
            case IO.WIN1H:
            case IO.WIN0V:
            case IO.WIN1V:
            case IO.BLDY:
            case IO.DMA0SAD_LO:
            case IO.DMA0SAD_HI:
            case IO.DMA0DAD_LO:
            case IO.DMA0DAD_HI:
            case IO.DMA0CNT_LO:
            case IO.DMA1SAD_LO:
            case IO.DMA1SAD_HI:
            case IO.DMA1DAD_LO:
            case IO.DMA1DAD_HI:
            case IO.DMA1CNT_LO:
            case IO.DMA2SAD_LO:
            case IO.DMA2SAD_HI:
            case IO.DMA2DAD_LO:
            case IO.DMA2DAD_HI:
            case IO.DMA2CNT_LO:
            case IO.DMA3SAD_LO:
            case IO.DMA3SAD_HI:
            case IO.DMA3DAD_LO:
            case IO.DMA3DAD_HI:
            case IO.DMA3CNT_LO:
            case IO.FIFO_A_LO:
            case IO.FIFO_A_HI:
            case IO.FIFO_B_LO:
            case IO.FIFO_B_HI:
                this.gba.logger.WARN('Read for write-only register: 0x' + offset.toString(16));
                return this.gba.mmu.badMemory.loadU16(0);

            case IO.MOSAIC:
                this.gba.logger.WARN('Read for write-only register: 0x' + offset.toString(16));
                return 0;

            case IO.SIOMULTI0:
            case IO.SIOMULTI1:
            case IO.SIOMULTI2:
            case IO.SIOMULTI3:
                return this.gba.sio.read((offset - IO.SIOMULTI0) >> 1);

            case IO.SIODATA8:
                this.gba.logger.STUB('Unimplemented SIO register read: 0x' + offset.toString(16));
                return 0;
            case IO.JOYCNT:
            case IO.JOYSTAT:
                this.gba.logger.STUB('Unimplemented JOY register read: 0x' + offset.toString(16));
                return 0;

            default:
                this.gba.logger.WARN('Bad I/O register read: 0x' + offset.toString(16));
                return this.gba.mmu.badMemory.loadU16(0);
        }
        return this.registers[offset >> 1];
    }

    store8(offset:number, value:number):void {
        switch (offset) {
            case IO.WININ:
                this.value & 0x3F;
                break;
            case IO.WININ | 1:
                this.value & 0x3F;
                break;
            case IO.WINOUT:
                this.value & 0x3F;
                break;
            case IO.WINOUT | 1:
                this.value & 0x3F;
                break;
            case IO.SOUND1CNT_LO:
            case IO.SOUND1CNT_LO | 1:
            case IO.SOUND1CNT_HI:
            case IO.SOUND1CNT_HI | 1:
            case IO.SOUND1CNT_X:
            case IO.SOUND1CNT_X | 1:
            case IO.SOUND2CNT_LO:
            case IO.SOUND2CNT_LO | 1:
            case IO.SOUND2CNT_HI:
            case IO.SOUND2CNT_HI | 1:
            case IO.SOUND3CNT_LO:
            case IO.SOUND3CNT_LO | 1:
            case IO.SOUND3CNT_HI:
            case IO.SOUND3CNT_HI | 1:
            case IO.SOUND3CNT_X:
            case IO.SOUND3CNT_X | 1:
            case IO.SOUND4CNT_LO:
            case IO.SOUND4CNT_LO | 1:
            case IO.SOUND4CNT_HI:
            case IO.SOUND4CNT_HI | 1:
            case IO.SOUNDCNT_LO:
            case IO.SOUNDCNT_LO | 1:
            case IO.SOUNDCNT_X:
            case IO.IF:
            case IO.IME:
                break;
            case IO.SOUNDBIAS | 1:
                this.STUB_REG('sound', offset);
                break;
            case IO.HALTCNT:
                value &= 0x80;
                if (!value) {
                    this.gba.irq.halt();
                } else {
                    this.gba.logger.STUB('Stop');
                }
                return;
            default:
                this.STUB_REG('8-bit I/O', offset);
                break;
        }

        if (offset & 1) {
            value <<= 8;
            value |= (this.registers[offset >> 1] & 0x00FF);
        } else {
            value &= 0x00FF;
            value |= (this.registers[offset >> 1] & 0xFF00);
        }
        this.store16(offset & 0xFFFFFFE, value);
    }

    store16(offset:number, value:number):void {
        switch (offset) {
            // Video
            case IO.DISPCNT:
                this.gba.video.renderPath.writeDisplayControl(value);
                break;
            case IO.DISPSTAT:
                value &= Video.DISPSTAT_MASK;
                this.gba.video.writeDisplayStat(value);
                break;
            case IO.BG0CNT:
                this.gba.video.renderPath.writeBackgroundControl(0, value);
                break;
            case IO.BG1CNT:
                this.gba.video.renderPath.writeBackgroundControl(1, value);
                break;
            case IO.BG2CNT:
                this.gba.video.renderPath.writeBackgroundControl(2, value);
                break;
            case IO.BG3CNT:
                this.gba.video.renderPath.writeBackgroundControl(3, value);
                break;
            case IO.BG0HOFS:
                this.gba.video.renderPath.writeBackgroundHOffset(0, value);
                break;
            case IO.BG0VOFS:
                this.gba.video.renderPath.writeBackgroundVOffset(0, value);
                break;
            case IO.BG1HOFS:
                this.gba.video.renderPath.writeBackgroundHOffset(1, value);
                break;
            case IO.BG1VOFS:
                this.gba.video.renderPath.writeBackgroundVOffset(1, value);
                break;
            case IO.BG2HOFS:
                this.gba.video.renderPath.writeBackgroundHOffset(2, value);
                break;
            case IO.BG2VOFS:
                this.gba.video.renderPath.writeBackgroundVOffset(2, value);
                break;
            case IO.BG3HOFS:
                this.gba.video.renderPath.writeBackgroundHOffset(3, value);
                break;
            case IO.BG3VOFS:
                this.gba.video.renderPath.writeBackgroundVOffset(3, value);
                break;
            case IO.BG2X_LO:
                this.gba.video.renderPath.writeBackgroundRefX(2, (this.registers[(offset >> 1) | 1] << 16) | value);
                break;
            case IO.BG2X_HI:
                this.gba.video.renderPath.writeBackgroundRefX(2, this.registers[(offset >> 1) ^ 1] | (value << 16));
                break;
            case IO.BG2Y_LO:
                this.gba.video.renderPath.writeBackgroundRefY(2, (this.registers[(offset >> 1) | 1] << 16) | value);
                break;
            case IO.BG2Y_HI:
                this.gba.video.renderPath.writeBackgroundRefY(2, this.registers[(offset >> 1) ^ 1] | (value << 16));
                break;
            case IO.BG2PA:
                this.gba.video.renderPath.writeBackgroundParamA(2, value);
                break;
            case IO.BG2PB:
                this.gba.video.renderPath.writeBackgroundParamB(2, value);
                break;
            case IO.BG2PC:
                this.gba.video.renderPath.writeBackgroundParamC(2, value);
                break;
            case IO.BG2PD:
                this.gba.video.renderPath.writeBackgroundParamD(2, value);
                break;
            case IO.BG3X_LO:
                this.gba.video.renderPath.writeBackgroundRefX(3, (this.registers[(offset >> 1) | 1] << 16) | value);
                break;
            case IO.BG3X_HI:
                this.gba.video.renderPath.writeBackgroundRefX(3, this.registers[(offset >> 1) ^ 1] | (value << 16));
                break;
            case IO.BG3Y_LO:
                this.gba.video.renderPath.writeBackgroundRefY(3, (this.registers[(offset >> 1) | 1] << 16) | value);
                break;
            case IO.BG3Y_HI:
                this.gba.video.renderPath.writeBackgroundRefY(3, this.registers[(offset >> 1) ^ 1] | (value << 16));
                break;
            case IO.BG3PA:
                this.gba.video.renderPath.writeBackgroundParamA(3, value);
                break;
            case IO.BG3PB:
                this.gba.video.renderPath.writeBackgroundParamB(3, value);
                break;
            case IO.BG3PC:
                this.gba.video.renderPath.writeBackgroundParamC(3, value);
                break;
            case IO.BG3PD:
                this.gba.video.renderPath.writeBackgroundParamD(3, value);
                break;
            case IO.WIN0H:
                this.gba.video.renderPath.writeWin0H(value);
                break;
            case IO.WIN1H:
                this.gba.video.renderPath.writeWin1H(value);
                break;
            case IO.WIN0V:
                this.gba.video.renderPath.writeWin0V(value);
                break;
            case IO.WIN1V:
                this.gba.video.renderPath.writeWin1V(value);
                break;
            case IO.WININ:
                value &= 0x3F3F;
                this.gba.video.renderPath.writeWinIn(value);
                break;
            case IO.WINOUT:
                value &= 0x3F3F;
                this.gba.video.renderPath.writeWinOut(value);
                break;
            case IO.BLDCNT:
                value &= 0x7FFF;
                this.gba.video.renderPath.writeBlendControl(value);
                break;
            case IO.BLDALPHA:
                value &= 0x1F1F;
                this.gba.video.renderPath.writeBlendAlpha(value);
                break;
            case IO.BLDY:
                value &= 0x001F;
                this.gba.video.renderPath.writeBlendY(value);
                break;
            case IO.MOSAIC:
                this.gba.video.renderPath.writeMosaic(value);
                break;

            // Sound
            case IO.SOUND1CNT_LO:
                value &= 0x007F;
                this.gba.audio.writeSquareChannelSweep(0, value);
                break;
            case IO.SOUND1CNT_HI:
                this.gba.audio.writeSquareChannelDLE(0, value);
                break;
            case IO.SOUND1CNT_X:
                value &= 0xC7FF;
                this.gba.audio.writeSquareChannelFC(0, value);
                value &= ~0x8000;
                break;
            case IO.SOUND2CNT_LO:
                this.gba.audio.writeSquareChannelDLE(1, value);
                break;
            case IO.SOUND2CNT_HI:
                value &= 0xC7FF;
                this.gba.audio.writeSquareChannelFC(1, value);
                value &= ~0x8000;
                break;
            case IO.SOUND3CNT_LO:
                value &= 0x00E0;
                this.gba.audio.writeChannel3Lo(value);
                break;
            case IO.SOUND3CNT_HI:
                value &= 0xE0FF;
                this.gba.audio.writeChannel3Hi(value);
                break;
            case IO.SOUND3CNT_X:
                value &= 0xC7FF;
                this.gba.audio.writeChannel3X(value);
                value &= ~0x8000;
                break;
            case IO.SOUND4CNT_LO:
                value &= 0xFF3F;
                this.gba.audio.writeChannel4LE(value);
                break;
            case IO.SOUND4CNT_HI:
                value &= 0xC0FF;
                this.gba.audio.writeChannel4FC(value);
                value &= ~0x8000;
                break;
            case IO.SOUNDCNT_LO:
                value &= 0xFF77;
                this.gba.audio.writeSoundControlLo(value);
                break;
            case IO.SOUNDCNT_HI:
                value &= 0xFF0F;
                this.gba.audio.writeSoundControlHi(value);
                break;
            case IO.SOUNDCNT_X:
                value &= 0x0080;
                this.gba.audio.writeEnable(!!value);
                break;
            case IO.WAVE_RAM0_LO:
            case IO.WAVE_RAM0_HI:
            case IO.WAVE_RAM1_LO:
            case IO.WAVE_RAM1_HI:
            case IO.WAVE_RAM2_LO:
            case IO.WAVE_RAM2_HI:
            case IO.WAVE_RAM3_LO:
            case IO.WAVE_RAM3_HI:
                this.gba.audio.writeWaveData(offset - IO.WAVE_RAM0_LO, value, 2);
                break;

            // DMA
            case IO.DMA0SAD_LO:
            case IO.DMA0DAD_LO:
            case IO.DMA1SAD_LO:
            case IO.DMA1DAD_LO:
            case IO.DMA2SAD_LO:
            case IO.DMA2DAD_LO:
            case IO.DMA3SAD_LO:
            case IO.DMA3DAD_LO:
                this.store32(offset, (this.registers[(offset >> 1) + 1] << 16) | value);
                return;

            case IO.DMA0SAD_HI:
            case IO.DMA0DAD_HI:
            case IO.DMA1SAD_HI:
            case IO.DMA1DAD_HI:
            case IO.DMA2SAD_HI:
            case IO.DMA2DAD_HI:
            case IO.DMA3SAD_HI:
            case IO.DMA3DAD_HI:
                this.store32(offset - 2, this.registers[(offset >> 1) - 1] | (value << 16));
                return;

            case IO.DMA0CNT_LO:
                this.gba.irq.dmaSetWordCount(0, value);
                break;
            case IO.DMA0CNT_HI:
                // The DMA registers need to set the values before writing the control, as writing the
                // control can synchronously trigger a DMA transfer
                this.registers[offset >> 1] = value & 0xFFE0;
                this.gba.irq.dmaWriteControl(0, value);
                return;
            case IO.DMA1CNT_LO:
                this.gba.irq.dmaSetWordCount(1, value);
                break;
            case IO.DMA1CNT_HI:
                this.registers[offset >> 1] = value & 0xFFE0;
                this.gba.irq.dmaWriteControl(1, value);
                return;
            case IO.DMA2CNT_LO:
                this.gba.irq.dmaSetWordCount(2, value);
                break;
            case IO.DMA2CNT_HI:
                this.registers[offset >> 1] = value & 0xFFE0;
                this.gba.irq.dmaWriteControl(2, value);
                return;
            case IO.DMA3CNT_LO:
                this.gba.irq.dmaSetWordCount(3, value);
                break;
            case IO.DMA3CNT_HI:
                this.registers[offset >> 1] = value & 0xFFE0;
                this.gba.irq.dmaWriteControl(3, value);
                return;

            // Timers
            case IO.TM0CNT_LO:
                this.gba.irq.timerSetReload(0, <boolean><any>(value & 0xFFFF));
                return;
            case IO.TM1CNT_LO:
                this.gba.irq.timerSetReload(1, <boolean><any>(value & 0xFFFF));
                return;
            case IO.TM2CNT_LO:
                this.gba.irq.timerSetReload(2, <boolean><any>(value & 0xFFFF));
                return;
            case IO.TM3CNT_LO:
                this.gba.irq.timerSetReload(3, <boolean><any>(value & 0xFFFF));
                return;

            case IO.TM0CNT_HI:
                value &= 0x00C7;
                this.gba.irq.timerWriteControl(0, value);
                break;
            case IO.TM1CNT_HI:
                value &= 0x00C7;
                this.gba.irq.timerWriteControl(1, value);
                break;
            case IO.TM2CNT_HI:
                value &= 0x00C7;
                this.gba.irq.timerWriteControl(2, value);
                break;
            case IO.TM3CNT_HI:
                value &= 0x00C7;
                this.gba.irq.timerWriteControl(3, value);
                break;

            // SIO
            case IO.SIOMULTI0:
            case IO.SIOMULTI1:
            case IO.SIOMULTI2:
            case IO.SIOMULTI3:
            case IO.SIODATA8:
                this.STUB_REG('SIO', offset);
                break;
            case IO.RCNT:
                this.gba.sio.setMode(((value >> 12) & 0xC) | ((this.registers[IO.SIOCNT >> 1] >> 12) & 0x3));
                this.gba.sio.writeRCNT(value);
                break;
            case IO.SIOCNT:
                this.gba.sio.setMode(((value >> 12) & 0x3) | ((this.registers[IO.RCNT >> 1] >> 12) & 0xC));
                this.gba.sio.writeSIOCNT(value);
                return;
            case IO.JOYCNT:
            case IO.JOYSTAT:
                this.STUB_REG('JOY', offset);
                break;

            // Misc
            case IO.IE:
                value &= 0x3FFF;
                this.gba.irq.setInterruptsEnabled(value);
                break;
            case IO.IF:
                this.gba.irq.dismissIRQs(value);
                return;
            case IO.WAITCNT:
                value &= 0xDFFF;
                this.gba.mmu.adjustTimings(value);
                break;
            case IO.IME:
                value &= 0x0001;
                this.gba.irq.masterEnable(<boolean><any>value);
                break;
            default:
                this.STUB_REG('I/O', offset);
        }
        this.registers[offset >> 1] = value;
    }

    store32(offset:number, value:number):void {
        switch (offset) {
            case IO.BG2X_LO:
                value &= 0x0FFFFFFF;
                this.gba.video.renderPath.writeBackgroundRefX(2, value);
                break;
            case IO.BG2Y_LO:
                value &= 0x0FFFFFFF;
                this.gba.video.renderPath.writeBackgroundRefY(2, value);
                break;
            case IO.BG3X_LO:
                value &= 0x0FFFFFFF;
                this.gba.video.renderPath.writeBackgroundRefX(3, value);
                break;
            case IO.BG3Y_LO:
                value &= 0x0FFFFFFF;
                this.gba.video.renderPath.writeBackgroundRefY(3, value);
                break;
            case IO.DMA0SAD_LO:
                this.gba.irq.dmaSetSourceAddress(0, value);
                break;
            case IO.DMA0DAD_LO:
                this.gba.irq.dmaSetDestAddress(0, value);
                break;
            case IO.DMA1SAD_LO:
                this.gba.irq.dmaSetSourceAddress(1, value);
                break;
            case IO.DMA1DAD_LO:
                this.gba.irq.dmaSetDestAddress(1, value);
                break;
            case IO.DMA2SAD_LO:
                this.gba.irq.dmaSetSourceAddress(2, value);
                break;
            case IO.DMA2DAD_LO:
                this.gba.irq.dmaSetDestAddress(2, value);
                break;
            case IO.DMA3SAD_LO:
                this.gba.irq.dmaSetSourceAddress(3, value);
                break;
            case IO.DMA3DAD_LO:
                this.gba.irq.dmaSetDestAddress(3, value);
                break;
            case IO.FIFO_A_LO:
                this.gba.audio.appendToFifoA(value);
                return;
            case IO.FIFO_B_LO:
                this.gba.audio.appendToFifoB(value);
                return;

            // High bits of this write should be ignored
            case IO.IME:
                this.store16(offset, value & 0xFFFF);
                return;
            case IO.JOY_RECV:
            case IO.JOY_TRANS:
                this.STUB_REG('JOY', offset);
                return;
            default:
                this.store16(offset, value & 0xFFFF);
                this.store16(offset | 2, value >>> 16);
                return;
        }

        this.registers[offset >> 1] = value & 0xFFFF;
        this.registers[(offset >> 1) + 1] = value >>> 16;
    }

    invalidatePage(address:number):void {
    }

    STUB_REG(type:string, offset:number):void {
        this.gba.logger.STUB('Unimplemented ' + type + ' register write: ' + offset.toString(16));
    }
}
}