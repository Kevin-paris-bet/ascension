import { createRoot } from "react-dom/client";
import { GameApp } from "../app/components/GameApp";
import { installNativeServices } from "./nativeServices";
import "../app/flags.css";
import "../app/globals.css";
import "./mobile.css";

installNativeServices();
createRoot(document.getElementById("root")!).render(<GameApp />);
