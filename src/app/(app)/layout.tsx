import StoreHydration from "@/components/StoreHydration";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import AIPanel from "@/components/layout/AIPanel";
import MobileNav from "@/components/layout/MobileNav";
import CaptureBar from "@/components/layout/CaptureBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreHydration>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">{children}</main>
          <div className="mb-[calc(3.5rem+env(safe-area-inset-bottom))] md:mb-0">
            <CaptureBar />
          </div>
        </div>
        <AIPanel />
        <MobileNav />
      </div>
    </StoreHydration>
  );
}
