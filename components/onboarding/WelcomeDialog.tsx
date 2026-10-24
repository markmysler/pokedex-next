"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import CaseArt from "@/components/cases/CaseArt";
import Link from "@/components/LocaleLink";
import type { Dictionary } from "@/lib/i18n/getDictionary";

// Shown once, right after signup -- app/[lang]/signup/page.tsx (via
// SignupForm) redirects into /dashboard?welcome=1 on a successful signUp()
// rather than persisting a "has seen onboarding" flag anywhere, since the
// moment of account creation is already unambiguous client-side (no DB
// round trip needed to know this is a first visit). Dismissing strips the
// query param so a refresh doesn't re-trigger it.
//
// dict comes in as a prop from app/[lang]/(app)/layout.tsx (a Server
// Component, so it can call getDictionary() directly) -- this component
// itself is a Client Component and can't call next/root-params.
export default function WelcomeDialog({ dict }: { dict: Dictionary["account"]["welcome"] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  if (searchParams.get("welcome") !== "1") return null;

  function dismiss() {
    router.replace(pathname, { scroll: false });
  }

  return (
    <Modal onClose={dismiss} large>
      <div className="welcome">
        <CaseArt className="case-art welcome-art" />
        <h2>{dict.heading}</h2>
        <p className="muted">{dict.intro1}</p>
        <p className="muted">
          {dict.intro2Prefix}
          <strong>{dict.intro2Lootbox}</strong>
          {dict.intro2Suffix}
        </p>
        <ul className="welcome-list">
          <li><Icon name="case" /><span><strong>{dict.lootboxOpeningBold}</strong>{dict.lootboxOpeningRest}</span></li>
          <li><Icon name="star" /><span><strong>{dict.shinyBold}</strong>{dict.shinyRest}</span></li>
          <li><Icon name="trophy" /><span><strong>{dict.winningBattlesBold}</strong>{dict.winningBattlesRest}</span></li>
          <li><Icon name="flame" /><span><strong>{dict.tradeUpBold}</strong>{dict.tradeUpRest}</span></li>
        </ul>
        <div className="dialog-actions">
          <button className="btn-ghost" onClick={dismiss}>{dict.dismiss}</button>
          <Link href="/open" className="btn-primary">
            <Icon name="case" size={16} /> {dict.openFirstCase}
          </Link>
        </div>
      </div>
    </Modal>
  );
}
