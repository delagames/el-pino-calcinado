// Motor de diálogo (sección 8 de DISEÑO.md). Cada huésped tiene en data/dialogues/<id>.json
// sus entradas de arco; cada entrada es un grafo de nodos con quién habla, su emoción,
// el texto y, si hay, hasta tres respuestas con efectos (afinidad, banderas, monedas).

const cache = new Map();

export async function loadDialogue(id) {
  if (!cache.has(id)) {
    cache.set(id, fetch(`data/dialogues/${id}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null));
  }
  return cache.get(id);
}

// ¿Se cumplen las condiciones de una entrada? ctx: { visita, afinidad, flags }
function matches(cond = {}, ctx) {
  if (cond.visita_min && ctx.visita < cond.visita_min) return false;
  if (cond.afinidad_min && ctx.afinidad < cond.afinidad_min) return false;
  for (const [k, v] of Object.entries(cond.flags || {})) if (ctx.flags[k] !== v) return false;
  return true;
}

// La siguiente entrada del arco: la primera no vista que se cumple. Si el arco ya acabó, ninguna.
export function nextEntry(dlg, ctx, vistas = []) {
  if (!dlg) return null;
  const seen = new Set(vistas);
  if (dlg.entradas.some(e => e.fin_arco && seen.has(e.id))) return null;
  return dlg.entradas.find(e => !seen.has(e.id) && matches(e.cuando, ctx)) || null;
}

// Recorre una entrada nodo a nodo. onNode(node) recibe cada nodo; choose(i) o advance()
// pasan al siguiente; al acabar llama a onEnd(). Los efectos se aplican con applyEffects.
// Un nodo con «si_mejora» ({ mejora: otro_nodo }) salta a otra versión si la posada la tiene.
export function runEntry(entry, { onNode, onEnd, applyEffects, mejoras = [] }) {
  let node = null;
  const enter = id => {
    node = entry.nodos[id];
    for (const [m, alt] of Object.entries(node?.si_mejora || {})) if (mejoras.includes(m)) { id = alt; node = entry.nodos[id]; break; }
    if (!node) return onEnd();
    if (node.efectos) applyEffects(node.efectos);
    onNode(node);
  };
  enter('inicio');
  return {
    choose(i) {
      const o = node.opciones?.[i];
      if (!o) return;
      if (o.efectos) applyEffects(o.efectos);
      o.sigue ? enter(o.sigue) : onEnd();
    },
    advance() {
      node.sigue ? enter(node.sigue) : onEnd();
    },
  };
}
