import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";

type Player = { id: string; name: string; cash: number; properties: string[] };
type Txn = {
  id: string;
  ts: number;
  kind:
    | "add"
    | "subtract"
    | "transfer"
    | "set-start"
    | "reset"
    | "remove-player"
    | "add-player"
    | "acquire"
    | "build"
    | "sell"
    | "mortgage"
    | "unmortgage";
  amount?: number;
  fromId?: string;
  toId?: string;
  playerId?: string;
  propertyName?: string;
  newLevel?: number;
  note?: string;
};

type ColorKey =
  | "brown"
  | "light-blue"
  | "magenta"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "dark-blue"
  | "railroad"
  | "utility";

type Property = {
  name: string;
  color: ColorKey;
  price: number;
  kind: "color" | "railroad" | "utility";
  houseCost?: number;
  rents?: { site: number; set: number; h1: number; h2: number; h3: number; h4: number; hotel: number };
};

// Monopoly Cash Tracker — single-file React component
// New in this version:
// - Mortgages: mortgage/unmortgage properties (no rent while mortgaged). Mortgage value = 50% of price; unmortgage = 110% of mortgage value.
// - Paying Rent UI streamlined: fields stacked; tiny dice input tucked in the card corner.
// - Header cleanup: removed Pass GO toggle; compact top-right HUD now also includes Starting Cash, New Game, and icon Undo/Redo.
// - Add Player collapsed into a square + button that expands inline.

export default function MonopolyCashTracker() {
  // ===== Property Data (US Standard) =====
  const COLORS: Record<ColorKey, { label: string; hex: string; setSize: number; houseCost?: number }> = {
    brown: { label: "Brown", hex: "#955436", setSize: 2, houseCost: 50 },
    "light-blue": { label: "Light Blue", hex: "#9ADCFB", setSize: 3, houseCost: 50 },
    magenta: { label: "Magenta", hex: "#D13A7A", setSize: 3, houseCost: 100 },
    orange: { label: "Orange", hex: "#F7941D", setSize: 3, houseCost: 100 },
    red: { label: "Red", hex: "#ED1C24", setSize: 3, houseCost: 150 },
    yellow: { label: "Yellow", hex: "#FFF200", setSize: 3, houseCost: 150 },
    green: { label: "Green", hex: "#00A651", setSize: 3, houseCost: 200 },
    "dark-blue": { label: "Dark Blue", hex: "#1C4AA1", setSize: 2, houseCost: 200 },
    railroad: { label: "Railroad", hex: "#111111", setSize: 4 },
    utility: { label: "Utility", hex: "#7E7E7E", setSize: 2 },
  };

  const PROPERTIES: Property[] = [
    // Browns
    { name: "Mediterranean Avenue", color: "brown", price: 60, kind: "color", houseCost: 50, rents: { site: 2, set: 4, h1: 10, h2: 30, h3: 90, h4: 160, hotel: 250 } },
    { name: "Baltic Avenue", color: "brown", price: 60, kind: "color", houseCost: 50, rents: { site: 4, set: 8, h1: 20, h2: 60, h3: 180, h4: 320, hotel: 450 } },
    // Light Blues
    { name: "Oriental Avenue", color: "light-blue", price: 100, kind: "color", houseCost: 50, rents: { site: 6, set: 12, h1: 30, h2: 90, h3: 270, h4: 400, hotel: 550 } },
    { name: "Vermont Avenue", color: "light-blue", price: 100, kind: "color", houseCost: 50, rents: { site: 6, set: 12, h1: 30, h2: 90, h3: 270, h4: 400, hotel: 550 } },
    { name: "Connecticut Avenue", color: "light-blue", price: 120, kind: "color", houseCost: 50, rents: { site: 8, set: 16, h1: 40, h2: 100, h3: 300, h4: 450, hotel: 600 } },
    // Magentas
    { name: "St. Charles Place", color: "magenta", price: 140, kind: "color", houseCost: 100, rents: { site: 10, set: 20, h1: 50, h2: 150, h3: 450, h4: 625, hotel: 750 } },
    { name: "States Avenue", color: "magenta", price: 140, kind: "color", houseCost: 100, rents: { site: 10, set: 20, h1: 50, h2: 150, h3: 450, h4: 625, hotel: 750 } },
    { name: "Virginia Avenue", color: "magenta", price: 160, kind: "color", houseCost: 100, rents: { site: 12, set: 24, h1: 60, h2: 180, h3: 500, h4: 700, hotel: 900 } },
    // Oranges
    { name: "St. James Place", color: "orange", price: 180, kind: "color", houseCost: 100, rents: { site: 14, set: 28, h1: 70, h2: 200, h3: 550, h4: 750, hotel: 950 } },
    { name: "Tennessee Avenue", color: "orange", price: 180, kind: "color", houseCost: 100, rents: { site: 14, set: 28, h1: 70, h2: 200, h3: 550, h4: 750, hotel: 950 } },
    { name: "New York Avenue", color: "orange", price: 200, kind: "color", houseCost: 100, rents: { site: 16, set: 32, h1: 80, h2: 220, h3: 600, h4: 800, hotel: 1000 } },
    // Reds
    { name: "Kentucky Avenue", color: "red", price: 220, kind: "color", houseCost: 150, rents: { site: 18, set: 36, h1: 90, h2: 250, h3: 700, h4: 875, hotel: 1050 } },
    { name: "Indiana Avenue", color: "red", price: 220, kind: "color", houseCost: 150, rents: { site: 18, set: 36, h1: 90, h2: 250, h3: 700, h4: 875, hotel: 1050 } },
    { name: "Illinois Avenue", color: "red", price: 240, kind: "color", houseCost: 150, rents: { site: 20, set: 40, h1: 100, h2: 300, h3: 750, h4: 925, hotel: 1100 } },
    // Yellows
    { name: "Atlantic Avenue", color: "yellow", price: 260, kind: "color", houseCost: 150, rents: { site: 22, set: 44, h1: 110, h2: 330, h3: 800, h4: 975, hotel: 1150 } },
    { name: "Ventnor Avenue", color: "yellow", price: 260, kind: "color", houseCost: 150, rents: { site: 22, set: 44, h1: 110, h2: 330, h3: 800, h4: 975, hotel: 1150 } },
    { name: "Marvin Gardens", color: "yellow", price: 280, kind: "color", houseCost: 150, rents: { site: 24, set: 48, h1: 120, h2: 360, h3: 850, h4: 1025, hotel: 1200 } },
    // Greens
    { name: "Pacific Avenue", color: "green", price: 300, kind: "color", houseCost: 200, rents: { site: 26, set: 52, h1: 130, h2: 390, h3: 900, h4: 1100, hotel: 1275 } },
    { name: "North Carolina Avenue", color: "green", price: 300, kind: "color", houseCost: 200, rents: { site: 26, set: 52, h1: 130, h2: 390, h3: 900, h4: 1100, hotel: 1275 } },
    { name: "Pennsylvania Avenue", color: "green", price: 320, kind: "color", houseCost: 200, rents: { site: 28, set: 56, h1: 150, h2: 450, h3: 1000, h4: 1200, hotel: 1400 } },
    // Dark Blues
    { name: "Park Place", color: "dark-blue", price: 350, kind: "color", houseCost: 200, rents: { site: 35, set: 70, h1: 175, h2: 500, h3: 1100, h4: 1300, hotel: 1500 } },
    { name: "Boardwalk", color: "dark-blue", price: 400, kind: "color", houseCost: 200, rents: { site: 50, set: 100, h1: 200, h2: 600, h3: 1400, h4: 1700, hotel: 2000 } },
    // Railroads
    { name: "Reading Railroad", color: "railroad", price: 200, kind: "railroad" },
    { name: "Pennsylvania Railroad", color: "railroad", price: 200, kind: "railroad" },
    { name: "B. & O. Railroad", color: "railroad", price: 200, kind: "railroad" },
    { name: "Short Line", color: "railroad", price: 200, kind: "railroad" },
    // Utilities
    { name: "Electric Company", color: "utility", price: 150, kind: "utility" },
    { name: "Water Works", color: "utility", price: 150, kind: "utility" },
  ];

  // ===== State =====
  const [players, setPlayers] = useState<Player[]>([]);
  const [startingCash, setStartingCash] = useState<number>(1500);
  const [history, setHistory] = useState<Txn[]>([]);
  const [redoStack, setRedoStack] = useState<Txn[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Building levels by property name: 0=none, 1..4=houses, 5=hotel
  const [levels, setLevels] = useState<Record<string, number>>({});
  // Mortgage flags by property name
  const [mortgages, setMortgages] = useState<Record<string, boolean>>({});

  // Custom price chips (edge cases)
  const [customChips, setCustomChips] = useState<number[]>([]);
  const [newCustom, setNewCustom] = useState<string>("");

  // Add Player toggle
  const [addOpen, setAddOpen] = useState<boolean>(false);

  // Paying Rent UI
  const [rentForm, setRentForm] = useState<{ playerId: string; property: string; diceTotal: string }>({
    playerId: "",
    property: "",
    diceTotal: "",
  });

  const [rulesOpen, setRulesOpen] = useState<boolean>(false);
  const [evenBuildEnforced, setEvenBuildEnforced] = useState<boolean>(true);
  const rulesRef = useRef<HTMLDivElement | null>(null);
  const [hudMenuOpen, setHudMenuOpen] = useState<boolean>(false);

  const denominations = [1, 5, 10, 20, 50, 100, 500];

  // ===== Persistence =====
  const LS_KEY = "monopoly-tracker-v6"; // bump for mortgages & UI tweaks
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.players)) {
          setPlayers(parsed.players);
          setStartingCash(parsed.startingCash ?? 1500);
          setHistory(parsed.history ?? []);
          setRedoStack([]);
          setCustomChips(parsed.customChips ?? []);
          setLevels(parsed.levels ?? {});
          setMortgages(parsed.mortgages ?? {});
          setEvenBuildEnforced(parsed.evenBuildEnforced ?? true);
        }
      } else {
        const seed = ["Dog", "Car", "Hat", "Thimble"].map((n) => ({
          id: crypto.randomUUID(),
          name: n,
          cash: 1500,
          properties: [],
        }));
        setPlayers(seed);
        setStartingCash(1500);
        setHistory([
          { id: crypto.randomUUID(), ts: Date.now(), kind: "set-start", amount: 1500, note: "Initial game setup" },
        ]);
      }
    } catch (e) {
      console.error("Load error", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const payload = { players, startingCash, history, customChips, levels, mortgages, evenBuildEnforced };
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error("Save error", e);
    }
  }, [players, startingCash, history, customChips, levels, mortgages, evenBuildEnforced]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (rulesRef.current && !rulesRef.current.contains(event.target as Node)) {
        setRulesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 768px)");
    const handle = (e: MediaQueryListEvent) => {
      if (e.matches) setHudMenuOpen(false);
    };
    media.addEventListener("change", handle);
    return () => media.removeEventListener("change", handle);
  }, []);

  // ===== Derived =====
  const totalCash = useMemo(() => players.reduce((s, p) => s + p.cash, 0), [players]);
  const topBankroll = useMemo(() => {
    if (players.length === 0) return null;
    let best = players[0];
    for (const p of players) if (p.cash > best.cash) best = p;
    return best;
  }, [players]);

  // ===== Helpers =====
  const getPlayer = (id: string) => players.find((p) => p.id === id);
  const getOwnerOf = (propertyName: string) => players.find((p) => p.properties.includes(propertyName));
  const getProperty = (name: string) => PROPERTIES.find((p) => p.name === name);
  const ownsFullSet = (player: Player, color: ColorKey) => {
    const size = COLORS[color].setSize;
    const count = player.properties.map(getProperty).filter((p) => p && p.color === color).length;
    return count === size;
  };

  const canBuildEvenly = (player: Player, prop: Property, propertyName: string) => {
    if (!evenBuildEnforced || prop.kind !== "color") return true;
    if (!ownsFullSet(player, prop.color)) {
      alert("Own the full color set to build while even-building enforcement is enabled.");
      return false;
    }
    const colorProps = PROPERTIES.filter((p) => p.kind === "color" && p.color === prop.color);
    const levelsInSet = colorProps.map((p) => propertyLevel(p.name));
    const minLevel = levelsInSet.length > 0 ? Math.min(...levelsInSet) : 0;
    if (propertyLevel(propertyName) > minLevel) {
      alert("Add houses evenly across the set (difference of one max).");
      return false;
    }
    return true;
  };

  const propertyLevel = (name: string) => levels[name] || 0;
  const isMortgaged = (name: string) => !!mortgages[name];

  const pushHistory = (txn: Txn) => {
    setHistory((h) => [txn, ...h]);
    setRedoStack([]);
  };

  const addPlayer = (name: string) => {
    if (!name.trim()) return;
    const p: Player = { id: crypto.randomUUID(), name: name.trim(), cash: startingCash, properties: [] };
    setPlayers((ps) => [...ps, p]);
    pushHistory({ id: crypto.randomUUID(), ts: Date.now(), kind: "add-player", playerId: p.id, note: name.trim() });
    setAddOpen(false);
  };

  const removePlayer = (id: string) => {
    const player = getPlayer(id);
    if (!player) return;
    setPlayers((ps) => ps.filter((p) => p.id !== id));
    setLevels((lv) => {
      const copy = { ...lv };
      player.properties.forEach((prop) => delete copy[prop]);
      return copy;
    });
    setMortgages((mg) => {
      const copy = { ...mg };
      player.properties.forEach((prop) => delete copy[prop]);
      return copy;
    });
    pushHistory({ id: crypto.randomUUID(), ts: Date.now(), kind: "remove-player", playerId: id, note: player.name });
    if (selectedId === id) setSelectedId(null);
  };

  const hardReset = () => {
    setPlayers([]);
    setHistory([]);
    setRedoStack([]);
    setLevels({});
    setMortgages({});
    pushHistory({ id: crypto.randomUUID(), ts: Date.now(), kind: "reset", note: "New game" });
  };

  const adjustCash = (playerId: string, delta: number, note?: string) => {
    setPlayers((ps) => ps.map((p) => (p.id === playerId ? { ...p, cash: Math.max(0, p.cash + delta) } : p)));
    pushHistory({ id: crypto.randomUUID(), ts: Date.now(), kind: delta >= 0 ? "add" : "subtract", playerId, amount: Math.abs(delta), note });
  };

  const transfer = (fromId: string, toId: string, amount: number, note?: string) => {
    if (fromId === toId) return;
    const from = fromId === "BANK" ? { id: "BANK", name: "Bank", cash: Infinity, properties: [] } : getPlayer(fromId);
    const to = toId === "BANK" ? { id: "BANK", name: "Bank", cash: Infinity, properties: [] } : getPlayer(toId);
    if ((!from && fromId !== "BANK") || (!to && toId !== "BANK") || amount <= 0) return;
    setPlayers((ps) =>
      ps.map((p) => {
        if (fromId !== "BANK" && p.id === fromId) return { ...p, cash: Math.max(0, p.cash - amount) };
        if (toId !== "BANK" && p.id === toId) return { ...p, cash: p.cash + amount };
        return p;
      })
    );
    pushHistory({ id: crypto.randomUUID(), ts: Date.now(), kind: "transfer", fromId, toId, amount, note });
  };

  const acquireProperty = (playerId: string, propertyName: string, price: number) => {
    const owner = getOwnerOf(propertyName);
    if (owner && owner.id !== playerId) {
      alert(`${propertyName} is already owned by ${owner.name}.`);
      return;
    }
    transfer(playerId, "BANK", price, `Purchased ${propertyName}`);
    setPlayers((ps) =>
      ps.map((p) => (p.id === playerId && !p.properties.includes(propertyName) ? { ...p, properties: [...p.properties, propertyName] } : p))
    );
    setLevels((lv) => ({ ...lv, [propertyName]: 0 }));
    setMortgages((mg) => ({ ...mg, [propertyName]: false }));
    pushHistory({ id: crypto.randomUUID(), ts: Date.now(), kind: "acquire", playerId, propertyName, amount: price });
  };

  const buildOn = (playerId: string, propertyName: string) => {
    const owner = getOwnerOf(propertyName);
    if (!owner || owner.id !== playerId) return;
    const prop = getProperty(propertyName);
    if (!prop || prop.kind !== "color" || !prop.houseCost) return;
    if (isMortgaged(propertyName)) return alert("Unmortgage before building.");
    if (!canBuildEvenly(owner, prop, propertyName)) return;
    const current = propertyLevel(propertyName);
    if (current >= 5) return; // already hotel
    transfer(playerId, "BANK", prop.houseCost, current === 4 ? `Build HOTEL on ${propertyName}` : `Build house on ${propertyName}`);
    const next = current + 1;
    setLevels((lv) => ({ ...lv, [propertyName]: next }));
    pushHistory({ id: crypto.randomUUID(), ts: Date.now(), kind: "build", playerId, propertyName, newLevel: next });
  };

  const sellFrom = (playerId: string, propertyName: string) => {
    const owner = getOwnerOf(propertyName);
    if (!owner || owner.id !== playerId) return;
    const prop = getProperty(propertyName);
    if (!prop || prop.kind !== "color" || !prop.houseCost) return;
    const current = propertyLevel(propertyName);
    if (current <= 0) return; // nothing to sell
    const refund = Math.floor(prop.houseCost / 2);
    adjustCash(playerId, refund, current === 5 ? `Sell HOTEL from ${propertyName}` : `Sell house from ${propertyName}`);
    const next = current - 1; // hotel→4 houses, or decrement houses
    setLevels((lv) => ({ ...lv, [propertyName]: next }));
    pushHistory({ id: crypto.randomUUID(), ts: Date.now(), kind: "sell", playerId, propertyName, newLevel: next });
  };

  // Mortgage helpers
  const mortgageValue = (name: string) => Math.floor((getProperty(name)?.price || 0) / 2);
  const canMortgage = (playerId: string, name: string) => {
    const prop = getProperty(name);
    if (!prop) return false;
    // no buildings allowed on color properties
    if (prop.kind === "color" && propertyLevel(name) > 0) return false;
    // must be owned by player and not already mortgaged
    const owner = getOwnerOf(name);
    return owner?.id === playerId && !isMortgaged(name);
  };
  const canUnmortgage = (playerId: string, name: string) => getOwnerOf(name)?.id === playerId && isMortgaged(name);

  const doMortgage = (playerId: string, name: string) => {
    if (!canMortgage(playerId, name)) return;
    const value = mortgageValue(name);
    setMortgages((mg) => ({ ...mg, [name]: true }));
    transfer("BANK", playerId, value, `Mortgage ${name}`);
    pushHistory({ id: crypto.randomUUID(), ts: Date.now(), kind: "mortgage", playerId, propertyName: name, amount: value });
  };

  const doUnmortgage = (playerId: string, name: string) => {
    if (!canUnmortgage(playerId, name)) return;
    const value = mortgageValue(name);
    const payoff = Math.ceil(value * 1.1); // 10% interest
    transfer(playerId, "BANK", payoff, `Unmortgage ${name}`);
    setMortgages((mg) => ({ ...mg, [name]: false }));
    pushHistory({ id: crypto.randomUUID(), ts: Date.now(), kind: "unmortgage", playerId, propertyName: name, amount: payoff });
  };

  const buildSetOnce = (playerId: string, color: ColorKey) => {
    const player = getPlayer(playerId);
    if (!player) return;
    if (evenBuildEnforced && !ownsFullSet(player, color)) {
      alert("Own the full color set before building across it.");
      return;
    }
    const props = PROPERTIES.filter((p) => p.kind === "color" && p.color === color).map((p) => p.name);
    for (const name of props) {
      const owner = getOwnerOf(name);
      if (owner?.id === playerId && propertyLevel(name) < 5 && !isMortgaged(name)) buildOn(playerId, name);
    }
  };

  // ===== Undo/Redo (rebuild state) =====
  const rebuildFrom = (txns: Txn[]) => {
    let stCash = startingCash;
    let ps: Player[] = [];
    let lv: Record<string, number> = {};
    let mg: Record<string, boolean> = {};
    const seedTx = [...txns].reverse();

    for (const t of seedTx) {
      if (t.kind === "set-start" && typeof t.amount === "number") { stCash = t.amount; break; }
    }

    const created = new Map<string, Player>();
    for (const t of seedTx) {
      if (t.kind === "add-player") {
        const name = t.note ?? "Player";
        const id = t.playerId ?? crypto.randomUUID();
        if (!created.has(id)) created.set(id, { id, name, cash: stCash, properties: [] });
      } else if (t.kind === "remove-player" && t.playerId) {
        created.delete(t.playerId);
      }
    }
    ps = Array.from(created.values());

    for (const t of seedTx) {
      switch (t.kind) {
        case "set-start": {
          if (typeof t.amount === "number") ps = ps.map((p) => ({ ...p, cash: t.amount! }));
          break;
        }
        case "add": {
          if (!t.playerId || !t.amount) break;
          ps = ps.map((p) => (p.id === t.playerId ? { ...p, cash: p.cash + t.amount! } : p));
          break;
        }
        case "subtract": {
          if (!t.playerId || !t.amount) break;
          ps = ps.map((p) => (p.id === t.playerId ? { ...p, cash: Math.max(0, p.cash - t.amount!) } : p));
          break;
        }
        case "transfer": {
          if (!t.amount) break;
          if (t.fromId && t.fromId !== "BANK") ps = ps.map((p) => (p.id === t.fromId ? { ...p, cash: Math.max(0, p.cash - t.amount!) } : p));
          if (t.toId && t.toId !== "BANK") ps = ps.map((p) => (p.id === t.toId ? { ...p, cash: p.cash + t.amount! } : p));
          break;
        }
        case "acquire": {
          if (!t.playerId || !t.propertyName) break;
          ps = ps.map((p) => (p.id === t.playerId && !p.properties.includes(t.propertyName!) ? { ...p, properties: [...p.properties, t.propertyName!] } : p));
          lv[t.propertyName!] = lv[t.propertyName!] ?? 0;
          mg[t.propertyName!] = mg[t.propertyName!] ?? false;
          break;
        }
        case "build":
        case "sell": {
          if (!t.propertyName || typeof t.newLevel !== "number") break;
          lv[t.propertyName] = t.newLevel;
          break;
        }
        case "mortgage": {
          if (t.propertyName) mg[t.propertyName] = true;
          break;
        }
        case "unmortgage": {
          if (t.propertyName) mg[t.propertyName] = false;
          break;
        }
      }
    }

    setPlayers(ps);
    setLevels(lv);
    setMortgages(mg);
  };

  const onUndo = () => {
    if (history.length === 0) return;
    const [head, ...rest] = history;
    setHistory(rest);
    setRedoStack((r) => [head, ...r]);
    rebuildFrom(rest);
  };

  const onRedo = () => {
    if (redoStack.length === 0) return;
    const [head, ...rest] = redoStack;
    setRedoStack(rest);
    const newHist = [head, ...history];
    setHistory(newHist);
    rebuildFrom(newHist);
  };

  // ===== Rent Calculation =====
  const calcRent = (propertyName: string, owner: Player | undefined, diceTotal: number | undefined) => {
    const prop = getProperty(propertyName);
    if (!prop || !owner) return 0;
    if (isMortgaged(propertyName)) return 0; // no rent while mortgaged
    if (prop.kind === "color") {
      const level = propertyLevel(propertyName); // 0..5
      if (!prop.rents) return 0;
      if (level === 0) {
        return ownsFullSet(owner, prop.color) ? prop.rents.set : prop.rents.site;
      }
      if (level === 1) return prop.rents.h1;
      if (level === 2) return prop.rents.h2;
      if (level === 3) return prop.rents.h3;
      if (level === 4) return prop.rents.h4;
      return prop.rents.hotel;
    } else if (prop.kind === "railroad") {
      const owned = owner.properties.map(getProperty).filter((p) => p?.kind === "railroad").length;
      return [0, 25, 50, 100, 200][owned] || 25;
    } else {
      const owned = owner.properties.map(getProperty).filter((p) => p?.kind === "utility").length;
      const roll = diceTotal || 0;
      const multiplier = owned >= 2 ? 10 : 4;
      return roll * multiplier;
    }
  };

  // ===== Drag & Drop reorder =====
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDropOn = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setPlayers((ps) => {
      const next = [...ps];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  // ===== UI Helpers =====
  const fmt = (n: number) => `$${n.toLocaleString()}`;

  // ===== Render =====
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      {/* Compact HUD top-right: status + controls in one line */}
      <div className="fixed right-3 top-3 z-40 hidden items-center gap-3 rounded-lg bg-white/90 px-3 py-2 text-xs shadow-sm ring-1 ring-slate-200 lg:flex">
        <div className="flex items-center gap-1"><span className="text-slate-500">Players</span><span className="font-semibold">{players.length}</span></div>
        <div className="flex items-center gap-1"><span className="text-slate-500">Cash</span><span className="font-semibold">{fmt(totalCash)}</span></div>
        <div className="flex items-center gap-1"><span className="text-slate-500">Top</span><span className="font-semibold">{topBankroll ? `${topBankroll.name} · ${fmt(topBankroll.cash)}` : "—"}</span></div>
        <div className="ml-2 flex items-center gap-1">
          <span className="text-slate-500">Start</span>
          <input type="number" className="w-18 rounded border border-slate-300 bg-white px-1 py-0.5 text-right" value={startingCash} min={0}
            onChange={(e) => setStartingCash(parseInt(e.target.value || "0", 10))}
            onBlur={() => pushHistory({ id: crypto.randomUUID(), ts: Date.now(), kind: "set-start", amount: startingCash })} />
        </div>
        <button className="rounded bg-rose-600 px-2 py-1 font-semibold text-white hover:bg-rose-700" onClick={hardReset} title="New Game">
          New
        </button>
        <button className="rounded bg-white px-2 py-1 ring-1 ring-slate-200 disabled:opacity-40" onClick={onUndo} disabled={history.length === 0} title="Undo">
          ↶
        </button>
        <button className="rounded bg-white px-2 py-1 ring-1 ring-slate-200 disabled:opacity-40" onClick={onRedo} disabled={redoStack.length === 0} title="Redo">
          ↷
        </button>
        <div className="relative" ref={rulesRef}>
          <button
            className="ml-1 flex items-center gap-1 rounded bg-slate-900 px-2 py-1 font-semibold text-white hover:bg-slate-800"
            onClick={() => setRulesOpen((v) => !v)}
            title="Adjust in-game rules"
          >
            Game Rules
            <span className="text-[10px]">{rulesOpen ? "▴" : "▾"}</span>
          </button>
          {rulesOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-lg bg-white p-3 text-[11px] shadow-lg ring-1 ring-slate-200">
              <label className="flex items-center justify-between text-[12px] font-semibold text-slate-700">
                <span>Even-building enforcement</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  checked={evenBuildEnforced}
                  onChange={(e) => setEvenBuildEnforced(e.target.checked)}
                />
              </label>
              <p className="mt-2 text-[11px] text-slate-500">Keeps house builds balanced across each color set (Monopoly rules). Enabled by default.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile toggle button */}
      <div className="fixed right-3 top-3 z-40 lg:hidden">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 shadow-md ring-1 ring-slate-200"
          onClick={() => setHudMenuOpen((v) => !v)}
          aria-label="Open game controls"
        >
          <span className="flex flex-col items-center justify-center gap-1">
            <span className="block h-0.5 w-5 bg-current"></span>
            <span className="block h-0.5 w-5 bg-current"></span>
            <span className="block h-0.5 w-5 bg-current"></span>
          </span>
        </button>
      </div>

      {/* Slide-in panel */}
      <div className={`fixed inset-0 z-50 lg:hidden ${hudMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${hudMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setHudMenuOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-72 transform bg-white text-slate-900 shadow-xl transition-transform duration-300 ${
            hudMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-semibold">Game Controls</div>
            <button className="rounded-md p-1 text-slate-500 hover:text-slate-800" onClick={() => setHudMenuOpen(false)} aria-label="Close menu">
              ✕
            </button>
          </div>
          <div className="flex h-[calc(100%-52px)] flex-col overflow-y-auto px-4 py-4 text-sm">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-slate-500">Stats</div>
              <div className="flex justify-between"><span>Players</span><span className="font-semibold">{players.length}</span></div>
              <div className="flex justify-between"><span>Total Cash</span><span className="font-semibold">{fmt(totalCash)}</span></div>
              <div className="flex justify-between"><span>Top</span><span className="font-semibold">{topBankroll ? topBankroll.name : "—"}</span></div>
            </div>
            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">Starting cash</label>
              <input
                type="number"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-right"
                value={startingCash}
                min={0}
                onChange={(e) => setStartingCash(parseInt(e.target.value || "0", 10))}
                onBlur={() => pushHistory({ id: crypto.randomUUID(), ts: Date.now(), kind: "set-start", amount: startingCash })}
              />
            </div>
            <div className="mt-4 space-y-2">
              <button className="w-full rounded-md bg-rose-600 py-2 text-white hover:bg-rose-700" onClick={hardReset}>New Game</button>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-md bg-slate-200 py-2 ring-1 ring-slate-300 disabled:opacity-40"
                  onClick={onUndo}
                  disabled={history.length === 0}
                >
                  Undo
                </button>
                <button
                  className="flex-1 rounded-md bg-slate-200 py-2 ring-1 ring-slate-300 disabled:opacity-40"
                  onClick={onRedo}
                  disabled={redoStack.length === 0}
                >
                  Redo
                </button>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Game rules</div>
              <label className="mt-2 flex items-center justify-between text-sm font-medium">
                <span>Even-building enforcement</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  checked={evenBuildEnforced}
                  onChange={(e) => setEvenBuildEnforced(e.target.checked)}
                />
              </label>
              <p className="mt-1 text-xs text-slate-500">Keeps house builds balanced across color sets.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-6 sm:px-6 lg:px-10 max-w-none">
        {/* Header */}
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Monopoly Cash Tracker</h1>
            {/* Add Player collapsed button */}
            <div className="relative">
              {!addOpen ? (
                <button className="h-8 w-8 rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700" onClick={() => setAddOpen(true)} title="Add player">+</button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="New player name"
                    className="w-48 rounded-md border border-slate-300 bg-white px-3 py-1"
                    onKeyDown={(e) => {
                      const val = (e.target as HTMLInputElement).value;
                      if (e.key === "Enter") {
                        const v = val.trim();
                        if (v) addPlayer(v);
                      } else if (e.key === "Escape") {
                        setAddOpen(false);
                      }
                    }}
                  />
                  <button className="rounded-md bg-white px-2 py-1 text-xs ring-1 ring-slate-200" onClick={() => setAddOpen(false)}>Close</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main: Players + Bank + Rent */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
          {/* Players (order preserved; draggable to reorder) */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {players.map((p, idx) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOn(idx)}
              >
                <PlayerCard
                  player={p}
                  selected={selectedId === p.id}
                  onSelect={() => setSelectedId(p.id)}
                  onRemove={() => removePlayer(p.id)}
                  onAdjust={(delta, note) => adjustCash(p.id, delta, note)}
                  onPassGo={() => adjustCash(p.id, +200, "Pass GO")}
                  onPurchase={(propName, price) => acquireProperty(p.id, propName, price)}
                  onBuild={(propName) => buildOn(p.id, propName)}
                  onSell={(propName) => sellFrom(p.id, propName)}
                  onBuildSet={(color) => buildSetOnce(p.id, color)}
                  onMortgage={(name) => doMortgage(p.id, name)}
                  onUnmortgage={(name) => doUnmortgage(p.id, name)}
                  denominations={denominations}
                  ownsFullSet={ownsFullSet}
                  getProperty={getProperty}
                  getLevel={propertyLevel}
                  isMortgaged={isMortgaged}
                  COLORS={COLORS}
                />
              </div>
            ))}
          </section>

            {/* Bank */}
            <section className="space-y-4">
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-lg font-semibold">Bank — Properties</h2>
              <div className="grid grid-cols-1 gap-3 max-h-[420px] overflow-auto pr-3">
                {PROPERTIES.map((prop) => (
                  <PropertyChip key={prop.name} prop={prop} COLORS={COLORS} />
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h3 className="mb-2 text-sm font-semibold">Custom price chip</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  value={newCustom}
                  onChange={(e) => setNewCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = parseInt(newCustom || "0", 10);
                      if (v > 0) {
                        setCustomChips((b) => Array.from(new Set([...b, v])).sort((a, z) => a - z));
                        setNewCustom("");
                      }
                    }
                  }}
                />
                <button
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  onClick={() => {
                    const v = parseInt(newCustom || "0", 10);
                    if (v > 0) {
                      setCustomChips((b) => Array.from(new Set([...b, v])).sort((a, z) => a - z));
                      setNewCustom("");
                    }
                  }}
                >
                  + Add
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {customChips.map((price) => (
                  <CustomChip key={price} price={price} />
                ))}
              </div>
            </div>

            {/* Paying Rent */}
            <div className="relative rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-lg font-semibold">Paying Rent</h2>
              {/* tiny dice input in the corner */}
              <div className="absolute right-3 top-3">
                <input type="number" min={0} className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs" value={rentForm.diceTotal}
                  onChange={(e) => setRentForm({ ...rentForm, diceTotal: (e.target as HTMLInputElement).value })} placeholder="dice" />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Player landed</label>
                  <input list="player-names" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" value={rentForm.playerId}
                    onChange={(e) => setRentForm({ ...rentForm, playerId: (e.target as HTMLInputElement).value })} placeholder="Start typing player name" />
                  <datalist id="player-names">
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Landed on property</label>
                  <input list="prop-names" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" value={rentForm.property}
                    onChange={(e) => setRentForm({ ...rentForm, property: (e.target as HTMLInputElement).value })} placeholder="Start typing property" />
                  <datalist id="prop-names">
                    {PROPERTIES.map((p) => (
                      <option key={p.name} value={p.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  onClick={() => {
                    const player = getPlayer(rentForm.playerId);
                    const prop = getProperty(rentForm.property);
                    if (!player || !prop) return alert("Pick a valid player and property.");
                    const owner = getOwnerOf(prop.name);
                    if (!owner) return alert("Property is unowned.");
                    if (owner.id === player.id) return alert("They own this property—no rent.");
                    if (isMortgaged(prop.name)) return alert("Property is mortgaged—no rent.");
                    const rent = calcRent(prop.name, owner, parseInt(rentForm.diceTotal || "0", 10));
                    transfer(player.id, owner.id, rent, `Rent for ${prop.name}`);
                  }}
                >
                  Pay Rent
                </button>
                <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-50" onClick={() => setRentForm({ playerId: "", property: "", diceTotal: "" })}>
                  Clear
                </button>
              </div>
            </div>
            </section>
          </div>

          {/* History */}
          <section className="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-semibold">History</h2>
            {history.length === 0 ? (
              <div className="text-sm text-slate-500">No actions yet.</div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {history.map((t) => (
                  <li key={t.id} className="py-2 text-sm">
                    <HistoryRow txn={t} players={players} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <footer className="mt-10 text-center text-xs text-slate-500">Mortgages enabled (10% to lift).</footer>
      </div>
    </div>
  );
}

// ===== Chips =====
function PropertyChip({ prop, COLORS }: { prop: any; COLORS: any }) {
  const payload = JSON.stringify({ type: "property", name: prop.name, price: prop.price });
  const color = COLORS[prop.color];
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", payload)}
      className="cursor-grab select-none rounded-md bg-white px-3 py-2 text-sm ring-1 ring-slate-200 active:cursor-grabbing flex items-center justify-between gap-3"
      style={{ boxShadow: `inset 0 0 0 2px ${color.hex}30, 0 0 10px 1px ${color.hex}40` }}
      title={`Drag ${prop.name} ($${prop.price})`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-slate-800">{prop.name}</div>
        <div className="text-[10px] uppercase tracking-wide" style={{ color: color.hex }}>{color.label}</div>
      </div>
      <div className="text-xs font-semibold text-slate-700">${prop.price}</div>
    </div>
  );
}

function CustomChip({ price }: { price: number }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ type: "custom", price }))}
      className="select-none rounded-md bg-slate-100 px-3 py-2 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-200 cursor-grab active:cursor-grabbing flex items-center justify-between"
      title={`Drag $${price} to a player`}
    >
      <div>Custom</div>
      <div>${price}</div>
    </div>
  );
}

// ===== Tiny Icons =====
function TinyHouses({ level, colorHex }: { level: number; colorHex: string }) {
  // level: 0..5 (5 = hotel)
  if (level <= 0) return null;
  const boxes = [] as JSX.Element[];
  if (level === 5) {
    boxes.push(<span key="hotel" className="inline-block h-2.5 w-3 rounded-sm" style={{ background: colorHex }} title="Hotel" />);
  } else {
    for (let i = 0; i < level; i++) boxes.push(<span key={i} className="inline-block h-2 w-2 rounded-[2px]" style={{ background: colorHex }} title="House" />);
  }
  return <span className="ml-1 inline-flex items-center gap-0.5 align-middle">{boxes}</span>;
}

// ===== Player Card =====
function PlayerCard({
  player,
  selected,
  onSelect,
  onRemove,
  onAdjust,
  onPassGo,
  onPurchase,
  onBuild,
  onSell,
  onBuildSet,
  onMortgage,
  onUnmortgage,
  denominations,
  ownsFullSet,
  getProperty,
  getLevel,
  isMortgaged,
  COLORS,
}: {
  player: { id: string; name: string; cash: number; properties: string[] };
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onAdjust: (delta: number, note?: string) => void;
  onPassGo: () => void;
  onPurchase: (propName: string, price: number) => void;
  onBuild: (propName: string) => void;
  onSell: (propName: string) => void;
  onBuildSet: (color: ColorKey) => void;
  onMortgage: (name: string) => void;
  onUnmortgage: (name: string) => void;
  denominations: number[];
  ownsFullSet: (player: any, color: any) => boolean;
  getProperty: (name: string) => any;
  getLevel: (name: string) => number;
  isMortgaged: (name: string) => boolean;
  COLORS: any;
}) {
  const [custom, setCustom] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // collect colors this player owns at least one property in
  const ownedColors = Array.from(new Set(
    player.properties.map(getProperty).filter(Boolean).map((p: any) => p.color).filter((c: ColorKey) => c !== "railroad" && c !== "utility")
  )) as ColorKey[];

  return (
    <div
      className={`rounded-xl bg-white p-4 shadow-sm ring-2 transition ${
        dragOver ? "ring-blue-400" : selected ? "ring-blue-300" : "ring-slate-200"
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const data = e.dataTransfer.getData("text/plain");
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "property") onPurchase(parsed.name, parsed.price);
          else if (parsed.type === "custom") onAdjust(-parsed.price, `Custom -$${parsed.price}`);
        } catch {
          const price = parseInt(data || "0", 10);
          if (price > 0) onAdjust(-price, `-${price}`);
        }
      }}
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div className="text-sm uppercase tracking-wide text-slate-500">Player</div>
          <div className="text-xl font-semibold">{player.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold ring-1 ring-amber-300 hover:bg-amber-200"
            onClick={(e) => {
              e.stopPropagation();
              onPassGo();
            }}
            title="Collect $200 for passing GO"
          >
            +$200 GO
          </button>
          <button
            className="rounded-md bg-white px-2 py-1 text-xs font-medium text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mb-3 text-3xl font-bold">${player.cash.toLocaleString()}</div>

      {/* Set-wide build button (only if full set owned) */}
      {ownedColors.map((c) => (
        ownsFullSet(player, c) ? (
          <div key={c} className="mb-2 flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-[11px] ring-1 ring-slate-200">
            <div className="flex items-center gap-2" style={{ color: COLORS[c].hex }}>
              <span className="font-semibold">{COLORS[c].label}</span>
              <span className="text-slate-500">House cost {COLORS[c].houseCost ? `$${COLORS[c].houseCost}` : "—"}</span>
            </div>
            <button
              className="rounded-md bg-slate-100 px-2 py-1 font-semibold ring-1 ring-slate-200 hover:bg-slate-200"
              onClick={(e) => { e.stopPropagation(); onBuildSet(c); }}
              title="Add one house to each property in this set"
            >
              + House on all in set
            </button>
          </div>
        ) : null
      ))}

      {/* Owned properties with build/sell/mortgage controls */}
      <div className="mb-3 space-y-1">
        {player.properties.length === 0 ? (
          <div className="text-xs text-slate-500">No properties yet.</div>
        ) : (
          player.properties.map((name) => {
            const prop = getProperty(name);
            if (!prop) return null;
            const full = ownsFullSet(player, prop.color);
            const lvl = getLevel(name);
            const color = COLORS[prop.color];
            const mort = isMortgaged(name);
            const glow = full ? { boxShadow: `0 0 0 1px ${color.hex}, 0 0 10px 1px ${color.hex}66` } : {};
            return (
              <div key={name} className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1 text-xs ring-1 ring-slate-200" style={{ color: color.hex, ...glow }}>
                <div className="min-w-0 flex-1 truncate text-slate-800" style={{ color: color.hex }}>
                  {name}
                  {mort && <span className="ml-2 rounded bg-slate-200 px-1 py-0.5 text-[10px] uppercase text-slate-700">MORTGAGED</span>}
                </div>
                {prop.kind === "color" && (
                  <div className="mr-1"><TinyHouses level={lvl} colorHex={color.hex} /></div>
                )}
                <div className="flex items-center gap-1">
                  {prop.kind === "color" && (
                    <>
                      <button
                        className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold ring-1 ring-slate-200 hover:bg-slate-200"
                        onClick={(e) => { e.stopPropagation(); onBuild(name); }}
                        title={`Build ${lvl<4?"house":"hotel"} (${prop.houseCost ? `$${prop.houseCost}` : "—"})`}
                        disabled={mort}
                      >
                        +
                      </button>
                      <button
                        className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold ring-1 ring-slate-200 hover:bg-slate-200"
                        onClick={(e) => { e.stopPropagation(); onSell(name); }}
                        title={lvl===5?"Sell hotel (refund 50%)":"Sell house (refund 50%)"}
                        disabled={lvl===0}
                      >
                        −
                      </button>
                    </>
                  )}
                  {!mort ? (
                    <button className="rounded-md bg-slate-100 px-2 py-1 text-[11px] ring-1 ring-slate-200 hover:bg-slate-200" onClick={(e) => { e.stopPropagation(); onMortgage(name); }}
                      title="Mortgage (receive 50% of price)" disabled={prop.kind === "color" && lvl>0}>$</button>
                  ) : (
                    <button className="rounded-md bg-slate-100 px-2 py-1 text-[11px] ring-1 ring-slate-200 hover:bg-slate-200" onClick={(e) => { e.stopPropagation(); onUnmortgage(name); }}
                      title="Unmortgage (pay 110% of mortgage value)">$$</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick +/- */}
      <div className="mb-3 flex flex-wrap gap-2">
        {denominations.map((d) => (
          <div key={d} className="flex gap-1">
            <button
              className="rounded-md bg-slate-100 px-2 py-1 text-sm ring-1 ring-slate-200 hover:bg-slate-200"
              onClick={(e) => {
                e.stopPropagation();
                onAdjust(d, `+${d}`);
              }}
              title={`Add ${d}`}
            >
              +{d}
            </button>
            <button
              className="rounded-md bg-slate-100 px-2 py-1 text-sm ring-1 ring-slate-200 hover:bg-slate-200"
              onClick={(e) => {
                e.stopPropagation();
                onAdjust(-d, `-${d}`);
              }}
              title={`Subtract ${d}`}
            >
              -{d}
            </button>
          </div>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-700">Custom amount</label>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = parseInt(custom || "0", 10);
                if (v > 0) {
                  onAdjust(v, `+${v}`);
                  setCustom("");
                }
              }
            }}
          />
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            onClick={(e) => {
              e.stopPropagation();
              const v = parseInt(custom || "0", 10);
              if (v > 0) {
                onAdjust(v, `+${v}`);
                setCustom("");
              }
            }}
          >
            + Add
          </button>
          <button
            className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            onClick={(e) => {
              e.stopPropagation();
              const v = parseInt(custom || "0", 10);
              if (v > 0) {
                onAdjust(-v, `-${v}`);
                setCustom("");
              }
            }}
          >
            − Subtract
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-500">Tip: drag to reorder players. Drop bank property chip here to buy. Use + / − to build or sell. $ to mortgage, $$ to unmortgage.</div>
    </div>
  );
}

// ===== History =====
function HistoryRow({ txn, players }: { txn: any; players: { id: string; name: string }[] }) {
  const playerName = (id?: string) => {
    if (id === "BANK") return "Bank";
    return players.find((p) => p.id === id)?.name ?? "?";
  };
  const time = new Date(txn.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  let text = "";
  switch (txn.kind) {
    case "add":
      text = `${time} · ${playerName(txn.playerId)} +$${txn.amount}${txn.note ? ` · ${txn.note}` : ""}`;
      break;
    case "subtract":
      text = `${time} · ${playerName(txn.playerId)} -$${txn.amount}${txn.note ? ` · ${txn.note}` : ""}`;
      break;
    case "transfer":
      text = `${time} · ${playerName(txn.fromId)} → ${playerName(txn.toId)} $${txn.amount}${txn.note ? ` · ${txn.note}` : ""}`;
      break;
    case "acquire":
      text = `${time} · ${playerName(txn.playerId)} acquired ${txn.propertyName} ($${txn.amount})`;
      break;
    case "build":
      text = `${time} · ${playerName(txn.playerId)} built on ${txn.propertyName} → level ${txn.newLevel}`;
      break;
    case "sell":
      text = `${time} · ${playerName(txn.playerId)} sold on ${txn.propertyName} → level ${txn.newLevel}`;
      break;
    case "mortgage":
      text = `${time} · ${playerName(txn.playerId)} mortgaged ${txn.propertyName} (+$${txn.amount})`;
      break;
    case "unmortgage":
      text = `${time} · ${playerName(txn.playerId)} unmortgaged ${txn.propertyName} (−$${txn.amount})`;
      break;
    case "set-start":
      text = `${time} · Set starting cash to $${txn.amount}`;
      break;
    case "add-player":
      text = `${time} · Added player ${txn.note}`;
      break;
    case "remove-player":
      text = `${time} · Removed player ${txn.note}`;
      break;
    case "reset":
      text = `${time} · New game`;
      break;
    default:
      text = `${time} · Action`;
  }

  return <div className="text-slate-700">{text}</div>;
}
