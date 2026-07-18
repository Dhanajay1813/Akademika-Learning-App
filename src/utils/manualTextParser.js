const numberedListPattern = /^\s*(\d+[\.\)])\s+(.*)$/;
const bulletListPattern = /^\s*([-*•])\s+(.*)$/;

const createParagraph = (lines) => ({
  type: 'paragraph',
  text: lines.join('\n'),
});

const createList = (listType, items) => ({
  type: listType,
  items,
});

export const parseStructuredText = (text = '') => {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraphLines = [];
  let listType = null;
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push(createParagraph(paragraphLines));
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(createList(listType, listItems));
    listType = null;
    listItems = [];
  };

  lines.forEach((line) => {
    if (!line.trim()) {
      flushParagraph();
      flushList();
      return;
    }

    const numberedMatch = line.match(numberedListPattern);
    const bulletMatch = line.match(bulletListPattern);

    if (numberedMatch) {
      flushParagraph();
      if (listType !== 'numbered') flushList();
      listType = 'numbered';
      listItems.push({ marker: numberedMatch[1], text: numberedMatch[2] });
      return;
    }

    if (bulletMatch) {
      flushParagraph();
      if (listType !== 'bullet') flushList();
      listType = 'bullet';
      listItems.push({ marker: '•', text: bulletMatch[2] });
      return;
    }

    if (listItems.length) {
      const lastItem = listItems[listItems.length - 1];
      lastItem.text = `${lastItem.text}\n${line.trim()}`;
      return;
    }

    paragraphLines.push(line);
  });

  flushParagraph();
  flushList();
  return blocks;
};
