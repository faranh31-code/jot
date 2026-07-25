import { useState, useEffect } from "react";

export function useAdBanner(isPro: boolean) {
  const [adUnitId] = useState("");
  const [isLoaded] = useState(false);
  return { adUnitId, isLoaded };
}
