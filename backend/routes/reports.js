// backend/routes/reports.js

const express = require('express');
const router = express.Router();
// NOTE: Make sure your models file exports 'MissingReport'
const { MissingReport } = require('../models');

// @route   POST api/reports
router.post('/', async (req, res) => {
    const { user, person_name, gender, age, last_seen } = req.body;
    try {
        if (!user || !person_name || !gender || !age || !last_seen) {
            return res.status(400).json({ msg: 'Please provide all required fields.' });
        }
        const newReport = new MissingReport(req.body);
        await newReport.save();
        res.status(201).json({ msg: 'Report submitted successfully', report: newReport });
    } catch (err) {
        console.error('🔴 [Backend Error] POST /api/reports:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/reports/:id
router.get('/:id', async (req, res) => {
    try {
        const report = await MissingReport.findById(req.params.id).populate('user', 'name email');
        if (!report) return res.status(404).json({ msg: 'Report not found' });
        res.json(report);
    } catch (err) {
        console.error(`🔴 [Backend Error] GET /api/reports/${req.params.id}:`, err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;