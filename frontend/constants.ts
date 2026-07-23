import {
    Clock,
    DatabaseZap,
    FileSearch,
    GitBranch,
    LayoutDashboard,
    MapPinned,
} from "lucide-react";

export const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { id: "map", label: "Crime Map", icon: MapPinned, path: "/map" },
    { id: "graph", label: "Case Board", icon: GitBranch, path: "/graph" },
    { id: "trend", label: "Trend Analysis", icon: Clock, path: "/trend" },
    { id: "similarity", label: "Similarity Lab", icon: FileSearch, path: "/similarity" },
    { id: "import", label: "Data Import", icon: DatabaseZap, path: "/import" },
];