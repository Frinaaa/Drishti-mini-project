// seed.js
// Script to add a Police admin user to the database
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const readline = require('readline');
const mongoose = require('mongoose');
const connectDB = require('./db');
const { Role, User } = require('./models');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  await connectDB();
  try {
    let policeRole = await Role.findOne({ role_name: 'Police' });
    if (!policeRole) {
      policeRole = await Role.create({ role_name: 'Police' });
      console.log('Created Police role');
    }
    const name = await ask('Enter Police admin username: ');
    const email = await ask('Enter Police admin email: ');
    const password = await ask('Enter Police admin password: ');
    let existing = await User.findOne({ email });
    if (existing) {
      console.log('User with this email already exists.');
      rl.close();
      mongoose.connection.close();
      return;
    }
    await User.create({
      name,
      email,
      password, // store plain text
      role: policeRole._id,
      is_verified: true
    });
    console.log('Police admin user created successfully.');
  } catch (err) {
    console.error('Error:', err);
  }
  rl.close();
  mongoose.connection.close();
}

main();