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
  location?: string;
  notificationId?: string;
  reminderOffsetMinutes?: number;
  timeZone?: string;
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

import { VaultReminderRule } from "../utils/VaultReminderUtils";

export interface VaultDocument {
  id: string;
  name: string;
  type: string;
  icon?: string;
  date: string;
  memberId: string;
  category?: string;
  expiryDate?: string;
  filePath?: string;
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
  reminderRules?: VaultReminderRule[];
}

// Define the FamilyContext value type
export interface FamilyContextValue {
  familyName: string;
  setFamilyName: (name: string) => void;
  members: FamilyMember[];
  activeMember: FamilyMember | null;
  setActiveMember: (member: FamilyMember) => Promise<void>;
  addMember: (member: any) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  updateMember: (id: string, updates: any) => Promise<void>;
  updateMemberColor: (id: string, color: string) => Promise<void>;
  globalVault: VaultDocument[];
  memberVaults: Record<string, VaultDocument[]>;
  addDocument: (doc: any) => Promise<any>;
  updateDocument: (id: string, updates: any) => Promise<any>;
  events: CalendarEvent[];
  addEvent: (event: any) => Promise<any>;
  updateEvent: (id: string, updates: any) => Promise<any>;
  deleteEvent: (id: string) => Promise<any>;
  groceryList: GroceryItem[];
  addGroceryItem: (item: any) => Promise<any>;
  toggleGroceryItem: (id: string) => Promise<any>;
  removeGroceryItem: (id: string) => Promise<any>;
  tasks: Task[];
  addTask: (task: any) => Promise<any>;
  updateTask: (id: string, updates: any) => Promise<any>;
  deleteTask: (id: string) => Promise<any>;
  categories: any[];
  addCategory: () => void;
}

const formatIsoDate = (value: string | Date | undefined): string => {
  const fallback = new Date().toISOString().split('T')[0];
  return safeFormat(value, "yyyy-MM-dd", fallback);
};

const mapEventModelToCalendarEvent = (eventModel: any): CalendarEvent => ({
  id: eventModel.id,
  title: eventModel.title,
  icon: eventModel.icon,
  date: formatIsoDate(eventModel.dateString),
  time: eventModel.time,
  endTime: eventModel.endTime,
  memberId: eventModel.memberId,
  description: eventModel.description,
  notes: eventModel.notes,
  recurrenceRule: eventModel.recurrenceRule,
  recurrenceEndDate: eventModel.recurrenceEndDate,
  endDate: eventModel.endDate,
  isRecurring: eventModel.isRecurring,
  location: eventModel.location,
  notificationId: eventModel.notificationId,
  reminderOffsetMinutes: eventModel.reminderOffsetMinutes,
  timeZone: eventModel.timeZone,
});

const mapTaskModelToTask = (taskModel: any): Task => ({
  id: taskModel.id,
  name: taskModel.name,
  status: taskModel.status,
  priority: taskModel.priority,
  due: taskModel.dueDisplay,
  date: formatIsoDate(taskModel.dateString),
  assignee: taskModel.assigneeId,
  tab: taskModel.tab,
  icon: taskModel.icon,
});

export const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [familyName, setFamilyNameState] = useState("Family Chores");
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [globalVault, setGlobalVault] = useState<any[]>([]);
  const [memberVaults, setMemberVaults] = useState<Record<string, any[]>>({});
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const upsertEvent = (eventModel: any) => {
    const normalized = mapEventModelToCalendarEvent(eventModel);
    setEvents(prev => {
      const filtered = prev.filter(ev => ev.id !== normalized.id);
      return [...filtered, normalized];
    });
  };

  const removeEvent = (id: string) => {
    setEvents(prev => prev.filter(ev => ev.id !== id));
  };

  const upsertTask = (taskModel: any) => {
    const normalized = mapTaskModelToTask(taskModel);
    setTasks(prev => {
      const filtered = prev.filter(tsk => tsk.id !== normalized.id);
      return [...filtered, normalized];
    });
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(tsk => tsk.id !== id));
  };

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

      // Reschedule notifications for the new active profile
      const { NotificationScheduler } = await import('../services/NotificationScheduler');
      await NotificationScheduler.rescheduleNotificationsForActiveProfile();
      console.log('FamilyContext: Notifications rescheduled for active profile');
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
          console.log(`FamilyContext: Received ${rawEvents.length} events from DB`);
          try {
            const mapped = rawEvents
              .filter(e => {
                const isValid = safeParseDate(e.dateString);
                if (!isValid) console.warn(`FamilyContext: Invalid date for event ${e.id}: ${e.dateString}`);
                return isValid;
              })
              .map(mapEventModelToCalendarEvent);
            console.log(`FamilyContext: Updating events state with ${mapped.length} items`);
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
            const mapped = rawTasks.map(mapTaskModelToTask);
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
      const task = await TaskService.addTask(t);
      upsertTask(task);
      return task;
    } catch (error) {
      console.error('Failed to add task:', error);
      throw new Error('Failed to add task. Please try again.');
    }
  };

  const updateTask = async (id: string, updates: any) => {
    try {
      const task = await TaskService.updateTask(id, updates);
      if (task) {
        upsertTask(task);
      }
      return task;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw new Error('Failed to update task. Please try again.');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      return await TaskService.deleteTask(id);
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw new Error('Failed to delete task. Please try again.');
    } finally {
      removeTask(id);
    }
  };

  const addEvent = async (e: any) => {
    try {
      const event = await TaskService.addEvent(e);
      upsertEvent(event);
      return event;
    } catch (error) {
      console.error('Failed to add event:', error);
      throw new Error('Failed to add event. Please try again.');
    }
  };

  const updateEvent = async (id: string, updates: any) => {
    try {
      // Handle virtual occurrences (hourly recurring events generate virtual IDs like: originalId_date_hour)
      // Extract the original event ID if this is a virtual occurrence
      let actualId = id;
      const datePattern = /_\d{4}-\d{2}-\d{2}_/; // Pattern: _YYYY-MM-DD_
      if (datePattern.test(id)) {
        // Extract the original event ID (everything before the first date pattern)
        const match = id.match(/^(.+?)_\d{4}-\d{2}-\d{2}_/);
        if (match && match[1]) {
          actualId = match[1];
        }
      }
      
      const event = await TaskService.updateEvent(actualId, updates);
      if (event) {
        upsertEvent(event);
      }
      return event;
    } catch (error) {
      console.error('Failed to update event:', error);
      throw new Error('Failed to update event. Please try again.');
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      // Handle virtual occurrences (hourly recurring events generate virtual IDs like: originalId_date_hour)
      // Extract the original event ID if this is a virtual occurrence
      let actualId = id;
      const datePattern = /_\d{4}-\d{2}-\d{2}_/; // Pattern: _YYYY-MM-DD_
      if (datePattern.test(id)) {
        // Extract the original event ID (everything before the first date pattern)
        const match = id.match(/^(.+?)_\d{4}-\d{2}-\d{2}_/);
        if (match && match[1]) {
          actualId = match[1];
        }
      }
      
      return await TaskService.deleteEvent(actualId);
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw new Error('Failed to delete event. Please try again.');
    } finally {
      // Remove both the virtual and actual event from local state
      removeEvent(id);
      const datePattern = /_\d{4}-\d{2}-\d{2}_/;
      if (datePattern.test(id)) {
        const match = id.match(/^(.+?)_\d{4}-\d{2}-\d{2}_/);
        if (match && match[1]) {
          removeEvent(match[1]);
        }
      }
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
              const meta = d.meta || {};
              const docObj = {
                id: d.id,
                name: d.name,
                type: d.type,
                icon: d.icon,
                date: d.date,
                memberId: d.memberId,
                filePath: d.filePath,
                uri: d.filePath, // Map for VaultUtils
                fileUri: d.filePath, // Alias
                ...meta,  // Merge meta fields (expiryDate, etc.) to top level
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
            const mapped = items.map(i => {
              const purchasedAtIso = typeof i.purchasedAt === 'number' ? new Date(i.purchasedAt).toISOString() : undefined;
              return {
                id: i.id,
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
                completed: i.isCompleted,
                categoryId: i.categoryId,
                addedBy: i.addedById,
                purchasedAt: purchasedAtIso,
              };
            });
            console.log(`FamilyContext: Grocery list updated with ${mapped.length} items`);
            console.log(`FamilyContext: Completed items: ${mapped.filter(i => i.completed).length}`);
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
        addMember: async (m: any) => {
          await FamilyService.addMember(m.name, m.symbol, m.color, m.isActive ?? false);
          const updated = await FamilyService.getAllMembers();
          const mapped = updated.map(mem => ({
            id: mem.id,
            name: mem.name,
            symbol: mem.symbol,
            color: mem.color,
            isActive: mem.isActive,
            role: mem.role
          }));
          setMembers(mapped);
        },
        removeMember: async (id: string) => {
          await FamilyService.deleteMember(id);
          const updated = await FamilyService.getAllMembers();
          const mapped = updated.map(mem => ({
            id: mem.id,
            name: mem.name,
            symbol: mem.symbol,
            color: mem.color,
            isActive: mem.isActive,
            role: mem.role
          }));
          setMembers(mapped);
        },
        updateMember: async (id: string, u: any) => {
          await FamilyService.updateMember(id, u);
          const updated = await FamilyService.getAllMembers();
          const mapped = updated.map(mem => ({
            id: mem.id,
            name: mem.name,
            symbol: mem.symbol,
            color: mem.color,
            isActive: mem.isActive,
            role: mem.role
          }));
          setMembers(mapped);
        },
        updateMemberColor: async (id: string, c: string) => {
          await FamilyService.updateMember(id, { color: c });
          // No refresh strictly needed if updateMember handles it, but good to be safe if this is called independently
          const updated = await FamilyService.getAllMembers();
          const mapped = updated.map(mem => ({
            id: mem.id,
            name: mem.name,
            symbol: mem.symbol,
            color: mem.color,
            isActive: mem.isActive,
            role: mem.role
          }));
          setMembers(mapped);
        },

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
        removeGroceryItem: TaskService.removeGroceryItem,

        tasks,
        addTask,
        updateTask,
        deleteTask,

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
