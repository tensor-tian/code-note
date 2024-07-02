import { Lang } from "types";
const langMap = {
  openFile: {
    zh: "打开 *.cnote 文件",
    en: "Open *.cnote File",
  },
  editNoteTitle: {
    zh: "编辑文档标题",
    en: "Edit Note Title",
  },
  stopCodeRangeEditing: {
    zh: "结束当前代码块标记",
    en: "Stop Code Range Editing",
  },
  toggleDebug: {
    zh: "切换 Debug 模式",
    en: "Toggle Debug",
  },
  addNextBlock: {
    zh: "新增 Next 节点",
    en: "Add Next Block",
  },
  addDetailBlock: {
    zh: "新增 Detail 节点",
    en: "Add Detail Block",
  },
  groupNodes: {
    zh: "合并已选择节点为 Group 节点",
    en: "Group Nodes",
  },
  splitGroup: {
    zh: "拆分 Group 节点",
    en: "Split Group",
  },
  extractToDetailGroup: {
    zh: "合并已选择节点为 Detail Group 节点",
    en: "Extract Codes To Detail Group",
  },
  forceLayout: {
    zh: "重新计算节点布局并绘制",
    en: "force layout",
  },
  removeEdge: {
    zh: "删除当前选择关系",
    en: "Remove Edge",
  },
  removeNode: {
    zh: "删除当前选择节点",
    en: "Remove Node",
  },
  historyBack: {
    zh: "返回引用节点",
    en: "History Jump Back",
  },
  sharedList: {
    zh: "待引用节点列表",
    en: "Open Shared List",
  },
  addCodeNode: {
    zh: "添加 Code 节点",
    en: "Add Code Block",
  },
  addTextNode: {
    zh: "添加 Text 节点",
    en: "Add Text Block",
  },
};

export type TitleKey = keyof typeof langMap;

export default function translateToLang(lang: Lang) {
  return (key: TitleKey) => {
    return langMap[key]?.[lang] ?? "";
  };
}
