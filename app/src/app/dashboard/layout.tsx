import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { DevMobilePreview } from "@/components/dashboard/DevMobilePreview";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <DevMobilePreview>{children}</DevMobilePreview>
      </div>
    </div>
  );
}
