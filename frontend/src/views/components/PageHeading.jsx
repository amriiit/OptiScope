export default function PageHeading({ number, title, children, actions }) {
  return (
    <header className="page-heading">
      <div>
        <span className="eyebrow">OPTISCOPE / {number}</span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </header>
  );
}
