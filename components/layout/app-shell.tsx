import Sidebar from "./sidebar";
import Topbar from "./topbar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Navigation */}
          <Topbar />

          {/* Page Content */}
          <main className="flex-1 px-3 py-4 md:px-6 md:py-6">
            <div className="mx-auto w-full max-w-[1400px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}