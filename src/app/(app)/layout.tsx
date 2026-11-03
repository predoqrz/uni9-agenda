import { MenuPrincipal } from "@/components/menu";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-branco">
      <MenuPrincipal />
      <main className="mx-auto w-full max-w-xl px-4 pt-5 pb-28">{children}</main>
    </div>
  );
}
