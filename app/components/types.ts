export interface Exercise {
  id: string;
  name: string;
  tags: string[];
}

export interface DayExercise {
  id: string;
  sets: string;
}

export interface Day {
  id: string;
  num: number;
  label: string;
  env: string;
  exercises: DayExercise[];
}

export interface Program {
  id: string;
  name: string;
  days: Day[];
  created_at: string;
}

export function tClass(t: string) {
  return t === "gym" ? "tag-g" : t === "home" ? "tag-h" : t === "strength" ? "tag-str" : t === "mobility" ? "tag-mob" : "";
}

export function tLabel(t: string) {
  return t === "gym" ? "G" : t === "home" ? "H" : t === "strength" ? "Strength" : "Mobility";
}

export function tStyle(t: string) {
  if (t === "gym") return "background:#fdf5e0;color:#9a6f1a;border:1px solid #e8d898";
  if (t === "home") return "background:#e8f2fc;color:#2a72a8;border:1px solid #a8cce8";
  if (t === "strength") return "background:#fdf0ec;color:#c05030;border:1px solid #e8b8a8";
  if (t === "mobility") return "background:#e8f5ee;color:#2a8a5a;border:1px solid #a8d8b8";
  return "";
}
