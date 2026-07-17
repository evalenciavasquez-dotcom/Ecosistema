import StoreHydration from "@/components/StoreHydration";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import AIPanel from "@/components/layout/AIPanel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreHydration>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
        </div>
        <AIPanel />
      </div>
    </StoreHydration>
  );
}
