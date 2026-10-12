import { presentationForState } from '@/domain/metrics/labels';

const ICONS = {
  up: '▲',
  down: '▼',
  mixed: '◆',
  caution: '◇',
  neutral: '●',
} as const;

export function StateBadge({ state }: { state: string }) {
  const presentation = presentationForState(state);
  return (
    <span className={`state-badge tone-${presentation.tone}`} data-tone={presentation.tone}>
      <span aria-hidden="true" className="state-icon">{ICONS[presentation.icon]}</span>
      {presentation.label}
    </span>
  );
}
