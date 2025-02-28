import React, { useState, useEffect } from "react";
import axios from "axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [availabilityData, setAvailabilityData] = useState(null);
  const [error, setError] = useState("");
  const [loginError, setLoginError] = useState("");

  // Fetch availability data on component mount
  useEffect(() => {
    axios
      .get("/api/availability")
      .then((response) => {
        setAvailabilityData(response.data);
        console.log("Availability Data: ", response.data);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        setError("Failed to load availability data.");
      });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setLoginError("Both email and password are required.");
      return;
    }

    setLoginError(""); // Clear previous errors

    // Make an API call to your backend for login (this is a placeholder)
    try {
      const response = await axios.post("/api/login", {
        email,
        password,
      });

      if (response.data.success) {
        console.log("Login successful:", response.data);
        // Redirect user or perform further actions upon successful login
      } else {
        setLoginError("Invalid email or password.");
      }
    } catch (err) {
      setLoginError("Error logging in. Please try again.");
      console.error("Login error:", err);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>

      {loginError && <p style={{ color: "red" }}>{loginError}</p>}

      {/* Display availability data */}
      <div>
        <h3>Availability Data</h3>
        {availabilityData ? (
          <pre>{JSON.stringify(availabilityData, null, 2)}</pre>
        ) : (
          <p>No availability data available.</p>
        )}
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default Login;
