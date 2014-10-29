/// <reference path="../js/util.ts"/>

class GameBoyAdvanceConsole {

    cpu:ARMCore;
    gba:GameBoyAdvance;
    ul:HTMLElement;
    gprs:HTMLElement;
    memory:Memory;
    breakpoints:boolean[];
    logQueue:string[];
    activeView:any;
    paletteView:PaletteViewer;
    tileView:TileViewer;

    constructor(gba:GameBoyAdvance) {
        this.gba = gba;
        this.cpu = gba.cpu;
        this.ul = document.getElementById('console');
        this.gprs = document.getElementById('gprs');
        this.memory = new Memory(gba.mmu);
        this.breakpoints = [];
        this.logQueue = [];

        this.activeView = null;
        this.paletteView = new PaletteViewer(gba.video.renderPath.palette);
        this.tileView = new TileViewer(gba.video.renderPath.vram, gba.video.renderPath.palette);
        this.update();

        gba.logger.log = this.log;
        this.gba.doStep = () => {
            return this.testBreakpoints()
        };
    }

    updateGPRs() {
        for (var i = 0; i < 16; ++i) {
            this.gprs.children[i].textContent = hex(this.cpu.gprs[i]);
        }
    }

    updateCPSR() {
        var cpu = this.cpu;
        var bit = (psr:string, member:string) => {
            var element:any = document.getElementById(psr);
            if ((<any>cpu)[member]) {
                element.removeAttribute('class');
            } else {
                element.setAttribute('class', 'disabled');
            }
        };
        bit('cpsrN', '.N');
        bit('cpsrZ', 'cpsr.Z');
        bit('cpsrC', 'cpsr.C');
        bit('cpsrV', 'cpsr.V');
        bit('cpsrI', 'cpsr.I');
        bit('cpsrT', 'execMode');

        var mode = document.getElementById('mode');
        switch (cpu.mode) {
            case Mode.USER:
                mode.textContent = 'USER';
                break;
            case Mode.IRQ:
                mode.textContent = 'IRQ';
                break;
            case Mode.FIQ:
                mode.textContent = 'FIQ';
                break;
            case Mode.SUPERVISOR:
                mode.textContent = 'SVC';
                break;
            case Mode.ABORT:
                mode.textContent = 'ABORT';
                break;
            case Mode.UNDEFINED:
                mode.textContent = 'UNDEFINED';
                break;
            case Mode.SYSTEM:
                mode.textContent = 'SYSTEM';
                break;
            default:
                mode.textContent = '???';
                break;
        }
    }

    stillRunning:boolean;

    log(level:number, message:any):void {
        switch (level) {
            case LoggerLevel.ERROR:
                message = '[ERROR] ' + message;
                break;
            case LoggerLevel.WARN:
                message = '[WARN] ' + message;
                break;
            case LoggerLevel.STUB:
                message = '[STUB] ' + message;
                break;
            case LoggerLevel.INFO:
                message = '[INFO] ' + message;
                break;
            case LoggerLevel.DEBUG:
                message = '[DEBUG] ' + message;
                break;
        }
        this.logQueue.push(message);
        if (level == LoggerLevel.ERROR) {
            this.pause();
        }
        if (!this.stillRunning) {
            this.flushLog();
        }
    }

    flushLog() {
        var doScroll = this.ul.scrollTop == this.ul.scrollHeight - this.ul.offsetHeight;
        while (this.logQueue.length) {
            var entry = document.createElement('li');
            entry.textContent = this.logQueue.shift();
            this.ul.appendChild(entry);
        }
        if (doScroll) {
            var ul = this.ul;
            var last = ul.scrollTop;
            var scrollUp = () => {
                if (ul.scrollTop == last) {
                    ul.scrollTop = (ul.scrollHeight - ul.offsetHeight) * 0.2 + last * 0.8;
                    last = ul.scrollTop;
                    if (last != ul.scrollHeight - ul.offsetHeight) {
                        setTimeout(scrollUp, 25);
                    }
                }
            };
            setTimeout(scrollUp, 25);
        }
    }

    update() {
        this.updateGPRs();
        this.updateCPSR();
        this.memory.refreshAll();
        if (this.activeView) {
            this.activeView.redraw();
        }
    }

    setView(view:any) {
        var container = document.getElementById('debugViewer');
        while (container.hasChildNodes()) {
            container.removeChild(container.lastChild);
        }
        if (view) {
            view.insertChildren(container);
            view.redraw();
        }
        this.activeView = view;
    }

    step() {
        try {
            this.cpu.step();
            this.update();
        } catch (exception) {
            this.log(LoggerLevel.DEBUG, exception);
            throw exception;
        }
    }

    runVisible() {
        if (this.stillRunning) {
            return;
        }

        this.stillRunning = true;
        var self = this;
        var run = () => {
            if (self.stillRunning) {
                try {
                    self.step();
                    if (self.breakpoints.length && self.breakpoints[self.cpu.gprs[Register.PC]]) {
                        self.breakpointHit();
                        return;
                    }
                    self.flushLog();
                    setTimeout(run, 0);
                } catch (exception) {
                    self.log(LoggerLevel.DEBUG, exception);
                    self.pause();
                    throw exception;
                }
            }
        };
        setTimeout(run, 0);
    }

    run() {
        if (this.stillRunning) {
            return;
        }

        this.stillRunning = true;
        var regs = document.getElementById('registers');
        var mem = document.getElementById('memory');
        var start = Date.now();
        regs.setAttribute('class', 'disabled');
        mem.setAttribute('class', 'disabled');
        var self = this;
        this.gba.runStable();
    }

    runFrame() {
        if (this.stillRunning) {
            return;
        }

        this.stillRunning = true;
        var regs = document.getElementById('registers');
        var mem = document.getElementById('memory');
        var start = Date.now();
        regs.setAttribute('class', 'disabled');
        mem.setAttribute('class', 'disabled');
        var self = this;
        var run = () => {
            self.gba.step();
            self.pause();
        };
        setTimeout(run, 0);
    }

    pause() {
        this.stillRunning = false;
        this.gba.pause();
        var regs = document.getElementById('registers');
        var mem = document.getElementById('memory');
        mem.removeAttribute('class');
        regs.removeAttribute('class');
        this.update();
        this.flushLog();
    }

    breakpointHit() {
        this.pause();
        this.log(LoggerLevel.DEBUG, 'Hit breakpoint at ' + hex(this.cpu.gprs[Register.PC]));
    }

    addBreakpoint(addr:number) {
        this.breakpoints[addr] = true;
        var bpLi:any = document.getElementById('bp' + addr);
        if (!bpLi) {
            bpLi = document.createElement('li');
            bpLi.address = addr;
            var cb = document.createElement('input');
            cb.setAttribute('type', 'checkbox');
            cb.setAttribute('checked', 'checked');
            var self = this;
            cb.addEventListener('click', () => {
                self.breakpoints[addr] = cb.checked;
            }, false);
            bpLi.appendChild(cb);
            bpLi.appendChild(document.createTextNode(hex(addr)));
            document.getElementById('breakpointView').appendChild(bpLi);
        }
    }

    testBreakpoints() {
        if (this.breakpoints.length && this.breakpoints[this.cpu.gprs[Register.PC]]) {
            this.breakpointHit();
            return false;
        }
        return this.gba.waitFrame();
    }

}

class Memory {

    mmu:GameBoyAdvanceMMU;
    ul:any;
    rowHeight:number;
    numberRows:number;
    scrollTop:number;

    constructor(mmu:GameBoyAdvanceMMU) {
        this.mmu = mmu;
        this.ul = null;
        this.ul = document.getElementById('memoryView');
        var row = Memory.createRow(0);
        this.ul.appendChild(row);
        this.rowHeight = row.offsetHeight;
        this.numberRows = this.ul.parentNode.offsetHeight / this.rowHeight + 2;
        this.ul.removeChild(row);
        this.scrollTop = 50 - this.ul.parentElement.firstElementChild.offsetHeight;

        for (var i = 0; i < this.numberRows; ++i) {
            this.ul.appendChild(Memory.createRow(i << 4));
        }
        this.ul.parentElement.scrollTop = this.scrollTop;

        this.ul.parentElement.addEventListener('scroll', (e:UIEvent) => {
            this.scroll(e)
        }, true);
        window.addEventListener('resize', (e) => {
            this.resize()
        }, true);
    }

    scroll(e:UIEvent) {
        while (this.ul.parentElement.scrollTop - this.scrollTop < this.rowHeight) {
            if (this.ul.firstChild.offset == 0) {
                break;
            }
            var victim:any = this.ul.lastChild;
            this.ul.removeChild(victim);
            victim.offset = this.ul.firstChild.offset - 16;
            this.refresh(victim);
            this.ul.insertBefore(victim, this.ul.firstChild);
            this.ul.parentElement.scrollTop += this.rowHeight;
        }
        while (this.ul.parentElement.scrollTop - this.scrollTop > this.rowHeight * 2) {
            var victim:any = this.ul.firstChild;
            this.ul.removeChild(victim);
            victim.offset = this.ul.lastChild.offset + 16;
            this.refresh(victim);
            this.ul.appendChild(victim);
            this.ul.parentElement.scrollTop -= this.rowHeight;
        }
        if (this.ul.parentElement.scrollTop < this.scrollTop) {
            this.ul.parentElement.scrollTop = this.scrollTop;
            e.preventDefault();
        }
    }

    resize() {
        this.numberRows = this.ul.parentNode.offsetHeight / this.rowHeight + 2;
        if (this.numberRows > this.ul.children.length) {
            var offset = this.ul.lastChild.offset + 16;
            for (var i = 0; i < this.numberRows - this.ul.children.length; ++i) {
                var row = Memory.createRow(offset);
                this.refresh(row);
                this.ul.appendChild(row);
                offset += 16;
            }
        } else {
            for (var i = 0; i < this.ul.children.length - this.numberRows; ++i) {
                this.ul.removeChild(this.ul.lastChild);
            }
        }
    }

    refresh(row:any) {
        var showChanged:boolean;
        var newValue:any;
        var child:any;
        row.firstChild.textContent = hex(row.offset);
        if (row.oldOffset == row.offset) {
            showChanged = true;
        } else {
            row.oldOffset = row.offset;
            showChanged = false;
        }
        for (var i = 0; i < 16; ++i) {
            child = row.children[i + 1];
            try {
                newValue = this.mmu.loadU8(row.offset + i);
                if (newValue >= 0) {
                    newValue = hex(newValue, 2, false);
                    if (child.textContent == newValue) {
                        child.setAttribute('class', 'memoryCell');
                    } else if (showChanged) {
                        child.setAttribute('class', 'memoryCell changed');
                        child.textContent = newValue;
                    } else {
                        child.setAttribute('class', 'memoryCell');
                        child.textContent = newValue;
                    }
                } else {
                    child.setAttribute('class', 'memoryCell');
                    child.textContent = '--';
                }
            } catch (exception) {
                child.setAttribute('class', 'memoryCell');
                child.textContent = '--';
            }
        }
    }

    refreshAll() {
        for (var i = 0; i < this.ul.children.length; ++i) {
            this.refresh(this.ul.children[i]);
        }
    }

    static createRow(startOffset:number) {
        var li:any = document.createElement('li');
        var offset = document.createElement('span');
        offset.setAttribute('class', 'memoryOffset');
        offset.textContent = hex(startOffset);
        li.appendChild(offset);

        for (var i = 0; i < 16; ++i) {
            var b = document.createElement('span');
            b.textContent = '00';
            b.setAttribute('class', 'memoryCell');
            li.appendChild(b);
        }
        li.offset = startOffset;
        li.oldOffset = startOffset;
        return li;
    }

    scrollTo(offset:number) {
        offset &= 0xFFFFFFF0;
        if (offset) {
            for (var i = 0; i < this.ul.children.length; ++i) {
                var child = this.ul.children[i];
                child.offset = offset + (i - 1) * 16;
                this.refresh(child);
            }
            this.ul.parentElement.scrollTop = this.scrollTop + this.rowHeight;
        } else {
            for (var i = 0; i < this.ul.children.length; ++i) {
                var child = this.ul.children[i];
                child.offset = offset + i * 16;
                this.refresh(child);
            }
            this.ul.parentElement.scrollTop = this.scrollTop;
        }
    }
}

/**
 *
 * @constructor
 */
class PaletteViewer {

    palette:GameBoyAdvancePalette;
    view:any;

    constructor(palette:GameBoyAdvancePalette) {
        this.palette = palette;
        this.view = document.createElement('canvas');
        this.view.setAttribute('class', 'paletteView');
        this.view.setAttribute('width', '240');
        this.view.setAttribute('height', '500');
    }

    insertChildren(container:any) {
        container.appendChild(this.view);
    }

    redraw() {
        var context = this.view.getContext('2d');
        context.clearRect(0, 0, this.view.width, this.view.height);
        for (var p = 0; p < 2; ++p) {
            for (var y = 0; y < 16; ++y) {
                for (var x = 0; x < 16; ++x) {
                    var color = this.palette.loadU16((p * 256 + y * 16 + x) * 2);
                    var r = (color & 0x001F) << 3;
                    var g = (color & 0x03E0) >> 2;
                    var b = (color & 0x7C00) >> 7;
                    context.fillStyle = '#' + hex(r, 2, false) + hex(g, 2, false) + hex(b, 2, false);
                    context.fillRect(x * 15 + 1, y * 15 + p * 255 + 1, 13, 13);
                }
            }
        }
    }
}

class TileViewer {

    BG_MAP_WIDTH = 256;
    vram:GameBoyAdvanceVRAM;
    palette:GameBoyAdvancePalette;
    view:any;
    activePalette:number;

    constructor(vram:GameBoyAdvanceVRAM, palette:GameBoyAdvancePalette) {
        this.vram = vram;
        this.palette = palette;

        this.view = document.createElement('canvas');
        this.view.setAttribute('class', 'tileView');
        this.view.setAttribute('width', '256');
        this.view.setAttribute('height', '512');

        this.activePalette = 0;
    }

    insertChildren(container:any) {
        container.appendChild(this.view);
    }

    redraw() {
        var context = this.view.getContext('2d');
        var data = context.createImageData(this.BG_MAP_WIDTH, 512);
        var t = 0;
        for (var y = 0; y < 512; y += 8) {
            for (var x = 0; x < this.BG_MAP_WIDTH; x += 8) {
                this.drawTile(data.data, t, this.activePalette, x + y * this.BG_MAP_WIDTH, this.BG_MAP_WIDTH);
                ++t;
            }
        }
        context.putImageData(data, 0, 0);
    }

    drawTile(data:Uint8Array, tile:number, palette:number, offset:number, stride:number) {
        for (var j = 0; j < 8; ++j) {
            var memOffset = tile << 5;
            memOffset |= j << 2;

            var row = this.vram.load32(memOffset);
            for (var i = 0; i < 8; ++i) {
                var index = (row >> (i << 2)) & 0xF;
                var color = this.palette.loadU16((index << 1) + (palette << 5));
                var r = (color & 0x001F) << 3;
                var g = (color & 0x03E0) >> 2;
                var b = (color & 0x7C00) >> 7;
                data[(offset + i + stride * j) * 4 + 0] = r;
                data[(offset + i + stride * j) * 4 + 1] = g;
                data[(offset + i + stride * j) * 4 + 2] = b;
                data[(offset + i + stride * j) * 4 + 3] = 255;
            }
        }
    }
}