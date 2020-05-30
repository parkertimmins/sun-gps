
const video = document.querySelector('video');
const videoSelect = document.querySelector('select#videoSource');

const canvas1 = document.getElementById('canvas1');
const ctx1 = canvas1.getContext('2d');
const canvas2 = document.getElementById('canvas2');
const ctx2 = canvas2.getContext('2d');

goog.require('goog.structs.PriorityQueue');

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


    let pq = new goog.structs.PriorityQueue();
    let numMax = 20;
	for (let i = 0; i < pixels; i++) {
		let pixel = i;
		let r = frame.data[i * 4 + 0];
	  	let g = frame.data[i * 4 + 1];
	  	let b = frame.data[i * 4 + 2];

		let intensity = r + g + b

        pq.enqueue(intensity, pixel) 
        
        if (pq.getCount() > numMax) {
            pq.dequeue() 
        }
	}

    console.log(pq.getKeys())
    console.log(pq.getValues())


    /*    
	let numMax = 20;
	let maxPixels =  []
	for (let i = 0; i < pixels; i++) {
		let pixel = i;
		let r = frame.data[i * 4 + 0];
	  	let g = frame.data[i * 4 + 1];
	  	let b = frame.data[i * 4 + 2];

		let intensity = r + g + b

		if (maxPixels.length < numMax) {
			maxPixels.push([intensity, pixel])
		} else{
			let lowestMaxIntensity = maxPixels[0][0]	
			if (intensity > lowestMaxIntensity) {
				maxPixels[0] = [intensity, pixel]
			}
		}
		
		maxPixels.sort(function(a, b) {
  			return a[0] - b[0];
		});
	}
	let rcPairs = maxPixels.map(elem => elem[1])
			.map(pixel => pixelToRc(pixel, canvas1.width))
    */
	
    let rcPairs = pq.getValues()
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
    run();
}
