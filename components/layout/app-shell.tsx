import Sidebar from "./sidebar";
import Topbar from "./topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}