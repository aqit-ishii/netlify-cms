import React, { useCallback, useMemo, useState, memo } from 'react'
import isHotkey from 'is-hotkey'
import { Editable, withReact, useSlate, Slate } from 'slate-react'
import {
  Editor,
  Transforms,
  createEditor,
  Descendant,
  Element as SlateElement, Text,
} from 'slate'
import { withHistory } from 'slate-history'
import {markdownToSlate, slateToMarkdown} from "../serializers";
import {cloneDeep, debounce, get, isEmpty, isEqual} from "lodash";
import {fromJS} from "immutable";
import {renderBlock, renderMark} from "./renderers";

// import { Button, Icon, Toolbar } from '../components'

const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

const LIST_TYPES = ['numbered-list', 'bulleted-list']
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify']


function createEmptyRawDoc() {
  const emptyText = Text.create('');
  const emptyBlock = Element.create({ object: 'block', type: 'paragraph', children: [emptyText] });
  return { children: [emptyBlock] };
}

function createSlateValue(rawValue, { voidCodeBlock, remarkPlugins }) {
  const rawDoc = rawValue && markdownToSlate(rawValue, { voidCodeBlock, remarkPlugins });
  const rawDocHasNodes = !isEmpty(get(rawDoc, 'children'));
  return rawDocHasNodes ? rawDoc : createEmptyRawDoc();
}

export function mergeMediaConfig(editorComponents, field) {
  // merge editor media library config to image components
  if (editorComponents.has('image')) {
    const imageComponent = editorComponents.get('image');
    const fields = imageComponent?.fields;

    if (fields) {
      imageComponent.fields = fields.update(
        fields.findIndex(f => f.get('widget') === 'image'),
        f => {
          // merge `media_library` config
          if (field.has('media_library')) {
            f = f.set(
              'media_library',
              field.get('media_library').mergeDeep(f.get('media_library')),
            );
          }
          // merge 'media_folder'
          if (field.has('media_folder') && !f.has('media_folder')) {
            f = f.set('media_folder', field.get('media_folder'));
          }
          // merge 'public_folder'
          if (field.has('public_folder') && !f.has('public_folder')) {
            f = f.set('public_folder', field.get('public_folder'));
          }
          return f;
        },
      );
    }
  }
}

const VisualEditor4 = (props) => {
  const {t, value, className, field, resolveWidget, onChange, getEditorComponents, getRemarkPlugins} = props;
  const editorComps = getEditorComponents();
  const codeBlockComponent = fromJS(editorComps.find(({ type }) => type === 'code-block'));
  const editorComponents = codeBlockComponent || editorComps.has('code-block')
    ? editorComps
    : editorComps.set('code-block', { label: 'Code Block', type: 'code-block' });
  const remarkPlugins = getRemarkPlugins();
  mergeMediaConfig(editorComponents, field);

  const [stateValue, setStateValue] = useState({
    value: createSlateValue(value, { voidCodeBlock: codeBlockComponent, remarkPlugins }).children,
  });

  const renderElement = useCallback((props) => renderBlock({
    classNameWrapper: className,
    resolveWidget,
    codeBlockComponent,
    ...props
  }),[renderBlock, className, resolveWidget, codeBlockComponent]);
  const renderLeaf = useCallback((props) => renderMark({...props}), [renderMark]);

  // const renderElement = useCallback(props => <Element {...props} />, [])
  //const renderLeaf = useCallback(props => <Leaf {...props} />, [])
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])

  const handleDocumentChange = debounce(value => {
    //const markdown = value.map(n => Node.string(n)).join('\n');
    const raw = cloneDeep({ type:'root', children: value })
    const markdown = slateToMarkdown(raw, {
      voidCodeBlock: codeBlockComponent,
      remarkPlugins,
    });
    onChange(markdown);
  }, 150);

  const shouldComponentUpdate = memo(
    props => props,
    (nextProps, nextState) => {
      if (!stateValue.equals(nextState.value)) return true;
      const raw = nextState.children
      const markdown = slateToMarkdown(raw, {
        voidCodeBlock: codeBlockComponent,
        remarkPlugins,
      });
      return nextProps.value !== markdown;
    }
  );



  const handleChange = useCallback(val => {
    if (!isEqual(stateValue.value, val)) {
      handleDocumentChange(val);
    }
    setStateValue( {value: val} );
  },[stateValue, handleDocumentChange, setStateValue ]);


  return (
    <>
      <Slate editor={editor} onChange={handleChange} value={stateValue.value}>
        {/*<Toolbar>*/}
        {/*  <MarkButton format="bold" icon="format_bold" />*/}
        {/*  <MarkButton format="italic" icon="format_italic" />*/}
        {/*  <MarkButton format="underline" icon="format_underlined" />*/}
        {/*  <MarkButton format="code" icon="code" />*/}
        {/*  <BlockButton format="heading-one" icon="looks_one" />*/}
        {/*  <BlockButton format="heading-two" icon="looks_two" />*/}
        {/*  <BlockButton format="block-quote" icon="format_quote" />*/}
        {/*  <BlockButton format="numbered-list" icon="format_list_numbered" />*/}
        {/*  <BlockButton format="bulleted-list" icon="format_list_bulleted" />*/}
        {/*  <BlockButton format="left" icon="format_align_left" />*/}
        {/*  <BlockButton format="center" icon="format_align_center" />*/}
        {/*  <BlockButton format="right" icon="format_align_right" />*/}
        {/*  <BlockButton format="justify" icon="format_align_justify" />*/}
        {/*</Toolbar>*/}
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Enter some rich text…"
          spellCheck
          autoFocus
          onKeyDown={event => {
            for (const hotkey in HOTKEYS) {
              if (isHotkey(hotkey, event)) {
                event.preventDefault()
                const mark = HOTKEYS[hotkey]
                toggleMark(editor, mark)
              }
            }
          }}
        />
      </Slate>
      {/*<textarea>{JSON.stringify(stateValue)}</textarea>*/}
    </>
  )
}

const toggleBlock = (editor, format) => {
  const isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
  )
  const isList = LIST_TYPES.includes(format)

  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type) &&
      !TEXT_ALIGN_TYPES.includes(format),
    split: true,
  })
  let newProperties
  if (TEXT_ALIGN_TYPES.includes(format)) {
    newProperties = {
      align: isActive ? undefined : format,
    }
  } else {
    newProperties = {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    }
  }
  Transforms.setNodes(editor, newProperties)

  if (!isActive && isList) {
    const block = { type: format, children: [] }
    Transforms.wrapNodes(editor, block)
  }
}

const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format)

  if (isActive) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

const isBlockActive = (editor, format, blockType = 'type') => {
  const { selection } = editor
  if (!selection) return false

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        n[blockType] === format,
    })
  )

  return !!match
}

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor)
  return marks ? marks[format] === true : false
}

// const Element = ({ attributes, children, element }) => {
//   const style = { textAlign: element.align }
//   switch (element.type) {
//     case 'block-quote':
//       return (
//         <blockquote style={style} {...attributes}>
//           {children}
//         </blockquote>
//       )
//     case 'bulleted-list':
//       return (
//         <ul style={style} {...attributes}>
//           {children}
//         </ul>
//       )
//     case 'heading-one':
//       return (
//         <h1 style={style} {...attributes}>
//           {children}
//         </h1>
//       )
//     case 'heading-two':
//       return (
//         <h2 style={style} {...attributes}>
//           {children}
//         </h2>
//       )
//     case 'list-item':
//       return (
//         <li style={style} {...attributes}>
//           {children}
//         </li>
//       )
//     case 'numbered-list':
//       return (
//         <ol style={style} {...attributes}>
//           {children}
//         </ol>
//       )
//     default:
//       return (
//         <p style={style} {...attributes}>
//           {children}
//         </p>
//       )
//   }
// }
//
// const Leaf = ({ attributes, children, leaf }) => {
//   if (leaf.bold) {
//     children = <strong>{children}</strong>
//   }
//
//   if (leaf.code) {
//     children = <code>{children}</code>
//   }
//
//   if (leaf.italic) {
//     children = <em>{children}</em>
//   }
//
//   if (leaf.underline) {
//     children = <u>{children}</u>
//   }
//
//   return <span {...attributes}>{children}</span>
// }
//
// const BlockButton = ({ format, icon }) => {
//   const editor = useSlate()
//   return (
//     <Button
//       active={isBlockActive(
//         editor,
//         format,
//         TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
//       )}
//       onMouseDown={event => {
//         event.preventDefault()
//         toggleBlock(editor, format)
//       }}
//     >
//       <Icon>{icon}</Icon>
//     </Button>
//   )
// }

// const MarkButton = ({ format, icon }) => {
//   const editor = useSlate()
//   return (
//     <Button
//       active={isMarkActive(editor, format)}
//       onMouseDown={event => {
//         event.preventDefault()
//         toggleMark(editor, format)
//       }}
//     >
//       <Icon>{icon}</Icon>
//     </Button>
//   )
// }
//
// const initialValue = [
//   {
//     type: 'paragraph',
//     children: [
//       { text: 'This is editable ' },
//       { text: 'rich', bold: true },
//       { text: ' text, ' },
//       { text: 'much', italic: true },
//       { text: ' better than a ' },
//       { text: '<textarea>', code: true },
//       { text: '!' },
//     ],
//   },
//   {
//     type: 'paragraph',
//     children: [
//       {
//         text:
//           "Since it's rich text, you can do things like turn a selection of text ",
//       },
//       { text: 'bold', bold: true },
//       {
//         text:
//           ', or add a semantically rendered block quote in the middle of the page, like this:',
//       },
//     ],
//   },
//   {
//     type: 'block-quote',
//     children: [{ text: 'A wise quote.' }],
//   },
//   {
//     type: 'paragraph',
//     align: 'center',
//     children: [{ text: 'Try it out for yourself!' }],
//   },
// ]

export default VisualEditor4
