const footerLinks = [
  ["Analysis workspace", "/lab"],
  ["Complete pipeline", "/pipeline"],
  ["Technology stack", "/tools"],
  ["Methods", "/methods"],
  ["Sources", "/sources"],
  ["Limitations", "/limitations"],
  ["About Zim", "/about"],
  ["Code portfolio", "https://github.com/Fatgezimb?tab=repositories"],
  ["Educational project", "https://fatgezimb.github.io/rbt-practice-hub/"],
  ["GitHub", "https://github.com/Fatgezimb"],
  ["LinkedIn", "https://www.linkedin.com/in/fatgezimzimbela/"],
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <p className="eyebrow">Built by Fatgezim “Zim” Bela</p>
          <h2>A technical exploration of open neuroscience data.</h2>
          <p className="fine-print">
            Educational and technical demonstration only. It does not provide medical diagnosis,
            clinical recommendations, or validated patient-level predictions.
          </p>
          <a
            className="button-secondary"
            href="https://github.com/Fatgezimb?tab=repositories"
            rel="noopener noreferrer"
            target="_blank"
          >
            Explore Fatgezim Bela’s public code portfolio
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </div>
        <nav aria-label="Footer" className="footer-links">
          {footerLinks.map(([label, href]) => {
            const external = href.startsWith("http");
            return (
              <a
                href={href}
                key={href}
                rel={external ? "noopener noreferrer" : undefined}
                target={external ? "_blank" : undefined}
              >
                {label}
                {external ? <span className="visually-hidden"> (opens in a new tab)</span> : null}
              </a>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}
