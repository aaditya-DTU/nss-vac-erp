require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Task = require("../models/Task");
const Event = require("../models/Event");
const KnowledgeBase = require("../models/KnowledgeBase");
const { defaultFaqs } = require("./defaultFaqs");

// Credentials come from .env (never hardcoded/committed) — see .env.example
// for the required keys. Fails fast rather than silently seeding a weak
// default if any are missing, since this script can run against a real
// deployed database.
const {
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD,
  SEED_DEMO_EMAIL,
  SEED_DEMO_PASSWORD,
} = process.env;

function requireEnv() {
  const missing = [
    "SEED_ADMIN_EMAIL",
    "SEED_ADMIN_PASSWORD",
    "SEED_DEMO_EMAIL",
    "SEED_DEMO_PASSWORD",
  ].filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(
      `Missing required env vars for seeding: ${missing.join(", ")}`,
    );
    console.error(
      "Set these in your .env before running the seed script — see .env.example.",
    );
    process.exit(1);
  }
}

async function seed() {
  requireEnv();
  await connectDB();
  await Promise.all([
    User.deleteMany({}),
    Task.deleteMany({}),
    Event.deleteMany({}),
    KnowledgeBase.deleteMany({}),
  ]);

  await KnowledgeBase.insertMany(defaultFaqs());

  const admin = await User.create({
    name: "Dr. NSS Coordinator",
    email: SEED_ADMIN_EMAIL,
    password: SEED_ADMIN_PASSWORD,
    role: "admin",
    isVerified: true,
  });

  const demoStudents = [
    {
      name: "Demo",
      email: SEED_DEMO_EMAIL,
      rollNo: "demo",
      branch: "NA",
      year: 1,
      section: "NA",
    },
  ];
  const students = [];
  for (const s of demoStudents) {
    students.push(
      await User.create({
        ...s,
        password: SEED_DEMO_PASSWORD,
        role: "student",
        isVerified: true,
      }),
    );
  }


  console.log("Seed complete.");
  console.log(`Admin login: ${SEED_ADMIN_EMAIL} / (password from .env)`);
  console.log(`Student login: ${SEED_DEMO_EMAIL} / (password from .env)`);
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
