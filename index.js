const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({ extended: false })); 
app.use(bodyParser.json()); 
app.use(express.json());
const port = 5000; // Adjust port number as needed

// Database credentials
const pool = mysql.createPool({
  host: 'b2cwvpycxa3xk9f7xobm-mysql.services.clever-cloud.com',
  user: 'ul0ysua2i4suynpe',
  password: 'zqd1ZAQj4n8yzWnjPq7U',
  database: 'b2cwvpycxa3xk9f7xobm'
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).send('Unauthorized access: Token missing');
  jwt.verify(token.replace('Bearer ', ''), 'diane', (err, decoded) => {
    if (err) {
      console.error(err);
      return res.status(403).send('Unauthorized access: Invalid or expired token');
    }
    req.userId = decoded.id;
    next();
  });
};

app.get('/', (req, res) => {
  res.send('Hey from Api!')
})
// Get all data from a roles table
app.get('/students',verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM students');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving roles');
  }
});

// Select Single role
app.get('/students/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM students WHERE stud_id = ?', [id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error showing role');
  }
});

// Insert data into roles table
app.post('/students', verifyToken, async (req, res) => {
  const { inst_id, name, reg_no, created_at, updated_at, created_by, updated_by } = req.body; // Destructure data from request body
  if (!inst_id || !name || !reg_no || !created_at || !updated_at || !created_by || !updated_by ) {
    return res.status(400).send('Please provide all required fields');
  }
  try {
    const [result] = await pool.query('INSERT INTO students SET ?', { inst_id, name, reg_no,  created_at, updated_at, created_by, updated_by });
    res.json({ message: `student inserted successfully with ID: ${result.insertId}` });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error inserting role');
  }
});

// Update role
app.put('/students/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  const { inst_id, name, reg_no, created_at, updated_at, created_by, updated_by } = req.body; // Destructure data from request body
  if (!inst_id || !name || !reg_no || !created_at || !updated_at || !created_by || !updated_by ) {
    return res.status(400).send('Please provide all required fields');
  }
  try {
    const [result] = await pool.query('UPDATE students SET inst_id=?, name=?, reg_no=?, created_at=?, updated_at=?, created_by=?, updated_by=? WHERE stud_id = ?', [inst_id,  name, reg_no, created_at, updated_at, created_by, updated_by, id]);
    const [rows] = await pool.query('SELECT * FROM students WHERE stud_id = ?', [id]);
    res.json(rows); // Use ID from request params
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating student');
  }
});

// PATCH route to partially update reg_no and name of an existing student
app.patch('/students/:id', verifyToken, async (req, res) => {
  const studentId = req.params.id;
  const { reg_no, name } = req.body; // Destructure reg_no and name from request body
  if (!reg_no && !name) {
      return res.status(400).send('Please provide at least one field to update ');
  }
  try {
      let updateData = {};
      if (name) updateData.name = name;
      if (reg_no) updateData.reg_no = reg_no;
      const [result] = await pool.query('UPDATE students SET ? WHERE stud_id=?', [updateData, studentId]);
      if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Student not found' });
      } else {
          res.status(200).json({ message: 'Student updated successfully' });
      }
  } catch (err) {
      console.error(err);
      res.status(500).send('Error updating student');
  }
});


// Delete role by ID
app.delete('/students/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM students WHERE stud_id = ?', [id]);
    res.json({ message: `Data with ID ${id} deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting role');
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username,password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!users.length) {
      return res.status(404).send('User not found');
    }

    const user = users[0];
    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).send('Invalid password');
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, 'diane', { expiresIn: '1h' });

    // Send the token as response
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error logging in');
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
