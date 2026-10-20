import type { Lang } from "../i18n.ts";

/** Lower case without accents: "Küste" and "kuste" match, "Straße" and "strasse" too. */
export const fold = (text: string): string =>
  text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** A row of the tree: a <details> with its own row in the summary, or a plain row list (a leaf). */
type Node = { el: HTMLElement; row: HTMLElement | null; kids: Node[]; wasOpen: boolean };

function nodesOf(container: Element): Node[] {
  return [...container.children].flatMap((el): Node[] => {
    if (el instanceof HTMLDetailsElement) {
      const kids = el.querySelector(":scope > .cat-kids");
      return [{ el, row: el.querySelector(":scope > summary li[data-q]"), kids: kids ? nodesOf(kids) : [], wasOpen: el.open }];
    }
    if (el instanceof HTMLUListElement) {
      return [{ el, row: el.querySelector("li[data-q]"), kids: [], wasOpen: false }];
    }
    return [];
  });
}

/** Wraps the parts of `label` that match a term in <mark>; returns whether anything matched. */
function marked(target: HTMLElement, label: string, terms: string[]): boolean {
  const folded = [...label].map((char) => fold(char));
  // map each term back to characters of the shown label (folding can lengthen "ß" to "ss")
  const flat = folded.join("");
  const hit = new Array<boolean>(folded.length).fill(false);
  for (const term of terms) {
    for (let at = flat.indexOf(term); at !== -1; at = flat.indexOf(term, at + 1)) {
      let pos = 0;
      folded.forEach((part, index) => {
        if (pos + part.length > at && pos < at + term.length) hit[index] = true;
        pos += part.length;
      });
    }
  }
  target.replaceChildren();
  let run = "";
  let on = false;
  const flush = () => {
    if (run) target.append(on ? Object.assign(document.createElement("mark"), { textContent: run }) : document.createTextNode(run));
    run = "";
  };
  [...label].forEach((char, index) => {
    if (hit[index] !== on) {
      flush();
      on = hit[index]!;
    }
    run += char;
  });
  flush();
  return hit.includes(true);
}

function mark(row: HTMLElement | null, terms: string[]): void {
  const text = row?.querySelector<HTMLElement>(".dr-text");
  if (!row || !text) {
    return;
  }
  row.querySelector(".dr-alt")?.remove();
  if (!marked(text, (text.dataset.label ??= text.textContent ?? ""), terms) && terms.length && row.dataset.alt) {
    // matched in the other language only: show that name too, so the hit is visible
    const alt = Object.assign(document.createElement("span"), { className: "dr-alt" });
    marked(alt, row.dataset.alt, terms);
    text.after(alt);
  }
}

/** Filters a drawer's breakdown tree as you type: matches stay, their path opens, everything else hides. */
export function wireTreeSearch(body: HTMLElement, lang: Lang): void {
  const input = body.querySelector<HTMLInputElement>(".tree-search-input");
  const tree = body.querySelector<HTMLElement>(".cat-tree");
  const count = body.querySelector<HTMLOutputElement>(".tree-search-count");
  if (!input || !tree || !count) {
    return;
  }
  const roots = nodesOf(tree);
  const empty = Object.assign(document.createElement("p"), {
    className: "tree-search-empty",
    textContent: lang === "de" ? "Nichts in diesem Haushalt." : "Nothing in this budget.",
    hidden: true,
  });
  tree.after(empty);

  const apply = (): void => {
    const terms = fold(input.value.trim()).split(/\s+/).filter(Boolean);
    let hits = 0;
    // shown = the row matches, an ancestor matches (context) or a descendant matches (path)
    const visit = (node: Node, inside: boolean): boolean => {
      const q = fold(node.row?.dataset.q ?? "");
      const self = terms.length > 0 && terms.every((term) => q.includes(term));
      hits += self ? 1 : 0;
      const below = node.kids.map((kid) => visit(kid, inside || self)).some(Boolean);
      mark(node.row, self ? terms : []);
      node.el.hidden = terms.length > 0 && !(self || below || inside);
      if (node.el instanceof HTMLDetailsElement) {
        node.el.open = terms.length ? below : node.wasOpen;
      }
      node.row?.classList.toggle("is-hit", self);
      return self || below;
    };
    roots.forEach((node) => visit(node, false));
    tree.classList.toggle("is-searching", terms.length > 0);
    empty.hidden = !(terms.length && hits === 0);
    count.textContent = terms.length && hits ? String(hits) : "";
  };
  input.addEventListener("input", apply);
  input.addEventListener("keydown", (event) => {
    // Escape clears first; a second Escape closes the drawer
    if (event.key === "Escape" && input.value) {
      event.stopPropagation();
      input.value = "";
      apply();
    }
  });
}
