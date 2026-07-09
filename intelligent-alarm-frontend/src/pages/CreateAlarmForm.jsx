import { useState } from "react";

function CreateAlarmForm({ onAlarmCreated }) {
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("");
  const [alarmType, setAlarmType] = useState("daily");
  const [isActive, setIsActive] = useState(true);
  const [recurrenceDays, setRecurrenceDays] = useState("");
  const [snoozeEnabled, setSnoozeEnabled] = useState(true);
  const [snoozeLimit, setSnoozeLimit] = useState(3);
  
  // NEW: Track selected challenges
  const [preferredChallenges, setPreferredChallenges] = useState([]);

  const availableChallenges = [
    "math", "memory", "pattern", "logic", "word_scramble", "riddle", "quiz"
  ];

  const handleChallengeToggle = (challenge) => {
    setPreferredChallenges((prev) =>
      prev.includes(challenge)
        ? prev.filter((c) => c !== challenge)
        : [...prev, challenge]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first.");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/alarms/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          label,
          time,
          alarm_type: alarmType,
          is_active: isActive,
          recurrence_days: recurrenceDays || null,
          snooze_enabled: snoozeEnabled,
          snooze_limit: snoozeLimit,
          // NEW: Flatten the array to a comma-separated string, or send null if empty
          preferred_challenges: preferredChallenges.length > 0 ? preferredChallenges.join(",") : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Alarm Created:", data);
        alert("Alarm created successfully!");

        // Reset form
        setLabel("");
        setTime("");
        setAlarmType("daily");
        setIsActive(true);
        setRecurrenceDays("");
        setSnoozeEnabled(true);
        setSnoozeLimit(3);
        setPreferredChallenges([]);

        if (onAlarmCreated) {
          onAlarmCreated();
        }
      } else {
        const errorData = await response.json();
        console.log("Create Alarm Error:", JSON.stringify(errorData, null, 2));
        alert(JSON.stringify(errorData, null, 2));
      }
    } catch (error) {
      console.error(error);
      alert("Backend not running.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Create Alarm</h3>

      <label>Alarm Label</label>
      <input
        type="text"
        placeholder="Morning Alarm"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <label>Alarm Time</label>
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />

      <label>Alarm Type</label>
      <select
        value={alarmType}
        onChange={(e) => setAlarmType(e.target.value)}
      >
        <option value="daily">Daily</option>
        <option value="weekday">Weekday</option>
        <option value="weekend">Weekend</option>
        <option value="one_time">One Time</option>
        <option value="smart_adaptive">Smart Adaptive</option>
      </select>

      <label>Recurrence Days</label>
      <input
        type="text"
        placeholder="MON,TUE,WED"
        value={recurrenceDays}
        onChange={(e) => setRecurrenceDays(e.target.value)}
      />

      {/* NEW: Challenge Selector UI */}
      <div style={{ marginTop: "15px", marginBottom: "15px" }}>
        <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>
          Allowed Challenges (Leave blank for all)
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {availableChallenges.map((challenge) => (
            <label key={challenge} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "14px" }}>
              <input
                type="checkbox"
                checked={preferredChallenges.includes(challenge)}
                onChange={() => handleChallengeToggle(challenge)}
              />
              {challenge.replace("_", " ").toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Is Active
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={snoozeEnabled}
            onChange={(e) => setSnoozeEnabled(e.target.checked)}
          />
          Snooze Enabled
        </label>
      </div>

      <label>Snooze Limit</label>
      <input
        type="number"
        min="0"
        value={snoozeLimit}
        onChange={(e) => setSnoozeLimit(Number(e.target.value))}
      />

      <button type="submit">Create Alarm</button>
    </form>
  );
}

export default CreateAlarmForm;