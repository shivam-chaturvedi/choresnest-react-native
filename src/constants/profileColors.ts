export interface ProfileColor {
    id: string;
    name: string;
    value: string; // The CSS class or ID used in logic (e.g., 'member-blue')
    hex: string;   // The visual color
}

export const PROFILE_COLORS: ProfileColor[] = [
    { id: "blue", name: "Blue", value: "member-blue", hex: "#3b82f6" },
    { id: "green", name: "Green", value: "member-green", hex: "#22c55e" },
    { id: "orange", name: "Orange", value: "member-orange", hex: "#f97316" },
    { id: "pink", name: "Pink", value: "member-pink", hex: "#ec4899" },
    { id: "purple", name: "Purple", value: "member-purple", hex: "#8b5cf6" },
    { id: "red", name: "Red", value: "member-red", hex: "#ef4444" },
    { id: "cyan", name: "Cyan", value: "member-cyan", hex: "#06b6d4" },
    { id: "yellow", name: "Yellow", value: "member-yellow", hex: "#eab308" },
    { id: "teal", name: "Teal", value: "member-teal", hex: "#14b8a6" },
    { id: "lime", name: "Lime", value: "member-lime", hex: "#84cc16" },
    { id: "brown", name: "Brown", value: "member-brown", hex: "#795548" },
    { id: "slate", name: "Slate", value: "member-slate", hex: "#64748B" },
    { id: "navy", name: "Navy", value: "member-navy", hex: "#1e3a8a" },
];
