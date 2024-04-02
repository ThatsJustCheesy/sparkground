import { NumberDatum, StringDatum } from "../datum/datum";

export type GraphicValue = {
  kind: "List";
  heads: EllipseGraphic | RectangleGraphic | ImageGraphic;
};

type EllipseGraphic = [
  tag: { kind: "Symbol"; value: "ellipse" },
  x: NumberDatum,
  y: NumberDatum,
  xRadius: NumberDatum,
  rRadius: NumberDatum,
  color: StringDatum
];
type RectangleGraphic = [
  tag: { kind: "Symbol"; value: "rectangle" },
  x: NumberDatum,
  y: NumberDatum,
  width: NumberDatum,
  height: NumberDatum,
  color: StringDatum
];
type ImageGraphic = [
  tag: { kind: "Symbol"; value: "image" },
  url: StringDatum,
  x: NumberDatum,
  y: NumberDatum
];

const imageCache: Record<string, ImageBitmap> = {};

export async function drawGraphic(ctx: CanvasRenderingContext2D, graphic: GraphicValue) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.beginPath();
  ctx.fillStyle = "green";

  switch (graphic.heads[0].value) {
    case "ellipse": {
      const [, x, y, xRadius, yRadius, color] = graphic.heads as EllipseGraphic;
      ctx.fillStyle = color.value;
      ctx.ellipse(x.value, y.value, xRadius.value, yRadius.value, 0, 0, 2 * Math.PI);
      break;
    }
    case "rectangle": {
      const [, x, y, width, height, color] = graphic.heads as RectangleGraphic;
      ctx.fillStyle = color.value;
      ctx.rect(x.value, y.value, width.value, height.value);
      break;
    }
    case "image": {
      const [, url, x, y] = graphic.heads as ImageGraphic;

      if (!imageCache[url.value]) {
        const imageBlob = await (await fetch(url.value)).blob();
        imageCache[url.value] = await createImageBitmap(imageBlob);
      }

      ctx.drawImage(imageCache[url.value]!, x.value, y.value);
    }
  }

  ctx.fill();
}
