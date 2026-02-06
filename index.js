import express from "express";
import { collectionName, connection } from "./dbconfig.js";
import { ObjectId } from "mongodb";
import cors from "cors";
import jwt from "jsonwebtoken";
import nodeMailer from "nodemailer";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());

/* ✅ FIX 1: CORS — add explicit origins */
app.use(cors(),);

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const transporter = nodeMailer.createTransport({
  service: "gmail",
  auth: {
    user: "zainnaveed359@gmail.com",
    pass: "kizr loml wtjh ejqs",
  },
});

app.post("/add-task", verifyJWTToken, async (req, res) => {
  const db = await connection();
  const collection = await db.collection(collectionName);
  const result = await collection.insertOne(req.body);
  res.send({
    message: result ? "Task added successfully" : "Task not added successfully",
    success: !!result,
    result,
  });
});

app.get("/tasks", verifyJWTToken, async (req, res) => {
  const db = await connection();
  const collection = await db.collection(collectionName);
  const result = await collection.find().toArray();
  res.send({
    message: result ? "Task List Fetched successfully" : "Can't get task list",
    success: !!result,
    result,
  });
});

app.delete("/delete-task/:id", verifyJWTToken, async (req, res) => {
  const db = await connection();
  const collection = await db.collection(collectionName);
  const result = await collection.deleteOne({
    _id: new ObjectId(req.params.id),
  });
  res.send({
    message: result
      ? "Task deleted successfully"
      : "Task not deleted successfully",
    success: !!result,
    result,
  });
});

app.get("/task/:id", verifyJWTToken, async (req, res) => {
  const db = await connection();
  const collection = await db.collection(collectionName);
  const result = await collection.findOne({
    _id: new ObjectId(req.params.id),
  });
  res.send({
    message: result ? "Task fetched successfully" : "Can't get task",
    success: !!result,
    result,
  });
});

app.patch("/update-task/:id", verifyJWTToken, async (req, res) => {
  const db = await connection();
  const collection = await db.collection(collectionName);

  const updates = { ...req.body };
  delete updates._id;

  const result = await collection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: updates },
  );

  res.send({
    message:
      result.modifiedCount > 0
        ? "Task updated successfully"
        : "Task not updated successfully",
    success: result.modifiedCount > 0,
    result,
  });
});

app.delete("/delete-multiple", verifyJWTToken, async (req, res) => {
  const objectIds = req.body.map((id) => new ObjectId(id));
  const db = await connection();
  const collection = await db.collection(collectionName);
  const result = await collection.deleteMany({ _id: { $in: objectIds } });
  res.send({
    message: result ? "Tasks deleted successfully" : "Task not deleted",
    success: !!result,
    result,
  });
});

app.post("/signup", async (req, res) => {
  const userData = req.body;
  if (userData.email && userData.password) {
    const db = await connection();
    const collection = await db.collection("users");
    const result = await collection.insertOne(userData);

    if (result) {
      jwt.sign(
        { email: userData.email },
        "Google",
        { expiresIn: "5d" },
        (err, token) => {
          if (err) {
            res.send({ success: false, message: "Token error" });
          } else {
            /* ✅ FIX 2: SET COOKIE */
            res.cookie("token", token, {
              httpOnly: true,
              secure: true,
              sameSite: "none",
            });

            res.send({
              success: true,
              message: "Signup successful",
            });
          }
        },
      );
    }
  }
});

app.post("/login", async (req, res) => {
  const userData = req.body;

  if (userData.email && userData.password) {
    const db = await connection();
    const collection = await db.collection("users");

    const result = await collection.findOne({
      email: userData.email,
      password: userData.password,
    });

    if (result) {
      jwt.sign(
        { email: userData.email },
        "Google",
        { expiresIn: "5d" },
        (err, token) => {
          if (err) {
            res.send({ success: false, msg: "Login failed" });
          } else {
            /* ✅ FIX 2: SET COOKIE */
            res.cookie("token", token, {
              httpOnly: true,
              secure: true,
              sameSite: "none",
            });

            res.send({
              success: true,
              msg: "Login successfully",
            });
          }
        },
      );
    } else {
      res.send({ success: false, msg: "User don't match" });
    }
  } else {
    res.send({ success: false, msg: "Email and password required" });
  }
});

function verifyJWTToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.send({ success: false, msg: "No token found" });
  }

  jwt.verify(token, "Google", (err, decoded) => {
    if (err) {
      return res.send({ success: false, msg: "Invalid JWT token" });
    }
    next();
  });
}

app.listen(3000);
