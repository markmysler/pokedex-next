import { redirect } from "next/navigation";

// proxy.ts already requires a session to reach here, so this is purely a
// routing convenience — the app's real home is the Dashboard.
export default function Home() {
  redirect("/dashboard");
}
