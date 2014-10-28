/// <reference path="core.ts"/>

class ARMCoreArm {

    cpu:ARMCore;

    addressingMode23Immediate:any[];
    addressingMode23Register:any[];
    addressingMode2RegisterShifted:any[];

    constructor(cpu:ARMCore) {
        this.cpu = cpu;

        this.addressingMode23Immediate = [
            // 000x0
            (rn, offset, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    var addr = gprs[rn];
                    if (!condOp || condOp()) {
                        gprs[rn] -= offset
                    }
                    return addr
                };
                address.writesPC = rn == Register.PC;
                return address
            },

            // 000xW
            null,

            null,
            null,

            // 00Ux0
            (rn, offset, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    var addr = gprs[rn];
                    if (!condOp || condOp()) {
                        gprs[rn] += offset
                    }
                    return addr
                };
                address.writesPC = rn == Register.PC;
                return address
            },

            // 00UxW
            null,

            null,
            null,

            // 0P0x0
            (rn, offset, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    return gprs[rn] - offset
                };
                address.writesPC = false;
                return address
            },

            // 0P0xW
            (rn, offset, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    var addr = gprs[rn] - offset;
                    if (!condOp || condOp()) {
                        gprs[rn] = addr
                    }
                    return addr
                };
                address.writesPC = rn == Register.PC;
                return address
            },

            null,
            null,

            // 0PUx0
            (rn, offset, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    return gprs[rn] + offset
                };
                address.writesPC = false;
                return address
            },

            // 0PUxW
            (rn, offset, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    var addr = gprs[rn] + offset;
                    if (!condOp || condOp()) {
                        gprs[rn] = addr
                    }
                    return addr
                };
                address.writesPC = rn == Register.PC;
                return address
            },

            null,
            null
        ];

        this.addressingMode23Register = [
            // I00x0
            (rn, rm, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    var addr = gprs[rn];
                    if (!condOp || condOp()) {
                        gprs[rn] -= gprs[rm]
                    }
                    return addr
                };
                address.writesPC = rn == Register.PC;
                return address
            },

            // I00xW
            null,

            null,
            null,

            // I0Ux0
            (rn, rm, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    var addr = gprs[rn];
                    if (!condOp || condOp()) {
                        gprs[rn] += gprs[rm]
                    }
                    return addr
                };
                address.writesPC = rn == Register.PC;
                return address
            },

            // I0UxW
            null,

            null,
            null,

            // IP0x0
            (rn, rm, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    return gprs[rn] - gprs[rm]
                };
                address.writesPC = false;
                return address
            },

            // IP0xW
            (rn, rm, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    var addr = gprs[rn] - gprs[rm];
                    if (!condOp || condOp()) {
                        gprs[rn] = addr
                    }
                    return addr
                };
                address.writesPC = rn == Register.PC;
                return address
            },

            null,
            null,

            // IPUx0
            (rn, rm, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    return gprs[rn] + gprs[rm]
                };
                address.writesPC = false;
                return address
            },

            // IPUxW
            (rn, rm, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    var addr = gprs[rn] + gprs[rm];
                    if (!condOp || condOp()) {
                        gprs[rn] = addr
                    }
                    return addr
                };
                address.writesPC = rn == Register.PC;
                return address
            },

            null,
            null
        ];

        this.addressingMode2RegisterShifted = [
            // I00x0
            (rn, shiftOp, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    var addr = gprs[rn];
                    if (!condOp || condOp()) {
                        shiftOp();
                        gprs[rn] -= cpu.shifterOperand
                    }
                    return addr
                };
                address.writesPC = rn == Register.PC;
                return address
            },

            // I00xW
            null,

            null,
            null,

            // I0Ux0
            (rn, shiftOp, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    var addr = gprs[rn];
                    if (!condOp || condOp()) {
                        shiftOp();
                        gprs[rn] += cpu.shifterOperand
                    }
                    return addr
                };
                address.writesPC = rn == Register.PC;
                return address
            },
            // I0UxW
            null,

            null,
            null,

            // IP0x0
            (rn, shiftOp, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    shiftOp();
                    return gprs[rn] - cpu.shifterOperand
                };
                address.writesPC = false;
                return address
            },

            // IP0xW
            (rn, shiftOp, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    shiftOp();
                    var addr = gprs[rn] - cpu.shifterOperand;
                    if (!condOp || condOp()) {
                        gprs[rn] = addr
                    }
                    return addr
                };
                address.writesPC = rn == Register.PC;
                return address
            },

            null,
            null,

            // IPUx0
            (rn, shiftOp, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    shiftOp();
                    return gprs[rn] + cpu.shifterOperand
                };
                address.writesPC = false;
                return address
            },

            // IPUxW
            (rn, shiftOp, condOp) => {
                var gprs = cpu.gprs;
                var address:any = () => {
                    shiftOp();
                    var addr = gprs[rn] + cpu.shifterOperand;
                    if (!condOp || condOp()) {
                        gprs[rn] = addr
                    }
                    return addr
                };
                address.writePC = rn == Register.PC;
                return address
            },

            null,
            null
        ];
    }

    constructAddressingMode1ASR(rs, rm) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            ++cpu.cycles;
            var shift = gprs[rs];
            if (rs == Register.PC) {
                shift += 4
            }
            shift &= 0xFF;
            var shiftVal = gprs[rm];
            if (rm == Register.PC) {
                shiftVal += 4
            }
            if (shift == 0) {
                cpu.shifterOperand = shiftVal;
                cpu.shifterCarryOut = <any>cpu.cpsr.C
            } else if (shift < 32) {
                cpu.shifterOperand = shiftVal >> shift;
                cpu.shifterCarryOut = shiftVal & (1 << (shift - 1))
            } else if (gprs[rm] >> 31) {
                cpu.shifterOperand = 0xFFFFFFFF;
                cpu.shifterCarryOut = 0x80000000
            } else {
                cpu.shifterOperand = 0;
                cpu.shifterCarryOut = 0
            }
        }
    }

    constructAddressingMode1Immediate(immediate) {
        var cpu = this.cpu;
        return () => {
            cpu.shifterOperand = immediate;
            cpu.shifterCarryOut = <any>cpu.cpsr.C
        }
    }

    constructAddressingMode1ImmediateRotate(immediate, rotate) {
        var cpu = this.cpu;
        return () => {
            cpu.shifterOperand = (immediate >>> rotate) | (immediate << (32 - rotate));
            cpu.shifterCarryOut = cpu.shifterOperand >> 31
        }
    }

    constructAddressingMode1LSL(rs, rm) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            ++cpu.cycles;
            var shift = gprs[rs];
            if (rs == Register.PC) {
                shift += 4
            }
            shift &= 0xFF;
            var shiftVal = gprs[rm];
            if (rm == Register.PC) {
                shiftVal += 4
            }
            if (shift == 0) {
                cpu.shifterOperand = shiftVal;
                cpu.shifterCarryOut = <any>cpu.cpsr.C
            } else if (shift < 32) {
                cpu.shifterOperand = shiftVal << shift;
                cpu.shifterCarryOut = shiftVal & (1 << (32 - shift))
            } else if (shift == 32) {
                cpu.shifterOperand = 0;
                cpu.shifterCarryOut = shiftVal & 1
            } else {
                cpu.shifterOperand = 0;
                cpu.shifterCarryOut = 0
            }
        }
    }

    constructAddressingMode1LSR(rs, rm) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            ++cpu.cycles;
            var shift = gprs[rs];
            if (rs == Register.PC) {
                shift += 4
            }
            shift &= 0xFF;
            var shiftVal = gprs[rm];
            if (rm == Register.PC) {
                shiftVal += 4
            }
            if (shift == 0) {
                cpu.shifterOperand = shiftVal;
                cpu.shifterCarryOut = <any>cpu.cpsr.C
            } else if (shift < 32) {
                cpu.shifterOperand = shiftVal >>> shift;
                cpu.shifterCarryOut = shiftVal & (1 << (shift - 1))
            } else if (shift == 32) {
                cpu.shifterOperand = 0;
                cpu.shifterCarryOut = shiftVal >> 31
            } else {
                cpu.shifterOperand = 0;
                cpu.shifterCarryOut = 0
            }
        }
    }

    constructAddressingMode1ROR(rs, rm) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            ++cpu.cycles;
            var shift = gprs[rs];
            if (rs == Register.PC) {
                shift += 4
            }
            shift &= 0xFF;
            var shiftVal = gprs[rm];
            if (rm == Register.PC) {
                shiftVal += 4
            }
            var rotate = shift & 0x1F;
            if (shift == 0) {
                cpu.shifterOperand = shiftVal;
                cpu.shifterCarryOut = <any>cpu.cpsr.C
            } else if (rotate) {
                cpu.shifterOperand = (gprs[rm] >>> rotate) | (gprs[rm] << (32 - rotate));
                cpu.shifterCarryOut = shiftVal & (1 << (rotate - 1))
            } else {
                cpu.shifterOperand = shiftVal;
                cpu.shifterCarryOut = shiftVal >> 31
            }
        }
    }

    constructAddressingMode23Immediate(instruction, immediate, condOp) {
        var rn = (instruction & 0x000F0000) >> 16;
        return this.addressingMode23Immediate[(instruction & 0x01A00000) >> 21](rn, immediate, condOp)
    }

    constructAddressingMode23Register(instruction, rm, condOp) {
        var rn = (instruction & 0x000F0000) >> 16;
        return this.addressingMode23Register[(instruction & 0x01A00000) >> 21](rn, rm, condOp)
    }

    constructAddressingMode2RegisterShifted(instruction, shiftOp:any, condOp) {
        var rn = (instruction & 0x000F0000) >> 16;
        return this.addressingMode2RegisterShifted[(instruction & 0x01A00000) >> 21](rn, shiftOp, condOp)
    }

    constructAddressingMode4(immediate, rn) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            return gprs[rn] + immediate
        }
    }

    constructAddressingMode4Writeback(immediate, offset, rn, overlap) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return (writeInitial) => {
            var addr = gprs[rn] + immediate;
            if (writeInitial && overlap) {
                cpu.mmu.store32(gprs[rn] + immediate - 4, gprs[rn])
            }
            gprs[rn] += offset;
            return addr
        }
    }

    constructADC(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var shifterOperand = (cpu.shifterOperand >>> 0) + (<number><any>cpu.cpsr.C);
            gprs[rd] = (gprs[rn] >>> 0) + shifterOperand
        }
    }

    constructADCS(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var shifterOperand = (cpu.shifterOperand >>> 0) + <number><any>cpu.cpsr.C;
            var d = (gprs[rn] >>> 0) + shifterOperand;
            if (rd == Register.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr)
            } else {
                cpu.cpsr.N = <any>(d >> 31);
                cpu.cpsr.Z = !(d & 0xFFFFFFFF);
                cpu.cpsr.C = d > 0xFFFFFFFF;
                cpu.cpsr.V = (gprs[rn] >> 31) == (shifterOperand >> 31) &&
                    (gprs[rn] >> 31) != (d >> 31) &&
                    (shifterOperand >> 31) != (d >> 31)
            }
            gprs[rd] = d
        }
    }

    constructADD(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = (gprs[rn] >>> 0) + (cpu.shifterOperand >>> 0)
        }
    }

    constructADDS(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var d = (gprs[rn] >>> 0) + (cpu.shifterOperand >>> 0);
            if (rd == Register.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr)
            } else {
                cpu.cpsr.N = <any>(d >> 31);
                cpu.cpsr.Z = !(d & 0xFFFFFFFF);
                cpu.cpsr.C = d > 0xFFFFFFFF;
                cpu.cpsr.V = (gprs[rn] >> 31) == (cpu.shifterOperand >> 31) &&
                    (gprs[rn] >> 31) != (d >> 31) &&
                    (cpu.shifterOperand >> 31) != (d >> 31)
            }
            gprs[rd] = d
        }
    }

    constructAND(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = gprs[rn] & cpu.shifterOperand
        }
    }

    constructANDS(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = gprs[rn] & cpu.shifterOperand;
            if (rd == Register.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr)
            } else {
                cpu.cpsr.N = <any>(gprs[rd] >> 31);
                cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
                cpu.cpsr.C = <any>cpu.shifterCarryOut
            }
        }
    }

    constructB(immediate, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            if (condOp && !condOp()) {
                cpu.mmu.waitPrefetch32(gprs[Register.PC]);
                return
            }
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            gprs[Register.PC] += immediate
        }
    }

    constructBIC(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = gprs[rn] & ~cpu.shifterOperand
        }
    }

    constructBICS(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = gprs[rn] & ~cpu.shifterOperand;
            if (rd == Register.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr)
            } else {
                cpu.cpsr.N = <any>(gprs[rd] >> 31);
                cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
                cpu.cpsr.C = <any>cpu.shifterCarryOut
            }
        }
    }

    constructBL(immediate, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            if (condOp && !condOp()) {
                cpu.mmu.waitPrefetch32(gprs[Register.PC]);
                return
            }
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            gprs[Register.LR] = gprs[Register.PC] - 4;
            gprs[Register.PC] += immediate
        }
    }

    constructBX(rm, condOp):any {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            if (condOp && !condOp()) {
                cpu.mmu.waitPrefetch32(gprs[Register.PC]);
                return
            }
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            cpu.switchExecMode(gprs[rm] & 0x00000001);
            gprs[Register.PC] = gprs[rm] & 0xFFFFFFFE
        }
    }

    constructCMN(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var aluOut = (gprs[rn] >>> 0) + (cpu.shifterOperand >>> 0);
            cpu.cpsr.N = <any>(aluOut >> 31);
            cpu.cpsr.Z = !(aluOut & 0xFFFFFFFF);
            cpu.cpsr.C = aluOut > 0xFFFFFFFF;
            cpu.cpsr.V = (gprs[rn] >> 31) == (cpu.shifterOperand >> 31) &&
                (gprs[rn] >> 31) != (aluOut >> 31) &&
                (cpu.shifterOperand >> 31) != (aluOut >> 31)
        }
    }

    constructCMP(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var aluOut = gprs[rn] - cpu.shifterOperand;
            cpu.cpsr.N = <any>(aluOut >> 31);
            cpu.cpsr.Z = !(aluOut & 0xFFFFFFFF);
            cpu.cpsr.C = (gprs[rn] >>> 0) >= (cpu.shifterOperand >>> 0);
            cpu.cpsr.V = (gprs[rn] >> 31) != (cpu.shifterOperand >> 31) &&
                (gprs[rn] >> 31) != (aluOut >> 31)
        }
    }

    constructEOR(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = gprs[rn] ^ cpu.shifterOperand
        }
    }

    constructEORS(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = gprs[rn] ^ cpu.shifterOperand;
            if (rd == Register.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr)
            } else {
                cpu.cpsr.N = <any>(gprs[rd] >> 31);
                cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
                cpu.cpsr.C = <any>cpu.shifterCarryOut
            }
        }
    }

    constructLDM(rs, address, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        var mmu = cpu.mmu;
        return () => {
            mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            var addr = address(false);
            var total = 0;
            var m, i;
            for (m = rs, i = 0; m; m >>= 1, ++i) {
                if (m & 1) {
                    gprs[i] = mmu.load32(addr & 0xFFFFFFFC);
                    addr += 4;
                    ++total
                }
            }
            mmu.waitMulti32(addr, total);
            ++cpu.cycles
        }
    }

    constructLDMS(rs, address, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        var mmu = cpu.mmu;
        return () => {
            mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            var addr = address(false);
            var total = 0;
            var mode = cpu.mode;
            cpu.switchMode(Mode.SYSTEM);
            var m, i;
            for (m = rs, i = 0; m; m >>= 1, ++i) {
                if (m & 1) {
                    gprs[i] = mmu.load32(addr & 0xFFFFFFFC);
                    addr += 4;
                    ++total
                }
            }
            cpu.switchMode(mode);
            mmu.waitMulti32(addr, total);
            ++cpu.cycles
        }
    }

    constructLDR(rd, address, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            var addr = address();
            gprs[rd] = cpu.mmu.load32(addr);
            cpu.mmu.wait32(addr);
            ++cpu.cycles
        }
    }

    constructLDRB(rd, address, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            var addr = address();
            gprs[rd] = cpu.mmu.loadU8(addr);
            cpu.mmu.wait(addr);
            ++cpu.cycles
        }
    }

    constructLDRH(rd, address, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            var addr = address();
            gprs[rd] = cpu.mmu.loadU16(addr);
            cpu.mmu.wait(addr);
            ++cpu.cycles
        }
    }

    constructLDRSB(rd, address, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            var addr = address();
            gprs[rd] = cpu.mmu.load8(addr);
            cpu.mmu.wait(addr);
            ++cpu.cycles
        }
    }

    constructLDRSH(rd, address, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            var addr = address();
            gprs[rd] = cpu.mmu.load16(addr);
            cpu.mmu.wait(addr);
            ++cpu.cycles
        }
    }

    constructMLA(rd, rn, rs, rm, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            ++cpu.cycles;
            cpu.mmu.waitMul(rs);
            if ((gprs[rm] & 0xFFFF0000) && (gprs[rs] & 0xFFFF0000)) {
                // Our data type is a double--we'll lose bits if we do it all at once!
                var hi = ((gprs[rm] & 0xFFFF0000) * gprs[rs]) & 0xFFFFFFFF;
                var lo = ((gprs[rm] & 0x0000FFFF) * gprs[rs]) & 0xFFFFFFFF;
                gprs[rd] = (hi + lo + gprs[rn]) & 0xFFFFFFFF
            } else {
                gprs[rd] = gprs[rm] * gprs[rs] + gprs[rn]
            }
        }
    }

    constructMLAS(rd, rn, rs, rm, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            ++cpu.cycles;
            cpu.mmu.waitMul(rs);
            if ((gprs[rm] & 0xFFFF0000) && (gprs[rs] & 0xFFFF0000)) {
                // Our data type is a double--we'll lose bits if we do it all at once!
                var hi = ((gprs[rm] & 0xFFFF0000) * gprs[rs]) & 0xFFFFFFFF;
                var lo = ((gprs[rm] & 0x0000FFFF) * gprs[rs]) & 0xFFFFFFFF;
                gprs[rd] = (hi + lo + gprs[rn]) & 0xFFFFFFFF
            } else {
                gprs[rd] = gprs[rm] * gprs[rs] + gprs[rn]
            }
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF)
        }
    }

    constructMOV(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = cpu.shifterOperand
        }
    }

    constructMOVS(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = cpu.shifterOperand;
            if (rd == Register.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr)
            } else {
                cpu.cpsr.N = <any>(gprs[rd] >> 31);
                cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
                cpu.cpsr.C = <any>cpu.shifterCarryOut
            }
        }
    }

    constructMRS(rd, r, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            if (r) {
                gprs[rd] = cpu.spsr
            } else {
                gprs[rd] = cpu.packCPSR()
            }
        }
    }

    constructMSR(rm, r, instruction, immediate, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        var c = instruction & 0x00010000;
        //var x = instruction & 0x00020000
        //var s = instruction & 0x00040000
        var f = instruction & 0x00080000;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            var operand;
            if (instruction & 0x02000000) {
                operand = immediate
            } else {
                operand = gprs[rm]
            }
            var mask = (c ? 0x000000FF : 0x00000000) |
                //(x ? 0x0000FF00 : 0x00000000) | // Irrelevant on ARMv4T
                //(s ? 0x00FF0000 : 0x00000000) | // Irrelevant on ARMv4T
                (f ? 0xFF000000 : 0x00000000);

            if (r) {
                mask &= cpu.USER_MASK | cpu.PRIV_MASK | cpu.STATE_MASK;
                cpu.spsr = (cpu.spsr & ~mask) | (operand & mask)
            } else {
                if (mask & cpu.USER_MASK) {
                    cpu.cpsr.N = <any>(operand >> 31);
                    cpu.cpsr.Z = <any>(operand & 0x40000000);
                    cpu.cpsr.C = <any>(operand & 0x20000000);
                    cpu.cpsr.V = <any>(operand & 0x10000000)
                }
                if (cpu.mode != Mode.USER && (mask & cpu.PRIV_MASK)) {
                    cpu.switchMode((operand & 0x0000000F) | 0x00000010);
                    cpu.cpsr.I = <any>(operand & 0x00000080);
                    cpu.cpsr.F = <any>(operand & 0x00000040);
                }
            }
        }
    }

    constructMUL(rd, rs, rm, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            cpu.mmu.waitMul(gprs[rs]);
            if ((gprs[rm] & 0xFFFF0000) && (gprs[rs] & 0xFFFF0000)) {
                // Our data type is a double--we'll lose bits if we do it all at once!
                var hi = ((gprs[rm] & 0xFFFF0000) * gprs[rs]) | 0;
                var lo = ((gprs[rm] & 0x0000FFFF) * gprs[rs]) | 0;
                gprs[rd] = hi + lo
            } else {
                gprs[rd] = gprs[rm] * gprs[rs]
            }
        }
    }

    constructMULS(rd, rs, rm, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            cpu.mmu.waitMul(gprs[rs]);
            if ((gprs[rm] & 0xFFFF0000) && (gprs[rs] & 0xFFFF0000)) {
                // Our data type is a double--we'll lose bits if we do it all at once!
                var hi = ((gprs[rm] & 0xFFFF0000) * gprs[rs]) | 0;
                var lo = ((gprs[rm] & 0x0000FFFF) * gprs[rs]) | 0;
                gprs[rd] = hi + lo
            } else {
                gprs[rd] = gprs[rm] * gprs[rs]
            }
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF)
        }
    }

    constructMVN(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = ~cpu.shifterOperand
        }
    }

    constructMVNS(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = ~cpu.shifterOperand;
            if (rd == Register.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr)
            } else {
                cpu.cpsr.N = <any>(gprs[rd] >> 31);
                cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
                cpu.cpsr.C = <any>cpu.shifterCarryOut
            }
        }
    }

    constructORR(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = gprs[rn] | cpu.shifterOperand
        }
    }

    constructORRS(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = gprs[rn] | cpu.shifterOperand;
            if (rd == Register.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr)
            } else {
                cpu.cpsr.N = <any>(gprs[rd] >> 31);
                cpu.cpsr.Z = !(gprs[rd] & 0xFFFFFFFF);
                cpu.cpsr.C = <any>cpu.shifterCarryOut
            }
        }
    }

    constructRSB(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = cpu.shifterOperand - gprs[rn]
        }
    }

    constructRSBS(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var d = cpu.shifterOperand - gprs[rn];
            if (rd == Register.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr)
            } else {
                cpu.cpsr.N = <any>(d >> 31);
                cpu.cpsr.Z = !(d & 0xFFFFFFFF);
                cpu.cpsr.C = (cpu.shifterOperand >>> 0) >= (gprs[rn] >>> 0);
                cpu.cpsr.V = (cpu.shifterOperand >> 31) != (gprs[rn] >> 31) &&
                    (cpu.shifterOperand >> 31) != (d >> 31)
            }
            gprs[rd] = d
        }
    }

    constructRSC(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var n = (gprs[rn] >>> 0) + <any>!cpu.cpsr.C;
            gprs[rd] = (cpu.shifterOperand >>> 0) - n
        }
    }

    constructRSCS(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var n = (gprs[rn] >>> 0) + <any>!cpu.cpsr.C;
            var d = (cpu.shifterOperand >>> 0) - n;
            if (rd == Register.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr)
            } else {
                cpu.cpsr.N = <any>(d >> 31);
                cpu.cpsr.Z = !(d & 0xFFFFFFFF);
                cpu.cpsr.C = (cpu.shifterOperand >>> 0) >= (d >>> 0);
                cpu.cpsr.V = (cpu.shifterOperand >> 31) != (n >> 31) &&
                    (cpu.shifterOperand >> 31) != (d >> 31)
            }
            gprs[rd] = d
        }
    }

    constructSBC(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var shifterOperand = (cpu.shifterOperand >>> 0) + <any>!cpu.cpsr.C;
            gprs[rd] = (gprs[rn] >>> 0) - shifterOperand
        }
    }

    constructSBCS(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var shifterOperand = (cpu.shifterOperand >>> 0) + <any>!cpu.cpsr.C;
            var d = (gprs[rn] >>> 0) - shifterOperand;
            if (rd == Register.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr)
            } else {
                cpu.cpsr.N = <any>(d >> 31);
                cpu.cpsr.Z = !(d & 0xFFFFFFFF);
                cpu.cpsr.C = (gprs[rn] >>> 0) >= (d >>> 0);
                cpu.cpsr.V = (gprs[rn] >> 31) != (shifterOperand >> 31) &&
                    (gprs[rn] >> 31) != (d >> 31)
            }
            gprs[rd] = d
        }
    }

    constructSMLAL(rd, rn, rs, rm, condOp) {
        var cpu = this.cpu;
        var SHIFT_32 = 1 / 0x100000000;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            cpu.cycles += 2;
            cpu.mmu.waitMul(rs);
            var hi = (gprs[rm] & 0xFFFF0000) * gprs[rs];
            var lo = (gprs[rm] & 0x0000FFFF) * gprs[rs];
            var carry = (gprs[rn] >>> 0) + hi + lo;
            gprs[rn] = carry;
            gprs[rd] += Math.floor(carry * SHIFT_32)
        }
    }

    constructSMLALS(rd, rn, rs, rm, condOp) {
        var cpu = this.cpu;
        var SHIFT_32 = 1 / 0x100000000;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            cpu.cycles += 2;
            cpu.mmu.waitMul(rs);
            var hi = (gprs[rm] & 0xFFFF0000) * gprs[rs];
            var lo = (gprs[rm] & 0x0000FFFF) * gprs[rs];
            var carry = (gprs[rn] >>> 0) + hi + lo;
            gprs[rn] = carry;
            gprs[rd] += Math.floor(carry * SHIFT_32);
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !((gprs[rd] & 0xFFFFFFFF) || (gprs[rn] & 0xFFFFFFFF))
        }
    }

    constructSMULL(rd, rn, rs, rm, condOp) {
        var cpu = this.cpu;
        var SHIFT_32 = 1 / 0x100000000;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            ++cpu.cycles;
            cpu.mmu.waitMul(gprs[rs]);
            var hi = ((gprs[rm] & 0xFFFF0000) >> 0) * (gprs[rs] >> 0);
            var lo = ((gprs[rm] & 0x0000FFFF) >> 0) * (gprs[rs] >> 0);
            gprs[rn] = ((hi & 0xFFFFFFFF) + (lo & 0xFFFFFFFF)) & 0xFFFFFFFF;
            gprs[rd] = Math.floor(hi * SHIFT_32 + lo * SHIFT_32)
        }
    }

    constructSMULLS(rd, rn, rs, rm, condOp) {
        var cpu = this.cpu;
        var SHIFT_32 = 1 / 0x100000000;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            ++cpu.cycles;
            cpu.mmu.waitMul(gprs[rs]);
            var hi = ((gprs[rm] & 0xFFFF0000) >> 0) * (gprs[rs] >> 0);
            var lo = ((gprs[rm] & 0x0000FFFF) >> 0) * (gprs[rs] >> 0);
            gprs[rn] = ((hi & 0xFFFFFFFF) + (lo & 0xFFFFFFFF)) & 0xFFFFFFFF;
            gprs[rd] = Math.floor(hi * SHIFT_32 + lo * SHIFT_32);
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !((gprs[rd] & 0xFFFFFFFF) || (gprs[rn] & 0xFFFFFFFF))
        }
    }

    constructSTM(rs, address, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        var mmu = cpu.mmu;
        return () => {
            if (condOp && !condOp()) {
                mmu.waitPrefetch32(gprs[Register.PC]);
                return
            }
            mmu.wait32(gprs[Register.PC]);
            var addr = address(true);
            var total = 0;
            var m, i;
            for (m = rs, i = 0; m; m >>= 1, ++i) {
                if (m & 1) {
                    mmu.store32(addr, gprs[i]);
                    addr += 4;
                    ++total
                }
            }
            mmu.waitMulti32(addr, total)
        }
    }

    constructSTMS(rs, address, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        var mmu = cpu.mmu;
        return () => {
            if (condOp && !condOp()) {
                mmu.waitPrefetch32(gprs[Register.PC]);
                return
            }
            mmu.wait32(gprs[Register.PC]);
            var mode = cpu.mode;
            var addr = address(true);
            var total = 0;
            var m, i;
            cpu.switchMode(Mode.SYSTEM);
            for (m = rs, i = 0; m; m >>= 1, ++i) {
                if (m & 1) {
                    mmu.store32(addr, gprs[i]);
                    addr += 4;
                    ++total
                }
            }
            cpu.switchMode(mode);
            mmu.waitMulti32(addr, total)
        }
    }

    constructSTR(rd, address, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            if (condOp && !condOp()) {
                cpu.mmu.waitPrefetch32(gprs[Register.PC]);
                return
            }
            var addr = address();
            cpu.mmu.store32(addr, gprs[rd]);
            cpu.mmu.wait32(addr);
            cpu.mmu.wait32(gprs[Register.PC])
        }
    }

    constructSTRB(rd, address, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            if (condOp && !condOp()) {
                cpu.mmu.waitPrefetch32(gprs[Register.PC]);
                return
            }
            var addr = address();
            cpu.mmu.store8(addr, gprs[rd]);
            cpu.mmu.wait(addr);
            cpu.mmu.wait32(gprs[Register.PC])
        }
    }

    constructSTRH(rd, address, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            if (condOp && !condOp()) {
                cpu.mmu.waitPrefetch32(gprs[Register.PC]);
                return
            }
            var addr = address();
            cpu.mmu.store16(addr, gprs[rd]);
            cpu.mmu.wait(addr);
            cpu.mmu.wait32(gprs[Register.PC])
        }
    }

    constructSUB(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            gprs[rd] = gprs[rn] - cpu.shifterOperand
        }
    }

    constructSUBS(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var d = gprs[rn] - cpu.shifterOperand;
            if (rd == Register.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr)
            } else {
                cpu.cpsr.N = <any>(d >> 31);
                cpu.cpsr.Z = !(d & 0xFFFFFFFF);
                cpu.cpsr.C = (gprs[rn] >>> 0) >= (cpu.shifterOperand >>> 0);
                cpu.cpsr.V = (gprs[rn] >> 31) != (cpu.shifterOperand >> 31) &&
                    (gprs[rn] >> 31) != (d >> 31)
            }
            gprs[rd] = d
        }
    }

    constructSWI(immediate, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            if (condOp && !condOp()) {
                cpu.mmu.waitPrefetch32(gprs[Register.PC]);
                return
            }
            cpu.irq.swi32(immediate);
            cpu.mmu.waitPrefetch32(gprs[Register.PC])
        }
    }

    constructSWP(rd, rn, rm, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            cpu.mmu.wait32(gprs[rn]);
            cpu.mmu.wait32(gprs[rn]);
            var d = cpu.mmu.load32(gprs[rn]);
            cpu.mmu.store32(gprs[rn], gprs[rm]);
            gprs[rd] = d;
            ++cpu.cycles
        }
    }

    constructSWPB(rd, rn, rm, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            cpu.mmu.wait(gprs[rn]);
            cpu.mmu.wait(gprs[rn]);
            var d = cpu.mmu.load8(gprs[rn]);
            cpu.mmu.store8(gprs[rn], gprs[rm]);
            gprs[rd] = d;
            ++cpu.cycles
        }
    }

    constructTEQ(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var aluOut = gprs[rn] ^ cpu.shifterOperand;
            cpu.cpsr.N = <any>(aluOut >> 31);
            cpu.cpsr.Z = !(aluOut & 0xFFFFFFFF);
            cpu.cpsr.C = <any>cpu.shifterCarryOut
        }
    }

    constructTST(rd, rn, shiftOp, condOp) {
        var cpu = this.cpu;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            shiftOp();
            var aluOut = gprs[rn] & cpu.shifterOperand;
            cpu.cpsr.N = <any>(aluOut >> 31);
            cpu.cpsr.Z = !(aluOut & 0xFFFFFFFF);
            cpu.cpsr.C = <any>cpu.shifterCarryOut
        }
    }

    constructUMLAL(rd, rn, rs, rm, condOp) {
        var cpu = this.cpu;
        var SHIFT_32 = 1 / 0x100000000;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            cpu.cycles += 2;
            cpu.mmu.waitMul(rs);
            var hi = ((gprs[rm] & 0xFFFF0000) >>> 0) * (gprs[rs] >>> 0);
            var lo = (gprs[rm] & 0x0000FFFF) * (gprs[rs] >>> 0);
            var carry = (gprs[rn] >>> 0) + hi + lo;
            gprs[rn] = carry;
            gprs[rd] += carry * SHIFT_32
        }
    }

    constructUMLALS(rd, rn, rs, rm, condOp) {
        var cpu = this.cpu;
        var SHIFT_32 = 1 / 0x100000000;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            cpu.cycles += 2;
            cpu.mmu.waitMul(rs);
            var hi = ((gprs[rm] & 0xFFFF0000) >>> 0) * (gprs[rs] >>> 0);
            var lo = (gprs[rm] & 0x0000FFFF) * (gprs[rs] >>> 0);
            var carry = (gprs[rn] >>> 0) + hi + lo;
            gprs[rn] = carry;
            gprs[rd] += carry * SHIFT_32;
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !((gprs[rd] & 0xFFFFFFFF) || (gprs[rn] & 0xFFFFFFFF))
        }
    }

    constructUMULL(rd, rn, rs, rm, condOp) {
        var cpu = this.cpu;
        var SHIFT_32 = 1 / 0x100000000;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            ++cpu.cycles;
            cpu.mmu.waitMul(gprs[rs]);
            var hi = ((gprs[rm] & 0xFFFF0000) >>> 0) * (gprs[rs] >>> 0);
            var lo = ((gprs[rm] & 0x0000FFFF) >>> 0) * (gprs[rs] >>> 0);
            gprs[rn] = ((hi & 0xFFFFFFFF) + (lo & 0xFFFFFFFF)) & 0xFFFFFFFF;
            gprs[rd] = (hi * SHIFT_32 + lo * SHIFT_32) >>> 0
        }
    }

    constructUMULLS(rd, rn, rs, rm, condOp) {
        var cpu = this.cpu;
        var SHIFT_32 = 1 / 0x100000000;
        var gprs = this.cpu.gprs;
        return () => {
            cpu.mmu.waitPrefetch32(gprs[Register.PC]);
            if (condOp && !condOp()) {
                return
            }
            ++cpu.cycles;
            cpu.mmu.waitMul(gprs[rs]);
            var hi = ((gprs[rm] & 0xFFFF0000) >>> 0) * (gprs[rs] >>> 0);
            var lo = ((gprs[rm] & 0x0000FFFF) >>> 0) * (gprs[rs] >>> 0);
            gprs[rn] = ((hi & 0xFFFFFFFF) + (lo & 0xFFFFFFFF)) & 0xFFFFFFFF;
            gprs[rd] = (hi * SHIFT_32 + lo * SHIFT_32) >>> 0;
            cpu.cpsr.N = <any>(gprs[rd] >> 31);
            cpu.cpsr.Z = !((gprs[rd] & 0xFFFFFFFF) || (gprs[rn] & 0xFFFFFFFF))
        }
    }

}
