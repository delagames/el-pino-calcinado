// Moral de Charizard, paquete diario de chistorra y sucesos de la despensa (sección 5).
// La moral (0-10) no se enseña como barra: se ve en lo que dice, en su cara y en el
// humo que echa por la nariz. Con moral baja la llama de la cocina tiembla.

export const MORAL_INICIAL = 6;
export const CHISTORRA_DIARIA = 3;

export function humor(moral) {
  return moral <= 3 ? 'mal' : moral >= 7 ? 'bien' : 'normal';
}

// Lo que dice Charizard según la moral: [emoción, texto]
const LINES = {
  mal: [
    ['Angry', 'Charizard resopla humo por la nariz y no te mira. Hoy está de morros.'],
    ['Sad', 'Charizard mira la ristra de chistorra con cara larga. Trabaja, pero a regañadientes.'],
    ['Angry', 'Grrr… Charizard enciende el fogón con desgana. La llama le sale temblona.'],
  ],
  normal: [
    ['Normal', 'Grrr… Charizard vigila el fogón y, de reojo, la despensa.'],
    ['Normal', 'Charizard se rasca la cola y bosteza una chispa.'],
  ],
  bien: [
    ['Happy', '¡Grrraar! Charizard está de un humor estupendo. Hoy sube las maletas de dos en dos.'],
    ['Happy', 'Charizard tararea mientras aviva el fuego. Algo así como «chis-to-rra».'],
  ],
};

export function moodLine(moral, day = 0) {
  const list = LINES[humor(moral)];
  return list[day % list.length];
}

// Al darle una chistorra
export function feedLine(moral) {
  return moral >= 9
    ? ['Happy', 'Charizard se la zampa de un bocado, te da un abrazo que huele a humo y se va bailando al fogón.']
    : ['Happy', 'Charizard se come la chistorra con los ojos cerrados. Se le escapa una llamita de felicidad.'];
}

// Lo que pasa por la noche: baja un poco la moral y a veces desaparece una chistorra.
// Devuelve las líneas para el resumen del día.
// Sin cerrojo, si alguien va a por la chistorra lo decide la posada antes de cerrar («ladron»): o se
// juega a pillarlo con la linterna ({ quien, res }) o se la lleva sin más ({ auto: true }).
const PILLADO = {
  charizard: 'Pillado en la despensa: Charizard, con los carrillos llenos. Devolvió la chistorra (algo mordida) y se fue a dormir avergonzado.',
  snorlax: 'Pillado en la despensa: Snorlax, sonámbulo, abrazado a la chistorra. La devolvió sin llegar a despertarse.',
  meowth: 'Pillado en la despensa: Meowth, que estaba «afiliando a la despensa». La chistorra vuelve a su sitio; el carné del sindicato, no.',
};
const ESCAPA = {
  charizard: 'Esta noche ha desaparecido una chistorra de la despensa. Charizard jura que no ha sido él. La puerta tiene una quemadura nueva.',
  snorlax: 'Algo se llevó una chistorra a oscuras. Solo se oyó un ronquido camino del pino.',
  meowth: 'Una chistorra desapareció a oscuras. En su sitio, una hoja de afiliación sin firmar.',
};
export function nightEvents(st, rnd, ladron = null) {
  const lines = [];
  st.moral = Math.max(0, st.moral - 1);
  const cerrojo = (st.mejoras || []).includes('cerrojo');
  const roll = rnd();
  const quien = ladron?.quien || 'charizard';
  if (ladron?.res && ladron.res !== 'mal') {
    lines.push(PILLADO[quien]);
    if (quien === 'charizard') st.moral = Math.max(0, st.moral - 2);   // le han pillado: se va de morros
  } else if (st.chistorra > 0 && (ladron?.res === 'mal' || ladron?.auto || (cerrojo && roll < 0.05))) {
    st.chistorra -= 1;
    if (quien === 'charizard') st.moral = Math.min(10, st.moral + 1);
    lines.push(ESCAPA[quien]);
  }
  if (humor(st.moral) === 'mal') lines.push('Charizard se ha ido a dormir de morros. Le vendría bien una chistorra.');
  return lines;
}
