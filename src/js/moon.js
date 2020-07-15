import { julianCenturies } from './julian';


const EARTH_RADIUS_KM = 6378.14

// Originally from most recent Astronomical Almanac, at least 1999-2015
// An Alternative Lunar Ephemeris Model
// https://caps.gsfc.nasa.gov/simpson/pubs/slunar.pdf
export class Moon {

    // Main public method for 
    static eclipLatLong(jd) {
        const t = julianCenturies(jd)
        const eclipLongBase = Moon.eclipticLongBase(t)
        const eclipLatBase = Moon.eclipticLatBase(t)
        //const [eclipLat, eclipLong] = Moon.precessionCorrection(t, eclipLatBase, eclipLongBase)
        return {
            long: eclipLongBase,
            lat: eclipLatBase
        }
    }

    static horizontalParallaxJd(jd) {
        const t = julianCenturies(jd)
        return Moon.horizontalParallax(t)
    }

    static distance(jd) {
        const t = julianCenturies(jd)
        const theta = Moon.horizontalParallax(t)
        return EARTH_RADIUS_KM / sin(theta)
    }

    // t in julian centuries
    static eclipticLongBase(t) {
        return 218.32 + 481267.881 * t +
             6.29 * sin( 477198.87 * t + 135.0) +
            -1.27 * sin(-413335.36 * t + 259.3) +
             0.66 * sin( 890534.22 * t + 235.7) +
             0.21 * sin( 954397.74 * t + 269.9) +
            -0.19 * sin(  35999.05 * t + 357.5) +
            -0.11 * sin( 966404.03 * t + 186.6)
    }

    static eclipticLatBase(t) {
        const sinConstants = [
            [5.13,  483202.02,  93.3],
            [0.28,  960400.89,  228.2],
            [-0.28, 6003.15,    318.3],
            [-0.17, -407332.21, 217.6]
        ]
        return sum(sinConstants.map(([a, b, c]) => a * sin(b * t + c)))
    }

    static horizontalParallax(t) {
        const cosConstants = [
            [0.0518,    477198.85,  134.9],
            [0.0095,    -413335.38, 259.2],
            [0.0078,    890534.23,  235.7],
            [0.0028,    954397.7,   269.9]
        ] 

        return 0.9508 + sum(cosConstants.map(([a, b, c]) => a * cos(b * t + c)))
    }

    static precessionCorrection(t, lat, long) {
        const a = 1.396971 * t + 0.0003086 * t * t
        const b = 0.013056 * t - 0.0000092 * t * t
        const c = 5.12362 - 1.155358 * t - 0.0001964 * t * t

        const latPre = lat - b * sin(long + c)
        const longPre = long - a + b * cos(long + c) * tan(latPre)
        return [latPre, longPre]
    }
}

