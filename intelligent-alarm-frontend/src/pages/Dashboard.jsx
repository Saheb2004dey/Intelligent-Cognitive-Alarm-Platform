import "./Dashboard.css";

function Dashboard() {
  return (
    <div className="dashboard-container">
      <h1>User Dashboard</h1>

      <div className="dashboard-content">

        <div className="profile-card">
          <h2>Profile Settings</h2>

          <label>Full Name</label>
          <input type="text" placeholder="Enter your full name" />

          <label>Email</label>
          <input type="email" placeholder="Enter your email" />

          <label>Difficulty Preference</label>

          <select>
            <option>Beginner</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
            <option>Expert</option>
          </select>

          <button>Save Profile</button>
        </div>

        <div className="alarm-card">
          <h2>My Alarms</h2>

          <p>No alarms created yet.</p>

          <button>Add Alarm</button>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;