"use client";
import { useState } from "react";
import FitnessApp from "./FitnessApp";
import BodybuildingApp from "./BodybuildingApp";
import CardioApp from "./CardioApp";

type Section = "atg" | "bodybuilding" | "cardio";

export default function AppShell() {
  const [section, setSection] = useState<Section>("atg");

  return (
    <>
      <div className="section-nav">
        <button className={`section-btn${section === "atg" ? " active atg" : ""}`} onClick={() => setSection("atg")}>ATG</button>
        <button className={`section-btn${section === "bodybuilding" ? " active bb" : ""}`} onClick={() => setSection("bodybuilding")}>Bodybuilding</button>
        <button className={`section-btn${section === "cardio" ? " active cardio" : ""}`} onClick={() => setSection("cardio")}>Cardio</button>
      </div>
      {section === "atg" && <FitnessApp />}
      {section === "bodybuilding" && <BodybuildingApp />}
      {section === "cardio" && <CardioApp />}
    </>
  );
}
