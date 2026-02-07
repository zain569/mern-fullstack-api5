import express from "express";
import { collectionName, connection } from "./dbconfig.js";
import { ObjectId } from "mongodb";
import cors from "cors";
import jwt, { decode } from "jsonwebtoken";
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
  service: "gmail",
  auth: {
    user: "zainnaveed359@gmail.com",
    pass: "kizr loml wtjh ejqs",
  },
});

app.post("/add-task", async (req, res) => {
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
});

app.get("/tasks", async (req, res) => {
  const db = await connection();
  console.log("cookies test", req.cookies["token"]);
  const collection = await db.collection(collectionName);
  const result = await collection.find().toArray();

  if (result) {
    res.send({
      message: "Task List Futched successfully",
      success: true,
      result: result,
    });
  } else {
    res.send({
      message: "Can't get task list",
      success: false,
    });
  }
});

app.delete("/delete-task/:id", async (req, res) => {
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
});

app.get("/task/:id", async (req, res) => {
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
      message: "Can't get task list",
      success: false,
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

app.delete("/delete-multiple", async (req, res) => {
  const ids = req.body;
  const objectIds = ids.map((item) => new ObjectId(item));
  const db = await connection();
  console.log(ids);
  const collection = await db.collection(collectionName);
  const result = await collection.deleteMany({ _id: { $in: objectIds } });

  if (result) {
    res.send({
      message: "Tasks deleted successfully",
      success: true,
      result: result,
    });
  } else {
    res.send({
      message: "Task not deleted successfully",
      success: false,
    });
  }
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
            res.send({
              message: "Error in token generation",
              success: false,
              error: err.message,
            });
          } else {
            const mailOptions = {
              from: "zainnaveed359@gmail.com",
              to: userData.email,
              subject: "Welcome to Our App!",
              text: `Hello ${userData.name}, welcome to our app! Now you can manage your tasks efficiently. We're glad to have you on board!`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log(error);
              } else {
                console.log("Email sent:", info.response);
              }
            });

            res.send({
              message: "Signup successful",
              success: true,
              token: token,
            });
          }
        }
      )
    }
  }
});

app.post("/login", async (req, res) => {
  const userData = req.body;

  // ❌ OR → ✅ AND
  if (req.body.email && req.body.password) {
    const db = await connection();
    const collection = await db.collection("users");

    const result = await collection.findOne({
      email: userData.email,
      password: userData.password,
    });

    if (result) {
      // ❌ don't send full userData in token
      jwt.sign(
        { email: userData.email },
        "Google",
        { expiresIn: "5d" },
        (err, token) => {
          if (err) {
            res.send({
              success: false,
              msg: "User not match",
            });
          } else if (token) {
            res.send({
              success: true,
              msg: "Login successfully",
              token: token,
            });
          }
        },
      );
    } else {
      res.send({
        success: false,
        msg: "User don't match",
      });
    }
  } else {
    res.send({
      success: false,
      msg: "Email and password required",
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

app.listen(3000);
