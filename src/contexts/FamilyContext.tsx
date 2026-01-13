import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { PROFILE_COLORS } from "../constants/profileColors";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FamilyMember {
  id: string;
  name: string;
  symbol: string;
  color: string;
  isActive: boolean;
}

export interface VaultDocument {
  id: string;
  name: string;
  type: "bill" | "invoice" | "warranty" | "certificate" | "other";
  icon: string;
  date: string;
  expiryDate?: string;
  memberId: string;
  sharedWith: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  icon: string;
  date: string;
  time: string;
  endTime?: string;
  memberId: string;
  location?: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  addedBy: string;
  completed: boolean;
}

interface FamilyContextType {
  familyName: string;
  setFamilyName: (name: string) => void;
  members: FamilyMember[];
  activeMember: FamilyMember | null;
  setActiveMember: (member: FamilyMember) => void;
  addMember: (member: Omit<FamilyMember, "id" | "isActive">) => void;
  removeMember: (id: string) => void;
  updateMemberColor: (memberId: string, colorValue: string) => void; // New function
  globalVault: VaultDocument[];
  memberVaults: Record<string, VaultDocument[]>;
  addDocument: (doc: Omit<VaultDocument, "id">) => void;
  shareDocument: (docId: string, memberId: string, targetMemberIds: string[]) => void;
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, "id">) => void;
  groceryList: GroceryItem[];
  addGroceryItem: (item: Omit<GroceryItem, "id">) => void;
  toggleGroceryItem: (id: string) => void;
}

const defaultMembers: FamilyMember[] = [
  { id: "1", name: "Me", symbol: "👤", color: "member-blue", isActive: true },
  { id: "2", name: "Partner", symbol: "💑", color: "member-green", isActive: false },
  { id: "3", name: "Kids", symbol: "👶", color: "member-orange", isActive: false },
];

const defaultGlobalVault: VaultDocument[] = [
  {
    id: "g1",
    name: "Home Insurance",
    type: "certificate",
    icon: "🏠",
    date: "2025-01-15",
    expiryDate: "2026-01-15",
    memberId: "global",
    sharedWith: [],
  },
  {
    id: "g2",
    name: "Property Documents",
    type: "certificate",
    icon: "📜",
    date: "2024-06-20",
    memberId: "global",
    sharedWith: [],
  },
];

const defaultMemberVaults: Record<string, VaultDocument[]> = {
  "1": [
    {
      id: "m1",
      name: "Laptop Warranty",
      type: "warranty",
      icon: "💻",
      date: "2024-03-15",
      expiryDate: "2027-03-15",
      memberId: "1",
      sharedWith: [],
    },
    {
      id: "m2",
      name: "Phone Bill",
      type: "bill",
      icon: "📱",
      date: "2025-12-01",
      memberId: "1",
      sharedWith: [],
    },
  ],
  "2": [
    {
      id: "m3",
      name: "Medical Certificate",
      type: "certificate",
      icon: "🏥",
      date: "2025-11-20",
      memberId: "2",
      sharedWith: [],
    },
  ],
  "3": [
    {
      id: "m4",
      name: "School Fee Receipt",
      type: "invoice",
      icon: "🎓",
      date: "2025-12-15",
      memberId: "3",
      sharedWith: [],
    },
  ],
};

const defaultEvents: CalendarEvent[] = [
  {
    id: "e1",
    title: "Team Meeting",
    icon: "💼",
    date: "2026-01-02",
    time: "10:00 AM",
    memberId: "1",
    location: "Office",
  },
  {
    id: "e2",
    title: "School Event",
    icon: "🏫",
    date: "2026-01-03",
    time: "2:00 PM",
    memberId: "3",
    location: "School",
  },
  {
    id: "e3",
    title: "Grocery Shopping",
    icon: "🛒",
    date: "2026-01-04",
    time: "6:00 PM",
    memberId: "2",
  },
];

const defaultGroceryList: GroceryItem[] = [
  { id: "gr1", name: "Milk", quantity: 2, unit: "L", addedBy: "2", completed: false },
  { id: "gr2", name: "Bread", quantity: 1, unit: "loaf", addedBy: "1", completed: true },
  { id: "gr3", name: "Eggs", quantity: 12, unit: "pcs", addedBy: "2", completed: false },
  { id: "gr4", name: "Rice", quantity: 5, unit: "kg", addedBy: "1", completed: false },
];

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [familyName, setFamilyName] = useState("Family Chores");
  const [members, setMembers] = useState<FamilyMember[]>(defaultMembers);
  const [globalVault, setGlobalVault] = useState<VaultDocument[]>(defaultGlobalVault);
  const [memberVaults, setMemberVaults] = useState<Record<string, VaultDocument[]>>(defaultMemberVaults);
  const [events, setEvents] = useState<CalendarEvent[]>(defaultEvents);
  const [groceryList, setGroceryList] = useState<GroceryItem[]>(defaultGroceryList);

  const activeMember = members.find((m) => m.isActive) || null;

  useEffect(() => {
    const loadActiveMember = async () => {
      try {
        const savedId = await AsyncStorage.getItem("ACTIVE_MEMBER_ID");
        if (savedId) {
          setMembers((prev) => prev.map((m) => ({ ...m, isActive: m.id === savedId })));
        }
      } catch (e) {
        console.error("Failed to load active member", e);
      }
    };
    loadActiveMember();
  }, []);

  const setActiveMember = (member: FamilyMember) => {
    setMembers((prev) => prev.map((m) => ({ ...m, isActive: m.id === member.id })));
    AsyncStorage.setItem("ACTIVE_MEMBER_ID", member.id).catch(console.error);
  };

  const updateMemberColor = (memberId: string, colorValue: string) => {
    setMembers((prev) => prev.map((m) =>
      m.id === memberId ? { ...m, color: colorValue } : m
    ));
  };

  const addMember = (member: Omit<FamilyMember, "id" | "isActive">) => {
    // Attempt to auto-assign a color
    const usedColors = new Set(members.map(m => m.color));
    const availableColor = PROFILE_COLORS.find(c => !usedColors.has(c.value))?.value || PROFILE_COLORS[0].value;

    const newMember: FamilyMember = {
      ...member,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      color: member.color || availableColor,
      isActive: false,
    };
    setMembers((prev) => [...prev, newMember]);
    setMemberVaults((prev) => ({ ...prev, [newMember.id]: [] }));
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setMemberVaults((prev) => {
      const { [id]: removed, ...rest } = prev;
      return rest;
    });
  };

  const addDocument = (doc: Omit<VaultDocument, "id">) => {
    const newDoc: VaultDocument = { ...doc, id: Date.now().toString() + Math.random().toString(36).substr(2, 9) };
    if (doc.memberId === "global") {
      setGlobalVault((prev) => [...prev, newDoc]);
    } else {
      setMemberVaults((prev) => ({
        ...prev,
        [doc.memberId]: [...(prev[doc.memberId] || []), newDoc],
      }));
    }
  };

  const shareDocument = (docId: string, memberId: string, targetMemberIds: string[]) => {
    if (memberId === "global") {
      setGlobalVault((prev) =>
        prev.map((doc) => (doc.id === docId ? { ...doc, sharedWith: targetMemberIds } : doc))
      );
    } else {
      setMemberVaults((prev) => ({
        ...prev,
        [memberId]: (prev[memberId] || []).map((doc) =>
          doc.id === docId ? { ...doc, sharedWith: targetMemberIds } : doc
        ),
      }));
    }
  };

  const addEvent = (event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = { ...event, id: Date.now().toString() + Math.random().toString(36).substr(2, 9) };
    setEvents((prev) => [...prev, newEvent]);
  };

  const addGroceryItem = (item: Omit<GroceryItem, "id">) => {
    const newItem: GroceryItem = { ...item, id: Date.now().toString() + Math.random().toString(36).substr(2, 9) };
    setGroceryList((prev) => [...prev, newItem]);
  };

  const toggleGroceryItem = (id: string) => {
    setGroceryList((prev) => prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
  };

  return (
    <FamilyContext.Provider
      value={{
        familyName,
        setFamilyName,
        members,
        activeMember,
        setActiveMember,
        addMember,
        removeMember,
        updateMemberColor,
        globalVault,
        memberVaults,
        addDocument,
        shareDocument,
        events,
        addEvent,
        groceryList,
        addGroceryItem,
        toggleGroceryItem,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("useFamily must be used within a FamilyProvider");
  }
  return context;
};
