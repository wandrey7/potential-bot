/**  Generate a random number using the Crypto API
@param {number} initial - intial number
@param {number} final - final number
@returns An number between initial and final number
*/
export function genAleatoryNumbers(initial, final) {
  var array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % (final - initial)) + initial;
}
