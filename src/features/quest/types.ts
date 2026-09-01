export type TrackId = "frontend" | "backend" | "fullstack" | "tester";
export type MissionType = "diagnose" | "build" | "design" | "review";
export type CareerLevel = "Fresher" | "Mid" | "Senior" | "Expert";

export interface Mission {
  id: string;
  track: TrackId;
  level: CareerLevel;
  type: MissionType;
  title: string;
  summary: string;
  prompt: string;
  rubric: string[];
  xp: number;
  prerequisites: string[];
}

export interface Attempt {
  missionId: string;
  answer: string;
  reflection: string;
  completedAt: string;
  awardedXp?: number;
  repositoryUrl?: string | null;
  demoUrl?: string | null;
  testResult?: string | null;
  aiFeedback?: string | null;
  htmlCode?: string | null;
  cssCode?: string | null;
  javascriptCode?: string | null;
}

export interface Profile {
  totalXp: number;
  level: CareerLevel;
  importedAt: string | null;
  frontendXp: number;
  backendXp: number;
  fullstackXp: number;
  testerXp: number;
}
