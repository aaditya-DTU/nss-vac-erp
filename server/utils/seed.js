require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Task = require('../models/Task');
const Event = require('../models/Event');
const KnowledgeBase = require('../models/KnowledgeBase');
const { defaultFaqs } = require('./defaultFaqs');

async function seed() {
  await connectDB();
  await Promise.all([User.deleteMany({}), Task.deleteMany({}), Event.deleteMany({}), KnowledgeBase.deleteMany({})]);

  await KnowledgeBase.insertMany(defaultFaqs());

  const admin = await User.create({
    name: 'Dr. NSS Coordinator',
    email: '',
    password: '',
    role: 'admin',
    isVerified: true,
  });

  const demoStudents = [
    { name: 'Demo', email: '', rollNo: 'demo', branch: 'NA', year: 1, section: 'NA' },
  ];
  const students = [];
  for (const s of demoStudents) {
    students.push(await User.create({ ...s, password: '', role: 'student', isVerified: true }));
  }


  console.log('Seed complete.');
  console.log('Student login');
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
