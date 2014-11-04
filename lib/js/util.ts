function hex(i:number, leading = 8, usePrefix = true) {
    var s = uint(i).toString(16).toUpperCase();
    leading -= s.length;
    if (leading < 0)
        return s;
    return (usePrefix ? '0x' : '') + new Array(leading + 1).join('0') + s;
}

function decodeBase64(string:string) {
    var length = (string.length * 3 / 4);
    if (string[string.length - 2] == '=') {
        length -= 2;
    } else if (string[string.length - 1] == '=') {
        length -= 1;
    }
    var buffer = new ArrayBuffer(length);
    var view = new Uint8Array(buffer);
    var bits = string.match(/..../g);
    for (var i = 0; i + 2 < length; i += 3) {
        var s = atob(bits.shift());
        view[i] = s.charCodeAt(0);
        view[i + 1] = s.charCodeAt(1);
        view[i + 2] = s.charCodeAt(2);
    }
    if (i < length) {
        var s = atob(bits.shift());
        view[i++] = s.charCodeAt(0);
        if (s.length > 1) {
            view[i++] = s.charCodeAt(1);
        }
    }

    return buffer;
}

function encodeBase64(view:DataView):string {
    var data:string[] = [];
    var b:number;
    var wordstring:string[] = [];
    var triplet:string[];
    for (var i = 0; i < view.byteLength; ++i) {
        b = view.getUint8(i);
        wordstring.push(String.fromCharCode(b));
        while (wordstring.length >= 3) {
            triplet = wordstring.splice(0, 3);
            data.push(btoa(triplet.join('')));
        }
    }
    if (wordstring.length) {
        data.push(btoa(wordstring.join('')));
    }
    return data.join('');
}

function uint(s:number):number {
    return s >>> 0;
}

function int(b:boolean):number {
    return b === true ? 1 : 0;
}

function bool(i:number):boolean {
    return !!i;
}

module Serializer {
    enum Tag {
        INT = 1,
        STRING = 2,
        STRUCT = 3,
        BLOB = 4,
        BOOLEAN = 5
    }
    export var TYPE = 'application/octet-stream';

    export class Pointer {
        index:number;
        top:number;
        stack:number[];

        constructor() {
            this.index = 0;
            this.top = 0;
            this.stack = [];
        }

        advance(amount:number) {
            var index = this.index;
            this.index += amount;
            return index;
        }

        mark() {
            return this.index - this.top;
        }

        push() {
            this.stack.push(this.top);
            this.top = this.index;
        }

        pop() {
            this.top = this.stack.pop();
        }

        readString(view:DataView):string {
            var length = view.getUint32(this.advance(4), true);
            var bytes:string[] = [];
            for (var i = 0; i < length; ++i) {
                bytes.push(String.fromCharCode(view.getUint8(this.advance(1))));
            }
            return bytes.join('');
        }
    }

    export function pack(value:number) {
        var object = new DataView(new ArrayBuffer(4));
        object.setUint32(0, value, true);
        return object.buffer;
    }

    export function pack8(value:number) {
        var object = new DataView(new ArrayBuffer(1));
        object.setUint8(0, value);
        return object.buffer;
    }

    export function prefix(value:any) {
        return new Blob([Serializer.pack(value.size || value.length || value.byteLength), value], { type: Serializer.TYPE });
    }

    export function serialize(stream:any) {
        var parts:any = []; // ArrayBuffer|Blob
        var size = 4;
        for (var i in stream) {
            if (stream.hasOwnProperty(i)) {
                var tag:Tag;
                var head = Serializer.prefix(i);
                var body:any; // ArrayBuffer|Blob
                switch (typeof(stream[i])) {
                    case 'number':
                        tag = Tag.INT;
                        body = Serializer.pack(stream[i]);
                        break;
                    case 'string':
                        tag = Tag.STRING;
                        body = Serializer.prefix(stream[i]);
                        break;
                    case 'object':
                        if (stream[i].type == Serializer.TYPE) {
                            tag = Tag.BLOB;
                            body = stream[i];
                        } else {
                            tag = Tag.STRUCT;
                            body = Serializer.serialize(stream[i]);
                        }
                        break;
                    case 'boolean':
                        tag = Tag.BOOLEAN;
                        body = Serializer.pack8(stream[i]);
                        break;
                    default:
                        console.log(stream[i]);
                        break;
                }
                size += 1 + head.size + (body.size || body.byteLength || body.length);
                parts.push(Serializer.pack8(tag));
                parts.push(head);
                parts.push(body);
            }
        }
        parts.unshift(Serializer.pack(size));
        return new Blob(parts);
    }

    export function deserialize(blob:Blob, callback:{(object:any):void}):void {
        var reader = new FileReader();
        reader.onload = function (data:any) {
            callback(Serializer.deserealizeStream(new DataView(data.target.result), new Serializer.Pointer));
        };
        reader.readAsArrayBuffer(blob);
    }

    export function deserealizeStream(view:DataView, pointer:Serializer.Pointer):any {
        pointer.push();
        var object:any = {};
        var remaining = view.getUint32(pointer.advance(4), true);
        while (pointer.mark() < remaining) {
            var tag = view.getUint8(pointer.advance(1));
            var head = pointer.readString(view);
            var body:any;
            switch (tag) {
                case Tag.INT:
                    body = view.getUint32(pointer.advance(4), true);
                    break;
                case Tag.STRING:
                    body = pointer.readString(view);
                    break;
                case Tag.STRUCT:
                    body = Serializer.deserealizeStream(view, pointer);
                    break;
                case Tag.BLOB:
                    var size = view.getUint32(pointer.advance(4), true);
                    body = (<any>view.buffer).slice(pointer.advance(size), pointer.advance(0));
                    break;
                case Tag.BOOLEAN:
                    body = bool(view.getUint8(pointer.advance(1)));
                    break;
            }
            object[head] = body;
        }
        if (pointer.mark() > remaining) {
            throw "Size of serialized data exceeded";
        }
        pointer.pop();
        return object;
    }

    export function serializePNG(blob:Blob, base:any, callback:{(data:string):void}) {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        var pixels = base.getContext('2d').getImageData(0, 0, base.width, base.height);
        var transparent = 0;
        for (var y = 0; y < base.height; ++y) {
            for (var x = 0; x < base.width; ++x) {
                if (!pixels.data[(x + y * base.width) * 4 + 3]) {
                    ++transparent;
                }
            }
        }
        var bytesInCanvas = transparent * 3 + (base.width * base.height - transparent);
        var multiplier = Math.max(Math.ceil(Math.sqrt(blob.size / bytesInCanvas)), 1);
        var edges = bytesInCanvas * multiplier * multiplier - blob.size;
        var padding = Math.ceil(edges / (base.width * multiplier));
        canvas.setAttribute('width', (base.width * multiplier).toString());
        canvas.setAttribute('height', (base.height * multiplier + padding).toString());

        var reader = new FileReader();
        reader.onload = function (data:any) {
            var view = new Uint8Array(data.target.result);
            var pointer = 0;
            var pixelPointer = 0;
            var newPixels = context.createImageData(canvas.width, canvas.height + padding);
            for (var y = 0; y < canvas.height; ++y) {
                for (var x = 0; x < canvas.width; ++x) {
                    var oldY = (y / multiplier) | 0;
                    var oldX = (x / multiplier) | 0;
                    if (oldY > base.height || !pixels.data[(oldX + oldY * base.width) * 4 + 3]) {
                        newPixels.data[pixelPointer++] = view[pointer++];
                        newPixels.data[pixelPointer++] = view[pointer++];
                        newPixels.data[pixelPointer++] = view[pointer++];
                        newPixels.data[pixelPointer++] = 0;
                    } else {
                        var byte = view[pointer++];
                        newPixels.data[pixelPointer++] = pixels.data[(oldX + oldY * base.width) * 4 + 0] | (byte & 7);
                        newPixels.data[pixelPointer++] = pixels.data[(oldX + oldY * base.width) * 4 + 1] | ((byte >> 3) & 7);
                        newPixels.data[pixelPointer++] = pixels.data[(oldX + oldY * base.width) * 4 + 2] | ((byte >> 6) & 7);
                        newPixels.data[pixelPointer++] = pixels.data[(oldX + oldY * base.width) * 4 + 3];
                    }
                }
            }
            context.putImageData(newPixels, 0, 0);
            callback(canvas.toDataURL('image/png'));
        };
        reader.readAsArrayBuffer(blob);
        return canvas;
    }

    export function deserializePNG(blob:Blob, callback:{(object:any):void}) {
        var reader = new FileReader();
        reader.onload = function (read:any) {
            var image = document.createElement('img');
            image.setAttribute('src', read.target.result);
            var canvas = document.createElement('canvas');
            canvas.setAttribute('height', image.height.toString());
            canvas.setAttribute('width', image.width.toString());
            var context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            var pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            var data:number[] = [];
            for (var y = 0; y < canvas.height; ++y) {
                for (var x = 0; x < canvas.width; ++x) {
                    if (!pixels.data[(x + y * canvas.width) * 4 + 3]) {
                        data.push(pixels.data[(x + y * canvas.width) * 4 + 0]);
                        data.push(pixels.data[(x + y * canvas.width) * 4 + 1]);
                        data.push(pixels.data[(x + y * canvas.width) * 4 + 2]);
                    } else {
                        var byte = 0;
                        byte |= pixels.data[(x + y * canvas.width) * 4 + 0] & 7;
                        byte |= (pixels.data[(x + y * canvas.width) * 4 + 1] & 7) << 3;
                        byte |= (pixels.data[(x + y * canvas.width) * 4 + 2] & 7) << 6;
                        data.push(byte);
                    }
                }
            }
            var newBlob = new Blob(data.map(function (byte) {
                var array = new Uint8Array(1);
                array[0] = byte;
                return array;
            }), { type: Serializer.TYPE});
            Serializer.deserialize(newBlob, callback);
        };
        reader.readAsDataURL(blob);
    }
}
