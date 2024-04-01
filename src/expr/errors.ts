import { cloneDeep } from "lodash";
import { TreeIndexPath } from "../editor/trees/tree";

export class ErrorsByIndexPath<ErrorType> {
  #errors: Record<string, ErrorType> = {};

  clear() {
    this.#errors = {};
  }

  add(indexPath: TreeIndexPath, error: ErrorType) {
    this.#errors[this.#encode(indexPath)] = error;
  }

  for(indexPath: TreeIndexPath) {
    return this.#errors[this.#encode(indexPath)];
  }

  all() {
    return Object.values(this.#errors);
  }

  #encode(indexPath: TreeIndexPath) {
    return indexPath.tree.id + "#" + indexPath.path.map((x) => `${x}`).join("#");
  }

  dump(): void {
    console.log(cloneDeep(this.#errors));
  }
}
