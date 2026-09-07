import { Hono } from "hono";
import { MongoClient } from "mongodb";

const app = new Hono();

const PORT = Number(process.env.PORT || 5000);

const MONGO_URL =
  process.env.MONGO_URL ||
  "mongodb://mongo-service:27017/userdb";

const client = new MongoClient(MONGO_URL);

const database = client.db("userdb");

const users = database.collection("users");

app.get("/", (c) => {
  return c.text("Bun + Hono API is running");
});

app.get("/api/users", async (c) => {
  try {
    const result = await users
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return c.json(result);
  } catch (error) {
    console.error(error);

    return c.json(
      {
        message: "Failed to fetch users",
      },
      500
    );
  }
});

app.post("/api/users", async (c) => {
  try {
    const body = await c.req.json();

    const { name, email } = body;

    const user = {
      name,
      email,
      createdAt: new Date(),
    };

    const result = await users.insertOne(user);

    return c.json(
      {
        message: "User saved successfully",
        user: {
          _id: result.insertedId,
          ...user,
        },
      },
      201
    );
  } catch (error) {
    console.error(error);

    return c.json(
      {
        message: "Failed to save user",
      },
      500
    );
  }
});

await client.connect();

console.log("Connected to MongoDB");

export default {
  port: PORT,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};