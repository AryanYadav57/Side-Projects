import React, {createContext, useState, useContext, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Skill} from '../types';

interface BookmarksContextType {
  savedSkills: Skill[];
  toggleBookmark: (skill: Skill) => void;
  isBookmarked: (skillId: string) => boolean;
}

const BookmarksContext = createContext<BookmarksContextType>({
  savedSkills: [],
  toggleBookmark: () => {},
  isBookmarked: () => false,
});

export const useBookmarks = () => useContext(BookmarksContext);

export const BookmarksProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [savedSkills, setSavedSkills] = useState<Skill[]>([]);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const stored = await AsyncStorage.getItem('@bookmarks');
      if (stored) {
        setSavedSkills(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load bookmarks', e);
    }
  };

  const saveBookmarks = async (skills: Skill[]) => {
    try {
      await AsyncStorage.setItem('@bookmarks', JSON.stringify(skills));
    } catch (e) {
      console.error('Failed to save bookmarks', e);
    }
  };

  const toggleBookmark = (skill: Skill) => {
    setSavedSkills(prev => {
      const exists = prev.find(s => s.id === skill.id);
      let updated: Skill[];
      if (exists) {
        updated = prev.filter(s => s.id !== skill.id);
      } else {
        updated = [...prev, skill];
      }
      saveBookmarks(updated);
      return updated;
    });
  };

  const isBookmarked = (skillId: string) => {
    return savedSkills.some(s => s.id === skillId);
  };

  return (
    <BookmarksContext.Provider value={{savedSkills, toggleBookmark, isBookmarked}}>
      {children}
    </BookmarksContext.Provider>
  );
};
