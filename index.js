

const con = window.console;
const console = {
    log: function() {
        con.log(...arguments);
        log_in_html('LOG', [...arguments]);
    },
    warn: function() {
        con.warn(...arguments);
        log_in_html('WARN', [...arguments]);
    },
    error: function() {
        con.error(...arguments);
        log_in_html('ERROR', [...arguments]);
    }
};
window.console = console;
window.onerror = function (msg, url, line) {
    log_in_html("ONERROR", [msg, url, line]);
}


const state = {
	alt_az: null
}


const video = document.querySelector('video');
const videoSelect = document.querySelector('select#videoSource');

const canvas1 = document.getElementById('canvas1');
const ctx1 = canvas1.getContext('2d');

let map = null;

//const canvas2 = document.getElementById('canvas2');
//const ctx2 = canvas2.getContext('2d');




function fetchJSON(url) {
  return fetch(url)
    .then(function(response) {
      return response.json();
    });
}

function loadBaseMap() {
	fetchJSON('natural-earth-data/ne_50m_admin_0_sovereignty.geojson')
		.then((data) => L.geoJSON(data, {color: 'green'}).addTo(map))
	
	fetchJSON('natural-earth-data/ne_50m_admin_1_states_provinces_lines.geojson')
		.then((data) => L.geoJSON(data, {color: 'green'}).addTo(map))

	fetchJSON('natural-earth-data/ne_50m_populated_places_simple.geojson')
		.then((data) => L.geoJSON(data, { 
			pointToLayer: (geoJsonPoint, latlng) => L.circle(latlng, {radius: 10000, color: 'green'})
		}).addTo(map))
}




const html_logs = true;
function log_in_html(level, args) {
    if (!html_logs) {
        return;
    }
    const msg = args.map(a => JSON.stringify(a)).join("\t")
    const log = document.createElement('p');
    log.textContent = level + " " + new Date(Date.now()).toLocaleString() + ":\t" + msg;
    document.getElementById('logs')
        .appendChild(log);
}


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


// constantly update altitude and azimuth in global state
sensor = new AbsoluteOrientationSensor({frequency: 60, referenceFrame: 'device' })
sensor.addEventListener('reading', e => {
	state.alt_az = compute_alt_az(sensor.quaternion)    
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
    return altitude
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

function toDays(date)   { return toJulian(date) - J2000; }
var e = (PI / 180) * 23.4397; // obliquity of the Earth
function rightAscension(l, b) { return Math.atan(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l)); }
function declin(l, b)    { return Math.asin(sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)); }

function moonCoords(d) { // geocentric ecliptic coordinates of the moon

	var d = toDays(d)
	var rad = PI / 180;
    var L = rad * (218.316 + 13.176396 * d), // ecliptic longitude
        M = rad * (134.963 + 13.064993 * d), // mean anomaly
        F = rad * (93.272 + 13.229350 * d),  // mean distance

        l  = L + rad * 6.289 * Math.sin(M), // longitude
        b  = rad * 5.128 * Math.sin(F),     // latitude
        dt = 385001 - 20905 * Math.cos(M);  // distance to the moon in km

    return {
        ra: rightAscension(l, b) * 180 / PI,
        dec: declin(l, b) * 180 / PI 
    };
}



function r() {
    const ll = []
    for (let d = 1; d < 30; d++ ) {
        const date = Date.parse(d + ' Jan 2000 12:00:00 GMT')
            const jd = toJulian(date)
        const m = Moon.eclip_lat_long(jd)
        const ra = right_ascension(m)
        const dec = declination(m)
        const lat = dec
        const long = to_reg_long(ra_to_long(jd, ra))

        console.log(lat + ", " + long + ", " + new Date(date).toDateString())
    }
    return ll;
}

const obliquity = 23.4393 // epsilon
function right_ascension(eclip) {
    const l = cos(eclip.lat) * cos(eclip.long)
    const m = 0.9175 * cos(eclip.lat) * sin(eclip.long) - 0.3978 * sin(eclip.lat)    
    const new_res = atan(m/l) 

    return atan2(sin(eclip.long) * cos(obliquity) - tan(eclip.lat) * sin(obliquity), cos(eclip.long))
    //const old = mod(atan2(sin(eclip.long) * cos(obliquity) - tan(eclip.lat) * sin(obliquity), cos(eclip.long)), 360)
    
    //console.log('ra', new_res, old)
    return new_res
}
function declination(eclip) {
    return asin(sin(eclip.lat) * cos(obliquity) + cos(eclip.lat) * sin(obliquity) * sin(eclip.long))
}

// since we are looking for the place at solar noon, 
// and hour angle H = 0 = side real time - right ascension, side real time == ra 
// theta(sidereal) = [theta0 + theta1 * (JD - J2000) - lw] mod 360
// (A + B) mod C = (A mod C + B mod C) mod C
function ra_to_long(JD, ra) {
    return (280.1470 + 360.9856235 * (JD - J2000) - ra) % 360
}

// degrees, long is [0, 360] west

// https://www.aa.quae.nl/en/reken/zonpositie.html
function sun_eclip_lat_long(JD) {
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
    return {
        long: lambda,
        lat: b
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


const earth_to_sun_km = 149600000.0 // ? needed?
const earth_radius_km = 6378.14 

function sun_compute_location(alt_az, date) {
    const jd = toJulian(date)
    const sun_loc = sun_eclip_lat_long(jd)
    // estimate based on asumption that sun at infinite distance
    const parallax_angle = 0
    return compute_location(alt_az, jd, sun_loc, parallax_angle)
}

function moon_compute_location(alt_az, date) {
    const jd = toJulian(date)
    const moon_loc = Moon.eclip_lat_long(jd)
    const parallax_angle = Moon.horizontal_parallax_jd(jd) 
    return compute_location(alt_az, jd, moon_loc, parallax_angle)
}


function to_lat_long(eclip_lat_long, jd) {  
    const ra = right_ascension(eclip_lat_long)
    const dec = declination(eclip_lat_long)

    // nearest point to celestial object
    return {
        long: ra_to_long(jd, ra),
        lat: dec
    }
}


function compute_location(alt_az, jd, eclip_lat_long, parallax_angle) {
    
	let { altitude, azimuth } = alt_az
    const alt_correction = altitude_refraction_correction(altitude)
    altitude += alt_correction
   
    const ra = right_ascension(eclip_lat_long)
    const dec = declination(eclip_lat_long)

    console.log(ra, dec)
    // nearest point to celestial object
    const p = {
        long: ra_to_long(jd, ra),
        lat: dec
    }
    console.log(to_reg_lat_long(p))


    const here_to_p = 90 - altitude - parallax_angle
 
    // https://en.wikipedia.org/wiki/Solution_of_triangles#Two_sides_and_the_included_angle_given_
    const pole_to_p = 90 - p.lat 

    if (pole_to_p > asin(sin(here_to_p) * sin(azimuth))) {
        const pole_angle = asin(sin(here_to_p) * sin(azimuth) / sin(pole_to_p))
        const pole_to_here = compute_3rd_subtended_angle(pole_angle, azimuth, pole_to_p, here_to_p)   

        const here = {
            lat: 90 - pole_to_here,
            long: mod((p.long + pole_angle), 360)
        }

        console.log('alt_az', alt_az);
        console.log('p', p);
	    console.log('alt_correction', alt_correction);
		console.log('altitude', altitude);
		console.log('B - azimuth', azimuth)
    	console.log('c - dist here to p', here_to_p)
		console.log('b - pole_to_p', pole_to_p)
        console.log('angle at pole', pole_angle) 
        console.log('a - here to pole', pole_to_here)
        console.log('here', here) 
        console.log('curr1', to_reg_lat_long(here))
		
        return here
        /*
        if (b < c) {
            const C_ = 180 - C 
            const pole_to_here = compute_3rd_subtended_angle(pole_angle, azimuth, pole_to_sun, here_to_sun)   
            const a_ = compute_3rd_subtended_angle(C_, B, b, c)   
            const curr_loc2 =  lat_long_from(a_, b, c)
        
            console.log('curr2', curr_loc2) 
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
function compute_3rd_subtended_angle(C, B, b, c) {
    const a = 2 * atan(tan((b - c) / 2) * sin((B + C) / 2) / sin((B - C) / 2))
    return a
}

// Astronomal Algorithms 16.3
function altitude_refraction_correction(h0) {
    const r_minutes = 1 / tan(h0 + 7.31 / (h0 + 4.4))   
    return r_minutes / 60
}



// An Alternative Lunar Ephemeris Model
// https://caps.gsfc.nasa.gov/simpson/pubs/slunar.pdf
class Moon {
    static eclip_lat_long(jd) {
        const t = Moon.julian_centuries(jd)
        const eclip_long_base = Moon.ecliptic_long_base(t)
        const eclip_lat_base = Moon.ecliptic_lat_base(t)
        //const [eclip_lat, eclip_long] = Moon.precession_correction(t, eclip_lat_base, eclip_long_base)
        return {
            long: eclip_long_base,
            lat: eclip_lat_base
        }
    }

    static horizontal_parallax_jd(jd) {
        const t = Moon.julian_centuries(jd)
        return Moon.horizontal_parallax(t)
    }

    static distance(jd) {
        const t = Moon.julian_centuries(jd)
        const earth_radius_km = 6378.14 
        const theta = Moon.horizontal_parallax(t)
        return earth_radius_km / sin(theta)
    }

    // t in julian centuries
    static ecliptic_long_base(t) {
        return 218.32 + 481267.881 * t + 
             6.29 * sin( 477198.87 * t + 135.0) +
            -1.27 * sin(-413335.36 * t + 259.3) + 
             0.66 * sin( 890534.22 * t + 235.7) +
             0.21 * sin( 954397.74 * t + 269.9) +
            -0.19 * sin(  35999.05 * t + 357.5) +
            -0.11 * sin( 966404.03 * t + 186.6)
    }

    static ecliptic_lat_base(t) {
        const sin_constants = [
            [5.13,  483202.02,  93.3],
            [0.28,  960400.89,  228.2],
            [-0.28, 6003.15,    318.3],
            [-0.17, -407332.21, 217.6]
        ]
        return sum(sin_constants.map(([a, b, c]) => a * sin(b * t + c)))
        //return sin_constants.map(([a, b, c]) => a + "sin(" + b + "t + " + c + ")")
       
    }

    static horizontal_parallax(t) {
        const cos_constants = [
            [0.0518,    477198.85,  134.9],
            [0.0095,    -413335.38, 259.2],
            [0.0078,    890534.23,  235.7],
            [0.0028,    954397.7,   269.9]       
        ] 

        return 0.9508 + sum(cos_constants.map(([a, b, c]) => a * cos(b * t + c)))
    }

    static precession_correction(t, lat, long) {
        const a = 1.396971 * t + 0.0003086 * t * t
        const b = 0.013056 * t - 0.0000092 * t * t
        const c = 5.12362 - 1.155358 * t - 0.0001964 * t * t

        const lat_pre = lat - b * sin(long + c)
        const long_pre = long - a + b * cos(long + c) * tan(lat_pre)
        return [lat_pre, long_pre]
    }

    static julian_centuries(jd) {
        const days_in_century = 36525.0
        return (jd - 2451545) / days_in_century
    }

}


function sum(arr) {
    let total = 0
    for (let a of arr) {
        total += a
    }
    return total
}





function initVideo() {
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
}

function timerCallback() {
	copyVideoToCanvas();
	setTimeout(timerCallback, 10);
}

function copyVideoToCanvas() {
	
	// should probably not do every frame ¯\_(ツ)_/¯
	setCanvasDimensions();

	if (canvas1.width === 0 || canvas1.height === 0) {
		return;
	}

	const canvas = canvas1
	const ctx = canvas.getContext("2d");
	
	// first copy frame from video element to canvas
	ctx.drawImage(video, 0, 0);

	ctx.strokeStyle = "#FF0000";
	ctx.lineWidth = 3 
	ctx.beginPath();
	ctx.moveTo(0, canvas.height / 2);
	ctx.lineTo(canvas.width, canvas.height / 2);
	
	ctx.moveTo(canvas.width / 2, 0);
	ctx.lineTo(canvas.width / 2, canvas.height);
	ctx.stroke();	
}


function copyVideoFrameWithChanges() {
	
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

// sets logically pixel width of canvas, not size of html element, hence works with width: 100% 
function setCanvasDimensions() {
	canvas1.width = video.videoWidth
	canvas1.height = video.videoHeight
	//canvas2.width = video.videoWidth
	//canvas2.height = video.videoHeight
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
		video: { deviceId: videoSelect.value  }
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
    long_w = mod(long_w, 360)
    return long_w <= 180 ? -long_w : 360 - long_w;
}


window.onload = function() {
    
	map = L.map('map', {
		center: [24.944292, 0.202651],
		zoom: 2
	})
    
	loadBaseMap();
	initVideo();

	document.getElementById("find-location").onclick = () => {
		const { lat, long } = moon_compute_location(state.alt_az, Date.now())
		const lat_long = [lat, to_reg_long(long)].map(n => n.toFixed(4))
			
		//const marker = L.marker([lat, long_reg]).addTo(map);	
		const popup = L.popup()
			.setLatLng(lat_long)
			.setContent(JSON.stringify(lat_long))
			.openOn(map);

		map.setView(lat_long, 5)
	}

	document.getElementById("show-camera").onclick = () => {
		document.getElementById("camera-pane").style.display = 'block'
		document.getElementById("map-pane").style.display = 'none'
	}

	document.getElementById("show-map").onclick = () => {
		document.getElementById("camera-pane").style.display = 'none'
		document.getElementById("map-pane").style.display = 'block'
		map.invalidateSize()
	}
    
    
}

function run_tests() {
    for (let t of tests) {
        run_test(t)
    }
}

function run_test(t) {
	const {lat, long}  = sun_compute_location(t.alt_az, t.date)
	const lat_err = Math.abs(lat - t.here.lat)
	const long_err = Math.abs(to_reg_long(long) - t.here.long)
	//console.log('lat_err', lat_err)
	//console.log('long_err', long_err)
	if (lat_err > 1 || long_err > 1) {
		console.log(t)
	}
}



const tests = [
    // 10:08 austin
    {
		here: { lat: 30.316947, long: -97.740393 },
        alt_az: {
            azimuth: 87.37,
            altitude: 44.71
        },
        date: new Date(1591283305000)
    },

    // 11 austin
    {
		here: { lat: 30.316947, long: -97.740393 },
        alt_az: {
            azimuth: 94.06,
            altitude: 55.83 
        },
        date: new Date(1591286400000)
    },


    // 10:31 austin
    {
		here: { lat: 30.316947, long: -97.740393 },
        alt_az: {
            azimuth: 90.1,
            altitude: 49.58 
        },
        date: new Date(1591284660000)
    },

    // 4:00pm austin - sun to east
   	{ 
		here: { lat: 30.316947, long: -97.740393 },
        alt_az: {
            azimuth: 266.14,
            altitude: 55.59
        },
        date: new Date(1591304400000)
    },

    // lat: 15.876809
    // long: -23.99414 -cape verde
    // here west of utc, sun east of utc
    {
        here: {
            lat: 15.876809,
            long: -23.99414
        },
        alt_az: {
            azimuth: 73.5 ,
            altitude: 53.06 
        },
        date: new Date("2020-06-04T10:00:00.000-01:00")
    },

    // tunis 
    // here east of utc, sun west
    {
        here: {
            lat: 36.738884, 
            long: 10.1074218 
        },
        alt_az: {
            azimuth: 269.55,
            altitude: 40.45 
        },
        date: new Date("2020-06-04T16:00:00.000+01:00")
    }
]

