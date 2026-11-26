/**
 * Loads demo data: 5 fake customers and about 30 entries.
 * Usage: npm run seed            (only into an empty database)
 *        npm run seed -- --force (wipes existing data first)
 */
import path from "node:path";
import { openDatabase } from "../src/lib/db/open";
import { createRepo } from "../src/lib/repo/repo";
import { addDays, todayIn } from "../src/lib/dates";

const file = path.resolve(process.env.DATABASE_PATH ?? "./data/ledger.db");
const force = process.argv.includes("--force");
const db = openDatabase(file);
const repo = createRepo(db);

if (repo.listCustomerSummaries(todayIn("Asia/Kolkata"), { includeInactive: true }).length > 0) {
  if (!force) {
    console.error("Database already has customers. Use `npm run seed -- --force` to wipe and reseed.");
    process.exit(1);
  }
  repo.importAll({ customers: [], entries: [], settings: [] });
}

const today = todayIn(process.env.APP_TIMEZONE ?? "Asia/Kolkata");
const d = (daysAgo: number) => addDays(today, -daysAgo);
const rs = (rupees: number) => Math.round(rupees * 100);

repo.saveSettings({
  shopName: "Sharma General Store",
  upiId: "sharmastore@okaxis",
  templates: repo.getSettings().templates,
});

type Seed = { name: string; phone: string; dueDay: number; limit?: number; language: string; entries: Array<[number, "credit" | "payment", number, string]> };

// Due days are picked relative to today so the demo always shows every status.
const dayOf = (offset: number) => Number(addDays(today, offset).slice(8, 10));

const customers: Seed[] = [
  {
    name: "Ramesh Gupta",
    phone: "+919876543210",
    dueDay: dayOf(-6), // passed 6 days ago: overdue
    limit: 5000,
    language: "hi",
    entries: [
      [44, "credit", 1850, "Opening balance"],
      [38, "credit", 620, "rice 5kg, oil 1L"],
      [30, "payment", 1500, "cash"],
      [24, "credit", 340, "sugar 2kg, tea"],
      [15, "credit", 1275.5, "atta 10kg, dal"],
      [9, "credit", 410, "soap, toothpaste"],
      [3, "credit", 2280, "monthly ration"],
    ],
  },
  {
    name: "Sunita Devi",
    phone: "+919812345678",
    dueDay: dayOf(3), // due in 3 days
    language: "hi",
    entries: [
      [40, "credit", 900, "Opening balance"],
      [33, "payment", 900, "UPI"],
      [20, "credit", 560, "milk powder, biscuits"],
      [12, "credit", 735, "oil 2L, masala"],
      [5, "credit", 190, "eggs, bread"],
      [1, "credit", 260, "vegetables"],
    ],
  },
  {
    name: "Mohammed Aslam",
    phone: "+919900112233",
    dueDay: dayOf(15),
    limit: 3000,
    language: "en",
    entries: [
      [35, "credit", 1200, "Opening balance"],
      [27, "credit", 480, "rice 5kg"],
      [21, "payment", 1000, "cash"],
      [14, "credit", 850, "groceries"],
      [6, "credit", 1320, "atta, sugar, oil"],
    ],
  },
  {
    name: "Priya Sharma",
    phone: "+919765432109",
    dueDay: dayOf(10),
    language: "en",
    entries: [
      [30, "credit", 640, "groceries"],
      [25, "credit", 310, "detergent"],
      [18, "payment", 950, "UPI"],
      [8, "credit", 420, "fruits, curd"],
      [2, "payment", 420, "cash"],
    ],
  },
  {
    name: "Kailash Yadav",
    phone: "+918877665544",
    dueDay: dayOf(-2), // passed 2 days ago
    language: "hi",
    entries: [
      [42, "credit", 3100, "Opening balance"],
      [36, "payment", 2000, "cash"],
      [28, "credit", 890, "rice 10kg"],
      [19, "credit", 455, "oil, salt"],
      [11, "payment", 1000, "UPI"],
      [7, "credit", 1680, "monthly ration"],
      [4, "credit", 225, "tea, sugar"],
    ],
  },
];

let count = 0;
for (const c of customers) {
  const id = repo.createCustomer(
    { name: c.name, phone: c.phone, dueDay: c.dueDay, creditLimit: c.limit ? rs(c.limit) : null, notes: "", language: c.language },
    0,
    today,
  );
  for (const [ago, type, amount, note] of c.entries) {
    repo.addEntry({ customerId: id, type, amount: rs(amount), note, entryDate: d(ago) });
    count++;
  }
}

console.log(`Seeded ${customers.length} customers and ${count} entries into ${file}`);
db.$client.close();
