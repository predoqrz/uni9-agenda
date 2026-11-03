/** Esqueleto de carregamento: título e algumas linhas. */
export function Esqueleto({ linhas = 6 }: { linhas?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="flex flex-col gap-3">
      <div className="mb-2 h-8 w-40 animate-pulse rounded-xl bg-superficie" />
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-superficie" />
      ))}
    </div>
  );
}
