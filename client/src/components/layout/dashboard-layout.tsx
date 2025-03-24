import { useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar className="w-64" mobileOpen={sidebarOpen} onMobileClose={closeSidebar} />

      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Button
          variant="default"
          size="icon"
          className="bg-primary text-white p-3 rounded-full shadow-lg"
          onClick={toggleSidebar}
        >
          <Menu />
        </Button>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Header />
        
        <div className="p-6">
          {(title || description) && (
            <div className="mb-8">
              {title && <h1 className="text-2xl font-medium text-gray-900 mb-2">{title}</h1>}
              {description && <p className="text-gray-500">{description}</p>}
            </div>
          )}
          
          {children}
        </div>
      </main>

      <Toaster />
    </div>
  );
}
