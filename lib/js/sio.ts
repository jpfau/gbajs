/// <reference path="util.ts"/>

class GameBoyAdvanceSIO {
    SIO_NORMAL_8 = 0;
    SIO_NORMAL_32 = 1;
    SIO_MULTI = 2;
    SIO_UART = 3;
    SIO_GPIO = 8;
    SIO_JOYBUS = 12;

    BAUD = [ 9600, 38400, 57600, 115200 ];

    mode;
    sd:boolean;
    irq;
    multiplayer;
    linkLayer;

    clear() {
        this.mode = this.SIO_GPIO;
        this.sd = false;

        this.irq = false;
        this.multiplayer = {
            baud: 0,
            si: 0,
            id: 0,
            error: 0,
            busy: 0,

            states: [ 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF ]
        };

        this.linkLayer = null;
    }

    gba:GameBoyAdvance;

    setMode(mode) {
        if (mode & 0x8) {
            mode &= 0xC;
        } else {
            mode &= 0x3;
        }
        this.mode = mode;

        this.gba.logger.INFO('Setting SIO mode to ' + hex(mode, 1));
    }

    writeRCNT(value) {
        if (this.mode != this.SIO_GPIO) {
            return;
        }

        this.gba.logger.STUB('General purpose serial not supported');
    }

    writeSIOCNT(value) {
        switch (this.mode) {
            case this.SIO_NORMAL_8:
                this.gba.logger.STUB('8-bit transfer unsupported');
                break;
            case this.SIO_NORMAL_32:
                this.gba.logger.STUB('32-bit transfer unsupported');
                break;
            case this.SIO_MULTI:
                this.multiplayer.baud = value & 0x0003;
                if (this.linkLayer) {
                    this.linkLayer.setBaud(this.BAUD[this.multiplayer.baud]);
                }

                if (!this.multiplayer.si) {
                    this.multiplayer.busy = value & 0x0080;
                    if (this.linkLayer && this.multiplayer.busy) {
                        this.linkLayer.startMultiplayerTransfer();
                    }
                }
                this.irq = value & 0x4000;
                break;
            case this.SIO_UART:
                this.gba.logger.STUB('UART unsupported');
                break;
            case this.SIO_GPIO:
                // This register isn't used in general-purpose mode
                break;
            case this.SIO_JOYBUS:
                this.gba.logger.STUB('JOY BUS unsupported');
                break;
        }
    }

    readSIOCNT() {
        var value = (this.mode << 12) & 0xFFFF;
        switch (this.mode) {
            case this.SIO_NORMAL_8:
                this.gba.logger.STUB('8-bit transfer unsupported');
                break;
            case this.SIO_NORMAL_32:
                this.gba.logger.STUB('32-bit transfer unsupported');
                break;
            case this.SIO_MULTI:
                value |= this.multiplayer.baud;
                value |= this.multiplayer.si;
                value |= (<any>this.sd) << 3;
                value |= this.multiplayer.id << 4;
                value |= this.multiplayer.error;
                value |= this.multiplayer.busy;
                value |= (<any>!!this.multiplayer.irq) << 14;
                break;
            case this.SIO_UART:
                this.gba.logger.STUB('UART unsupported');
                break;
            case this.SIO_GPIO:
                // This register isn't used in general-purpose mode
                break;
            case this.SIO_JOYBUS:
                this.gba.logger.STUB('JOY BUS unsupported');
                break;
        }
        return value;
    }

    read(slot) {
        switch (this.mode) {
            case this.SIO_NORMAL_32:
                this.gba.logger.STUB('32-bit transfer unsupported');
                break;
            case this.SIO_MULTI:
                return this.multiplayer.states[slot];
            case this.SIO_UART:
                this.gba.logger.STUB('UART unsupported');
                break;
            default:
                this.gba.logger.WARN('Reading from transfer register in unsupported mode');
                break;
        }
        return 0;
    }
}