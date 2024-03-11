import { useRef } from "react";
import "./output-area.css";

export type Props = {};

export function OutputArea({}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className="output-area">
      <canvas width="2560" height="1280" ref={canvasRef}></canvas>
    </div>
  );
}
