import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { PROFILE_COLORS } from "../constants/profileColors";
import { FamilyService } from "../services/FamilyService";
import { TaskService } from "../services/TaskService";
import { VaultService } from "../services/VaultService";
import { Q } from '@nozbe/watermelondb';
import { safeParseDate, safeFormat, ensureDate } from "../utils/SafeDateUtils";

// Re-export interfaces (keeping compatibility or updating as needed)
export interface FamilyMember {
  id: string;
  name: string;
  symbol: string;
  color: string;
  isActive: boolean;
  role?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  icon?: string;
  date: string;
  time: string;
  endTime?: string;
  memberId?: string;
  description?: string;
  notes?: string;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  endDate?: string;
  isRecurring?: boolean;
}

export interface Task {
  id: string;
  name: string;
  status: string;
  priority: string;
  due: string;
  date?: string;
  assignee?: string;
  tab?: string;
  icon?: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  completed: boolean;
  addedBy?: string;
  categoryId?: string;
  purchasedAt?: string;
}

export interface GroceryCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface VaultDocument {
  id: string;
  name: string;
  type: string;
  icon?: string;
  date: string;
  memberId: string;
  category?: string;
  expiryDate?: string;
  fileUri?: string;
  uri?: string;
  purchaseDate?: string;
  warrantyTillDate?: string;
  billAmount?: string;
  billDate?: string;
  provider?: string;
  policyNumber?: string;
  premiumAmount?: string;
  serviceDate?: string;
  nextServiceDate?: string;
  cost?: string;
}

export const FamilyContext = createContext<any>(undefined);

export const FamilyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [familyName, setFamilyNameState] = useState("Family Chores");
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [globalVault, setGlobalVault] = useState<any[]>([]);
  const [memberVaults, setMemberVaults] = useState<Record<string, any[]>>({});
  const [groceryList, setGroceryList] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // --- Load Family Name ---
  useEffect(() => {
    FamilyService.getFamilyName().then(setFamilyNameState);
  }, []);

  const setFamilyName = (name: string) => {
    try {
      setFamilyNameState(name);
      FamilyService.setFamilyName(name).catch(error => {
        console.error('Failed to save family name:', error);
        // Don't throw - name is updated in memory
      });
    } catch (error) {
      console.error('Error setting family name:', error);
    }
  };

  // --- Observe Members ---
  useEffect(() => {
    try {
      const sub = FamilyService.observeMembers().subscribe({
        next: (rawMembers) => {
          try {
            const mapped = rawMembers.map(m => ({
              id: m.id,
              name: m.name,
              symbol: m.symbol,
              color: m.color,
              isActive: m.isActive,
              role: m.role
            }));
            setMembers(mapped);
          } catch (error) {
            console.error('Error mapping members:', error);
          }
        },
        error: (error) => {
          console.error('Error observing members:', error);
        }
      });
      return () => sub.unsubscribe();
    } catch (error) {
      console.error('Error setting up members subscription:', error);
    }
  }, []);

  // --- Active Member Helper ---
  const activeMember = members.find((m) => m.isActive) || null;

  const setActiveMember = async (member: FamilyMember) => {
    try {
      console.log('FamilyContext: Setting active member to:', member.name, member.id);
      await FamilyService.setActiveMember(member.id);
      console.log('FamilyContext: Active member updated in database');

      // Force immediate re-fetch to update UI
      const updatedMembers = await FamilyService.getAllMembers();
      const mapped = updatedMembers.map(m => ({
        id: m.id,
        name: m.name,
        symbol: m.symbol,
        color: m.color,
        isActive: m.isActive,
        role: m.role
      }));
      setMembers(mapped);
      console.log('FamilyContext: Members state updated, new active:', mapped.find(m => m.isActive)?.name);
    } catch (error) {
      console.error('FamilyContext: Error setting active member:', error);
      throw error;
    }
  };

  // --- Observe Events ---
  useEffect(() => {
    try {
      const sub = TaskService.observeEvents().subscribe({
        next: (rawEvents) => {
          try {
            const mapped = rawEvents
              .filter(e => safeParseDate(e.dateString)) // Filter out invalid dates immediately
              .map(e => ({
                id: e.id,
                title: e.title,
                icon: e.icon,
                date: safeFormat(e.dateString, "yyyy-MM-dd"), // Ensure valid format
                time: e.time,
                endTime: e.endTime,
                memberId: e.memberId,
                description: e.description,
                notes: e.notes,
                recurrenceRule: e.recurrenceRule,
                recurrenceEndDate: e.recurrenceEndDate,
                endDate: e.endDate,
                isRecurring: e.isRecurring,
                notificationId: e.notificationId
              }));
            setEvents(mapped);
          } catch (error) {
            console.error('Error mapping events:', error);
          }
        },
        error: (error) => {
          console.error('Error observing events:', error);
        }
      });
      return () => sub.unsubscribe();
    } catch (error) {
      console.error('Error setting up events subscription:', error);
    }
  }, []);

  // ... (inside observeTasks)
  useEffect(() => {
    try {
      const sub = TaskService.observeTasks().subscribe({
        next: (rawTasks) => {
          try {
            const mapped = rawTasks.map(t => ({
              id: t.id,
              name: t.name,
              status: t.status,
              priority: t.priority,
              due: t.dueDisplay,
              date: safeFormat(t.dateString, "yyyy-MM-dd", new Date().toISOString().split('T')[0]), // Fallback to today if invalid
              assignee: t.assigneeId,
              tab: t.tab,
              icon: t.icon,
              notificationId: t.notificationId
            }));
            setTasks(mapped);
          } catch (error) {
            console.error('Error mapping tasks:', error);
          }
        },
        error: (error) => {
          console.error('Error observing tasks:', error);
        }
      });
      return () => sub.unsubscribe();
    } catch (error) {
      console.error('Error setting up tasks subscription:', error);
    }
  }, []);

  const addTask = async (t: any) => {
    try {
      return await TaskService.addTask(t);
    } catch (error) {
      console.error('Failed to add task:', error);
      throw new Error('Failed to add task. Please try again.');
    }
  };

  const addEvent = async (e: any) => {
    try {
      return await TaskService.addEvent(e);
    } catch (error) {
      console.error('Failed to add event:', error);
      throw new Error('Failed to add event. Please try again.');
    }
  };

  const updateEvent = async (id: string, updates: any) => {
    try {
      return await TaskService.updateEvent(id, updates);
    } catch (error) {
      console.error('Failed to update event:', error);
      throw new Error('Failed to update event. Please try again.');
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      return await TaskService.deleteEvent(id);
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw new Error('Failed to delete event. Please try again.');
    }
  };

  // --- Observe Vault ---
  useEffect(() => {
    try {
      const sub = VaultService.observeAllDocuments().subscribe({
        next: (docs) => {
          try {
            const g: any[] = [];
            const m: Record<string, any[]> = {};

            docs.forEach(d => {
              const docObj = {
                id: d.id,
                name: d.name,
                type: d.type,
                icon: d.icon,
                date: d.date,
                memberId: d.memberId,
                // ... mapping
              };
              if (d.memberId === 'global') {
                g.push(docObj);
              } else {
                if (!m[d.memberId]) m[d.memberId] = [];
                m[d.memberId].push(docObj);
              }
            });
            setGlobalVault(g);
            setMemberVaults(m);
          } catch (error) {
            console.error('Error processing vault documents:', error);
          }
        },
        error: (error) => {
          console.error('Error observing vault:', error);
        }
      });
      return () => sub.unsubscribe();
    } catch (error) {
      console.error('Error setting up vault subscription:', error);
    }
  }, []);

  // --- Observe Grocery List ---
  useEffect(() => {
    try {
      const sub = TaskService.observeShoppingListItems().subscribe({
        next: (items) => {
          try {
            // Map to grocery list format
            const mapped = items.map(i => ({
              id: i.id,
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
              completed: i.isCompleted,
              // ...
            }));
            setGroceryList(mapped);
          } catch (error) {
            console.error('Error mapping grocery items:', error);
          }
        },
        error: (error) => {
          console.error('Error observing grocery list:', error);
        }
      });
      return () => sub.unsubscribe();
    } catch (error) {
      console.error('Error setting up grocery list subscription:', error);
    }
  }, []);


  // ... Expose methods ...

  return (
    <FamilyContext.Provider
      value={{
        familyName,
        setFamilyName,
        members,
        activeMember,
        setActiveMember,
        addMember: (m: any) => FamilyService.addMember(m.name, m.symbol, m.color, m.isActive ?? false),
        removeMember: (id: string) => FamilyService.deleteMember(id),
        updateMember: (id: string, u: any) => FamilyService.updateMember(id, u),
        updateMemberColor: (id: string, c: string) => FamilyService.updateMember(id, { color: c }),

        globalVault,
        memberVaults,
        addDocument: VaultService.addDocument,
        updateDocument: VaultService.updateDocument,
        // shareDocument

        events,
        addEvent,
        updateEvent,
        deleteEvent,

        groceryList,
        addGroceryItem: TaskService.addGroceryItem,
        toggleGroceryItem: TaskService.toggleGroceryItem,

        tasks,
        addTask,
        updateTask: TaskService.updateTask,
        deleteTask: TaskService.deleteTask,

        categories: [], // TODO: ListCategoryService
        addCategory: () => { },
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
