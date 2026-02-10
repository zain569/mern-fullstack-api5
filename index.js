import express from "express";
import { collectionName, connection } from "./dbconfig.js";
import { ObjectId } from "mongodb";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt, { compare } from "bcrypt"

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://to-do-mern-pro.netlify.app"],
    credentials: true,
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
    let userData = req.body;
    const password = req.body.password;
    const haskPass = await bcrypt.hash(password, 10);

    userData = {...userData, password: haskPass};

    if (!userData.email || !userData.password) {
      return res.status(400).send({
        success: false,
        message: "Email and password are required",
      });
    }

    const db = await connection();
    const collection = await db.collection("users");

    const existingUser = await collection.findOne({
      email: userData.email,
    });

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

    const token = jwt.sign({ email: userData.email }, "Google", {
      expiresIn: "1d",
    });

    return res.send({
      success: true,
      message: "User registered successfully",
      token: token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    if (!req.body.email || !req.body.password) {
      return res
        .status(400)
        .send({ success: false, message: "Email and password required" });
    }

    const db = await connection();
    const collection = await db.collection("users");

    // Find user by email only
    const user = await collection.findOne({
      email: req.body.email,
    });

    console.log(user.password);
    

    if (!user) {
      return res
        .status(401)
        .send({ success: false, message: "Invalid email or password" });
    }

    // Compare plain text password with hashed password using bcrypt
    const isPasswordValid = await bcrypt.compare(req.body.password, user.password);

    if (!isPasswordValid) {
      return res
        .status(401)
        .send({ success: false, message: "Invalid email or password" });
    }

    // Password is valid, generate JWT token
    const token = jwt.sign({ email: user.email }, "Google", {
      expiresIn: "1d",
    });
    
    return res.send({
      success: true,
      message: "Login successfully",
      token: token,
    });
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
