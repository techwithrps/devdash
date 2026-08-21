const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3847;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Helper to format PostgreSQL row into frontend camelCase format
function formatEntry(row) {
  return {
    id: row.id.toString(),
    memberName: row.member_name,
    codebase: row.codebase,
    task: row.task,
    comment: row.comment,
    files: Array.isArray(row.files) ? row.files : (typeof row.files === 'string' ? JSON.parse(row.files) : []),
    status: row.status,
    lastUpdated: formatDateString(row.last_updated),
    completedOn: row.completed_on ? formatDateString(row.completed_on) : null,
    createdAt: row.created_at
  };
}

function formatDateString(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = hours.toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hoursStr}:${minutes} ${ampm}`;
}

// 1. Health check & PostgreSQL DB status
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT current_database(), current_user, version(), COUNT(*) as total_entries FROM work_entries');
    res.json({
      status: 'ok',
      database: result.rows[0].current_database,
      user: result.rows[0].current_user,
      totalEntries: parseInt(result.rows[0].total_entries, 10),
      postgresConnected: true
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message, postgresConnected: false });
  }
});

// 2. GET all work status entries
app.get('/api/entries', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM work_entries ORDER BY last_updated DESC, id DESC');
    const formatted = result.rows.map(formatEntry);
    res.json({
      success: true,
      entries: formatted,
      lastUpdatedTime: formatted.length > 0 ? formatted[0].lastUpdated : formatDateString(new Date())
    });
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. POST - Create new entry
app.post('/api/entries', async (req, res) => {
  try {
    const { memberName, codebase, task, comment, files, status } = req.body;

    if (!memberName || !codebase || !task || !comment) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const filesArray = Array.isArray(files) ? files : [];
    const entryStatus = status === 'completed' ? 'completed' : 'working';
    const now = new Date();
    const completedOn = entryStatus === 'completed' ? now : null;

    const queryText = `
      INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
      RETURNING *
    `;
    const values = [memberName, codebase, task, comment, JSON.stringify(filesArray), entryStatus, now, completedOn];

    const result = await db.query(queryText, values);
    const newEntry = formatEntry(result.rows[0]);

    res.status(201).json({ success: true, entry: newEntry });
  } catch (error) {
    console.error('Error adding entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. PUT - Update existing entry
app.put('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { memberName, codebase, task, comment, files, status } = req.body;

    // Check existing
    const checkRes = await db.query('SELECT * FROM work_entries WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    const prev = checkRes.rows[0];
    const filesArray = Array.isArray(files) ? files : [];
    const entryStatus = status === 'completed' ? 'completed' : 'working';
    const now = new Date();
    let completedOn = prev.completed_on;

    if (entryStatus === 'completed' && prev.status !== 'completed') {
      completedOn = now;
    } else if (entryStatus === 'working') {
      completedOn = null;
    }

    const queryText = `
      UPDATE work_entries
      SET member_name = $1,
          codebase = $2,
          task = $3,
          comment = $4,
          files = $5::jsonb,
          status = $6,
          last_updated = $7,
          completed_on = $8
      WHERE id = $9
      RETURNING *
    `;
    const values = [memberName, codebase, task, comment, JSON.stringify(filesArray), entryStatus, now, completedOn, id];

    const result = await db.query(queryText, values);
    const updatedEntry = formatEntry(result.rows[0]);

    res.json({ success: true, entry: updatedEntry });
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. PATCH - Quick Status update
app.patch('/api/entries/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['working', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    const now = new Date();
    const completedOn = status === 'completed' ? now : null;

    const queryText = `
      UPDATE work_entries
      SET status = $1,
          last_updated = $2,
          completed_on = $3
      WHERE id = $4
      RETURNING *
    `;
    const values = [status, now, completedOn, id];

    const result = await db.query(queryText, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    const updatedEntry = formatEntry(result.rows[0]);
    res.json({ success: true, entry: updatedEntry });
  } catch (error) {
    console.error('Error changing status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. DELETE - Remove entry
app.delete('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM work_entries WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. POST - Reset to sample seed data in PostgreSQL
app.post('/api/reset-demo', async (req, res) => {
  try {
    await db.query('TRUNCATE work_entries RESTART IDENTITY');
    
    const seedInserts = [
      `INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
       VALUES ('Rahul Sharma', 'Fleet Management', 'attachVehicle()', 'Adding validation for vehicle attachment and improved error handling.', '["VehicleService.ts", "vehicleController.ts", "vehicleRoutes.ts", "Vehicle.ts", "VehicleForm.tsx"]'::jsonb, 'working', '2025-05-22 10:30:00+05:30', NULL)`,
      `INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
       VALUES ('Amit Verma', 'College ERP', 'calculateFine()', 'Fine calculation logic based on new rules.', '["FeeService.ts", "fineCalculation.ts", "feeController.ts"]'::jsonb, 'working', '2025-05-22 09:15:00+05:30', NULL)`,
      `INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
       VALUES ('Priya Mehta', 'ICEGATE Automation', 'signFile()', 'Integrating DSC and file signing API.', '["signService.ts", "fileSigner.ts", "icegateApi.ts", "utils.ts"]'::jsonb, 'working', '2025-05-22 09:05:00+05:30', NULL)`,
      `INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
       VALUES ('Sandeep Kumar', 'Fleet Management', 'VehicleList.tsx', 'UI enhancements for vehicle list page.', '["VehicleList.tsx", "vehicleFilters.ts", "vehicleTypes.ts", "vehicleTable.tsx"]'::jsonb, 'completed', '2025-05-22 08:45:00+05:30', '2025-05-22 08:45:00+05:30')`,
      `INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
       VALUES ('Neha Singh', 'College ERP', 'generateReceipt()', 'Receipt generation format updated.', '["receiptService.ts", "receiptTemplate.html", "receiptController.ts"]'::jsonb, 'completed', '2025-05-22 08:20:00+05:30', '2025-05-22 08:20:00+05:30')`,
      `INSERT INTO work_entries (member_name, codebase, task, comment, files, status, last_updated, completed_on)
       VALUES ('Vikas Patel', 'ElogiPark SQL', 'bedAllotment()', 'Fixing bed allotment conflict issue.', '["bedAllotment.ts", "bedService.ts", "allotmentController.ts"]'::jsonb, 'completed', '2025-05-22 08:10:00+05:30', '2025-05-22 08:10:00+05:30')`
    ];

    for (const query of seedInserts) {
      await db.query(query);
    }

    const all = await db.query('SELECT * FROM work_entries ORDER BY last_updated DESC, id DESC');
    res.json({ success: true, entries: all.rows.map(formatEntry) });
  } catch (error) {
    console.error('Error resetting demo data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Team Work Status Dashboard running on http://localhost:${PORT}`);
  console.log(`🐘 Connected to PostgreSQL Database: ${process.env.PGDATABASE || 'teamdashboard'}`);
});
