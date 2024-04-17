import { ContextMenu, ContextMenuItem } from "rctx-contextmenu";
import { SyntheticEvent } from "react";
import { TreeIndexPath, parentIndexPath } from "../../trees/tree";
import { Point } from "../../trees/Trees";
import ContextMenuItemSeparator from "./ContextMenuItemSeparator";
import { PropSetter } from "../../../util";
import { Editor, typedNodeAtIndexPath } from "../../state/Editor";

export type Props = {
  subject: TreeIndexPath;
  setCodeEditorSubject: PropSetter<TreeIndexPath>;

  editor: Editor;
};

export default function AppContextMenu({
  subject,
  setCodeEditorSubject,

  editor,
}: Props) {
  function mouseCursorLocation(event: SyntheticEvent): Point {
    const clickEvent = event.nativeEvent as MouseEvent;
    const blocksArea = document.querySelector(".blocks-page");

    const shiftX = blocksArea ? blocksArea.scrollLeft : 0;
    const shiftY = blocksArea
      ? blocksArea.scrollTop - blocksArea.getBoundingClientRect().top + 48
      : 0;

    return {
      x: clickEvent.clientX + shiftX,
      y: clickEvent.clientY + shiftY,
    };
  }

  async function renameSubject() {
    editor.renameBinding(
      await typedNodeAtIndexPath(subject, "name-binding"),
      parentIndexPath(subject)
    );
  }

  function nameSubject() {
    editor.nameBinding(subject);
  }

  async function typeAnnotateSubject() {
    editor.typeAnnotateBinding(await typedNodeAtIndexPath(subject, "name-binding"));
  }

  async function typeUnannotateSubject() {
    editor.removeTypeAnnotationFromBinding(await typedNodeAtIndexPath(subject, "name-binding"));
  }

  async function returnTypeAnnotateSubject() {
    editor.returnTypeAnnotateLambda(await typedNodeAtIndexPath(subject, "lambda"));
  }

  async function returnTypeUnannotateSubject() {
    editor.removeReturnTypeAnnotation(await typedNodeAtIndexPath(subject, "lambda"));
  }

  async function applySubject() {
    editor.applyAsFunction(await typedNodeAtIndexPath(subject, "var"), subject);
  }

  async function unapplySubject(event: SyntheticEvent) {
    editor.removeFunctionFromCall(subject, mouseCursorLocation(event));
  }

  function textEditSubject() {
    setCodeEditorSubject(subject);
  }

  async function cutSubject() {
    if (subject) editor.cut(subject);
  }

  async function copySubject() {
    if (subject) editor.copy(subject);
  }

  async function pasteInEditor(event: SyntheticEvent) {
    editor.paste(mouseCursorLocation(event));
  }

  async function pasteOverSubject(event: SyntheticEvent) {
    if (subject) editor.pasteOver(subject, mouseCursorLocation(event));
  }

  function duplicateSubject(event: SyntheticEvent) {
    if (subject) editor.duplicate(subject, mouseCursorLocation(event));
  }

  function deleteSubject() {
    if (subject) editor.delete(subject);
  }

  function evaluateSubject(event: SyntheticEvent) {
    editor.evaluate(subject, mouseCursorLocation(event));
  }

  const commonContextMenu = (
    <>
      <ContextMenuItem onClick={textEditSubject}>Edit as Text</ContextMenuItem>
      <ContextMenuItemSeparator />
      <ContextMenuItem onClick={cutSubject}>Cut</ContextMenuItem>
      <ContextMenuItem onClick={copySubject}>Copy</ContextMenuItem>
      <ContextMenuItem onClick={pasteOverSubject}>Paste</ContextMenuItem>
      <ContextMenuItemSeparator />
      <ContextMenuItem onClick={duplicateSubject}>Duplicate</ContextMenuItem>
      <ContextMenuItem onClick={deleteSubject}>Delete</ContextMenuItem>
    </>
  );

  const evaluateContextMenu = (
    <>
      <ContextMenuItemSeparator />
      <ContextMenuItem onClick={evaluateSubject}>Evaluate</ContextMenuItem>
    </>
  );

  return (
    <>
      <ContextMenu id="editor-background-menu" hideOnLeave={false}>
        <ContextMenuItem onClick={pasteInEditor}>Paste</ContextMenuItem>
      </ContextMenu>

      <ContextMenu id="block-menu" hideOnLeave={false}>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-evaluable" hideOnLeave={false}>
        {commonContextMenu}
        {evaluateContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-namebinding" hideOnLeave={false}>
        <ContextMenuItem onClick={typeAnnotateSubject}>Annotate Variable Type</ContextMenuItem>
        <ContextMenuItem onClick={renameSubject}>Rename Variable</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-namebinding-annotated" hideOnLeave={false}>
        <ContextMenuItem onClick={typeUnannotateSubject}>Remove Type Annotation</ContextMenuItem>
        <ContextMenuItem onClick={renameSubject}>Rename Variable</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-typenamebinding" hideOnLeave={false}>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-namehole" hideOnLeave={false}>
        <ContextMenuItem onClick={nameSubject}>Name Variable</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-typenamehole" hideOnLeave={false}>
        <ContextMenuItem onClick={nameSubject}>Name Type Variable</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-var" hideOnLeave={false}>
        <ContextMenuItem onClick={applySubject}>Apply</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-var-evaluable" hideOnLeave={false}>
        <ContextMenuItem onClick={applySubject}>Apply</ContextMenuItem>
        {commonContextMenu}
        {evaluateContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-call" hideOnLeave={false}>
        <ContextMenuItem onClick={unapplySubject}>Unapply</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-call-evaluable" hideOnLeave={false}>
        <ContextMenuItem onClick={unapplySubject}>Unapply</ContextMenuItem>
        {commonContextMenu}
        {evaluateContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-function" hideOnLeave={false}>
        <ContextMenuItem onClick={returnTypeAnnotateSubject}>Annotate Return Type</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-function-evaluable" hideOnLeave={false}>
        <ContextMenuItem onClick={returnTypeAnnotateSubject}>Annotate Return Type</ContextMenuItem>
        {commonContextMenu}
        {evaluateContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-function-annotated" hideOnLeave={false}>
        <ContextMenuItem onClick={returnTypeUnannotateSubject}>
          Remove Return Type Annotation
        </ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-function-annotated-evaluable" hideOnLeave={false}>
        <ContextMenuItem onClick={returnTypeUnannotateSubject}>
          Remove Return Type Annotation
        </ContextMenuItem>
        {commonContextMenu}
        {evaluateContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-apply" hideOnLeave={false}>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-apply-evaluable" hideOnLeave={false}>
        {commonContextMenu}
        {evaluateContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-pull-tab" hideOnLeave={false}>
        <ContextMenuItem onClick={textEditSubject}>Edit as Text</ContextMenuItem>
        <ContextMenuItemSeparator />
        <ContextMenuItem onClick={pasteOverSubject}>Paste</ContextMenuItem>
      </ContextMenu>
    </>
  );
}
