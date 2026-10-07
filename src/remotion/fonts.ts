import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadPlayfairDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadRoboto } from "@remotion/google-fonts/Roboto";
import { SYSTEM_FONT_STACK, type VideoFontId } from "@/remotion/fontCatalog";

/**
 * Load every catalog face once, at module scope, so the Player and the web
 * export both wait (delayRender) before drawing text.
 */
const loaded: Record<VideoFontId, { fontFamily: string }> = {
  inter: loadInter("normal", { weights: ["400", "600", "700"], subsets: ["latin"] }),
  montserrat: loadMontserrat("normal", { weights: ["400", "600", "700"], subsets: ["latin"] }),
  poppins: loadPoppins("normal", { weights: ["400", "600", "700"], subsets: ["latin"] }),
  oswald: loadOswald("normal", { weights: ["400", "600", "700"], subsets: ["latin"] }),
  roboto: loadRoboto("normal", { weights: ["400", "600", "700"], subsets: ["latin"] }),
  nunito: loadNunito("normal", { weights: ["400", "600", "700"], subsets: ["latin"] }),
  playfair: loadPlayfairDisplay("normal", { weights: ["400", "700"], subsets: ["latin"] }),
  anton: loadAnton("normal", { weights: ["400"], subsets: ["latin"] }),
  bangers: loadBangers("normal", { weights: ["400"], subsets: ["latin"] }),
  bebas: loadBebasNeue("normal", { weights: ["400"], subsets: ["latin"] }),
};

export function remotionFontFamily(id: VideoFontId | null): string {
  if (!id) return SYSTEM_FONT_STACK;
  return loaded[id].fontFamily;
}
