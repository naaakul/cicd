import { useEffect, useState } from "preact/hooks";

function App() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();

      setUsers(data);
    } catch (error) {
      console.error(error);
      setMessage("Failed to fetch users");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save user");
      }

      setMessage("User saved successfully");

      setFormData({
        name: "",
        email: "",
      });

      fetchUsers();
    } catch (error) {
      console.error(error);
      setMessage("Backend API not reachable");
    }
  };

  return (
    <div style={{ fontFamily: "Arial", margin: "40px" }}>
      <h1>Preact + Bun + Hono + MongoDB</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Enter name"
          value={formData.name}
          onInput={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Enter email"
          value={formData.email}
          onInput={handleChange}
          required
        />

        <button type="submit">
          Save User
        </button>
      </form>

      <p>{message}</p>

      <h2>Saved Users</h2>

      <ul>
        {users.map((user) => (
          <li key={user._id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;