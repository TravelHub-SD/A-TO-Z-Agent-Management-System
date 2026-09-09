import { redirect } from "next/navigation";

/** The application entry point is the dashboard; middleware handles auth. */
export default function Home() {
  redirect("/dashboard");
}
