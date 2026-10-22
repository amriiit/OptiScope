export default function SummaryCards({ cards }) {
  return (
    <div className="summary-grid">
      {cards.map(([label, value], i) => (
        <div className="summary-card" key={label}>
          <span>{label}</span>
          <strong className={i === 3 ? "mint mono" : ""}>{value ?? "—"}</strong>
          <small>
            {i === 3
              ? "Across definitions · structural estimate"
              : i === 4
                ? "Real wall time · includes overhead"
                : i === 2
                  ? "Independent of complexity"
                  : i === 1
                    ? "Parsed loop statements"
                    : "Parsed definitions"}
          </small>
        </div>
      ))}
    </div>
  );
}
