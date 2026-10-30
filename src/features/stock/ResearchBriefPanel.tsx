import { useMemo, useState } from 'react';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { buildResearchBrief, type ResearchBrief } from '@/domain/researchBrief';
import type { StockDetail } from '@/domain/types';

/**
 * On-demand research brief.
 * Default path is rule-based (no AI tokens). A future LLM path can plug in
 * behind the same button without regenerating on every site refresh.
 */
export function ResearchBriefPanel({ detail }: { detail: StockDetail }) {
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [busy, setBusy] = useState(false);

  const cacheKey = useMemo(
    () => `${detail.summary.ticker}:${detail.summary.asOf}:${detail.financials.annual.at(-1)?.period ?? ''}`,
    [detail],
  );

  function generate() {
    setBusy(true);
    // Keep generation local and cheap; simulate a short think for UX only.
    window.setTimeout(() => {
      setBrief(buildResearchBrief(detail));
      setBusy(false);
    }, 180);
  }

  return (
    <section id="section.stock.research-brief" className="section-block research-brief" aria-labelledby="section.stock.research-brief-title">
      <SectionHeader
        referenceId="section.stock.research-brief"
        description="On-demand synthesis of technical + financial signals. Not generated during refresh, so it costs nothing until you ask."
      />
      <div className="research-actions">
        <button type="button" className="primary-button" onClick={generate} disabled={busy}>
          {busy ? 'Analyzing…' : brief ? 'Refresh research brief' : 'Generate research brief'}
        </button>
        <p className="muted">
          Uses a local rule engine on the numbers already on this page (no ChatGPT/Gemini tokens).
          LLM upgrade can later reuse this button only for tickers you care about.
        </p>
      </div>

      {!brief ? (
        <div className="research-empty">
          <p>
            Skip auto-AI on every refresh. Click when you want a compact positives / negatives /
            watch-items read for <strong>{detail.summary.ticker}</strong> ({detail.summary.sector}).
          </p>
        </div>
      ) : (
        <article className={`research-card stance-${brief.stance}`} data-cache-key={cacheKey}>
          <header className="research-card-header">
            <StatePill stance={brief.stance} />
            <h3>{brief.headline}</h3>
            <p className="muted">
              Method: {brief.method} · Generated {new Date(brief.generatedAt).toLocaleString()}
            </p>
          </header>
          <div className="research-columns">
            <BriefList title="Positives" tone="up" items={brief.positives} />
            <BriefList title="Negatives" tone="down" items={brief.negatives} />
            <BriefList title="Watch" tone="watch" items={brief.watchItems} />
          </div>
        </article>
      )}
    </section>
  );
}

function StatePill({ stance }: { stance: ResearchBrief['stance'] }) {
  const label = stance === 'constructive' ? 'Constructive' : stance === 'cautious' ? 'Cautious' : 'Mixed';
  return <span className={`state-badge tone-${stance === 'constructive' ? 'positive' : stance === 'cautious' ? 'negative' : 'caution'}`}>{label}</span>;
}

function BriefList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: 'up' | 'down' | 'watch';
  items: ResearchBrief['positives'];
}) {
  return (
    <section className={`brief-list tone-${tone}`}>
      <h4>{title}</h4>
      {items.length === 0 ? <p className="muted">None highlighted.</p> : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <p>{item.text}</p>
              <p className="brief-evidence">{item.evidence}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
