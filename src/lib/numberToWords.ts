const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function convert_trillions(num: number): string {
  if (num >= 1000000000000) {
    return convert_trillions(Math.floor(num / 1000000000000)) + " trillion " + convert_billions(num % 1000000000000);
  } else {
    return convert_billions(num);
  }
}

function convert_billions(num: number): string {
  if (num >= 1000000000) {
    return convert_billions(Math.floor(num / 1000000000)) + " billion " + convert_millions(num % 1000000000);
  } else {
    return convert_millions(num);
  }
}

function convert_millions(num: number): string {
  if (num >= 1000000) {
    return convert_millions(Math.floor(num / 1000000)) + " million " + convert_thousands(num % 1000000);
  } else {
    return convert_thousands(num);
  }
}

function convert_thousands(num: number): string {
  if (num >= 1000) {
    return convert_hundreds(Math.floor(num / 1000)) + " thousand " + convert_hundreds(num % 1000);
  } else {
    return convert_hundreds(num);
  }
}

function convert_hundreds(num: number): string {
  if (num > 99) {
    return ones[Math.floor(num / 100)] + " hundred " + convert_tens(num % 100);
  } else {
    return convert_tens(num);
  }
}

function convert_tens(num: number): string {
  if (num < 10) return ones[num];
  else if (num >= 10 && num < 20) return teens[num - 10];
  else {
    return tens[Math.floor(num / 10)] + " " + ones[num % 10];
  }
}

export function numberToWords(num: number): string {
  if (num === 0) return "zero";
  return convert_trillions(num).replace(/\s+/g, ' ').trim() + ' rupees only';
}
