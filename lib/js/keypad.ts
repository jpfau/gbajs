class GameBoyAdvanceKeypad {

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

    private gba:GameBoyAdvance;

    constructor(gba:GameBoyAdvance) {
        this.gba = gba;
    }

    keyboardHandler(e:KeyboardEvent):void {
        var toggle = 0;
        switch (e.keyCode) {
            case GameBoyAdvanceKeypad.KEYCODE_START:
                toggle = GameBoyAdvanceKeypad.START;
                break;
            case GameBoyAdvanceKeypad.KEYCODE_SELECT:
                toggle = GameBoyAdvanceKeypad.SELECT;
                break;
            case GameBoyAdvanceKeypad.KEYCODE_A:
                toggle = GameBoyAdvanceKeypad.A;
                break;
            case GameBoyAdvanceKeypad.KEYCODE_B:
                toggle = GameBoyAdvanceKeypad.B;
                break;
            case GameBoyAdvanceKeypad.KEYCODE_L:
                toggle = GameBoyAdvanceKeypad.L;
                break;
            case GameBoyAdvanceKeypad.KEYCODE_R:
                toggle = GameBoyAdvanceKeypad.R;
                break;
            case GameBoyAdvanceKeypad.KEYCODE_UP:
                toggle = GameBoyAdvanceKeypad.UP;
                break;
            case GameBoyAdvanceKeypad.KEYCODE_RIGHT:
                toggle = GameBoyAdvanceKeypad.RIGHT;
                break;
            case GameBoyAdvanceKeypad.KEYCODE_DOWN:
                toggle = GameBoyAdvanceKeypad.DOWN;
                break;
            case GameBoyAdvanceKeypad.KEYCODE_LEFT:
                toggle = GameBoyAdvanceKeypad.LEFT;
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
        if (gamepad.buttons[GameBoyAdvanceKeypad.GAMEPAD_LEFT] > GameBoyAdvanceKeypad.GAMEPAD_THRESHOLD) {
            value |= 1 << GameBoyAdvanceKeypad.LEFT;
        }
        if (gamepad.buttons[GameBoyAdvanceKeypad.GAMEPAD_UP] > GameBoyAdvanceKeypad.GAMEPAD_THRESHOLD) {
            value |= 1 << GameBoyAdvanceKeypad.UP;
        }
        if (gamepad.buttons[GameBoyAdvanceKeypad.GAMEPAD_RIGHT] > GameBoyAdvanceKeypad.GAMEPAD_THRESHOLD) {
            value |= 1 << GameBoyAdvanceKeypad.RIGHT;
        }
        if (gamepad.buttons[GameBoyAdvanceKeypad.GAMEPAD_DOWN] > GameBoyAdvanceKeypad.GAMEPAD_THRESHOLD) {
            value |= 1 << GameBoyAdvanceKeypad.DOWN;
        }
        if (gamepad.buttons[GameBoyAdvanceKeypad.GAMEPAD_START] > GameBoyAdvanceKeypad.GAMEPAD_THRESHOLD) {
            value |= 1 << GameBoyAdvanceKeypad.START;
        }
        if (gamepad.buttons[GameBoyAdvanceKeypad.GAMEPAD_SELECT] > GameBoyAdvanceKeypad.GAMEPAD_THRESHOLD) {
            value |= 1 << GameBoyAdvanceKeypad.SELECT;
        }
        if (gamepad.buttons[GameBoyAdvanceKeypad.GAMEPAD_A] > GameBoyAdvanceKeypad.GAMEPAD_THRESHOLD) {
            value |= 1 << GameBoyAdvanceKeypad.A;
        }
        if (gamepad.buttons[GameBoyAdvanceKeypad.GAMEPAD_B] > GameBoyAdvanceKeypad.GAMEPAD_THRESHOLD) {
            value |= 1 << GameBoyAdvanceKeypad.B;
        }
        if (gamepad.buttons[GameBoyAdvanceKeypad.GAMEPAD_L] > GameBoyAdvanceKeypad.GAMEPAD_THRESHOLD) {
            value |= 1 << GameBoyAdvanceKeypad.L;
        }
        if (gamepad.buttons[GameBoyAdvanceKeypad.GAMEPAD_R] > GameBoyAdvanceKeypad.GAMEPAD_THRESHOLD) {
            value |= 1 << GameBoyAdvanceKeypad.R;
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