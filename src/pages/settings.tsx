import React from "react";
import Settings from "../components/settings/Settings";

const SettingsPage = () => {
  return (
    <main className="settings-shell">
      <header className="settings-header">
        <p className="settings-eyebrow">Your experience</p>
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Make Troddit feel like yours. Changes are saved automatically on this device.</p>
      </header>
      <Settings />
    </main>
  );
};

export default SettingsPage;
