import { useEffect, type ReactNode } from 'react';
import { REFERENCE_REGISTRY, type ReferenceId } from '@/domain/references';
import { ReferenceTag } from '@/components/layout/ReferenceTag';

export function SectionHeader({
  referenceId,
  description,
  actions,
  level = 2,
}: {
  referenceId: ReferenceId;
  description?: string;
  actions?: ReactNode;
  level?: 2 | 3;
}) {
  const entry = REFERENCE_REGISTRY[referenceId];
  const Heading = level === 3 ? 'h3' : 'h2';
  return (
    <div className="section-header">
      <div className="section-heading">
        <Heading id={`${referenceId}-title`}>{entry.name}</Heading>
        <ReferenceTag referenceId={referenceId} />
        {actions}
      </div>
      {description ? <p className="takeaway">{description}</p> : null}
    </div>
  );
}

export function PageHeader({
  referenceId,
  title,
  kicker,
  documentTitle,
  children,
}: {
  referenceId: ReferenceId;
  title?: string;
  kicker?: string;
  documentTitle?: string;
  children?: ReactNode;
}) {
  const entry = REFERENCE_REGISTRY[referenceId];
  const heading = title ?? entry.name;
  useEffect(() => {
    document.title = `${documentTitle ?? heading} · Stock Research`;
  }, [documentTitle, heading]);

  return (
    <header className="page-header section-header">
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <div className="section-heading">
        <h1>{heading}</h1>
        <ReferenceTag referenceId={referenceId} />
      </div>
      {children}
    </header>
  );
}
