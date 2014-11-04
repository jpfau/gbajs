module GameBoyAdvance {

    export enum Register {
        /**
         * Stack pointer
         */
        SP = 13,
        /**
         * Link register
         */
        LR = 14,
        /**
         * Program counter
         */
        PC = 15
    }

    export enum ExecMode {
        ARM = 0,
        THUMB = 1
    }

    export enum Mode {
        USER = 0x10,
        FIQ = 0x11,
        IRQ = 0x12,
        SUPERVISOR = 0x13,
        ABORT = 0x17,
        UNDEFINED = 0x1B,
        SYSTEM = 0x1F
    }

    export enum Bank {
        NONE = 0,
        FIQ = 1,
        IRQ = 2,
        SUPERVISOR = 3,
        ABORT = 4,
        UNDEFINED = 5
    }

    export enum Base {
        RESET = 0x00000000,
        UNDEF = 0x00000004,
        SWI = 0x00000008,
        PABT = 0x0000000C,
        DABT = 0x00000010,
        IRQ = 0x00000018,
        FIQ = 0x0000001C
    }

    export enum Mask {
        UNALLOC = 0x0FFFFF00,
        USER = 0xF0000000,
        /*
         * This is out of spec, but it seems to be what's done in other implementations
         */
        PRIV = 0x000000CF,
        STATE = 0x00000020
    }

    export interface Instruction {
        ():void
        next?:Instruction
        page?:Page
        address?:number
        opcode?:number

        execMode?:ExecMode
        writesPC?:boolean
        fixedJump?:boolean
    }

    export interface AddressAccessor {
        (writeInitial?:boolean):number
        writesPC:boolean
    }

    export class ARMCore {

        constructor(private gba:Main) {
            this.armCompiler = new ARMCoreArm(gba, this);
            this.thumbCompiler = new ARMCoreThumb(gba, this);
            ARMCore.generateConds(this);
        }

        spsr:number;
        cpsr = {
            I: false,
            F: false,
            V: false,
            C: false,
            Z: false,
            N: false
        };

        cycles:number;

        execMode:ExecMode;

        /**
         * Registers
         */
        gprs = new Int32Array(16);

        instruction:any;
        instructionWidth:number;

        mode:Mode;

        shifterCarryOut:number;
        shifterOperand:number;

        step() {
            var mmu = this.gba.mmu;
            var gprs = this.gprs;
            var instruction = this.instruction || (this.instruction = this.loadInstruction(gprs[Register.PC] - this.instructionWidth));
            gprs[Register.PC] += this.instructionWidth;
            this.conditionPassed = true;
            instruction();

            if (!instruction.writesPC) {
                if (this.instruction != null) { // We might have gotten an interrupt from the instruction
                    if (instruction.next == null || instruction.next.page.invalid) {
                        instruction.next = this.loadInstruction(gprs[Register.PC] - this.instructionWidth);
                    }
                    this.instruction = instruction.next;
                }
            } else {
                if (this.conditionPassed) {
                    var pc = gprs[Register.PC] &= 0xFFFFFFFE;
                    if (this.execMode == ExecMode.ARM) {
                        mmu.wait32(pc);
                        mmu.waitPrefetch32(pc);
                    } else {
                        mmu.wait(pc);
                        mmu.waitPrefetch(pc);
                    }
                    gprs[Register.PC] += this.instructionWidth;
                    if (!instruction.fixedJump) {
                        this.instruction = null;
                    } else if (this.instruction != null) {
                        if (instruction.next == null || instruction.next.page.invalid) {
                            instruction.next = this.loadInstruction(gprs[Register.PC] - this.instructionWidth);
                        }
                        this.instruction = instruction.next;
                    }
                } else {
                    this.instruction = null;
                }
            }
            this.gba.irq.updateTimers();
        }

        resetCPU(startOffset:number):void {
            for (var i = 0; i < Register.PC; i++) {
                this.gprs[i] = 0;
            }
            this.gprs[Register.PC] = startOffset + ARMCoreArm.WORD_SIZE;

            this.switchExecMode(ExecMode.ARM);

            this.mode = Mode.SYSTEM;

            this.bankedRegisters = [
                new Int32Array(7),
                new Int32Array(7),
                new Int32Array(2),
                new Int32Array(2),
                new Int32Array(2),
                new Int32Array(2)
            ];
            this.spsr = 0;
            this.bankedSPSRs = new Int32Array(6);

            this.cycles = 0;

            this.shifterOperand = 0;
            this.shifterCarryOut = 0;

            this.page = null;
            this.pageId = 0;
            this.pageRegion = -1;

            this.instruction = null;

            this.gba.irq.clear();
        }

        freeze():any {
            return {
                'gprs': [
                    this.gprs[0],
                    this.gprs[1],
                    this.gprs[2],
                    this.gprs[3],
                    this.gprs[4],
                    this.gprs[5],
                    this.gprs[6],
                    this.gprs[7],
                    this.gprs[8],
                    this.gprs[9],
                    this.gprs[10],
                    this.gprs[11],
                    this.gprs[12],
                    this.gprs[13],
                    this.gprs[14],
                    this.gprs[15]
                ],
                'mode': this.mode,
                'cpsr': this.cpsr,
                'bankedRegisters': [
                    [
                        this.bankedRegisters[0][0],
                        this.bankedRegisters[0][1],
                        this.bankedRegisters[0][2],
                        this.bankedRegisters[0][3],
                        this.bankedRegisters[0][4],
                        this.bankedRegisters[0][5],
                        this.bankedRegisters[0][6]
                    ],
                    [
                        this.bankedRegisters[1][0],
                        this.bankedRegisters[1][1],
                        this.bankedRegisters[1][2],
                        this.bankedRegisters[1][3],
                        this.bankedRegisters[1][4],
                        this.bankedRegisters[1][5],
                        this.bankedRegisters[1][6]
                    ],
                    [
                        this.bankedRegisters[2][0],
                        this.bankedRegisters[2][1]
                    ],
                    [
                        this.bankedRegisters[3][0],
                        this.bankedRegisters[3][1]
                    ],
                    [
                        this.bankedRegisters[4][0],
                        this.bankedRegisters[4][1]
                    ],
                    [
                        this.bankedRegisters[5][0],
                        this.bankedRegisters[5][1]
                    ]
                ],
                'spsr': this.spsr,
                'bankedSPSRs': [
                    this.bankedSPSRs[0],
                    this.bankedSPSRs[1],
                    this.bankedSPSRs[2],
                    this.bankedSPSRs[3],
                    this.bankedSPSRs[4],
                    this.bankedSPSRs[5]
                ],
                'cycles': this.cycles
            };
        }

        defrost(frost:any):void {
            this.instruction = null;

            this.page = null;
            this.pageId = 0;
            this.pageRegion = -1;

            this.gprs[0] = frost.gprs[0];
            this.gprs[1] = frost.gprs[1];
            this.gprs[2] = frost.gprs[2];
            this.gprs[3] = frost.gprs[3];
            this.gprs[4] = frost.gprs[4];
            this.gprs[5] = frost.gprs[5];
            this.gprs[6] = frost.gprs[6];
            this.gprs[7] = frost.gprs[7];
            this.gprs[8] = frost.gprs[8];
            this.gprs[9] = frost.gprs[9];
            this.gprs[10] = frost.gprs[10];
            this.gprs[11] = frost.gprs[11];
            this.gprs[12] = frost.gprs[12];
            this.gprs[13] = frost.gprs[13];
            this.gprs[14] = frost.gprs[14];
            this.gprs[15] = frost.gprs[15];

            this.mode = frost.mode;
            this.cpsr = frost.cpsr;

            this.bankedRegisters[0][0] = frost.bankedRegisters[0][0];
            this.bankedRegisters[0][1] = frost.bankedRegisters[0][1];
            this.bankedRegisters[0][2] = frost.bankedRegisters[0][2];
            this.bankedRegisters[0][3] = frost.bankedRegisters[0][3];
            this.bankedRegisters[0][4] = frost.bankedRegisters[0][4];
            this.bankedRegisters[0][5] = frost.bankedRegisters[0][5];
            this.bankedRegisters[0][6] = frost.bankedRegisters[0][6];

            this.bankedRegisters[1][0] = frost.bankedRegisters[1][0];
            this.bankedRegisters[1][1] = frost.bankedRegisters[1][1];
            this.bankedRegisters[1][2] = frost.bankedRegisters[1][2];
            this.bankedRegisters[1][3] = frost.bankedRegisters[1][3];
            this.bankedRegisters[1][4] = frost.bankedRegisters[1][4];
            this.bankedRegisters[1][5] = frost.bankedRegisters[1][5];
            this.bankedRegisters[1][6] = frost.bankedRegisters[1][6];

            this.bankedRegisters[2][0] = frost.bankedRegisters[2][0];
            this.bankedRegisters[2][1] = frost.bankedRegisters[2][1];

            this.bankedRegisters[3][0] = frost.bankedRegisters[3][0];
            this.bankedRegisters[3][1] = frost.bankedRegisters[3][1];

            this.bankedRegisters[4][0] = frost.bankedRegisters[4][0];
            this.bankedRegisters[4][1] = frost.bankedRegisters[4][1];

            this.bankedRegisters[5][0] = frost.bankedRegisters[5][0];
            this.bankedRegisters[5][1] = frost.bankedRegisters[5][1];

            this.spsr = frost.spsr;
            this.bankedSPSRs[0] = frost.bankedSPSRs[0];
            this.bankedSPSRs[1] = frost.bankedSPSRs[1];
            this.bankedSPSRs[2] = frost.bankedSPSRs[2];
            this.bankedSPSRs[3] = frost.bankedSPSRs[3];
            this.bankedSPSRs[4] = frost.bankedSPSRs[4];
            this.bankedSPSRs[5] = frost.bankedSPSRs[5];

            this.cycles = frost.cycles;
        }

        switchExecMode(newMode:ExecMode):void {
            if (this.execMode != newMode) {
                this.execMode = newMode;
                if (newMode == ExecMode.ARM) {
                    this.instructionWidth = ARMCoreArm.WORD_SIZE;
                    this.loadInstruction = this.loadInstructionArm;
                } else {
                    this.instructionWidth = ARMCoreThumb.WORD_SIZE;
                    this.loadInstruction = this.loadInstructionThumb;
                }
            }

        }

        switchMode(newMode:Mode) {
            if (newMode == this.mode) {
                // Not switching modes after all
                return;
            }
            if (newMode != Mode.USER || newMode != Mode.SYSTEM) {
                // Switch banked registers
                var newBank = GameBoyAdvance.ARMCore.selectBank(newMode);
                var oldBank = GameBoyAdvance.ARMCore.selectBank(this.mode);
                if (newBank != oldBank) {
                    // TODO: support FIQ
                    if (newMode == Mode.FIQ || this.mode == Mode.FIQ) {
                        var oldFiqBank = int(oldBank == Bank.FIQ);
                        var newFiqBank = int(newBank == Bank.FIQ);
                        this.bankedRegisters[oldFiqBank][2] = this.gprs[8];
                        this.bankedRegisters[oldFiqBank][3] = this.gprs[9];
                        this.bankedRegisters[oldFiqBank][4] = this.gprs[10];
                        this.bankedRegisters[oldFiqBank][5] = this.gprs[11];
                        this.bankedRegisters[oldFiqBank][6] = this.gprs[12];
                        this.gprs[8] = this.bankedRegisters[newFiqBank][2];
                        this.gprs[9] = this.bankedRegisters[newFiqBank][3];
                        this.gprs[10] = this.bankedRegisters[newFiqBank][4];
                        this.gprs[11] = this.bankedRegisters[newFiqBank][5];
                        this.gprs[12] = this.bankedRegisters[newFiqBank][6];
                    }
                    this.bankedRegisters[oldBank][0] = this.gprs[Register.SP];
                    this.bankedRegisters[oldBank][1] = this.gprs[Register.LR];
                    this.gprs[Register.SP] = this.bankedRegisters[newBank][0];
                    this.gprs[Register.LR] = this.bankedRegisters[newBank][1];

                    this.bankedSPSRs[oldBank] = this.spsr;
                    this.spsr = this.bankedSPSRs[newBank];
                }
            }
            this.mode = newMode;
        }

        packCPSR():number {
            return this.mode
                | (this.execMode << 5)
                | (<any>this.cpsr.F << 6)
                | (<any>this.cpsr.I << 7)
                | (<any>this.cpsr.V << 28)
                | (<any>this.cpsr.C << 29)
                | (<any>this.cpsr.Z << 30)
                | (<any>this.cpsr.N << 31)
        }

        unpackCPSR(spsr:number) {
            this.switchMode(spsr & 0x0000001F);
            this.switchExecMode(int(bool(spsr & 0x00000020)));
            this.cpsr.F = bool(spsr & 0x00000040);
            this.cpsr.I = bool(spsr & 0x00000080);
            this.cpsr.N = bool(spsr & 0x80000000);
            this.cpsr.Z = bool(spsr & 0x40000000);
            this.cpsr.C = bool(spsr & 0x20000000);
            this.cpsr.V = bool(spsr & 0x10000000);

            this.gba.irq.testIRQ();
        }

        hasSPSR() {
            return this.mode != Mode.SYSTEM && this.mode != Mode.USER;
        }

        raiseIRQ() {
            if (this.cpsr.I) {
                return;
            }
            var cpsr = this.packCPSR();
            var instructionWidth = this.instructionWidth;
            this.switchMode(Mode.IRQ);
            this.spsr = cpsr;
            this.gprs[Register.LR] = this.gprs[Register.PC] - instructionWidth + 4;
            this.gprs[Register.PC] = Base.IRQ + ARMCoreArm.WORD_SIZE;
            this.instruction = null;
            this.switchExecMode(ExecMode.ARM);
            this.cpsr.I = true;
        }

        raiseTrap() {
            var cpsr = this.packCPSR();
            var instructionWidth = this.instructionWidth;
            this.switchMode(Mode.SUPERVISOR);
            this.spsr = cpsr;
            this.gprs[Register.LR] = this.gprs[Register.PC] - instructionWidth;
            this.gprs[Register.PC] = Base.SWI + ARMCoreArm.WORD_SIZE;
            this.instruction = null;
            this.switchExecMode(ExecMode.ARM);
            this.cpsr.I = true;
        }

        private armCompiler:ARMCoreArm;
        private bankedRegisters:Int32Array[];
        private bankedSPSRs:Int32Array;
        private conditionPassed:boolean;
        private conds:Array<()=>boolean>;
        private page:Page;
        private pageId:number;
        private pageMask:number;
        private pageRegion:number;
        private thumbCompiler:ARMCoreThumb;

        private static badAddress(instruction:number):AddressAccessor {
            var func:any = function () {
                throw "Unimplemented memory access: 0x" + instruction.toString(16);
            };
            func.writesPC = true;
            return func;
        }

        private static badOp(instruction:number):Instruction {
            var func:Instruction = function () {
                throw "Illegal instruction: 0x" + instruction.toString(16);
            };
            func.writesPC = true;
            func.fixedJump = false;
            return func;
        }

        private static generateConds(cpu:ARMCore):void {
            cpu.conds = [
                // EQ
                function () {
                    return cpu.conditionPassed = cpu.cpsr.Z;
                },
                // NE
                function () {
                    return cpu.conditionPassed = !cpu.cpsr.Z;
                },
                // CS
                function () {
                    return cpu.conditionPassed = cpu.cpsr.C;
                },
                // CC
                function () {
                    return cpu.conditionPassed = !cpu.cpsr.C;
                },
                // MI
                function () {
                    return cpu.conditionPassed = cpu.cpsr.N;
                },
                // PL
                function () {
                    return cpu.conditionPassed = !cpu.cpsr.N;
                },
                // VS
                function () {
                    return cpu.conditionPassed = cpu.cpsr.V;
                },
                // VC
                function () {
                    return cpu.conditionPassed = !cpu.cpsr.V;
                },
                // HI
                function () {
                    return cpu.conditionPassed = cpu.cpsr.C && !cpu.cpsr.Z;
                },
                // LS
                function () {
                    return cpu.conditionPassed = !cpu.cpsr.C || cpu.cpsr.Z;
                },
                // GE
                function () {
                    return cpu.conditionPassed = !cpu.cpsr.N == !cpu.cpsr.V;
                },
                // LT
                function () {
                    return cpu.conditionPassed = !cpu.cpsr.N != !cpu.cpsr.V;
                },
                // GT
                function () {
                    return cpu.conditionPassed = !cpu.cpsr.Z && !cpu.cpsr.N == !cpu.cpsr.V;
                },
                // LE
                function () {
                    return cpu.conditionPassed = cpu.cpsr.Z || !cpu.cpsr.N != !cpu.cpsr.V;
                },
                // AL
                null,
                null
            ]
        }

        private static selectBank(mode:Mode):number {
            switch (mode) {
                case Mode.USER:
                case Mode.SYSTEM:
                    // No banked registers
                    return Bank.NONE;
                case Mode.FIQ:
                    return Bank.FIQ;
                case Mode.IRQ:
                    return Bank.IRQ;
                case Mode.SUPERVISOR:
                    return Bank.SUPERVISOR;
                case Mode.ABORT:
                    return Bank.ABORT;
                case Mode.UNDEFINED:
                    return Bank.UNDEFINED;
                default:
                    throw "Invalid user mode passed to selectBank";
            }
        }

        private barrelShiftImmediate(instruction:number, shiftType:number, immediate:number, rm:number) {
            var cpu = this;
            var gprs = this.gprs;
            var shiftOp = ARMCore.badOp(instruction);
            switch (shiftType) {
                case 0x00000000:
                    // LSL
                    if (immediate) {
                        shiftOp = function () {
                            cpu.shifterOperand = gprs[rm] << immediate;
                            cpu.shifterCarryOut = gprs[rm] & (1 << (32 - immediate));
                        };
                    } else {
                        // This boils down to no shift
                        shiftOp = function () {
                            cpu.shifterOperand = gprs[rm];
                            cpu.shifterCarryOut = <any>cpu.cpsr.C;
                        };
                    }
                    break;
                case 0x00000020:
                    // LSR
                    if (immediate) {
                        shiftOp = function () {
                            cpu.shifterOperand = gprs[rm] >>> immediate;
                            cpu.shifterCarryOut = gprs[rm] & (1 << (immediate - 1));
                        };
                    } else {
                        shiftOp = function () {
                            cpu.shifterOperand = 0;
                            cpu.shifterCarryOut = gprs[rm] & 0x80000000;
                        };
                    }
                    break;
                case 0x00000040:
                    // ASR
                    if (immediate) {
                        shiftOp = function () {
                            cpu.shifterOperand = gprs[rm] >> immediate;
                            cpu.shifterCarryOut = gprs[rm] & (1 << (immediate - 1));
                        };
                    } else {
                        shiftOp = function () {
                            cpu.shifterCarryOut = gprs[rm] & 0x80000000;
                            if (cpu.shifterCarryOut) {
                                cpu.shifterOperand = 0xFFFFFFFF;
                            } else {
                                cpu.shifterOperand = 0;
                            }
                        };
                    }
                    break;
                case 0x00000060:
                    // ROR
                    if (immediate) {
                        shiftOp = function () {
                            cpu.shifterOperand = (gprs[rm] >>> immediate) | (gprs[rm] << (32 - immediate));
                            cpu.shifterCarryOut = gprs[rm] & (1 << (immediate - 1));
                        };
                    } else {
                        // RRX
                        shiftOp = function () {
                            cpu.shifterOperand = (<number>(<any>cpu.cpsr.C) << 31) | (gprs[rm] >>> 1);
                            cpu.shifterCarryOut = gprs[rm] & 0x00000001;
                        };
                    }
                    break;
            }
            return shiftOp;
        }

        private compileArm(instruction:number):Instruction {
            var op = ARMCore.badOp(instruction);
            var address:AddressAccessor = ARMCore.badAddress(instruction);

            var i = instruction & 0x0E000000;

            var condOp = this.conds[(instruction & 0xF0000000) >>> 28];
            if ((instruction & 0x0FFFFFF0) == 0x012FFF10) {
                // BX
                var rm = instruction & 0xF;
                op = <any>this.armCompiler.constructBX(rm, condOp);
                op.writesPC = true;
                op.fixedJump = false;
            } else if (!(instruction & 0x0C000000) && (i == 0x02000000 || (instruction & 0x00000090) != 0x00000090)) {
                var opcode = instruction & 0x01E00000;
                var s = instruction & 0x00100000;
                var shiftsRs = false;
                if ((opcode & 0x01800000) == 0x01000000 && !s) {
                    var r = instruction & 0x00400000;
                    if ((instruction & 0x00B0F000) == 0x0020F000) {
                        // MSR
                        var rm = instruction & 0x0000000F;
                        var immediate = instruction & 0x000000FF;
                        var rotateImm = (instruction & 0x00000F00) >> 7;
                        immediate = (immediate >>> rotateImm) | (immediate << (32 - rotateImm));
                        op = <any>this.armCompiler.constructMSR(rm, r, instruction, immediate, condOp);
                        op.writesPC = false;
                    } else if ((instruction & 0x00BF0000) == 0x000F0000) {
                        // MRS
                        var rd = (instruction & 0x0000F000) >> 12;
                        op = <any>this.armCompiler.constructMRS(rd, r, condOp);
                        op.writesPC = rd == Register.PC;
                    }
                } else {
                    // Data processing/FSR transfer
                    var rn = (instruction & 0x000F0000) >> 16;
                    var rd = (instruction & 0x0000F000) >> 12;

                    // Parse shifter operand
                    var shiftType = instruction & 0x00000060;
                    var rm = instruction & 0x0000000F;
                    var shiftOp = function ():void {
                        throw 'BUG: invalid barrel shifter';
                    };
                    if (instruction & 0x02000000) {
                        var immediate = instruction & 0x000000FF;
                        var rotate = (instruction & 0x00000F00) >> 7;
                        if (!rotate) {
                            shiftOp = this.armCompiler.constructAddressingMode1Immediate(immediate);
                        } else {
                            shiftOp = this.armCompiler.constructAddressingMode1ImmediateRotate(immediate, rotate);
                        }
                    } else if (instruction & 0x00000010) {
                        var rs = (instruction & 0x00000F00) >> 8;
                        shiftsRs = true;
                        switch (shiftType) {
                            case 0x00000000:
                                // LSL
                                shiftOp = this.armCompiler.constructAddressingMode1LSL(rs, rm);
                                break;
                            case 0x00000020:
                                // LSR
                                shiftOp = this.armCompiler.constructAddressingMode1LSR(rs, rm);
                                break;
                            case 0x00000040:
                                // ASR
                                shiftOp = this.armCompiler.constructAddressingMode1ASR(rs, rm);
                                break;
                            case 0x00000060:
                                // ROR
                                shiftOp = this.armCompiler.constructAddressingMode1ROR(rs, rm);
                                break;
                        }
                    } else {
                        var immediate = (instruction & 0x00000F80) >> 7;
                        shiftOp = this.barrelShiftImmediate(instruction, shiftType, immediate, rm);
                    }

                    switch (opcode) {
                        case 0x00000000:
                            // AND
                            if (s) {
                                op = <any>this.armCompiler.constructANDS(rd, rn, shiftOp, condOp);
                            } else {
                                op = <any>this.armCompiler.constructAND(rd, rn, shiftOp, condOp);
                            }
                            break;
                        case 0x00200000:
                            // EOR
                            if (s) {
                                op = <any>this.armCompiler.constructEORS(rd, rn, shiftOp, condOp);
                            } else {
                                op = <any>this.armCompiler.constructEOR(rd, rn, shiftOp, condOp);
                            }
                            break;
                        case 0x00400000:
                            // SUB
                            if (s) {
                                op = <any>this.armCompiler.constructSUBS(rd, rn, shiftOp, condOp);
                            } else {
                                op = <any>this.armCompiler.constructSUB(rd, rn, shiftOp, condOp);
                            }
                            break;
                        case 0x00600000:
                            // RSB
                            if (s) {
                                op = <any>this.armCompiler.constructRSBS(rd, rn, shiftOp, condOp);
                            } else {
                                op = <any>this.armCompiler.constructRSB(rd, rn, shiftOp, condOp);
                            }
                            break;
                        case 0x00800000:
                            // ADD
                            if (s) {
                                op = <any>this.armCompiler.constructADDS(rd, rn, shiftOp, condOp);
                            } else {
                                op = <any>this.armCompiler.constructADD(rd, rn, shiftOp, condOp);
                            }
                            break;
                        case 0x00A00000:
                            // ADC
                            if (s) {
                                op = <any>this.armCompiler.constructADCS(rd, rn, shiftOp, condOp);
                            } else {
                                op = <any>this.armCompiler.constructADC(rd, rn, shiftOp, condOp);
                            }
                            break;
                        case 0x00C00000:
                            // SBC
                            if (s) {
                                op = <any>this.armCompiler.constructSBCS(rd, rn, shiftOp, condOp);
                            } else {
                                op = <any>this.armCompiler.constructSBC(rd, rn, shiftOp, condOp);
                            }
                            break;
                        case 0x00E00000:
                            // RSC
                            if (s) {
                                op = <any>this.armCompiler.constructRSCS(rd, rn, shiftOp, condOp);
                            } else {
                                op = <any>this.armCompiler.constructRSC(rd, rn, shiftOp, condOp);
                            }
                            break;
                        case 0x01000000:
                            // TST
                            op = <any>this.armCompiler.constructTST(rd, rn, shiftOp, condOp);
                            break;
                        case 0x01200000:
                            // TEQ
                            op = <any>this.armCompiler.constructTEQ(rd, rn, shiftOp, condOp);
                            break;
                        case 0x01400000:
                            // CMP
                            op = <any>this.armCompiler.constructCMP(rd, rn, shiftOp, condOp);
                            break;
                        case 0x01600000:
                            // CMN
                            op = <any>this.armCompiler.constructCMN(rd, rn, shiftOp, condOp);
                            break;
                        case 0x01800000:
                            // ORR
                            if (s) {
                                op = <any>this.armCompiler.constructORRS(rd, rn, shiftOp, condOp);
                            } else {
                                op = <any>this.armCompiler.constructORR(rd, rn, shiftOp, condOp);
                            }
                            break;
                        case 0x01A00000:
                            // MOV
                            if (s) {
                                op = <any>this.armCompiler.constructMOVS(rd, rn, shiftOp, condOp);
                            } else {
                                op = <any>this.armCompiler.constructMOV(rd, rn, shiftOp, condOp);
                            }
                            break;
                        case 0x01C00000:
                            // BIC
                            if (s) {
                                op = <any>this.armCompiler.constructBICS(rd, rn, shiftOp, condOp);
                            } else {
                                op = <any>this.armCompiler.constructBIC(rd, rn, shiftOp, condOp);
                            }
                            break;
                        case 0x01E00000:
                            // MVN
                            if (s) {
                                op = <any>this.armCompiler.constructMVNS(rd, rn, shiftOp, condOp);
                            } else {
                                op = <any>this.armCompiler.constructMVN(rd, rn, shiftOp, condOp);
                            }
                            break;
                    }
                    op.writesPC = rd == Register.PC;
                }
            } else if ((instruction & 0x0FB00FF0) == 0x01000090) {
                // Single data swap
                var rm = instruction & 0x0000000F;
                var rd = (instruction >> 12) & 0x0000000F;
                var rn = (instruction >> 16) & 0x0000000F;
                if (instruction & 0x00400000) {
                    op = <any>this.armCompiler.constructSWPB(rd, rn, rm, condOp);
                } else {
                    op = <any>this.armCompiler.constructSWP(rd, rn, rm, condOp);
                }
                op.writesPC = rd == Register.PC;
            } else {
                switch (i) {
                    case 0x00000000:
                        if ((instruction & 0x010000F0) == 0x00000090) {
                            // Multiplies
                            var rd = (instruction & 0x000F0000) >> 16;
                            var rn = (instruction & 0x0000F000) >> 12;
                            var rs = (instruction & 0x00000F00) >> 8;
                            var rm = instruction & 0x0000000F;
                            switch (instruction & 0x00F00000) {
                                case 0x00000000:
                                    // MUL
                                    op = <any>this.armCompiler.constructMUL(rd, rs, rm, condOp);
                                    break;
                                case 0x00100000:
                                    // MULS
                                    op = <any>this.armCompiler.constructMULS(rd, rs, rm, condOp);
                                    break;
                                case 0x00200000:
                                    // MLA
                                    op = <any>this.armCompiler.constructMLA(rd, rn, rs, rm, condOp);
                                    break;
                                case 0x00300000:
                                    // MLAS
                                    op = <any>this.armCompiler.constructMLAS(rd, rn, rs, rm, condOp);
                                    break;
                                case 0x00800000:
                                    // UMULL
                                    op = <any>this.armCompiler.constructUMULL(rd, rn, rs, rm, condOp);
                                    break;
                                case 0x00900000:
                                    // UMULLS
                                    op = <any>this.armCompiler.constructUMULLS(rd, rn, rs, rm, condOp);
                                    break;
                                case 0x00A00000:
                                    // UMLAL
                                    op = <any>this.armCompiler.constructUMLAL(rd, rn, rs, rm, condOp);
                                    break;
                                case 0x00B00000:
                                    // UMLALS
                                    op = <any>this.armCompiler.constructUMLALS(rd, rn, rs, rm, condOp);
                                    break;
                                case 0x00C00000:
                                    // SMULL
                                    op = <any>this.armCompiler.constructSMULL(rd, rn, rs, rm, condOp);
                                    break;
                                case 0x00D00000:
                                    // SMULLS
                                    op = <any>this.armCompiler.constructSMULLS(rd, rn, rs, rm, condOp);
                                    break;
                                case 0x00E00000:
                                    // SMLAL
                                    op = <any>this.armCompiler.constructSMLAL(rd, rn, rs, rm, condOp);
                                    break;
                                case 0x00F00000:
                                    // SMLALS
                                    op = <any>this.armCompiler.constructSMLALS(rd, rn, rs, rm, condOp);
                                    break;
                            }
                            op.writesPC = rd == Register.PC;
                        } else {
                            // Halfword and signed byte data transfer
                            var load = instruction & 0x00100000;
                            var rd = (instruction & 0x0000F000) >> 12;
                            var hiOffset = (instruction & 0x00000F00) >> 4;
                            var loOffset = rm = instruction & 0x0000000F;
                            var h = instruction & 0x00000020;
                            var s = instruction & 0x00000040;
                            var w = instruction & 0x00200000;
                            var i = instruction & 0x00400000;

                            if (i) {
                                var immediate = loOffset | hiOffset;
                                address = this.armCompiler.constructAddressingMode23Immediate(instruction, immediate, condOp);
                            } else {
                                address = this.armCompiler.constructAddressingMode23Register(instruction, rm, condOp);
                            }
                            address.writesPC = !!w && rn == Register.PC;

                            if ((instruction & 0x00000090) == 0x00000090) {
                                if (load) {
                                    // Load [signed] halfword/byte
                                    if (h) {
                                        if (s) {
                                            // LDRSH
                                            op = <any>this.armCompiler.constructLDRSH(rd, address, condOp);
                                        } else {
                                            // LDRH
                                            op = <any>this.armCompiler.constructLDRH(rd, address, condOp);
                                        }
                                    } else {
                                        if (s) {
                                            // LDRSB
                                            op = <any>this.armCompiler.constructLDRSB(rd, address, condOp);
                                        }
                                    }
                                } else if (!s && h) {
                                    // STRH
                                    op = <any>this.armCompiler.constructSTRH(rd, address, condOp);
                                }
                            }
                            op.writesPC = rd == Register.PC || address.writesPC;
                        }
                        break;
                    case 0x04000000:
                    case 0x06000000:
                        // LDR/STR
                        var rd = (instruction & 0x0000F000) >> 12;
                        var load = instruction & 0x00100000;
                        var b = instruction & 0x00400000;
                        var i = instruction & 0x02000000;

                        if (~instruction & 0x01000000) {
                            // Clear the W bit if the P bit is clear--we don't support memory translation, so these turn into regular accesses
                            instruction &= 0xFFDFFFFF;
                        }
                        if (i) {
                            // Register offset
                            var rm = instruction & 0x0000000F;
                            var shiftType = instruction & 0x00000060;
                            var shiftImmediate = (instruction & 0x00000F80) >> 7;

                            if (shiftType || shiftImmediate) {
                                shiftOp = this.barrelShiftImmediate(instruction, shiftType, shiftImmediate, rm);
                                address = this.armCompiler.constructAddressingMode2RegisterShifted(instruction, shiftOp, condOp);
                            } else {
                                address = this.armCompiler.constructAddressingMode23Register(instruction, rm, condOp);
                            }
                        } else {
                            // Immediate
                            var offset = instruction & 0x00000FFF;
                            address = this.armCompiler.constructAddressingMode23Immediate(instruction, offset, condOp);
                        }
                        if (load) {
                            if (b) {
                                // LDRB
                                op = <any>this.armCompiler.constructLDRB(rd, address, condOp);
                            } else {
                                // LDR
                                op = <any>this.armCompiler.constructLDR(rd, address, condOp);
                            }
                        } else {
                            if (b) {
                                // STRB
                                op = <any>this.armCompiler.constructSTRB(rd, address, condOp);
                            } else {
                                // STR
                                op = <any>this.armCompiler.constructSTR(rd, address, condOp);
                            }
                        }
                        op.writesPC = rd == Register.PC || address.writesPC;
                        break;
                    case 0x08000000:
                        // Block data transfer
                        var load = instruction & 0x00100000;
                        var w = instruction & 0x00200000;
                        var user = instruction & 0x00400000;
                        var u = instruction & 0x00800000;
                        var p = instruction & 0x01000000;
                        var rs = instruction & 0x0000FFFF;
                        var rn = (instruction & 0x000F0000) >> 16;

                        var immediate = 0;
                        var offset = 0;
                        var overlap = false;
                        if (u) {
                            if (p) {
                                immediate = 4;
                            }
                            for (var m = 0x01, i = 0; i < 16; m <<= 1, i++) {
                                if (rs & m) {
                                    if (w && i == rn && !offset) {
                                        rs &= ~m;
                                        immediate += 4;
                                        overlap = true;
                                    }
                                    offset += 4;
                                }
                            }
                        } else {
                            if (!p) {
                                immediate = 4;
                            }
                            for (var m = 0x01, i = 0; i < 16; m <<= 1, i++) {
                                if (rs & m) {
                                    if (w && i == rn && !offset) {
                                        rs &= ~m;
                                        immediate += 4;
                                        overlap = true;
                                    }
                                    immediate -= 4;
                                    offset -= 4;
                                }
                            }
                        }
                        if (w) {
                            address = <any>this.armCompiler.constructAddressingMode4Writeback(immediate, offset, rn, overlap);
                        } else {
                            address = <any>this.armCompiler.constructAddressingMode4(immediate, rn);
                        }
                        if (load) {
                            // LDM
                            if (user) {
                                op = <any>this.armCompiler.constructLDMS(rs, address, condOp);
                            } else {
                                op = <any>this.armCompiler.constructLDM(rs, address, condOp);
                            }
                            op.writesPC = !!(rs & (1 << 15));
                        } else {
                            // STM
                            if (user) {
                                op = <any>this.armCompiler.constructSTMS(rs, address, condOp);
                            } else {
                                op = <any>this.armCompiler.constructSTM(rs, address, condOp);
                            }
                            op.writesPC = false;
                        }
                        break;
                    case 0x0A000000:
                        // Branch
                        var immediate = instruction & 0x00FFFFFF;
                        if (immediate & 0x00800000) {
                            immediate |= 0xFF000000;
                        }
                        immediate <<= 2;
                        var link = instruction & 0x01000000;
                        if (link) {
                            op = <any>this.armCompiler.constructBL(immediate, condOp);
                        } else {
                            op = <any>this.armCompiler.constructB(immediate, condOp);
                        }
                        op.writesPC = true;
                        op.fixedJump = true;
                        break;
                    case 0x0C000000:
                        // Coprocessor data transfer
                        break;
                    case 0x0E000000:
                        // Coprocessor data operation/SWI
                        if ((instruction & 0x0F000000) == 0x0F000000) {
                            // SWI
                            var immediate = (instruction & 0x00FFFFFF);
                            op = <any>this.armCompiler.constructSWI(immediate, condOp);
                            op.writesPC = false;
                        }
                        break;
                    default:
                        throw 'Bad opcode: 0x' + instruction.toString(16);
                }
            }

            op.execMode = ExecMode.ARM;
            op.fixedJump = op.fixedJump || false;
            return op;
        }

        private compileThumb(instruction:number):Instruction {
            var op = ARMCore.badOp(instruction & 0xFFFF);
            if ((instruction & 0xFC00) == 0x4000) {
                // Data-processing register
                var rm = (instruction & 0x0038) >> 3;
                var rd = instruction & 0x0007;
                switch (instruction & 0x03C0) {
                    case 0x0000:
                        // AND
                        op = <any>this.thumbCompiler.constructAND(rd, rm);
                        break;
                    case 0x0040:
                        // EOR
                        op = <any>this.thumbCompiler.constructEOR(rd, rm);
                        break;
                    case 0x0080:
                        // LSL(2)
                        op = <any>this.thumbCompiler.constructLSL2(rd, rm);
                        break;
                    case 0x00C0:
                        // LSR(2)
                        op = <any>this.thumbCompiler.constructLSR2(rd, rm);
                        break;
                    case 0x0100:
                        // ASR(2)
                        op = <any>this.thumbCompiler.constructASR2(rd, rm);
                        break;
                    case 0x0140:
                        // ADC
                        op = <any>this.thumbCompiler.constructADC(rd, rm);
                        break;
                    case 0x0180:
                        // SBC
                        op = <any>this.thumbCompiler.constructSBC(rd, rm);
                        break;
                    case 0x01C0:
                        // ROR
                        op = <any>this.thumbCompiler.constructROR(rd, rm);
                        break;
                    case 0x0200:
                        // TST
                        op = <any>this.thumbCompiler.constructTST(rd, rm);
                        break;
                    case 0x0240:
                        // NEG
                        op = <any>this.thumbCompiler.constructNEG(rd, rm);
                        break;
                    case 0x0280:
                        // CMP(2)
                        op = <any>this.thumbCompiler.constructCMP2(rd, rm);
                        break;
                    case 0x02C0:
                        // CMN
                        op = <any>this.thumbCompiler.constructCMN(rd, rm);
                        break;
                    case 0x0300:
                        // ORR
                        op = <any>this.thumbCompiler.constructORR(rd, rm);
                        break;
                    case 0x0340:
                        // MUL
                        op = <any>this.thumbCompiler.constructMUL(rd, rm);
                        break;
                    case 0x0380:
                        // BIC
                        op = <any>this.thumbCompiler.constructBIC(rd, rm);
                        break;
                    case 0x03C0:
                        // MVN
                        op = <any>this.thumbCompiler.constructMVN(rd, rm);
                        break;
                }
                op.writesPC = false;
            } else if ((instruction & 0xFC00) == 0x4400) {
                // Special data processing / branch/exchange instruction set
                var rm = (instruction & 0x0078) >> 3;
                var rn = instruction & 0x0007;
                var h1 = instruction & 0x0080;
                var rd = rn | (h1 >> 4);
                switch (instruction & 0x0300) {
                    case 0x0000:
                        // ADD(4)
                        op = <any>this.thumbCompiler.constructADD4(rd, rm);
                        op.writesPC = rd == Register.PC;
                        break;
                    case 0x0100:
                        // CMP(3)
                        op = <any>this.thumbCompiler.constructCMP3(rd, rm);
                        op.writesPC = false;
                        break;
                    case 0x0200:
                        // MOV(3)
                        op = <any>this.thumbCompiler.constructMOV3(rd, rm);
                        op.writesPC = rd == Register.PC;
                        break;
                    case 0x0300:
                        // BX
                        op = <any>this.thumbCompiler.constructBX(rd, rm);
                        op.writesPC = true;
                        op.fixedJump = false;
                        break;
                }
            } else if ((instruction & 0xF800) == 0x1800) {
                // Add/subtract
                var rm = (instruction & 0x01C0) >> 6;
                var rn = (instruction & 0x0038) >> 3;
                var rd = instruction & 0x0007;
                switch (instruction & 0x0600) {
                    case 0x0000:
                        // ADD(3)
                        op = <any>this.thumbCompiler.constructADD3(rd, rn, rm);
                        break;
                    case 0x0200:
                        // SUB(3)
                        op = <any>this.thumbCompiler.constructSUB3(rd, rn, rm);
                        break;
                    case 0x0400:
                        var immediate = (instruction & 0x01C0) >> 6;
                        if (immediate) {
                            // ADD(1)
                            op = <any>this.thumbCompiler.constructADD1(rd, rn, immediate);
                        } else {
                            // MOV(2)
                            op = <any>this.thumbCompiler.constructMOV2(rd, rn, rm);
                        }
                        break;
                    case 0x0600:
                        // SUB(1)
                        var immediate = (instruction & 0x01C0) >> 6;
                        op = <any>this.thumbCompiler.constructSUB1(rd, rn, immediate);
                        break;
                }
                op.writesPC = false;
            } else if (!(instruction & 0xE000)) {
                // Shift by immediate
                var rd = instruction & 0x0007;
                var rm = (instruction & 0x0038) >> 3;
                var immediate = (instruction & 0x07C0) >> 6;
                switch (instruction & 0x1800) {
                    case 0x0000:
                        // LSL(1)
                        op = <any>this.thumbCompiler.constructLSL1(rd, rm, immediate);
                        break;
                    case 0x0800:
                        // LSR(1)
                        op = <any>this.thumbCompiler.constructLSR1(rd, rm, immediate);
                        break;
                    case 0x1000:
                        // ASR(1)
                        op = <any>this.thumbCompiler.constructASR1(rd, rm, immediate);
                        break;
                    case 0x1800:
                        break;
                }
                op.writesPC = false;
            } else if ((instruction & 0xE000) == 0x2000) {
                // Add/subtract/compare/move immediate
                var immediate = instruction & 0x00FF;
                var rn = (instruction & 0x0700) >> 8;
                switch (instruction & 0x1800) {
                    case 0x0000:
                        // MOV(1)
                        op = <any>this.thumbCompiler.constructMOV1(rn, immediate);
                        break;
                    case 0x0800:
                        // CMP(1)
                        op = <any>this.thumbCompiler.constructCMP1(rn, immediate);
                        break;
                    case 0x1000:
                        // ADD(2)
                        op = <any>this.thumbCompiler.constructADD2(rn, immediate);
                        break;
                    case 0x1800:
                        // SUB(2)
                        op = <any>this.thumbCompiler.constructSUB2(rn, immediate);
                        break;
                }
                op.writesPC = false;
            } else if ((instruction & 0xF800) == 0x4800) {
                // LDR(3)
                var rd = (instruction & 0x0700) >> 8;
                var immediate = (instruction & 0x00FF) << 2;
                op = <any>this.thumbCompiler.constructLDR3(rd, immediate);
                op.writesPC = false;
            } else if ((instruction & 0xF000) == 0x5000) {
                // Load and store with relative offset
                var rd = instruction & 0x0007;
                var rn = (instruction & 0x0038) >> 3;
                var rm = (instruction & 0x01C0) >> 6;
                var opcode = instruction & 0x0E00;
                switch (opcode) {
                    case 0x0000:
                        // STR(2)
                        op = <any>this.thumbCompiler.constructSTR2(rd, rn, rm);
                        break;
                    case 0x0200:
                        // STRH(2)
                        op = <any>this.thumbCompiler.constructSTRH2(rd, rn, rm);
                        break;
                    case 0x0400:
                        // STRB(2)
                        op = <any>this.thumbCompiler.constructSTRB2(rd, rn, rm);
                        break;
                    case 0x0600:
                        // LDRSB
                        op = <any>this.thumbCompiler.constructLDRSB(rd, rn, rm);
                        break;
                    case 0x0800:
                        // LDR(2)
                        op = <any>this.thumbCompiler.constructLDR2(rd, rn, rm);
                        break;
                    case 0x0A00:
                        // LDRH(2)
                        op = <any>this.thumbCompiler.constructLDRH2(rd, rn, rm);
                        break;
                    case 0x0C00:
                        // LDRB(2)
                        op = <any>this.thumbCompiler.constructLDRB2(rd, rn, rm);
                        break;
                    case 0x0E00:
                        // LDRSH
                        op = <any>this.thumbCompiler.constructLDRSH(rd, rn, rm);
                        break;
                }
                op.writesPC = false;
            } else if ((instruction & 0xE000) == 0x6000) {
                // Load and store with immediate offset
                var rd = instruction & 0x0007;
                var rn = (instruction & 0x0038) >> 3;
                var immediate = (instruction & 0x07C0) >> 4;
                var b = instruction & 0x1000;
                if (b) {
                    immediate >>= 2;
                }
                var load = instruction & 0x0800;
                if (load) {
                    if (b) {
                        // LDRB(1)
                        op = <any>this.thumbCompiler.constructLDRB1(rd, rn, immediate);
                    } else {
                        // LDR(1)
                        op = <any>this.thumbCompiler.constructLDR1(rd, rn, immediate);
                    }
                } else {
                    if (b) {
                        // STRB(1)
                        op = <any>this.thumbCompiler.constructSTRB1(rd, rn, immediate);
                    } else {
                        // STR(1)
                        op = <any>this.thumbCompiler.constructSTR1(rd, rn, immediate);
                    }
                }
                op.writesPC = false;
            } else if ((instruction & 0xF600) == 0xB400) {
                // Push and pop registers
                var r = !!(instruction & 0x0100);
                var rs = instruction & 0x00FF;
                if (instruction & 0x0800) {
                    // POP
                    op = <any>this.thumbCompiler.constructPOP(rs, r);
                    op.writesPC = r;
                    op.fixedJump = false;
                } else {
                    // PUSH
                    op = <any>this.thumbCompiler.constructPUSH(rs, r);
                    op.writesPC = false;
                }
            } else if (instruction & 0x8000) {
                switch (instruction & 0x7000) {
                    case 0x0000:
                        // Load and store halfword
                        var rd = instruction & 0x0007;
                        var rn = (instruction & 0x0038) >> 3;
                        var immediate = (instruction & 0x07C0) >> 5;
                        if (instruction & 0x0800) {
                            // LDRH(1)
                            op = <any>this.thumbCompiler.constructLDRH1(rd, rn, immediate);
                        } else {
                            // STRH(1)
                            op = <any>this.thumbCompiler.constructSTRH1(rd, rn, immediate);
                        }
                        op.writesPC = false;
                        break;
                    case 0x1000:
                        // SP-relative load and store
                        var rd = (instruction & 0x0700) >> 8;
                        var immediate = (instruction & 0x00FF) << 2;
                        var load = instruction & 0x0800;
                        if (load) {
                            // LDR(4)
                            op = <any>this.thumbCompiler.constructLDR4(rd, immediate);
                        } else {
                            // STR(3)
                            op = <any>this.thumbCompiler.constructSTR3(rd, immediate);
                        }
                        op.writesPC = false;
                        break;
                    case 0x2000:
                        // Load address
                        var rd = (instruction & 0x0700) >> 8;
                        var immediate = (instruction & 0x00FF) << 2;
                        if (instruction & 0x0800) {
                            // ADD(6)
                            op = <any>this.thumbCompiler.constructADD6(rd, immediate);
                        } else {
                            // ADD(5)
                            op = <any>this.thumbCompiler.constructADD5(rd, immediate);
                        }
                        op.writesPC = false;
                        break;
                    case 0x3000:
                        // Miscellaneous
                        if (!(instruction & 0x0F00)) {
                            // Adjust stack pointer
                            // ADD(7)/SUB(4)
                            var b = instruction & 0x0080;
                            var immediate = (instruction & 0x7F) << 2;
                            if (b) {
                                immediate = -immediate;
                            }
                            op = <any>this.thumbCompiler.constructADD7(immediate);
                            op.writesPC = false;
                        }
                        break;
                    case 0x4000:
                        // Multiple load and store
                        var rn = (instruction & 0x0700) >> 8;
                        var rs = instruction & 0x00FF;
                        if (instruction & 0x0800) {
                            // LDMIA
                            op = <any>this.thumbCompiler.constructLDMIA(rn, rs);
                        } else {
                            // STMIA
                            op = <any>this.thumbCompiler.constructSTMIA(rn, rs);
                        }
                        op.writesPC = false;
                        break;
                    case 0x5000:
                        // Conditional branch
                        var cond = (instruction & 0x0F00) >> 8;
                        var immediate = (instruction & 0x00FF);
                        if (cond == 0xF) {
                            // SWI
                            op = <any>this.thumbCompiler.constructSWI(immediate);
                            op.writesPC = false;
                        } else {
                            // B(1)
                            if (instruction & 0x0080) {
                                immediate |= 0xFFFFFF00;
                            }
                            immediate <<= 1;
                            var condOp = this.conds[cond];
                            op = <any>this.thumbCompiler.constructB1(immediate, condOp);
                            op.writesPC = true;
                            op.fixedJump = true;
                        }
                        break;
                    case 0x6000:
                    case 0x7000:
                        // BL(X)
                        var immediate = instruction & 0x07FF;
                        var h = instruction & 0x1800;
                        switch (h) {
                            case 0x0000:
                                // B(2)
                                if (immediate & 0x0400) {
                                    immediate |= 0xFFFFF800;
                                }
                                immediate <<= 1;
                                op = <any>this.thumbCompiler.constructB2(immediate);
                                op.writesPC = true;
                                op.fixedJump = true;
                                break;
                            case 0x0800:
                                // BLX (ARMv5T)
//                                op = () => {
//                                    var pc = this.gprs[Register.PC];
//                                    this.gprs[Register.PC] = (this.gprs[Register.LR] + (immediate << 1)) & 0xFFFFFFFC;
//                                    this.gprs[Register.LR] = pc - 1;
//                                    this.switchExecMode(ExecMode.ARM);
//                                };
                                break;
                            case 0x1000:
                                // BL(1)
                                if (immediate & 0x0400) {
                                    immediate |= 0xFFFFFC00;
                                }
                                immediate <<= 12;
                                op = <any>this.thumbCompiler.constructBL1(immediate);
                                op.writesPC = false;
                                break;
                            case 0x1800:
                                // BL(2)
                                op = <any>this.thumbCompiler.constructBL2(immediate);
                                op.writesPC = true;
                                op.fixedJump = false;
                                break;
                        }
                        break;
                    default:
                        this.gba.logger.WARN("Undefined instruction: 0x" + instruction.toString(16));
                }
            } else {
                throw 'Bad opcode: 0x' + instruction.toString(16);
            }

            op.execMode = ExecMode.THUMB;
            op.fixedJump = op.fixedJump || false;
            return op;
        }

        private fetchPage(address:number):void {
            var region = address >> MMU.BASE_OFFSET;
            var pageId = this.gba.mmu.addressToPage(region, address & MMU.OFFSET_MASK);
            if (region == this.pageRegion) {
                if (pageId == this.pageId && !this.page.invalid) {
                    return;
                }
                this.pageId = pageId;
            } else {
                this.pageId = pageId;
                this.pageMask = this.gba.mmu.memory[region].PAGE_MASK;
                this.pageRegion = region;
            }

            this.page = this.gba.mmu.accessPage(region, pageId);
        }

        private loadInstruction:{(address:number):Instruction};

        private loadInstructionArm(address:number):Instruction {
            this.fetchPage(address);
            var offset = (address & this.pageMask) / ARMCoreArm.WORD_SIZE;
            var next = this.page.arm[offset];
            if (next) {
                return next;
            }
            var instruction = this.gba.mmu.load32(address);
            next = this.compileArm(instruction);
            next.next = null;
            next.page = this.page;
            next.address = address;
            next.opcode = instruction;
            this.page.arm[offset] = next;
            return next;
        }

        private loadInstructionThumb(address:number):Instruction {
            this.fetchPage(address);
            var offset = (address & this.pageMask) / ARMCoreThumb.WORD_SIZE;
            var next = this.page.thumb[offset];
            if (next) {
                return next;
            }
            var instruction = this.gba.mmu.load16(address);
            next = this.compileThumb(instruction);
            next.next = null;
            next.page = this.page;
            next.address = address;
            next.opcode = instruction;
            this.page.thumb[offset] = next;
            return next;
        }

    }
}