/**
 * LZ-string URI decoding, adapted to stop before exceeding the output limit.
 * MIT License — Copyright (c) 2013 pieroxy
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-";

export function decompressBounded(
  encoded: string,
  maxOutput: number,
): string | null {
  if (!encoded || !Number.isSafeInteger(maxOutput) || maxOutput < 0)
    return null;
  const input = encoded.replace(/ /g, "+");
  let offset = 0;
  const readBits = (count: number): number | null => {
    if (offset + count > input.length * 6) return null;
    let value = 0;
    for (let bit = 0; bit < count; bit++, offset++) {
      const character = alphabet.indexOf(input[Math.floor(offset / 6)]);
      if (character < 0) return null;
      if (character & (32 >> (offset % 6))) value += 2 ** bit;
    }
    return value;
  };
  const initial = readBits(2);
  if (initial === 2) return "";
  if (initial !== 0 && initial !== 1) return null;
  const first = readBits(initial === 0 ? 8 : 16);
  if (first === null || maxOutput < 1) return null;
  let previous = String.fromCharCode(first);
  const dictionary = ["", "", "", previous];
  const output = [previous];
  let outputLength = 1;
  let width = 3;
  let remaining = 4;
  const grow = () => {
    if (remaining === 0) {
      remaining = 2 ** width;
      width++;
    }
  };
  while (true) {
    let code = readBits(width);
    if (code === null) return null;
    if (code === 2) return output.join("");
    if (code === 0 || code === 1) {
      const literal = readBits(code === 0 ? 8 : 16);
      if (literal === null) return null;
      dictionary.push(String.fromCharCode(literal));
      code = dictionary.length - 1;
      remaining--;
    }
    grow();
    let entry = dictionary[code];
    if (entry === undefined) {
      if (code !== dictionary.length) return null;
      // Check before creating the special previous + previous[0] entry.
      if (outputLength + previous.length + 1 > maxOutput) return null;
      entry = previous + previous[0];
    }
    if (outputLength + entry.length > maxOutput) return null;
    outputLength += entry.length;
    output.push(entry);
    dictionary.push(previous + entry[0]);
    remaining--;
    previous = entry;
    grow();
  }
}
