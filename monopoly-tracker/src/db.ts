import Dexie, { type Table } from "dexie";

export type SavedGame = {
  id?: number;
  name: string;
  created: number;
  payload: any;
};

class GameDB extends Dexie {
  saves!: Table<SavedGame, number>;
  constructor() {
    super("monopoly-tracker-db");
    this.version(1).stores({
      saves: "++id,created",
    });
  }
}

export const db = new GameDB();
