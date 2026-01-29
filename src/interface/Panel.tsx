import { Trans } from '@lingui/react/macro';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { CSSProperties } from 'react';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface HeadingProps {
  title?: ReactNode;
  titleTransId?: string;
  addAnchor?: boolean;
  explanation?: ReactNode;
  actions?: ReactNode;
  backButton?: ReactNode;
  as?: HeadingTag;
}

const makeAnchorId = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const Heading = ({
  title,
  titleTransId,
  addAnchor = true,
  explanation,
  actions,
  backButton,
  as = 'h1',
}: HeadingProps) => {
  const isStringTitle = typeof title === 'string';
  const anchorId = isStringTitle ? makeAnchorId(title) : undefined;

  const translatedTitle =
    titleTransId && isStringTitle ? <Trans id={titleTransId}>{title}</Trans> : title;

  const renderedTitle =
    isStringTitle && addAnchor ? (
      <a href={`#${anchorId}`} id={anchorId}>
        {translatedTitle}
      </a>
    ) : (
      translatedTitle
    );

  const Tag = as;

  const headingBlock = (
    <>
      <Tag style={{ position: 'relative' }}>
        {backButton && <div className="back-button">{backButton}</div>}
        {renderedTitle}
      </Tag>
      {explanation && <small>{explanation}</small>}
    </>
  );

  return (
    <div className="panel-heading">
      {actions ? (
        <div className="flex wrapable">
          <div className="flex-main">{headingBlock}</div>
          <div className="flex-sub action-buttons" style={{ margin: '10px 0' }}>
            {actions}
          </div>
        </div>
      ) : (
        headingBlock
      )}
    </div>
  );
};

interface PanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
  pad?: boolean;
  // Heading
  title?: ReactNode;
  titleTransId?: string;
  titleTag?: HeadingTag;
  addAnchor?: boolean;
  explanation?: ReactNode;
  actions?: ReactNode;
  backButton?: ReactNode;
}

const Panel = ({
  children,
  className = '',
  style,
  pad = true,
  title,
  titleTransId,
  titleTag,
  addAnchor,
  explanation,
  actions,
  backButton,
  bodyStyle,
}: PanelProps) => (
  <div className={clsx('panel', className)} style={style}>
    {title !== null && (
      <Heading
        title={title}
        titleTransId={titleTransId}
        as={titleTag}
        addAnchor={addAnchor}
        explanation={explanation}
        actions={actions}
        backButton={backButton}
      />
    )}
    <div className={clsx('panel-body', { pad })} style={bodyStyle}>
      {children}
    </div>
  </div>
);

export default Panel;
