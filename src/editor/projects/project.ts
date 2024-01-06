import { IDBPDatabase, openDB } from "idb";

export type Project = {
  id?: number;
  modified?: number;
  name: string;
  source: string;
};

export type ProjectsDB = IDBPDatabase<{
  projects: {
    key: "id";
    value: Project;
  };
}>;

export function projectsDB(): Promise<ProjectsDB> {
  return openDB("projects", 1, {
    upgrade(db) {
      db.createObjectStore("projects", {
        keyPath: "id",
        autoIncrement: true,
      });
    },
  });
}
