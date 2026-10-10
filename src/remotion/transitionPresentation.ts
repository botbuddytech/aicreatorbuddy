import { crossZoom } from "@remotion/transitions/cross-zoom";
import { dissolve } from "@remotion/transitions/dissolve";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { TransitionPresentation } from "@remotion/transitions";
import type { TransitionId } from "@/lib/videoProject";

/** Maps editor transition ids to Remotion's official transition presentations. */
export function remotionTransitionPresentation(
  id: TransitionId,
): TransitionPresentation<Record<string, unknown>> | null {
  switch (id) {
    case "none":
      return null;
    case "fade":
      return fade();
    case "dissolve":
      return dissolve();
    case "slide":
      return slide({ direction: "from-right" });
    case "wipe":
      return wipe({ direction: "from-left" });
    case "zoom":
      return crossZoom();
    case "flip":
      return flip();
    default:
      return fade();
  }
}
