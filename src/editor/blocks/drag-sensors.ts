// https://github.com/clauderic/dnd-kit/issues/477#issuecomment-985194908

import type { KeyboardEvent } from "react";
import { KeyboardSensor, PointerSensor } from "@dnd-kit/core";

export class CustomPointerSensor extends PointerSensor {
  static activators = PointerSensor.activators.map(
    ({ eventName, handler }): (typeof PointerSensor.activators)[number] => ({
      eventName,
      handler(event, options) {
        return (
          shouldHandleEvent(event.nativeEvent.target as HTMLElement) && handler(event, options)
        );
      },
    })
  );
}

export class CustomKeyboardSensor extends KeyboardSensor {
  static activators = [
    {
      eventName: "onKeyDown" as const,
      handler: ({ nativeEvent: event }: KeyboardEvent<Element>) => {
        return shouldHandleEvent(event.target as HTMLElement);
      },
    },
  ];
}

function shouldHandleEvent(element: HTMLElement | null) {
  let cur = element;

  while (cur) {
    if (cur.dataset && cur.dataset.noDnd === "true") {
      return false;
    }
    cur = cur.parentElement;
  }

  return true;
}
