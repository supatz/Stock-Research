import type { ReferenceId } from '@/domain/references';
import { referenceAccessibleName, referenceCopy } from '@/domain/references';
import { useToast } from '@/app/providers';

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  if (!ok) throw new Error('Copy failed');
}

export function ReferenceTag({ referenceId }: { referenceId: ReferenceId }) {
  const { pushToast } = useToast();

  async function onCopy() {
    const text = referenceCopy(referenceId);
    try {
      await copyText(text);
      pushToast(`Copied: ${text}`);
    } catch {
      pushToast('Could not copy reference');
    }
  }

  return (
    <button
      type="button"
      className="reference-tag"
      aria-label={referenceAccessibleName(referenceId)}
      onClick={() => {
        void onCopy();
      }}
    >
      i
    </button>
  );
}
