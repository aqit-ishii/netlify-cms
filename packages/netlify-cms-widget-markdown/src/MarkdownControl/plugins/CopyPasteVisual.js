import { Document } from 'slate';
import { setEventTransfer } from 'slate-react';
//import base64 from 'slate-base64-serializer';
import isHotkey from 'is-hotkey';

import { slateToMarkdown, markdownToSlate, htmlToSlate, markdownToHtml } from '../../serializers';

const CopyPasteVisual = ({ getAsset, resolveWidget, remarkPlugins }) => {
  const handleCopy = async (event, editor) => {
    event.persist();
    const markdown = slateToMarkdown(editor.value.fragment.toJS());
    const html = await markdownToHtml(markdown, { getAsset, resolveWidget, re });
    setEventTransfer(event, 'text', markdown);
    setEventTransfer(event, 'html', html);
    // setEventTransfer(event, 'fragment', base64.serializeNode(editor.value.fragment));
    setEventTransfer(event, 'fragment', '');
    event.preventDefault();
  };

  return {
    onPaste(event, editor, next) {
      const data = event.clipboardData;
      if (isHotkey('shift', event)) {
        return next();
      }

      if (data.types.includes('application/x-slate-fragment')) {
        return editor;
        // const fragment = base64.deserializeNode(data.getData('application/x-slate-fragment'));
        // return editor.insertFragment(fragment);
      }

      const html = data.types.includes('text/html') && data.getData('text/html');
      const ast = html ? htmlToSlate(html) : markdownToSlate(data.getData('text/plain'));
      const doc = Document.fromJSON(ast);
      return editor.insertFragment(doc);
    },
    async onCopy(event, editor, next) {
      await handleCopy(event, editor, next);
    },
    onCut(event, editor, next) {
      handleCopy(event, editor, next);
      editor.delete();
    },
  };
}

export default CopyPasteVisual;
