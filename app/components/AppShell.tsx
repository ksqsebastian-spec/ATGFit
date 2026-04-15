"use client";
import { useState } from "react";
import AuthGate from "./AuthGate";
import FitnessApp from "./FitnessApp";
import BodybuildingApp from "./BodybuildingApp";
import CardioApp from "./CardioApp";
import SocialApp from "./SocialApp";
import WorkoutSession from "./WorkoutSession";

type Section = "atg" | "bodybuilding" | "cardio" | "workout" | "social";

function Shell() {
  const [section, setSection] = useState<Section>("atg");
  return (
    <>
      <div className="section-nav">
        <button className={`section-btn${section === "atg" ? " active atg" : ""}`} onClick={() => setSection("atg")}>ATG</button>
        <button className={`section-btn${section === "bodybuilding" ? " active bb" : ""}`} onClick={() => setSection("bodybuilding")}>BB</button>
        <button className={`section-btn${section === "cardio" ? " active cardio" : ""}`} onClick={() => setSection("cardio")}>Cardio</button>
        <button
          className={`section-btn${section === "workout" ? " active" : ""}`}
          onClick={() => setSection("workout")}
          style={section === "workout" ? { color: "#60b0e0", borderBottom: "2px solid #60b0e0", marginBottom: -2 } : {}}
        >Workout</button>
        <button
          className={`section-btn${section === "social" ? " active" : ""}`}
          onClick={() => setSection("social")}
          style={section === "social" ? { color: "#e06080", borderBottom: "2px solid #e06080", marginBottom: -2 } : {}}
        >Social</button>
      </div>
      {section === "atg" && <FitnessApp />}
      {section === "bodybuilding" && <BodybuildingApp />}
      {section === "cardio" && <CardioApp />}
      {section === "workout" && <WorkoutSession />}
      {section === "social" && <SocialApp />}
    </>
  );
}

export default function AppShell() {
  return <AuthGate><Shell /></AuthGate>;
}
