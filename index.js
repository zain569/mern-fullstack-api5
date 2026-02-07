import express from "express";
import { collectionName, connection } from "./dbconfig.js";
import { ObjectId } from "mongodb";
import cors from "cors";
import jwt from "jsonwebtoken";
import nodeMailer from "nodemailer";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin:['http://localhost:5173','https://to-do-mern-pro.netlify.app'],
    credentials: true,
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const transporter = nodeMailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "zainnaveed359@gmail.com",
    pass: "kizrlomlwtjhejqs",  // Must be app password generated from Gmail security settings
  },
});

// Verify transporter on startup so failures are visible immediately
transporter.verify()
  .then(() => console.log("Nodemailer transporter is ready"))
  .catch((err) => console.error("Nodemailer transporter error:", err));

app.post("/add-task", async (req, res) => {
  try {
    const db = await connection();
    const collection = await db.collection(collectionName);
    const result = await collection.insertOne(req.body);

    if (result) {
      res.send({
        message: "Task added successfully",
        success: true,
        result: result,
      });
    } else {
      res.send({
        message: "Task not added successfully",
        success: false,
      });
    }
  } catch (err) {
    console.error("Error adding task:", err);
    res.status(500).send({
      message: "Internal Server Error",
      success: false,
      error: err.message,
    });
  }
});

app.get("/tasks", async (req, res) => {
  try {
    const db = await connection();
    console.log("cookies test", req.cookies["token"]);
    const collection = await db.collection(collectionName);
    const result = await collection.find().toArray();

    if (result) {
      res.send({
        message: "Task List Fetched successfully",
        success: true,
        result: result,
      });
    } else {
      res.send({
        message: "Can't get task list",
        success: false,
      });
    }
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).send({
      message: "Internal Server Error",
      success: false,
      error: err.message,
    });
  }
});

app.delete("/delete-task/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id);
    const db = await connection();
    const collection = await db.collection(collectionName);
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result) {
      res.send({
        message: "Task deleted successfully",
        success: true,
        result: result,
      });
    } else {
      res.send({
        message: "Task not deleted successfully",
        success: false,
      });
    }
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).send({
      message: "Internal Server Error",
      success: false,
      error: err.message,
    });
  }
});

// Re-added: delete multiple tasks endpoint (expects JSON array of ids in body)
app.delete("/delete-multiple", async (req, res) => {
  try {
    const ids = req.body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).send({
        success: false,
        message: "Request body must contain 'ids' as a non-empty array",
      });
    }

    const objectIds = ids.map((item) => new ObjectId(item));
    const db = await connection();
    const collection = await db.collection(collectionName);
    const result = await collection.deleteMany({ _id: { $in: objectIds } });

    res.send({
      message: `${result.deletedCount} tasks deleted`,
      success: true,
      result: result,
    });
  } catch (err) {
    console.error("Error deleting multiple tasks:", err);
    res.status(500).send({
      message: "Internal Server Error",
      success: false,
      error: err.message,
    });
  }
});

app.get("/task/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const db = await connection();
    const collection = await db.collection(collectionName);
    const result = await collection.findOne({ _id: new ObjectId(id) });

    if (result) {
      res.send({
        message: "Task fetched successfully",
        success: true,
        result: result,
      });
    } else {
      res.send({
        message: "Can't get task",
        success: false,
      });
    }
  } catch (err) {
    console.error("Error fetching task:", err);
    res.status(500).send({
      message: "Internal Server Error",
      success: false,
      error: err.message,
    });
  }
});

app.patch("/update-task/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const db = await connection();
    const collection = await db.collection(collectionName);

    // Remove _id from the update object
    const updates = { ...req.body };
    delete updates._id;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates },
    );

    if (result.modifiedCount > 0) {
      res.send({
        message: "Task updated successfully",
        success: true,
        result: result,
      });
    } else {
      res.send({
        message: "Task not updated successfully",
        success: false,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: "Internal Server Error",
      success: false,
      error: err.message,
    });
  }
});

app.post("/signup", async (req, res) => {
  try {
    const userData = req.body;

    if (!userData.email || !userData.password) {
      return res.status(400).send({
        success: false,
        message: "Email and password are required",
      });
    }

    const db = await connection();
    const collection = await db.collection("users");
    
    // Check if email already exists
    const existingUser = await collection.findOne({ email: userData.email });
    if (existingUser) {
      return res.status(409).send({
        success: false,
        message: "Email already registered",
      });
    }
    
    const result = await collection.insertOne(userData);

    if (!result) {
      return res.status(500).send({
        success: false,
        message: "Failed to create user",
      });
    }

    // Sign token synchronously
    let token;
    try {
      token = jwt.sign({ email: userData.email }, "Google", { expiresIn: "5d" });
    } catch (err) {
      console.error("JWT sign error:", err);
      return res.status(500).send({ success: false, message: "Token generation failed", error: err.message });
    }

    const mailOptions = {
      from: "zainnaveed359@gmail.com",
      to: userData.email,
      subject: "Welcome to Our App!",
      text: `Hello ${userData.name}, welcome to our app! Now you can manage your tasks efficiently. We're glad to have you on board!`,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.response);
      return res.send({ message: "Signup successful and welcome email sent", success: true, token: token });
    } catch (error) {
      console.error("Email sending error:", error);
      return res.status(500).send({ message: "Signup successful but email failed", success: false, token: token, emailError: error.message });
    }
  } catch (err) {
    console.error("Error in signup:", err);
    res.status(500).send({
      message: "Internal Server Error",
      success: false,
      error: err.message,
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const userData = req.body;

    if (!req.body.email || !req.body.password) {
      return res.status(400).send({ success: false, message: "Email and password required" });
    }

    const db = await connection();
    const collection = await db.collection("users");

    const result = await collection.findOne({ email: userData.email, password: userData.password });

    if (!result) {
      return res.status(401).send({ success: false, message: "Invalid email or password" });
    }

    try {
      const token = jwt.sign({ email: userData.email }, "Google", { expiresIn: "5d" });
      return res.send({ success: true, message: "Login successfully", token: token });
    } catch (err) {
      console.error("JWT sign error:", err);
      return res.status(500).send({ success: false, message: "Token generation failed", error: err.message });
    }
  } catch (err) {
    console.error("Error in login:", err);
    res.status(500).send({
      message: "Internal Server Error",
      success: false,
      error: err.message,
    });
  }
});

function verifyJWTToken(req, res, next) {
  const token = req.cookies["token"];

  jwt.verify(token, "Google", (err, decoded) => {
    if (err) {
      return res.send({
        msg: "Invalid JWT token",
        success: false,
      });
    } else if (decoded) {
      console.log(decoded);
      next();
    }
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
