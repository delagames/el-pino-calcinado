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
    ['Sad', 'Charizard mira la despensa vacía con cara larga. Trabaja, pero a regañadientes.'],
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
export function nightEvents(st, rnd) {
  const lines = [];
  st.moral = Math.max(0, st.moral - 1);
  const cerrojo = (st.mejoras || []).includes('cerrojo');
  if (st.chistorra > 0 && rnd() < (cerrojo ? 0.05 : 0.35)) {
    st.chistorra -= 1;
    st.moral = Math.min(10, st.moral + 1);
    lines.push('Esta noche ha desaparecido una chistorra de la despensa. Charizard jura que no ha sido él. La puerta tiene una quemadura nueva.');
  }
  if (humor(st.moral) === 'mal') lines.push('Charizard se ha ido a dormir de morros. Le vendría bien una chistorra.');
  return lines;
}
