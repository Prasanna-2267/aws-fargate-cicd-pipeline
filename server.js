
const http = require("http");
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
});

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json"
    });
    res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
    // Basic health check
    if (req.method === "GET" && req.url === "/") {
        return sendJSON(res, 200, {
            message: "Hello from AWS EC2!",
            status: "success"
        });
    }

    // Check database connectivity
    if (req.method === "GET" && req.url === "/health/db") {
        try {
            await pool.query("SELECT 1");
            return sendJSON(res, 200, {
                status: "success",
                database: "connected"
            });
        } catch (error) {
            console.error("Database health check failed:", error.message);
            return sendJSON(res, 503, {
                status: "error",
                database: "unavailable"
            });
        }
    }

    // Create the students table
    if (req.method === "POST" && req.url === "/setup") {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS students (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            return sendJSON(res, 200, {
                message: "Students table is ready"
            });
        } catch (error) {
            console.error("Table setup failed:", error.message);
            return sendJSON(res, 500, {
                error: "Could not set up table"
            });
        }
    }

    // Retrieve students
    if (req.method === "GET" && req.url === "/students") {
        try {
            const result = await pool.query(
                "SELECT id, name, created_at FROM students ORDER BY id"
            );

            return sendJSON(res, 200, {
                count: result.rowCount,
                students: result.rows
            });
        } catch (error) {
            console.error("Fetch students failed:", error.message);
            return sendJSON(res, 500, {
                error: "Could not retrieve students. Run POST /setup first."
            });
        }
    }

    // Insert a student
    if (req.method === "POST" && req.url === "/students") {
        let body = "";

        req.on("data", chunk => {
            body += chunk;

            if (body.length > 10000) {
                req.destroy();
            }
        });

        req.on("end", async () => {
            try {
                const data = JSON.parse(body);

                if (
                    typeof data.name !== "string" ||
                    !data.name.trim() ||
                    data.name.trim().length > 100
                ) {
                    return sendJSON(res, 400, {
                        error: "Provide a name between 1 and 100 characters"
                    });
                }

                const result = await pool.query(
                    "INSERT INTO students (name) VALUES ($1) RETURNING id, name, created_at",
                    [data.name.trim()]
                );

                return sendJSON(res, 201, {
                    message: "Student created",
                    student: result.rows[0]
                });
            } catch (error) {
                console.error("Create student failed:", error.message);

                return sendJSON(res, 400, {
                    error: "Invalid request or database operation failed"
                });
            }
        });

        return;
    }

    return sendJSON(res, 404, {
        error: "Route not found"
    });
});

server.listen(3000, "0.0.0.0", () => {
    console.log("API running on port 3000");
});

async function shutdown() {
    server.close();
    await pool.end();
    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
