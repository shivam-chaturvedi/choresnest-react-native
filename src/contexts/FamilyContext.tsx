import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { FamilyService } from "../services/FamilyService";
import { TaskService } from "../services/TaskService";
import { ListService } from "../services/ListService";
import type { ListItemRecord } from "../services/ListService";
import { VaultService } from "../services/VaultService";
import { supabase } from "../config/supabase";
import { ProfileService } from "../services/ProfileService";
import { useAuth } from "./AuthContext";

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
  category?: string;
  purchasedAt?: number;
  updatedAt?: number;
}

import { VaultReminderRule } from "../utils/VaultReminderUtils";
import { DocumentUploadScheduler } from "../services/sync/DocumentUploadScheduler";

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
  uri?: string;
  localUri?: string;
  uploadStatus?: string;
  remotePath?: string;
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
  fileSize?: number;
  reminderRules?: VaultReminderRule[];
}

// Define the FamilyContext value type
export interface FamilyContextValue {
  familyName: string;
  setFamilyName: (name: string) => Promise<void>;
  members: FamilyMember[];
  activeMember: FamilyMember | null;
  setActiveMember: (member: FamilyMember) => Promise<void>;
  addMember: (member: any) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  deleteMemberCascade: (id: string) => Promise<void>;
  updateMember: (id: string, updates: any) => Promise<void>;
  updateMemberColor: (id: string, color: string) => Promise<void>;
  globalVault: VaultDocument[];
  memberVaults: Record<string, VaultDocument[]>;
  addDocument: (doc: any) => Promise<any>;
  updateDocument: (id: string, updates: any) => Promise<any>;
  events: CalendarEvent[];
  addEvent: (event: any) => Promise<void>;
  updateEvent: (id: string, updates: any) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  groceryList: GroceryItem[];
  addGroceryItem: (item: any) => Promise<any>;
  toggleGroceryItem: (id: string) => Promise<any>;
  removeGroceryItem: (id: string) => Promise<any>;
  tasks: Task[];
  addTask: (task: any) => Promise<void>;
  updateTask: (id: string, updates: any) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  profileId: string | null;
}

const mapEventModelToCalendarEvent = (eventModel: any, membersById: Map<string, FamilyMember>): CalendarEvent => ({
  id: eventModel.id,
  title: eventModel.title,
  icon: eventModel.icon,
  date: eventModel.dateString || "",
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

const mapTaskModelToTask = (taskModel: any, membersById: Map<string, FamilyMember>): Task => ({
  id: taskModel.id,
  name: taskModel.name,
  status: taskModel.status,
  priority: taskModel.priority,
  due: taskModel.dueDisplay,
  date: taskModel.dateString || "",
  assignee: taskModel.assigneeId && membersById.has(taskModel.assigneeId) ? taskModel.assigneeId : undefined,
  tab: taskModel.tab,
  icon: taskModel.icon,
});

const normalizeVirtualId = (id: string): string => {
  if (!id) return id;
  const match = id.match(/^(.+?)_\d{4}-\d{2}-\d{2}_/);
  return match && match[1] ? match[1] : id;
};

export const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

const FamilyProviderInner: React.FC<{ profileId: string | null; isGuest: boolean; children: ReactNode }> = ({ profileId, isGuest, children }) => {
  const [familyName, setFamilyNameState] = useState("Family Chores");
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [rawTasks, setRawTasks] = useState<any[]>([]);
  const [globalVault, setGlobalVault] = useState<any[]>([]);
  const [memberVaults, setMemberVaults] = useState<Record<string, any[]>>({});
  const [rawGroceryItems, setRawGroceryItems] = useState<ListItemRecord[]>([]);

  const membersById = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    members.forEach(member => {
      map.set(member.id, member);
    });
    return map;
  }, [members]);

  const events = useMemo(() => {
    const missingMembers: any[] = [];

    const normalized = rawEvents.map(eventModel => {
      if (eventModel.memberId && !membersById.has(eventModel.memberId)) {
        missingMembers.push(eventModel);
      }
      return eventModel;
    });

    if (missingMembers.length > 0) {
      console.warn(`FamilyContext: ${missingMembers.length} events reference missing members`.trim());
    }

    return normalized.map(eventModel => mapEventModelToCalendarEvent(eventModel, membersById));
  }, [rawEvents, membersById]);

  const tasks = useMemo(() => {
    const missingAssignees: any[] = [];

    const normalized = rawTasks.map(taskModel => {
      if (taskModel.assigneeId && !membersById.has(taskModel.assigneeId)) {
        missingAssignees.push(taskModel);
      }
      return taskModel;
    });

    if (missingAssignees.length > 0) {
      console.warn(`FamilyContext: ${missingAssignees.length} tasks reference missing assignees`.trim());
    }

    return normalized.map(taskModel => mapTaskModelToTask(taskModel, membersById));
  }, [rawTasks, membersById]);

  const groceryList = useMemo(() => {
    return rawGroceryItems.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      completed: item.isCompleted,
      category: item.category,
      addedBy: item.addedById,
      purchasedAt: item.purchasedAt,
      updatedAt: item.updatedAt,
    }));
  }, [rawGroceryItems]);

  // --- Family Name Subscription ---
  useEffect(() => {
    if (!profileId) {
      setFamilyNameState("Family Chores");
      return;
    }
    try {
      const sub = FamilyService.observeFamilyName(profileId).subscribe({
        next: setFamilyNameState,
        error: (error) => {
          console.error("FamilyContext: Failed to observe family name", error);
        }
      });
      return () => sub.unsubscribe();
    } catch (error) {
      console.error("FamilyContext: Error setting up family name subscription", error);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId || isGuest) {
      DocumentUploadScheduler.stop();
      return;
    }
    DocumentUploadScheduler.startForUser(profileId);
    return () => {
      DocumentUploadScheduler.stop();
    };
  }, [profileId, isGuest]);

  const setFamilyName = async (name: string): Promise<void> => {
    const effectiveProfileId = profileId || await ProfileService.getActiveProfileId();
    if (!effectiveProfileId) {
      console.warn('FamilyContext: Profile ID unavailable while setting family name — write skipped');
      return;
    }
    await FamilyService.setFamilyName(effectiveProfileId, name);
  };

  // --- Observe Members ---
  useEffect(() => {
    if (!profileId) {
      setMembers([]);
      return;
    }
    try {
      const sub = FamilyService.observeMembers(profileId).subscribe({
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
  }, [profileId]);

  // --- Active Member Helper ---
  const activeMember = useMemo(() => {
    const explicit = members.find((m) => m.isActive);
    return explicit || (members.length > 0 ? members[0] : null);
  }, [members]);

  const setActiveMember = useCallback(async (member: FamilyMember) => {
    try {
      if (!profileId) {
        console.warn('FamilyContext: Profile ID unavailable for active member update');
        return;
      }
      await FamilyService.setActiveMember(profileId, member.id);

      // Reschedule notifications for the new active profile
      const { NotificationScheduler } = await import('../services/NotificationScheduler');
      await NotificationScheduler.rescheduleNotificationsForActiveProfile();
    } catch (error) {
      console.error('FamilyContext: Error setting active member:', error);
      throw error;
    }
  }, [profileId]);

  useEffect(() => {
    if (members.length === 0) {
      return;
    }
    const hasActive = members.some(member => member.isActive);
    if (!hasActive) {
      void setActiveMember(members[0]);
    }
  }, [members, setActiveMember]);

  const ensureProfileId = () => {
    if (!profileId) {
      console.warn('FamilyContext: Profile ID unavailable for member mutation');
      return null;
    }
    return profileId;
  };

  // --- Observe Events ---
  useEffect(() => {
    if (!profileId) {
      setRawEvents([]);
      return;
    }
    // Clear immediately so no stale data shows while waiting for new subscription
    setRawEvents([]);
    try {
      const sub = TaskService.observeEvents(profileId).subscribe({
        next: (rawEvents) => {
          console.log(`FamilyContext: Received ${rawEvents.length} events from DB for profile ${profileId}`);
          setRawEvents(rawEvents);
        },
        error: (error) => {
          console.error('Error observing events:', error);
        }
      });
      return () => sub.unsubscribe();
    } catch (error) {
      console.error('Error setting up events subscription:', error);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setRawTasks([]);
      return;
    }
    // Clear immediately so no stale data shows while waiting for new subscription
    setRawTasks([]);
    try {
      const sub = TaskService.observeTasks(profileId).subscribe({
        next: (rawTasks) => {
          console.log(`FamilyContext: Received ${rawTasks.length} tasks from DB for profile ${profileId}`);
          setRawTasks(rawTasks);
        },
        error: (error) => {
          console.error('Error observing tasks:', error);
        }
      });
      return () => sub.unsubscribe();
    } catch (error) {
      console.error('Error setting up tasks subscription:', error);
    }
  }, [profileId]);

  const addTask = async (t: any) => {
    try {
      const pid = ensureProfileId();
      if (!pid) return;
      return await TaskService.addTask({ ...t, profileId: pid });
    } catch (error) {
      console.error('Failed to add task:', error);
      throw new Error('Failed to add task. Please try again.');
    }
  };

  const updateTask = async (id: string, updates: any) => {
    try {
      const normalizedId = normalizeVirtualId(id);
      return await TaskService.updateTask(normalizedId, updates);
    } catch (error) {
      console.error('Failed to update task:', error);
      throw new Error('Failed to update task. Please try again.');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const normalizedId = normalizeVirtualId(id);
      return await TaskService.deleteTask(normalizedId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw new Error('Failed to delete task. Please try again.');
    }
  };

  const addEvent = async (e: any) => {
    try {
      const pid = ensureProfileId();
      if (!pid) return;
      await TaskService.addEvent({ ...e, profileId: pid });
    } catch (error) {
      console.error('Failed to add event:', error);
      throw new Error('Failed to add event. Please try again.');
    }
  };

  const updateEvent = async (id: string, updates: any) => {
    try {
      const normalizedId = normalizeVirtualId(id);
      await TaskService.updateEvent(normalizedId, updates);
    } catch (error) {
      console.error('Failed to update event:', error);
      throw new Error('Failed to update event. Please try again.');
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const normalizedId = normalizeVirtualId(id);
      await TaskService.deleteEvent(normalizedId);
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw new Error('Failed to delete event. Please try again.');
    }
  };

  // --- Observe Vault ---
  useEffect(() => {
    if (!profileId) {
      setGlobalVault([]);
      setMemberVaults({});
      return;
    }

    try {
      const sub = VaultService.observeAllDocuments(profileId).subscribe({
        next: (docs) => {
          try {
            const g: any[] = [];
            const m: Record<string, any[]> = {};

            docs.forEach(d => {
              const meta = d.meta || {};
              const cachedUri = VaultService.getCachedLocalUri(d.id);
              const docUri = cachedUri ?? d.filePath;
              const docObj = {
                id: d.id,
                name: d.name,
                type: d.type,
                icon: d.icon,
                date: d.date,
                memberId: d.memberId,
                filePath: d.filePath,
                uri: docUri, // Map for VaultUtils
                uploadStatus: d.uploadStatus,
                remotePath: d.remotePath,
                ...meta,  // Merge meta fields (expiryDate, etc.) to top level
              };
              if (d.memberId === 'global') {
                g.push(docObj);
              } else if (d.memberId) {
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
  }, [profileId]);

  // --- Observe Grocery List ---
  useEffect(() => {
    if (!profileId) {
      setRawGroceryItems([]);
      return;
    }
    try {
      const sub = ListService.observeShoppingListItems(profileId).subscribe({
        next: (items) => {
          setRawGroceryItems(items);
        },
        error: (error) => {
          console.error('Error observing grocery list:', error);
        }
      });
      return () => sub.unsubscribe();
    } catch (error) {
      console.error('Error setting up grocery list subscription:', error);
    }
  }, [profileId]);

  // ... Expose methods ...

  const handleCascadeDelete = async (id: string) => {
    const pid = ensureProfileId();
    if (!pid) {
      return;
    }
    await FamilyService.deleteMemberCascade(pid, id);
  };

  return (
    <FamilyContext.Provider
      value={{
        familyName,
        setFamilyName,
        members,
        activeMember,
        setActiveMember,
        addMember: async (m: any) => {
          const pid = ensureProfileId();
          if (!pid) return;
          await FamilyService.addMember(pid, m.name, m.symbol, m.color, m.isActive ?? false);
        },
        removeMember: handleCascadeDelete,
        deleteMemberCascade: handleCascadeDelete,
        updateMember: async (id: string, u: any) => {
          const pid = ensureProfileId();
          if (!pid) return;
          await FamilyService.updateMember(pid, id, u);
        },
        updateMemberColor: async (id: string, c: string) => {
          const pid = ensureProfileId();
          if (!pid) return;
          await FamilyService.updateMember(pid, id, { color: c });
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
        addGroceryItem: ListService.addGroceryItem,
        toggleGroceryItem: ListService.toggleGroceryItem,
        removeGroceryItem: ListService.removeGroceryItem,

        tasks,
        addTask,
        updateTask,
        deleteTask,

        profileId,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const FamilyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isGuest, user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const refreshProfile = async () => {
      const pid = await ProfileService.getActiveProfileId();
      if (mounted) {
        setProfileId(pid);
      }
    };
    refreshProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async () => {
      const pid = await ProfileService.getActiveProfileId();
      if (mounted) {
        setProfileId(pid);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [isGuest, user?.id]);

  return (
    <FamilyProviderInner key={String(profileId)} profileId={profileId} isGuest={isGuest}>
      {children}
    </FamilyProviderInner>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("useFamily must be used within a FamilyProvider");
  }
  return context;
};

// Acceptance Checklist:
// - Device A (profile X) edits grocery list items while Device B is on the same profile; only profile X's tombstoned changes appear via SyncService.requestSyncSoon().
// - Switch profiles on either device; grocery list clears and only the new profile's inventory returns after the next synced pull, proving multi-profile isolation.
