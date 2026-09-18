const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

const NUMERIC_TOKEN = /^[0-9]+(?:[./-][0-9]+)*$/u;
const ATTACHED_PERSIAN_NUMBER =
  /^([0-9]+(?:[./-][0-9]+)*)(?=[\p{Script=Arabic}\p{M}])/u;

export function normalizeProductNameDigits(name) {
  const parts = name.split(/(\s+)/u);
  let inModelTail = false;

  const nonWhitespace = (index, direction) => {
    let i = index + direction;

    while (i >= 0 && i < parts.length) {
      if (!/^\s+$/u.test(parts[i])) {
        return parts[i];
      }
      i += direction;
    }

    return "";
  };

  return parts
    .map((part, index) => {
      if (/^\s+$/u.test(part)) {
        return part;
      }

      if (/^مدل$|^model$/iu.test(part)) {
        inModelTail = true;
        return part;
      }

      if (inModelTail) {
        return part;
      }

      if (/[A-Za-z]/u.test(part)) {
        return part;
      }

      if (ATTACHED_PERSIAN_NUMBER.test(part)) {
        return part.replace(
          ATTACHED_PERSIAN_NUMBER,
          (_, digits) =>
            digits.replace(/[0-9]/g, (digit) => FA_DIGITS[Number(digit)]),
        );
      }

      if (!NUMERIC_TOKEN.test(part)) {
        return part;
      }

      const prev = nonWhitespace(index, -1);
      const next = nonWhitespace(index, 1);

      if (/[A-Za-z]/u.test(prev) || /[A-Za-z]/u.test(next)) {
        return part;
      }

      return part.replace(/[0-9]/g, (digit) => FA_DIGITS[Number(digit)]);
    })
    .join("");
}
