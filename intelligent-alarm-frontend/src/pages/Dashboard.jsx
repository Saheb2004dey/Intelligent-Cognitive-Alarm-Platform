import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AlarmModal from "./AlarmModal";
import CreateAlarmForm from "./CreateAlarmForm";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const [showCreateAlarm, setShowCreateAlarm] = useState(false);
  const [alarms, setAlarms] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [currentAlarmId, setCurrentAlarmId] = useState(null);
  
  // NEW: Profile State
  const [profileName, setProfileName] = useState("");
  const [profileTimezone, setProfileTimezone] = useState("UTC");
  const [profileDifficulty, setProfileDifficulty] = useState("medium");
  const [globalPreferredChallenges, setGlobalPreferredChallenges] = useState([]);

  const availableChallenges = [
    "math", "memory", "pattern", "logic", "word_scramble", "riddle", "quiz"
  ];

  // Fetch alarms
  const fetchAlarms = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch("http://127.0.0.1:8000/alarms/", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAlarms(data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // NEW: Fetch Profile
  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch("http://127.0.0.1:8000/users/profile", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProfileName(data.full_name || "");
        setProfileTimezone(data.timezone || "UTC");
        setProfileDifficulty(data.difficulty_preference || "medium");
        if (data.preferred_challenges) {
          setGlobalPreferredChallenges(data.preferred_challenges.split(","));
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  // NEW: Save Profile
  const handleSaveProfile = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("http://127.0.0.1:8000/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: profileName,
          timezone: profileTimezone,
          difficulty_preference: profileDifficulty,
          preferred_challenges: globalPreferredChallenges.length > 0 ? globalPreferredChallenges.join(",") : null,
        }),
      });
      if (response.ok) {
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update profile.");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleGlobalChallengeToggle = (challenge) => {
    setGlobalPreferredChallenges((prev) =>
      prev.includes(challenge)
        ? prev.filter((c) => c !== challenge)
        : [...prev, challenge]
    );
  };

  // Delete Alarm
  const handleDeleteAlarm = async (alarmId) => {
    const token = localStorage.getItem("token");
    if (!window.confirm("Are you sure you want to delete this alarm?")) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/alarms/${alarmId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        alert("Alarm deleted successfully.");
        fetchAlarms();
      } else {
        alert("Failed to delete alarm.");
      }
    } catch (error) {
      console.log(error);
      alert("Backend not running.");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchAlarms();
    fetchProfile();
  }, [navigate]);

  const handleAlarmCreated = () => {
    setShowCreateAlarm(false);
    fetchAlarms();
  };

  const fetchChallenge = async (alarmId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/challenges/next?alarm_id=${alarmId}&challenge_type=random`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        alert("Failed to fetch challenge.");
        return;
      }
      const data = await response.json();
      setCurrentChallenge(data);
      setCurrentAlarmId(alarmId);
      setIsAlarmRinging(true);
    } catch (error) {
      console.log(error);
      alert("Backend error.");
    }
  };

  return (
    <>
      {isAlarmRinging && (
        <AlarmModal
          challenge={currentChallenge}
          alarmId={currentAlarmId}
          onClose={() => {
            setIsAlarmRinging(false);
            setCurrentChallenge(null);
            setCurrentAlarmId(null);
          }}
        />
      )}
      <div className="dashboard-layout">
        <aside className="sidebar">
          <h2>Alarm App</h2>
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={activeTab === "alarms" ? "active" : ""}
            onClick={() => setActiveTab("alarms")}
          >
            My Alarms
          </button>
          <button
            className={activeTab === "analytics" ? "active" : ""}
            onClick={() => setActiveTab("analytics")}
          >
            Analytics
          </button>
        </aside>

        <main className="main-content">
          <h1>User Dashboard</h1>

          {activeTab === "dashboard" && (
            <div className="profile-card">
              <h2>Profile Settings</h2>

              <label>Full Name</label>
              <input 
                type="text" 
                value={profileName} 
                onChange={(e) => setProfileName(e.target.value)} 
              />

              <label>Difficulty Preference</label>
              <select 
                value={profileDifficulty} 
                onChange={(e) => setProfileDifficulty(e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>

              <label>Timezone</label>
              <select 
                value={profileTimezone} 
                onChange={(e) => setProfileTimezone(e.target.value)}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>

              {/* NEW: Global Challenge Preferences */}
              <div style={{ marginTop: "15px", marginBottom: "15px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>
                  Global Allowed Challenges (Leave blank for all)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {availableChallenges.map((challenge) => (
                    <label key={challenge} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "14px" }}>
                      <input
                        type="checkbox"
                        checked={globalPreferredChallenges.includes(challenge)}
                        onChange={() => handleGlobalChallengeToggle(challenge)}
                      />
                      {challenge.replace("_", " ").toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={handleSaveProfile}>Save Profile</button>
            </div>
          )}

          {activeTab === "alarms" && (
            <div className="alarm-card">
              <h2>My Alarms</h2>
              {alarms.length === 0 ? (
                <p>No alarms created yet.</p>
              ) : (
                alarms.map((alarm) => (
                  <div key={alarm.id} className="alarm-item">
                    <div>
                      <strong>{alarm.label}</strong>
                      <p>{alarm.time}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAlarm(alarm.id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                    <button onClick={() => fetchChallenge(alarm.id)}>
                      Test Ring
                    </button>
                  </div>
                ))
              )}
              {!showCreateAlarm && (
                <button onClick={() => setShowCreateAlarm(true)}>
                  Add Alarm
                </button>
              )}
              {showCreateAlarm && (
                <CreateAlarmForm onAlarmCreated={handleAlarmCreated} />
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="profile-card">
              <h2>Analytics</h2>
              <p>Analytics dashboard will be added in the upcoming tasks.</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default Dashboard;