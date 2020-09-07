import { julianCenturies, toJulian, J2000 } from './julian';
import { Moon } from './moon';
import { Quaternions } from './quaternion';
import { sin, cos, tan, asin, atan, atan2, degree, rad, PI } from './trig';

const EARTH_OBLIQUITY = 23.4393 // epsilon

// lat/long west 
export const MAGNETIC_NP = {
    lat:  86.50,
    long: 164.04
}


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

// https://www.w3.org/TR/orientation-event/#biblio-eulerangles
function getQuaternion(alpha, beta, gamma) {

  var _x = beta  || 0; // beta value
  var _y = gamma || 0; // gamma value
  var _z = alpha || 0; // alpha value

  var cX = cos( _x/2 );
  var cY = cos( _y/2 );
  var cZ = cos( _z/2 );
  var sX = sin( _x/2 );
  var sY = sin( _y/2 );
  var sZ = sin( _z/2 );

  //
  // ZXY quaternion construction.
  //

  var w = cX * cY * cZ - sX * sY * sZ;
  var x = sX * cY * cZ - cX * sY * sZ;
  var y = cX * sY * cZ + sX * cY * sZ;
  var z = cX * cY * sZ + sX * sY * cZ;

  return [ w, x, y, z ];
}

export function computeAltAzFromABG(alpha, beta, gamma, compass) {
    const deviceOriginVector = [0, 0, -1] 
    const quaternion = getQuaternion(alpha, beta, gamma); 
    const directionVec = Quaternions.rotate(deviceOriginVector, quaternion) 
    const altitude = toAltitude(directionVec)
    return { altitude, azimuth: compass }
}

export function computeAltAzFromQuat(sensorQuaternion) {
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
    return computeLocation(altAz, jd, sunLoc, parallaxAngle);
}

export function moonComputeLocation(altAz, date) {
    const jd = toJulian(date)
    const moonLoc = Moon.eclipLatLong(jd)
    const parallaxAngle = Moon.horizontalParallaxJd(jd) 
    return computeLocation(altAz, jd, moonLoc, parallaxAngle);
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

// Find angle between pole being used and celestial point
// azimuth only works directly is using north pole and celestial object is east of here
function azimuthToHereAngle(azimuth, celestialIsToWest) {
    return celestialIsToWest ? 360 - azimuth : azimuth; 
}


/*
    Compute current location based on the observed altitude and azimuth of a 
    celestial object, the known ecliptic latitude and longitude of the celestial
    object, the current julian date (to compute the ra/dec of the celestial object),
    and the known parallax angle of the object at this time
*/
function computeLocation(altAz, jd, eclipLatLong, parallaxAngle) {
    
	let { altitude, azimuth } = altAz
    const altCorrection = altitudeRefractionCorrection(altitude)
    altitude += altCorrection
   
    const ra = rightAscension(eclipLatLong)
    const dec = declination(eclipLatLong)

    // nearest point to celestial object
    const celestial = {
        long: raToLong(jd, ra),
        lat: dec
    }

    const hereToCelestial = 90 - altitude - parallaxAngle
    const celestialToMag = haversineDist(MAGNETIC_NP, celestial);
    const celestialIsToWest = 180 < azimuth && azimuth < 360; // things get weird if directly north or south
    const hereAngle = azimuthToHereAngle(azimuth, celestialIsToWest);
    const bearingCelToMag = bearing(celestial, MAGNETIC_NP); 

    if (celestialToMag > asin(sin(hereToCelestial) * sin(hereAngle))) {
        const magAngle = asin(sin(hereToCelestial) * sin(hereAngle) / sin(celestialToMag))
        const magToHere = compute3rdSubtendedAngle(magAngle, hereAngle, celestialToMag, hereToCelestial)   

        // sin(celAngle) / sin(magToHere) == sin(magAngle) / sin(hereToCelestial)
        const celAngle = asin(sin(magToHere) * sin(magAngle) / sin(hereToCelestial)) // law of sines
        const bearingCelToHere = celestialIsToWest ? bearingCelToMag + celAngle : bearingCelToMag - celAngle;
        const here = locationFromBearingDistance(celestial, bearingCelToHere, hereToCelestial); 

        console.log('hereToCelestial', hereToCelestial);
        console.log('celestialToMag', celestialToMag);
        console.log('celestialIsToWest', celestialIsToWest);
        console.log('hereAngle', hereAngle);
        console.log('bearingCelToMag', bearingCelToMag);
        console.log('magAngle', magAngle);
        console.log('magToHere', magToHere);
        console.log('celAngle', celAngle);
        console.log('bearingCelToHere', bearingCelToHere);
        
        console.log('magneticNP', MAGNETIC_NP);
        console.log('celestial', celestial);
        console.log('here', here);

        if (Number.isNaN(here.lat) || Number.isNaN(here.lat)) {
		    alert('Could not find a solution for you location. Perhaps you are not on earth?')
        }

        return { here, celestial };
    } else {
		alert('Could not find a solution for you location. Perhaps you are not on earth?')
    }
}

function locationFromBearingDistance(start, bearing, distance) {
    start = toRegLatLong(start)
    const lat = asin(sin(start.lat) * cos(distance) + cos(start.lat) * sin(distance) * cos(bearing));
    const long_offset = atan2(sin(bearing) * sin(distance) * cos(start.lat), cos(distance) - sin(start.lat) * sin(lat));
    const long = start.long + long_offset
    return fromRegLatLong({ lat, long })
}


// https://www.movable-type.co.uk/scripts/latlong.html - Bearing
// http://mathforum.org/library/drmath/view/55417.html
function bearing(p1, p2) {
    const y = sin(p2.long - p1.long) * cos(p2.lat);
    const x = cos(p1.lat) * sin(p2.lat) - sin(p1.lat) * cos(p2.lat) * cos(p2.long - p1.long);
    const theta = atan2(y, x)

    // since using long west, x is negative to normally long
    // this means 0->180 will be from -y axis clockwise to +y axis, and 0 -> -180 will be mapped to -y axis to +y axis ccw  
    // hence to get to standard compass degrees, need to subtract 90, then do appropiate mod
    return mod(theta - 90, 360);
}

// https://www.movable-type.co.uk/scripts/gis-faq-5.1.html
// returns angle of arc subtended by earth
// returns non-negatives value
function haversineDist(p1, p2) {
    const dlon = p2.long - p1.long; 
    const dlat = p2.lat - p1.lat; 
    const a = sin(dlat/2)**2 + cos(p1.lat) * cos(p2.lat) * sin(dlon/2)**2;
    const c = 2 * asin(Math.min(1, Math.sqrt(a)));
    return c;
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

export function toRegLatLong(latLong) {
    return {
        lat: latLong.lat,
        long: toRegLong(latLong.long)
    }
}

export function toRegLong(longW) {
    longW = mod(longW, 360)
    return longW <= 180 ? -longW : 360 - longW;
}


