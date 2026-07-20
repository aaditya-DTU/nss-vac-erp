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
    password: 'admin123',
    role: 'admin',
    isVerified: true,
  });

  const demoStudents = [
    { name: 'Aditya Sharma', email: 'aditya@dtu.ac.in', rollNo: '2K23/MC/01', branch: 'MC', year: 2, section: 'A' },
    { name: 'Priya Verma', email: 'priya@dtu.ac.in', rollNo: '2K23/MC/02', branch: 'MC', year: 2, section: 'A' },
    { name: 'Rohan Gupta', email: 'rohan@dtu.ac.in', rollNo: '2K23/CO/03', branch: 'CO', year: 2, section: 'B' },
  ];
  const students = [];
  for (const s of demoStudents) {
    students.push(await User.create({ ...s, password: 'student123', role: 'student', isVerified: true }));
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

  console.log('Seed complete. Admin login: admin@dtu.ac.in / admin123');
  console.log('Student login: aditya@dtu.ac.in / student123');
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
