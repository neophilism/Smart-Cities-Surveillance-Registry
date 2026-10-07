import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/">
          <span className="brand__mark" aria-hidden="true">
            SC
          </span>
          <span>
            Smart Cities
            <small>Surveillance Registry</small>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/">Registry</Link>
        </nav>
      </div>
    </header>
  );
}
