const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = 3000;

//Connection to database
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'QAP3',
    password: 'password',
    port: 5432,
  });

app.use(express.json());

let tasks = [
    { id: 1, description: 'Buy groceries', status: 'incomplete' },
    { id: 2, description: 'Read a book', status: 'complete' },
];

// function to create tasks table
async function createTasksTable() {
    try {
        await pool.query(
            `CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            description TEXT NOT NULL,
            status TEXT NOT NULL
            );`
        )
    } catch(error) {
        console.error("Error creating tasks table: ", error);
    }
}

//data validation function
const validateTask = (description, status) => {
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return "Tasks description is required.";
    }
    if (!status || typeof status !== 'string' || status.trim().length === 0) {
        return "Status of task is required.";
    }
     return null;
}

// GET /tasks - Get all tasks
app.get('/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        response.status(500).send("Server error.");
    }
});

// POST /tasks - Add a new task
app.post('/tasks', async (request, response) => {
    const {description, status} = request.body;

    //validate data
    const validationError = validateTask(description, status);
    if (validationError) {
        return response.status(500).send(validationError);
    }

    try {
        const result = await pool.query(
            'INSERT INTO tasks (description, status) VALUES ($1, $2) RETURNING *', [description, status]
        );

         //update the in memory array
        const newTask = result.rows[0];
        tasks.push(newTask);

        response.status(201).json(newTask);
    } catch (error) {
        console.error("Error adding task:", error);
        response.status(500).send("Server error.");
    }
});

// PUT /tasks/:id - Update a task's status
app.put('/tasks/:id', async (request, response) => {
    const {id} = request.params;
    const {status} = request.body;

    //validation for status
    if (!status || typeof status !== 'string' || status.trim().length === 0) {
        response.status(400).send("Status of task is required");
    }

    try {
        const result = await pool.query(
            'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *', [status, id]
        );

        if (result.rows.length === 0) {
            return response.status(404).send('Task not found');
        }
        response.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        response.status(500).send("Server error");
    }
});

// DELETE /tasks/:id - Delete a task
app.delete('/tasks/:id', (request, response) => {
    const taskId = parseInt(request.params.id, 10);
    const initialLength = tasks.length;
    tasks = tasks.filter(t => t.id !== taskId);

    if (tasks.length === initialLength) {
        return response.status(404).json({ error: 'Task not found' });
    }
    response.json({ message: 'Task deleted successfully' });
});

// initalize database before starting server
createTasksTable()
    .then(() => app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`)));
