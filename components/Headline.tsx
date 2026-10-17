const big = "block text-4xl sm:text-5xl md:text-6xl leading-tight text-[#18182E]";

// Big three-line title: two light lines and one black line.
export function Headline({ light, bold }: { light: string[]; bold: string }) {
  return (
    <h1>
      {light.map((line) => (
        <span key={line} className={`${big} font-light text-[#64748B]`}>
          {line}
        </span>
      ))}
      <span className={`${big} font-black text-[#5E48E8]`}>{bold}</span>
    </h1>
  );
}

export function PageTitle({ light, bold }: { light: string; bold: string }) {
  return (
    <h1 className="text-3xl sm:text-4xl text-[#18182E] leading-tight tracking-tight">
      <span className="font-light text-[#64748B]">{light} </span>
      <span className="font-black text-[#5E48E8]">{bold}</span>
    </h1>
  );
}
