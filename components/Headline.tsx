const big = "block text-4xl sm:text-5xl md:text-6xl leading-tight text-white";

// Big three-line title: two light lines and one vibrant accent line.
export function Headline({ light, bold }: { light: string[]; bold: string }) {
  return (
    <h1>
      {light.map((line) => (
        <span key={line} className={`${big} font-light text-slate-400`}>
          {line}
        </span>
      ))}
      <span className={`${big} font-black text-[var(--primary-accent)]`}>{bold}</span>
    </h1>
  );
}

export function PageTitle({ light, bold }: { light: string; bold: string }) {
  return (
    <h1 className="text-3xl sm:text-4xl text-white leading-tight tracking-tight">
      <span className="font-light text-slate-400">{light} </span>
      <span className="font-black text-[var(--primary-accent)]">{bold}</span>
    </h1>
  );
}
