/** Small SVG helpers: element creation, text wrapping and measurement. */

export const SVG_NS = "http://www.w3.org/2000/svg";

export function svgEl<K extends keyof SVGElementTagNameMap>(
  parent: Element,
  tag: K,
  attrs: Record<string, string | number | undefined> = {},
  text?: string,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) {
      el.setAttribute(key, String(value));
    }
  }
  if (text !== undefined) {
    el.textContent = text;
  }
  parent.append(el);
  return el;
}

let canvas: HTMLCanvasElement | null = null;
const FONT_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Width of a string at a given font size/weight in the page's sans face. */
export function textWidth(text: string, size = 12, weight = 400): number {
  if (typeof document === "undefined") {
    return text.length * size * 0.55;
  }
  canvas ??= document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return text.length * size * 0.55;
  }
  ctx.font = `${weight} ${size}px ${FONT_SANS}`;
  return ctx.measureText(text).width;
}

/** Greedy word wrap into at most `maxLines` lines; the last line is ellipsised when words remain. */
export function wrap(text: string, maxWidth: number, size = 12, weight = 400, maxLines = 2): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]!;
    const candidate = current ? `${current} ${word}` : word;
    if (!current || textWidth(candidate, size, weight) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (lines.length === maxLines - 1) {
      // last allowed line: keep the rest and ellipsise
      let last = [current, ...words.slice(i)].join(" ");
      while (textWidth(`${last}…`, size, weight) > maxWidth && last.length > 1) {
        last = last.slice(0, -1).trimEnd();
      }
      lines.push(`${last}…`);
      return lines;
    }
    lines.push(current);
    current = word;
  }
  if (current) {
    if (lines.length === maxLines - 1 || maxLines === 1) {
      let last = current;
      if (textWidth(last, size, weight) > maxWidth) {
        while (textWidth(`${last}…`, size, weight) > maxWidth && last.length > 1) {
          last = last.slice(0, -1).trimEnd();
        }
        last = `${last}…`;
      }
      lines.push(last);
    } else {
      lines.push(current);
    }
  }
  return lines;
}

/** Multi-line <text> (tspans), first baseline at y. */
export function multiline(
  parent: Element,
  lines: string[],
  attrs: Record<string, string | number | undefined>,
  lineHeight = 14,
  lineClass: (index: number) => string | undefined = () => undefined,
): SVGTextElement {
  const text = svgEl(parent, "text", attrs);
  lines.forEach((line, index) => {
    svgEl(text, "tspan", { x: attrs.x, dy: index === 0 ? 0 : lineHeight, class: lineClass(index) }, line);
  });
  return text;
}
