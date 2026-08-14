import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "../pages/home_page";

export const Route = createFileRoute("/")({
  component: HomePage,
});
