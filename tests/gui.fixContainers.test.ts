import { describe, it, expect, beforeEach } from 'vitest';
import { fixContainers, GUIWidget, GUIWidgetData } from '../src/common/gui';

// Helper functions to create mock widgets
function createWidget(
  id: number,
  type: string,
  data: Partial<GUIWidgetData> = {},
  widgets: GUIWidget[] = []
): GUIWidget {
  return {
    id,
    customId: '',
    type,
    data: data as GUIWidgetData,
    widgets: widgets.length > 0 ? widgets : []
  };
}

function createTabsWidget(
  id: number,
  tabsNames: string[] = [],
  tabsSelected: number = 0,
  children: GUIWidget[] = []
): GUIWidget {
  return createWidget(id, 'tabs', { tabsNames, tabsSelected }, children);
}

function createColumnsWidget(
  id: number,
  columnsWidths: number[] = [],
  children: GUIWidget[] = []
): GUIWidget {
  return createWidget(id, 'columns', { columnsWidths }, children);
}

function createBoxWidget(id: number, children: GUIWidget[] = []): GUIWidget {
  return createWidget(id, 'box', { boxDesign: 'none', boxHeader: '' }, children);
}

function createTextWidget(id: number): GUIWidget {
  return createWidget(id, 'text', { value: 'test' });
}

describe('fixContainers', () => {
  let nextCreateId: { value: number };

  beforeEach(() => {
    nextCreateId = { value: 100 };
  });

  describe('Tabs Widget Tests', () => {
    it('should add default tab name and selection when tabsNames is empty', () => {
      const widgets = [createTabsWidget(1, [], 0)];
      fixContainers(widgets, nextCreateId);

      expect(widgets[0].data.tabsNames).toEqual(['Unnamed']);
      expect(widgets[0].data.tabsSelected).toBe(0);
    });

    it('should preserve existing tabsNames', () => {
      const widgets = [createTabsWidget(1, ['Tab1', 'Tab2', 'Tab3'], 1)];
      fixContainers(widgets, nextCreateId);

      expect(widgets[0].data.tabsNames).toEqual(['Tab1', 'Tab2', 'Tab3']);
      expect(widgets[0].data.tabsSelected).toBe(1);
    });

    it('should create missing children boxes to match tab count', () => {
      const widgets = [createTabsWidget(1, ['Tab1', 'Tab2', 'Tab3'], 0)];
      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets).toHaveLength(3);
      expect(widgets[0].widgets![0].type).toBe('box');
      expect(widgets[0].widgets![1].type).toBe('box');
      expect(widgets[0].widgets![2].type).toBe('box');
      expect(nextCreateId.value).toBe(103); // 100, 101, 102
    });

    it('should wrap non-box children in box widgets', () => {
      const textWidget = createTextWidget(2);
      const widgets = [createTabsWidget(1, ['Tab1'], 0, [textWidget])];

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets![0].type).toBe('box');
      expect(widgets[0].widgets![0].data.boxDesign).toBe('none');
      expect(widgets[0].widgets![0].widgets).toHaveLength(1);
      expect(widgets[0].widgets![0].widgets![0].type).toBe('text');
      expect(widgets[0].widgets![0].widgets![0].id).toBe(2);
    });

    it('should not wrap box children', () => {
      const boxWidget = createBoxWidget(2);
      const widgets = [createTabsWidget(1, ['Tab1'], 0, [boxWidget])];

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets![0].id).toBe(2);
      expect(widgets[0].widgets![0].type).toBe('box');
      expect(widgets[0].widgets).toHaveLength(1);
    });

    it('should move excess children into last valid child', () => {
      const box1 = createBoxWidget(2);
      const box2 = createBoxWidget(3);
      const box3 = createBoxWidget(4);
      const box4 = createBoxWidget(5);
      const widgets = [createTabsWidget(1, ['Tab1', 'Tab2'], 0, [box1, box2, box3, box4])];

      fixContainers(widgets, nextCreateId);

      // Should have 2 tabs (matching tabsNames count)
      expect(widgets[0].widgets).toHaveLength(2);
      // Last tab should contain the excess boxes
      expect(widgets[0].widgets![1].widgets).toHaveLength(2);
      expect(widgets[0].widgets![1].widgets![0].id).toBe(5);
      expect(widgets[0].widgets![1].widgets![1].id).toBe(4);
    });

    it('should handle tabs with some existing children and add missing ones', () => {
      const box1 = createBoxWidget(2);
      const widgets = [createTabsWidget(1, ['Tab1', 'Tab2', 'Tab3'], 0, [box1])];

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets).toHaveLength(3);
      expect(widgets[0].widgets![0].id).toBe(2); // existing
      expect(widgets[0].widgets![1].id).toBe(100); // new
      expect(widgets[0].widgets![2].id).toBe(101); // new
      expect(nextCreateId.value).toBe(102);
    });

    it('should initialize widgets array if undefined', () => {
      const tabsWidget = createTabsWidget(1, ['Tab1'], 0);
      delete tabsWidget.widgets;
      const widgets = [tabsWidget];

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets).toBeDefined();
      expect(widgets[0].widgets).toHaveLength(1);
    });
  });

  describe('Columns Widget Tests', () => {
    it('should add default column width when columnsWidths is undefined', () => {
      const widget = createColumnsWidget(1);
      delete (widget.data as any).columnsWidths;
      const widgets = [widget];

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].data.columnsWidths).toEqual([12]);
    });

    it('should add default column width when columnsWidths is empty', () => {
      const widgets = [createColumnsWidget(1, [])];
      fixContainers(widgets, nextCreateId);

      expect(widgets[0].data.columnsWidths).toEqual([12]);
    });

    it('should add default column width when columnsWidths is not an array', () => {
      const widget = createColumnsWidget(1);
      (widget.data as any).columnsWidths = null;
      const widgets = [widget];

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].data.columnsWidths).toEqual([12]);
    });

    it('should preserve existing columnsWidths', () => {
      const widgets = [createColumnsWidget(1, [4, 4, 4])];
      fixContainers(widgets, nextCreateId);

      expect(widgets[0].data.columnsWidths).toEqual([4, 4, 4]);
    });

    it('should create missing children boxes to match column count', () => {
      const widgets = [createColumnsWidget(1, [6, 6])];
      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets).toHaveLength(2);
      expect(widgets[0].widgets![0].type).toBe('box');
      expect(widgets[0].widgets![1].type).toBe('box');
      expect(nextCreateId.value).toBe(102);
    });

    it('should wrap non-box children in box widgets', () => {
      const textWidget = createTextWidget(2);
      const widgets = [createColumnsWidget(1, [12], [textWidget])];

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets![0].type).toBe('box');
      expect(widgets[0].widgets![0].widgets).toHaveLength(1);
      expect(widgets[0].widgets![0].widgets![0].type).toBe('text');
    });

    it('should move excess children into last valid child', () => {
      const box1 = createBoxWidget(2);
      const box2 = createBoxWidget(3);
      const box3 = createBoxWidget(4);
      const widgets = [createColumnsWidget(1, [6, 6], [box1, box2, box3])];

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets).toHaveLength(2);
      expect(widgets[0].widgets![1].widgets).toHaveLength(1);
      expect(widgets[0].widgets![1].widgets![0].id).toBe(4);
    });

    it('should handle columns with partial children', () => {
      const box1 = createBoxWidget(2);
      const widgets = [createColumnsWidget(1, [4, 4, 4], [box1])];

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets).toHaveLength(3);
      expect(widgets[0].widgets![0].id).toBe(2);
      expect(widgets[0].widgets![1].id).toBe(100);
      expect(widgets[0].widgets![2].id).toBe(101);
    });
  });

  describe('Nested Container Tests', () => {
    it('should process tabs containing columns', () => {
      const innerColumns = createColumnsWidget(2, [6, 6]);
      const outerTabs = createTabsWidget(1, ['Tab1'], 0, [innerColumns]);
      const widgets = [outerTabs];

      fixContainers(widgets, nextCreateId);

      // Outer tabs should wrap columns in a box
      expect(widgets[0].widgets![0].type).toBe('box');
      // The columns should be inside the box
      expect(widgets[0].widgets![0].widgets![0].type).toBe('columns');
      // Columns should have 2 box children
      expect(widgets[0].widgets![0].widgets![0].widgets).toHaveLength(2);
    });

    it('should process columns containing tabs', () => {
      const innerTabs = createTabsWidget(2, ['Tab1', 'Tab2']);
      const outerColumns = createColumnsWidget(1, [12], [innerTabs]);
      const widgets = [outerColumns];

      fixContainers(widgets, nextCreateId);

      // Outer columns should wrap tabs in a box
      expect(widgets[0].widgets![0].type).toBe('box');
      // The tabs should be inside the box
      expect(widgets[0].widgets![0].widgets![0].type).toBe('tabs');
      // Tabs should have 2 box children
      expect(widgets[0].widgets![0].widgets![0].widgets).toHaveLength(2);
    });

    it('should process multiple levels of nesting', () => {
      const level3 = createTabsWidget(3, ['Inner']);
      const level2 = createColumnsWidget(2, [12], [level3]);
      const level1 = createTabsWidget(1, ['Outer'], 0, [level2]);
      const widgets = [level1];

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].type).toBe('tabs');
      expect(widgets[0].widgets![0].type).toBe('box');
      expect(widgets[0].widgets![0].widgets![0].type).toBe('columns');
      expect(widgets[0].widgets![0].widgets![0].widgets![0].type).toBe('box');
      expect(widgets[0].widgets![0].widgets![0].widgets![0].widgets![0].type).toBe('tabs');
    });

    it('should process mixed containers in array', () => {
      const tabs = createTabsWidget(1, ['Tab1', 'Tab2']);
      const columns = createColumnsWidget(2, [6, 6]);
      const widgets = [tabs, columns];

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets).toHaveLength(2);
      expect(widgets[1].widgets).toHaveLength(2);
    });
  });

  describe('Non-Container Widget Tests', () => {
    it('should skip non-container widgets', () => {
      const textWidget = createTextWidget(1);
      const widgets = [textWidget];
      const initialId = nextCreateId.value;

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].type).toBe('text');
      expect(nextCreateId.value).toBe(initialId); // no new IDs used
    });

    it('should process children of non-container widgets with nested containers', () => {
      const nestedTabs = createTabsWidget(2, ['Tab1']);
      const boxWidget = createBoxWidget(1, [nestedTabs]);
      const widgets = [boxWidget];

      fixContainers(widgets, nextCreateId);

      // Box itself is a container but doesn't need fixing
      // Its child tabs should be processed
      expect(widgets[0].widgets![0].widgets).toHaveLength(1);
      expect(widgets[0].widgets![0].widgets![0].type).toBe('box');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty widgets array', () => {
      const widgets: GUIWidget[] = [];
      fixContainers(widgets, nextCreateId);

      expect(widgets).toHaveLength(0);
    });

    it('should handle box widgets without special processing', () => {
      const box = createBoxWidget(1);
      const widgets = [box];
      const initialId = nextCreateId.value;

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].type).toBe('box');
      expect(nextCreateId.value).toBe(initialId);
    });

    it('should increment nextCreateId correctly for multiple new boxes', () => {
      const widgets = [createTabsWidget(1, ['A', 'B', 'C', 'D', 'E'])];
      const startId = 50;
      nextCreateId.value = startId;

      fixContainers(widgets, nextCreateId);

      expect(nextCreateId.value).toBe(startId + 5); // 5 boxes created
    });

    it('should handle mixed scenarios with wrapping and creation', () => {
      const text1 = createTextWidget(2);
      const text2 = createTextWidget(3);
      const widgets = [createTabsWidget(1, ['Tab1', 'Tab2', 'Tab3'], 0, [text1, text2])];

      fixContainers(widgets, nextCreateId);

      // 2 text widgets wrapped + 1 missing box created
      expect(widgets[0].widgets).toHaveLength(3);
      expect(nextCreateId.value).toBe(103); // 100, 101 for wrapping, 102 for missing
    });

    it('should handle container with no children and multiple tabs/columns', () => {
      const widgets = [createTabsWidget(1, ['A', 'B', 'C', 'D'])];

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets).toHaveLength(4);
      widgets[0].widgets!.forEach(w => {
        expect(w.type).toBe('box');
        expect(w.widgets).toEqual([]);
      });
    });
  });

  describe('ID Generation Tests', () => {
    it('should use sequential IDs when creating boxes', () => {
      const widgets = [createTabsWidget(1, ['A', 'B', 'C'])];
      nextCreateId.value = 1000;

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets![0].id).toBe(1000);
      expect(widgets[0].widgets![1].id).toBe(1001);
      expect(widgets[0].widgets![2].id).toBe(1002);
      expect(nextCreateId.value).toBe(1003);
    });

    it('should use IDs for both wrapping and creating', () => {
      const text = createTextWidget(5);
      const widgets = [createTabsWidget(1, ['A', 'B'], 0, [text])];
      nextCreateId.value = 200;

      fixContainers(widgets, nextCreateId);

      expect(widgets[0].widgets![0].id).toBe(200); // wrapping text
      expect(widgets[0].widgets![1].id).toBe(201); // creating missing
      expect(nextCreateId.value).toBe(202);
    });

    it('should maintain ID reference across multiple calls', () => {
      const widgets1 = [createTabsWidget(1, ['A'])];
      const widgets2 = [createColumnsWidget(2, [12])];

      nextCreateId.value = 10;
      fixContainers(widgets1, nextCreateId);
      expect(nextCreateId.value).toBe(11);

      fixContainers(widgets2, nextCreateId);
      expect(nextCreateId.value).toBe(12);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle tabs with mix of box and non-box children needing adjustment', () => {
      const box1 = createBoxWidget(2);
      const text1 = createTextWidget(3);
      const box2 = createBoxWidget(4);
      const text2 = createTextWidget(5);
      const widgets = [createTabsWidget(1, ['A', 'B', 'C'], 0, [box1, text1, box2, text2])];

      fixContainers(widgets, nextCreateId);

      // After fixing: box1, wrapped text1, wrapped box2
      // text2 and the original box2 moved to last valid child
      expect(widgets[0].widgets).toHaveLength(3);
      expect(widgets[0].widgets![0].id).toBe(2); // original box1
      expect(widgets[0].widgets![1].type).toBe('box'); // wrapped text1
      expect(widgets[0].widgets![2].type).toBe('box'); // wrapped box2
    });

    it('should deeply nested structure with multiple container types', () => {
      const innerText = createTextWidget(5);
      const innerTabs = createTabsWidget(4, ['Inner'], 0, [innerText]);
      const midColumns = createColumnsWidget(3, [12], [innerTabs]);
      const outerBox = createBoxWidget(2, [midColumns]);
      const topTabs = createTabsWidget(1, ['Outer'], 0, [outerBox]);
      const widgets = [topTabs];

      fixContainers(widgets, nextCreateId);

      // Navigate down the structure
      const level1 = widgets[0].widgets![0]; // should be box
      expect(level1.type).toBe('box');
      expect(level1.id).toBe(2);

      const level2 = level1.widgets![0]; // columns
      expect(level2.type).toBe('columns');

      const level3 = level2.widgets![0]; // box wrapping tabs
      expect(level3.type).toBe('box');

      const level4 = level3.widgets![0]; // tabs
      expect(level4.type).toBe('tabs');

      const level5 = level4.widgets![0]; // box wrapping text
      expect(level5.type).toBe('box');

      const level6 = level5.widgets![0]; // text
      expect(level6.type).toBe('text');
      expect(level6.id).toBe(5);
    });
  });
});
