import { redirect } from "next/navigation";
import { lang } from "next/root-params";

// proxy.ts already requires a session to reach here, so this is purely a
// routing convenience — the app's real home is the Dashboard.
export default async function Home() {
  redirect(`/${await lang()}/dashboard`);
}
