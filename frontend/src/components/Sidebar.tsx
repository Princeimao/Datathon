import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import React, { Dispatch, SetStateAction } from "react";
import { cn } from "../lib/utils";
import { tabs } from "../../constants";
import { useLocation, useNavigate } from "react-router-dom";

interface SidebarProps {
  activeTab: string;
}

const Sidebar = ({ activeTab }: SidebarProps) => {
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  return (
    <nav className="flex-1 px-3 py-4">
      <div className="grid gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.path;
          return (
            <button
              key={tab.id}
              className={cn(
                "flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all",
                "text-green-800 hover:bg-green-50",
                isActive && "bg-green-200 text-green-900",
              )}
              onClick={() => {
                navigate(tab.path);
              }}
              title={tab.label}
            >
              <Icon size={18} />
              {<span>{tab.label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Sidebar;
