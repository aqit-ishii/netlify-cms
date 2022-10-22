import React, {forwardRef, useCallback, useMemo, useState, memo} from 'react'
import isHotkey from 'is-hotkey'
import { Editable, withReact, useSlate, Slate } from 'slate-react'
import {
  Editor,
  Transforms,
  createEditor,
  Descendant,
  Element as SlateElement, Node,
} from 'slate'
import { withHistory } from 'slate-history'

// import { Ref, PropsWithChildren } from 'react'
import ReactDOM from 'react-dom'
import { cx, css } from '@emotion/css'
import {debounce, isEqual} from "lodash";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import VisualEditor2, {mergeMediaConfig} from "./VisualEditor2";
import {slateToMarkdown} from "../serializers";
import {fromJS} from "immutable";
import {renderBlock, renderMark} from "./renderers";

const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

const LIST_TYPES = ['numbered-list', 'bulleted-list']
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify']

const VisualEditor3 = (props) => {
  const {t, value, className, onChange, getEditorComponents} = props;

  const editorComps = getEditorComponents();
  const codeBlockComponent = fromJS(editorComps.find(({ type }) => type === 'code-block'));
  const editorComponents = codeBlockComponent || editorComps.has('code-block')
    ? editorComps
    : editorComps.set('code-block', { label: 'Code Block', type: 'code-block' });
  const remarkPlugins = getRemarkPlugins();
  mergeMediaConfig(editorComponents, field);

  const renderElement = useCallback(() => renderBlock({
    classNameWrapper: className,
    resolveWidget,
    codeBlockComponent,
  }),[renderBlock, className, resolveWidget, codeBlockComponent]);
  const renderLeaf = useCallback(renderMark, [renderMark]);


  const [stateValue, setStateValue] = useState({
    value: (value || '')
      .split('\n')
      .map(text => ({ type: 'paragraph', children: [{ text }] })),
  });

  //const renderElement = useCallback(props => <Element {...props} />, [])
  //const renderLeaf = useCallback(props => <Leaf {...props} />, [])
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])
  // MEMO: Slate 0.57.1 does NOT handle `paste without formatting` (shift-ctrl-v), that will be fixed by PR #3415 in ianstormtaylor/slate.
  // This problem will be automatically corrected if the PR is merged.
  editor.insertData = data => {
    const value = data
      .getData('text/plain')
      .split('\n')
      .map(text => ({ type: 'paragraph', children: [{ text }] }));
    Editor.insertFragment(editor, value);
  };

  const handleDocumentChange = debounce(value => {
    //const markdown = value.map(n => Node.string(n)).join('\n');
    const raw = editor.value.document.toJS();
    const markdown = slateToMarkdown(raw, {
      voidCodeBlock: codeBlockComponent,
      remarkPlugins: remarkPlugins,
    });
    onChange(markdown);

    onChange(markdown);
  }, 150);

  const shouldComponentUpdate = memo(
    props => {...},
    (nextProps, nextState) => {
      if (!stateValue.equals(nextState.value)) return true;

      const raw = nextState.value.document.toJS();
      const markdown = slateToMarkdown(raw, {
        voidCodeBlock: codeBlockComponent,
        remarkPlugins: remarkPlugins,
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
    <Slate editor={editor} value={stateValue.value} onChange={handleChange} t={t}>
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
            if (isHotkey(hotkey, event /* as any */)) {
              event.preventDefault()
              const mark = HOTKEYS[hotkey]
              toggleMark(editor, mark)
            }
          }
        }}
      />
    </Slate>
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
  let newProperties /*: Partial<SlateElement>*/
  if (TEXT_ALIGN_TYPES.includes(format)) {
    newProperties = {
      align: isActive ? undefined : format,
    }
  } else {
    newProperties = {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    }
  }
  Transforms.setNodes/*<SlateElement>*/(editor, newProperties)

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

const Element = ({ attributes, children, element }) => {
  const style = { textAlign: element.align }
  switch (element.type) {
    case 'block-quote':
      return (
        <blockquote style={style} {...attributes}>
          {children}
        </blockquote>
      )
    case 'bulleted-list':
      return (
        <ul style={style} {...attributes}>
          {children}
        </ul>
      )
    case 'heading-one':
      return (
        <h1 style={style} {...attributes}>
          {children}
        </h1>
      )
    case 'heading-two':
      return (
        <h2 style={style} {...attributes}>
          {children}
        </h2>
      )
    case 'list-item':
      return (
        <li style={style} {...attributes}>
          {children}
        </li>
      )
    case 'numbered-list':
      return (
        <ol style={style} {...attributes}>
          {children}
        </ol>
      )
    default:
      return (
        <p style={style} {...attributes}>
          {children}
        </p>
      )
  }
}

const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>
  }

  if (leaf.code) {
    children = <code>{children}</code>
  }

  if (leaf.italic) {
    children = <em>{children}</em>
  }

  if (leaf.underline) {
    children = <u>{children}</u>
  }

  return <span {...attributes}>{children}</span>
}

const BlockButton = ({ format, icon }) => {
  // const editor = useSlate()
  // return (
    // <Button
    //   active={isBlockActive(
    //     editor,
    //     format,
    //     TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
    //   )}
    //   onMouseDown={event => {
    //     event.preventDefault()
    //     toggleBlock(editor, format)
    //   }}
    // >
    //   <Icon>{icon}</Icon>
    // </Button>
  // )
  return <></>
}

const MarkButton = ({ format, icon }) => {
  // const editor = useSlate()
  // return (
    // <Button
    //   active={isMarkActive(editor, format)}
    //   onMouseDown={event => {
    //     event.preventDefault()
    //     toggleMark(editor, format)
    //   }}
    // >
    //   <Icon>{icon}</Icon>
    // </Button>
  // )
  return <></>
}

const initialValue /*: Descendant[] */ = [
  {
    type: 'paragraph',
    children: [
      { text: 'This is editable ' },
      { text: 'rich', bold: true },
      { text: ' text, ' },
      { text: 'much', italic: true },
      { text: ' better than a ' },
      { text: '<textarea>', code: true },
      { text: '!' },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          "Since it's rich text, you can do things like turn a selection of text ",
      },
      { text: 'bold', bold: true },
      {
        text:
          ', or add a semantically rendered block quote in the middle of the page, like this:',
      },
    ],
  },
  {
    type: 'block-quote',
    children: [{ text: 'A wise quote.' }],
  },
  {
    type: 'paragraph',
    align: 'center',
    children: [{ text: 'Try it out for yourself!' }],
  },
]

VisualEditor3.propTypes = {
  onAddAsset: PropTypes.func.isRequired,
  getAsset: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onMode: PropTypes.func.isRequired,
  className: PropTypes.string.isRequired,
  value: PropTypes.string,
  field: ImmutablePropTypes.map.isRequired,
  getEditorComponents: PropTypes.func.isRequired,
  getRemarkPlugins: PropTypes.func.isRequired,
  isShowModeToggle: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  pendingFocus: PropTypes.bool.isRequired,
};
export default VisualEditor3

/*
interface BaseProps {
  className: string
  [key: string]: unknown
}
type OrNull<T> = T | null
*/
//
// export const Button = forwardRef(
//   (
//     {
//       className,
//       active,
//       reversed,
//       ...props
//     } /*: PropsWithChildren<
//       {
//         active: boolean
//         reversed: boolean
//       } & BaseProps
//       >*/,
//     ref /*: Ref<OrNull<HTMLSpanElement>>*/
//   ) => (
//     <span
//       {...props}
//       ref={ref}
//       className={cx(
//         className,
//         css`
//           cursor: pointer;
//           color: ${reversed
//           ? active
//             ? 'white'
//             : '#aaa'
//           : active
//             ? 'black'
//             : '#ccc'};
//         `
//       )}
//     />
//   )
// )
//
// export const EditorValue = forwardRef(
//   (
//     {
//       className,
//       value,
//       ...props
//     } /*: PropsWithChildren<
//       {
//         value: any
//       } & BaseProps
//       > */,
//     ref /*: Ref<OrNull<null>> */
//   ) => {
//     const textLines = value.document.nodes
//       .map(node => node.text)
//       .toArray()
//       .join('\n')
//     return (
//       <div
//         ref={ref}
//         {...props}
//         className={cx(
//           className,
//           css`
//             margin: 30px -20px 0;
//           `
//         )}
//       >
//         <div
//           className={css`
//             font-size: 14px;
//             padding: 5px 20px;
//             color: #404040;
//             border-top: 2px solid #eeeeee;
//             background: #f8f8f8;
//           `}
//         >
//           Slates value as text
//         </div>
//         <div
//           className={css`
//             color: #404040;
//             font: 12px monospace;
//             white-space: pre-wrap;
//             padding: 10px 20px;
//             div {
//               margin: 0 0 0.5em;
//             }
//           `}
//         >
//           {textLines}
//         </div>
//       </div>
//     )
//   }
// )
//
// export const Icon = forwardRef(
//   (
//     { className, ...props } /*: PropsWithChildren<BaseProps> */,
//     ref /*: Ref<OrNull<HTMLSpanElement>>*/
//   ) => (
//     <span
//       {...props}
//       ref={ref}
//       className={cx(
//         'material-icons',
//         className,
//         css`
//           font-size: 18px;
//           vertical-align: text-bottom;
//         `
//       )}
//     />
//   )
// )
//
// export const Instruction = forwardRef(
//   (
//     { className, ...props } /*: PropsWithChildren<BaseProps>*/,
//     ref /*: Ref<OrNull<HTMLDivElement>> */
//   ) => (
//     <div
//       {...props}
//       ref={ref}
//       className={cx(
//         className,
//         css`
//           white-space: pre-wrap;
//           margin: 0 -20px 10px;
//           padding: 10px 20px;
//           font-size: 14px;
//           background: #f8f8e8;
//         `
//       )}
//     />
//   )
// )
//
// export const Menu = forwardRef(
//   (
//     { className, ...props } /*: PropsWithChildren<BaseProps>*/,
//     ref /*: Ref<OrNull<HTMLDivElement>> */
//   ) => (
//     <div
//       {...props}
//       ref={ref}
//       className={cx(
//         className,
//         css`
//           & > * {
//             display: inline-block;
//           }
//
//           & > * + * {
//             margin-left: 15px;
//           }
//         `
//       )}
//     />
//   )
// )
//
// export const Portal = ({ children }) => {
//   return typeof document === 'object'
//     ? ReactDOM.createPortal(children, document.body)
//     : null
// }
//
// export const Toolbar = forwardRef(
//   (
//     { className, ...props } /*: PropsWithChildren<BaseProps> */,
//     ref /*: Ref<OrNull<HTMLDivElement>> */
//   ) => (
//     <Menu
//       {...props}
//       ref={ref}
//       className={cx(
//         className,
//         css`
//           position: relative;
//           padding: 1px 18px 17px;
//           margin: 0 -20px;
//           border-bottom: 2px solid #eee;
//           margin-bottom: 20px;
//         `
//       )}
//     />
//   )
// )
