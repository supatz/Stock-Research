import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MetricDefinition } from '@/domain/types';

export function MetricHelp({ definition }: { definition: MetricDefinition }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key === 'Tab' && dialog) {
        const items = [...dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea')]
          .filter((item) => !item.hasAttribute('disabled'));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="help-button"
        aria-label={`Help for ${definition.label}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      {open
        ? createPortal(
          <div className="dialog-backdrop" onMouseDown={() => { setOpen(false); triggerRef.current?.focus(); }}>
            <div
              ref={dialogRef}
              className="help-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="dialog-heading">
                <h2 id={titleId}>{definition.help.title}</h2>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  Close
                </button>
              </div>
              <p>{definition.help.plainEnglish}</p>
              {definition.help.formula ? <p className="formula">{definition.help.formula}</p> : null}
              <HelpList title="How to read it" items={definition.help.howToRead} />
              <HelpList title="What to compare" items={definition.help.compareAgainst} />
              <HelpList title="Caveats" items={definition.help.caveats} />
              {definition.help.example ? (
                <p className="example"><strong>Example. </strong>{definition.help.example}</p>
              ) : null}
              <p className="provenance">Source: deterministic mock snapshot, not live market data.</p>
            </div>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}

function HelpList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
