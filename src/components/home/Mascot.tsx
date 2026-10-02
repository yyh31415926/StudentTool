/** Decorative placeholder, intentionally static and non-interactive. */
export function Mascot() {
  return <svg aria-hidden="true" viewBox="0 0 280 240" className="mascot">
    <ellipse cx="140" cy="219" rx="72" ry="10" fill="currentColor" opacity=".08" />
    <path d="M92 153 Q65 145 58 169 M188 153 Q215 145 222 169" fill="none" stroke="var(--st-color-border)" strokeWidth="17" strokeLinecap="round" />
    <rect x="91" y="137" width="98" height="70" rx="29" fill="var(--st-color-surface)" stroke="var(--st-color-border)" strokeWidth="3" />
    <path d="M111 201v11m58-11v11" stroke="var(--st-color-primary)" strokeWidth="18" strokeLinecap="round" />
    <path d="M89 77 78 38q0-11 11-6l31 29m71 16 11-39q0-11-11-6l-31 29" fill="var(--st-color-primary-soft)" stroke="var(--st-color-primary)" strokeWidth="3" />
    <rect x="62" y="61" width="156" height="104" rx="42" fill="var(--st-color-surface)" stroke="var(--st-color-border)" strokeWidth="3" />
    <rect x="80" y="82" width="120" height="60" rx="25" fill="var(--st-color-primary-soft)" />
    <path d="M105 104v12m70-12v12" stroke="var(--st-color-primary)" strokeWidth="8" strokeLinecap="round" />
    <path d="M132 121q8 7 16 0" fill="none" stroke="var(--st-color-primary)" strokeWidth="3" strokeLinecap="round" />
    <circle cx="140" cy="180" r="8" fill="var(--st-color-primary)" />
    <path d="M34 101h12m-6-6v12m192 53h12m-6-6v12" stroke="var(--st-color-primary)" opacity=".4" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}

