/* eslint-disable react/display-name */
import React from 'react';
import { css } from '@emotion/core';
import styled from '@emotion/styled';
import { colors, lengths } from 'netlify-cms-ui-default';

import VoidBlock from './components/VoidBlock';
import Shortcode from './components/Shortcode';

const bottomMargin = '16px';

const headerStyles = `
  font-weight: 700;
  line-height: 1;
`;

const StyledH1 = styled.h1`
  ${headerStyles};
  font-size: 32px;
  margin-top: 16px;
`;

const StyledH2 = styled.h2`
  ${headerStyles};
  font-size: 24px;
  margin-top: 12px;
`;

const StyledH3 = styled.h3`
  ${headerStyles};
  font-size: 20px;
`;

const StyledH4 = styled.h4`
  ${headerStyles};
  font-size: 18px;
  margin-top: 8px;
`;

const StyledH5 = styled.h5`
  ${headerStyles};
  font-size: 16px;
  margin-top: 8px;
`;

const StyledH6 = StyledH5.withComponent('h6');

const StyledP = styled.p`
  margin-bottom: ${bottomMargin};
`;

const StyledBlockQuote = styled.blockquote`
  padding-left: 16px;
  border-left: 3px solid ${colors.background};
  margin-left: 0;
  margin-right: 0;
  margin-bottom: ${bottomMargin};
`;

const StyledPre = styled.pre`
  margin-bottom: ${bottomMargin};
  white-space: pre-wrap;

  & > code {
    display: block;
    width: 100%;
    overflow-y: auto;
    background-color: #000;
    color: #ccc;
    border-radius: ${lengths.borderRadius};
    padding: 10px;
  }
`;

const StyledCode = styled.code`
  background-color: ${colors.background};
  border-radius: ${lengths.borderRadius};
  padding: 0 2px;
  font-size: 85%;
`;

const StyledUl = styled.ul`
  margin-bottom: ${bottomMargin};
  padding-left: 30px;
`;

const StyledOl = StyledUl.withComponent('ol');

const StyledLi = styled.li`
  & > p:first-child {
    margin-top: 8px;
  }

  & > p:last-child {
    margin-bottom: 8px;
  }
`;

const StyledA = styled.a`
  text-decoration: underline;
  font-size: inherit;
`;

const StyledHr = styled.hr`
  border: 1px solid;
  margin-bottom: 16px;
`;

const StyledTable = styled.table`
  border-collapse: collapse;
`;

const StyledTd = styled.td`
  border: 2px solid black;
  padding: 8px;
  text-align: left;
`;

/**
 * Slate uses React components to render each type of node that it receives.
 * This is the closest thing Slate has to a schema definition. The types are set
 * by us when we manually deserialize from Remark's MDAST to Slate's AST.
 */

/**
 * Mark Components
 */
function Bold({ children }) {
  return <strong>{children}</strong>;
}

function Italic({ children }) {
  return <em>{children}</em>;
}

function Underline({ children }) {
  return <u>{children}</u>;
}

function Strikethrough({ children }) {
  return <s>{children}</s>;
}

function Code({children }) {
  return <StyledCode>{children}</StyledCode>;
}

/**
 * Node Components
 */
function Paragraph({ attributes, children }) {
  return <StyledP {...attributes}>{children}</StyledP>;
}

function ListItem({ attributes, children }) {
  return <StyledLi {...attributes}>{children}</StyledLi>;
}

function Quote({ attributes, children }) {
  return <StyledBlockQuote {...attributes}>{children}</StyledBlockQuote>;
}

function CodeBlock({ attributes, children }) {
  return (
    <StyledPre>
      <StyledCode {...attributes}>{children}</StyledCode>
    </StyledPre>
  );
}

function HeadingOne({ attributes, children }) {
  return <StyledH1 {...attributes}>{children}</StyledH1>;
}

function HeadingTwo({ attributes, children }) {
  return <StyledH2 {...attributes}>{children}</StyledH2>;
}

function HeadingThree({ attributes, children }) {
  return <StyledH3 {...attributes}>{children}</StyledH3>;
}

function HeadingFour({ attributes, children }) {
  return <StyledH4 {...attributes}>{children}</StyledH4>;
}

function HeadingFive({ attributes, children }) {
  return <StyledH5 {...attributes}>{children}</StyledH5>;
}

function HeadingSix({ attributes, children }) {
  return <StyledH6 {...attributes}>{children}</StyledH6>;
}

function Table({ attributes, children }) {
  return (
    <StyledTable>
      <tbody {...attributes}>{children}</tbody>
    </StyledTable>
  );
}

function TableRow({ attributes, children }) {
  return <tr {...attributes}>{children}</tr>;
}

function TableCell({ attributes, children }) {
  return <StyledTd {...attributes}>{children}</StyledTd>;
}

function ThematicBreak(props) {
  return (
    <StyledHr
      {...props.attributes}
      css={
        props.editor.isSelected(props.element) &&
        css`
          box-shadow: 0 0 0 2px ${colors.active};
          border-radius: 8px;
          color: ${colors.active};
        `
      }
    />
  );
}

function Break(props) {
  return <br {...props.attributes} />;
}

function BulletedList(props) {
  return <StyledUl {...props.attributes}>{props.children}</StyledUl>;
}

function NumberedList(props) {
  return (
    <StyledOl {...props.attributes} start={props.element.data.get('start') || 1}>
      {props.children}
    </StyledOl>
  );
}

function Link(props) {
  const data = props.element.get('data');
  const url = data.get('url');
  const title = data.get('title') || url;

  return (
    <StyledA href={url} title={title} {...props.attributes}>
      {props.children}
    </StyledA>
  );
}

function Image(props) {
  const data = props.element.get('data');
  const marks = data.get('marks');
  const url = data.get('url');
  const title = data.get('title');
  const alt = data.get('alt');
  const image = <img src={url} title={title} alt={alt} {...props.attributes} />;
  const result = !marks
    ? image
    : marks.reduce((acc, mark) => {
        return renderMark({ mark, children: acc });
      }, image);
  return result;
}

export function renderMark({ attributes, children, leaf }) {
  if (leaf.bold) {
    return <Bold {...attributes}>{children}</Bold>
  }
  if (leaf.italic) {
    return <Italic {...attributes}>{children}</Italic>
  }
  if (leaf.underline) {
    return <Underline {...attributes}>{children}</Underline>
  }
  if (leaf.strikethrough) {
    return <Strikethrough {...attributes}>{children}</Strikethrough>
  }
  if (leaf.code) {
    return <Code {...attributes}>{children}</Code>
  }
  return <span {...attributes}>{children}</span>
}


export function renderInline({attributes, children, element}) {
  switch (element.type) {
    case 'link':
      return <Link {...attributes} >{children}</Link>;
    case 'image':
      return <Image {...attributes} >{children}</Image>;
    case 'break':
      return <Break {...attributes} >{children}</Break>;
  }
}

export function renderBlock({ classNameWrapper, codeBlockComponent, attributes, children, element }) {
  switch (element.type) {
    case 'paragraph':
      return <Paragraph {...attributes} >{children}</Paragraph>;
    case 'list-item':
      return <ListItem {...attributes} >{children}</ListItem>;
    case 'quote':
      return <Quote {...attributes} >{children}</Quote>;
    case 'code-block':
      if (codeBlockComponent) {
        return (
          <VoidBlock {...attributes}>
            <Shortcode
              classNameWrapper={classNameWrapper}
              typeOverload="code-block"
              dataKey={false}
              {...attributes}
            >{children}</Shortcode>
          </VoidBlock>
        );
      }
      return <CodeBlock {...attributes} >{children}</CodeBlock>;
    case 'heading-one':
      return <HeadingOne {...attributes} >{children}</HeadingOne>;
    case 'heading-two':
      return <HeadingTwo {...attributes} >{children}</HeadingTwo>;
    case 'heading-three':
      return <HeadingThree {...attributes} >{children}</HeadingThree>;
    case 'heading-four':
      return <HeadingFour {...attributes} >{children}</HeadingFour>;
    case 'heading-five':
      return <HeadingFive {...attributes} >{children}</HeadingFive>;
    case 'heading-six':
      return <HeadingSix {...attributes} >{children}</HeadingSix>;
    case 'table':
      return <Table {...attributes} >{children}</Table>;
    case 'table-row':
      return <TableRow {...attributes} >{children}</TableRow>;
    case 'table-cell':
      return <TableCell {...attributes} >{children}</TableCell>;
    case 'thematic-break':
      return (
        <VoidBlock {...attributes}>
          <ThematicBreak {...attributes} >{children}</ThematicBreak>
        </VoidBlock>
      );
    case 'bulleted-list':
      return <BulletedList {...attributes} >{children}</BulletedList>;
    case 'numbered-list':
      return <NumberedList {...attributes} >{children}</NumberedList>;
    case 'shortcode':
      return (
        <VoidBlock {...attributes}>
          <Shortcode classNameWrapper={classNameWrapper} {...attributes} >{children}</Shortcode>
        </VoidBlock>
      );
  }
}

