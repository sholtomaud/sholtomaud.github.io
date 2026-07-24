export function html(
  strings: TemplateStringsArray,
  ...values: any[]
): string {
  return strings.reduce((acc, str, i) => {
    let val = values[i];
    if (val === undefined || val === null) {
      val = '';
    } else if (Array.isArray(val)) {
      val = val.join('');
    } else if (typeof val === 'function') {
      val = val();
    }
    return acc + str + val;
  }, '');
}

export function css(
  strings: TemplateStringsArray,
  ...values: any[]
): string {
  return strings.reduce(
    (acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ''),
    ''
  );
}
