import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json());

const PORT = 4000;

// ==========================================
// DATA MODELS & SCHEMAS
// ==========================================
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

const userModel = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 1, max: 150 }
}, { timestamps: true });

const postModel = mongoose.model('Post', postSchema);

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================
app.post('/api/v1/users/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) return res.status(400).json({ message: "All fields are required" });
        
        const existingUser = await userModel.findOne({ email: email.toLowerCase() });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const newUser = await userModel.create({ username, email, password });
        res.status(201).json({ message: "User registered successfully", id: newUser._id, email: newUser.email, username: newUser.username });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

app.post('/api/v1/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password required" });

        const user = await userModel.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        res.status(200).json({ message: "User logged in", id: user._id, email: user.email, username: user.username });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

app.post('/api/v1/users/logout', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// ==========================================
// CRUD API ENDPOINTS
// ==========================================
app.post('/api/v1/posts/create', async (req, res) => {
    try {
        const { name, description, age } = req.body;
        if (!name || !description || !age) return res.status(400).json({ message: "All fields are required" });
        const newPost = await postModel.create({ name, description, age });
        res.status(201).json({ message: "Post created successfully", post: newPost });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get('/api/v1/posts/getposts', async (req, res) => {
    try {
        const posts = await postModel.find();
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

app.patch('/api/v1/posts/update/:id', async (req, res) => {
    try {
        if (Object.keys(req.body).length === 0) return res.status(400).json({ message: "No data provided for update" });
        const updatedPost = await postModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedPost) return res.status(404).json({ message: "Post not found" });
        res.status(200).json({ message: "Post updated successfully", post: updatedPost });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

app.delete('/api/v1/posts/delete/:id', async (req, res) => {
    try {
        const deletedPost = await postModel.findByIdAndDelete(req.params.id);
        if (!deletedPost) return res.status(404).json({ message: "Post not found" });
        res.status(200).json({ message: "Post successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// CONNECT AND START
mongoose.connect("mongodb://127.0.0.1:27017/intro_db")
    .then(() => {
        console.log("MongoDB Connected Successfully!");
        app.listen(PORT, () => console.log(`Server running live on http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error("Connection error:", err.message);
    });
