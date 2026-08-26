// Un color del sistema, rebajado.
//
// Los mapas de color de VINCERE devuelven tokens (`var(--vin-ok)`) y no hex,
// para que el tema los pueda cambiar de golpe. Eso rompió el truco que había
// repartido por ocho sitios: pegarle dos dígitos de alfa al final del hex
// —`${COLOR}55`— para conseguir la versión suave del mismo color. Sobre una
// variable eso produce `var(--vin-ok)55`, que no es CSS válido y el navegador
// descarta en silencio: el borde simplemente desaparece.
//
// `color-mix` hace lo mismo y funciona igual con un hex que con un token, que
// es justo lo que hacía falta para poder mover todo el sistema a variables.
export function tinte(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}
