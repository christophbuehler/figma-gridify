interface Params {
  cols: string;
  spacing: string;
  width: string;
}

figma.parameters.on('input', ({ key, result }: ParameterInputEvent) => {
  switch (key as keyof Params) {
    case 'cols':
      result.setSuggestions(['4', '8', '16']);
      break;
    case 'spacing':
      result.setSuggestions(['16', '32', '64']);
      break;
    case 'width':
      result.setSuggestions(['16', '32', '64']);
      break;
    default:
      result.setSuggestions([]);
  }
});

figma.on('run', ({ command, parameters }: RunEvent<Params>) => {
  createGrid(figma.currentPage.selection, parameters);
  figma.closePlugin();
});

function unwrapChildren(parent: FrameNode) {
  const unwrapTypes = ['GROUP', 'FRAME'];
  parent.children
    .filter(child => unwrapTypes.indexOf(child.type) !== -1)
    .forEach((child: GroupNode | FrameNode) => {
      child.children.forEach(node => parent.appendChild(node));
      if (!child.removed) child.remove();
    });
}

function toFrameNode(node: GroupNode): FrameNode {
  const frame = figma.createFrame();
  frame.fills = [];
  frame.x = node.x;
  frame.y = node.y;
  node.parent.appendChild(frame);
  node.children.forEach(child => frame.appendChild(child));
  return frame;
}

function ensureFrameNode(node: FrameNode | GroupNode): FrameNode {
  if (node.type === 'FRAME') return node;
  return toFrameNode(node);
}

function createGrid(items: readonly SceneNode[], params: Params) {
  const spacing = parseInt(params.spacing || '32', 10);
  const width = parseInt(params.width || '32', 10);
  const cols = parseInt(params.cols || '4', 10);

  if (items.length > 1) return false;

  // Convert the selected node to a Frame Node.
  const supportedNodeTypes = ['FRAME', 'GROUP'];
  if (supportedNodeTypes.indexOf(items[0].type) === -1) return false;

  const parent = ensureFrameNode(items[0] as any);

  unwrapChildren(parent);

  parent.layoutMode = 'VERTICAL';
  parent.primaryAxisSizingMode = 'AUTO';
  parent.counterAxisSizingMode = 'AUTO';
  parent.itemSpacing = spacing;

  // Wrap the children into multiple Frame Nodes.
  const groups: BaseNode[][] = [];

  const children = parent.children as GroupNode[];

  // If the icon is not a square, keep the proportions.
  children.forEach(child => child.resize(width, (child.height / child.width) * width));

  children.reduce((group, item, i) => {
    group.push(item);
    if (group.length === cols || i === children.length - 1) {
      groups.push(group);
      return [];
    }
    return group;
  }, [] as SceneNode[]);

  parent.resize(
    cols * width + spacing * (cols - 1),
    groups.length * width + spacing * (groups.length - 1)
  );

  groups
    .map(group => figma.group(group, parent))
    .map(groupNode => toFrameNode(groupNode))
    .forEach(frameNode => {
      frameNode.layoutMode = 'HORIZONTAL';
      frameNode.primaryAxisSizingMode = 'AUTO';
      frameNode.counterAxisSizingMode = 'AUTO';
      frameNode.itemSpacing = spacing;
      frameNode.counterAxisAlignItems = "CENTER";
    });

  figma.viewport.scrollAndZoomIntoView([parent]);
}
