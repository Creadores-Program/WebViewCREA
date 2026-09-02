export default `(function (root) {
  if (typeof root.encodeURIComponent === 'function') {
    return;
  }

  root.encodeURIComponent = function (str) {
    str = String(str);
    var result = '';
    var i, b, codePoint, nextCode, bytes, hex;

    for (i = 0; i < str.length; i++) {
      codePoint = str.charCodeAt(i);

      if (codePoint >= 0xD800 && codePoint <= 0xDBFF) {
        if (i + 1 < str.length) {
          nextCode = str.charCodeAt(i + 1);
          if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
            codePoint = ((codePoint - 0xD800) << 10) + (nextCode - 0xDC00) + 0x10000;
            i++;
          }
        }
      }

      if (
        (codePoint >= 0x41 && codePoint <= 0x5A) ||
        (codePoint >= 0x61 && codePoint <= 0x7A) ||
        (codePoint >= 0x30 && codePoint <= 0x39) ||
        codePoint === 0x2D || codePoint === 0x5F ||
        codePoint === 0x2E || codePoint === 0x21 ||
        codePoint === 0x7E || codePoint === 0x2A ||
        codePoint === 0x27 || codePoint === 0x28 ||
        codePoint === 0x29
      ) {
        result += String.fromCharCode(codePoint);
        continue;
      }

      bytes = [];
      if (codePoint <= 0x7F) {
        bytes.push(codePoint);
      } else if (codePoint <= 0x7FF) {
        bytes.push(0xC0 | (codePoint >> 6));
        bytes.push(0x80 | (codePoint & 0x3F));
      } else if (codePoint <= 0xFFFF) {
        bytes.push(0xE0 | (codePoint >> 12));
        bytes.push(0x80 | ((codePoint >> 6) & 0x3F));
        bytes.push(0x80 | (codePoint & 0x3F));
      } else if (codePoint <= 0x10FFFF) {
        bytes.push(0xF0 | (codePoint >> 18));
        bytes.push(0x80 | ((codePoint >> 12) & 0x3F));
        bytes.push(0x80 | ((codePoint >> 6) & 0x3F));
        bytes.push(0x80 | (codePoint & 0x3F));
      }

      for (b = 0; b < bytes.length; b++) {
        hex = bytes[b].toString(16).toUpperCase();
        result += '%' + (hex.length === 1 ? '0' + hex : hex);
      }
    }

    return result;
  };
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);`;