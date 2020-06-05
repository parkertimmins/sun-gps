goog.require('goog.structs.Heap');




const video = document.querySelector('video');
const videoSelect = document.querySelector('select#videoSource');

const canvas1 = document.getElementById('canvas1');
const ctx1 = canvas1.getContext('2d');
const canvas2 = document.getElementById('canvas2');
const ctx2 = canvas2.getContext('2d');





// https://github.com/mourner/suncalc/blob/master/suncalc.js 
var dayMs = 1000 * 60 * 60 * 24,
    J1970 = 2440588,
    J2000 = 2451545;

function toJulian(date) { 
   return date.valueOf() / dayMs - 0.5 + J1970; 
}

const sin = (deg) => Math.sin(rad(deg)),
      cos = (deg) => Math.cos(rad(deg)),
      tan = (deg) => Math.tan(rad(deg)),
      acos = (x) => degree(Math.acos(x)),
      asin = (x) => degree(Math.asin(x)),
      atan = (x) => degree(Math.atan(x)),
      atan2 = (x, y) => degree(Math.atan2(x, y)),
      PI = Math.PI;




sensor = new AbsoluteOrientationSensor({frequency: 1, referenceFrame: 'device' })
sensor.addEventListener('reading', e => {

    const alt_az= compute_alt_az(sensor.quaternion)    
    compute_location(alt_az)


    /*
    const deviceOriginVector = [0, 0, -1] 
    const quaternion = Quaternions.toInternalQuat(sensor.quaternion)
    const screenVec = Quaternions.rotate(deviceOriginVector, quaternion) 

    const altitude = toAltitude(screenVec)
    const azimuth = toAzimuth(screenVec)

    console.log('azimuth', degree(azimuth));
    console.log('altitude', degree(altitude));
    console.log('\n')
    */



});
sensor.start();




function toAzimuth(vector) {
    // vector comes from a quaternion ... can throw away scalar 
    const [_, x, y, z] = vector;

    // [PI, -PI] - positive ccw from east
    const thetaPiMax = -Math.atan2(y, x)
    
    // [0, 2PI] - positive ccw from east
    const theta2PiMax = thetaPiMax < 0 ? 2 * PI + thetaPiMax : thetaPiMax
    
    // [0, 2PI] - positive ccw from north 
    const thetaFromNorth = (theta2PiMax + PI / 2) % (2 * PI)

    return degree(thetaFromNorth)
}

function toAltitude(vector) {
    // vector comes from a quaternion ... can throw away scalar 
    const [_, x, y, z] = vector;
    const vec_len_on_xy_plane = Math.sqrt(x**2 + y**2)
    const altitude = atan(z / vec_len_on_xy_plane) 
    return degree(altitude)
}

function degree(rad) {
    return rad * (180 / PI)
}

function rad(degree) {
    return degree * PI / 180
}

class Quaternions {
    // internal [s, v] - external [v, s]
    static toInternalQuat(q) {
        return [q[3], q[0], q[1], q[2]]
    }

    static rotate(vector, quaternion) {
        const quat_vector = [0].concat(vector);
        return Quaternions.multiply(
            Quaternions.multiply(quaternion, quat_vector), 
            Quaternions.inverse(quaternion)
        );
    }

    static squaredNorm(q) {
        return q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]
    }

    static multiply(q, r) {
        return [
            r[0] * q[0] - r[1] * q[1] - r[2] * q[2] - r[3] * q[3], 
            r[0] * q[1] + r[1] * q[0] - r[2] * q[3] + r[3] * q[2], 
            r[0] * q[2] + r[1] * q[3] + r[2] * q[0] - r[3] * q[1], 
            r[0] * q[3] - r[1] * q[2] + r[2] * q[1] + r[3] * q[0], 
        ];
    }

    static inverse(q) {
        const sn =  Quaternions.squaredNorm(q)
        return [q[0], -q[1], -q[2], -q[3]].map(a => a * 1.0 / sn)
    }
}



// https://www.aa.quae.nl/en/reken/zonpositie.html
// degrees, long is [0, 360] west
function sun_lat_long(date) {
    const JD = toJulian(date)
    
    // mean anomaly
    const M = (357.5291 + 0.98560028 * (JD - J2000)) % 360  

    // equation of center
    const C = 1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)
    
    // Perihelion and the Obliquity of the Ecliptic
    const ecliptic_long_peri = 102.9373 // perihelion of the earth, relative to the ecliptic and vernal equinox
    const obliquity = 23.4393 // epsilon

    // mean ecliptic long
    const L = M + ecliptic_long_peri
   
    // ecliptic long - 180 for the earth
    const lambda = L + C + 180
    const b = 0 // ecliptic lat - divergence of sun from ecliptic is alway 0

    // right ascension and declination
    const ra = atan2(sin(lambda) * cos(obliquity), cos(lambda)) 
    const dec = asin(sin(lambda) * sin(obliquity))
    console.log('right ascension', ra)
    console.log('declination', dec)

    // since we are looking for the place at solar noon, 
    // and hour angle H = 0 = side real time - right ascension, side real time == ra 
    // theta(sidereal) = [theta0 + theta1 * (JD - J2000) - lw] mod 360
    // (A + B) mod C = (A mod C + B mod C) mod C
    const long = (280.1470 + 360.9856235 * (JD - J2000) - ra) % 360

    return {
        long, 
        lat: dec
    }
} 

function compute_alt_az(sensor_quaternion) {
    const deviceOriginVector = [0, 0, -1] 
    const quaternion = Quaternions.toInternalQuat(sensor_quaternion)
    const directionVec = Quaternions.rotate(deviceOriginVector, quaternion) 
    const altitude = toAltitude(directionVec)
    const azimuth = toAzimuth(directionVec)
    return { altitude, azimuth }
}

function compute_location(alt_az, date) {

    let { altitude, azimuth } = alt_az
    altitude += altitude_refraction_correction(altitude)
    console.log('altitude', altitude);


    console.log(date)
    const sun = sun_lat_long(date) // in degrees

    // estimate based on asumption that sun at infinite distance
    const dist_here_to_sun = 90 - altitude
    console.log('sun', to_reg_lat_long(sun)) 
 
    // https://en.wikipedia.org/wiki/Solution_of_triangles#Two_sides_and_the_included_angle_given_
    const c = dist_here_to_sun 
    console.log('c - dist here to sun', c)

    // diff from pole
    const b = 90 - sun.lat 
    console.log('b - dist sun to pole', b)
    const B = azimuth
    console.log('B - azimuth', B)

    // 
    if (b > asin(sin(c) * sin(B))) {
        const C = asin(sin(c) * sin(B) / sin(b))
        console.log('angle at pole', C) 

        const a = compute_3rd_subtended_angle(C, B, b, c)   
        console.log('a - dist here to pole', a)
        const loc1 =  lat_long_from(a, b, c, sun.long)
        console.log('alt long', sun.long + C)
        console.log('curr1', to_reg_lat_long(loc1))

        if (b < c) {
            const C_ = 180 - C 
            const a_ = compute_3rd_subtended_angle(C_, B, b, c)   
            const curr_loc2 =  lat_long_from(a_, b, c)
        
            console.log('curr2', curr_loc2) 
        }
    } else {
        alert('nope')
    }
}

function lat_long_from(a, b, c, sun_long) {
    const lat = 90 - a 
    const lat_diff = b - a
    console.log('lat_diff', lat_diff)

    // cos(c) = cos(a)cos(b)  where c is hypotenuse
    // cose(c) = cose(lat_diff) * cos(long_diff)
    const long_diff = acos(cos(c) / cos(lat_diff))
    console.log('long_diff', long_diff)
    const long = sun_long + long_diff // fix the sign here!
    return {lat, long}
}

function compute_3rd_subtended_angle(C, B, b, c) {
    const a = 2 * atan(tan((b - c) / 2) * sin((B + C) / 2) / sin((B - C) / 2))
    return a
}

// Astronomal Algorithms 16.3
function altitude_refraction_correction(h0) {
    const r_minutes = 1 / tan(h0 + 7.31 / (h0 + 4.4))   
    return r_minutes / 60
}



function run() {
    if (!hasGetUserMedia()) {
        alert('getUserMedia() is not supported by your browser');
        return;
    }

	navigator.mediaDevices.enumerateDevices()
		.then(addVideoDevicesToSelect)
		.then(setSelectedStream)
		.catch(handleError);

	videoSelect.onchange = setSelectedStream;
	
}

function setSelectedStream() {
	setVideoToSelectedStream()
	setCanvasToSelectStream();
		//.then(setCanvasToSelectStream);
}


function timerCallback() {
	//if (video.paused || video.ended) {
	 // return;
//	}
	computeFrame();
	setTimeout(timerCallback, 10);
}

function computeFrame() {
	
	// should probably not do every frame ¯\_(ツ)_/¯
	setCanvasDimensions();

	if (canvas1.width === 0 || canvas1.height === 0 || canvas2.width === 0 || canvas2.height === 0) {
		return;
	}
	
	// first copy frame from video element to canvas
	ctx1.drawImage(video, 0, 0);

	
	const frame = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
	const pixels = frame.data.length / 4;


    const heap = new goog.structs.Heap();
    const numMax = 1000;
	for (let i = 0; i < pixels; i++) {
		const pixel = i;
		const r = frame.data[i * 4 + 0];
	  	const g = frame.data[i * 4 + 1];
	  	const b = frame.data[i * 4 + 2];

		const intensity = r + g + b

        heap.insert(intensity, pixel) 
        if (heap.getCount() > numMax) {
            heap.remove() 
        }
	}

    const rcPairs = heap.getValues()
	    .map(pixel => pixelToRc(pixel, canvas1.width))
	const rCenter = Math.round(avg(rcPairs.map(rc => rc[0])))
	const cCenter = Math.round(avg(rcPairs.map(rc => rc[1])))
    console.log(rCenter, cCenter)
    
    const square = 10	
	for (let r = rCenter - square; r < rCenter + square; r++) {
		for (let c = cCenter - square; c < cCenter + square; c++) {
			const pixel = r * canvas2.width + c
			const i = pixel
			frame.data[i * 4 + 0] = 255; // r
			frame.data[i * 4 + 1] = 0; // g
			frame.data[i * 4 + 2] = 255; // b
		}
	}				
	
	ctx2.putImageData(frame, 0, 0);
}

function pixelToRc(pixel, width) {
	const r = pixel / width
	const c = pixel % width 
	return [r, c]

}

function avg(nums) {
	const sum = 0
	for (let n of nums) {
		sum += n
	} 	
	return sum / parseFloat(nums.length)
}

function setCanvasDimensions() {
	canvas1.width = video.videoWidth
	canvas1.height = video.videoHeight
	canvas2.width = video.videoWidth
	canvas2.height = video.videoHeight
}

function setCanvasToSelectStream() {
	console.log('calling setCanvasToSelectStream')
	timerCallback();
}



function setVideoToSelectedStream() {
	if (window.stream) {
  		window.stream.getTracks().forEach(track => track.stop())
  	}

	const constraints = {
		video: { deviceId: { exact: videoSelect.value } }
  	};

  	return navigator.mediaDevices
		.getUserMedia(constraints)
		.then(stream => {
			  window.stream = stream; // make stream available to console
			  video.srcObject = stream;
		})
}


function handleError(error) {
  console.error('Error: ', error);
}

function addVideoDevicesToSelect(deviceInfos) {
	for (let i = 0; i !== deviceInfos.length; ++i) {
		const deviceInfo = deviceInfos[i];
		
		if (deviceInfo.kind === 'videoinput') {
			const option = document.createElement('option');
			option.value = deviceInfo.deviceId;
			option.text = deviceInfo.label || 'camera ' + (i + 1)
			videoSelect.appendChild(option);
		}
	}
}

function hasGetUserMedia() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function to_reg_lat_long(lat_long) {
    return {
        lat: lat_long.lat,
        long: to_reg_long(lat_long.long)
    }
}

function to_reg_long(long_w) {
    return long_w <= 180 ? -long_w : 360 - long_w;
}

window.onload = function() {
    //const {lat, long} = sun_lat_long(Date.now())

    //const reg_long = long <= 180 ? -long : 360 - long;
    //console.log(lat + "," + reg_long)

    const austin = {
        lat: 30.316947, 
        long: -97.740393
    }

    // 10:08 austin
    const test1 = {
        alt_az: {
            azimuth: 87.37,
            altitude: 44.71
        },
        date: new Date(1591283305000)
    }

    // 11 austin
    const test2 = {
        alt_az: {
            azimuth: 94.06,
            altitude: 55.83 
        },
        date: new Date(1591286400000)
    }


    // 10:31 austin
    const test3 = {
        alt_az: {
            azimuth: 90.1,
            altitude: 49.58 
        },
        date: new Date(1591284660000)
    }


    const t = test1
    compute_location(t.alt_az, t.date)
    //run();
}
