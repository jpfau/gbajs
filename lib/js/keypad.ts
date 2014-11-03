module GameBoyAdvance {
    export class Keypad {

        private static A = 0;
        private static B = 1;
        private static SELECT = 2;
        private static START = 3;
        private static RIGHT = 4;
        private static LEFT = 5;
        private static UP = 6;
        private static DOWN = 7;
        private static R = 8;
        private static L = 9;

        private KEYCODE_LEFT = 37;
        private KEYCODE_UP = 38;
        private KEYCODE_RIGHT = 39;
        private KEYCODE_DOWN = 40;
        private KEYCODE_START = 13;
        private KEYCODE_SELECT = 220;
        private KEYCODE_A = 90;
        private KEYCODE_B = 88;
        private KEYCODE_L = 65;
        private KEYCODE_R = 83;

        private GAMEPAD_LEFT = 14;
        private GAMEPAD_UP = 12;
        private GAMEPAD_RIGHT = 15;
        private GAMEPAD_DOWN = 13;
        private GAMEPAD_START = 9;
        private GAMEPAD_SELECT = 8;
        private GAMEPAD_A = 1;
        private GAMEPAD_B = 0;
        private GAMEPAD_L = 4;
        private GAMEPAD_R = 5;
        private GAMEPAD_THRESHOLD = 0.2;

        currentDown = 0x03FF;
        eatInput = false;

        private gamepads:Gamepad[] = [];

        private keyboardHandler(e:KeyboardEvent):void {
            var toggle = 0;
            switch (e.keyCode) {
                case this.KEYCODE_START:
                    toggle = Keypad.START;
                    break;
                case this.KEYCODE_SELECT:
                    toggle = Keypad.SELECT;
                    break;
                case this.KEYCODE_A:
                    toggle = Keypad.A;
                    break;
                case this.KEYCODE_B:
                    toggle = Keypad.B;
                    break;
                case this.KEYCODE_L:
                    toggle = Keypad.L;
                    break;
                case this.KEYCODE_R:
                    toggle = Keypad.R;
                    break;
                case this.KEYCODE_UP:
                    toggle = Keypad.UP;
                    break;
                case this.KEYCODE_RIGHT:
                    toggle = Keypad.RIGHT;
                    break;
                case this.KEYCODE_DOWN:
                    toggle = Keypad.DOWN;
                    break;
                case this.KEYCODE_LEFT:
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

        private gamepadHandler(gamepad:Gamepad):void {
            var value = 0;
            if (gamepad.buttons[this.GAMEPAD_LEFT] > this.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.LEFT;
            }
            if (gamepad.buttons[this.GAMEPAD_UP] > this.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.UP;
            }
            if (gamepad.buttons[this.GAMEPAD_RIGHT] > this.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.RIGHT;
            }
            if (gamepad.buttons[this.GAMEPAD_DOWN] > this.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.DOWN;
            }
            if (gamepad.buttons[this.GAMEPAD_START] > this.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.START;
            }
            if (gamepad.buttons[this.GAMEPAD_SELECT] > this.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.SELECT;
            }
            if (gamepad.buttons[this.GAMEPAD_A] > this.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.A;
            }
            if (gamepad.buttons[this.GAMEPAD_B] > this.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.B;
            }
            if (gamepad.buttons[this.GAMEPAD_L] > this.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.L;
            }
            if (gamepad.buttons[this.GAMEPAD_R] > this.GAMEPAD_THRESHOLD) {
                value |= 1 << Keypad.R;
            }

            this.currentDown = ~value & 0x3FF;
        }

        private gamepadConnectHandler(gamepad:any):void {
            this.gamepads.push(gamepad);
        }

        private gamepadDisconnectHandler(gamepad:any):void {
            this.gamepads = this.gamepads.filter((other) => {
                return other != gamepad
            });
        }

        pollGamepads():void {
            var navigatorList:any;
            if (navigator.getGamepads) {
                navigatorList = navigator.getGamepads();
            } else if (navigator.webkitGetGamepads) {
                navigatorList = navigator.webkitGetGamepads();
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