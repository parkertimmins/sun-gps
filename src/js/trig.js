
export function degree(rad) { 
    return rad * (180 / PI) 
} 
 
export function rad(degree) { 
    return degree * PI / 180 
}

export const sin = (deg) => Math.sin(rad(deg)), 
      cos = (deg) => Math.cos(rad(deg)), 
      tan = (deg) => Math.tan(rad(deg)), 
      acos = (x) => degree(Math.acos(x)), 
      asin = (x) => degree(Math.asin(x)), 
      atan = (x) => degree(Math.atan(x)), 
      atan2 = (x, y) => degree(Math.atan2(x, y)), 
      PI = Math.PI; 

