const big = "block text-5xl md:text-6xl leading-tight text-white";

// Big three-line title: two light lines and one black line.
export function Headline({ light, bold }: { light: string[]; bold: string }) {
  return (
    <h1>
      {light.map((line) => (
        <span key={line} className={`${big} font-light`}>
          {line}
        </span>
      ))}
      <span className={`${big} font-black`}>{bold}</span>
    </h1>
  );
}

export function PageTitle({ light, bold }: { light: string; bold: string }) {
  return (
    <h1 className="text-4xl text-white leading-tight">
      <span className="font-light">{light} </span>
      <span className="font-black">{bold}</span>
    </h1>
  );
}
