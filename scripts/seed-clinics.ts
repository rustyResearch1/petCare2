// Usage: npm run seed:clinics -- [path/to/clinics.csv]
import fs from "node:fs/promises";
import { connect } from "../src/lib/db/connect";
import { importClinicsCsv } from "../src/lib/clinic-import";

const file = process.argv[2] ?? "data/clinics.csv";
const db = await connect();
const result = await importClinicsCsv(db, await fs.readFile(file, "utf8"));
console.log(`Inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped.length}.`);
process.exit(0);
