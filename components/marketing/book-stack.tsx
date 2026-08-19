const COVERS = [
  { title: "The Lighthouse Beyond Time", tone: "from-[hsl(255,42%,30%)] to-[hsl(255,42%,20%)]", rotate: "-rotate-6", y: "translate-y-4" },
  { title: "Exploring Our Solar System", tone: "from-[hsl(27,68%,54%)] to-[hsl(21,78%,44%)]", rotate: "rotate-2", y: "-translate-y-2" },
  { title: "The Moon That Forgot to Shine", tone: "from-[hsl(351,58%,60%)] to-[hsl(351,58%,45%)]", rotate: "rotate-8", y: "translate-y-6" },
]

/** A purely decorative, CSS-built stack of book covers — no photography, nothing implying a real product screenshot. */
export function BookStack() {
  return (
    <div className="relative mx-auto flex h-[360px] w-full max-w-md items-center justify-center sm:h-[420px]">
      <div className="absolute h-64 w-64 animate-glow-breathe rounded-full bg-gold-gradient blur-3xl" />
      {COVERS.map((cover, i) => (
        <div
          key={cover.title}
          className={`absolute flex aspect-[2/3] w-40 flex-col justify-between rounded-xl border border-white/10 bg-gradient-to-br p-4 text-primary-foreground shadow-lift transition-transform duration-300 ease-out hover:scale-105 hover:!rotate-0 sm:w-48 ${cover.tone} ${cover.rotate} ${cover.y}`}
          style={{ zIndex: i, animationDelay: `${i * 0.6}s` }}
        >
          <div className="animate-float" style={{ animationDelay: `${i * 0.7}s` }}>
            <div className="h-1.5 w-8 rounded-full bg-white/40" />
            <p className="mt-3 font-display text-sm italic leading-snug text-balance">{cover.title}</p>
          </div>
          <div className="h-1 w-full rounded-full bg-white/20" />
        </div>
      ))}
    </div>
  )
}
