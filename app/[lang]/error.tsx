"use client";

import { useEffect } from "react";
import { useDictionary } from "@/lib/i18n/useDictionary";
import Icon from "@/components/ui/Icon";

// Catches errors thrown while rendering any page or the (app) layout, so a
// failed server render shows a translated "try again" inside the app instead
// of Next's bare "This page couldn't load" screen. retry() re-fetches and
// re-renders the segment (Next 16's error.js API, see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md).
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useDictionary().common.errorPage;

  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  return (
    <div className="page page-narrow">
      <div className="panel">
        <div className="empty" role="alert">
          <Icon name="alert" size={32} />
          <h1 style={{ fontSize: 22 }}>{t.title}</h1>
          <p>{t.body}</p>
          <button className="btn-primary" onClick={() => retry()}>
            <Icon name="refresh" size={16} /> {t.retry}
          </button>
          {digest && <p className="faint mono small">ref {digest}</p>}
        </div>
      </div>
    </div>
  );
}
