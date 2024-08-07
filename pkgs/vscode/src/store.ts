import { ExtensionContext, FileType, Memento, Uri, workspace } from "vscode";
import { getActiveWorkspacePackageInfo, isSubDirectory } from "./utils";

// import { MemFS } from "./file-system-provider";
import { Note } from "types";
import * as os from "os";
import debounce from "lodash.debounce";
import * as vscode from "vscode";
import * as path from "path";

interface ID {
  getBlockId(): string;
  getNoteId(): string;
}

interface VirtualDocOperator {
  vDocUri(typ: string, id: string): Uri;
  parseVDocUri(uri: Uri): { id?: string; type?: string };
  removeVDoc: {
    (typ: string, id: string): Promise<{ type?: string; id?: string }>;
    (typ: Uri): Promise<{ type?: string; id?: string }>;
  };
  writeVDoc: (typ: string, id: string, text: string) => Promise<Uri>;
}

interface NoteOperator {
  noteUri(pkgOrPath: string, title?: string): Uri;
  existsNote(uri: Uri): Promise<boolean>;
  listNotePaths(): Promise<string[]>;
  readNote(uri: Uri): Promise<Note>;
  createNote(pkg: string, title: string): Promise<Uri | undefined>;
  updateNote(uri: Uri, note: Note): Promise<void> | undefined;
  removeNote(uri: Uri): Promise<void>;
}

interface KeyValueOperator {
  setKV(key: string, value: any): void;
  getKV(key: string): any;
}

const workDir = "code-note";
const blockIDKey = "code-note-block-id";
const noteIDKey = "code-note-note-id";
const addOne = (id: string): string => {
  return (parseInt(id, 36) + 1).toString(36);
};

export class Store
  implements VirtualDocOperator, NoteOperator, ID, KeyValueOperator
{
  private kv: Memento;
  private fs: vscode.FileSystem;

  constructor(private context: ExtensionContext) {
    this.kv = context.globalState;
    // this.memFS = new MemFS();
    // context.subscriptions.push(
    //   workspace.registerFileSystemProvider(this.schemaVDoc, this.memFS, {
    //     isCaseSensitive: true,
    //   })
    // );
    this.fs = vscode.workspace.fs;
  }

  setKV(key: string, value: any): void {
    this.kv.update(key, value);
  }
  getKV<T extends any>(key: string): T {
    return this.kv.get(key) as T;
  }

  getBlockId(): string {
    const id: string = this.kv.get(blockIDKey) || "1";
    const nextId = addOne(id);
    this.kv.update(blockIDKey, nextId);
    return nextId;
  }

  getNoteId(): string {
    const id: string = this.kv.get(noteIDKey) || "1";
    const nextId = addOne(id);
    this.kv.update(noteIDKey, nextId);
    return nextId;
  }

  // private readonly schemaVDoc = "code-note-memfs";
  private readonly tmpdir = Uri.file(os.tmpdir());

  vDocUri(typ: string, id: string) {
    return Uri.joinPath(this.tmpdir, `${typ}-${id}.md`);
  }
  parseVDocUri(uri: Uri) {
    const basename = path.basename(uri.path);
    const parts = basename.slice(0, basename.length - 3).split("-");
    if (
      !basename.endsWith(".md") ||
      parts.length !== 2 ||
      !["Text", "TreeNote", "Scrolly", "Code"].includes(parts[0])
    )
      return {};
    return { id: parts[1], type: parts[0] };
  }

  removeVDoc(typ: Uri): Promise<{ type?: string; id?: string }>;
  removeVDoc(typ: string, id: string): Promise<{ type?: string; id?: string }>;
  async removeVDoc(
    uriOrTyp: string | Uri,
    id?: string
  ): Promise<{ type?: string; id?: string }> {
    if (typeof uriOrTyp === "string" && id) {
      this.fs.delete(this.vDocUri(uriOrTyp, id));
      return {};
    } else {
      const uri = uriOrTyp as Uri;
      if (!uri.path.startsWith(this.tmpdir.path)) return {};
      this.fs.delete(uri);
      return this.parseVDocUri(uri);
    }
  }
  writeVDoc = async (typ: string, id: string, text: string): Promise<Uri> => {
    const uri = this.vDocUri(typ, id);
    await this.fs.writeFile(uri, Buffer.from(text));
    return uri;
  };

  // path is endsWith '.cnote'
  noteUri = (pkgOrPath: string, title?: string) => {
    if (!title) {
      return Uri.joinPath(this.workingDir, pkgOrPath);
    }
    const pkg = pkgOrPath;
    return Uri.joinPath(this.workingDir, pkg, title + ".cnote");
  };
  existsNote = async (uri: Uri) => {
    try {
      const stat = await workspace.fs.stat(uri);
      return stat && stat.type === FileType.File;
    } catch {
      return false;
    }
  };

  async visitDir(dir: Uri, visitor: (uri: Uri) => void) {
    const files = await workspace.fs.readDirectory(dir);
    for (const [name, fileType] of files) {
      if (fileType === FileType.File) {
        visitor(Uri.joinPath(dir, name));
      } else {
        await this.visitDir(Uri.joinPath(dir, name), visitor);
      }
    }
  }

  get workingDir() {
    const dir = vscode.workspace
      .getConfiguration("vscode-note")
      .get("workingDir") as string | undefined;
    if (dir) return vscode.Uri.file(dir);
    // globalStorageUri dir will be removed when uninstall this extension.
    return this.context.globalStorageUri;
  }

  listNotePaths = async () => {
    const wd = this.workingDir;
    if (!(await this.existsDir(wd))) {
      await workspace.fs.createDirectory(wd);
    }
    const list = [] as string[];
    await this.visitDir(wd, (uri: Uri) =>
      list.push(uri.path.slice(wd.path.length))
    );
    return list;
  };
  readNote = async (uri: Uri): Promise<Note> => {
    const data = await workspace.fs.readFile(uri);
    return JSON.parse(Buffer.from(data).toString("utf-8"));
  };
  existsDir = async (uri: Uri): Promise<boolean> => {
    try {
      const stat = await workspace.fs.stat(uri);
      return stat.type === FileType.Directory;
    } catch {
      return false;
    }
  };
  createNote = async (title: string): Promise<Uri | undefined> => {
    const note = await initCodeNote(title);
    if (!note) return;
    const dir = Uri.joinPath(this.workingDir, note.pkgName);
    if (!(await this.existsDir(dir))) {
      await workspace.fs.createDirectory(dir);
    }
    const file = this.noteUri(note.pkgName, title);
    await workspace.fs.writeFile(
      file,
      new TextEncoder().encode(JSON.stringify(note))
    );
    return file;
  };
  updateNote = debounce(async (uri: Uri, note: Note) => {
    return workspace.fs.writeFile(
      uri,
      new TextEncoder().encode(JSON.stringify(note))
    );
  }, 500);
  removeNote = async (uri: Uri) => {
    return workspace.fs.delete(uri, { useTrash: true });
  };

  getOpenedNoteFiles(): string[] {
    const isNotePath = isSubDirectory(this.workingDir.path);
    return workspace.textDocuments
      .map((doc) => doc.uri.path)
      .filter(isNotePath);
  }
}

const nanoid = async (): Promise<string> => {
  const newId = await import("nanoid").then(({ customAlphabet }) =>
    customAlphabet("01234567890abcdefghijklmnopqrstuvwxyz", 10)
  );
  return newId();
};

export async function initCodeNote(title: string): Promise<Note | undefined> {
  const { rootPath: pkgPath, name: pkgName } =
    await getActiveWorkspacePackageInfo();
  if (!pkgPath || !pkgName) return;
  return {
    id: await nanoid(),
    type: "TreeNote",
    text: `### ${title}`,
    pkgPath,
    pkgName,
    nodeMap: {},
    edges: [],
    renderAsGroupNodes: [],
    groupStepIndexMap: {},
    sharedList: [],
  };
}
