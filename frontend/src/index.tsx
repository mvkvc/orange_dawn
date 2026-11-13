import "./index.css";
import { createSignal } from "solid-js";
import {
  Application,
  Loading,
  render,
  Sprite,
  Stage,
  Text,
  useApplication,
  useAsset,
} from "solid-pixi";

function Scene(props: { canvas: HTMLCanvasElement }) {
  return (
    <Application background="#1099bb" resizeTo={window} canvas={props.canvas}>
      <Stage>
        <Bunny />
      </Stage>
    </Application>
  );
}

function Bunny() {
  const app = useApplication();
  const texture = useAsset("https://pixijs.com/assets/bunny.png");
  const [scale, setScale] = createSignal(1);

  return (
    <Loading fallback={<Text text="loading" />}>
      <Sprite
        texture={texture()}
        anchor={0.5}
        scale={scale()}
        x={app.screen.width / 2}
        y={app.screen.height / 2}
        eventMode="static"
        onclick={() => setScale((value) => value + 0.1)}
      />
    </Loading>
  );
}

const canvas = document.getElementById("root");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing #root canvas");
}

render(() => <Scene canvas={canvas} />);
