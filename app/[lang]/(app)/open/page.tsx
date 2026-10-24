import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getInventoryForUser } from "@/lib/inventory";
import { getDictionary } from "@/lib/i18n/getDictionary";
import SectionTabs from "@/components/nav/SectionTabs";
import CaseOpener from "@/components/cases/CaseOpener";

// Open cases (redesign wave v9): opening moved here from Inventory so it
// gets a full screen for the reel. Same lootbox data and API as before.
export default async function OpenCasesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const [{ lootboxes }, dict] = await Promise.all([getInventoryForUser(supabase, user.id), getDictionary()]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{dict.shell.groups.collection}</span>
          <h1>{dict.collection.caseOpening.heading}</h1>
        </div>
      </div>
      <SectionTabs section="collection" />
      <CaseOpener initialLootboxes={lootboxes} />
    </div>
  );
}
