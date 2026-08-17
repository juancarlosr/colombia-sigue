// Discreet orientation for the employee journey — not gamification.
const STEPS = ["Monto", "Autorización", "Activo"];

export function JourneySteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-semibold">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const reached = step <= current;
        return (
          <li key={label} className="flex items-center gap-2">
            {index > 0 && <span className="text-muted-foreground/50">→</span>}
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[0.65rem] font-extrabold ${
                reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {step}
            </span>
            <span className={reached ? "text-foreground" : "text-muted-foreground"}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
