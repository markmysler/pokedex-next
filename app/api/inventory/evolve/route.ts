import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getOwnedPokemonInstances, getOwnedPokemonInstance } from "@/lib/inventory";
import { getPokemon } from "@/lib/pokedex";
import { deriveEvolvedStats, resolveEvolutionTarget } from "@/lib/evolution";
import { rollMoveset } from "@/lib/collection";
import type { Json } from "@/types/supabase";

const EVOLVE_COUNT = 5;

// Burns 5 owned, non-starter, same-species Pokemon with a real evolution for
// exactly 1 new instance of the resolved evolved species
// (upgrades/50-evolution-db-migration-and-rpc.md,
// upgrades/51-evolution-api-and-inventory-ui.md). getOwnedPokemonInstances()
// + the species/evolution checks below are only a fast, specific-error-
// message pre-check -- evolve_pokemon() re-validates ownership/starter-
// status/species-match itself inside a single transaction, same
// "re-validate at execution time" principle POST /api/inventory/tradeup
// already follows.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const ids: unknown = body.pokemonInstanceIds;
  if (!Array.isArray(ids) || ids.length !== EVOLVE_COUNT || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: `Exactly ${EVOLVE_COUNT} Pokemon are required` }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const instances = await getOwnedPokemonInstances(supabase, user.id, ids);
  if (!instances) return NextResponse.json({ error: "One or more Pokemon are not eligible" }, { status: 404 });
  if (instances.some((p) => p.isStarter)) {
    return NextResponse.json({ error: "Starters can't evolve" }, { status: 400 });
  }

  const sourceNumber = instances[0].number;
  if (instances.some((p) => p.number !== sourceNumber)) {
    return NextResponse.json({ error: "All 5 must be the same species" }, { status: 400 });
  }

  const sourceSpecies = getPokemon(sourceNumber);
  if (!sourceSpecies || sourceSpecies.evolvesInto === null) {
    return NextResponse.json({ error: "This Pokemon has no evolution" }, { status: 400 });
  }

  // Eevee-style branch resolution (uniform pick over however many entries
  // evolvesInto currently holds) happens here, once, before derivation --
  // lib/evolution.ts's job, this route just calls it (upgrades/49-evolution-
  // stat-derivation-and-moveset.md).
  const targetNumber = resolveEvolutionTarget(sourceSpecies.evolvesInto);
  const targetSpecies = getPokemon(targetNumber);
  if (!targetSpecies) {
    return NextResponse.json({ error: "Internal error resolving evolved species" }, { status: 500 });
  }

  const derivedStats = deriveEvolvedStats(instances, targetSpecies);
  const total = derivedStats.hp + derivedStats.atk + derivedStats.def + derivedStats.spatk + derivedStats.spdef + derivedStats.spd;
  // Moveset is a fresh roll on the evolved species, not derived from the 5
  // burned instances -- see lib/evolution.ts's own comment on why.
  const moves = rollMoveset(targetSpecies);

  const { data: newId, error } = await supabase.rpc("evolve_pokemon", {
    p_user_id: user.id,
    p_instance_ids: ids,
    p_target_number: targetNumber,
    p_stats: { ...derivedStats, total } as unknown as Json,
    p_moves: moves as unknown as Json,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const pokemon = await getOwnedPokemonInstance(supabase, user.id, newId as string);
  if (!pokemon) {
    return NextResponse.json({ error: "Evolved, but failed to load the result" }, { status: 500 });
  }

  return NextResponse.json({ pokemon });
}
