import { Sidebar } from "./components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
