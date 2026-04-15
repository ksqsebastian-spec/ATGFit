"use client";
import { useState } from "react";
import AuthGate from "./AuthGate";
import FitnessApp from "./FitnessApp";
import BodybuildingApp from "./BodybuildingApp";
import CardioApp from "./CardioApp";
import SocialApp from "./SocialApp";

type Section = "atg" | "bodybuilding" | "cardio" | "social";

function Shell() {
  const [section, setSection] = useState<Section>("atg");
  return (
    <>
      <div className="section-nav">
        <button className={`section-btn${section === "atg" ? " active atg" : ""}`} onClick={() => setSection("atg")}>ATG</button>
        <button className={`section-btn${section === "bodybuilding" ? " active bb" : ""}`} onClick={() => setSection("bodybuilding")}>Bodybuilding</button>
        <button className={`section-btn${section === "cardio" ? " active cardio" : ""}`} onClick={() => setSection("cardio")}>Cardio</button>
        <button className={`section-btn${section === "social" ? " active" : ""}`} onClick={() => setSection("social")} style={section === "social" ? { color: "#e06080", borderBottom: "2px solid #e06080", marginBottom: -2 } : {}}>Social</button>
      </div>
      {section === "atg" && <FitnessApp />}
      {section === "bodybuilding" && <BodybuildingApp />}
      {section === "cardio" && <CardioApp />}
      {section === "social" && <SocialApp />}
    </>
  );
}

export default function AppShell() {
  return <AuthGate><Shell /></AuthGate>;
}
