import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import React, { Dispatch, SetStateAction } from "react";

const Footer = ({collapsed, setCollapsed}: {collapsed: boolean; setCollapsed: Dispatch<SetStateAction<boolean>>}) => {
  return (
    <div className="border-t border-green-100 px-3 py-3">
      <button
        className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl bg-green-50 text-sm font-medium text-green-700 transition hover:bg-green-100"
        onClick={() => setCollapsed((v) => !v)}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        {!collapsed && "Collapse"}
      </button>
    </div>
  );
};

export default Footer;
