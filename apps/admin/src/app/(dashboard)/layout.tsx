import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="h-screen bg-gray-100 flex overflow-hidden">
        {/* Sidebar ثابت — مش بيتحرك مع السكرول */}
        <div className="h-full overflow-hidden flex-shrink-0">
          <Sidebar />
        </div>
        {/* المحتوى بس هو اللي بيعمل سكرول */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
