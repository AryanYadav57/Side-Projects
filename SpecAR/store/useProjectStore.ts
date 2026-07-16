import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { projectStorage } from './projectStorage';

export interface Dimensions {
  length_cm: number;
  width_cm: number;
  height_cm: number;
  top_thickness_cm: number;
  leg_thickness_cm: number;
  leg_style: 'square' | 'round';
}

export interface Project {
  id: string;
  name: string;
  dimensions: Dimensions;
  sourceFile: string;
  createdAt: number;
}

interface ProjectStore {
  // Current active project dimensions
  currentDimensions: Dimensions | null;
  currentProjectName: string;

  // List of saved projects
  savedProjects: Project[];

  // Actions
  setCurrentDimensions: (dims: Dimensions, name?: string) => void;
  clearCurrentDimensions: () => void;
  saveProject: (name: string, sourceFile: string) => void;
  deleteProject: (id: string) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      currentDimensions: null,
      currentProjectName: 'New Project',
      savedProjects: [],

      setCurrentDimensions: (dims, name = 'New Project') =>
        set({ currentDimensions: dims, currentProjectName: name }),

      clearCurrentDimensions: () =>
        set({ currentDimensions: null, currentProjectName: 'New Project' }),

      saveProject: (name, sourceFile) => {
        const { currentDimensions, savedProjects } = get();
        if (!currentDimensions) return;

        const project: Project = {
          id: Date.now().toString(),
          name,
          dimensions: currentDimensions,
          sourceFile,
          createdAt: Date.now(),
        };

        set({ savedProjects: [project, ...savedProjects] });
      },

      deleteProject: (id) =>
        set((state) => ({
          savedProjects: state.savedProjects.filter((p) => p.id !== id),
        })),
    }),
    {
      name: 'specar-project-store',
      storage: createJSONStorage(() => projectStorage),
      partialize: (state) => ({ savedProjects: state.savedProjects }),
    }
  )
);
