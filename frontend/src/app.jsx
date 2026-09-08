import { useEffect, useState } from "preact/hooks";

function App() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    setMessage("");

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

      await fetchUsers();
    } catch (error) {
      console.error(error);
      setMessage("Backend API not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 bg-amber-300">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            User Management
          </h1>

          <div></div>

          <p className="mt-2 text-sm text-muted-foreground">
            Create and manage users with Preact, Bun, Hono and MongoDB.
          </p>
        </div>

        {/* Add User Card */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Add a user
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Enter the user's information below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium leading-none"
              >
                Name
              </label>

              <input
                id="name"
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onInput={handleChange}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                name="email"
                placeholder="john@example.com"
                value={formData.email}
                onInput={handleChange}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex bg-black text-white h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save user"}
            </button>
          </form>

          {/* Message */}
          {message && (
            <div
              className={`mt-4 rounded-md border px-3 py-2 text-sm ${
                message.includes("successfully")
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-destructive/20 bg-destructive/5 text-destructive"
              }`}
            >
              {message}
            </div>
          )}
        </section>

        {/* Users */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Saved users
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {users.length} {users.length === 1 ? "user" : "users"}{" "}
                registered
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {users.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium">No users yet</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Add your first user using the form above.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    {/* User info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {user.name}
                      </p>

                      <p className="truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;