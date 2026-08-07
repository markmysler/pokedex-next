import { pokedex, pokedexOrder, typesList } from "@/lib/pokedex";
import PokedexApp from "@/components/pokedex/PokedexApp";

export default function Home() {
  return (
    <div id="app">
      <PokedexApp pokedex={pokedex} order={pokedexOrder} typesList={typesList} />
    </div>
  );
}
