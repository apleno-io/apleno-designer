import { GUIWidget } from "../../common/gui";
import { WidgetProperties } from "../../extension/gui/gui-utils";

export const WidgetPropertyEditor = new class {
  public setNoWidget() {
    document.querySelectorAll('[data-property]').forEach((setting: Element) => {
      (setting as HTMLElement).style.display = 'none';
    });
  }

  public setWidget(widget: GUIWidget) {
    if (!(widget.type in WidgetProperties)) {
      //todo: hide
    }

    document.querySelectorAll('[data-property]').forEach((setting: Element) => {
      const y = (WidgetProperties[widget.type].includes((setting as HTMLElement).dataset.property as string));
      (setting as HTMLElement).style.display = y ? 'block' : 'none';
    });
  }
};