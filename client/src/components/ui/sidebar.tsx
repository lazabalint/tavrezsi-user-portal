import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./button";
import { Home, Building2, Gauge, History, Users, Wrench, BarChart2, LogOut, User, Settings, UserPlus, HomeIcon, Plus, ShieldCheck } from "lucide-react";

interface SidebarProps {
  className?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ className, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isOwner = user.role === 'owner' || isAdmin;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => (
    <li>
      <Link href={href}>
        <a
          className={cn(
            "flex items-center p-3 rounded-lg mb-1 transition-colors",
            location === href 
              ? "bg-primary text-white" 
              : "text-gray-700 hover:bg-gray-100"
          )}
          onClick={mobileOpen ? onMobileClose : undefined}
        >
          <Icon className="mr-3 h-5 w-5" />
          <span>{label}</span>
        </a>
      </Link>
    </li>
  );

  // House with circle inside logo
  const Logo = () => (
    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-white">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <circle cx="12" cy="12" r="4"></circle>
      </svg>
    </div>
  );

  return (
    <>
      {/* Overlay for mobile */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onMobileClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white shadow-lg flex-shrink-0 flex flex-col h-full border-r border-gray-200 z-50",
          "fixed inset-y-0 left-0 md:relative md:translate-x-0 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
          <Logo />
          <h1 className="text-lg font-medium text-primary">TávRezsi.hu</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          <ul>
            <NavLink href="/" icon={Home} label="Irányítópult" />
            <NavLink href="/properties" icon={Building2} label="Ingatlanok" />
            <NavLink href="/meters" icon={Gauge} label="Mérőórák" />
            <NavLink href="/readings" icon={History} label="Leolvasások" />
            {isOwner && <NavLink href="/tenants" icon={Users} label="Bérlők" />}
            <NavLink href="/correction-requests" icon={Wrench} label="Javítási kérelmek" />
            <NavLink href="/reports" icon={BarChart2} label="Riportok" />
            
            {/* Admin menu */}
            {isAdmin && (
              <>
                <li className="mt-4 mb-2">
                  <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Admin menü
                  </h3>
                </li>
                <NavLink href="/users" icon={User} label="Felhasználók kezelése" />
                <NavLink href="/add-user" icon={UserPlus} label="Új felhasználó" />
                <NavLink href="/add-property" icon={Plus} label="Új ingatlan" />
                <NavLink href="/add-meter" icon={Plus} label="Új mérőóra" />
                <NavLink href="/permissions" icon={ShieldCheck} label="Jogosultságkezelés" />
              </>
            )}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className="font-medium text-sm">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto text-gray-500 hover:text-gray-700"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
