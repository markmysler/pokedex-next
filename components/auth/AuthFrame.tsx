import type { ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import Sprite from "@/components/Sprite";
import Icon, { type IconName } from "@/components/ui/Icon";

const POINT_ICONS: IconName[] = ["case", "swords", "evolve"];

// Shared login/signup frame (redesign wave v9): what the game is on one
// side, the form on the other. Stacks with the art on top on phones.
export default function AuthFrame({ art, children }: { art: Dictionary["account"]["authArt"]; children: ReactNode }) {
  return (
    <div className="auth-page">
      <section className="auth-art">
        <span className="brand" style={{ width: "auto" }}>
          <span className="brand-ball" aria-hidden="true" />
          POKÉDEX
        </span>
        <div className="stack" style={{ gap: 16 }}>
          <div className="auth-sprites" aria-hidden="true">
            <Sprite name="Bulbasaur" form="normal" className="" />
            <Sprite name="Charmander" form="normal" className="" />
            <Sprite name="Squirtle" form="normal" className="" />
          </div>
          <h2>{art.title}</h2>
          <p>{art.body}</p>
        </div>
        <ul className="auth-points">
          {art.points.map((point, i) => (
            <li key={point}>
              <Icon name={POINT_ICONS[i] ?? "star"} /> {point}
            </li>
          ))}
        </ul>
      </section>
      <div className="auth-form-wrap">{children}</div>
    </div>
  );
}
