import { Logo } from "@/components/brand/logo"

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 bg-aurora opacity-60" />
        <div className="relative z-10">
          <Logo className="text-primary-foreground" />
        </div>
        <div className="relative z-10 max-w-md space-y-4">
          <p className="font-display text-2xl italic leading-snug text-balance">
            &ldquo;I described the book in my head for years. EbooksHub turned it into something I could actually
            hold.&rdquo;
          </p>
          <p className="text-sm text-primary-foreground/70">An EbooksHub author</p>
        </div>
        <div className="relative z-10 text-xs text-primary-foreground/60">
          Plan, write, illustrate, and export a complete book — from 5 to 300 pages.
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-2xl font-medium tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
