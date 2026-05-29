import { GlobalEvent } from "./Events/global.js";
import { initGameRender } from "./Render/main.js";
import { globalState } from "./Data/state.js";

initGameRender(globalState);
GlobalEvent();
