goog.require('goog.structs.Heap');




const video = document.querySelector('video');
const videoSelect = document.querySelector('select#videoSource');

const canvas1 = document.getElementById('canvas1');
const ctx1 = canvas1.getContext('2d');
const canvas2 = document.getElementById('canvas2');
const ctx2 = canvas2.getContext('2d');



sensor = new AbsoluteOrientationSensor({frequency: 0.5, referenceFrame: 'device' })
sensor.addEventListener('reading', e => {
    
    
    //console.log(sensor.quaternion)
    
    let angles = quatertionToEulerAngles(sensor.quaternion)
   
   
    let q = toQuatInternal(sensor.quaternion);
    let q_inv = quatInverse(q)

    let zUnit = [0, 0, 0, -1]
    
    let screenVec = quatMult(quatMult(q, zUnit), q_inv) 


    let x = screenVec[1]
    let y = screenVec[2]
    let z = screenVec[3]
  
    const PI = Math.PI

    const thetaPiMax = -Math.atan2(y, x)
    const theta2PiMax = thetaPiMax < 0 ? 2 * PI + thetaPiMax : thetaPiMax
    const thetaFromNorth = (theta2PiMax + PI / 2) % (2 * PI)
    const azimuthRad = thetaFromNorth 
    
    
    let azimuthDeg = azimuthRad * parseFloat(180) / Math.PI
    console.log(azimuthDeg);


    //console.log(screenVec);


    let degrees = angles.map(r => r * 180.0 / Math.PI)


});
sensor.start();


const atan2 = Math.atan2,
      asin = Math.asin;

// internal [s, v] - external [v, s]
function toQuatInternal(q) {
    return [q[3], q[0], q[1], q[2]]
}

// https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles
function quatertionToEulerAngles(q) {
    const a = atan2(
        2 * (q[0] * q[1] + q[2] * q[3]),
        1 - 2 * (q[1] ** 2 + q[2] ** 2)
    );      
    const b = asin(2 * (q[0] * q[2] - q[3] * q[1]));
    const c = atan2(
        2 * (q[0] * q[3] + q[1] * q[2]),
        1 - 2 * (q[2] ** 2 + q[3] ** 2)
    );   
    return [a, b, c]
}

function quatInverse(q) {
    const sn = quatSquaredNorm(q)
    const inv = [q[0], -q[1], -q[2], -q[3]].map(a => a * 1.0 / sn)

    console.log('q', q)
    console.log('i', inv)
    return inv
}

function quatSquaredNorm(q) {
    return q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]

}

function quatMult(q, r) {
    return [
        r[0] * q[0] - r[1] * q[1] - r[2] * q[2] - r[3] * q[3], 
        r[0] * q[1] + r[1] * q[0] - r[2] * q[3] + r[3] * q[2], 
        r[0] * q[2] + r[1] * q[3] + r[2] * q[0] - r[3] * q[1], 
        r[0] * q[3] - r[1] * q[2] + r[2] * q[1] + r[3] * q[0], 
    ];
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

	
	let frame = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
	let pixels = frame.data.length / 4;


    let heap = new goog.structs.Heap();
    let numMax = 1000;
	for (let i = 0; i < pixels; i++) {
		let pixel = i;
		let r = frame.data[i * 4 + 0];
	  	let g = frame.data[i * 4 + 1];
	  	let b = frame.data[i * 4 + 2];

		let intensity = r + g + b

        heap.insert(intensity, pixel) 
        if (heap.getCount() > numMax) {
            heap.remove() 
        }
	}

    let rcPairs = heap.getValues()
	    .map(pixel => pixelToRc(pixel, canvas1.width))
	let rCenter = Math.round(avg(rcPairs.map(rc => rc[0])))
	let cCenter = Math.round(avg(rcPairs.map(rc => rc[1])))
    console.log(rCenter, cCenter)
    
    const square = 10	
	for (let r = rCenter - square; r < rCenter + square; r++) {
		for (let c = cCenter - square; c < cCenter + square; c++) {
			let pixel = r * canvas2.width + c
			let i = pixel
			frame.data[i * 4 + 0] = 255; // r
			frame.data[i * 4 + 1] = 0; // g
			frame.data[i * 4 + 2] = 255; // b
		}
	}				
	
	ctx2.putImageData(frame, 0, 0);
}

function pixelToRc(pixel, width) {
	let r = pixel / width
	let c = pixel % width 
	return [r, c]

}

function avg(nums) {
	let sum = 0
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

window.onload = function() {
    //run();
}
