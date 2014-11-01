module GameBoyAdvance {
    export class Keypad {

        static KEYCODE_LEFT = 37;
        static KEYCODE_UP = 38;
        static KEYCODE_RIGHT = 39;
        static KEYCODE_DOWN = 40;
        static KEYCODE_START = 13;
        static KEYCODE_SELECT = 220;
        static KEYCODE_A = 90;
        static KEYCODE_B = 88;
        static KEYCODE_L = 65;
        static KEYCODE_R = 83;


        static GAMEPAD_LEFT = 14;
        static GAMEPAD_UP = 12;
        static GAMEPAD_RIGHT = 15;
        static GAMEPAD_DOWN = 13;
        static GAMEPAD_START = 9;
        static GAMEPAD_SELECT = 8;
        static GAMEPAD_A = 1;
        static GAMEPAD_B = 0;
        static GAMEPAD_L = 4;
        static GAMEPAD_R = 5;
        static GAMEPAD_THRESHOLD = 0.2;

        static A = 0;
        static B = 1;
        static SELECT = 2;
        static START = 3;
        static RIGHT = 4;
        static LEFT = 5;
        static UP = 6;
        static DOWN = 7;
        static R = 8;
        static L = 9;

        currentDown = 0x03FF;
        eatInput = false;

        gamepads:any[] = [];

        constructor(private gba:Main) {
        }

        keyboardHandler(e:KeyboardEvent):void {
            var toggle = 0;
            switch (e.keyCode) {
                case Keypad.KEYCODE_START:
                    toggle = Keypad.START;
                    break;
                case Keypad.KEYCODE_SELECT:
                    toggle = Keypad.SELECT;
                    break;
                case Keypad.KEYCODE_A:
                    toggle = Keypad.A;
                    break;
                case Keypad.KEYCODE_B:
                    toggle = Keypad.B;
                    break;
                case Keypad.KEYCODE_L:
                    toggle = Keypad.L;
                    break;
                case Keypad.KEYCODE_R:
                    toggle = Keypad.R;
                    break;
                case Keypad.KEYCODE_UP:
                    toggle = Keypad.UP;
                    break;
                case Keypad.KEYCODE_RIGHT:
                    toggle = Keypad.RIGHT;
                    break;
                case Keypad.KEYCODE_DOWN:
                    toggle = Keypad.DOWN;
                    break;
                case Keypad.KEYCODE_LEFT:
                    toggle = Keypad.LEFT;
                    break;
                default:
                    return;
            }

            toggle = 1 << toggle;
            if (e.type == "keydown") {
                this.currentDown &= ~toggle;
            } else {
                this.currentDown |= toggle;
            }

            if (this.eatInput) {
                e.preventDefault();
            }
        }

        gamepadHandler(gamepad:any):void {
            var value = 0;
            if (gamepad.buttons[Keypad.GAMEPAD_LEFT] > Keypad.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.LEFT;
            }
            if (gamepad.buttons[Keypad.GAMEPAD_UP] > Keypad.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.UP;
            }
            if (gamepad.buttons[Keypad.GAMEPAD_RIGHT] > Keypad.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.RIGHT;
            }
            if (gamepad.buttons[Keypad.GAMEPAD_DOWN] > Keypad.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.DOWN;
            }
            if (gamepad.buttons[Keypad.GAMEPAD_START] > Keypad.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.START;
            }
            if (gamepad.buttons[Keypad.GAMEPAD_SELECT] > Keypad.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.SELECT;
            }
            if (gamepad.buttons[Keypad.GAMEPAD_A] > Keypad.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.A;
            }
            if (gamepad.buttons[Keypad.GAMEPAD_B] > Keypad.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.B;
            }
            if (gamepad.buttons[Keypad.GAMEPAD_L] > Keypad.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.L;
            }
            if (gamepad.buttons[Keypad.GAMEPAD_R] > Keypad.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.R;
            }

            this.currentDown = ~value & 0x3FF;
        }

        gamepadConnectHandler(gamepad:any):void {
            this.gamepads.push(gamepad);
        }

        gamepadDisconnectHandler(gamepad:any):void {
            this.gamepads = this.gamepads.filter((other) => {
                return other != gamepad
            });
        }

        pollGamepads():void {
            var navigatorList:any[] = [];
            if ((<any>navigator).webkitGetGamepads) {
                navigatorList = (<any>navigator).webkitGetGamepads();
            } else if ((<any>navigator).getGamepads) {
                navigatorList = (<any>navigator).getGamepads();
            }

            // Let's all give a shout out to Chrome for making us get the gamepads EVERY FRAME
            if (navigatorList.length) {
                this.gamepads = [];
            }
            for (var i = 0; i < navigatorList.length; ++i) {
                if (navigatorList[i]) {
                    this.gamepads.push(navigatorList[i]);
                }
            }
            if (this.gamepads.length > 0) {
                this.gamepadHandler(this.gamepads[0]);
            }

        }

        registerHandlers():void {
            window.addEventListener("keydown", this.keyboardHandler.bind(this), true);
            window.addEventListener("keyup", this.keyboardHandler.bind(this), true);

            window.addEventListener("gamepadconnected", this.gamepadConnectHandler.bind(this), true);
            window.addEventListener("mozgamepadconnected", this.gamepadConnectHandler.bind(this), true);
            window.addEventListener("webkitgamepadconnected", this.gamepadConnectHandler.bind(this), true);

            window.addEventListener("gamepaddisconnected", this.gamepadDisconnectHandler.bind(this), true);
            window.addEventListener("mozgamepaddisconnected", this.gamepadDisconnectHandler.bind(this), true);
            window.addEventListener("webkitgamepaddisconnected", this.gamepadDisconnectHandler.bind(this), true);
        }
    }
}