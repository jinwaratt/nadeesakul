const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
    host: process.env.HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Multer setup (store in memory before sending to ImgBB)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const JWT_SECRET = 'nadeesakul_super_secret_key_2026'; // In production, use env var

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ImgBB Upload Helper
const uploadToImgBB = async (fileBuffer) => {
    try {
        const formData = new FormData();
        formData.append('image', fileBuffer.toString('base64'));
        
        const response = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, formData, {
            headers: formData.getHeaders()
        });
        
        return response.data.data.url;
    } catch (error) {
        console.error("ImgBB Upload Error:", error.message);
        throw new Error('Failed to upload image to ImgBB');
    }
};

// --- API ENDPOINTS ---

// 1. Admin Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM Account WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            const user = rows[0];
            const token = jwt.sign({ accountId: user.AccountID, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
            res.json({ token, user: { username: user.username } });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// 2. Get All Products (Public)
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Product ORDER BY ProductID DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// 3. Get Distinct Product Types (Public)
app.get('/api/products/types', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT type, COUNT(*) as count FROM Product WHERE isDeleted = FALSE GROUP BY type ORDER BY type'
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// 4. Get Distinct Brands (optionally filtered by type) (Public)
app.get('/api/products/brands', async (req, res) => {
    try {
        const { type } = req.query;
        let query = 'SELECT brand, COUNT(*) as count FROM Product WHERE isDeleted = FALSE';
        const params = [];
        if (type) { query += ' AND type = ?'; params.push(type); }
        query += ' GROUP BY brand ORDER BY brand';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// 5. Search / Filter Products (Public)
app.get('/api/products/search', async (req, res) => {
    try {
        const { q, type, brand } = req.query;
        let query = 'SELECT * FROM Product WHERE isDeleted = FALSE';
        const params = [];
        if (type)  { query += ' AND type = ?';  params.push(type); }
        if (brand) { query += ' AND brand = ?'; params.push(brand); }
        if (q) {
            query += ' AND (name LIKE ? OR description LIKE ? OR type LIKE ? OR brand LIKE ?)';
            params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
        }
        query += ' ORDER BY ProductID DESC';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// 6. Get Single Product (Public)
app.get('/api/products/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Product WHERE ProductID = ?', [req.params.id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// 4. Add Product (Protected)
app.post('/api/products', authenticateToken, upload.single('image'), async (req, res) => {
    const { name, type, brand, price, description, status } = req.body;
    let imageUrl = req.body.image_url || '';

    try {
        if (req.file) {
            imageUrl = await uploadToImgBB(req.file.buffer);
        }

        // Generate a new ProductID (simple logic for now)
        const [rows] = await pool.query('SELECT ProductID FROM Product ORDER BY ProductID DESC LIMIT 1');
        let newId = 'PRD00001';
        if (rows.length > 0) {
            const lastId = rows[0].ProductID;
            const num = parseInt(lastId.replace('PRD', '')) + 1;
            newId = 'PRD' + num.toString().padStart(5, '0');
        }

        await pool.query(
            'INSERT INTO Product (ProductID, name, type, brand, price, description, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [newId, name, type, brand, price, description, imageUrl, status || 1]
        );
        res.status(201).json({ message: 'Product added successfully', id: newId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error adding product' });
    }
});

// 5. Update Product (Protected)
app.put('/api/products/:id', authenticateToken, upload.single('image'), async (req, res) => {
    const { name, type, brand, price, description, status, existing_image_url } = req.body;
    const productId = req.params.id;
    let imageUrl = existing_image_url;

    try {
        if (req.file) {
            imageUrl = await uploadToImgBB(req.file.buffer);
        }

        await pool.query(
            'UPDATE Product SET name = ?, type = ?, brand = ?, price = ?, description = ?, image_url = ?, status = ? WHERE ProductID = ?',
            [name, type, brand, price, description, imageUrl, status, productId]
        );
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating product' });
    }
});

// 9. Delete Product (Protected)
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM Product WHERE ProductID = ?', [req.params.id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting product' });
    }
});

// 10. Update Product Status Only (Protected)
app.patch('/api/products/:id/status', authenticateToken, async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE Product SET status = ? WHERE ProductID = ?', [status, req.params.id]);
        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating status' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Web Service listening on port ${PORT}`);
});
