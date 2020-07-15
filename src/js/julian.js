// https://en.wikipedia.org/wiki/Julian_day
// https://github.com/mourner/suncalc/blob/master/suncalc.js 
export const dayMs = 1000 * 60 * 60 * 24,
    J1970 = 2440588.0,
    J2000 = 2451545.0,
    DAYS_IN_CENTURY = 36525.0;

export function julianCenturies(jd) {
    return (jd - J2000) / DAYS_IN_CENTURY;
}

export function toJulian(date) {
   return date.valueOf() / dayMs - 0.5 + J1970;
}





