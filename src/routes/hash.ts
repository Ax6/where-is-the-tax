const ROUTE_HASH = /^#route\/([\w-]+)(?:\/([A-Za-z]{2}))?$/;

export interface RouteHashState {
  routeId: string;
  placeCode: string;
}

export type RouteHashTransition = "place" | "route" | null;

export function routeHash(routeId: string, placeCode: string): string {
  return `#route/${routeId}/${placeCode.toUpperCase()}`;
}

export function parseRouteHash(hash: string): RouteHashState | null {
  const match = ROUTE_HASH.exec(hash);
  if (!match?.[1]) {
    return null;
  }
  return {
    routeId: match[1],
    placeCode: (match[2] ?? "DE").toUpperCase(),
  };
}

export function routeHashTransition(next: RouteHashState, current: RouteHashState): RouteHashTransition {
  if (next.placeCode !== current.placeCode) {
    return "place";
  }
  return next.routeId !== current.routeId ? "route" : null;
}
