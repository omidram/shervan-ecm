"use client";

export function EnginePick({
  engines,
  value,
  label,
}: {
  engines: { id: string; serialNumber: string; model: string }[];
  value: string;
  label: string;
}) {
  return (
    <form className="engine-pick">
      <label>
        {label}
        <select name="engine" defaultValue={value} aria-label={label} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
          {engines.map((engine) => (
            <option key={engine.id} value={engine.id}>
              {engine.serialNumber} · {engine.model}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
