import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import "./App.css";

function Leaderboard() {
  const [rankings, setRankings] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = io("http://localhost:3000");

    const fetchRankings = async () => {
      try {
        const response = await axios.get("http://localhost:3000/rankings");
        setRankings(response.data);
      } catch (error) {
        console.error("Error fetching rankings:", error);
      }
    };
    fetchRankings();

    socket.on("updateRankings", (updatedRankings) => {
      setRankings(updatedRankings);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleClaimPoints = async () => {
    if (!selectedUserId) {
      alert("Please select a user.");
      return;
    }
    setLoading(true);
    try {
      await axios.post("http://localhost:3000/claim", { userId: selectedUserId });
    } catch (error) {
      console.error("Error claiming points:", error);
    }
    setLoading(false);
  };

  const viewUserHistory = (userId) => {
    navigate(`/history/${userId}`);
  };

  return (
    <div className="container">
      <h1 className="title">Leaderboard</h1>
      <div className="select-container">
        <label htmlFor="user">Select User:</label>
        <select
          id="user"
          value={selectedUserId || ""}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="" disabled>
            Select a user
          </option>
          {rankings.map((user) => (
            <option key={user._id} value={user._id}>
              {user.name}
            </option>
          ))}
        </select>
        <button className="claim-button" onClick={handleClaimPoints} disabled={loading}>
          {loading ? "Claiming..." : "Claim Points"}
        </button>
      </div>
      <h2 className="subtitle">Rankings</h2>
      <ul className="ranking-list">
        {rankings.map((user, index) => (
          <li className="ranking-item" key={user._id}>
            {index + 1}.{" "}
            <button
              className="user-link"
              onClick={() => viewUserHistory(user._id)}
            >
              {user.name}
            </button>{" "}
             {user.points} points
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserHistory({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserHistory = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/history/${userId}`);
        setUser(response.data);
      } catch (error) {
        console.error("Error fetching user history:", error);
      }
      setLoading(false);
    };
    fetchUserHistory();
  }, [userId]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not found</p>;

  return (
    <div className="container">
      <h1 className="title">{user.name}'s Point History</h1>
      <ul className="history-list">
        {user.history.map((entry, index) => (
          <li className="history-item" key={index}>
            <span className="history-points">{entry.pointsAwarded} points</span>
            <span className="history-timestamp">{new Date(entry.timestamp).toLocaleString()}</span>
          </li>
        ))}
      </ul>
      <Link className="back-link" to="/">Back to Leaderboard</Link>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Leaderboard />} />
        <Route
          path="/history/:userId"
          element={
            <RouteComponentWrapper
              Component={UserHistory}
              paramsExtractor={(params) => ({ userId: params.userId })}
            />
          }
        />
      </Routes>
    </Router>
  );
}

function RouteComponentWrapper({ Component, paramsExtractor }) {
  const params = useParams();
  const extractedParams = paramsExtractor ? paramsExtractor(params) : params;

  return <Component {...extractedParams} />;
}

export default App;
