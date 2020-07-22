import { julianCenturies, toJulian, J2000 } from './julian';
import { Moon } from './moon';
import { Quaternions } from './quaternion';
import { sin, cos, tan, asin, atan, atan2, degree, rad, PI } from './trig';


const EARTH_OBLIQUITY = 23.4393 // epsilon

function toAzimuth(vector4) {
    // vector comes from a quaternion ... can throw away scalar 
    const [_, x, y, z] = vector4;

    // [PI, -PI] - positive ccw from east
    const thetaPiMax = -Math.atan2(y, x)
    
    // [0, 2PI] - positive ccw from east
    const theta2PiMax = thetaPiMax < 0 ? 2 * PI + thetaPiMax : thetaPiMax
    
    // [0, 2PI] - positive ccw from north 
    const thetaFromNorth = (theta2PiMax + PI / 2) % (2 * PI)

    return degree(thetaFromNorth)
}

function toAltitude(vector4) {
    // vector comes from a quaternion ... can throw away scalar 
    const [_, x, y, z] = vector4;
    const vecLenOnXYPlane = Math.sqrt(x**2 + y**2)
    const altitude = atan(z / vecLenOnXYPlane) 
    return altitude
}

function rightAscension(eclip) {
    const l = cos(eclip.lat) * cos(eclip.long)
    const m = 0.9175 * cos(eclip.lat) * sin(eclip.long) - 0.3978 * sin(eclip.lat)    
    const newRes = atan(m/l) 

    return atan2(sin(eclip.long) * cos(EARTH_OBLIQUITY) - tan(eclip.lat) * sin(EARTH_OBLIQUITY), cos(eclip.long))
    //const old = mod(atan2(sin(eclip.long) * cos(EARTH_OBLIQUITY) - tan(eclip.lat) * sin(EARTH_OBLIQUITY), cos(eclip.long)), 360)
    
    //console.log('ra', newRes, old)
    return newRes
}

function declination(eclip) {
    return asin(sin(eclip.lat) * cos(EARTH_OBLIQUITY) + cos(eclip.lat) * sin(EARTH_OBLIQUITY) * sin(eclip.long))
}

// since we are looking for the place at solar noon, 
// and hour angle H = 0 = side real time - right ascension, side real time == ra 
// theta(sidereal) = [theta0 + theta1 * (JD - J2000) - lw] mod 360
// (A + B) mod C = (A mod C + B mod C) mod C
function raToLong(JD, ra) {
    return (280.1470 + 360.9856235 * (JD - J2000) - ra) % 360
}

// degrees, long is [0, 360] west
// https://www.aa.quae.nl/en/reken/zonpositie.html
function sunEclipLatLong(JD) {
    // mean anomaly
    const M = (357.5291 + 0.98560028 * (JD - J2000)) % 360  

    // equation of center
    const C = 1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)
    
    // Perihelion and the Obliquity of the Ecliptic
    const eclipticLongPeri = 102.9373 // perihelion of the earth, relative to the ecliptic and vernal equinox

    // mean ecliptic long
    const L = M + eclipticLongPeri
   
    // ecliptic long - 180 for the earth
    const lambda = L + C + 180
    const b = 0 // ecliptic lat - divergence of sun from ecliptic is alway 0

    // right ascension and declination
    return {
        long: lambda,
        lat: b
    }
} 

export function computeAltAz(sensorQuaternion) {
    const deviceOriginVector = [0, 0, -1] 
    const quaternion = Quaternions.toInternalQuat(sensorQuaternion)
    const directionVec = Quaternions.rotate(deviceOriginVector, quaternion) 
    const altitude = toAltitude(directionVec)
    const azimuth = toAzimuth(directionVec)
    return { altitude, azimuth }
}

export function sunComputeLocation(altAz, date) {
    const jd = toJulian(date)
    const sunLoc = sunEclipLatLong(jd)
    // estimate based on asumption that sun at infinite distance
    const parallaxAngle = 0
    return computeLocation(altAz, jd, sunLoc, parallaxAngle)
}

export function moonComputeLocation(altAz, date) {
    const jd = toJulian(date)
    const moonLoc = Moon.eclipLatLong(jd)
    const parallaxAngle = Moon.horizontalParallaxJd(jd) 
    return computeLocation(altAz, jd, moonLoc, parallaxAngle)
}

function toLatLong(eclipLatLong, jd) {  
    const ra = rightAscension(eclipLatLong)
    const dec = declination(eclipLatLong)

    // nearest point to celestial object
    return {
        long: raToLong(jd, ra),
        lat: dec
    }
}

function computeLocation(altAz, jd, eclipLatLong, parallaxAngle) {
    
	let { altitude, azimuth } = altAz
    const altCorrection = altitudeRefractionCorrection(altitude)
    altitude += altCorrection
   
    const ra = rightAscension(eclipLatLong)
    const dec = declination(eclipLatLong)

    // nearest point to celestial object
    const p = {
        long: raToLong(jd, ra),
        lat: dec
    }
    //console.log(toRegLatLong(p))


    const hereToP = 90 - altitude - parallaxAngle
 
    // https://en.wikipedia.org/wiki/Solution_of_triangles#Two_sides_and_the_included_angle_given_
    const poleToP = 90 - p.lat 

    if (poleToP > asin(sin(hereToP) * sin(azimuth))) {
        const poleAngle = asin(sin(hereToP) * sin(azimuth) / sin(poleToP))
        const poleToHere = compute3rdSubtendedAngle(poleAngle, azimuth, poleToP, hereToP)   

        const here = {
            lat: 90 - poleToHere,
            long: mod((p.long + poleAngle), 360)
        }

    /*
        console.log('altAz', altAz);
        console.log('p', p);
	    console.log('altCorrection', altCorrection);
		console.log('altitude', altitude);
		console.log('B - azimuth', azimuth)
    	console.log('c - dist here to p', hereToP)
		console.log('b - poleToP', poleToP)
        console.log('angle at pole', poleAngle) 
        console.log('a - here to pole', poleToHere)
        console.log('here', here) 
        console.log('curr1', toRegLatLong(here))
	*/	
        return here
        /*
        if (b < c) {
            const C_ = 180 - C 
            const poleToHere = compute3rdSubtendedAngle(poleAngle, azimuth, poleToSun, hereToSun)   
            const a_ = compute3rdSubtendedAngle(C_, B, b, c)   
            const currLoc2 =  latLongFrom(a_, b, c)
        
            console.log('curr2', currLoc2) 
        }
        */
    } else {
		alert('Could not find a solution for you location. Perhaps you are not on earth?')
    }
}

function mod(m, n) {
	return ((m%n)+n)%n;
};

// take two angles and two subtended arc-angles
function compute3rdSubtendedAngle(C, B, b, c) {
    const a = 2 * atan(tan((b - c) / 2) * sin((B + C) / 2) / sin((B - C) / 2))
    return a
}

// Astronomal Algorithms 16.3
function altitudeRefractionCorrection(h0) {
    const rMinutes = 1 / tan(h0 + 7.31 / (h0 + 4.4))   
    return rMinutes / 60
}

function toRegLatLong(latLong) {
    return {
        lat: latLong.lat,
        long: toRegLong(latLong.long)
    }
}

export function toRegLong(longW) {
    longW = mod(longW, 360)
    return longW <= 180 ? -longW : 360 - longW;
}
