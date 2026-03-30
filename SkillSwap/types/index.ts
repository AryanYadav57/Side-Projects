// Portfolio project type
export interface Project {
  id: string;
  title: string;
  description: string;
  tools: string[];
  type: 'College Project' | 'Freelance' | 'Personal' | 'Open Source';
  link?: string;
  featured?: boolean;
}

// Types for the skill data and messages used across the app
export interface Skill {
  id: string;
  type: 'offering' | 'seeking';
  name: string;
  skill: string;
  description: string;
  price: string;
  rating: number;
  avatar: string;
  category: string;
  college: string;
  availability: string[];  // e.g. ['Weekdays', 'Evenings']
  portfolio: Project[];
}

export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  time: string;
}

export type SortOption = 'default' | 'rating_high' | 'price_low' | 'price_high';

// Navigation param list for StackNavigator
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  // Tab screens
  Home: {newSkill?: Skill | null} | undefined;
  Search: undefined;
  Messages: undefined;
  UserProfile: undefined;
  // Stack screens (pushed over tabs)
  Profile: {skill: Skill};
  AddSkill: undefined;
  Chat: {skill: Skill};
};
