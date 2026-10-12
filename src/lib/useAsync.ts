import { useEffect, useState } from 'react';

export interface AsyncState<T> {
  status: 'loading' | 'ready' | 'error';
  data?: T;
  message?: string;
  code?: string;
}

export function useAsync<T>(factory: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    factory()
      .then((data) => {
        if (active) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Something went wrong.';
        const code = error instanceof Error && 'code' in error ? String(error.code) : undefined;
        setState({ status: 'error', message, code });
      });
    return () => {
      active = false;
    };
    // The caller passes an explicit dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
