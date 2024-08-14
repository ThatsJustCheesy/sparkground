// https://github.com/clauderic/dnd-kit/issues/477#issuecomment-985194908

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
    }),
  );
}

export class CustomKeyboardSensor extends KeyboardSensor {
  static activators = KeyboardSensor.activators.map(
    ({ eventName, handler }): (typeof KeyboardSensor.activators)[number] => ({
      eventName,
      handler(event, options, context) {
        return (
          shouldHandleEvent(event.nativeEvent.target as HTMLElement) &&
          handler(event, options, context)
        );
      },
    }),
  );
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
