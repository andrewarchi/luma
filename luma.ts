/*
 * HTML 5.1   https://www.w3.org/TR/2016/REC-html51-20161101/infrastructure.html#colors
 * HTML 4.01  https://www.w3.org/TR/1999/REC-html401-19991224/types.html#h-6.5
 * HTML 3.2   https://www.w3.org/TR/REC-html32#colors
 * CSS 1      https://www.w3.org/TR/2008/REC-CSS1-20080411/#color-units
 * CSS 2.2    https://www.w3.org/TR/2016/WD-CSS22-20160412/syndata.html#color-units
 * CSS 3      https://www.w3.org/TR/2011/REC-css3-color-20110607/
 *
 * Summary of the different standards:
 * http://webcolors.readthedocs.io/en/1.5/colors.html
 */

function Luma(input: string): Luma.Color {
  return Luma.parse(input);
}

namespace Luma {
  export class Color {
    private r: number;
    private g: number;
    private b: number;
    private a: number;

    constructor(r: number, g: number, b: number, a: number = 1) {
      this.r = clampFF(r);
      this.g = clampFF(g);
      this.b = clampFF(b);
      this.a = clamp01(a);
    }

    toString(): string {
      if (this.a === 1) { return this.toHexString(); }
      if (this.a === 0) { return 'transparent'; }
      return this.toRgbaString();
    }

    equals(color: Color): boolean {
      return this.r === color.r && this.g === color.g && this.b === color.b && this.a === color.a;
    }

    clone(): Color {
      return new Color(this.r, this.g, this.b, this.a);
    }

    // Ignores alpha channel
    // https://www.w3.org/TR/2016/REC-html51-20161101/infrastructure.html#rules-for-serializing-simple-color-values
    toHexString(useShort: boolean = true): string {
      let hex = '#'
        + ('0' + this.r.toString(16)).slice(-2)
        + ('0' + this.g.toString(16)).slice(-2)
        + ('0' + this.b.toString(16)).slice(-2);
      if (useShort) {
        return shortenHex(hex);
      }
      return hex;
    }

    toRgb(): RGB {
      return { r: this.r, g: this.g, b: this.b, a: this.a };
    }

    toRgbString(): string {
      if (this.a !== 1) { return this.toRgbaString(); }
      return toFuncString('rgb', this.r, this.g, this.b);
    }

    toRgbaString(): string {
      return toFuncString('rgba', this.r, this.g, this.b, this.a);
    }
  }

  namespace funcs {
    export function rgb(r: string, g: string, b: string): Color {
      return rgba(r, g, b, '1');
    }
    export function rgba(r: string, g: string, b: string, a: string): Color {
      return new Color(cssNumber(r, 255), cssNumber(g, 255), cssNumber(b, 255), cssNumber(a, 1));
    }

    export function hsl(h: string, s: string, l: string): Color {
      return hsla(h, s, l, '1');
    }
    export function hsla(h: string, s: string, l: string, a: string): Color {
      return Luma.hsl(cssNumber(h, 360), cssNumber(s, 100), cssNumber(l, 100), cssNumber(a, 1));
    }

    export function hsv(h: string, s: string, v: string): Color {
      return hsva(h, s, v, '1');
    }
    export function hsva(h: string, s: string, v: string, a: string): Color {
      return Luma.hsv(cssNumber(h, 360), cssNumber(s, 100), cssNumber(v, 100), cssNumber(a, 1));
    }
  }
  
  export function parse(input: string): Color {
    let args = matchers.matchFunc(input);
    if (!args) { return null; }
    let func = funcs[args[0].toLowerCase()];
    if (!func) { return null; }
    return func(...args.slice(1));
  }

  function toHex(...channels: number[]): string {
    return '#' + channels.map(c => ('0' + c.toString(16)).slice(-2));
  }

  function shortenHex(input: string): string {
    let matches = matchers.hex3Long.exec(input);
    if (matches) {
      return '#' + matches[1] + matches[2] + matches[3];
    }
    return input;
  }

  export interface RGB {
    r, g, b, a: number;
  }

  // Simple color
  // https://www.w3.org/TR/2016/REC-html51-20161101/infrastructure.html#rules-for-parsing-simple-color-values
  export function hex6(input: string): Color {
    let matches = matchers.hex6.exec(input);
    if (!matches) { return null; }
    return new Color(
      parseInt(matches[1], 16),
      parseInt(matches[2], 16),
      parseInt(matches[3], 16)
    );
  }

  export function hex3(input: string): Color {
    let matches = matchers.hex3.exec(input);
    if (!matches) { return null; }
    return new Color(
      17 * parseInt(matches[1], 16),
      17 * parseInt(matches[2], 16),
      17 * parseInt(matches[3], 16)
    );
  }

  // RGB
  //   r: [0, 255] or [0%, 100%]
  //   g: [0, 255] or [0%, 100%]
  //   b: [0, 255] or [0%, 100%]
  //   a: [0, 1] optional
  export function rgb(r: number, g: number, b: number, a: number = 1): Color {
    return new Color(r, g, b, a);
  }

  // HSL
  //   h: [0°, 360°)
  //   s: [0%, 100%]
  //   l: [0%, 100%]
  //   a: [0, 1]
  export function hsl(h: number, s: number, l: number, a: number = 1): Color {
    h = mod(h, 360) / 360;
    s = bound01(s, 100);
    l = bound01(l, 100);

    if (s === 0) {
      return new Color(0, 0, 0, a);
    }

    let m2 = (l <= 0.5) ? l * (s + 1) : l + s - l * s;
    let m1 = l * 2 - m2;

    function hue(h) {
      if (h < 0) { h++; }
      if (h > 1) { h--; }
      if (h * 6 < 1) { return m1 + (m2 - m1) * h * 6; }
      if (h * 2 < 1) { return m2; }
      if (h * 3 < 2) { return m1 + (m2 - m1) * (2/3 - h) * 6; }
      return m1;
    }

    return rgb(
      255 * hue(h + 1/3),
      255 * hue(h),
      255 * hue(h - 1/3),
      a);
  }

  // HSV
  //   h: [0°, 360°)
  //   s: [0%, 100%]
  //   v: [0%, 100%]
  //   a: [0, 1]
  // https://gist.github.com/voxpelli/1069204
  export function hsv(h: number, s: number, v: number, a: number = 1): Color {
    s = bound01(s, 100);
    v = bound01(s, 100);
    
    let s2 = s * v;
    let l2 = (2 - s) * v;
    
    if (l2 === 2) {
      s2 = 0;
    }
    else {
      s2 /= (l2 < 1) ? l2 : 2 - l2;
    }
    l2 /= 2;
    
    return hsl(h, s2 * 100, l2 * 100, a);
  }

  // Legacy color value
  // https://www.w3.org/TR/2016/REC-html51-20161101/infrastructure.html#rules-for-parsing-a-legacy-color-value
  export function legacy(input: string): Color { // 1
    if (input === '') { // 2
      return null; // error
    }
    input = matchers.trim(input); // 3
    let lower = input.toLowerCase();
    if (lower === 'transparent') { // 4
      return null; // error
    }
    if (colorKeywords.css3.hasOwnProperty(lower)) { // 5
      return hex6(colorKeywords.css3[lower]);
    }
    let hex = hex3(input); // 6
    if (hex !== null) {
      return hex;
    }
    input = input.replace(/[^\x00-\uFFFF]/g, '00'); // 7
    input = input.slice(0, 128); // 8
    if (input.charAt(0) === '#') { // 9
      input = input.slice(1);
    }
    input = input.replace(/[^\dA-F]/gi, '0'); // 10
    while (input.length === 0 || input.length % 3 !== 0) { // 11
      input += '0';
    }
    let length = input.length / 3; // 12
    let components = input.match(new RegExp('.{' + length + '}', 'g'));
    if (length > 8) { // 13
      components = components.map(c => c.slice(-8));
      length = 8;
    }
    while (length > 2 && components.every(c => c.charAt(0) === '0')) { // 14
      components = components.map(c => c.slice(1));
      length--;
    }
    if (length > 2) { // 15
      components = components.map(c => c.slice(0, 2));
    }
    // NOTE: if this is modified to output a hexadecimal string, leading
    // zeros need to be prepended when components have only one character.
    return new Color( // 16
      parseInt(components[0], 16), // 17
      parseInt(components[1], 16), // 18
      parseInt(components[2], 16) // 19
    ); // 20
  }

  // HTML 3.2-4.01
  // hex6, Windows VGA palette
  export function html4(input: string): Color {
    let lower = input.toLowerCase();
    if (colorKeywords.html4.hasOwnProperty(lower)) {
      input = colorKeywords.html4[lower];
    }
    return hex6(input);
  }

  // CSS 1
  // hex3, hex6, rgb, rgb%, Windows VGA palette
  export function css1(input: string): Color {
    let lower = input.toLowerCase();
    if (colorKeywords.html4.hasOwnProperty(lower)) {
      input = colorKeywords.html4[lower];
    }
    return hex6(input) || hex3(input);
      //|| rgb(input); // NOTE: this includes rgba, but shouldn't
  }

  // CSS 2.1
  // hex3, hex6, rgb, rgb%, Windows VGA palette, orange, system colors
  // Orange added in CSS 2.1
  // System colors are not supported because they are platform dependant
  export function css2(input: string): Color {
    if (input.toLowerCase() === 'orange') {
      return hex6('#ffa500');
    }
    if (isSystem(input)) {
      return null; // No defined rgb
    }
    return css1(input);
  }

  // CSS 3
  // hex3, hex6, rgb(a), rgb(a)%, hsl(a), extended color keywords, currentColor, system colors
  export function css3(input: string): Color {
    return // hex6(input) || hex3(input) || rgb(input);
  }

  // Checks if string is a CSS 2 system color
  export function isSystem(input: string): boolean {
    return colorKeywords.css2System.indexOf(input.toLowerCase()) !== -1;
  }

  // CSS 3
  // Checks if string is the 'currentColor' keyword
  export function isCurrentColor(input: string): boolean {
    return input.toLowerCase() === 'currentcolor';
  }

  namespace matchers {
    const cssInteger = `[-\\+]?\\d+`; // http://www.w3.org/TR/css3-values/#integers
    const cssNumber = `[-\\+]?\\d*\\.\\d+(?:[eE]${cssInteger})?`; // http://www.w3.org/TR/css3-values/#number-value
    const cssUnit = `(?:${cssInteger})|(?:${cssNumber})%?`;
    // https://www.w3.org/TR/2016/WD-CSS22-20160412/syndata.html#whitespace
    // https://www.w3.org/TR/2016/REC-html51-20161101/infrastructure.html#space-characters
    const ws = `[ \\t\\n\\f\\r]`;
    const spacedUnit = `${ws}*(${cssUnit})${ws}*`;
    const group3 = `\\(${spacedUnit},${spacedUnit},${spacedUnit}\\)`;
    const group4 = `\\(${spacedUnit},${spacedUnit},${spacedUnit},${spacedUnit}\\)`;
    const genericFunc = `([a-z]+)\\(((?:${spacedUnit},)*${spacedUnit})\\)`;
    export const hex = /^#[\dA-F]{3}|[\dA-F]{6}$/i;
    export const hex3 = /^#([\dA-F])([\dA-F])([\dA-F])$/i;
    export const hex6 = /^#([\dA-F]{2})([\dA-F]{2})([\dA-F]{2})$/i;
    export const hex3Long = /^#([\dA-F])\1([\dA-F])\2([\dA-F])\3$/i;
    export const rgb = new RegExp('rgb' + group3, 'i');
    export const rgba = new RegExp('rgba' + group4, 'i');
    export const hsl = new RegExp('hsl' + group3, 'i');
    export const hsla = new RegExp('hsla' + group4, 'i');
    export const func = new RegExp(genericFunc, 'i');
    export function trim(input: string): string {
      return input.replace(new RegExp(`^${ws}+|${ws}+$`, 'g'), '');
    }
    // Returns array of [name, ...args]
    export function matchFunc(input: string): string[] {
      let matches = matchers.func.exec(input);
      if (!matches) { return null; }
      let name = matches[1].toLowerCase();
      let args = trim(matches[2]).split(new RegExp(`${ws}*,${ws}*`));
      return [name, ...args];
    }
  }

  function clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max);
  }
  function clamp01(num: number): number {
    return clamp(num, 0, 1);
  }
  function clampFF(num: number): number {
    return clamp(Math.round(num), 0, 255);
  }

  function bound01(num: number, max: number): number {
    return clamp(num, 0, max) / max;
  }

  function mod(dividend: number, divisor: number): number {
    return ((dividend % divisor) + divisor) % divisor;
  }

  function toFuncString(func: string, ...args: number[]): string {
    return `${func}(${args.join(', ')})`;
  }
}

namespace colorKeywords {
  export const css3 = {
    aliceblue: '#f0f8ff',
    antiquewhite: '#faebd7',
    aqua: '#00ffff',
    aquamarine: '#7fffd4',
    azure: '#f0ffff',
    beige: '#f5f5dc',
    bisque: '#ffe4c4',
    black: '#000000',
    blanchedalmond: '#ffebcd',
    blue: '#0000ff',
    blueviolet: '#8a2be2',
    brown: '#a52a2a',
    burlywood: '#deb887',
    cadetblue: '#5f9ea0',
    chartreuse: '#7fff00',
    chocolate: '#d2691e',
    coral: '#ff7f50',
    cornflowerblue: '#6495ed',
    cornsilk: '#fff8dc',
    crimson: '#dc143c',
    cyan: '#00ffff',
    darkblue: '#00008b',
    darkcyan: '#008b8b',
    darkgoldenrod: '#b8860b',
    darkgray: '#a9a9a9',
    darkgreen: '#006400',
    darkgrey: '#a9a9a9',
    darkkhaki: '#bdb76b',
    darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f',
    darkorange: '#ff8c00',
    darkorchid: '#9932cc',
    darkred: '#8b0000',
    darksalmon: '#e9967a',
    darkseagreen: '#8fbc8f',
    darkslateblue: '#483d8b',
    darkslategray: '#2f4f4f',
    darkslategrey: '#2f4f4f',
    darkturquoise: '#00ced1',
    darkviolet: '#9400d3',
    deeppink: '#ff1493',
    deepskyblue: '#00bfff',
    dimgray: '#696969',
    dimgrey: '#696969',
    dodgerblue: '#1e90ff',
    firebrick: '#b22222',
    floralwhite: '#fffaf0',
    forestgreen: '#228b22',
    fuchsia: '#ff00ff',
    gainsboro: '#dcdcdc',
    ghostwhite: '#f8f8ff',
    gold: '#ffd700',
    goldenrod: '#daa520',
    gray: '#808080',
    green: '#008000',
    greenyellow: '#adff2f',
    grey: '#808080',
    honeydew: '#f0fff0',
    hotpink: '#ff69b4',
    indianred: '#cd5c5c',
    indigo: '#4b0082',
    ivory: '#fffff0',
    khaki: '#f0e68c',
    lavender: '#e6e6fa',
    lavenderblush: '#fff0f5',
    lawngreen: '#7cfc00',
    lemonchiffon: '#fffacd',
    lightblue: '#add8e6',
    lightcoral: '#f08080',
    lightcyan: '#e0ffff',
    lightgoldenrodyellow: '#fafad2',
    lightgray: '#d3d3d3',
    lightgreen: '#90ee90',
    lightgrey: '#d3d3d3',
    lightpink: '#ffb6c1',
    lightsalmon: '#ffa07a',
    lightseagreen: '#20b2aa',
    lightskyblue: '#87cefa',
    lightslategray: '#778899',
    lightslategrey: '#778899',
    lightsteelblue: '#b0c4de',
    lightyellow: '#ffffe0',
    lime: '#00ff00',
    limegreen: '#32cd32',
    linen: '#faf0e6',
    magenta: '#ff00ff',
    maroon: '#800000',
    mediumaquamarine: '#66cdaa',
    mediumblue: '#0000cd',
    mediumorchid: '#ba55d3',
    mediumpurple: '#9370db',
    mediumseagreen: '#3cb371',
    mediumslateblue: '#7b68ee',
    mediumspringgreen: '#00fa9a',
    mediumturquoise: '#48d1cc',
    mediumvioletred: '#c71585',
    midnightblue: '#191970',
    mintcream: '#f5fffa',
    mistyrose: '#ffe4e1',
    moccasin: '#ffe4b5',
    navajowhite: '#ffdead',
    navy: '#000080',
    oldlace: '#fdf5e6',
    olive: '#808000',
    olivedrab: '#6b8e23',
    orange: '#ffa500',
    orangered: '#ff4500',
    orchid: '#da70d6',
    palegoldenrod: '#eee8aa',
    palegreen: '#98fb98',
    paleturquoise: '#afeeee',
    palevioletred: '#db7093',
    papayawhip: '#ffefd5',
    peachpuff: '#ffdab9',
    peru: '#cd853f',
    pink: '#ffc0cb',
    plum: '#dda0dd',
    powderblue: '#b0e0e6',
    purple: '#800080',
    rebeccapurple: '#663399',
    red: '#ff0000',
    rosybrown: '#bc8f8f',
    royalblue: '#4169e1',
    saddlebrown: '#8b4513',
    salmon: '#fa8072',
    sandybrown: '#f4a460',
    seagreen: '#2e8b57',
    seashell: '#fff5ee',
    sienna: '#a0522d',
    silver: '#c0c0c0',
    skyblue: '#87ceeb',
    slateblue: '#6a5acd',
    slategray: '#708090',
    slategrey: '#708090',
    snow: '#fffafa',
    springgreen: '#00ff7f',
    steelblue: '#4682b4',
    tan: '#d2b48c',
    teal: '#008080',
    thistle: '#d8bfd8',
    tomato: '#ff6347',
    turquoise: '#40e0d0',
    violet: '#ee82ee',
    wheat: '#f5deb3',
    white: '#ffffff',
    whitesmoke: '#f5f5f5',
    yellow: '#ffff00',
    yellowgreen: '#9acd32'
  };

  // Windows VGA palette
  // HTML 3.2-4.01
  // CSS 1
  export const html4 = {
    aqua:    '#00ffff',
    black:   '#000000',
    blue:    '#0000ff',
    fuchsia: '#ff00ff',
    gray:    '#808080',
    green:   '#008000',
    lime:    '#00ff00',
    maroon:  '#800000',
    navy:    '#000080',
    olive:   '#808000',
    purple:  '#800080',
    red:     '#ff0000',
    silver:  '#c0c0c0',
    teal:    '#008080',
    white:   '#ffffff',
    yellow:  '#ffff00'
  };

  export const css21 = Object.assign({
    orange: '#ffa500'
  }, html4);

  export const css2System = [
    'ActiveBorder',
    'ActiveCaption',
    'AppWorkspace',
    'Background',
    'ButtonFace',
    'ButtonHighlight',
    'ButtonShadow',
    'ButtonText',
    'CaptionText',
    'GrayText',
    'Highlight',
    'HighlightText',
    'InactiveBorder',
    'InactiveCaption',
    'InactiveCaptionText',
    'InfoBackground',
    'InfoText',
    'Menu',
    'MenuText',
    'Scrollbar',
    'ThreeDDarkShadow',
    'ThreeDFace',
    'ThreeDHighlight',
    'ThreeDLightShadow',
    'ThreeDShadow',
    'Window',
    'WindowFrame',
    'WindowText'
  ].map(c => c.toLowerCase());
}

// Handles percentages, exponents, and clamps number to range
function cssNumber(input: string, max: number): number {
  if (input.slice(-1) === '%') {
    input = input.slice(0, -1);
    return Math.min(Math.max(max * parseFloat(input) / 100, 0), max);
  }
  return Math.min(Math.max(parseFloat(input), 0), max);
}

namespace test {
  let legacyTests = [
    [null, ''], // 2
    ['#000000', '   '], // 3
    ['#abc123', '  #abc123   '], // 3
    ['#ffffff', ' \t\n\f\r#ffffff'], // 3
    [null, 'transparent'], // 4
    [null, 'TrAnSpArEnT'], // 4
    ['#6495ed', 'cornflowerblue'], // 5
    ['#daa520', 'GoldenRod'], // 5
    ['#663399', 'rebeccapurple'], // 5
    ['#aabbcc', '#Abc'], // 6
    ['#119999', '#199'], // 6
    ['#a00b00', '#a\u{1F603}b\u{1f609}'], // 7
    ['#abc00d', '#abc\uD83D\uDE00d'], // 7
    ['#674523', '123456789ABCDEF'.repeat(10)], // 8
    ['#000110', '0001002'.repeat(20)], // 8
    ['#123456', '#123456'], // 9
    ['#123456', '123456'], // 9
    ['#ba0a0a', '#BANANA'], // 10
    ['#c00000', 'Chuck Norris'], // 10
    ['#000000', '#'], // 11
    ['#010203', '123'], // 11
    ['#123450', '#12345'], // 11
    ['#124570', '#1234567'], // 11
    ['#232323', '#123456789123456789123456789'], // 13
    ['#121212', '#A01234567A01234567A01234567'], // 13
    ['#123456', '#012034056'], // 14
    ['#012300', '#000100230000'], // 14
    ['#12ab45', '#123abc456'], // 15
    ['#014589', '#0123456789ab'], // 15
  ];

  function testCompare(input, expected) {
    let parsed = Luma.legacy(input);
    let hex = null;
    let rgb = null;
    if (parsed !== null) {
      hex = parsed.toHexString(false);
      rgb = parsed.toRgbString();
    }

    document.body.setAttribute('bgcolor', input);
    let bgcolor = getComputedStyle(document.body, null).backgroundColor;

    if (hex !== expected) {
      console.error(input, ': Expected', expected, 'but got', hex);
    }
    if (rgb !== bgcolor) {
      console.error(input, ': Browser rendered', bgcolor, 'but got', rgb);
    }
  }

  console.log('\n\nTests:');
  for (let test of legacyTests) {
    testCompare(test[1], test[0]);
  }
}
