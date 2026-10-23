const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json({ limit: "20kb" }));

const port = Number(process.env.PORT || 3000);
const dbConfig = {
  host: process.env.DB_HOST || "mysql",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "myemail",
  waitForConnections: true,
  connectionLimit: 5
};

const jwtSecret = process.env.JWT_SECRET;
const demoUser = process.env.DEMO_USER || "demo";
const demoPassword = process.env.DEMO_PASSWORD;

if (!dbConfig.password || !jwtSecret || !demoPassword) {
  console.error("Configuração ausente: defina DB_PASSWORD, JWT_SECRET e DEMO_PASSWORD.");
  process.exit(1);
}

const pool = mysql.createPool(dbConfig);

async function initializeDatabase() {
  // O banco pode demorar alguns segundos para iniciar.
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL
        )
      `);
      const passwordHash = await bcrypt.hash(demoPassword, 10);
      await pool.execute(
        `INSERT INTO users (username, password_hash) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE username = VALUES(username)`,
        [demoUser, passwordHash]
      );
      console.log("Banco inicializado e usuário de demonstração verificado.");
      return;
    } catch (error) {
      console.log(`Aguardando MySQL (${attempt}/30): ${error.code || error.message}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  throw new Error("Não foi possível conectar ao MySQL após várias tentativas.");
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Faça login para continuar." });
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida ou expirada. Entre novamente." });
  }
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string" ||
        !username.trim() || !password) {
      return res.status(400).json({ error: "Informe usuário e senha." });
    }
    const [rows] = await pool.execute(
      "SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1",
      [username.trim()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }
    const token = jwt.sign(
      { sub: String(user.id), username: user.username },
      jwtSecret,
      { expiresIn: "30m" }
    );
    return res.json({ token, username: user.username });
  } catch (error) {
    console.error("Erro no login:", error.message);
    return res.status(500).json({ error: "Erro interno ao validar o acesso." });
  }
});

app.post("/api/send-email", requireAuth, (req, res) => {
  const { to, subject, body } = req.body || {};
  if (typeof to !== "string" || typeof subject !== "string" ||
      typeof body !== "string" || !to.trim() || !subject.trim() || !body.trim()) {
    return res.status(400).json({ error: "Preencha destinatário, assunto e mensagem." });
  }
  // Demonstração: nenhum e-mail real é enviado.
  console.log(`Simulação de e-mail solicitada por ${req.user.username}; destinatário=${to}`);
  return res.json({ message: "E-mail simulado com sucesso! Nenhuma mensagem real foi enviada." });
});

initializeDatabase()
  .then(() => app.listen(port, "0.0.0.0", () => console.log(`Backend ouvindo na porta ${port}`)))
  .catch(error => {
    console.error("Falha ao iniciar backend:", error.message);
    process.exit(1);
  });
