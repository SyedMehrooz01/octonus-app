import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map(({ id, title, description, variant }) => (
        <div key={id} className={`pointer-events-auto rounded-lg border p-4 shadow-lg bg-background ${variant === "destructive" ? "border-destructive bg-destructive/10 text-destructive" : "border-border"}`}>
          {title && <div className="text-sm font-semibold">{title}</div>}
          {description && <div className="text-sm text-muted-foreground mt-1">{description}</div>}
        </div>
      ))}
    </div>
  )
}
