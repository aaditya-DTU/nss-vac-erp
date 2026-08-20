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
    email: 'admin@dtu.ac.in',
    password: '@Admin2609',
    role: 'admin',
    isVerified: true,
  });

  const demoStudents = [
    { name: 'Demo', email: 'demo@dtu.ac.in', rollNo: 'demo', branch: 'NA', year: 1, section: 'NA' },
  ];
  const students = [];
  for (const s of demoStudents) {
    students.push(await User.create({ ...s, password: '@Demo2609', role: 'student', isVerified: true }));
  }

  await Task.create({
    title: 'Plantation Drive at DTU Campus',
    description: 'Plant and label at least 5 saplings near the main auditorium. Submit a photo as proof.',
    category: 'plantation',
    createdBy: admin._id,
    assignedTo: { scope: 'all' },
    points: 20,
    hoursWorth: 3,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    proofType: 'image',
  });

  await Event.create({
    title: 'Blood Donation Camp',
    description: 'Annual NSS blood donation camp in collaboration with Red Cross.',
    location: 'DTU Sports Complex',
    createdBy: admin._id,
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
    hoursWorth: 4,
    pointsWorth: 30,
  });

  console.log('Seed complete. Admin login: admin@dtu.ac.in / @Admin2609');
  console.log('Student login: demo@dtu.ac.in / @Demo2609');
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
