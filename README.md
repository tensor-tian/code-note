# code-note

## Features

1. open or create `*.cnote` file
2. [select and highlight code](#code-selection)
3. [add code node to tree flow graph](#add-node)
4. [add text node to tree flow graph](#add-node)
5. grouping code nodes with scrolly
6. [remove node or edge](#node-status)
7. adjust relations of nodes
8. update text of any kind of node
9. reselect code range of code block

## Code Selection

`Empty` -> `Code` -> `Focus` -> `Mark` -> `Link` 

- `Code`: the code will be displayed in code block
- `Focus`: `focus` annotation of codehike
- `Mark`: `mark` annotation of codehike
- `Link`: `link` annotation of codehike


| command\status                               | Empty                                     | Code                                      | Focus                                     | Mark                                      | Link                                      |
|----------------------------------------------|-------------------------------------------|-------------------------------------------|-------------------------------------------|-------------------------------------------|-------------------------------------------|
| Code Note: Add Highlight                     | `Code` all rows selected                  | `Focus` all rows selected                 | `Mark` text selected                      | `Link` text selected                      | -                                         |
| Code Note: Remove Highlight                  | -                                         | remove `Code`                             | remove `Focus`, keep `Code`               | remove `Focus`, keep `Focus`              | remove `Mark`, keep `Focus`               |
| Code Note: Remove All  + empty selection     | remove all highlights                     | remove all highlights                     | remove all highlights                     | remove all highlights                     | remove all highlights                     |
| Code Note: Remove All  + not empty selection | remove all highlights  in selection range | remove all highlights  in selection range | remove all highlights  in selection range | remove all highlights  in selection range | remove all highlights  in selection range |

## Node status

`Active`: click node, will scroll to center of view, allowing actions:

- adding `detail` node connect to the  `active` node, which means diving into the `active` node or explain more for the `active` node
- adding `next` node connect to the `active` node, which means the next step follow active step.

`Selected`: toggle checkbox in right-top conner of node, if node is selected, you can do some actions to the node:

- delete selected node or edge
- merge multiple selected  nodes of type `"Code"`, wrapping with group node of type `Scrolly`.

## Node Type

`"Text"`: text block, render with `MDX`.

`"Code"`: code block, render with `MDX` and codehike components (`CH.Section` + `CH.Code`)

```md
<CH.Section>
MDX text
<CH.Code>
\`\`\`ts filename.ts lineNums=1:3 focus=2
// mark=10:14
function sum(a: number, b: number): number {
  return a + b
}
\`\`\`
</CH.Code>
```

`Scrolly`: 

```md
MDX text

<CH.Scrolly>

step1 text

\`\`\`ts filename.ts lineNums=1:3 focus=2
// mark=10:14
function sum1(a: number, b: number): number {
  return a + b
}
\`\`\`

---

step2 text

\`\`\`ts filename.ts lineNums=1:3 focus=2
// mark=10:14
function sum2(a: number, b: number): number {
  return a + b
}
\`\`\`
</CH.Scrolly>
```
## Add Node

|active node \ new node| detail Code | next Code | detail Text | next Text|
|--|--|--|--|--|
|Code not in group|
|Code in Scrolly of `renderAsGroup` mode|
|Code in Scrolly of `!renderAsGroup` mode|
|Text not in group|
|Text in Scrolly of `renderAsGroup` mode|
|Text in Scrolly of `!renderAsGroup` mode|



