"use client";
import { createContext, useContext } from "react";

export interface User {
  id: string;
  name: string;
  handle: string;
  avatar_color: string;
}

const UserContext = createContext<User | null>(null);
export const useUser = () => useContext(UserContext);
export default UserContext;
