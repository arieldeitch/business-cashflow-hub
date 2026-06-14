import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import { Home, ListChecks, TrendingUp, Plus } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
}

export function AppShell({ children, title, subtitle, header }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-background">
        {(title || header) && (
          <header className="px-5 pt-8 pb-4">
            {header ?? (
              <>
                {subtitle && (
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {subtitle}
                  </p>
                )}
                {title && (
                  <h1 className="mt-1 font-display text-2xl font-semibold text-foreground">
                    {title}
                  </h1>
                )}
              </>
            )}
          </header>
        )}
        <main className="flex-1 px-5 pb-32">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}

const tabs: { to: LinkProps["to"]; label: string; icon: typeof Home }[] = [
  { to: "/", label: "בית", icon: Home },
  { to: "/transactions", label: "פעילות", icon: ListChecks },
  { to: "/forecast", label: "תחזית", icon: TrendingUp },
];

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center pb-5 pointer-events-none">
      <div className="pointer-events-auto relative flex w-[calc(100%-2.5rem)] max-w-[440px] items-center justify-between rounded-full border border-border/60 bg-surface-elevated/95 px-2 py-2 shadow-[0_8px_32px_-12px_oklch(0_0_0/0.6)] backdrop-blur">
        {tabs.slice(0, 1).map((t) => (
          <TabItem key={t.to} {...t} active={pathname === t.to} />
        ))}
        <TabItem {...tabs[1]} active={pathname === tabs[1].to} />
        <Link
          to="/add"
          className="-mt-8 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-6px_oklch(0.82_0.16_162/0.5)] transition active:scale-95"
          aria-label="הוסף"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </Link>
        <TabItem {...tabs[2]} active={pathname === tabs[2].to} />
        <TabItem to="/transactions" label="פעילות" icon={ListChecks} hidden active={false} />
      </div>
    </nav>
  );
}

function TabItem({
  to,
  label,
  icon: Icon,
  active,
  hidden,
}: {
  to: LinkProps["to"];
  label: string;
  icon: typeof Home;
  active: boolean;
  hidden?: boolean;
}) {
  if (hidden) return <span className="invisible w-12" aria-hidden />;
  return (
    <Link
      to={to}
      className={`flex w-16 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium transition ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      <span>{label}</span>
    </Link>
  );
}
