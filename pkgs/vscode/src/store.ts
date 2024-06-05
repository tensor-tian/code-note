import { ExtensionContext, FileType, Memento, Uri, workspace } from "vscode";
import { getActiveWorkspacePackageInfo, isSubDirectory } from "./utils";

import { MemFS } from "./file-system-provider";
import { Note } from "types";
import debounce from "lodash.debounce";

interface ID {
  getBlockId(): string;
  getNoteId(): string;
}

interface VirtualDocOperator {
  vDocUri(typ: string, id: string): Uri;
  parseVDocUri(uri: Uri): { id?: string; type?: string };
  removeVDoc: {
    (typ: string, id: string): void;
    (typ: Uri): void;
  };
  writeVDoc: (typ: string, id: string, text: string) => Uri;
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

const workDir = "code-note";
const blockIDKey = "code-note-block-id";
const noteIDKey = "code-note-note-id";
const addOne = (id: string): string => {
  return (parseInt(id, 36) + 1).toString(36);
};

export class Store implements VirtualDocOperator, NoteOperator, ID {
  private kv: Memento;
  private memFS: MemFS;

  constructor(private context: ExtensionContext) {
    this.kv = context.globalState;
    this.memFS = new MemFS();
    context.subscriptions.push(
      workspace.registerFileSystemProvider(this.schemaVDoc, this.memFS, {
        isCaseSensitive: true,
      })
    );
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

  private readonly schemaVDoc = "code-note-vdoc";
  isVDoc(uri: Uri) {
    return uri.scheme === this.schemaVDoc;
  }
  vDocUri(typ: string, id: string) {
    return Uri.parse(`${this.schemaVDoc}:/${typ}-${id}.md`);
  }
  parseVDocUri(uri: Uri) {
    if (uri.scheme !== this.schemaVDoc) return {};
    if (!uri.path.endsWith(".md") || !uri.path.startsWith("/")) return {};
    const parts = uri.path.slice(1, uri.path.length - 3).split("-");
    if (parts.length !== 2) return {};
    return { id: parts[1], type: parts[0] };
  }

  removeVDoc(typ: Uri): void;
  removeVDoc(typ: string, id: string): void;
  removeVDoc(uriOrTyp: string | Uri, id?: string): void {
    if (typeof uriOrTyp === "string" && id) {
      this.memFS.delete(this.vDocUri(uriOrTyp, id));
    } else {
      const uri = uriOrTyp as Uri;
      this.memFS.delete(uri);
    }
    return;
  }
  writeVDoc = (typ: string, id: string, text: string): Uri => {
    const uri = this.vDocUri(typ, id);
    this.memFS.writeFile(uri, Buffer.from(text), {
      create: true,
      overwrite: true,
    });
    return uri;
  };

  // path is endsWith '.cnote'
  noteUri = (pkgOrPath: string, title?: string) => {
    if (!title) {
      return Uri.joinPath(this.context.globalStorageUri, pkgOrPath);
    }
    const pkg = pkgOrPath;
    return Uri.joinPath(
      this.context.globalStorageUri,
      workDir,
      pkg,
      title + ".cnote"
    );
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

  listNotePaths = async () => {
    const wd = Uri.joinPath(this.context.globalStorageUri, workDir);
    const list = [] as string[];
    const start = this.context.globalStorageUri.path.length;
    await this.visitDir(wd, (uri: Uri) => list.push(uri.path.slice(start)));
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
    const dir = Uri.joinPath(
      this.context.globalStorageUri,
      workDir,
      note.pkgName
    );
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
    const isNotePath = isSubDirectory(this.context.globalStorageUri.path);
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
    version: 2,
    id: await nanoid(),
    type: "TreeNote",
    text: `### ${title}`,
    pkgPath,
    pkgName,
    nodeMap: {},
    edges: [],
    activeNodeId: "",
  };
}
