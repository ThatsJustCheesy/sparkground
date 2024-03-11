import { NumberDatum } from "../datum/datum";

export type GraphicValue = {
  kind: "List";
  heads:
    | [
        tag: { kind: "Symbol"; value: "ellipse" },
        x: NumberDatum,
        y: NumberDatum,
        xRadius: NumberDatum,
        rRadius: NumberDatum
      ]
    | [
        tag: { kind: "Symbol"; value: "rectangle" },
        x: NumberDatum,
        y: NumberDatum,
        width: NumberDatum,
        height: NumberDatum
      ];
};

export function drawGraphic(ctx: CanvasRenderingContext2D, graphic: GraphicValue) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.beginPath();
  ctx.fillStyle = "green";

  switch (graphic.heads[0].value) {
    case "ellipse": {
      const [, x, y, xRadius, yRadius] = graphic.heads;
      ctx.ellipse(x.value, y.value, xRadius.value, yRadius.value, 0, 0, 2 * Math.PI);
      break;
    }
    case "rectangle": {
      const [, x, y, width, height] = graphic.heads;
      ctx.rect(x.value, y.value, width.value, height.value);
      break;
    }
  }

  ctx.fill();
}
