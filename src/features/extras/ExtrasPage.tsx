import { PageHeader, SectionHeader } from '@/components/layout/SectionHeader';

/**
 * Extras is a placeholder surface, not a data integration.
 * Ownership and filing work is deferred in Instruction Files/COMING_NEXT.md:
 * Form 4 insider transactions, 13F holdings, and 13D/13G ownership events
 * would later come from SEC EDGAR through EdgarTools, in a pipeline that is
 * separate from the daily technical snapshot.
 * Experimental indicators stay here until they add distinct information beyond
 * Trend, Momentum, Relative Strength, Volatility, and Volume.
 * There is intentionally no composite score and no Strong Buy label.
 */

const CARDS = [
  {
    id: 'section.extras.form4' as const,
    title: 'What it will answer',
    body: 'Who at the company bought or sold, whether it was an open-market trade, and whether several insiders acted close together. Reporting lag will be shown next to every row.',
  },
  {
    id: 'section.extras.13f' as const,
    title: 'What it will answer',
    body: 'Which institutions opened, closed, increased, or reduced positions, plus concentration among the largest holders. Quarter-end filings arrive late, and the page will say so.',
  },
  {
    id: 'section.extras.13dg' as const,
    title: 'What it will answer',
    body: 'New stakes above 5%, amendments, filer type, and any structured note of purpose. This is a filing record, not a prediction of activism.',
  },
];

export default function ExtrasPage() {
  return (
    <div className="stack">
      <PageHeader referenceId="page.extras" kicker="Deferred on purpose">
        <p className="lede">These modules are sketched so the information architecture is stable. They do not fetch SEC filings or experimental indicators yet.</p>
      </PageHeader>

      <section id="section.extras.ownership" className="section-block" aria-labelledby="section.extras.ownership-title">
        <SectionHeader
          referenceId="section.extras.ownership"
          description="Ownership stays outside the technical snapshot so a filing outage cannot block the daily research pages."
        />
        <div className="extras-grid">
          {CARDS.map((card) => (
            <article key={card.id} id={card.id} className="extra-card">
              <SectionHeader referenceId={card.id} level={3} />
              <p className="flag">Coming later</p>
              <h4>{card.title}</h4>
              <p>{card.body}</p>
              <p className="muted">
                {card.id === 'section.extras.form4' && 'Form 4 fields later: person, role, code, trade date, filing date, price, shares, value, and holding change.'}
                {card.id === 'section.extras.13f' && '13F fields later: new, closed, increased, and reduced positions, plus top holders.'}
                {card.id === 'section.extras.13dg' && '13D/13G fields later: beneficial ownership percentage, amendments, and filer type.'}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="section.extras.experimental" className="section-block" aria-labelledby="section.extras.experimental-title">
        <SectionHeader
          referenceId="section.extras.experimental"
          description="Candidates stay parked until a backtest shows they add something the current six dimensions do not already show."
        />
        <ul className="experiment-list">
          {['Supertrend', 'Ichimoku', 'Keltner channels', 'Stochastic', 'Williams %R', 'CCI', 'Aroon', 'Vortex', 'Fibonacci', 'Pivot points'].map((name) => (
            <li key={name}>
              <span>{name}</span>
              <span className="flag">Not in V1</span>
            </li>
          ))}
        </ul>
        <p className="muted">Fundamentals, India listings, options, and alerts are also later work. They are not hidden inside these technical pages.</p>
      </section>
    </div>
  );
}
