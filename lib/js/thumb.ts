/// <reference path="core.ts"/>

class ARMCoreThumb {

    cpu:ARMCore;

    constructor(cpu) {
        this.cpu = cpu;
    }

    constructADC(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var m = (gprs[rm] >>> 0) + <any>cpu.cpsr.C;
            var oldD = gprs[rd];
            var d = (oldD >>> 0) + m;
            var oldDn = <any>(oldD >> 31);
            var dn = <any>(d >> 31);
            var mn = m >> 31;
            cpu.cpsr.N = dn;
            cpu.cpsr.Z = !(d & 0xFFFFFFFF);
            cpu.cpsr.C = d > 0xFFFFFFFF;
            cpu.cpsr.V = oldDn == mn && oldDn != dn && mn != dn;
            gprs[rd] = d;
        };
    }

    constructADD1(rd, rn, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var d = (gprs[rn] >>> 0) + immediate;
            cpu.cpsr.N = <any>(d >> 31);
            cpu.cpsr.Z = !(d & 0xFFFFFFFF);
            cpu.cpsr.C = d > 0xFFFFFFFF;
            cpu.cpsr.V = !(gprs[rn] >> 31) && ((gprs[rn] >> 31 ^ d) >> 31) && (<any>(d >> 31));
            gprs[rd] = d;
        };
    }

    constructADD2(rn, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var d = (gprs[rn] >>> 0) + immediate;
            cpu.cpsr.N = <any>(d >> 31);
            cpu.cpsr.Z = !(d & 0xFFFFFFFF);
            cpu.cpsr.C = d > 0xFFFFFFFF;
            cpu.cpsr.V = <any>(!(gprs[rn] >> 31) && ((gprs[rn] ^ d) >> 31) && ((immediate ^ d) >> 31));
            gprs[rn] = d;
        };
    }

    constructADD3(rd, rn, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var d = (gprs[rn] >>> 0) + (gprs[rm] >>> 0);
            cpu.cpsr.N = <any>(d >> 31);
            cpu.cpsr.Z = !(d & 0xFFFFFFFF);
            cpu.cpsr.C = d > 0xFFFFFFFF;
            cpu.cpsr.V = <any>(!((gprs[rn] ^ gprs[rm]) >> 31) && ((gprs[rn] ^ d) >> 31) && ((gprs[rm] ^ d) >> 31));
            gprs[rd] = d;
        };
    }

    constructADD4(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] += gprs[rm];
        };
    }

    constructADD5(rd, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = (gprs[Register.PC] & 0xFFFFFFFC) + immediate;
        };
    }

    constructADD6(rd, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = gprs[Register.SP] + immediate;
        };
    }

    constructADD7(immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[Register.SP] += immediate;
        };
    }

    constructAND(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] &= gprs[rm];
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructASR1(rd, rm, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            if (immediate == 0) {
                cpu.cpsr.C = <any>(gprs[rm] >> 31);
                if (cpu.cpsr.C) {
                    gprs[rd] = 0xFFFFFFFF;
                } else {
                    gprs[rd] = 0;
                }
            } else {
                cpu.cpsr.C = <any>(gprs[rm] & (1 << (immediate - 1)));
                gprs[rd] = gprs[rm] >> immediate;
            }
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructASR2(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var rs = gprs[rm] & 0xFF;
            if (rs) {
                if (rs < 32) {
                    cpu.cpsr.C = <any>(gprs[rd] & (1 << (rs - 1)));
                    gprs[rd] >>= rs;
                } else {
                    cpu.cpsr.C = <any>(gprs[rd] >> 31);
                    if (cpu.cpsr.C) {
                        gprs[rd] = 0xFFFFFFFF;
                    } else {
                        gprs[rd] = 0;
                    }
                }
            }
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructB1(immediate, condOp) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            if (condOp()) {
                gprs[Register.PC] += immediate;
            }
        };
    }

    constructB2(immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[Register.PC] += immediate;
        };
    }

    constructBIC(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] &= ~gprs[rm];
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructBL1(immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[Register.LR] = gprs[Register.PC] + immediate;
        }
    }

    constructBL2(immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var pc = gprs[Register.PC];
            gprs[Register.PC] = gprs[Register.LR] + (immediate << 1);
            gprs[Register.LR] = pc - 1;
        }
    }

    constructBX(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            cpu.switchExecMode(gprs[rm] & 0x00000001);
            var misalign = 0;
            if (rm == 15) {
                misalign = gprs[rm] & 0x00000002;
            }
            gprs[Register.PC] = gprs[rm] & 0xFFFFFFFE - misalign;
        };
    }

    constructCMN(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var aluOut = (gprs[rd] >>> 0) + (gprs[rm] >>> 0);
            cpu.cpsr.N = <any>(aluOut >> 31);
            cpu.cpsr.Z = !(aluOut & 0xFFFFFFFF);
            cpu.cpsr.C = aluOut > 0xFFFFFFFF;
            cpu.cpsr.V = (gprs[rd] >> 31) == (gprs[rm] >> 31) &&
                (gprs[rd] >> 31) != (aluOut >> 31) &&
                (gprs[rm] >> 31) != (aluOut >> 31);
        };
    }

    constructCMP1(rn, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var aluOut = gprs[rn] - immediate;
            cpu.cpsr.N = <any>(aluOut >> 31);
            cpu.cpsr.Z = !(aluOut & 0xFFFFFFFF);
            cpu.cpsr.C = (gprs[rn] >>> 0) >= immediate;
            cpu.cpsr.V = <any>((gprs[rn] >> 31) && ((gprs[rn] ^ aluOut) >> 31));
        };
    }

    constructCMP2(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var d = gprs[rd];
            var m = gprs[rm];
            var aluOut = d - m;
            var an = aluOut >> 31;
            var dn = <any>(d >> 31);
            cpu.cpsr.N = <any>(an);
            cpu.cpsr.Z = !(aluOut & 0xFFFFFFFF);
            cpu.cpsr.C = (d >>> 0) >= (m >>> 0);
            cpu.cpsr.V = dn != (m >> 31) && dn != an;
        };
    }

    constructCMP3(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var aluOut = gprs[rd] - gprs[rm];
            cpu.cpsr.N = <any>(aluOut >> 31);
            cpu.cpsr.Z = !(aluOut & 0xFFFFFFFF);
            cpu.cpsr.C = (gprs[rd] >>> 0) >= (gprs[rm] >>> 0);
            cpu.cpsr.V = <any>(((gprs[rd] ^ gprs[rm]) >> 31) && ((gprs[rd] ^ aluOut) >> 31));
        };
    }

    constructEOR(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] ^= gprs[rm];
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructLDMIA(rn, rs) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var address = gprs[rn];
            var total = 0;
            var m, i;
            for (m = 0x01, i = 0; i < 8; m <<= 1, ++i) {
                if (rs & m) {
                    gprs[i] = cpu.mmu.load32(address);
                    address += 4;
                    ++total;
                }
            }
            cpu.mmu.waitMulti32(address, total);
            if (!((1 << rn) & rs)) {
                gprs[rn] = address;
            }
        };
    }

    constructLDR1(rd, rn, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var n = gprs[rn] + immediate;
            gprs[rd] = cpu.mmu.load32(n);
            cpu.mmu.wait32(n);
            ++cpu.cycles;
        };
    }

    constructLDR2(rd, rn, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = cpu.mmu.load32(gprs[rn] + gprs[rm]);
            cpu.mmu.wait32(gprs[rn] + gprs[rm]);
            ++cpu.cycles;
        }
    }

    constructLDR3(rd, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = cpu.mmu.load32((gprs[Register.PC] & 0xFFFFFFFC) + immediate);
            cpu.mmu.wait32(gprs[Register.PC]);
            ++cpu.cycles;
        };
    }

    constructLDR4(rd, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = cpu.mmu.load32(gprs[Register.SP] + immediate);
            cpu.mmu.wait32(gprs[Register.SP] + immediate);
            ++cpu.cycles;
        };
    }

    constructLDRB1(rd, rn, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            var n = gprs[rn] + immediate;
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = cpu.mmu.loadU8(n);
            cpu.mmu.wait(n);
            ++cpu.cycles;
        };
    }

    constructLDRB2(rd, rn, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = cpu.mmu.loadU8(gprs[rn] + gprs[rm]);
            cpu.mmu.wait(gprs[rn] + gprs[rm]);
            ++cpu.cycles;
        };
    }

    constructLDRH1(rd, rn, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            var n = gprs[rn] + immediate;
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = cpu.mmu.loadU16(n);
            cpu.mmu.wait(n);
            ++cpu.cycles;
        };
    }

    constructLDRH2(rd, rn, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = cpu.mmu.loadU16(gprs[rn] + gprs[rm]);
            cpu.mmu.wait(gprs[rn] + gprs[rm]);
            ++cpu.cycles;
        };
    }

    constructLDRSB(rd, rn, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = cpu.mmu.load8(gprs[rn] + gprs[rm]);
            cpu.mmu.wait(gprs[rn] + gprs[rm]);
            ++cpu.cycles;
        };
    }

    constructLDRSH(rd, rn, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = cpu.mmu.load16(gprs[rn] + gprs[rm]);
            cpu.mmu.wait(gprs[rn] + gprs[rm]);
            ++cpu.cycles;
        };
    }

    constructLSL1(rd, rm, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            if (immediate == 0) {
                gprs[rd] = gprs[rm];
            } else {
                cpu.cpsr.C = <any>(gprs[rm] & (1 << (32 - immediate)));
                gprs[rd] = gprs[rm] << immediate;
            }
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructLSL2(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var rs = gprs[rm] & 0xFF;
            if (rs) {
                if (rs < 32) {
                    cpu.cpsr.C = <any>(gprs[rd] & (1 << (32 - rs)));
                    gprs[rd] <<= rs;
                } else {
                    if (rs > 32) {
                        cpu.cpsr.C = false;
                    } else {
                        cpu.cpsr.C = <any>(gprs[rd] & 0x00000001);
                    }
                    gprs[rd] = 0;
                }
            }
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructLSR1(rd, rm, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            if (immediate == 0) {
                cpu.cpsr.C = <any>(gprs[rm] >> 31);
                gprs[rd] = 0;
            } else {
                cpu.cpsr.C = <any>(gprs[rm] & (1 << (immediate - 1)));
                gprs[rd] = gprs[rm] >>> immediate;
            }
            cpu.cpsr.N = false;
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructLSR2(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var rs = gprs[rm] & 0xFF;
            if (rs) {
                if (rs < 32) {
                    cpu.cpsr.C = <any>(gprs[rd] & (1 << (rs - 1)));
                    gprs[rd] >>>= rs;
                } else {
                    if (rs > 32) {
                        cpu.cpsr.C = false;
                    } else {
                        cpu.cpsr.C = <any>(gprs[rd] >> 31);
                    }
                    gprs[rd] = 0;
                }
            }
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructMOV1(rn, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rn] = immediate;
            cpu.cpsr.N = <any>(immediate >> 31);
            cpu.cpsr.Z = !(immediate & 0xFFFFFFFF);
        };
    }

    constructMOV2(rd, rn, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var d = gprs[rn];
            cpu.cpsr.N = <any>(d >> 31);
            cpu.cpsr.Z = !(d & 0xFFFFFFFF);
            cpu.cpsr.C = false;
            cpu.cpsr.V = false;
            gprs[rd] = d;
        };
    }

    constructMOV3(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = gprs[rm];
        };
    }

    constructMUL(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            cpu.mmu.waitMul(gprs[rm]);
            if ((gprs[rm] & 0xFFFF0000) && (gprs[rd] & 0xFFFF0000)) {
                // Our data type is a double--we'll lose bits if we do it all at once!
                var hi = ((gprs[rd] & 0xFFFF0000) * gprs[rm]) & 0xFFFFFFFF;
                var lo = ((gprs[rd] & 0x0000FFFF) * gprs[rm]) & 0xFFFFFFFF;
                gprs[rd] = (hi + lo) & 0xFFFFFFFF;
            } else {
                gprs[rd] *= gprs[rm];
            }
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructMVN(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] = ~gprs[rm];
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructNEG(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var d = -gprs[rm];
            cpu.cpsr.N = <any>(d >> 31);
            cpu.cpsr.Z = !(d & 0xFFFFFFFF);
            cpu.cpsr.C = 0 >= (d >>> 0);
            cpu.cpsr.V = (gprs[rm] >> 31) && (<any>(d >> 31));
            gprs[rd] = d;
        };
    }

    constructORR(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            gprs[rd] |= gprs[rm];
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructPOP(rs, r) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            ++cpu.cycles;
            var address = gprs[Register.SP];
            var total = 0;
            var m, i;
            for (m = 0x01, i = 0; i < 8; m <<= 1, ++i) {
                if (rs & m) {
                    cpu.mmu.waitSeq32(address);
                    gprs[i] = cpu.mmu.load32(address);
                    address += 4;
                    ++total;
                }
            }
            if (r) {
                gprs[Register.PC] = cpu.mmu.load32(address) & 0xFFFFFFFE;
                address += 4;
                ++total;
            }
            cpu.mmu.waitMulti32(address, total);
            gprs[Register.SP] = address;
        };
    }

    constructPUSH(rs, r) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            var address = gprs[Register.SP] - 4;
            var total = 0;
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            if (r) {
                cpu.mmu.store32(address, gprs[Register.LR]);
                address -= 4;
                ++total;
            }
            var m, i;
            for (m = 0x80, i = 7; m; m >>= 1, --i) {
                if (rs & m) {
                    cpu.mmu.store32(address, gprs[i]);
                    address -= 4;
                    ++total;
                    break;
                }
            }
            for (m >>= 1, --i; m; m >>= 1, --i) {
                if (rs & m) {
                    cpu.mmu.store32(address, gprs[i]);
                    address -= 4;
                    ++total;
                }
            }
            cpu.mmu.waitMulti32(address, total);
            gprs[Register.SP] = address + 4;
        };
    }

    constructROR(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var rs = gprs[rm] & 0xFF;
            if (rs) {
                var r4 = rs & 0x1F;
                if (r4 > 0) {
                    cpu.cpsr.C = <any>(gprs[rd] & (1 << (r4 - 1)));
                    gprs[rd] = (gprs[rd] >>> r4) | (gprs[rd] << (32 - r4));
                } else {
                    cpu.cpsr.C = <any>(gprs[rd] >> 31);
                }
            }
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
        };
    }

    constructSBC(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var m = (gprs[rm] >>> 0) + <any>!cpu.cpsr.C;
            var d = (gprs[rd] >>> 0) - m;
            cpu.cpsr.N = <any>(d >> 31);
            cpu.cpsr.Z = !(d & 0xFFFFFFFF);
            cpu.cpsr.C = (gprs[rd] >>> 0) >= (d >>> 0);
            cpu.cpsr.V = <any>(((gprs[rd] ^ m) >> 31) && ((gprs[rd] ^ d) >> 31));
            gprs[rd] = d;
        };
    }

    constructSTMIA(rn, rs) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.wait(gprs[Register.PC]);
            var address = gprs[rn];
            var total = 0;
            var m, i;
            for (m = 0x01, i = 0; i < 8; m <<= 1, ++i) {
                if (rs & m) {
                    cpu.mmu.store32(address, gprs[i]);
                    address += 4;
                    ++total;
                    break;
                }
            }
            for (m <<= 1, ++i; i < 8; m <<= 1, ++i) {
                if (rs & m) {
                    cpu.mmu.store32(address, gprs[i]);
                    address += 4;
                    ++total;
                }
            }
            cpu.mmu.waitMulti32(address, total);
            gprs[rn] = address;
        };
    }

    constructSTR1(rd, rn, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            var n = gprs[rn] + immediate;
            cpu.mmu.store32(n, gprs[rd]);
            cpu.mmu.wait(gprs[Register.PC]);
            cpu.mmu.wait32(n);
        };
    }

    constructSTR2(rd, rn, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.store32(gprs[rn] + gprs[rm], gprs[rd]);
            cpu.mmu.wait(gprs[Register.PC]);
            cpu.mmu.wait32(gprs[rn] + gprs[rm]);
        };
    }

    constructSTR3(rd, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.store32(gprs[Register.SP] + immediate, gprs[rd]);
            cpu.mmu.wait(gprs[Register.PC]);
            cpu.mmu.wait32(gprs[Register.SP] + immediate);
        };
    }

    constructSTRB1(rd, rn, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            var n = gprs[rn] + immediate;
            cpu.mmu.store8(n, gprs[rd]);
            cpu.mmu.wait(gprs[Register.PC]);
            cpu.mmu.wait(n);
        };
    }

    constructSTRB2(rd, rn, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.store8(gprs[rn] + gprs[rm], gprs[rd]);
            cpu.mmu.wait(gprs[Register.PC]);
            cpu.mmu.wait(gprs[rn] + gprs[rm]);
        }
    }

    constructSTRH1(rd, rn, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            var n = gprs[rn] + immediate;
            cpu.mmu.store16(n, gprs[rd]);
            cpu.mmu.wait(gprs[Register.PC]);
            cpu.mmu.wait(n);
        };
    }

    constructSTRH2(rd, rn, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.store16(gprs[rn] + gprs[rm], gprs[rd]);
            cpu.mmu.wait(gprs[Register.PC]);
            cpu.mmu.wait(gprs[rn] + gprs[rm]);
        }
    }

    constructSUB1(rd, rn, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var d = gprs[rn] - immediate;
            cpu.cpsr.N = <any>(d >> 31);
            cpu.cpsr.Z = !(d & 0xFFFFFFFF);
            cpu.cpsr.C = (gprs[rn] >>> 0) >= immediate;
            cpu.cpsr.V = <any>((gprs[rn] >> 31) && ((gprs[rn] ^ d) >> 31));
            gprs[rd] = d;
        };
    }

    constructSUB2(rn, immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var d = gprs[rn] - immediate;
            cpu.cpsr.N = <any>(d >> 31);
            cpu.cpsr.Z = !(d & 0xFFFFFFFF);
            cpu.cpsr.C = (gprs[rn] >>> 0) >= immediate;
            cpu.cpsr.V = <any>((gprs[rn] >> 31) && ((gprs[rn] ^ d) >> 31));
            gprs[rn] = d;
        };
    }

    constructSUB3(rd, rn, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var d = gprs[rn] - gprs[rm];
            cpu.cpsr.N = <any>(d >> 31);
            cpu.cpsr.Z = !(d & 0xFFFFFFFF);
            cpu.cpsr.C = (gprs[rn] >>> 0) >= (gprs[rm] >>> 0);
            cpu.cpsr.V = (gprs[rn] >> 31) != (gprs[rm] >> 31) &&
                (gprs[rn] >> 31) != (<any>(d >> 31));
            gprs[rd] = d;
        };
    }

    constructSWI(immediate) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.irq.swi(immediate);
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
        }
    }

    constructTST(rd, rm) {
        var cpu = this.cpu;
        var gprs = cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch(gprs[Register.PC]);
            var aluOut = gprs[rd] & gprs[rm];
            cpu.cpsr.N = <any>(aluOut >> 31);
            cpu.cpsr.Z = !(aluOut & 0xFFFFFFFF);
        };
    }
}