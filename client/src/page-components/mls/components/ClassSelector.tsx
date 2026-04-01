export default function ClassSelector({ classes, excluded, onToggle }) {
  return (
    <div className="class-selector">
      <div className="class-selector__header">
        <span>Классы</span>
        <span>
          {classes.length - excluded.size}/{classes.length}
        </span>
      </div>
      {classes.map((cls) => (
        <div key={cls.name} className="class-selector__item">
          <input
            type="checkbox"
            checked={!excluded.has(cls.id)}
            onChange={() => onToggle(cls.id)}
            style={{ accentColor: `hsl(${cls.hue}, 70%, 50%)` }}
          />
          <div
            className="class-selector__color"
            style={{ background: `hsl(${cls.hue}, 70%, 50%)` }}
          />
          <span>{cls.name}</span>
        </div>
      ))}
    </div>
  );
}
